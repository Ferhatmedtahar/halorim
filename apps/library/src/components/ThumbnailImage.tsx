'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { Scene } from '@glowframe/schema';

/**
 * Pre-rendered thumbnail. If the PNG is not generated yet, falls back to a flat
 * silhouette of the wallpaper's own shape so the listing never shows a broken image.
 */
export default function ThumbnailImage({ scene }: { scene: Scene }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // The image may have failed before hydration, in which case onError never fires.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  const { shape } = scene;

  if (failed && shape.type === 'svg-path') {
    const [x, y, w, h] = shape.viewBox;
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface" role="img" aria-label={scene.meta.name}>
        <svg viewBox={`${x} ${y} ${w} ${h}`} className="h-1/2 w-1/2 text-muted" fill="currentColor" aria-hidden="true">
          <path d={shape.d} fillRule="evenodd" />
        </svg>
      </div>
    );
  }

  return (
    <Image
      ref={ref}
      src={`/thumbnails/${scene.meta.id}.png`}
      alt={scene.meta.name}
      width={640}
      height={360}
      unoptimized
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
