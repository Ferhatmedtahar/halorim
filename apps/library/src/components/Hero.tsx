import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PlatformGlyph, { type PlatformId } from '@/components/PlatformGlyph';

const TILES: { id: PlatformId; label: string; className: string; glyph: string; tone: string; field: string }[] = [
  { id: 'linux', label: 'Linux', className: 'row-span-2', glyph: 'w-[46%]', tone: 'text-fg', field: 'bg-hatch' },
  { id: 'windows', label: 'Windows', className: '', glyph: 'w-[38%]', tone: 'text-fg/80', field: 'bg-dots-drift' },
  { id: 'macos', label: 'macOS', className: '', glyph: 'w-[34%]', tone: 'text-muted', field: 'bg-dots' },
];

/** Hero: headline and actions in one cell, platform cells butted against it. A strip of facts closes it. */
export default function Hero({ wallpaperCount }: { wallpaperCount: number }) {
  const facts: [string, string][] = [
    [String(wallpaperCount), 'Wallpapers in the library'],
    ['MIT', 'Open-source license'],
    ['WebGL2', 'Real-time renderer'],
  ];

  return (
    <section>
      <div className="grid lg:grid-cols-[1fr_460px]">
        <div className="animate-rise px-5 py-14 sm:px-6 lg:border-r lg:border-line lg:py-24">
          <h1 className="text-[clamp(44px,8vw,72px)] font-medium leading-[0.95] tracking-[-0.055em] text-fg">
            Live wallpapers
            <br />
            for your desktop
          </h1>
          <p className="mt-6 max-w-md text-muted">
            Real-time WebGL2 glow that follows your cursor. A free, open-source engine with a library of wallpapers for
            Linux, Windows and macOS.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="#library">Browse wallpapers</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="#download">Download app</Link>
            </Button>
          </div>
        </div>

        <ul
          className="grid aspect-[1.15] w-full animate-rise grid-cols-2 grid-rows-2 border-t border-line lg:aspect-auto lg:border-t-0"
          style={{ animationDelay: '120ms' }}
          aria-label="Supported platforms"
        >
          {TILES.map((t, i) => (
            <li
              key={t.id}
              className={`relative flex items-center justify-center ${t.field} ${t.className} ${
                i === 0 ? 'border-r border-line' : i === 1 ? 'border-b border-line' : ''
              }`}
            >
              <div className={`${t.glyph} ${t.tone} aspect-square`}>
                <PlatformGlyph id={t.id} />
              </div>
              <span className="absolute bottom-3 left-4 bg-bg px-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                {t.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="line-march-x" aria-hidden="true" />
      <dl className="grid grid-cols-1 border-b border-line sm:grid-cols-3">
        {facts.map(([value, label], i) => (
          <div key={label} className={`px-5 py-5 sm:px-6 ${i > 0 ? 'border-t border-line sm:border-l sm:border-t-0' : ''}`}>
            <dd className="text-3xl font-medium tracking-[-0.03em] text-fg">{value}</dd>
            <dt className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
