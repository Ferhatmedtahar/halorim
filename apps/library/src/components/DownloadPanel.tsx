'use client';

import { useState } from 'react';
import type { Scene } from '@glowframe/schema';
import { exportPng, exportSceneJson, exportHtmlPack, PRESET_RESOLUTIONS } from '@glowframe/export';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Sparkles, FileCode, Archive } from 'lucide-react';

interface DownloadPanelProps {
  scene: Scene;
}

export default function DownloadPanel({ scene }: DownloadPanelProps) {
  const [resolutionKey, setResolutionKey] = useState<keyof typeof PRESET_RESOLUTIONS>('FHD');
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleDownloadPng = async () => {
    try {
      setIsExportingPng(true);
      setStatusMessage('Rendering high-resolution WebGL2 frame...');

      const res = PRESET_RESOLUTIONS[resolutionKey];
      const blob = await exportPng({
        scene,
        width: res.width,
        height: res.height,
        timeMs: 1000,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scene.meta.id}-${res.width}x${res.height}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('PNG still downloaded successfully.');
    } catch (err) {
      console.error('PNG export failed:', err);
      setStatusMessage('Failed to export PNG.');
    } finally {
      setIsExportingPng(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleDownloadScene = () => {
    try {
      const json = exportSceneJson(scene);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scene.meta.id}.glowframe.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Scene definition file downloaded.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Scene export failed:', err);
      setStatusMessage('Failed to export scene file.');
    }
  };

  const handleDownloadHtmlPack = async () => {
    try {
      setIsExportingHtml(true);
      setStatusMessage('Packaging offline standalone wallpaper...');

      let bundledCoreJs: string | undefined;
      try {
        const res = await fetch('/glowframe-core.js');
        if (res.ok) {
          bundledCoreJs = await res.text();
        }
      } catch {
        // Fallback to CDN inside exportHtmlPack
      }

      const zipBytes = await exportHtmlPack({
        scene,
        bundledCoreJs,
      });

      const blob = new Blob([zipBytes], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scene.meta.id}-wallpaper.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('HTML pack exported.');
    } catch (err) {
      console.error('HTML pack export failed:', err);
      setStatusMessage('Failed to export HTML pack.');
    } finally {
      setIsExportingHtml(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <Card className="font-mono">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs">
            <Download className="w-3.5 h-3.5 text-terminal-cyan" />
            EXPORT_WALLPAPER
          </CardTitle>
          <Badge variant="cyan" bracketed>READY</Badge>
        </div>
        <p className="text-[11px] text-terminal-dim mt-1">
          Export as 4K still frame, standalone offline ZIP, or desktop scene format.
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-3">
        {statusMessage && (
          <div className="text-[11px] px-3 py-2 bg-terminal-cyan/10 border border-terminal-cyan/40 text-terminal-cyan flex items-center gap-1.5 shadow-terminal-glow">
            <span>&gt;_ {statusMessage}</span>
          </div>
        )}

        {/* Option 1: PNG Still Image */}
        <div className="p-3 border border-terminal-border bg-terminal-bg flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-terminal-cyan" />
                STILL IMAGE (PNG)
              </div>
              <div className="text-[10px] text-terminal-dim">
                High-res frame rendered via WebGL2
              </div>
            </div>
            <select
              value={resolutionKey}
              onChange={(e) => setResolutionKey(e.target.value as keyof typeof PRESET_RESOLUTIONS)}
              className="bg-terminal-card border border-terminal-border text-[11px] text-slate-200 px-2 py-1 font-mono focus:outline-none focus:border-terminal-cyan"
            >
              {Object.entries(PRESET_RESOLUTIONS).map(([key, res]) => (
                <option key={key} value={key}>
                  {res.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="terminal"
            size="sm"
            onClick={handleDownloadPng}
            disabled={isExportingPng}
            className="w-full mt-1"
          >
            {isExportingPng ? 'Rendering...' : 'Download PNG Still'}
          </Button>
        </div>

        {/* Option 2: Standalone HTML Pack (.zip) */}
        <div className="p-3 border border-terminal-border bg-terminal-bg flex flex-col gap-2.5">
          <div>
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Archive className="w-3 h-3 text-terminal-green" />
              STANDALONE HTML PACK (.ZIP)
            </div>
            <div className="text-[10px] text-terminal-dim mt-0.5">
              Offline interactive bundle. Works with Lively Wallpaper, WebViews, and browsers.
            </div>
          </div>

          <Button
            variant="cyber"
            size="sm"
            onClick={handleDownloadHtmlPack}
            disabled={isExportingHtml}
            className="w-full"
          >
            {isExportingHtml ? 'Packaging...' : 'Download HTML Pack (.zip)'}
          </Button>
        </div>

        {/* Option 3: Scene JSON (.glowframe.json) */}
        <div className="p-3 border border-terminal-border bg-terminal-bg flex flex-col gap-2.5">
          <div>
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <FileCode className="w-3 h-3 text-terminal-amber" />
              DESKTOP SCENE (.GLOWFRAME.JSON)
            </div>
            <div className="text-[10px] text-terminal-dim mt-0.5">
              Native format for the Glowframe Linux / Windows desktop tray engine.
            </div>
          </div>

          <Button
            variant="amber"
            size="sm"
            onClick={handleDownloadScene}
            className="w-full"
          >
            Download .glowframe.json
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
