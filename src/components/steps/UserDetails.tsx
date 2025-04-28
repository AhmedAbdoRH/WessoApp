"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User, Phone } from 'lucide-react';
import type { BookingFormData } from '../BookingForm';
import { cn } from '@/lib/utils';

export const UserDetails: FC<{ errors: any }> = ({ errors }) => {
  const { register } = useFormContext<BookingFormData>();

  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">بياناتك</Label>
       <p className="text-sm text-muted-foreground mb-6">يرجى تقديم معلومات الاتصال الخاصة بك.</p>

      <div className="space-y-4">
        <div className="relative">
          <Label htmlFor="fullName" className="text-sm font-medium text-foreground flex items-center mb-1">
             {/* Adjust margin for RTL: ml-2 */}
             <User className="w-4 h-4 ml-2 text-primary" /> الاسم الكامل
           </Label>
            {/* Position icon for RTL: right-3 */}
            <User className="w-4 h-4 text-muted-foreground absolute right-3 top-[2.3rem] transform -translate-y-1/2 pointer-events-none z-10"/>
           <Input
             id="fullName"
             {...register('fullName')}
             placeholder="أدخل اسمك الكامل"
             // Adjust padding for RTL: pr-10
             className={cn("glass-input pr-10", errors?.fullName ? "border-destructive" : "")}
             aria-invalid={errors?.fullName ? "true" : "false"}
           />
          {errors?.fullName && (
            <p className="text-sm font-medium text-destructive mt-1">{errors.fullName.message}</p>
          )}
        </div>

        <div className="relative">
           <Label htmlFor="phoneNumber" className="text-sm font-medium text-foreground flex items-center mb-1">
             {/* Adjust margin for RTL: ml-2 */}
             <Phone className="w-4 h-4 ml-2 text-primary" /> رقم الهاتف
           </Label>
             {/* Position icon for RTL: right-3 */}
             <Phone className="w-4 h-4 text-muted-foreground absolute right-3 top-[2.3rem] transform -translate-y-1/2 pointer-events-none z-10"/>
           <Input
             id="phoneNumber"
             type="tel"
             // Ensure input accepts numbers in LTR format even in RTL layout
             dir="ltr"
             {...register('phoneNumber')}
             placeholder="أدخل رقم هاتفك"
              // Adjust padding for RTL: pr-10
             className={cn("glass-input pr-10 text-left", errors?.phoneNumber ? "border-destructive" : "")}
             aria-invalid={errors?.phoneNumber ? "true" : "false"}
           />
          {errors?.phoneNumber && (
            <p className="text-sm font-medium text-destructive mt-1">{errors.phoneNumber.message}</p>
          )}
        </div>
      </div>
    </div>
  );
};
