import type { Metadata } from 'next';
import Link from 'next/link';
import '@fontsource-variable/inter';
import './globals.css';
import { SITE } from '@/lib/site';
import Logo from '@/components/Logo';
import MobileNav from '@/components/MobileNav';

export const metadata: Metadata = {
  title: 'Halorim: live wallpapers with light that follows your cursor',
  description:
    'Open-source live wallpaper engine. Real-time prismatic rim glow, a library of wallpapers and a shape studio, for Linux, Windows and macOS.',
};

const NAV = [
  { href: '/#library', label: 'Library' },
  { href: '/studio', label: 'Studio' },
  { href: '/about', label: 'Guide' },
  { href: '/#download', label: 'Download' },
];

const CELL =
  'hidden h-14 items-center border-l border-line px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors duration-fast ease-out hover:bg-raised hover:text-fg';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-fg antialiased">
        {/* The whole site lives inside one framed column: hairlines left and right, cells butted together. */}
        <div className="mx-auto flex min-h-screen max-w-site flex-col border-x border-line">
          <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md">
            <div className="flex h-14 items-stretch justify-between">
              <Link
                href="/"
                className="flex items-center gap-2.5 px-5 sm:px-6"
                aria-label="Halorim home"
              >
                <Logo />
                <span className="text-[15px] font-medium tracking-tight">Halorim</span>
              </Link>

              <nav className="flex items-stretch" aria-label="Main">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className={`${CELL} sm:flex`}>
                    {item.label}
                  </Link>
                ))}
                <a href={SITE.repo} target="_blank" rel="noreferrer" className={`${CELL} md:flex`}>
                  GitHub
                </a>
                <Link
                  href="/#download"
                  className="flex items-center border-l border-line bg-fg px-5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-bg transition-colors duration-fast ease-out hover:bg-white"
                >
                  Get the app
                </Link>
                <MobileNav items={NAV} repo={SITE.repo} />
              </nav>
            </div>
            <div className="line-run h-px bg-line" aria-hidden="true" />
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-line">
            <div className="line-march-x" aria-hidden="true" />
            <div className="flex flex-col gap-4 px-5 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-2.5">
                <Logo className="h-4 w-4" />
                <span>Halorim, MIT license, {new Date().getFullYear()}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em]">
                <Link href="/#library" className="transition-colors duration-fast ease-out hover:text-fg">
                  Library
                </Link>
                <Link href="/studio" className="transition-colors duration-fast ease-out hover:text-fg">
                  Studio
                </Link>
                <Link href="/about" className="transition-colors duration-fast ease-out hover:text-fg">
                  Guide
                </Link>
                <a
                  href={SITE.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors duration-fast ease-out hover:text-fg"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
