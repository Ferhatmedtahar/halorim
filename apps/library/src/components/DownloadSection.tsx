import { ArrowDownToLine } from 'lucide-react';
import { PLATFORMS } from '@/lib/site';
import { Button } from '@/components/ui/button';
import PlatformGlyph from '@/components/PlatformGlyph';
import SectionBar from '@/components/SectionBar';

export default function DownloadSection() {
  return (
    <section id="download">
      <SectionBar label="Download" />

      <div className="grid lg:grid-cols-[1fr_2fr]">
        <div className="bg-hatch border-b border-line px-5 py-10 sm:px-6 lg:border-b-0 lg:border-r">
          <div className="bg-bg">
            <h2 className="text-[clamp(30px,4vw,44px)] font-medium leading-[1.02] tracking-[-0.045em]">
              Run them on your desktop
            </h2>
            <p className="mt-4 max-w-sm text-muted">
              The desktop app plays any wallpaper from the library behind your windows, with the light following your
              cursor.
            </p>
          </div>
        </div>

        <ul className="grid sm:grid-cols-3">
          {PLATFORMS.map((p) => (
            <li
              key={p.id}
              className="flex flex-col justify-between gap-10 border-b border-line p-5 sm:border-r sm:last:border-r-0 sm:p-6 lg:border-b-0"
            >
              <div className={`h-9 w-9 ${p.href ? 'text-fg' : 'text-muted'}`}>
                <PlatformGlyph id={p.id} />
              </div>
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="mt-0.5 text-sm text-muted">{p.detail}</div>
                <div className="mt-5">
                  {p.href ? (
                    <Button asChild variant="secondary" size="sm">
                      <a href={p.href} target="_blank" rel="noreferrer">
                        <ArrowDownToLine className="h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  ) : (
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Coming soon</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-line px-5 py-4 text-sm text-muted sm:px-6">
        Prefer not to install anything? Open a wallpaper and export a standalone HTML pack for Lively Wallpaper or any
        browser.
      </div>
    </section>
  );
}
