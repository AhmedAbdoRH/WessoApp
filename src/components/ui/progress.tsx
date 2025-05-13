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
      "progress-track", // New class for root styling from globals.css
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "progress-bar" // New class for indicator styling from globals.css
      )}
      style={{
        transform: dir === 'rtl' ? `translateX(${100 - (value || 0)}%)` : `translateX(-${100 - (value || 0)}%)`,
      }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
