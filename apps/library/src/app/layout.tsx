import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { Badge } from '@/components/ui/badge';
import { Sliders, BookOpen, Code } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Glowframe // Prismatic Wallpaper Engine',
  description:
    'Open-source interactive desktop wallpaper engine with real-time prismatic rim glow and custom vector shape studio.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-terminal-bg text-slate-200 min-h-screen flex flex-col antialiased font-mono selection:bg-terminal-cyan selection:text-black">
        {/* Terminal Header */}
        <header className="border-b border-terminal-border bg-terminal-card/90 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-6 h-6 border border-terminal-cyan bg-terminal-cyan/15 flex items-center justify-center text-terminal-cyan text-xs font-bold transition-all group-hover:shadow-terminal-glow">
                &gt;_
              </div>
              <span className="text-sm font-bold tracking-wider text-slate-100 group-hover:text-terminal-cyan transition-colors">
                GLOWFRAME<span className="text-terminal-cyan">.SYS</span>
              </span>
              <Badge variant="green" bracketed className="hidden sm:inline-flex text-[9px]">
                v0.8.0
              </Badge>
            </Link>

            <nav className="flex items-center space-x-2 sm:space-x-4 text-xs font-medium">
              <Link
                href="/"
                className="px-2.5 py-1 text-terminal-dim hover:text-terminal-cyan hover:bg-terminal-border/40 transition-colors flex items-center gap-1.5"
              >
                <span>[01]</span>
                <span>VAULT</span>
              </Link>
              <Link
                href="/studio"
                className="px-2.5 py-1 text-terminal-cyan bg-terminal-cyan/10 border border-terminal-cyan/30 hover:bg-terminal-cyan/20 transition-all flex items-center gap-1.5 shadow-terminal-glow"
              >
                <Sliders className="w-3 h-3" />
                <span>STUDIO</span>
              </Link>
              <Link
                href="/about"
                className="px-2.5 py-1 text-terminal-dim hover:text-terminal-cyan hover:bg-terminal-border/40 transition-colors hidden sm:flex items-center gap-1.5"
              >
                <BookOpen className="w-3 h-3" />
                <span>MANUAL</span>
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 text-terminal-dim hover:text-white border border-terminal-border hover:border-slate-500 bg-terminal-bg transition-all flex items-center gap-1.5"
              >
                <Code className="w-3 h-3" />
                <span className="hidden sm:inline">SRC</span>
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        {/* Terminal Footer */}
        <footer className="border-t border-terminal-border py-6 bg-terminal-card text-terminal-dim text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-terminal-cyan">&gt;_</span>
              <span>GLOWFRAME ENGINE &bull; OPEN-SOURCE UNDER MIT LICENSE &bull; {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center space-x-4 text-[11px]">
              <Link href="/studio" className="hover:text-terminal-cyan transition-colors">
                [CUSTOM_STUDIO]
              </Link>
              <Link href="/about" className="hover:text-terminal-cyan transition-colors">
                [PLATFORM_GUIDE]
              </Link>
              <Link href="/" className="hover:text-terminal-cyan transition-colors">
                [PRESETS_REGISTRY]
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
