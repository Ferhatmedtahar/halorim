import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PRESET_SCENES } from '@glowframe/presets';
import WallpaperPlayer from '@/components/WallpaperPlayer';
import DownloadPanel from '@/components/DownloadPanel';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/"
          className="text-xs font-medium text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
        >
          <span>&larr;</span> Back to Gallery
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Stage: Live WebGL2 Canvas */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <WallpaperPlayer scene={scene} />

          {/* Preset Details & Attribution */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white">{scene.meta.name}</h1>
                <p className="text-xs text-slate-400 mt-1">{scene.meta.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {scene.mode.id}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-slate-300 border border-white/10">
                  {scene.shape.type}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Author</span>
                <span className="text-slate-200 font-medium">{scene.meta.author}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">License</span>
                <span className="text-slate-200 font-medium">{scene.meta.license}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Light Sharpness</span>
                <span className="text-slate-200 font-medium">
                  {scene.interaction.sharpness.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Target FPS</span>
                <span className="text-slate-200 font-medium">{scene.performance.fpsCap} fps</span>
              </div>
            </div>

            {/* Default Color Palette Swatches */}
            <div className="mt-6 pt-4 border-t border-white/5">
              <span className="text-xs text-slate-400 font-medium block mb-2">
                Active Color Palette
              </span>
              <div className="flex items-center gap-2">
                {scene.palettes[0]?.map((color, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: color }}
                      title={`Stop ${idx + 1}: ${color}`}
                    />
                    <span className="text-[10px] font-mono text-slate-400">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Downloads & Instructions */}
        <div className="flex flex-col gap-6">
          <DownloadPanel scene={scene} />

          {/* Quick Setup Card */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 text-xs text-slate-400">
            <h4 className="font-semibold text-white mb-2">How to use this wallpaper</h4>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <strong className="text-slate-200">Windows:</strong> Download the HTML pack and
                import it into Lively Wallpaper.
              </li>
              <li>
                <strong className="text-slate-200">Linux:</strong> Launch via layer-shell or embed
                in an X11 window.
              </li>
              <li>
                <strong className="text-slate-200">Browser:</strong> Extract the zip and open{' '}
                <code className="text-cyan-400">index.html</code>.
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-white/5">
              <Link href="/about" className="text-cyan-400 hover:text-cyan-300 font-medium">
                Read full setup guide &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
