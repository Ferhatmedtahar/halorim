'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from '@/components/ui/sheet';

export default function MobileNav({ items, repo }: { items: { href: string; label: string }[]; repo: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 bg-background">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile">
          {[...items, { href: repo, label: 'GitHub' }].map((item) => (
            <SheetClose asChild key={item.href}>
              {item.href.startsWith('http') ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl px-4 py-3 text-lg text-muted transition-colors duration-fast ease-out hover:bg-raised hover:text-fg"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  href={item.href}
                  className="rounded-xl px-4 py-3 text-lg text-muted transition-colors duration-fast ease-out hover:bg-raised hover:text-fg"
                >
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
