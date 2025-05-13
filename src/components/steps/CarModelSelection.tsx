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
import { getCarModelsForBooking } from '@/services/adminService'; // To fetch models client-side or pass as prop

// Helper to get Arabic type name (can be moved to a utils file if used elsewhere)
export const getArabicCarTypeName = (
  typeValue: string,
  carTypesForName: Pick<CarTypeOptionAdmin, 'value' | 'label'>[]
): string => {
    const foundType = carTypesForName.find(ct => ct.value === typeValue);
    return foundType?.label || typeValue; // Fallback to value if not found
}

interface CarModelSelectionProps {
  errors?: any;
  onNext?: () => Promise<void> | void;
  // Car types are needed to display the name if no models are available
  allCarTypes: Pick<CarTypeOptionAdmin, 'value' | 'label'>[];
}

export const CarModelSelection: FC<CarModelSelectionProps> = ({ errors, onNext, allCarTypes }) => {
  const { register, watch, setValue, formState } = useFormContext<BookingFormData>();
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
          // If only one model or no specific models, and a default was previously set, clear it if type changes
          // This logic might need adjustment based on how defaults are handled
          const currentModel = watch('carModel');
          if (models.length > 0 && !models.find(m => m.value === currentModel)) {
             // setValue('carModel', '', { shouldValidate: false }); // Clear if current model not in new list
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setAvailableModels([]);
    }
  }, [selectedCarType, setValue, watch]);


  const handleSelect = async (value: string) => {
    setValue('carModel', value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    if (onNext) {
      await new Promise(resolve => setTimeout(resolve, 50));
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
  
  // Handle case where no specific models are defined for a type
  if (availableModels.length === 0 && selectedCarType) {
    const defaultModelValue = `${selectedCarType}-default`; // Create a default model identifier
    const arabicCarTypeName = getArabicCarTypeName(selectedCarType, allCarTypes);

     // Effect to set default model and attempt auto-advance
     React.useEffect(() => {
       setValue('carModel', defaultModelValue, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        const tryAutoAdvance = async () => {
            if (onNext) {
                await new Promise(resolve => setTimeout(resolve, 50));
                await onNext();
            }
        }
        // Only auto-advance if this effect sets the value
        if (watch('carModel') === defaultModelValue) {
            tryAutoAdvance();
        }
     }, [selectedCarType, setValue, onNext, defaultModelValue, watch]);

    return (
       <div className="space-y-4 text-center">
         <Label className="text-xl font-semibold text-foreground">موديل السيارة</Label>
         <p className="text-muted-foreground">سيتم تعيين الموديل القياسي لنوع {arabicCarTypeName}.</p>
          {/* Ensure the hidden input is registered for the default model */}
          <input type="hidden" {...register('carModel')} value={defaultModelValue} />
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
             key={model.value} // value is the ID from Firestore
             whileHover={{ scale: 1.03 }}
             whileTap={{ scale: 0.98 }}
             animate={{ scale: selectedCarModel === model.value ? 1.02 : 1 }}
             transition={{ type: "spring", stiffness: 400, damping: 15 }}
           >
            <Card
              className={cn(
                'glass-card cursor-pointer transition-all duration-200 ease-in-out overflow-hidden',
                selectedCarModel === model.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background/50 dark:ring-offset-black/50 shadow-lg' : 'ring-0 shadow-md hover:shadow-lg',
                formState.errors.carModel ? 'border-destructive' : 'border-white/20 dark:border-black/20'
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
              <CardHeader className="p-0 relative h-28 sm:h-32">
                <Image
                  src={model.imageUrl || "https://picsum.photos/300/200"} // Fallback image
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
