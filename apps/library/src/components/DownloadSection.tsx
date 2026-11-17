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
              Get the app
            </h2>
            <p className="mt-4 max-w-sm text-muted">Every wallpaper is built in. Pick one from the tray.</p>
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
                    <Button asChild size="sm">
                      <a href={p.href} target="_blank" rel="noreferrer">
                        <ArrowDownToLine className="h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  ) : (
                    <span className="text-[13px] text-muted">Coming soon</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
