import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center cursor-pointer py-1',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden bg-terminal-border">
      <SliderPrimitive.Range className="absolute h-full bg-terminal-cyan" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-3 border border-terminal-cyan bg-terminal-cyan shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-cyan disabled:pointer-events-none disabled:opacity-50 hover:bg-white" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
