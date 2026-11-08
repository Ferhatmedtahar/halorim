'use client';

import { useState } from 'react';
import type { Scene } from '@glowframe/schema';
import { exportPng, exportSceneJson, exportHtmlPack, PRESET_RESOLUTIONS } from '@glowframe/export';

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
      setStatusMessage('Rendering high-res frame...');

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
      setStatusMessage('PNG downloaded!');
    } catch (err) {
      console.error('PNG export failed:', err);
      setStatusMessage('Failed to export PNG');
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
      setStatusMessage('Scene file downloaded!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Scene export failed:', err);
      setStatusMessage('Failed to export scene');
    }
  };

  const handleDownloadHtmlPack = async () => {
    try {
      setIsExportingHtml(true);
      setStatusMessage('Packaging offline wallpaper...');

      let bundledCoreJs: string | undefined;
      try {
        const res = await fetch('/glowframe-core.js');
        if (res.ok) {
          bundledCoreJs = await res.text();
        }
      } catch {
        // Fallback to CDN inside exportHtmlPack if local fetch fails
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
      setStatusMessage('HTML pack downloaded!');
    } catch (err) {
      console.error('HTML pack export failed:', err);
      setStatusMessage('Failed to export HTML pack');
    } finally {
      setIsExportingHtml(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
      <div>
        <h3 className="text-base font-bold text-white mb-1">Download Wallpaper</h3>
        <p className="text-xs text-slate-400">
          Export as still artwork, portable desktop scene, or an offline interactive pack.
        </p>
      </div>

      {statusMessage && (
        <div className="text-xs px-3 py-2 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 animate-fade-in">
          {statusMessage}
        </div>
      )}

      {/* Option 1: PNG Still Image */}
      <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Still Image (PNG)</div>
            <div className="text-[11px] text-slate-400">
              High-resolution frame rendered directly from WebGL2
            </div>
          </div>
          <select
            value={resolutionKey}
            onChange={(e) => setResolutionKey(e.target.value as keyof typeof PRESET_RESOLUTIONS)}
            className="bg-[#1a1d29] border border-white/10 rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            {Object.entries(PRESET_RESOLUTIONS).map(([key, res]) => (
              <option key={key} value={key}>
                {res.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleDownloadPng}
          disabled={isExportingPng}
          className="w-full mt-1 py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-semibold text-white transition-all disabled:opacity-50"
        >
          {isExportingPng ? 'Rendering...' : 'Download PNG Still'}
        </button>
      </div>

      {/* Option 2: Standalone HTML Pack (.zip) */}
      <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
        <div>
          <div className="text-sm font-semibold text-white">Standalone HTML Pack (.zip)</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Offline interactive package. Ready for Lively Wallpaper, webviews, and browsers.
          </div>
        </div>

        <button
          onClick={handleDownloadHtmlPack}
          disabled={isExportingHtml}
          className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-cyan-950/50 transition-all disabled:opacity-50"
        >
          {isExportingHtml ? 'Packaging...' : 'Download HTML Pack (.zip)'}
        </button>
      </div>

      {/* Option 3: Scene JSON (.glowframe.json) */}
      <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
        <div>
          <div className="text-sm font-semibold text-white">Wallpaper File (.glowframe.json)</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Native scene format for the Glowframe desktop engine and Tauri runner.
          </div>
        </div>

        <button
          onClick={handleDownloadScene}
          className="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-semibold text-white transition-all"
        >
          Download .glowframe.json
        </button>
      </div>
    </div>
  );
}
