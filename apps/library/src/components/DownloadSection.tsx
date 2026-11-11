import { ArrowDownToLine } from 'lucide-react';
import { PLATFORMS } from '@/lib/site';
import { Button } from '@/components/ui/button';
import PlatformGlyph from '@/components/PlatformGlyph';

export default function DownloadSection() {
  return (
    <section id="download" className="mx-auto mt-24 max-w-site px-4 sm:mt-32 sm:px-6">
      <h2 className="text-[clamp(36px,5.5vw,60px)] font-medium leading-[1.02] tracking-[-0.045em]">
        Run them on your desktop
      </h2>
      <p className="mt-4 max-w-xl text-muted">
        The desktop app plays any wallpaper from the library behind your windows, with the light following your cursor.
      </p>

      <ul className="mt-10 flex flex-col gap-2">
        {PLATFORMS.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-4 rounded-xl bg-surface px-5 py-4 sm:px-6 sm:py-5"
          >
            <div className="flex min-w-0 items-center gap-4">
              <div className={`h-10 w-10 shrink-0 rounded-xl bg-raised p-2.5 ${p.href ? 'text-fg' : 'text-muted'}`}>
                <PlatformGlyph id={p.id} />
              </div>
              <div className="min-w-0">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted">{p.detail}</div>
              </div>
            </div>
            {p.href ? (
              <Button asChild variant="secondary">
                <a href={p.href} target="_blank" rel="noreferrer">
                  <ArrowDownToLine className="h-4 w-4" />
                  Download
                </a>
              </Button>
            ) : (
              <span className="text-sm text-muted">Coming soon</span>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-muted">
        Prefer not to install anything? Open a wallpaper and export a standalone HTML pack for Lively Wallpaper or any
        browser.
      </p>
    </section>
  );
}
