import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PRESET_SCENES } from '@glowframe/presets';
import WallpaperPlayer from '@/components/WallpaperPlayer';
import DownloadPanel from '@/components/DownloadPanel';
import SectionBar from '@/components/SectionBar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return Object.keys(PRESET_SCENES).map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const scene = PRESET_SCENES[id];
  return scene ? { title: `${scene.meta.name} | Halorim`, description: scene.meta.description } : {};
}

const SETUP = [
  {
    os: 'Linux and Windows',
    body: 'This wallpaper is already built into the Halorim desktop app. Open the tray icon and pick it from Operating Systems, Linux Distros or Shapes.',
  },
  {
    os: 'Browser',
    body: 'The live preview above runs in any browser with WebGL2.',
  },
];

export default async function WallpaperDetailPage({ params }: PageProps) {
  const { id } = await params;
  const scene = PRESET_SCENES[id];

  if (!scene) {
    notFound();
  }

  const facts: [string, string][] = [
    ['Author', scene.meta.author],
    ['License', scene.meta.license],
    ['Animation', scene.mode.id],
    ['Shape', scene.shape.type],
    ['Frame rate', `${scene.performance.fpsCap} fps`],
  ];

  return (
    <div>
      <Link
        href="/"
        className="flex h-11 items-center gap-2 border-b border-line px-5 text-[13px] text-muted transition-colors duration-fast ease-out hover:bg-raised hover:text-fg sm:px-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to library
      </Link>

      <header className="animate-rise border-b border-line px-5 py-12 sm:px-6">
        <h1 className="text-[clamp(36px,6vw,60px)] font-medium leading-[1.02] tracking-[-0.045em]">{scene.meta.name}</h1>
        <p className="mt-4 max-w-2xl text-muted">{scene.meta.description}</p>
      </header>

      {/* Stage: live preview framed by the dotted field */}
      <div className="bg-dots border-b border-line p-3 sm:p-6">
        <div className="border border-line-strong bg-black">
          <WallpaperPlayer scene={scene} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col lg:border-r lg:border-line">
          <section aria-labelledby="details" className="border-b border-line">
            <SectionBar label="Details" id="details" />
            <dl>
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-line px-5 py-3 last:border-b-0 sm:px-6">
                  <dt className="text-sm text-muted">{k}</dt>
                  <dd className="text-sm tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="palette" className="border-b border-line">
            <SectionBar label="Palette" id="palette" />
            <ul className="grid grid-cols-2 sm:grid-cols-4">
              {scene.palettes[0]?.map((color, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 border-b border-r border-line px-5 py-4 sm:px-6"
                >
                  <span className="h-5 w-5 border border-line-strong" style={{ backgroundColor: color }} />
                  <span className="text-[13px] text-muted">Stop {idx + 1}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="studio" className="flex flex-1 flex-col border-b border-line lg:border-b-0">
            <SectionBar label="Make it yours" id="studio" />
            {/* Fills the rest of the column so it lines up with the sidebar. */}
            <div className="bg-hatch flex-1 px-5 py-8 sm:px-6">
              <p className="text-sm text-muted">Change the size and glow of any shape in the studio.</p>
              <Button asChild variant="secondary" className="mt-4 bg-bg">
                <Link href="/studio">Open the studio</Link>
              </Button>
            </div>
          </section>
        </div>

        <aside className="flex flex-col">
          <SectionBar label="Download" />
          <div className="border-b border-line">
            <DownloadPanel scene={scene} />
          </div>

          <section aria-labelledby="setup">
            <SectionBar label="How to run it" id="setup" />
            <ul>
              {SETUP.map((s) => (
                <li key={s.os} className="border-b border-line px-5 py-4 sm:px-6">
                  <div className="text-[15px] font-medium">{s.os}</div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ul>
            <Link
              href="/about"
              className="block px-5 py-4 text-[13px] text-muted transition-colors duration-fast ease-out hover:bg-raised hover:text-fg sm:px-6"
            >
              Full installation guide
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
