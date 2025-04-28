"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BookingFormData } from '../BookingForm'; // Adjust path as necessary

interface CarTypeOption {
  value: string;
  label: string;
  imageUrl: string;
}

const carTypes: CarTypeOption[] = [
  { value: 'limousine', label: 'Limousine', imageUrl: 'https://picsum.photos/seed/limo/300/200' },
  { value: 'sedan', label: 'Sedan (Mlaki)', imageUrl: 'https://picsum.photos/seed/sedan/300/200' },
  { value: 'large', label: 'Large Car', imageUrl: 'https://picsum.photos/seed/large/300/200' },
  { value: '7seater', label: '7-Seater', imageUrl: 'https://picsum.photos/seed/7seater/300/200' },
];

export const CarTypeSelection: FC = () => {
  const { register, watch, setValue, formState: { errors } } = useFormContext<BookingFormData>();
  const selectedCarType = watch('carType');

  const handleSelect = (value: string) => {
    setValue('carType', value, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">Select Car Type</Label>
       <p className="text-sm text-muted-foreground mb-6">Choose the type of vehicle that best suits your needs.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {carTypes.map((car) => (
          <motion.div
             key={car.value}
             whileHover={{ scale: 1.03 }}
             whileTap={{ scale: 0.98 }}
           >
            <Card
              className={cn(
                'glass-card cursor-pointer transition-all duration-200 ease-in-out overflow-hidden',
                selectedCarType === car.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background/50' : 'ring-0',
                 errors.carType ? 'border-destructive' : 'border-white/20 dark:border-black/20'
              )}
              onClick={() => handleSelect(car.value)}
              role="radio"
              aria-checked={selectedCarType === car.value}
              tabIndex={0} // Make it focusable
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect(car.value)} // Basic keyboard selection
            >
               <input
                 type="radio"
                 id={`carType-${car.value}`}
                 value={car.value}
                 {...register('carType')}
                 className="sr-only" // Hide the actual radio button
                 aria-labelledby={`carType-label-${car.value}`}
               />
              <CardHeader className="p-0 relative h-40">
                <Image
                  src={car.imageUrl}
                  alt={car.label}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-t-lg"
                />
                {/* Optional: Add a subtle overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-t-lg"></div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle id={`carType-label-${car.value}`} className="text-lg font-medium text-center text-foreground">{car.label}</CardTitle>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      {errors.carType && (
        <p className="text-sm font-medium text-destructive mt-2">{errors.carType.message}</p>
      )}
    </div>
  );
};
