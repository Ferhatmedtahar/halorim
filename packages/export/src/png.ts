import { Scene, parseScene } from '@glowframe/schema';
import { createRenderer, ManualClock } from '@glowframe/core';

export interface ExportPngOptions {
  scene: Scene;
  width: number;
  height: number;
  timeMs?: number;
  canvas?: HTMLCanvasElement | OffscreenCanvas;
}

export const PRESET_RESOLUTIONS = {
  FHD: { width: 1920, height: 1080, label: '1080p (FHD)' },
  QHD: { width: 2560, height: 1440, label: '1440p (2K)' },
  UHD_4K: { width: 3840, height: 2160, label: '4K (UHD)' },
} as const;

/**
 * Renders a high-resolution deterministic still frame of a scene into a PNG Blob.
 * Performs render and readback within the same synchronous microtask to guarantee non-blank output.
 */
export async function exportPng(options: ExportPngOptions): Promise<Blob> {
  const { scene, width, height, timeMs = 1000 } = options;
  const validatedScene = parseScene(scene);

  let canvas = options.canvas;
  let ownsCanvas = false;

  if (!canvas) {
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
      ownsCanvas = true;
    } else if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      ownsCanvas = true;
    } else {
      throw new Error('Canvas environment unavailable for PNG export');
    }
  } else {
    canvas.width = width;
    canvas.height = height;
  }

  const clock = new ManualClock(timeMs);
  const renderer = createRenderer({
    canvas,
    scene: {
      ...validatedScene,
      performance: {
        ...validatedScene.performance,
        resolutionScale: 1.0, // Always render export at 1:1 native resolution
      },
    },
    clock,
  });

  try {
    renderer.renderFrame(timeMs);

    if ('convertToBlob' in canvas && typeof canvas.convertToBlob === 'function') {
      return await canvas.convertToBlob({ type: 'image/png' });
    }

    if ('toBlob' in canvas && typeof (canvas as HTMLCanvasElement).toBlob === 'function') {
      return await new Promise<Blob>((resolve, reject) => {
        (canvas as HTMLCanvasElement).toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/png');
      });
    }

    throw new Error('No blob conversion method supported on target canvas');
  } finally {
    renderer.dispose();
    if (
      ownsCanvas &&
      'remove' in canvas &&
      typeof (canvas as HTMLCanvasElement).remove === 'function'
    ) {
      (canvas as HTMLCanvasElement).remove();
    }
  }
}
