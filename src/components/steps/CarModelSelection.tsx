
// src/components/steps/CarModelSelection.tsx
"use client";

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BookingFormData } from '../BookingForm';
import type { CarModelOptionAdmin, CarTypeOptionAdmin } from '@/types/admin';
import { getCarModelsForBooking } from '@/services/adminService';

export const getArabicCarTypeName = (
  typeValue: string,
  carTypesForName: Pick<CarTypeOptionAdmin, 'value' | 'label'>[]
): string => {
    const foundType = carTypesForName.find(ct => ct.value === typeValue);
    return foundType?.label || typeValue;
}

interface CarModelSelectionProps {
  errors?: any;
  onNext?: () => Promise<void> | void; // Added for auto-advancing
  allCarTypes: Pick<CarTypeOptionAdmin, 'value' | 'label'>[];
}

export const CarModelSelection: FC<CarModelSelectionProps> = ({ errors, onNext, allCarTypes }) => {
  const { register, watch, setValue, getValues, formState } = useFormContext<BookingFormData>();
  const selectedCarType = watch('carType');
  const selectedCarModel = watch('carModel');
  const [availableModels, setAvailableModels] = useState<Omit<CarModelOptionAdmin, 'order' | 'dataAiHint' | 'type'>[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedCarType) {
      setIsLoading(true);
      getCarModelsForBooking(selectedCarType)
        .then(models => {
          setAvailableModels(models);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setAvailableModels([]);
      // If carType is deselected, ensure carModel is also cleared
      if (getValues('carModel')) {
        setValue('carModel', '', { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [selectedCarType, setValue, getValues]);

  // Removed useEffect that set a default model, to respect "no default selection"


  const handleSelect = async (value: string) => {
    setValue('carModel', value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    if (onNext) { // Auto-advance if onNext is provided
      await onNext();
    }
  };

  if (!selectedCarType) {
    return (
      <div className="space-y-4 text-center">
        <Label className="text-xl font-semibold text-foreground">اختر موديل السيارة</Label>
        <p className="text-muted-foreground">الرجاء اختيار نوع السيارة أولاً لرؤية الموديلات المتاحة.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 text-center">
        <Label className="text-xl font-semibold text-foreground">اختر موديل السيارة</Label>
        <p className="text-muted-foreground">جاري تحميل الموديلات...</p>
      </div>
    );
  }
  
  if (availableModels.length === 0 && selectedCarType && !isLoading) { 
    const arabicCarTypeName = getArabicCarTypeName(selectedCarType, allCarTypes);
    return (
       <div className="space-y-4 text-center">
         <Label className="text-xl font-semibold text-foreground">موديل السيارة</Label>
         <p className="text-muted-foreground">
            لا توجد موديلات محددة متاحة حاليًا لنوع "{arabicCarTypeName}".
            <br />
            يرجى الرجوع واختيار نوع سيارة آخر أو التأكد من إضافة موديلات لهذا النوع في لوحة التحكم.
         </p>
           {/* carModel will remain empty, validation will trigger if user tries to proceed */}
           {formState.errors.carModel && (
              <p className="text-sm font-medium text-destructive mt-2">{formState.errors.carModel.message}</p>
          )}
       </div>
     );
  }

  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">اختر موديل السيارة</Label>
      <p className="text-sm text-muted-foreground mb-6">اختر موديلًا محددًا من نوع السيارة الذي اخترته.</p>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {availableModels.map((model) => (
          <motion.div
             key={model.value} 
             whileHover={{ scale: 1.03 }}
             whileTap={{ scale: 0.98 }}
             animate={{ scale: selectedCarModel === model.value ? 1.02 : 1 }}
             transition={{ type: "spring", stiffness: 400, damping: 15 }}
           >
            <Card
              className={cn(
                'glass-card cursor-pointer transition-all duration-200 ease-in-out overflow-hidden',
                selectedCarModel === model.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background/50 dark:ring-offset-black/50 shadow-lg' : 'ring-0 shadow-md hover:shadow-lg',
                formState.errors.carModel ? 'border-destructive' : 'border-[hsl(var(--primary-light)/0.3)] dark:border-[hsl(var(--primary)/0.25)]'
              )}
              onClick={() => handleSelect(model.value)}
              role="radio"
              aria-checked={selectedCarModel === model.value}
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect(model.value)}
            >
               <input
                 type="radio"
                 id={`carModel-${model.value}`}
                 value={model.value}
                 {...register('carModel')}
                 checked={selectedCarModel === model.value}
                 className="sr-only"
                 aria-labelledby={`carModel-label-${model.value}`}
               />
              <CardHeader className="p-0 relative h-40 sm:h-48"> {/* Increased height */}
                <Image
                  src={model.imageUrl || "https://placehold.co/300x200.png"} 
                  alt={model.label}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-t-lg"
                  data-ai-hint={model.dataAiHint || "car model"}
                  quality={75}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-t-lg"></div>
              </CardHeader>
              <CardContent className="p-2 sm:p-3">
                <CardTitle id={`carModel-label-${model.value}`} className="text-sm sm:text-base font-medium text-center text-foreground truncate">{model.label}</CardTitle>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      {formState.errors.carModel && (
        <p className="text-sm font-medium text-destructive mt-2">{formState.errors.carModel.message}</p>
      )}
    </div>
  );
};
