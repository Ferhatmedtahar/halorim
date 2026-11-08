'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Scene } from '@glowframe/schema';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Terminal, Sliders } from 'lucide-react';

interface GalleryViewProps {
  presets: Scene[];
}

export default function GalleryView({ presets }: GalleryViewProps) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>('all');

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    presets.forEach((p) => p.meta.tags.forEach((t) => tags.add(t)));
    return ['all', ...Array.from(tags).sort()];
  }, [presets]);

  const filteredPresets = useMemo(() => {
    const q = query.toLowerCase().trim();
    return presets.filter((p) => {
      const matchesTag = activeTag === 'all' || p.meta.tags.includes(activeTag);
      const matchesQuery =
        !q ||
        p.meta.name.toLowerCase().includes(q) ||
        (p.meta.description ? p.meta.description.toLowerCase().includes(q) : false) ||
        p.meta.tags.some((t) => t.toLowerCase().includes(q));
      return matchesTag && matchesQuery;
    });
  }, [presets, query, activeTag]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-mono">
      {/* ASCII Header Banner */}
      <div className="border border-terminal-border bg-terminal-card p-6 mb-8 text-center sm:text-left relative shadow-sm">
        <div className="text-terminal-cyan text-[11px] leading-tight select-none hidden md:block overflow-x-hidden font-bold mb-4 opacity-90">
{`   ██████╗ ██╗      ██████╗ ██╗    ██╗███████╗██████╗  █████╗ ███╗   ███╗███████╗
  ██╔════╝ ██║     ██╔═══██╗██║    ██║██╔════╝██╔══██╗██╔══██╗████╗ ████║██╔════╝
  ██║  ███╗██║     ██║   ██║██║ █╗ ██║█████╗  ██████╔╝███████║██╔████╔██║█████╗  
  ██║   ██║██║     ██║   ██║██║███╗██║██╔══╝  ██╔══██╗██╔══██║██║╚██╔╝██║██╔══╝  
  ╚██████╔╝███████╗╚██████╔╝╚███╔███╔╝██║     ██║  ██║██║  ██║██║ ╚═╝ ██║███████╗
   ╚═════╝ ╚══════╝ ╚═════╝  ╚══╝╚══╝ ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝`}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-terminal-border/60 pt-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold tracking-wider text-slate-100 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-terminal-cyan" />
                GLOWFRAME // PRESET_VAULT
              </span>
              <Badge variant="green" bracketed>SYSTEM_ACTIVE</Badge>
              <Badge variant="cyan" bracketed>{presets.length} PRESETS</Badge>
            </div>
            <p className="text-xs text-terminal-dim">
              Subpixel distance-field optical raymarching. Dynamic edge dispersion and responsive mouse guidance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/studio">
              <Button variant="cyber" size="sm" className="flex items-center gap-1.5 shadow-terminal-green">
                <Sliders className="w-3.5 h-3.5" />
                <span>[+] CUSTOM SHAPE STUDIO</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* System Telemetry Bar */}
        <div className="mt-4 pt-3 border-t border-terminal-border/40 flex flex-wrap items-center gap-4 text-[11px] text-terminal-dim">
          <span>SYS.RENDERER: <strong className="text-slate-300">WEBGL2_CORE</strong></span>
          <span>&bull;</span>
          <span>GPU_DISPERSION: <strong className="text-terminal-cyan">RGB_PRISM</strong></span>
          <span>&bull;</span>
          <span>TARGET_REFRESH: <strong className="text-terminal-green">60_FPS</strong></span>
          <span>&bull;</span>
          <span>HOSTS: <strong className="text-slate-300">LINUX_WAYLAND / X11 / WINDOWS</strong></span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
        <div className="w-full md:w-80">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search presets or tags..."
            prefixSymbol=">_"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {allTags.map((tag) => {
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition-all select-none border ${
                  isActive
                    ? 'border-terminal-cyan bg-terminal-cyan/15 text-terminal-cyan shadow-terminal-glow font-semibold'
                    : 'border-terminal-border bg-terminal-card text-terminal-dim hover:text-slate-200 hover:border-slate-500'
                }`}
              >
                [{tag}]
              </button>
            );
          })}
        </div>
      </div>

      {/* Presets Grid */}
      {filteredPresets.length === 0 ? (
        <div className="text-center py-20 border border-terminal-border bg-terminal-card p-8">
          <p className="text-terminal-dim text-xs">
            [NULL_RESULT]: No presets matching &ldquo;{query}&rdquo; found in database.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery('');
              setActiveTag('all');
            }}
            className="mt-4"
          >
            RESET_QUERY
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPresets.map((preset, index) => {
            const padIndex = String(index + 1).padStart(2, '0');
            return (
              <Link
                key={preset.meta.id}
                href={`/w/${preset.meta.id}`}
                className="group block"
              >
                <Card className="h-full flex flex-col justify-between hover:border-terminal-cyan transition-all duration-200 hover:shadow-terminal-glow hover:-translate-y-0.5">
                  <CardHeader className="py-2.5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs group-hover:text-terminal-cyan transition-colors">
                        <span className="text-terminal-cyan">[{padIndex}]</span> {preset.meta.name}
                      </CardTitle>
                      <Badge variant="cyan" bracketed className="text-[9px]">
                        {preset.mode.id}
                      </Badge>
                    </div>
                  </CardHeader>

                  {/* Pre-rendered Thumbnail Image */}
                  <div className="relative aspect-video w-full bg-black overflow-hidden border-y border-terminal-border/60">
                    <Image
                      src={`/thumbnails/${preset.meta.id}.png`}
                      alt={preset.meta.name}
                      width={640}
                      height={360}
                      unoptimized
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute bottom-1 right-2 text-[9px] text-slate-400 bg-black/70 px-1 py-0.5 pointer-events-none">
                      {preset.shape.type}
                    </div>
                  </div>

                  <CardContent className="pt-3 flex-1 flex flex-col justify-between">
                    <p className="text-[11px] text-terminal-dim leading-relaxed line-clamp-2">
                      {preset.meta.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {preset.meta.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] text-terminal-dim bg-terminal-border/30 px-1.5 py-0.5"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>

                  <CardFooter className="py-2.5 flex items-center justify-between text-[11px] text-terminal-dim">
                    <span>{preset.meta.license}</span>
                    <span className="text-terminal-cyan group-hover:underline flex items-center gap-1">
                      &gt;_ LAUNCH
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
