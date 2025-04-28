"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { RadioGroup } from '@/components/ui/radio-group'; // Using shadcn RadioGroup for structure
import { cn } from '@/lib/utils';
import type { BookingFormData } from '../BookingForm';

const passengerOptions = [1, 2, 3, 4];
const bagOptions = [0, 1, 2, 3]; // Updated to include 0 bags

// Custom Glass Radio Item component
const GlassRadioItem: FC<{ value: string | number; id: string }> = ({ value, id, ...props }) => (
   <button
     type="button" // Important: Prevent form submission
     role="radio"
     aria-checked={props['aria-checked']} // Pass aria-checked from Controller
     id={id}
     value={value}
     className={cn(
        'glass-radio peer',
        props['aria-checked'] ? 'bg-primary border-transparent' : '' // Style when checked
     )}
     {...props} // Spread other props like onClick from Controller
   >
     <span className="absolute inset-0 rounded-full"></span> {/* For focus styling */}
   </button>
 );


export const PassengerSelection: FC = () => {
  const { control, formState: { errors } } = useFormContext<BookingFormData>();

  return (
    <div className="space-y-8">
      <div>
        <Label className="text-xl font-semibold text-foreground block mb-4">Number of Passengers</Label>
         <p className="text-sm text-muted-foreground mb-6">How many people are traveling?</p>
        <Controller
          name="passengers"
          control={control}
          render={({ field }) => (
            <RadioGroup
              onValueChange={(value) => field.onChange(parseInt(value))} // Ensure value is number
              value={String(field.value)} // Value needs to be string for RadioGroup
              className="flex flex-wrap gap-4"
            >
              {passengerOptions.map((num) => (
                <div key={`passenger-${num}`} className="flex items-center space-x-2">
                   {/* Use button for custom styling */}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={field.value === num}
                      onClick={() => field.onChange(num)}
                      className={cn(
                        'glass-radio',
                        field.value === num ? 'bg-primary border-primary' : 'bg-white/20 dark:bg-black/20 border-white/50 dark:border-black/50'
                      )}
                    >
                         {/* Optional: Inner circle for checked state */}
                         {field.value === num && <div className="w-2 h-2 bg-primary-foreground rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>}
                    </button>
                  <Label htmlFor={`passenger-${num}`} className="glass-radio-label">{num} Passenger{num > 1 ? 's' : ''}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
        />
        {errors.passengers && (
          <p className="text-sm font-medium text-destructive mt-2">{errors.passengers.message}</p>
        )}
      </div>

      <div>
        <Label className="text-xl font-semibold text-foreground block mb-4">Number of Bags</Label>
         <p className="text-sm text-muted-foreground mb-6">Estimate the amount of luggage.</p>
        <Controller
          name="bags"
          control={control}
          render={({ field }) => (
             <RadioGroup
               onValueChange={(value) => field.onChange(parseInt(value))}
               value={String(field.value)}
               className="flex flex-wrap gap-4"
             >
               {bagOptions.map((num) => (
                 <div key={`bag-${num}`} className="flex items-center space-x-2">
                   <button
                     type="button"
                     role="radio"
                     aria-checked={field.value === num}
                     onClick={() => field.onChange(num)}
                     className={cn(
                       'glass-radio',
                       field.value === num ? 'bg-primary border-primary' : 'bg-white/20 dark:bg-black/20 border-white/50 dark:border-black/50'
                     )}
                   >
                      {field.value === num && <div className="w-2 h-2 bg-primary-foreground rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>}
                   </button>
                   <Label htmlFor={`bag-${num}`} className="glass-radio-label">{num} Bag{num !== 1 ? 's' : ''}</Label>
                 </div>
               ))}
             </RadioGroup>
          )}
        />
        {errors.bags && (
          <p className="text-sm font-medium text-destructive mt-2">{errors.bags.message}</p>
        )}
      </div>
    </div>
  );
};
