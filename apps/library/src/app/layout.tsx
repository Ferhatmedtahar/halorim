import type { Metadata } from 'next';
import Link from 'next/link';
import '@fontsource-variable/inter';
import './globals.css';
import { SITE } from '@/lib/site';
import Logo from '@/components/Logo';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Halorim: live wallpapers with light that follows your cursor',
  description:
    'Open-source live wallpaper engine. Real-time prismatic rim glow, a library of wallpapers and a shape studio, for Linux, Windows and macOS.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-fg antialiased">
        {/* The whole site lives inside one framed column: hairlines left and right, cells butted together. */}
        <div className="mx-auto flex min-h-screen max-w-site flex-col border-x border-line">
          <Navbar repo={SITE.repo} />

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
