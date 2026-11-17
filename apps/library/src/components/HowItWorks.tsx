import SectionBar from '@/components/SectionBar';

const STEPS = [
  { title: 'Install the app', body: 'Linux or Windows.' },
  { title: 'Pick a wallpaper', body: 'From the tray icon.' },
  { title: 'Move your mouse', body: 'The light follows.' },
];

/** Three steps, in order, so they are numbered. */
export default function HowItWorks() {
  return (
    <section aria-label="How it works">
      <SectionBar label="How it works" />
      <ol className="grid border-b border-line sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className={`flex items-start gap-4 px-5 py-7 sm:px-6 ${i > 0 ? 'border-t border-line sm:border-l sm:border-t-0' : ''}`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-halo text-sm text-halo tabular-nums">
              {i + 1}
            </span>
            <div>
              <div className="font-medium">{s.title}</div>
              <div className="text-sm text-muted">{s.body}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
