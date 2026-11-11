import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PRESET_SCENES } from '@glowframe/presets';
import WallpaperPlayer from '@/components/WallpaperPlayer';
import DownloadPanel from '@/components/DownloadPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { glowStops } from '@/lib/palette';

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return Object.keys(PRESET_SCENES).map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const scene = PRESET_SCENES[id];
  return scene ? { title: `${scene.meta.name} | Glowframe`, description: scene.meta.description } : {};
}

const SETUP = [
  {
    os: 'Linux',
    body: 'Open the scene file in the Glowframe desktop app. Works on X11 and on Wayland compositors with layer-shell.',
  },
  {
    os: 'Windows',
    body: 'Import the HTML pack into Lively Wallpaper or Wallpaper Engine, or use the desktop app.',
  },
  {
    os: 'Browser',
    body: 'Unzip the pack and open index.html in any modern browser.',
  },
];

export default async function WallpaperDetailPage({ params }: PageProps) {
  const { id } = await params;
  const scene = PRESET_SCENES[id];

  if (!scene) {
    notFound();
  }

  const [a, b] = glowStops(scene);
  const facts: [string, string][] = [
    ['Author', scene.meta.author],
    ['License', scene.meta.license],
    ['Animation', scene.mode.id],
    ['Shape', scene.shape.type],
    ['Frame rate', `${scene.performance.fpsCap} fps`],
  ];

  return (
    <div className="mx-auto max-w-site px-4 pb-8 pt-6 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted transition-colors duration-fast ease-out hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Gallery
      </Link>

      <header className="mt-8 max-w-2xl animate-rise">
        <h1 className="text-[clamp(36px,6vw,60px)] font-medium leading-[1.02] tracking-[-0.045em]">{scene.meta.name}</h1>
        <p className="mt-4 text-muted">{scene.meta.description}</p>
      </header>

      {/* Stage: live preview with the wallpaper's own light behind it */}
      <div className="relative mt-10">
        <div
          aria-hidden="true"
          className="absolute -inset-4 rounded-[32px] opacity-20 blur-3xl"
          style={{ background: `linear-gradient(120deg, ${a}, ${b})` }}
        />
        <div className="relative">
          <WallpaperPlayer scene={scene} />
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-12">
        <div className="flex flex-col gap-12">
          <section aria-labelledby="details">
            <h2 id="details" className="text-lg font-medium tracking-tight">
              Details
            </h2>
            <dl className="mt-4 flex flex-col gap-1">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-lg px-4 py-3 odd:bg-surface">
                  <dt className="text-sm text-muted">{k}</dt>
                  <dd className="text-sm tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="palette">
            <h2 id="palette" className="text-lg font-medium tracking-tight">
              Palette
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {scene.palettes[0]?.map((color, idx) => (
                <li key={idx} className="flex items-center gap-2 rounded-full bg-surface py-1.5 pl-2 pr-3.5">
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[13px] text-muted">Stop {idx + 1}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="studio">
            <h2 id="studio" className="text-lg font-medium tracking-tight">
              Make it yours
            </h2>
            <p className="mt-1 text-sm text-muted">Change scale, rotation and glow in the shape studio.</p>
            <Button asChild variant="secondary" className="mt-4">
              <Link href="/studio">Open the studio</Link>
            </Button>
          </section>
        </div>

        <aside className="flex flex-col gap-8">
          <DownloadPanel scene={scene} />

          <section aria-labelledby="setup" className="px-1">
            <h2 id="setup" className="text-lg font-medium tracking-tight">
              How to run it
            </h2>
            <ul className="mt-4 flex flex-col gap-4">
              {SETUP.map((s) => (
                <li key={s.os}>
                  <div className="text-[15px] font-medium">{s.os}</div>
                  <p className="text-sm leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ul>
            <Link
              href="/about"
              className="mt-5 inline-block text-sm text-muted underline-offset-4 transition-colors duration-fast ease-out hover:text-fg hover:underline"
            >
              Full installation guide
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
