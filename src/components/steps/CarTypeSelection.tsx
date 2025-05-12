
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
  value: string; // Keep value in English for consistency
  label: string; // Label in Arabic
  imageUrl: string;
  dataAiHint?: string;
}

const carTypes: CarTypeOption[] = [
  { value: 'limousine', label: 'ليموزين', imageUrl: 'https://picsum.photos/seed/limo/300/200', dataAiHint: 'luxury limousine' },
  { value: 'sedan', label: 'سيدان (ملاكي)', imageUrl: 'https://picsum.photos/seed/sedan/300/200', dataAiHint: 'sedan car' },
  { value: 'large', label: 'سيارة كبيرة', imageUrl: 'https://picsum.photos/seed/large/300/200', dataAiHint: 'suv car' },
  { value: '7seater', label: '7 مقاعد', imageUrl: 'https://picsum.photos/seed/7seater/300/200', dataAiHint: 'van car' },
];

interface CarTypeSelectionProps {
  errors: any;
  onNext?: () => Promise<void> | void; // Optional prop for auto-advancing
}

export const CarTypeSelection: FC<CarTypeSelectionProps> = ({ errors, onNext }) => {
  const { register, watch, setValue, resetField } = useFormContext<BookingFormData>();
  const selectedCarType = watch('carType');

  const handleSelect = async (value: string) => {
    setValue('carType', value, { shouldValidate: true });
    resetField('carModel', { defaultValue: '' });
     await new Promise(resolve => setTimeout(resolve, 0));
     setValue('carModel', '', { shouldValidate: true });

     if (onNext) {
       await onNext();
     }
  };

  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">اختر نوع السيارة</Label>
       <p className="text-sm text-muted-foreground mb-6">اختر نوع السيارة الذي يناسب احتياجاتك.</p>
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4"> {/* Adjusted grid for potentially smaller cards */}
        {carTypes.map((car) => (
          <motion.div
             key={car.value}
             whileHover={{ scale: 1.03 }}
             whileTap={{ scale: 0.98 }}
           >
            <Card
              className={cn(
                'glass-card cursor-pointer transition-all duration-200 ease-in-out overflow-hidden',
                selectedCarType === car.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background/50 dark:ring-offset-black/50' : 'ring-0',
                 errors?.carType ? 'border-destructive' : 'border-white/20 dark:border-black/20'
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
                 className="sr-only"
                 aria-labelledby={`carType-label-${car.value}`}
               />
              <CardHeader className="p-0 relative h-32"> {/* Reduced height from h-40 */}
                <Image
                  src={car.imageUrl}
                  alt={car.label} // Use Arabic label for alt text
                  layout="fill"
                  objectFit="cover"
                  className="rounded-t-lg"
                  data-ai-hint={car.dataAiHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-t-lg"></div>
              </CardHeader>
              <CardContent className="p-3"> {/* Reduced padding from p-4 */}
                <CardTitle id={`carType-label-${car.value}`} className="text-base font-medium text-center text-foreground">{car.label}</CardTitle> {/* Reduced font size from text-lg */}
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
