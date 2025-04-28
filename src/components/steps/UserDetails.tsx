"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User, Phone } from 'lucide-react';
import type { BookingFormData } from '../BookingForm';
import { cn } from '@/lib/utils';

export const UserDetails: FC<{ errors: any }> = ({ errors }) => { // Added errors prop
  const { register } = useFormContext<BookingFormData>();

  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">Your Details</Label>
       <p className="text-sm text-muted-foreground mb-6">Please provide your contact information.</p>

      <div className="space-y-4">
        <div className="relative"> {/* Added relative positioning */}
          <Label htmlFor="fullName" className="text-sm font-medium text-foreground flex items-center mb-1">
             <User className="w-4 h-4 mr-2 text-primary" /> Full Name
           </Label>
            <User className="w-4 h-4 text-muted-foreground absolute left-3 top-[2.3rem] transform -translate-y-1/2 pointer-events-none z-10"/> {/* Icon positioned absolutely */}
           <Input
             id="fullName"
             {...register('fullName')}
             placeholder="Enter your full name"
             className={cn("glass-input pl-10", errors?.fullName ? "border-destructive" : "")} // Use errors prop and add padding for icon
             aria-invalid={errors?.fullName ? "true" : "false"}
           />
          {errors?.fullName && ( // Use errors prop
            <p className="text-sm font-medium text-destructive mt-1">{errors.fullName.message}</p>
          )}
        </div>

        <div className="relative"> {/* Added relative positioning */}
           <Label htmlFor="phoneNumber" className="text-sm font-medium text-foreground flex items-center mb-1">
             <Phone className="w-4 h-4 mr-2 text-primary" /> Phone Number
           </Label>
             <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-[2.3rem] transform -translate-y-1/2 pointer-events-none z-10"/> {/* Icon positioned absolutely */}
           <Input
             id="phoneNumber"
             type="tel" // Use tel type for better mobile UX
             {...register('phoneNumber')}
             placeholder="Enter your phone number"
             className={cn("glass-input pl-10", errors?.phoneNumber ? "border-destructive" : "")} // Use errors prop and add padding for icon
             aria-invalid={errors?.phoneNumber ? "true" : "false"}
           />
          {errors?.phoneNumber && ( // Use errors prop
            <p className="text-sm font-medium text-destructive mt-1">{errors.phoneNumber.message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

    