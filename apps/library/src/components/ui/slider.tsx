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
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden bg-line-strong">
      <SliderPrimitive.Range className="absolute h-full bg-fg" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-2 bg-fg transition-colors duration-fast ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:pointer-events-none disabled:opacity-50 hover:bg-white" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
