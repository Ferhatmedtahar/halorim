import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/site';
import SectionBar from '@/components/SectionBar';

export const metadata = {
  title: 'Guide | Halorim',
  description: 'How to install and run Halorim wallpapers on Windows, Linux and in a web browser.',
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-b border-line">
      <SectionBar label="Guide" />
      <div className="grid md:grid-cols-[220px_1fr]">
        <h2 id={id} className="border-b border-line px-5 py-6 text-2xl font-medium tracking-[-0.03em] sm:px-6 md:border-b-0 md:border-r">
          {title}
        </h2>
        <div className="flex flex-col gap-4 px-5 py-6 leading-relaxed text-muted sm:px-6">{children}</div>
      </div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="border border-line bg-raised px-1.5 py-0.5 font-mono text-[13px] text-fg">{children}</code>;
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2 border border-line bg-surface p-5 text-sm">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-4 shrink-0 font-mono text-muted tabular-nums">{i + 1}</span>
          <span className="text-fg/90">{item}</span>
        </li>
      ))}
    </ol>
  );
}

export default function AboutPage() {
  return (
    <div>
      <header className="animate-rise border-b border-line px-5 py-12 sm:px-6">
        <h1 className="text-[clamp(36px,6vw,60px)] font-medium leading-[1.02] tracking-[-0.045em]">Guide</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Install Halorim on Linux or Windows, or run any wallpaper in a browser. Pick the setup that matches your
          system.
        </p>
      </header>

      <div>
        <Section id="linux" title="Linux">
          <p>
            Download the desktop app from the{' '}
            <a
              href={SITE.releases}
              target="_blank"
              rel="noreferrer"
              className="text-fg underline underline-offset-4"
            >
              latest release
            </a>
            . It draws the wallpaper on a hardware-accelerated surface behind your windows and desktop icons.
          </p>
          <div>
            <div className="font-medium text-fg">X11</div>
            <p className="mt-1 text-sm">
              Halorim opens a window with the <Code>_NET_WM_WINDOW_TYPE_DESKTOP</Code> hint, so it sits below
              everything else.
            </p>
          </div>
          <div>
            <div className="font-medium text-fg">Wayland with layer-shell</div>
            <p className="mt-1 text-sm">
              On Hyprland, Sway and KDE Plasma 6, Halorim attaches to the background layer.
            </p>
          </div>
          <div>
            <div className="font-medium text-fg">GNOME on Wayland</div>
            <p className="mt-1 text-sm">
              GNOME Shell does not allow third-party layer-shell surfaces. Halorim runs through Xwayland instead and
              passes input through, so desktop icons and files stay clickable.
            </p>
          </div>
        </Section>

        <Section id="windows" title="Windows">
          <p>
            Use the desktop app from the latest release, or host a wallpaper in{' '}
            <a
              href="https://rocksdanister.github.io/lively/"
              target="_blank"
              rel="noreferrer"
              className="text-fg underline underline-offset-4"
            >
              Lively Wallpaper
            </a>
            .
          </p>
          <Steps
            items={[
              <>Open a wallpaper in the library and download the HTML pack (.zip).</>,
              <>Extract the zip to a folder.</>,
              <>In Lively Wallpaper, choose Add Wallpaper.</>,
              <>
                Select <Code>index.html</Code> from the extracted folder and save.
              </>,
            ]}
          />
        </Section>

        <Section id="browser" title="Browser">
          <p>
            Every wallpaper runs in any browser with WebGL2. Unzip the HTML pack and open <Code>index.html</Code>, or
            use the live preview on each wallpaper page.
          </p>
        </Section>

        <Section id="about" title="About the engine">
          <p>
            Wallpapers are rendered in WebGL2 from a distance field of the shape, with chromatic dispersion along the
            edge. The engine is MIT licensed. The Tux, Arch and Debian shapes are included under their community
            licenses, and every wallpaper follows the Halorim v1 scene schema.
          </p>
        </Section>
      </div>

      <div className="bg-dots px-5 py-8 sm:px-6">
        <Button asChild variant="secondary" className="bg-bg">
          <Link href="/#library">Browse the library</Link>
        </Button>
      </div>
    </div>
  );
}
