'use client';

import { useEffect, useRef, useState } from 'react';
import type { Scene } from '@glowframe/schema';

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
          const dpr = window.devicePixelRatio || 1;
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
      className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none aspect-auto' : ''
      }`}
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

      {!isSupported && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white p-6 text-center">
          <p className="text-sm text-red-400">
            WebGL2 is not supported or encountered an error in your browser.
          </p>
        </div>
      )}

      {/* Floating HUD Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={toggleFullscreen}
          className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          title="Toggle Fullscreen"
        >
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
      </div>

      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 text-[11px] px-3 py-1.5 rounded-lg pointer-events-none">
        Move pointer to guide rim light &bull; Click shape to interact
      </div>
    </div>
  );
}
