'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from '@/components/ui/sheet';

const ROW =
  'block border-b border-line px-5 py-4 text-base text-muted transition-colors duration-fast ease-out hover:bg-raised hover:text-fg';

export default function MobileNav({ items, repo }: { items: { href: string; label: string }[]; repo: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="flex h-14 w-14 items-center justify-center border-l border-line text-muted transition-colors duration-fast ease-out hover:bg-raised hover:text-fg sm:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 bg-background p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>
        <nav className="mt-14 flex flex-col border-t border-line" aria-label="Mobile">
          {[...items, { href: repo, label: 'GitHub' }].map((item) => (
            <SheetClose asChild key={item.href}>
              {item.href.startsWith('http') ? (
                <a href={item.href} target="_blank" rel="noreferrer" className={ROW}>
                  {item.label}
                </a>
              ) : (
                <Link href={item.href} className={ROW}>
                  {item.label}
                </Link>
              )}
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
