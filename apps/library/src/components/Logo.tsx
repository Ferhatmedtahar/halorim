import { cn } from '@/lib/utils';

/** Mark: a lit disc with its own shadow side. Flat fills only. */
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('h-5 w-5', className)}>
      <circle cx="12" cy="12" r="10" fill="#e8e8e8" />
      <circle cx="15" cy="10" r="7.5" fill="#050505" />
    </svg>
  );
}
