import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ClosingCta() {
  return (
    <section className="bg-dots border-b border-line px-5 py-16 text-center sm:px-6">
      <h2 className="inline-block bg-bg px-3 text-[clamp(28px,4vw,40px)] font-medium tracking-[-0.04em]">
        Give your desktop a glow
      </h2>
      <div className="mt-6">
        <Button asChild size="lg">
          <Link href="#download">Get the app</Link>
        </Button>
      </div>
    </section>
  );
}
