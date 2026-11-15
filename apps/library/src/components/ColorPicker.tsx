'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Pipette } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------------------------------------------------------------------------
   Colour maths. Hue is kept in state so dragging to grey or black does not lose it.
   --------------------------------------------------------------------------- */

interface Hsv {
  h: number; // 0..360
  s: number; // 0..1
  v: number; // 0..1
}

const HEX_RE = /^#?([0-9a-f]{6})$/i;

function hexToHsv(hex: string): Hsv | null {
  const m = HEX_RE.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (f: number) =>
    Math.round((f + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

/** Drag surface: reports a 0..1 position while the pointer is down, with keyboard support via the parent. */
function useDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const update = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      onMove(clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height));
    },
    [onMove],
  );
  return {
    ref,
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      update(e);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e);
    },
  };
}

/* ---------------------------------------------------------------------------
   Component
   --------------------------------------------------------------------------- */

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  /** Which edge of the trigger the panel lines up with. */
  align?: 'start' | 'end';
}

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  }
}

export default function ColorPicker({ value, onChange, label, align = 'start' }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value) ?? { h: 0, s: 0, v: 0 });
  const [hexDraft, setHexDraft] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Follow outside changes to `value` (e.g. a reset) without fighting the user's own drag.
  useEffect(() => {
    if (hsvToHex(hsv).toLowerCase() !== value.toLowerCase()) {
      const next = hexToHsv(value);
      if (next) setHsv((cur) => ({ h: next.s === 0 || next.v === 0 ? cur.h : next.h, s: next.s, v: next.v }));
    }
    setHexDraft(value);
  }, [value]);

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const commit = (next: Hsv) => {
    setHsv(next);
    onChange(hsvToHex(next));
  };

  const area = useDrag((x, y) => commit({ ...hsv, s: x, v: 1 - y }));
  const hue = useDrag((x) => commit({ ...hsv, h: x * 360 }));

  const onAreaKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const delta = d[e.key];
    if (!delta) return;
    e.preventDefault();
    commit({ ...hsv, s: clamp(hsv.s + delta[0]), v: clamp(hsv.v + delta[1]) });
  };

  const onHueKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 20 : 4;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    commit({ ...hsv, h: clamp(hsv.h + (e.key === 'ArrowRight' ? step : -step), 0, 360) });
  };

  const applyHex = (raw: string) => {
    const next = hexToHsv(raw);
    if (!next) {
      setHexDraft(value); // not a valid colour: put the last good one back
      return;
    }
    commit({ h: next.s === 0 || next.v === 0 ? hsv.h : next.h, s: next.s, v: next.v });
  };

  const pickFromScreen = async () => {
    if (!window.EyeDropper) return;
    try {
      const { sRGBHex } = await new window.EyeDropper().open();
      applyHex(sRGBHex);
    } catch {
      // The user cancelled the eyedropper.
    }
  };

  const hueColor = hsvToHex({ h: hsv.h, s: 1, v: 1 });

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label}: ${value}. Change colour`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (!open && triggerRef.current) {
            // Open upward when the panel (about 280px tall) would run off the bottom of the window.
            const r = triggerRef.current.getBoundingClientRect();
            setAbove(window.innerHeight - r.bottom < 290 && r.top > window.innerHeight - r.bottom);
          }
          setOpen((o) => !o);
        }}
        className={cn(
          'flex h-10 w-full items-center gap-3 border bg-surface px-2 text-left transition-colors duration-fast ease-out hover:border-line-strong',
          open ? 'border-fg' : 'border-line',
        )}
      >
        <span className="h-6 w-6 shrink-0 border border-line-strong" style={{ backgroundColor: value }} />
        <span className="font-mono text-[13px] uppercase text-fg">{value}</span>
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={`${label} colour`}
          className={cn(
            'absolute z-50 w-60 border border-line-strong bg-popover p-3',
            above ? 'bottom-full mb-1' : 'top-full mt-1',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {/* Saturation (x) and brightness (y) */}
          <div
            {...area}
            role="slider"
            tabIndex={0}
            aria-label="Saturation and brightness"
            aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
            aria-valuenow={Math.round(hsv.s * 100)}
            onKeyDown={onAreaKey}
            className="relative h-36 w-full cursor-crosshair touch-none select-none border border-line-strong"
            style={{
              backgroundColor: hueColor,
              backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 border-2 border-white"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, boxShadow: '0 0 0 1px #000' }}
            />
          </div>

          {/* Hue */}
          <div
            {...hue}
            role="slider"
            tabIndex={0}
            aria-label="Hue"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsv.h)}
            onKeyDown={onHueKey}
            className="relative mt-3 h-3 w-full cursor-ew-resize touch-none select-none border border-line-strong"
            style={{
              backgroundImage:
                'linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)',
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-[3px] h-[17px] w-1.5 -translate-x-1/2 border border-black bg-white"
              style={{ left: `${(hsv.h / 360) * 100}%` }}
            />
          </div>

          {/* Hex and eyedropper */}
          <div className="mt-3 flex items-center gap-2">
            <input
              aria-label="Hex colour"
              value={hexDraft}
              maxLength={7}
              spellCheck={false}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={(e) => applyHex(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyHex(e.currentTarget.value);
              }}
              className="h-9 min-w-0 flex-1 border border-line bg-surface px-2 font-mono text-[13px] uppercase text-fg outline-none transition-colors duration-fast ease-out hover:border-line-strong focus-visible:border-fg"
            />
            {typeof window !== 'undefined' && window.EyeDropper ? (
              <button
                type="button"
                onClick={pickFromScreen}
                aria-label="Pick a colour from the screen"
                className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-muted transition-colors duration-fast ease-out hover:border-line-strong hover:text-fg"
              >
                <Pipette className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
