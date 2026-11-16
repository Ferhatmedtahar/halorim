'use client';

import { useState } from 'react';
import type { Scene } from '@glowframe/schema';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DownloadPanelProps {
  scene: Scene;
}

/** Outline of a plain triangle, for the built-in triangle scene that has no path of its own. */
const TRIANGLE_PATH = 'M 50 15 L 85 80 L 15 80 Z';

/** The wallpaper's shape as a plain SVG file, or `null` when the shape has no path to export. */
function sceneToSvg(scene: Scene): string | null {
  const { shape } = scene;
  let d: string;
  let viewBox: string;
  if (shape.type === 'svg-path') {
    d = shape.d;
    viewBox = shape.viewBox.join(' ');
  } else if (shape.type === 'preset') {
    d = TRIANGLE_PATH;
    viewBox = '0 0 100 100';
  } else {
    return null;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">\n` +
    `  <path d="${d.replace(/"/g, '&quot;')}" fill="#000000"/>\n` +
    `</svg>\n`
  );
}

export default function DownloadPanel({ scene }: DownloadPanelProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const svg = sceneToSvg(scene);

  const handleDownload = () => {
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scene.meta.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage(`Saved ${scene.meta.id}.svg`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div>
      <h2 className="sr-only">Download</h2>
      <p className="border-b border-line px-5 py-3 text-sm text-muted sm:px-6" role="status" aria-live="polite">
        {statusMessage ?? 'For the Halorim desktop app on Linux and Windows.'}
      </p>

      <div className="p-5 sm:p-6">
        <div className="text-[15px] font-medium">Shape as SVG</div>
        <div className="text-sm text-muted">
          Open the tray icon in the desktop app, choose Load Custom SVG and pick this file.
        </div>
        <Button onClick={handleDownload} disabled={!svg} className="mt-3 w-full">
          <Download className="h-4 w-4" />
          Download SVG
        </Button>
        {!svg ? <p className="mt-2 text-sm text-muted">This wallpaper has no outline to export.</p> : null}
      </div>
    </div>
  );
}
