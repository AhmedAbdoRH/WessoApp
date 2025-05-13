// src/components/ui/progress.tsx
"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { dir?: 'ltr' | 'rtl' }
>(({ className, value, dir = 'ltr', ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-secondary", // Keeping h-2 as per previous modifications
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 transition-transform duration-500 ease-out animate-progress-shimmer" // Added animate-progress-shimmer
      )}
      // Adjust transform based on direction
      style={{
        transform: dir === 'rtl' ? `translateX(${100 - (value || 0)}%)` : `translateX(-${100 - (value || 0)}%)`,
        backgroundImage: `linear-gradient(to right, hsl(var(--primary)/0.7) 25%, hsl(var(--primary)) 50%, hsl(var(--primary)/0.7) 75%)`, // Gradient for shimmer effect
        backgroundSize: '200% 100%', // Needs to be larger than element for movement
      }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
