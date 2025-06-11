
// src/components/steps/CarTypeSelection.tsx
import type { FC } from 'react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BookingFormData } from '../BookingForm';
import type { CarTypeOptionAdmin } from '@/types/admin'; // Using admin type for consistency for now

interface CarTypeSelectionProps {
  errors: any;
  onNext?: () => Promise<void> | void;
  carTypes: Omit<CarTypeOptionAdmin, 'order' | 'dataAiHint'>[]; // Fetched from server
}

// This component is now a client component because it uses hooks (useFormContext)
// and interactivity (onClick). The data (carTypes) will be passed as a prop from a server component.
export const CarTypeSelection: FC<CarTypeSelectionProps> = ({ errors, onNext, carTypes }) => {
  const { register, watch, setValue, resetField } = useFormContext<BookingFormData>();
  const selectedCarType = watch('carType');

  const handleSelect = async (value: string) => {
    setValue('carType', value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    // Reset carModel when carType changes, as models depend on type
    setValue('carModel', '', { shouldValidate: false, shouldDirty: true }); // Don't validate immediately, wait for model selection

    if (onNext) {
      await onNext();
    }
  };

  if (!carTypes || carTypes.length === 0) {
    return (
      <div className="space-y-6 text-center">
        <Label className="text-xl font-semibold text-foreground block mb-4">اختر نوع السيارة</Label>
        <p className="text-muted-foreground">لا توجد أنواع سيارات متاحة حاليًا. يرجى مراجعة المسؤول.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">اختر نوع السيارة</Label>
      <p className="text-sm text-muted-foreground mb-6">اختر نوع السيارة الذي يناسب احتياجاتك.</p>
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
        {carTypes.map((car) => (
          <motion.div
             key={car.value} // value is the ID from Firestore
             whileHover={{ scale: 1.03 }}
             whileTap={{ scale: 0.98 }}
           >
            <Card
              className={cn(
                'glass-card cursor-pointer transition-all duration-200 ease-in-out overflow-hidden',
                selectedCarType === car.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background/50 dark:ring-offset-black/50' : 'ring-0',
                 errors?.carType ? 'border-destructive' : 'border-[hsl(var(--primary-light)/0.3)] dark:border-[hsl(var(--primary)/0.25)]'
              )}
              onClick={() => handleSelect(car.value)}
              role="radio"
              aria-checked={selectedCarType === car.value}
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect(car.value)}
            >
               <input
                 type="radio"
                 id={`carType-${car.value}`}
                 value={car.value}
                 {...register('carType')}
                 checked={selectedCarType === car.value}
                 className="sr-only"
                 aria-labelledby={`carType-label-${car.value}`}
               />
              <CardHeader className="p-0 relative h-40 sm:h-48"> {/* Increased height */}
                <Image
                  src={car.imageUrl || "https://placehold.co/300x200.png"}
                  alt={car.label}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-t-lg"
                  data-ai-hint={car.dataAiHint || "car image"}
                  quality={75}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-t-lg"></div>
              </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <CardTitle id={`carType-label-${car.value}`} className="text-sm sm:text-base font-medium text-center text-foreground truncate">{car.label}</CardTitle>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      {errors?.carType && (
        <p className="text-sm font-medium text-destructive mt-2">{errors.carType.message}</p>
      )}
    </div>
  );
};
