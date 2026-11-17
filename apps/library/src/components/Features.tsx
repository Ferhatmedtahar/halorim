import { MousePointer2, Gauge, Shapes, Unlock } from 'lucide-react';
import SectionBar from '@/components/SectionBar';

const FEATURES = [
  { icon: MousePointer2, title: 'Follows your cursor', body: 'The glow moves with your mouse, live.' },
  { icon: Gauge, title: 'Easy on your PC', body: 'Cap it at 15, 30 or 60 FPS. Pause any time.' },
  { icon: Shapes, title: 'Use your own shape', body: 'Any SVG. Make one in the Studio.' },
  { icon: Unlock, title: 'Free and open', body: 'MIT license. No account, no ads.' },
];

export default function Features() {
  return (
    <section aria-label="Features">
      <SectionBar label="Why Halorim" />
      <ul className="grid gap-px border-b border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="bg-bg px-5 py-7 sm:px-6">
            <Icon className="h-5 w-5 text-halo" strokeWidth={1.75} />
            <div className="mt-4 font-medium">{title}</div>
            <div className="mt-1 text-sm text-muted">{body}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
