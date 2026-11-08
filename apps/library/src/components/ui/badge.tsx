import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors select-none',
  {
    variants: {
      variant: {
        default:
          'border border-terminal-cyan/40 bg-terminal-cyan/10 text-terminal-cyan',
        cyan:
          'border border-terminal-cyan/40 bg-terminal-cyan/10 text-terminal-cyan',
        green:
          'border border-terminal-green/40 bg-terminal-green/10 text-terminal-green',
        amber:
          'border border-terminal-amber/40 bg-terminal-amber/10 text-terminal-amber',
        pink:
          'border border-terminal-pink/40 bg-terminal-pink/10 text-terminal-pink',
        outline:
          'border border-terminal-border text-terminal-dim',
        secondary:
          'border border-slate-700 bg-slate-800/60 text-slate-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  bracketed?: boolean;
}

function Badge({ className, variant, bracketed = true, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {bracketed && <span className="opacity-40 mr-1">[</span>}
      {children}
      {bracketed && <span className="opacity-40 ml-1">]</span>}
    </div>
  );
}

export { Badge, badgeVariants };
