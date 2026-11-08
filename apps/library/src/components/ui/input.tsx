import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixSymbol?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, prefixSymbol, ...props }, ref) => {
    if (prefixSymbol) {
      return (
        <div className="relative flex items-center w-full">
          <span className="absolute left-3 text-terminal-cyan font-mono text-xs select-none pointer-events-none">
            {prefixSymbol}
          </span>
          <input
            type={type}
            className={cn(
              'flex h-9 w-full bg-terminal-card border border-terminal-border pl-8 pr-3 py-1 text-xs font-mono text-slate-100 placeholder:text-terminal-dim focus:outline-none focus:border-terminal-cyan focus:ring-1 focus:ring-terminal-cyan transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full bg-terminal-card border border-terminal-border px-3 py-1 text-xs font-mono text-slate-100 placeholder:text-terminal-dim focus:outline-none focus:border-terminal-cyan focus:ring-1 focus:ring-terminal-cyan transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
