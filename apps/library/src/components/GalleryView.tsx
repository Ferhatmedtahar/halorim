'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Scene } from '@glowframe/schema';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
          Prismatic Wallpaper Library
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Browse interactive real-time WebGL2 wallpapers with reactive cursor light, physics-based
          click springs, and seamless desktop export.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wallpapers or tags..."
            className="w-full bg-[#12141c] border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
          {allTags.map((tag) => {
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                    : 'bg-white/5 text-slate-400 border border-white/5 hover:border-white/15 hover:text-slate-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {filteredPresets.length === 0 ? (
        <div className="text-center py-20 bg-[#12141c]/50 rounded-2xl border border-white/5">
          <p className="text-slate-400 text-sm">No wallpapers found matching your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPresets.map((preset) => (
            <Link
              key={preset.meta.id}
              href={`/w/${preset.meta.id}`}
              className="group flex flex-col rounded-2xl bg-[#12141c] border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-950/20 hover:-translate-y-1"
            >
              <div className="relative aspect-video w-full bg-black overflow-hidden">
                <Image
                  src={`/thumbnails/${preset.meta.id}.png`}
                  alt={preset.meta.name}
                  width={640}
                  height={360}
                  unoptimized
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 text-[11px] font-semibold tracking-wide text-cyan-300">
                  {preset.mode.id}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {preset.meta.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {preset.meta.description}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {preset.meta.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-slate-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {preset.meta.license}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
