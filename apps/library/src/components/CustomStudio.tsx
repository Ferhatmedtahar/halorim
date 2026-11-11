'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Scene } from '@glowframe/schema';
import { parseScene } from '@glowframe/schema';
import { exportPng, exportSceneJson, exportHtmlPack, PRESET_RESOLUTIONS } from '@glowframe/export';
import { LOGOS, INFINITY_SVG_PATH, PHANTOM_SVG_PATH } from '@glowframe/presets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Download,
  Copy,
  Check,
  Upload,
  Maximize2,
} from 'lucide-react';

type ShapeTemplate = { id: string; name: string; d: string; viewBox: [number, number, number, number] };

const SHAPE_TEMPLATES: ShapeTemplate[] = [
  { id: 'triangle', name: 'Triangle', d: 'M 50 15 L 85 80 L 15 80 Z', viewBox: [0, 0, 100, 100] },
  { id: 'phantom', name: 'Arcade Ghost', d: PHANTOM_SVG_PATH, viewBox: [0, 0, 100, 100] },
  { id: 'infinity', name: 'Infinity Loop', d: INFINITY_SVG_PATH, viewBox: [0, 0, 100, 100] },
  ...LOGOS.map((l): ShapeTemplate => ({ id: l.id, name: l.name, d: l.d, viewBox: [0, 0, 100, 100] })),
];

const PALETTE_PRESETS = [
  {
    name: 'Cyber Aurora',
    colors: ['#00dfd8', '#0070f3', '#7928ca', '#ff0080', '#ffffff'],
  },
  {
    name: 'Amber Glow',
    colors: ['#f59e0b', '#fbbf24', '#f87171', '#ef4444', '#ffffff'],
  },
  {
    name: 'Matrix Emerald',
    colors: ['#10b981', '#34d399', '#06b6d4', '#3b82f6', '#ffffff'],
  },
  {
    name: 'Arch Laser',
    colors: ['#1793d1', '#38bdf8', '#0284c7', '#ffffff', '#0ea5e9'],
  },
  {
    name: 'Ruby Crimson',
    colors: ['#d70a53', '#f43f5e', '#fb7185', '#fda4af', '#ffffff'],
  },
  {
    name: 'Monochrome Silver',
    colors: ['#ffffff', '#cbd5e1', '#64748b', '#334155', '#0f172a'],
  },
];

interface CustomStudioProps {
  initialScene?: Scene;
}

