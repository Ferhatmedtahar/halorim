import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PRESET_SCENES } from '@glowframe/presets';
import WallpaperPlayer from '@/components/WallpaperPlayer';
import DownloadPanel from '@/components/DownloadPanel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Terminal, Sliders, ArrowLeft, ShieldCheck } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return Object.keys(PRESET_SCENES).map((id) => ({ id }));
}

export default async function WallpaperDetailPage({ params }: PageProps) {
  const { id } = await params;
  const scene = PRESET_SCENES[id];

  if (!scene) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-mono">
      {/* Back link */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs text-terminal-cyan hover:underline inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>&gt;_ Back to Gallery</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="cyan" bracketed>ID: {scene.meta.id}</Badge>
          <Badge variant="green" bracketed>ONLINE</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Stage: Live WebGL2 Canvas */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <WallpaperPlayer scene={scene} />

          {/* Preset Details & Attribution */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-terminal-cyan" />
                    {scene.meta.name}
                  </CardTitle>
                  <p className="text-xs text-terminal-dim mt-1">{scene.meta.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="amber" bracketed>{scene.mode.id}</Badge>
                  <Badge variant="outline" bracketed>{scene.shape.type}</Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-b border-terminal-border/60 pb-4 mb-4">
                <div>
                  <span className="text-terminal-dim block mb-0.5 text-[10px]">AUTHOR</span>
                  <span className="text-slate-200 font-medium">{scene.meta.author}</span>
                </div>
                <div>
                  <span className="text-terminal-dim block mb-0.5 text-[10px]">LICENSE</span>
                  <span className="text-slate-200 font-medium">{scene.meta.license}</span>
                </div>
                <div>
                  <span className="text-terminal-dim block mb-0.5 text-[10px]">SHARPNESS</span>
                  <span className="text-slate-200 font-medium">
                    {scene.interaction.sharpness.toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="text-terminal-dim block mb-0.5 text-[10px]">TARGET_FPS</span>
                  <span className="text-terminal-green font-medium">{scene.performance.fpsCap} FPS</span>
                </div>
              </div>

              {/* Default Color Palette Swatches */}
              <div>
                <span className="text-[10px] text-terminal-dim block mb-2">
                  PRIMARY_OPTICAL_PALETTE:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {scene.palettes[0]?.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 border border-terminal-border bg-terminal-bg px-2 py-1">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm"
                        style={{ backgroundColor: color }}
                        title={`Stop ${idx + 1}: ${color}`}
                      />
                      <span className="text-[10px] text-slate-400">{color}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transform in Custom Studio CTA */}
              <div className="mt-6 pt-4 border-t border-terminal-border/40 flex items-center justify-between">
                <span className="text-[11px] text-terminal-dim">
                  Want to modify scale, rotation, or glow parameters?
                </span>
                <Link href="/studio">
                  <Button variant="cyber" size="sm" className="flex items-center gap-1.5">
                    <Sliders className="w-3 h-3" />
                    <span>OPEN_IN_STUDIO</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Downloads & Instructions */}
        <div className="flex flex-col gap-6">
          <DownloadPanel scene={scene} />

          {/* Quick Setup Card */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-xs text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-terminal-green" />
                DEPLOYMENT_INSTRUCTIONS
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 text-xs text-terminal-dim space-y-3">
              <div>
                <strong className="text-slate-200">&gt;_ Linux Desktop:</strong>
                <p className="text-[11px] mt-0.5">
                  Launch the native Rust/Tauri desktop runner. Wallpapers render with click-through support on GNOME Wayland &amp; X11.
                </p>
              </div>
              <div>
                <strong className="text-slate-200">&gt;_ Windows 10/11:</strong>
                <p className="text-[11px] mt-0.5">
                  Download the Standalone HTML Pack and import the zip into Lively Wallpaper or Wallpaper Engine.
                </p>
              </div>
              <div>
                <strong className="text-slate-200">&gt;_ Web / Browser:</strong>
                <p className="text-[11px] mt-0.5">
                  Unzip the pack and open <code className="text-terminal-cyan">index.html</code> in any modern browser.
                </p>
              </div>
              <div className="pt-2 border-t border-terminal-border/40">
                <Link href="/about" className="text-terminal-cyan hover:underline text-[11px] inline-flex items-center gap-1">
                  <span>&gt;_ View complete system installation guide &rarr;</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
