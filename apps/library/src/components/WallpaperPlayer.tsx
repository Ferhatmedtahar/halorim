'use client';

import { useEffect, useRef, useState } from 'react';
import type { Scene } from '@glowframe/schema';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';

interface WallpaperPlayerProps {
  scene: Scene;
}

export default function WallpaperPlayer({ scene }: WallpaperPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let disposed = false;
    let renderer: {
      start: () => void;
      stop: () => void;
      resize: (w: number, h: number, dpr: number) => void;
      dispose: () => void;
    } | null = null;
    let observer: ResizeObserver | null = null;

    async function init() {
      try {
        const { createRenderer, BrowserInput } = await import('@glowframe/core');
        if (disposed || !canvasRef.current || !containerRef.current) return;

        const input = new BrowserInput(canvasRef.current);
        renderer = createRenderer({
          canvas: canvasRef.current,
          scene,
          input,
        });

        const resize = () => {
          if (!containerRef.current || !renderer) return;
          const rect = containerRef.current.getBoundingClientRect();
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          renderer.resize(rect.width, rect.height, dpr);
        };

        observer = new ResizeObserver(() => {
          resize();
        });
        observer.observe(containerRef.current);

        resize();
        renderer.start();
      } catch (err) {
        console.error('Failed to initialize WebGL2 renderer:', err);
        setIsSupported(false);
      }
    }

    void init();

    return () => {
      disposed = true;
      if (observer) {
        observer.disconnect();
      }
      if (renderer) {
        renderer.dispose();
      }
    };
  }, [scene]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(console.error);
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(console.error);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`group relative w-full overflow-hidden bg-black ${
        isFullscreen ? 'fixed inset-0 z-50 aspect-auto' : 'aspect-video rounded-2xl'
      }`}
    >
      <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />

      {!isSupported && (
        <div className="absolute inset-0 flex items-center justify-center bg-black p-6 text-center">
          <p className="max-w-sm text-sm text-muted">
            WebGL2 is not available in this browser, so the live preview cannot run. You can still download the
            wallpaper.
          </p>
        </div>
      )}

      <div className="absolute right-3 top-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleFullscreen}
          className="bg-black/60 backdrop-blur-md hover:bg-black/80"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {isFullscreen ? 'Exit' : 'Fullscreen'}
        </Button>
      </div>

      <p className="pointer-events-none absolute bottom-3 left-4 text-[13px] text-muted">
        Move the cursor to steer the light. Click to change colors.
      </p>
    </div>
  );
}
