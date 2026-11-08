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
      className={`relative w-full aspect-video overflow-hidden bg-black border border-terminal-border shadow-2xl font-mono ${
        isFullscreen ? 'fixed inset-0 z-50 border-none aspect-auto' : ''
      }`}
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

      {/* Terminal HUD telemetry */}
      <div className="absolute top-3 left-3 text-terminal-cyan text-[10px] pointer-events-none opacity-70">
        ┌─ [LIVE_WEBGL2_PIPELINE]
      </div>
      <div className="absolute bottom-3 right-3 text-terminal-cyan text-[10px] pointer-events-none opacity-70">
        [POINTER_INPUT: ACTIVE] ─┘
      </div>

      {!isSupported && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-white p-6 text-center">
          <p className="text-xs text-terminal-pink border border-terminal-pink/40 bg-terminal-pink/10 p-4">
            [ERR_WEBGL2_UNSUPPORTED]: WebGL2 context initialization failed.
          </p>
        </div>
      )}

      {/* Floating HUD Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <Button
          variant="terminal"
          size="sm"
          onClick={toggleFullscreen}
          className="text-[10px] h-7 px-2.5 flex items-center gap-1.5"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          <span>{isFullscreen ? 'EXIT_FULLSCREEN' : 'FULLSCREEN'}</span>
        </Button>
      </div>

      <div className="absolute bottom-3 left-3 bg-terminal-bg/85 border border-terminal-border text-terminal-dim text-[10px] px-2.5 py-1 pointer-events-none">
        &gt; Move cursor to guide rim light &bull; Click to cycle spectrum
      </div>
    </div>
  );
}
