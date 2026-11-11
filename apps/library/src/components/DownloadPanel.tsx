'use client';

import { useState } from 'react';
import type { Scene } from '@glowframe/schema';
import { exportPng, exportSceneJson, exportHtmlPack, PRESET_RESOLUTIONS } from '@glowframe/export';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';

interface DownloadPanelProps {
  scene: Scene;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DownloadPanel({ scene }: DownloadPanelProps) {
  const [resolutionKey, setResolutionKey] = useState<keyof typeof PRESET_RESOLUTIONS>('FHD');
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const flash = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDownloadPng = async () => {
    try {
      setIsExportingPng(true);
      setStatusMessage('Rendering frame');
      const res = PRESET_RESOLUTIONS[resolutionKey];
      const blob = await exportPng({ scene, width: res.width, height: res.height, timeMs: 1000 });
      saveBlob(blob, `${scene.meta.id}-${res.width}x${res.height}.png`);
      flash('PNG downloaded');
    } catch (err) {
      console.error('PNG export failed:', err);
      flash('PNG export failed');
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadScene = () => {
    try {
      const json = exportSceneJson(scene);
      saveBlob(new Blob([json], { type: 'application/json' }), `${scene.meta.id}.glowframe.json`);
      flash('Scene file downloaded');
    } catch (err) {
      console.error('Scene export failed:', err);
      flash('Scene export failed');
    }
  };

  const handleDownloadHtmlPack = async () => {
    try {
      setIsExportingHtml(true);
      setStatusMessage('Packaging wallpaper');
      let bundledCoreJs: string | undefined;
      try {
        const res = await fetch('/glowframe-core.js');
        if (res.ok) bundledCoreJs = await res.text();
      } catch {
        // Falls back to the CDN inside exportHtmlPack
      }
      const zipBytes = await exportHtmlPack({ scene, bundledCoreJs });
      saveBlob(new Blob([zipBytes as BlobPart], { type: 'application/zip' }), `${scene.meta.id}-wallpaper.zip`);
      flash('HTML pack downloaded');
    } catch (err) {
      console.error('HTML pack export failed:', err);
      flash('HTML pack export failed');
    } finally {
      setIsExportingHtml(false);
    }
  };

  return (
    <div className="rounded-2xl bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-medium tracking-tight">
        <Download className="h-4 w-4 text-muted" />
        Download
      </h2>
      <p className="mt-1 text-sm text-muted" role="status" aria-live="polite">
        {statusMessage ?? 'Pick the format that fits how you run wallpapers.'}
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[15px] font-medium">Still image</div>
              <div className="text-sm text-muted">PNG rendered at the resolution you choose</div>
            </div>
            <Select value={resolutionKey} onValueChange={(v) => setResolutionKey(v as keyof typeof PRESET_RESOLUTIONS)}>
              <SelectTrigger aria-label="Resolution" className="h-8 w-auto shrink-0 gap-2 rounded-full bg-raised px-3 text-[13px] hover:bg-hover">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRESET_RESOLUTIONS).map(([key, res]) => (
                  <SelectItem key={key} value={key}>
                    {res.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="secondary" onClick={handleDownloadPng} disabled={isExportingPng} className="mt-3 w-full">
            {isExportingPng ? 'Rendering' : 'Download PNG Still'}
          </Button>
        </div>

        <div>
          <div className="text-[15px] font-medium">Interactive pack</div>
          <div className="text-sm text-muted">Offline HTML bundle for Lively Wallpaper, WebViews and browsers</div>
          <Button onClick={handleDownloadHtmlPack} disabled={isExportingHtml} className="mt-3 w-full">
            {isExportingHtml ? 'Packaging' : 'Download HTML Pack (.zip)'}
          </Button>
        </div>

        <div>
          <div className="text-[15px] font-medium">Desktop scene</div>
          <div className="text-sm text-muted">Native file for the Glowframe desktop app</div>
          <Button variant="secondary" onClick={handleDownloadScene} className="mt-3 w-full">
            Download .glowframe.json
          </Button>
        </div>
      </div>
    </div>
  );
}
