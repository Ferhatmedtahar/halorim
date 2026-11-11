import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional leading icon rendered inside the field. */
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, icon, ...props }, ref) => {
  const field = (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-full bg-raised text-sm text-fg placeholder:text-muted outline-none transition-colors duration-fast ease-out hover:bg-hover focus-visible:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:cursor-not-allowed disabled:opacity-40',
        icon ? 'pl-10 pr-4' : 'px-4',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
  if (!icon) return field;
  return (
    <div className="relative flex w-full items-center">
      <span className="pointer-events-none absolute left-3.5 text-muted [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {field}
    </div>
  );
});
Input.displayName = 'Input';

export { Input };
