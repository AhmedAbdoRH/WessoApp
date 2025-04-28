"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User, Phone } from 'lucide-react';
import type { BookingFormData } from '../BookingForm';

export const UserDetails: FC = () => {
  const { register, formState: { errors } } = useFormContext<BookingFormData>();

  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">Your Details</Label>
       <p className="text-sm text-muted-foreground mb-6">Please provide your contact information.</p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName" className="text-sm font-medium text-foreground flex items-center mb-1">
             <User className="w-4 h-4 mr-2 text-primary" /> Full Name
           </Label>
           <Input
             id="fullName"
             {...register('fullName')}
             placeholder="Enter your full name"
             className="glass-input pl-10" // Add padding for icon
             aria-invalid={errors.fullName ? "true" : "false"}
           />
            <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" style={{ top: 'calc(50% + 1rem)'}}/> {/* Adjust positioning slightly */}
          {errors.fullName && (
            <p className="text-sm font-medium text-destructive mt-1">{errors.fullName.message}</p>
          )}
        </div>

        <div>
           <Label htmlFor="phoneNumber" className="text-sm font-medium text-foreground flex items-center mb-1">
             <Phone className="w-4 h-4 mr-2 text-primary" /> Phone Number
           </Label>
           <Input
             id="phoneNumber"
             type="tel" // Use tel type for better mobile UX
             {...register('phoneNumber')}
             placeholder="Enter your phone number"
             className="glass-input pl-10" // Add padding for icon
             aria-invalid={errors.phoneNumber ? "true" : "false"}
           />
            <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" style={{ top: 'calc(50% + 1rem)'}}/> {/* Adjust positioning slightly */}
          {errors.phoneNumber && (
            <p className="text-sm font-medium text-destructive mt-1">{errors.phoneNumber.message}</p>
          )}
        </div>
      </div>
    </div>
  );
};
