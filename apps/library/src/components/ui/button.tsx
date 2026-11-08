import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-xs font-mono font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-cyan disabled:pointer-events-none disabled:opacity-50 select-none uppercase tracking-wider',
  {
    variants: {
      variant: {
        default:
          'bg-terminal-cyan text-black hover:bg-terminal-cyan/90 border border-terminal-cyan shadow-terminal-glow font-semibold',
        terminal:
          'bg-terminal-card text-terminal-cyan border border-terminal-border hover:border-terminal-cyan hover:bg-terminal-cyan/10 hover:shadow-terminal-glow',
        cyber:
          'bg-emerald-500/10 text-terminal-green border border-emerald-500/30 hover:border-terminal-green hover:bg-emerald-500/20 hover:shadow-terminal-green',
        amber:
          'bg-amber-500/10 text-terminal-amber border border-amber-500/30 hover:border-terminal-amber hover:bg-amber-500/20 hover:shadow-terminal-amber',
        outline:
          'border border-terminal-border text-terminal-text bg-transparent hover:border-slate-400 hover:text-white',
        ghost:
          'text-terminal-dim hover:text-terminal-text hover:bg-terminal-border/20 border border-transparent',
        destructive:
          'bg-terminal-pink/10 text-terminal-pink border border-terminal-pink/30 hover:bg-terminal-pink/20',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 px-3 text-[11px]',
        lg: 'h-11 px-6 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
