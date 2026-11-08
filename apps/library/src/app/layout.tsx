import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Glowframe - Interactive Prismatic Wallpapers',
  description:
    'Open-source interactive desktop wallpaper engine with real-time prismatic rim glow and physics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090a0f] text-slate-100 min-h-screen flex flex-col antialiased">
        <header className="border-b border-white/10 bg-[#090a0f]/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 p-[1.5px] transition-transform duration-300 group-hover:scale-105">
                <div className="w-full h-full bg-[#090a0f] rounded-[6.5px] flex items-center justify-center">
                  <div className="w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400 rotate-45 transform" />
                </div>
              </div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Glowframe
              </span>
            </Link>

            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link href="/" className="text-slate-300 hover:text-white transition-colors">
                Gallery
              </Link>
              <Link href="/about" className="text-slate-300 hover:text-white transition-colors">
                Setup Guide
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-full border border-white/15 hover:border-white/30 text-xs font-semibold tracking-wide text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-white/10 py-8 bg-[#07080c] text-slate-400 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              &copy; {new Date().getFullYear()} Glowframe Engine. Open-source under MIT License.
            </p>
            <div className="flex items-center space-x-6">
              <Link href="/about" className="hover:text-slate-200 transition-colors">
                Installation
              </Link>
              <Link href="/" className="hover:text-slate-200 transition-colors">
                Presets
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
