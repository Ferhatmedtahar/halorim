#!/usr/bin/env node
/**
 * Measures the real CPU and memory cost of a running Halorim desktop instance (Linux only).
 *
 * It finds the `glowframe-desktop` process, follows every child process it spawned (WebKit web
 * processes do the actual WebGL rendering, one per screen), and samples /proc for a fixed window.
 *
 *   CPU  = (utime + stime) delta / wall time. 100 % = one full core.
 *   PSS  = proportional set size: shared pages are split between the processes that map them, so
 *          summing PSS over the tree does not double count shared libraries (unlike RSS).
 *
 * Usage:
 *   node tooling/bench/measure.mjs [--duration 30] [--interval 1] [--label name] [--out file.json]
 *                                  [--name glowframe-desktop] [--compositor gnome-shell]
 *
 * No dependencies. Start the app, wait until it has settled (~10 s), then run this.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, basename } from 'node:path';
import os from 'node:os';

function parseArgs(argv) {
  const opts = {
    duration: 30,
    interval: 1,
    label: 'run',
    out: null,
    name: 'glowframe-desktop',
    compositor: 'gnome-shell',
  };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    const value = argv[i + 1];
    if (!(key in opts)) throw new Error(`Unknown option --${key}`);
    opts[key] = typeof opts[key] === 'number' ? Number(value) : value;
    i++;
  }
  return opts;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tryExec(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

const CLK_TCK = Number(tryExec('getconf', ['CLK_TCK']) ?? 100);

function readProc(pid, file) {
  try {
    return readFileSync(`/proc/${pid}/${file}`, 'utf8');
  } catch {
    return null;
  }
}

/** Returns { ppid, ticks } from /proc/<pid>/stat (comm may contain spaces, so split after ')'). */
function readStat(pid) {
  const stat = readProc(pid, 'stat');
  if (!stat) return null;
  const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
  // fields[0] is field 3 (state); utime/stime are fields 14/15.
  return { ppid: Number(fields[1]), ticks: Number(fields[11]) + Number(fields[12]) };
}

function readMemory(pid) {
  const rollup = readProc(pid, 'smaps_rollup');
  if (!rollup) return null;
  const kb = (key) => Number(new RegExp(`^${key}:\\s+(\\d+)`, 'm').exec(rollup)?.[1] ?? 0);
  return { pssKb: kb('Pss'), rssKb: kb('Rss') };
}

function processName(pid) {
  const cmdline = readProc(pid, 'cmdline');
  const argv0 = cmdline?.split('\0')[0];
  return argv0 ? basename(argv0) : (readProc(pid, 'comm')?.trim() ?? '?');
}

function allPids() {
  return readdirSync('/proc')
    .filter((d) => /^\d+$/.test(d))
    .map(Number);
}

/** The app root plus every descendant (WebKitWebProcess, WebKitNetworkProcess, ...). */
function findTree(rootName) {
  const pids = allPids();
  const parentOf = new Map();
  for (const pid of pids) {
    const s = readStat(pid);
    if (s) parentOf.set(pid, s.ppid);
  }
  const roots = pids.filter((pid) => processName(pid) === rootName);
  if (roots.length === 0) return [];
  const tree = new Set(roots);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [pid, ppid] of parentOf) {
      if (!tree.has(pid) && tree.has(ppid)) {
        tree.add(pid);
        grew = true;
      }
    }
  }
  return [...tree];
}

function systemInfo() {
  const cpus = os.cpus();
  const gpu = tryExec('nvidia-smi', ['--query-gpu=name,driver_version', '--format=csv,noheader']);
  const lspciGpu = tryExec('sh', ['-c', "lspci | grep -iE 'vga|3d' | head -n1 | cut -d: -f3"]);
  const monitors = tryExec('sh', ['-c', 'xrandr --listmonitors 2>/dev/null | tail -n +2']);
  return {
    cpu: cpus[0]?.model ?? 'unknown',
    threads: cpus.length,
    memoryGb: Math.round(os.totalmem() / 1024 ** 3),
    gpu: gpu ?? lspciGpu?.trim() ?? 'unknown',
    kernel: os.release(),
    session: `${process.env.XDG_CURRENT_DESKTOP ?? '?'} / ${process.env.XDG_SESSION_TYPE ?? '?'}`,
    monitors: monitors
      ? monitors.split('\n').map((l) => {
          const m = /(\d+)\/\d+x(\d+)\/\d+/.exec(l);
          return m ? `${m[1]}x${m[2]}` : l.trim();
        })
      : [],
    webkitgtk:
      tryExec('sh', ['-c', 'pkg-config --modversion webkit2gtk-4.1 2>/dev/null']) ?? 'unknown',
  };
}

