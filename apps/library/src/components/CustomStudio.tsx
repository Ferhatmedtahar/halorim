'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Scene } from '@glowframe/schema';
import { parseScene } from '@glowframe/schema';
import { LOGOS, INFINITY_SVG_PATH, PHANTOM_SVG_PATH } from '@glowframe/presets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import ColorPicker from '@/components/ColorPicker';
import { Download, Upload } from 'lucide-react';

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
  // The shape is always centred and upright; only its size is adjustable.
  const posX = initialScene?.shape.position[0] ?? 0.5;
  const posY = initialScene?.shape.position[1] ?? 0.52;

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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loadedFile, setLoadedFile] = useState<string | null>(null);

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
          author: 'Halorim Studio User',
          license: 'CC0-1.0',
          tags: ['custom', 'studio', 'vector'],
          description: `Custom interactive shape rendered via Halorim Studio at scale ${scale.toFixed(2)}`,
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
          rotation: 0,
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
  }, [shapeName, svgPath, viewBoxW, viewBoxH, scale, posX, posY, edgeWidth, falloff, intensity, dispersion, selectedPaletteIdx, rotationSpeed, customColor1, customColor2, useCustomColors]);

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
  const readSvgFile = (file: File) => {
    if (!/\.svg$/i.test(file.name) && file.type !== 'image/svg+xml') {
      setStatusMessage('Error: that file is not an SVG');
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }

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
        setLoadedFile(file.name);
        setStatusMessage(`Imported SVG path from "${file.name}"`);
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage('Error: No <path d="..."> found in SVG file');
        setTimeout(() => setStatusMessage(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readSvgFile(file);
    // Lets the same file be chosen again after edits.
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readSvgFile(file);
  };

  // Export: a plain SVG of the shape. The desktop app's "Load Custom SVG" reads the viewBox and path,
  // then lights the edge itself, so nothing else needs to travel with the file.
  const handleDownloadSvg = () => {
    const d = svgPath.trim();
    if (!d) {
      setStatusMessage('Nothing to export: the SVG path is empty');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxW} ${viewBoxH}">\n` +
      `  <path d="${d.replace(/"/g, '&quot;')}" fill="#000000"/>\n` +
      `</svg>\n`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentScene.meta.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage(`Saved ${currentScene.meta.id}.svg`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div>
      <header className="animate-rise border-b border-line px-5 py-12 sm:px-6">
        <h1 className="text-[clamp(36px,6vw,60px)] font-medium leading-[1.02] tracking-[-0.045em]">Studio</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Pick or upload a 2D shape and see its edge lit live. Download it as an SVG, then use Load Custom SVG in the
          Halorim desktop app to run it on your desktop.
        </p>
      </header>

      <p
        className="flex h-11 items-center border-b border-line px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted sm:px-6"
        role="status"
        aria-live="polite"
      >
        {statusMessage ?? ''}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Real-time Live WebGL2 Viewport (7 Cols) */}
        <div className="flex flex-col lg:col-span-7 lg:border-r lg:border-line">
          <div className="bg-dots border-b border-line p-3 sm:p-6">
          <div
            ref={containerRef}
            className="relative aspect-video w-full overflow-hidden border border-line-strong bg-black"
          >
            <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />
            <p className="pointer-events-none absolute bottom-3 left-4 bg-black/60 px-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Move the cursor to steer the light. Click to change colors.
            </p>
          </div>
          </div>

          {/* Shape templates */}
          <section aria-labelledby="templates" className="border-b border-line p-5 sm:p-6">
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
          <section aria-labelledby="export" className="border-b border-line p-5 sm:p-6 lg:border-b-0">
            <h2 id="export" className="text-lg font-medium tracking-tight">
              Export
            </h2>
            <p className="mt-1 text-sm text-muted">
              Saves your shape as <span className="font-mono text-[13px] text-fg">{currentScene.meta.id}.svg</span>.
              In the desktop tray menu, choose Load Custom SVG and pick the file.
            </p>
            <Button className="mt-4" onClick={handleDownloadSvg}>
              <Download className="h-4 w-4" />
              Download SVG
            </Button>
          </section>
        </div>

        {/* Right Column: Shape Modulation & Optical Controls (5 Cols) */}
        <div className="flex flex-col lg:col-span-5">
          {/* Vector Path Input & File Upload */}
          <section aria-labelledby="vector" className="border-b border-line p-5 sm:p-6">
            <h2 id="vector" className="text-lg font-medium tracking-tight">
              Shape
            </h2>

            {/* Upload: a real drop target, not a text link. */}
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`mt-4 flex cursor-pointer flex-col items-center gap-2 border border-dashed px-4 py-7 text-center transition-colors duration-fast ease-out has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-fg ${
                dragging ? 'border-fg bg-raised' : 'border-line-strong bg-surface hover:border-fg hover:bg-raised'
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center border border-line-strong">
                <Upload className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">{dragging ? 'Drop to load' : 'Upload SVG'}</span>
              <span className="text-[13px] text-muted">
                {loadedFile ? `Loaded ${loadedFile}. Click to replace.` : 'Click to choose a file, or drop a .svg here'}
              </span>
              <input type="file" accept=".svg,image/svg+xml" onChange={handleFileUpload} className="sr-only" />
            </label>

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
            </div>
          </section>

          {/* Shape size */}
          <section aria-labelledby="transform" className="border-b border-line p-5 sm:p-6">
            <h2 id="transform" className="text-lg font-medium tracking-tight">
              Size
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
            </div>
          </section>

          {/* Optics & Atmospheric Glow Falloff */}
          <section aria-labelledby="glow" className="border-b border-line p-5 sm:p-6">
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
                    className="h-7 border border-line px-3 text-[13px] text-muted transition-colors duration-fast ease-out hover:border-line-strong hover:text-fg"
                  >
                    Freeze
                  </button>
                  <button
                    onClick={() => setRotationSpeed(0.02)}
                    className="h-7 border border-line px-3 text-[13px] text-muted transition-colors duration-fast ease-out hover:border-line-strong hover:text-fg"
                  >
                    Slow
                  </button>
                  <button
                    onClick={() => setRotationSpeed(0.05)}
                    className="h-7 border border-line px-3 text-[13px] text-muted transition-colors duration-fast ease-out hover:border-line-strong hover:text-fg"
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => setRotationSpeed(0.12)}
                    className="h-7 border border-line px-3 text-[13px] text-muted transition-colors duration-fast ease-out hover:border-line-strong hover:text-fg"
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
                    className={`h-7  px-3 text-[13px] transition-colors duration-fast ease-out ${
                      useCustomColors ? 'border border-fg bg-fg text-bg' : 'border border-line text-muted hover:border-line-strong hover:text-fg'
                    }`}
                  >
                    Custom colors
                  </button>
                </div>

                {useCustomColors ? (
                  <div className="flex flex-col gap-3 border border-line bg-surface p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="mb-2 block">Primary</Label>
                        <ColorPicker label="Primary" value={customColor1} onChange={setCustomColor1} />
                      </div>
                      <div>
                        <Label className="mb-2 block">Secondary</Label>
                        <ColorPicker label="Secondary" value={customColor2} onChange={setCustomColor2} align="end" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 border-l border-t border-line">
                    {PALETTE_PRESETS.map((p, idx) => (
                      <button
                        key={p.name}
                        onClick={() => {
                          setSelectedPaletteIdx(idx);
                          setUseCustomColors(false);
                        }}
                        aria-pressed={selectedPaletteIdx === idx && !useCustomColors}
                        className={`flex flex-col gap-2 border-b border-r border-line p-3 text-left transition-colors duration-fast ease-out ${
                          selectedPaletteIdx === idx && !useCustomColors
                            ? 'bg-fg text-bg'
                            : 'hover:bg-raised'
                        }`}
                      >
                        <div className="truncate text-[13px]">{p.name}</div>
                        <div className="flex items-center gap-1">
                          {p.colors.slice(0, 4).map((c, i) => (
                            <div
                              key={i}
                              className="h-3.5 w-3.5 border border-line-strong"
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
