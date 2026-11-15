'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Scene } from '@glowframe/schema';
import { ArrowUpRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import SectionBar from '@/components/SectionBar';
import ThumbnailImage from '@/components/ThumbnailImage';

interface GalleryViewProps {
  presets: Scene[];
}

/** The four filters. Anything that is not an OS logo counts as a plain shape. */
const CATEGORIES = [
  { id: 'apple', label: 'Apple' },
  { id: 'windows', label: 'Windows' },
  { id: 'linux', label: 'Linux' },
  { id: 'shapes', label: 'Shapes' },
] as const;

type CategoryId = (typeof CATEGORIES)[number]['id'];

function categoryOf(scene: Scene): CategoryId {
  const tags = scene.meta.tags;
  if (tags.includes('apple')) return 'apple';
  if (tags.includes('windows')) return 'windows';
  if (tags.includes('linux')) return 'linux';
  return 'shapes';
}

export default function GalleryView({ presets }: GalleryViewProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<CategoryId | 'all'>('all');

  const counts = useMemo(() => {
    const c: Record<CategoryId, number> = { apple: 0, windows: 0, linux: 0, shapes: 0 };
    presets.forEach((p) => (c[categoryOf(p)] += 1));
    return c;
  }, [presets]);

  const filteredPresets = useMemo(() => {
    const q = query.toLowerCase().trim();
    return presets.filter((p) => {
      const matchesCategory = active === 'all' || categoryOf(p) === active;
      const matchesQuery =
        !q ||
        p.meta.name.toLowerCase().includes(q) ||
        (p.meta.description ? p.meta.description.toLowerCase().includes(q) : false) ||
        p.meta.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [presets, query, active]);

  return (
    <section id="library">
      <SectionBar label="Library">
        <span aria-live="polite">
          {filteredPresets.length} {filteredPresets.length === 1 ? 'wallpaper' : 'wallpapers'}
        </span>
      </SectionBar>

      {/* Filters */}
      <div className="sticky top-[57px] z-40 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-stretch">
          <div className="w-full border-b border-line p-3 md:w-72 md:shrink-0 md:border-b-0 md:border-r">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search wallpapers"
              icon={<Search />}
            />
          </div>

          <ToggleGroup
            type="single"
            value={active}
            onValueChange={(v) => setActive((v || 'all') as CategoryId | 'all')}
            aria-label="Filter by platform"
            className="grid flex-1 grid-cols-4 gap-0"
          >
            {CATEGORIES.map((c) => (
              <ToggleGroupItem
                key={c.id}
                value={c.id}
                className="h-[57px] gap-2 border-r border-line px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted last:border-r-0 hover:bg-raised hover:text-fg data-[state=on]:bg-fg data-[state=on]:text-bg"
              >
                {c.label}
                <span className="tabular-nums opacity-60">{counts[c.id]}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {/* Listing */}
      {filteredPresets.length === 0 ? (
        <div className="bg-dots flex flex-col items-center gap-4 border-b border-line px-5 py-24 text-center">
          <p className="bg-bg px-2 text-muted">No wallpapers match &ldquo;{query}&rdquo;</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setQuery('');
              setActive('all');
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        // Cards share their hairlines: no gaps. Cells that finish a short last row show the dotted field behind.
        <div className="overflow-hidden border-b border-line">
          <ul className="bg-dots -mr-px grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPresets.map((preset) => (
              <li key={preset.meta.id} className="border-b border-r border-line bg-bg">
                <Link
                  href={`/w/${preset.meta.id}`}
                  className="group flex h-full flex-col p-4 transition-colors duration-fast ease-out hover:bg-surface"
                >
                  <div className="ticks relative aspect-video p-[5px]">
                    <div className="relative h-full overflow-hidden border border-line bg-surface transition-colors duration-fast ease-out group-hover:border-line-strong">
                      <ThumbnailImage scene={preset} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <h3 className="truncate font-medium text-fg">{preset.meta.name}</h3>
                    <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                      {preset.shape.type}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{preset.meta.description}</p>

                  <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                    {preset.meta.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Visible call to action; the whole card is the link, this just says so. */}
                  <span className="mt-4 flex h-10 items-center justify-between border border-line-strong px-4 text-sm font-medium transition-colors duration-fast ease-out group-hover:border-fg group-hover:bg-fg group-hover:text-bg">
                    View wallpaper
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