const pct = (values, p) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};
const avg = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const pids = findTree(opts.name);
  if (pids.length === 0) {
    console.error(`No running "${opts.name}" process found. Start the app first.`);
    process.exit(1);
  }
  const compositorPids = allPids().filter((pid) => processName(pid) === opts.compositor);

  const watched = [...pids, ...compositorPids];
  const samples = new Map(watched.map((pid) => [pid, { cpu: [], pss: [], rss: [] }]));
  const totals = { cpu: [], pss: [] };
  const compositorCpu = [];

  let prev = new Map(watched.map((pid) => [pid, readStat(pid)?.ticks ?? 0]));
  let prevTime = performance.now();
  const steps = Math.max(1, Math.round(opts.duration / opts.interval));

  process.stderr.write(`Sampling ${pids.length} processes for ${opts.duration}s `);
  for (let i = 0; i < steps; i++) {
    await sleep(opts.interval * 1000);
    const now = performance.now();
    const wallSec = (now - prevTime) / 1000;
    let totalCpu = 0;
    let totalPss = 0;
    let shellCpu = 0;
    const next = new Map();
    for (const pid of watched) {
      const stat = readStat(pid);
      if (!stat) continue;
      next.set(pid, stat.ticks);
      const cpu = ((stat.ticks - (prev.get(pid) ?? stat.ticks)) / CLK_TCK / wallSec) * 100;
      const s = samples.get(pid);
      s.cpu.push(cpu);
      if (compositorPids.includes(pid)) {
        shellCpu += cpu;
        continue;
      }
      const mem = readMemory(pid);
      if (mem) {
        s.pss.push(mem.pssKb);
        s.rss.push(mem.rssKb);
        totalPss += mem.pssKb;
      }
      totalCpu += cpu;
    }
    totals.cpu.push(totalCpu);
    totals.pss.push(totalPss);
    compositorCpu.push(shellCpu);
    prev = next;
    prevTime = now;
    process.stderr.write('.');
  }
  process.stderr.write('\n');

  const processes = pids.map((pid) => {
    const s = samples.get(pid);
    return {
      pid,
      name: processName(pid),
      cpuAvg: round(avg(s.cpu)),
      cpuP95: round(pct(s.cpu, 95)),
      pssMb: round(avg(s.pss) / 1024),
      rssMb: round(avg(s.rss) / 1024),
    };
  });

  const result = {
    label: opts.label,
    date: new Date().toISOString(),
    durationSec: opts.duration,
    system: systemInfo(),
    build: readProc(pids[0], 'cmdline')?.includes('/debug/') ? 'debug' : 'release',
    total: {
      cpuAvg: round(avg(totals.cpu)),
      cpuP95: round(pct(totals.cpu, 95)),
      cpuPerCoreOfMachine: round(avg(totals.cpu) / os.cpus().length),
      pssMbAvg: round(avg(totals.pss) / 1024),
      pssMbMax: round(Math.max(...totals.pss) / 1024),
    },
    compositor: compositorPids.length
      ? { name: opts.compositor, cpuAvg: round(avg(compositorCpu)) }
      : null,
    processes,
  };

  const lines = [
    `### ${result.label} (${result.build} build, ${result.durationSec}s)`,
    '',
    '| Process | CPU avg | CPU p95 | PSS | RSS |',
    '| :-- | --: | --: | --: | --: |',
    ...processes.map(
      (p) => `| ${p.name} | ${p.cpuAvg} % | ${p.cpuP95} % | ${p.pssMb} MB | ${p.rssMb} MB |`,
    ),
    `| **Total** | **${result.total.cpuAvg} %** | **${result.total.cpuP95} %** | **${result.total.pssMbAvg} MB** | |`,
    '',
    `100 % = one core. Total = ${result.total.cpuPerCoreOfMachine} % of all ${result.system.threads} threads.`,
  ];
  if (result.compositor) {
    lines.push(
      `${result.compositor.name} during the run: ${result.compositor.cpuAvg} % (includes everything else on screen).`,
    );
  }
  console.log(lines.join('\n'));

  if (opts.out) {
    mkdirSync(dirname(opts.out), { recursive: true });
    writeFileSync(opts.out, JSON.stringify(result, null, 2) + '\n');
    console.error(`Saved ${opts.out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
