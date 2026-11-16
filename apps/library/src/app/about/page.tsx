import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Guide | Halorim',
  description: 'How to install and run Halorim wallpapers on Windows, Linux and in a web browser.',
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-b border-line">
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
            <div className="font-medium text-fg">Other Wayland desktops</div>
            <p className="mt-1 text-sm">
              On Hyprland, Sway and KDE Plasma, Halorim runs through Xwayland as a window behind your others. It does
              not use the layer-shell protocol yet, so how cleanly it sits behind windows depends on your compositor.
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
            Download the desktop app from the{' '}
            <a
              href={SITE.releases}
              target="_blank"
              rel="noreferrer"
              className="text-fg underline underline-offset-4"
            >
              latest release
            </a>
            . It draws the wallpaper behind your desktop icons. Pick a wallpaper from the tray icon menu.
          </p>
        </Section>

        <Section id="custom" title="Your own shape">
          <p>
            Make a wallpaper from any SVG on Linux or Windows. Pick or upload a shape in the Studio, or download any
            wallpaper from the library as an SVG. Then open the Halorim tray icon, choose Load Custom SVG and select the
            file.
          </p>
          <p>
            The desktop app reads the shape&apos;s outline and applies its own glow, so colour and glow settings come from
            the tray menu, not from the file.
          </p>
        </Section>

        <Section id="browser" title="Browser">
          <p>
            Every wallpaper page has a live preview that runs in any browser with WebGL2.
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
