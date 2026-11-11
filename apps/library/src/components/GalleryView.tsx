'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Scene } from '@glowframe/schema';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { glowStops } from '@/lib/palette';
import ThumbnailImage from '@/components/ThumbnailImage';

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
    <section id="library" className="mx-auto max-w-site px-4 pt-8 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-[clamp(36px,5.5vw,60px)] font-medium leading-[1.02] tracking-[-0.045em]">Library</h2>
        <p className="pb-2 text-sm text-muted tabular-nums" aria-live="polite">
          {filteredPresets.length} {filteredPresets.length === 1 ? 'wallpaper' : 'wallpapers'}
        </p>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-40 -mx-4 mt-8 bg-bg/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:w-72 md:shrink-0">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search wallpapers"
              icon={<Search />}
            />
          </div>

          <ScrollArea className="w-full md:w-auto md:max-w-[calc(100%-18rem)]">
            <ToggleGroup
              type="single"
              value={activeTag}
              onValueChange={(v) => setActiveTag(v || 'all')}
              aria-label="Filter by tag"
              className="justify-start gap-1.5 pb-3"
            >
              {allTags.map((tag) => (
                <ToggleGroupItem
                  key={tag}
                  value={tag}
                  className="h-8 shrink-0 rounded-full bg-raised px-3.5 text-[13px] font-medium capitalize text-muted hover:bg-hover hover:text-fg data-[state=on]:bg-fg data-[state=on]:text-bg"
                >
                  {tag}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ScrollBar orientation="horizontal" className="h-1.5" />
          </ScrollArea>
        </div>
      </div>

      {/* Listing */}
      {filteredPresets.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 rounded-xl bg-surface py-20 text-center">
          <p className="text-muted">No wallpapers match &ldquo;{query}&rdquo;</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setQuery('');
              setActiveTag('all');
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPresets.map((preset) => {
            const [a, b] = glowStops(preset);
            return (
              <li key={preset.meta.id}>
                <Link href={`/w/${preset.meta.id}`} className="group block rounded-xl">
                  <div className="relative">
                    {/* The only decoration: the wallpaper's own light, on hover */}
                    <div
                      aria-hidden="true"
                      className="absolute -inset-3 rounded-[28px] opacity-0 blur-2xl transition-opacity duration-slow ease-out group-hover:opacity-40 group-focus-visible:opacity-40"
                      style={{ background: `linear-gradient(120deg, ${a}, ${b})` }}
                    />
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-surface">
                      <ThumbnailImage scene={preset} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <h3 className="truncate font-medium text-fg">{preset.meta.name}</h3>
                    <span className="shrink-0 text-[13px] text-muted">{preset.shape.type}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{preset.meta.description}</p>
                  <p className="mt-2 text-[13px] text-muted/80">{preset.meta.tags.slice(0, 3).join(' · ')}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
