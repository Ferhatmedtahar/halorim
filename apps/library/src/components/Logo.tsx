import { cn } from '@/lib/utils';

/** Mark: a halo whose rim is heavier on one side. Single flat fill, follows currentColor. */
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" className={cn('h-5 w-5 text-fg', className)}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M128 24a104 104 0 1 0 0 208a104 104 0 1 0 0-208ZM138 52a66 66 0 1 1 0 132a66 66 0 1 1 0-132Z"
      />
    </svg>
  );
}
