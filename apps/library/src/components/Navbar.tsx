'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import MobileNav from '@/components/MobileNav';

interface NavItem {
  href: string;
  label: string;
  /** Returns true when the current path belongs to this item. */
  match: (path: string) => boolean;
}

const NAV: NavItem[] = [
  { href: '/#library', label: 'Library', match: (p) => p === '/' || p.startsWith('/w/') },
  { href: '/studio', label: 'Studio', match: (p) => p.startsWith('/studio') },
  { href: '/about', label: 'Guide', match: (p) => p.startsWith('/about') },
  { href: '/#download', label: 'Download', match: () => false },
];

export default function Navbar({ repo }: { repo: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="flex h-14 items-stretch justify-between">
        <Link href="/" className="flex items-center gap-2.5 px-5 sm:px-6" aria-label="Halorim home">
          <Logo />
          <span className="text-[15px] font-medium tracking-tight">Halorim</span>
        </Link>

        <nav className="flex items-stretch" aria-label="Main">
          <ul className="hidden items-stretch sm:flex">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <li key={item.href} className="flex">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center px-4 text-sm transition-colors duration-fast ease-out hover:text-fg',
                      active ? 'text-fg' : 'text-muted',
                    )}
                  >
                    {item.label}
                    {/* Active page: a white rule on the header's bottom edge. */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-x-4 -bottom-px h-0.5 bg-fg transition-opacity duration-fast ease-out',
                        active ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <a
            href={repo}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 px-4 text-sm text-muted transition-colors duration-fast ease-out hover:text-fg md:flex"
          >
            GitHub
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>

          <div className="hidden items-center border-l border-line px-4 sm:flex">
            <Link
              href="/#download"
              className="inline-flex h-8 items-center bg-fg px-4 text-sm font-medium text-bg transition-colors duration-fast ease-out hover:bg-white"
            >
              Get the app
            </Link>
          </div>

          <MobileNav items={NAV.map(({ href, label }) => ({ href, label }))} repo={repo} />
        </nav>
      </div>
    </header>
  );
}
