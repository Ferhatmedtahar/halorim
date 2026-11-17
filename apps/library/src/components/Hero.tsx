import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PlatformGlyph, { type PlatformId } from '@/components/PlatformGlyph';

const TILES: { id: PlatformId; label: string; className: string; glyph: string; tone: string; field: string }[] = [
  { id: 'linux', label: 'Linux', className: 'row-span-2', glyph: 'w-[46%]', tone: 'text-fg', field: 'bg-hatch' },
  { id: 'windows', label: 'Windows', className: '', glyph: 'w-[38%]', tone: 'text-fg/80', field: 'bg-dots-drift' },
  { id: 'macos', label: 'macOS soon', className: '', glyph: 'w-[34%]', tone: 'text-muted', field: 'bg-dots' },
];

/** Hero: one line that says what it is, and the systems it runs on. */
export default function Hero({ wallpaperCount }: { wallpaperCount: number }) {
  const facts: [string, string][] = [
    [String(wallpaperCount), 'wallpapers'],
    ['Free', 'and open source'],
    ['Linux + Windows', 'macOS soon'],
  ];

  return (
    <section>
      <div className="grid lg:grid-cols-[1fr_520px]">
        <div className="animate-rise px-5 py-14 sm:px-6 lg:border-r lg:border-line lg:py-24">
          <h1 className="text-[clamp(44px,7.5vw,68px)] font-medium leading-[0.98] tracking-[-0.05em] text-fg">
            Light that
            <br />
            follows your cursor
          </h1>
          <p className="mt-6 max-w-sm text-muted">Live wallpapers for Linux and Windows. Free.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="#download">Get the app</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="#library">Browse wallpapers</Link>
            </Button>
          </div>
        </div>

        <ul
          className="grid aspect-[1.15] w-full animate-rise grid-cols-2 grid-rows-2 border-t border-line lg:aspect-auto lg:border-t-0"
          style={{ animationDelay: '120ms' }}
          aria-label="Supported systems"
        >
          {TILES.map((t, i) => (
            <li
              key={t.id}
              className={`relative flex items-center justify-center ${t.field} ${t.className} ${
                i === 0 ? 'border-r border-line' : i === 1 ? 'border-b border-line' : ''
              }`}
            >
              <div className={`${t.glyph} ${t.tone} aspect-square`}>
                <PlatformGlyph id={t.id} />
              </div>
              <span className="absolute bottom-3 left-4 flex items-center gap-2 bg-bg px-1.5 text-[13px] text-muted">
                {i < 2 ? <span aria-hidden="true" className="h-1.5 w-1.5 bg-halo" /> : null}
                {t.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="line-march-x" aria-hidden="true" />
      <dl className="grid grid-cols-1 border-b border-line sm:grid-cols-3">
        {facts.map(([value, label], i) => (
          <div
            key={label}
            className={`flex items-baseline gap-3 px-5 py-5 sm:px-6 ${i > 0 ? 'border-t border-line sm:border-l sm:border-t-0' : ''}`}
          >
            <dd className="text-3xl font-medium tracking-[-0.03em] text-fg">{value}</dd>
            <dt className="text-sm text-muted">{label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
