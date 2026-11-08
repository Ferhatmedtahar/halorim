'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Scene } from '@glowframe/schema';
import { parseScene } from '@glowframe/schema';
import { exportPng, exportSceneJson, exportHtmlPack, PRESET_RESOLUTIONS } from '@glowframe/export';
import {
  TUX_SVG_PATH,
  ARCH_SVG_PATH,
  DEBIAN_SVG_PATH,
  DIAMOND_SVG_PATH,
  HYPERCUBE_SVG_PATH,
  PHANTOM_SVG_PATH,
  INFINITY_SVG_PATH,
  FOUR_PANE_SVG_PATH,
} from '@glowframe/presets';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Download,
  Copy,
  Check,
  Upload,
  Sparkles,
  Sliders,
  Maximize2,
  Terminal,
} from 'lucide-react';

const SHAPE_TEMPLATES: { id: string; name: string; d: string; viewBox: [number, number, number, number] }[] = [
  {
    id: 'triangle',
    name: 'Triangle',
    d: 'M 50 15 L 85 80 L 15 80 Z',
    viewBox: [0, 0, 100, 100],
  },
  {
    id: 'tux',
    name: 'Tux Linux',
    d: TUX_SVG_PATH,
    viewBox: [0, 0, 100, 100],
  },
  {
    id: 'arch',
    name: 'Arch Apex',
    d: ARCH_SVG_PATH,
    viewBox: [0, 0, 110, 100],
  },
  {
    id: 'debian',
    name: 'Debian Swirl',
    d: DEBIAN_SVG_PATH,
    viewBox: [0, 0, 100, 100],
  },
  {
    id: 'diamond',
    name: 'Diamond Facet',
    d: DIAMOND_SVG_PATH,
    viewBox: [0, 0, 100, 100],
  },
  {
    id: 'hypercube',
    name: '4D Tesseract',
    d: HYPERCUBE_SVG_PATH,
    viewBox: [0, 0, 100, 100],
  },
  {
    id: 'phantom',
    name: 'Arcade Ghost',
    d: PHANTOM_SVG_PATH,
    viewBox: [0, 0, 100, 100],
  },
  {
    id: 'infinity',
    name: 'Infinity Loop',
    d: INFINITY_SVG_PATH,
    viewBox: [0, 0, 100, 100],
  },
  {
    id: 'four-pane',
    name: 'Four-Pane',
    d: FOUR_PANE_SVG_PATH,
    viewBox: [0, 0, 100, 100],
  },
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
  const [selectedPaletteIdx, setSelectedPaletteIdx] = useState(0);

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
      const activeColors = PALETTE_PRESETS[selectedPaletteIdx]?.colors ?? ['#00dfd8', '#ffffff'];
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
          params: { speed: 0.05 },
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
  }, [shapeName, svgPath, viewBoxW, viewBoxH, scale, rotationDeg, posX, posY, edgeWidth, falloff, intensity, dispersion, selectedPaletteIdx]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-mono">
      {/* Terminal Title Header */}
      <div className="border border-terminal-border bg-terminal-card p-4 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-terminal-border/60 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-terminal-cyan font-bold text-sm tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              GLOWFRAME // CUSTOM_SHAPE_STUDIO
            </span>
            <Badge variant="green" bracketed>READY</Badge>
            <Badge variant="cyan" bracketed>WEBGL2_EDT</Badge>
          </div>
          <div className="text-[11px] text-terminal-dim">
            SYSTEM_TIME: {new Date().toLocaleTimeString()} | INTERACTIVE_PROJECTION
          </div>
        </div>
        <p className="text-xs text-terminal-dim leading-relaxed">
          Input, transform, and modulate any 2D vector silhouette or SVG path. Real-time subpixel
          distance field transformation with mouse-guided prismatic dispersion.
        </p>
      </div>

      {statusMessage && (
        <div className="mb-6 p-3 bg-terminal-cyan/10 border border-terminal-cyan/40 text-terminal-cyan text-xs flex items-center justify-between shadow-terminal-glow">
          <span>&gt;_ {statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Real-time Live WebGL2 Viewport (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div
            ref={containerRef}
            className="relative w-full aspect-video bg-black border border-terminal-border overflow-hidden shadow-2xl group"
          >
            <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

            {/* Corner Bracket Accents */}
            <div className="absolute top-2 left-2 text-terminal-cyan text-[10px] pointer-events-none opacity-60">
              ┌─ [VIEWPORT: 1920x1080]
            </div>
            <div className="absolute bottom-2 right-2 text-terminal-cyan text-[10px] pointer-events-none opacity-60">
              [FPS: 60.0] ─┘
            </div>

            {/* Live Hover Guidance */}
            <div className="absolute bottom-2 left-2 bg-terminal-bg/80 border border-terminal-border text-[10px] text-terminal-dim px-2 py-0.5 pointer-events-none">
              &gt; Move pointer to steer rim angle • Click to advance spectrum
            </div>
          </div>

          {/* Quick Preset Selector Buttons */}
          <Card>
            <CardHeader className="py-2.5">
              <CardTitle className="text-xs text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-terminal-cyan" />
                RAPID_SHAPE_TEMPLATES
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {SHAPE_TEMPLATES.map((tmpl) => (
                  <Button
                    key={tmpl.id}
                    variant={svgPath === tmpl.d ? 'default' : 'terminal'}
                    size="sm"
                    onClick={() => {
                      setSvgPath(tmpl.d);
                      setViewBoxW(tmpl.viewBox[2]);
                      setViewBoxH(tmpl.viewBox[3]);
                      setShapeName(tmpl.name);
                    }}
                    className="truncate text-[10px]"
                  >
                    {tmpl.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Action Bar */}
          <Card>
            <CardHeader className="py-2.5">
              <CardTitle className="text-xs text-slate-300">
                <Download className="w-3.5 h-3.5 text-terminal-green" />
                EXPORTS &amp; TELEMETRY
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 flex flex-wrap gap-2.5">
              <Button
                variant="cyber"
                size="sm"
                onClick={handleDownloadScene}
                disabled={isExporting}
                className="flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" />
                .GLOWFRAME.JSON
              </Button>
              <Button
                variant="terminal"
                size="sm"
                onClick={handleDownloadHtml}
                disabled={isExporting}
                className="flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" />
                OFFLINE HTML ZIP
              </Button>
              <Button
                variant="amber"
                size="sm"
                onClick={handleDownloadPng}
                disabled={isExporting}
                className="flex items-center gap-1.5"
              >
                <Maximize2 className="w-3 h-3" />
                CAPTURE 4K PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 ml-auto"
              >
                {copied ? <Check className="w-3 h-3 text-terminal-green" /> : <Copy className="w-3 h-3" />}
                {copied ? 'COPIED' : 'COPY JSON'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Shape Modulation & Optical Controls (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Vector Path Input & File Upload */}
          <Card>
            <CardHeader className="py-2.5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-slate-300">
                  <Sliders className="w-3.5 h-3.5 text-terminal-cyan" />
                  VECTOR_SPECIFICATION
                </CardTitle>
                <label className="cursor-pointer text-[10px] text-terminal-cyan hover:text-white flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>UPLOAD_SVG</span>
                  <input type="file" accept=".svg" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-2">
              <div>
                <Label htmlFor="shape-name">SHAPE IDENTIFIER</Label>
                <Input
                  id="shape-name"
                  value={shapeName}
                  onChange={(e) => setShapeName(e.target.value)}
                  prefixSymbol=">_"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="svg-path">SVG PATH STRING (`d`)</Label>
                <textarea
                  id="svg-path"
                  value={svgPath}
                  onChange={(e) => setSvgPath(e.target.value)}
                  rows={3}
                  className="w-full mt-1 bg-terminal-bg border border-terminal-border p-2 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-terminal-cyan resize-none"
                  placeholder="M 50 15 L 85 80 L 15 80 Z"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>VIEWBOX WIDTH</Label>
                  <Input
                    type="number"
                    value={viewBoxW}
                    onChange={(e) => setViewBoxW(Number(e.target.value) || 100)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>VIEWBOX HEIGHT</Label>
                  <Input
                    type="number"
                    value={viewBoxH}
                    onChange={(e) => setViewBoxH(Number(e.target.value) || 100)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Geometry Transformations */}
          <Card>
            <CardHeader className="py-2.5">
              <CardTitle className="text-xs text-slate-300">
                GEOMETRIC_TRANSFORMS
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>SCALE</Label>
                  <span className="text-terminal-cyan">{scale.toFixed(2)}x</span>
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
                <div className="flex justify-between text-xs mb-1">
                  <Label>ROTATION</Label>
                  <span className="text-terminal-cyan">{rotationDeg}&deg;</span>
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
                  <div className="flex justify-between text-xs mb-1">
                    <Label>POS X</Label>
                    <span className="text-terminal-cyan">{posX.toFixed(2)}</span>
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
                  <div className="flex justify-between text-xs mb-1">
                    <Label>POS Y</Label>
                    <span className="text-terminal-cyan">{posY.toFixed(2)}</span>
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
            </CardContent>
          </Card>

          {/* Optics & Atmospheric Glow Falloff */}
          <Card>
            <CardHeader className="py-2.5">
              <CardTitle className="text-xs text-slate-300">
                OPTICAL_RADIANCE &amp; GLOW
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>RIM CORE THICKNESS</Label>
                  <span className="text-terminal-cyan">{(edgeWidth * 1000).toFixed(1)} px</span>
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
                <div className="flex justify-between text-xs mb-1">
                  <Label>ATMOSPHERIC FALLOFF</Label>
                  <span className="text-terminal-amber">{falloff.toFixed(3)}</span>
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
                <div className="flex justify-between text-xs mb-1">
                  <Label>GLOW INTENSITY</Label>
                  <span className="text-terminal-cyan">{intensity.toFixed(2)}x</span>
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
                <div className="flex justify-between text-xs mb-1">
                  <Label>CHROMATIC DISPERSION</Label>
                  <span className="text-terminal-green">{(dispersion * 100).toFixed(0)}%</span>
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

              {/* Color Palette Selector */}
              <div>
                <Label className="block mb-2">SPECTRUM PALETTE</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PALETTE_PRESETS.map((p, idx) => (
                    <button
                      key={p.name}
                      onClick={() => setSelectedPaletteIdx(idx)}
                      className={`p-2 border text-left flex flex-col gap-1.5 transition-all ${
                        selectedPaletteIdx === idx
                          ? 'border-terminal-cyan bg-terminal-cyan/10 shadow-terminal-glow'
                          : 'border-terminal-border hover:border-slate-500 bg-terminal-bg'
                      }`}
                    >
                      <div className="text-[10px] text-slate-300 truncate">{p.name}</div>
                      <div className="flex items-center gap-1">
                        {p.colors.slice(0, 4).map((c, i) => (
                          <div
                            key={i}
                            className="w-3 h-3 rounded-full border border-black/40"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