export default function CustomStudio({ initialScene }: CustomStudioProps) {
  // Shape & Transform State
  const [shapeName, setShapeName] = useState(initialScene?.meta.name || 'Custom Shape');
  const [svgPath, setSvgPath] = useState<string>(
    initialScene?.shape.type === 'svg-path' ? initialScene.shape.d : (SHAPE_TEMPLATES[0]?.d ?? 'M 50 15 L 85 80 L 15 80 Z')
  );
  const [viewBoxW, setViewBoxW] = useState(100);
  const [viewBoxH, setViewBoxH] = useState(100);
  const [scale, setScale] = useState(initialScene?.shape.scale ?? 0.32);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [posX, setPosX] = useState(initialScene?.shape.position[0] ?? 0.5);
  const [posY, setPosY] = useState(initialScene?.shape.position[1] ?? 0.52);

  // Optics & Glow State
  const [edgeWidth, setEdgeWidth] = useState(initialScene?.edge.width ?? 0.0035);
  const [falloff, setFalloff] = useState(initialScene?.edge.falloff ?? 0.04);
  const [intensity, setIntensity] = useState(initialScene?.edge.intensity ?? 1.15);
  const [dispersion, setDispersion] = useState(initialScene?.edge.dispersion ?? 0.38);
  const [rotationSpeed, setRotationSpeed] = useState(
    typeof initialScene?.mode.params.speed === 'number' ? initialScene.mode.params.speed : 0.05
  );
  const [selectedPaletteIdx, setSelectedPaletteIdx] = useState(0);
  const [customColor1, setCustomColor1] = useState('#00dfd8');
  const [customColor2, setCustomColor2] = useState('#ff0080');
  const [useCustomColors, setUseCustomColors] = useState(false);

  // Status & UI State
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<{
    dispose: () => void;
    resize: (w: number, h: number, dpr: number) => void;
    start: () => void;
  } | null>(null);

  // Construct Scene Object
  const currentScene: Scene = useMemo(() => {
    try {
      const activeColors = useCustomColors
        ? [customColor1, customColor2, '#ffffff']
        : (PALETTE_PRESETS[selectedPaletteIdx]?.colors ?? ['#00dfd8', '#ffffff']);
      return parseScene({
        schemaVersion: 1,
        meta: {
          id: shapeName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'custom-shape',
          name: shapeName,
          author: 'Glowframe Studio User',
          license: 'CC0-1.0',
          tags: ['custom', 'studio', 'vector'],
          description: `Custom interactive shape rendered via Glowframe Studio at scale ${scale.toFixed(2)}`,
        },
        background: {
          color: '#000000',
          haze: { intensity: 0.0 },
        },
        shape: {
          type: 'svg-path',
          d: svgPath,
          viewBox: [0, 0, viewBoxW, viewBoxH],
          position: [posX, posY],
          scale: scale,
          rotation: (rotationDeg * Math.PI) / 180,
        },
        fill: {
          color: '#000000',
          content: null,
        },
        edge: {
          width: edgeWidth,
          falloff: falloff,
          intensity: intensity,
          dispersion: dispersion,
        },
        palettes: [
          activeColors,
          ...PALETTE_PRESETS.filter((_, i) => i !== selectedPaletteIdx).map((p) => p.colors),
        ],
        mode: {
          id: 'rotate',
          params: { speed: rotationSpeed },
        },
        modifiers: [],
        interaction: {
          followCursor: true,
          sharpness: 3.5,
          smoothing: 0.5,
          idleOrbit: false,
          idleTimeoutMs: 2000,
        },
        onClick: {
          object: [{ action: 'next-palette' }],
          background: [{ action: 'next-palette' }],
        },
        performance: {
          fpsCap: 60,
          resolutionScale: 1.0,
        },
      });
    } catch {
      // Fallback safe scene
      return parseScene({
        schemaVersion: 1,
        meta: { id: 'custom-safe', name: 'Safe Shape', author: 'Studio', license: 'MIT', tags: ['custom'] },
        background: { color: '#000000', haze: { intensity: 0 } },
        shape: { type: 'svg-path', d: SHAPE_TEMPLATES[0]?.d ?? 'M 50 15 L 85 80 L 15 80 Z', viewBox: [0, 0, 100, 100], position: [0.5, 0.5], scale: 0.3, rotation: 0 },
        fill: { color: '#000000', content: null },
        edge: { width: 0.0035, falloff: 0.04, intensity: 1.15, dispersion: 0.38 },
        palettes: [PALETTE_PRESETS[0]?.colors ?? ['#ffffff']],
        mode: { id: 'rotate', params: { speed: 0.05 } },
        modifiers: [],
        interaction: { followCursor: true, sharpness: 3.5, smoothing: 0.5, idleOrbit: false, idleTimeoutMs: 2000 },
        onClick: { object: [{ action: 'next-palette' }], background: [{ action: 'none' }] },
        performance: { fpsCap: 60, resolutionScale: 1 },
      });
    }
  }, [shapeName, svgPath, viewBoxW, viewBoxH, scale, rotationDeg, posX, posY, edgeWidth, falloff, intensity, dispersion, selectedPaletteIdx, rotationSpeed, customColor1, customColor2, useCustomColors]);

  // Mount & Update WebGL2 Renderer
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | null = null;

    async function init() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      try {
        const { createRenderer, BrowserInput } = await import('@glowframe/core');
        if (disposed || !canvasRef.current || !containerRef.current) return;

        if (rendererRef.current) {
          rendererRef.current.dispose();
          rendererRef.current = null;
        }

        const input = new BrowserInput(canvasRef.current);
        const renderer = createRenderer({
          canvas: canvasRef.current,
          scene: currentScene,
          input,
        });

        rendererRef.current = renderer;

        const resize = () => {
          if (!containerRef.current || !rendererRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          rendererRef.current.resize(rect.width, rect.height, dpr);
        };

        observer = new ResizeObserver(() => resize());
        observer.observe(containerRef.current);
        resize();
        renderer.start();
      } catch (err) {
        console.error('Failed to init studio WebGL2 renderer:', err);
      }
    }

    void init();

    return () => {
      disposed = true;
      if (observer) observer.disconnect();
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, [currentScene]);

  // Handle SVG File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Extract viewBox if present
      const vbMatch = text.match(/viewBox=["']([^"']+)["']/i);
      if (vbMatch && vbMatch[1]) {
        const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] !== undefined && parts[3] !== undefined && !isNaN(parts[2]) && !isNaN(parts[3])) {
          setViewBoxW(parts[2]);
          setViewBoxH(parts[3]);
        }
      }

      // Extract path d attribute
      const pathMatch = text.match(/<path[^>]+d=["']([^"']+)["']/i);
      if (pathMatch && pathMatch[1]) {
        setSvgPath(pathMatch[1]);
        setShapeName(file.name.replace(/\.[^/.]+$/, ''));
        setStatusMessage(`Imported SVG path from "${file.name}"`);
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage('Error: No <path d="..."> found in SVG file');
        setTimeout(() => setStatusMessage(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  // Download Handlers
  const handleDownloadScene = () => {
    try {
      const json = exportSceneJson(currentScene);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentScene.meta.id}.glowframe.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Scene JSON exported successfully');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setStatusMessage('Export failed');
    }
  };

  const handleDownloadPng = async () => {
    try {
      setIsExporting(true);
      setStatusMessage('Rendering high-res 4K frame...');
      const res = PRESET_RESOLUTIONS['UHD_4K'];
      const blob = await exportPng({
        scene: currentScene,
        width: res.width,
        height: res.height,
        timeMs: 1000,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentScene.meta.id}-4k.png`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('4K PNG snapshot downloaded');
    } catch (err) {
      console.error(err);
      setStatusMessage('PNG render failed');
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleDownloadHtml = async () => {
    try {
      setIsExporting(true);
      setStatusMessage('Packaging standalone offline ZIP...');
      let bundledCoreJs: string | undefined;
      try {
        const res = await fetch('/glowframe-core.js');
        if (res.ok) bundledCoreJs = await res.text();
      } catch {}

      const zipBytes = await exportHtmlPack({
        scene: currentScene,
        bundledCoreJs,
      });

      const blob = new Blob([zipBytes], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentScene.meta.id}-wallpaper.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Offline HTML wallpaper pack downloaded');
    } catch (err) {
      console.error(err);
      setStatusMessage('HTML pack packaging failed');
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleCopyJson = () => {
    const json = JSON.stringify(currentScene, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setStatusMessage('Scene configuration copied to clipboard');
    setTimeout(() => {
      setCopied(false);
      setStatusMessage(null);
    }, 2500);
  };

  return (
    <div className="mx-auto max-w-site px-4 pb-8 pt-10 sm:px-6">
      <header className="max-w-2xl animate-rise">
        <h1 className="text-[clamp(36px,6vw,60px)] font-medium leading-[1.02] tracking-[-0.045em]">Studio</h1>
        <p className="mt-4 text-muted">
          Draw or upload any 2D shape and light its edge. Everything updates live, then export it as a still, an HTML
          pack or a scene file.
        </p>
      </header>

      <p
        className="mt-6 h-5 text-sm text-muted"
        role="status"
        aria-live="polite"
      >
        {statusMessage ?? ''}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Left Column: Real-time Live WebGL2 Viewport (7 Cols) */}
        <div className="flex flex-col gap-10 lg:col-span-7">
          <div
            ref={containerRef}
            className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black"
          >
            <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />
            <p className="pointer-events-none absolute bottom-3 left-4 text-[13px] text-muted">
              Move the cursor to steer the light. Click to change colors.
            </p>
          </div>

          {/* Shape templates */}
          <section aria-labelledby="templates">
            <h2 id="templates" className="text-lg font-medium tracking-tight">
              Templates
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {SHAPE_TEMPLATES.map((tmpl) => (
                <Button
                  key={tmpl.id}
                  variant={svgPath === tmpl.d ? 'default' : 'secondary'}
                  size="sm"
                  aria-pressed={svgPath === tmpl.d}
                  onClick={() => {
                    setSvgPath(tmpl.d);
                    setViewBoxW(tmpl.viewBox[2]);
                    setViewBoxH(tmpl.viewBox[3]);
                    setShapeName(tmpl.name);
                  }}
                >
                  {tmpl.name}
                </Button>
              ))}
            </div>
          </section>

          {/* Export */}
          <section aria-labelledby="export">
            <h2 id="export" className="text-lg font-medium tracking-tight">
              Export
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={handleDownloadScene} disabled={isExporting}>
                <Download className="h-3.5 w-3.5" />
                .glowframe.json
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownloadHtml} disabled={isExporting}>
                <Download className="h-3.5 w-3.5" />
                Offline HTML zip
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownloadPng} disabled={isExporting}>
                <Maximize2 className="h-3.5 w-3.5" />
                Capture 4K PNG
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopyJson} className="sm:ml-auto">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy JSON'}
              </Button>
            </div>
          </section>
        </div>

        {/* Right Column: Shape Modulation & Optical Controls (5 Cols) */}
        <div className="flex flex-col gap-10 lg:col-span-5">
          {/* Vector Path Input & File Upload */}
          <section aria-labelledby="vector" className="rounded-2xl bg-surface p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 id="vector" className="text-lg font-medium tracking-tight">
                Shape
              </h2>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-full text-sm text-muted transition-colors duration-fast ease-out hover:text-fg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-fg">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload SVG</span>
                <input type="file" accept=".svg" onChange={handleFileUpload} className="sr-only" />
              </label>
            </div>
            <div className="mt-5 flex flex-col gap-4">
              <div>
                <Label htmlFor="shape-name">Name</Label>
                <Input
                  id="shape-name"
                  value={shapeName}
                  onChange={(e) => setShapeName(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="svg-path">SVG path</Label>
                <textarea
                  id="svg-path"
                  value={svgPath}
                  onChange={(e) => setSvgPath(e.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl bg-raised p-3 font-mono text-[13px] text-fg outline-none transition-colors duration-fast ease-out placeholder:text-muted hover:bg-hover focus-visible:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
                  placeholder="M 50 15 L 85 80 L 15 80 Z"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Viewbox width</Label>
                  <Input
                    type="number"
                    value={viewBoxW}
                    onChange={(e) => setViewBoxW(Number(e.target.value) || 100)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Viewbox height</Label>
                  <Input
                    type="number"
                    value={viewBoxH}
                    onChange={(e) => setViewBoxH(Number(e.target.value) || 100)}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Geometry Transformations */}
          <section aria-labelledby="transform" className="rounded-2xl bg-surface p-5 sm:p-6">
            <h2 id="transform" className="text-lg font-medium tracking-tight">
              Transform
            </h2>
            <div className="mt-5 flex flex-col gap-5">
              <div>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <Label>Scale</Label>
                  <span className="tabular-nums text-fg">{scale.toFixed(2)}x</span>
                </div>
                <Slider
                  min={0.08}
                  max={0.8}
                  step={0.01}
                  value={[scale]}
                  onValueChange={(val) => {
                    const v = val[0];
                    if (v !== undefined) setScale(v);
                  }}
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <Label>Rotation</Label>
                  <span className="tabular-nums text-fg">{rotationDeg}&deg;</span>
                </div>
                <Slider
                  min={0}
                  max={360}
                  step={1}
                  value={[rotationDeg]}
                  onValueChange={(val) => {
                    const v = val[0];
                    if (v !== undefined) setRotationDeg(v);
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <Label>Position X</Label>
                    <span className="tabular-nums text-fg">{posX.toFixed(2)}</span>
                  </div>
                  <Slider
                    min={0.1}
                    max={0.9}
                    step={0.01}
                    value={[posX]}
                    onValueChange={(val) => {
                      const v = val[0];
                      if (v !== undefined) setPosX(v);
                    }}
                  />
                </div>
                <div>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <Label>Position Y</Label>
                    <span className="tabular-nums text-fg">{posY.toFixed(2)}</span>
                  </div>
                  <Slider
                    min={0.1}
                    max={0.9}
                    step={0.01}
                    value={[posY]}
                    onValueChange={(val) => {
                      const v = val[0];
                      if (v !== undefined) setPosY(v);
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Optics & Atmospheric Glow Falloff */}
          <section aria-labelledby="glow" className="rounded-2xl bg-surface p-5 sm:p-6">
            <h2 id="glow" className="text-lg font-medium tracking-tight">
              Glow
            </h2>
            <div className="mt-5 flex flex-col gap-5">
              <div>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <Label>Rim thickness</Label>
                  <span className="tabular-nums text-fg">{(edgeWidth * 1000).toFixed(1)} px</span>
                </div>
                <Slider
                  min={0.001}
                  max={0.01}
                  step={0.0005}
                  value={[edgeWidth]}
                  onValueChange={(val) => {
                    const v = val[0];
                    if (v !== undefined) setEdgeWidth(v);
                  }}
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <Label>Falloff</Label>
                  <span className="tabular-nums text-fg">{falloff.toFixed(3)}</span>
                </div>
                <Slider
                  min={0.01}
                  max={0.12}
                  step={0.005}
                  value={[falloff]}
                  onValueChange={(val) => {
                    const v = val[0];
                    if (v !== undefined) setFalloff(v);
                  }}
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <Label>Intensity</Label>
                  <span className="tabular-nums text-fg">{intensity.toFixed(2)}x</span>
                </div>
                <Slider
                  min={0.5}
                  max={2.5}
                  step={0.05}
                  value={[intensity]}
                  onValueChange={(val) => {
                    const v = val[0];
                    if (v !== undefined) setIntensity(v);
                  }}
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <Label>Dispersion</Label>
                  <span className="tabular-nums text-fg">{(dispersion * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  min={0.0}
                  max={1.0}
                  step={0.02}
                  value={[dispersion]}
                  onValueChange={(val) => {
                    const v = val[0];
                    if (v !== undefined) setDispersion(v);
                  }}
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <Label>Rotation speed</Label>
                  <span className="tabular-nums text-fg">
                    {rotationSpeed === 0 ? 'Frozen' : `${rotationSpeed.toFixed(3)}x`}
                  </span>
                </div>
                <Slider
                  min={0.0}
                  max={0.2}
                  step={0.005}
                  value={[rotationSpeed]}
                  onValueChange={(val) => {
                    const v = val[0];
                    if (v !== undefined) setRotationSpeed(v);
                  }}
                />
                <div className="mt-3 flex gap-1.5">
                  <button
                    onClick={() => setRotationSpeed(0)}
                    className="h-7 rounded-full bg-raised px-3 text-[13px] text-muted transition-colors duration-fast ease-out hover:bg-hover hover:text-fg"
                  >
                    Freeze
                  </button>
                  <button
                    onClick={() => setRotationSpeed(0.02)}
                    className="h-7 rounded-full bg-raised px-3 text-[13px] text-muted transition-colors duration-fast ease-out hover:bg-hover hover:text-fg"
                  >
                    Slow
                  </button>
                  <button
                    onClick={() => setRotationSpeed(0.05)}
                    className="h-7 rounded-full bg-raised px-3 text-[13px] text-muted transition-colors duration-fast ease-out hover:bg-hover hover:text-fg"
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => setRotationSpeed(0.12)}
                    className="h-7 rounded-full bg-raised px-3 text-[13px] text-muted transition-colors duration-fast ease-out hover:bg-hover hover:text-fg"
                  >
                    Fast
                  </button>
                </div>
              </div>

              {/* Color Palette & Custom Picker */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <Label>Palette</Label>
                  <button
                    onClick={() => setUseCustomColors(!useCustomColors)}
                    aria-pressed={useCustomColors}
                    className={`h-7 rounded-full px-3 text-[13px] transition-colors duration-fast ease-out ${
                      useCustomColors ? 'bg-fg text-bg' : 'bg-raised text-muted hover:bg-hover hover:text-fg'
                    }`}
                  >
                    Custom colors
                  </button>
                </div>

                {useCustomColors ? (
                  <div className="flex flex-col gap-3 rounded-xl bg-raised p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="mb-2 block">Primary</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customColor1}
                            onChange={(e) => setCustomColor1(e.target.value)}
                            className="h-8 w-8 cursor-pointer rounded-lg bg-transparent"
                          />
                          <span className="font-mono text-[13px] text-muted">{customColor1}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="mb-2 block">Secondary</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customColor2}
                            onChange={(e) => setCustomColor2(e.target.value)}
                            className="h-8 w-8 cursor-pointer rounded-lg bg-transparent"
                          />
                          <span className="font-mono text-[13px] text-muted">{customColor2}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {PALETTE_PRESETS.map((p, idx) => (
                      <button
                        key={p.name}
                        onClick={() => {
                          setSelectedPaletteIdx(idx);
                          setUseCustomColors(false);
                        }}
                        aria-pressed={selectedPaletteIdx === idx && !useCustomColors}
                        className={`flex flex-col gap-2 rounded-xl p-3 text-left transition-colors duration-fast ease-out ${
                          selectedPaletteIdx === idx && !useCustomColors
                            ? 'bg-line'
                            : 'bg-raised hover:bg-hover'
                        }`}
                      >
                        <div className="truncate text-[13px] text-fg">{p.name}</div>
                        <div className="flex items-center gap-1">
                          {p.colors.slice(0, 4).map((c, i) => (
                            <div
                              key={i}
                              className="h-3.5 w-3.5 rounded-full"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
