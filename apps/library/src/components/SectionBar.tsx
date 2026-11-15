import { cn } from '@/lib/utils';

/**
 * Thin labelled bar that opens each section of the framed grid. The label names the section,
 * the optional right slot carries a count or a status.
 */
export default function SectionBar({
  label,
  children,
  className,
  id,
}: {
  label: string;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        'flex h-11 items-center justify-between border-b border-line px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted sm:px-6',
        className,
      )}
    >
      <span>{label}</span>
      {children ? <span className="tabular-nums">{children}</span> : null}
    </div>
  );
}
