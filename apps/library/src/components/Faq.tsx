import { Plus } from 'lucide-react';
import SectionBar from '@/components/SectionBar';

const FAQ = [
  { q: 'Is it free?', a: 'Yes. Free and open source, MIT license.' },
  { q: 'Which systems?', a: 'Linux and Windows. macOS is in progress.' },
  { q: 'Will it slow my PC?', a: 'It is light, and you can cap the frame rate or pause it from the tray.' },
  { q: 'Can I use my own logo?', a: 'Yes. Download it as SVG from the Studio, then use Load Custom SVG in the tray.' },
  { q: 'Does it read my files?', a: 'No. It only follows your mouse position.' },
];

/** Native details/summary: keyboard and screen-reader friendly with no script. */
export default function Faq() {
  return (
    <section aria-label="Questions">
      <SectionBar label="Questions" />
      <div className="border-b border-line">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group border-b border-line last:border-b-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition-colors duration-fast ease-out hover:bg-raised sm:px-6 [&::-webkit-details-marker]:hidden">
              <span className="font-medium">{q}</span>
              <Plus className="h-4 w-4 shrink-0 text-muted transition-transform duration-fast ease-out group-open:rotate-45 group-open:text-halo" />
            </summary>
            <p className="px-5 pb-5 text-muted group-open:animate-accordion sm:px-6">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
