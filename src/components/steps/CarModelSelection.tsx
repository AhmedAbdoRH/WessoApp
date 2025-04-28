"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // Using Input as placeholder
import type { BookingFormData } from '../BookingForm';

export const CarModelSelection: FC = () => {
  const { register, formState: { errors } } = useFormContext<BookingFormData>();

  // TODO: Replace this with actual car model selection (e.g., cards or select dropdown)
  // For now, using a simple text input as a placeholder.

  return (
    <div className="space-y-4">
      <Label htmlFor="carModel" className="text-xl font-semibold text-foreground">Select Car Model (Optional)</Label>
      <p className="text-sm text-muted-foreground mb-6">Specify a preferred model if you have one.</p>
      <Input
        id="carModel"
        {...register('carModel')}
        placeholder="e.g., Toyota Camry, Mercedes S-Class"
        className="glass-input"
      />
      {/* No error display for optional field unless specific validation is added */}
       {/* {errors.carModel && (
         <p className="text-sm font-medium text-destructive">{errors.carModel.message}</p>
       )} */}
    </div>
  );
};
