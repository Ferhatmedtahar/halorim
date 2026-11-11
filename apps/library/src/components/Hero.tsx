import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PlatformGlyph, { type PlatformId } from '@/components/PlatformGlyph';

const TILES: { id: PlatformId; label: string; className: string; glyph: string; tone: string }[] = [
  { id: 'linux', label: 'Linux', className: 'row-span-2', glyph: 'w-[46%]', tone: 'text-fg' },
  { id: 'windows', label: 'Windows', className: '', glyph: 'w-[38%]', tone: 'text-fg/80' },
  { id: 'macos', label: 'macOS', className: '', glyph: 'w-[34%]', tone: 'text-muted' },
];

/** Hero: headline and actions on the left, flat platform shapes on the right. No glow, no effects. */
export default function Hero() {
  return (
    <section>
      <div className="mx-auto grid max-w-site items-center gap-12 px-4 py-16 sm:px-6 lg:min-h-[620px] lg:grid-cols-[1fr_460px] lg:gap-16 lg:py-0">
        <div className="animate-rise">
          <h1 className="text-[clamp(44px,8.5vw,72px)] font-medium leading-[0.95] tracking-[-0.055em] text-fg">
            Live wallpapers
            <br />
            for your desktop
          </h1>
          <p className="mt-6 max-w-md text-muted">
            Real-time WebGL2 glow that follows your cursor. A free, open-source engine with a library of wallpapers for
            Linux, Windows and macOS.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="#library">Browse wallpapers</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="#download">Download app</Link>
            </Button>
          </div>
        </div>

        <ul
          className="grid aspect-[1.15] w-full animate-rise grid-cols-2 grid-rows-2 gap-3"
          style={{ animationDelay: '120ms' }}
          aria-label="Supported platforms"
        >
          {TILES.map((t) => (
            <li
              key={t.id}
              className={`relative flex items-center justify-center rounded-3xl bg-surface ${t.className}`}
            >
              <div className={`${t.glyph} ${t.tone} aspect-square`}>
                <PlatformGlyph id={t.id} />
              </div>
              <span className="absolute bottom-4 left-5 text-sm text-muted">{t.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
