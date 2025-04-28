
"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Phone } from 'lucide-react'; // Import Phone icon
import type { BookingFormData } from '../BookingForm';
import { cn } from '@/lib/utils';

export const PhoneNumberInput: FC<{ errors: any }> = ({ errors }) => {
  const { register } = useFormContext<BookingFormData>();

  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">رقم الهاتف</Label>
      <p className="text-sm text-muted-foreground mb-6">يرجى إدخال رقم هاتفك للتواصل.</p>

      <div className="relative">
           {/* Position icon for RTL: right-3, adjust vertical alignment */}
           <Phone className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
           <Input
             id="phoneNumber"
             type="tel"
             // Ensure input accepts numbers in LTR format even in RTL layout
             dir="ltr"
             {...register('phoneNumber')}
             placeholder="مثال: +201XXXXXXXXX"
             // Adjust padding for RTL: pr-10, ensure text alignment is correct for phone numbers
             className={cn(
               "glass-input pr-10 text-left h-12 text-base", // Added h-12, text-base, and text-left
               errors?.phoneNumber ? "border-destructive" : ""
              )}
             aria-invalid={errors?.phoneNumber ? "true" : "false"}
           />
          {errors?.phoneNumber && (
            <p className="text-sm font-medium text-destructive mt-1">{errors.phoneNumber.message}</p>
          )}
        </div>
    </div>
  );
};
