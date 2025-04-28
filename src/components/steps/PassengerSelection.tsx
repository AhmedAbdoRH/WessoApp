"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { RadioGroup } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { BookingFormData } from '../BookingForm';

const passengerOptions = [1, 2, 3, 4];
const bagOptions = [0, 1, 2, 3];

export const PassengerSelection: FC<{ errors: any }> = ({ errors }) => {
  const { control } = useFormContext<BookingFormData>();

  return (
    <div className="space-y-8">
      <div>
        <Label className="text-xl font-semibold text-foreground block mb-4">عدد الركاب</Label>
         <p className="text-sm text-muted-foreground mb-6">كم عدد الأشخاص المسافرين؟</p>
        <Controller
          name="passengers"
          control={control}
          render={({ field }) => (
            <RadioGroup
              onValueChange={(value) => field.onChange(parseInt(value))}
              value={String(field.value)}
              className="flex flex-wrap gap-4"
            >
              {passengerOptions.map((num) => (
                // Adjust space for RTL: space-x-reverse space-x-2 -> space-x-2 mr-2 for label
                <div key={`passenger-${num}`} className="flex items-center space-x-2 relative">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={field.value === num}
                      onClick={() => field.onChange(num)}
                      className={cn(
                        'glass-radio relative flex items-center justify-center',
                        field.value === num ? 'bg-primary border-primary' : 'bg-white/20 dark:bg-black/20 border-white/50 dark:border-black/50'
                      )}
                      aria-labelledby={`passenger-label-${num}`}
                    >
                         {field.value === num && <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>}
                    </button>
                  {/* Adjust margin for RTL: mr-2 */}
                  <Label id={`passenger-label-${num}`} htmlFor={`passenger-${num}`} className="glass-radio-label mr-2">{num} {num === 1 ? 'راكب' : 'ركاب'}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
        />
        {errors?.passengers && (
          <p className="text-sm font-medium text-destructive mt-2">{errors.passengers.message}</p>
        )}
      </div>

      <div>
        <Label className="text-xl font-semibold text-foreground block mb-4">عدد الحقائب</Label>
         <p className="text-sm text-muted-foreground mb-6">تقدير كمية الأمتعة.</p>
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
                 <div key={`bag-${num}`} className="flex items-center space-x-2 relative">
                   <button
                     type="button"
                     role="radio"
                     aria-checked={field.value === num}
                     onClick={() => field.onChange(num)}
                     className={cn(
                       'glass-radio relative flex items-center justify-center',
                       field.value === num ? 'bg-primary border-primary' : 'bg-white/20 dark:bg-black/20 border-white/50 dark:border-black/50'
                     )}
                     aria-labelledby={`bag-label-${num}`}
                   >
                      {field.value === num && <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>}
                   </button>
                   {/* Adjust margin for RTL: mr-2 */}
                   <Label id={`bag-label-${num}`} htmlFor={`bag-${num}`} className="glass-radio-label mr-2">{num} {num === 0 ? 'حقائب' : num === 1 ? 'حقيبة' : num === 2 ? 'حقيبتان' : 'حقائب'}</Label>
                 </div>
               ))}
             </RadioGroup>
          )}
        />
        {errors?.bags && (
          <p className="text-sm font-medium text-destructive mt-2">{errors.bags.message}</p>
        )}
      </div>
    </div>
  );
};
