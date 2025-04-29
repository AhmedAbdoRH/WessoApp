
"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User } from 'lucide-react'; // Import User icon
import type { BookingFormData } from '../BookingForm';
import { cn } from '@/lib/utils';

// Renamed component from FullNameInput to FirstNameInput
export const FirstNameInput: FC<{ errors: any }> = ({ errors }) => {
  // Use 'firstName' from BookingFormData type
  const { register } = useFormContext<BookingFormData>();

  return (
    <div className="space-y-6">
      {/* Update Label text */}
      <Label className="text-xl font-semibold text-foreground block mb-4">الاسم الأول</Label>
      {/* Update paragraph text */}
      <p className="text-sm text-muted-foreground mb-6">يرجى إدخال اسمك الأول.</p>

      <div className="relative">
         {/* Position icon for RTL: right-3, adjust vertical alignment */}
         <User className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
         <Input
           id="firstName" // Update id
           {...register('firstName')} // Register 'firstName'
           placeholder="أدخل اسمك الأول هنا" // Update placeholder
           // Adjust padding for RTL: pr-10
           className={cn(
              "glass-input pr-10 h-12 text-base", // Added h-12 and text-base for better visibility
              errors?.firstName ? "border-destructive" : "" // Check for 'firstName' error
           )}
           aria-invalid={errors?.firstName ? "true" : "false"} // Check for 'firstName' error
         />
        {errors?.firstName && ( // Check for 'firstName' error
          <p className="text-sm font-medium text-destructive mt-1">{errors.firstName.message}</p>
        )}
      </div>
    </div>
  );
};
