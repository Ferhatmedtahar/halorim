import type { Metadata } from 'next';
import Link from 'next/link';
import '@fontsource-variable/inter';
import './globals.css';
import { SITE } from '@/lib/site';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import MobileNav from '@/components/MobileNav';

export const metadata: Metadata = {
  title: 'Glowframe: live wallpapers with light that follows your cursor',
  description:
    'Open-source live wallpaper engine. Real-time prismatic rim glow, a library of wallpapers and a shape studio, for Linux, Windows and macOS.',
};

const NAV = [
  { href: '/#library', label: 'Library' },
  { href: '/studio', label: 'Studio' },
  { href: '/about', label: 'Guide' },
  { href: '/#download', label: 'Download' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col bg-bg text-fg antialiased">
        <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-site items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 rounded-full" aria-label="Glowframe home">
              <Logo />
              <span className="text-[15px] font-medium tracking-tight">Glowframe</span>
            </Link>

            <nav className="flex items-center gap-1 text-sm" aria-label="Main">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hidden rounded-full px-3 py-1.5 text-muted transition-colors duration-fast ease-out hover:text-fg sm:inline-block"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={SITE.repo}
                target="_blank"
                rel="noreferrer"
                className="hidden rounded-full px-3 py-1.5 text-muted transition-colors duration-fast ease-out hover:text-fg md:inline-block"
              >
                GitHub
              </a>
              <Button asChild size="sm" className="ml-2">
                <Link href="/#download">Get the app</Link>
              </Button>
              <MobileNav items={NAV} repo={SITE.repo} />
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-24 bg-bg">
          <div className="mx-auto flex max-w-site flex-col gap-6 px-4 py-12 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2.5">
              <Logo className="h-4 w-4" />
              <span>Glowframe, MIT license, {new Date().getFullYear()}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
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
      </body>
    </html>
  );
}
