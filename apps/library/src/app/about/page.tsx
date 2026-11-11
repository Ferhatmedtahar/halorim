import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Guide | Glowframe',
  description: 'How to install and run Glowframe wallpapers on Windows, Linux and in a web browser.',
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl bg-surface p-6 sm:p-8">
      <h2 id={id} className="text-2xl font-medium tracking-[-0.03em]">
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-4 text-muted leading-relaxed">{children}</div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-raised px-1.5 py-0.5 font-mono text-[13px] text-fg">{children}</code>;
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2 rounded-xl bg-raised p-5 text-sm">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-4 shrink-0 text-muted tabular-nums">{i + 1}</span>
          <span className="text-fg/90">{item}</span>
        </li>
      ))}
    </ol>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:px-6">
      <header className="animate-rise">
        <h1 className="text-[clamp(36px,6vw,60px)] font-medium leading-[1.02] tracking-[-0.045em]">Guide</h1>
        <p className="mt-4 text-muted">
          Install Glowframe on Linux or Windows, or run any wallpaper in a browser. Pick the setup that matches your
          system.
        </p>
      </header>

      <div className="mt-12 flex flex-col gap-4">
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
              Glowframe opens a window with the <Code>_NET_WM_WINDOW_TYPE_DESKTOP</Code> hint, so it sits below
              everything else.
            </p>
          </div>
          <div>
            <div className="font-medium text-fg">Wayland with layer-shell</div>
            <p className="mt-1 text-sm">
              On Hyprland, Sway and KDE Plasma 6, Glowframe attaches to the background layer.
            </p>
          </div>
          <div>
            <div className="font-medium text-fg">GNOME on Wayland</div>
            <p className="mt-1 text-sm">
              GNOME Shell does not allow third-party layer-shell surfaces. Glowframe runs through Xwayland instead and
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
            licenses, and every wallpaper follows the Glowframe v1 scene schema.
          </p>
        </Section>
      </div>

      <div className="mt-10">
        <Button asChild variant="secondary">
          <Link href="/#library">Browse the library</Link>
        </Button>
      </div>
    </div>
  );
}
