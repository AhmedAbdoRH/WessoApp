
"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BookingFormData } from '../BookingForm';

interface CarModelOption {
  value: string;
  label: string; // Label in Arabic
  imageUrl: string;
  type: string; // Keep type value in English for consistency with CarTypeSelection
  dataAiHint?: string;
}

// Example car models with Arabic labels
const allCarModels: CarModelOption[] = [
  // Sedans
  { value: 'toyota-camry', label: 'تويوتا كامري', imageUrl: 'https://picsum.photos/seed/camry/300/200', type: 'sedan', dataAiHint: 'toyota camry' },
  { value: 'honda-accord', label: 'هوندا أكورد', imageUrl: 'https://picsum.photos/seed/accord/300/200', type: 'sedan', dataAiHint: 'honda accord' },
  { value: 'mercedes-e-class', label: 'مرسيدس E-Class', imageUrl: 'https://picsum.photos/seed/eclass/300/200', type: 'sedan', dataAiHint: 'mercedes eclass' },
  // Limousines
  { value: 'lincoln-stretch', label: 'لينكولن ستريتش', imageUrl: 'https://picsum.photos/seed/lincoln/300/200', type: 'limousine', dataAiHint: 'stretch limousine' },
  { value: 'cadillac-escalade-limo', label: 'كاديلاك إسكاليد ليمو', imageUrl: 'https://picsum.photos/seed/escalade-limo/300/200', type: 'limousine', dataAiHint: 'cadillac escalade' },
  // Large Cars
  { value: 'chevrolet-suburban', label: 'شيفروليه سوبربان', imageUrl: 'https://picsum.photos/seed/suburban/300/200', type: 'large', dataAiHint: 'chevrolet suburban' },
  { value: 'ford-expedition', label: 'فورد إكسبيديشن', imageUrl: 'https://picsum.photos/seed/expedition/300/200', type: 'large', dataAiHint: 'ford expedition' },
  // 7-Seaters
  { value: 'toyota-sienna', label: 'تويوتا سيينا', imageUrl: 'https://picsum.photos/seed/sienna/300/200', type: '7seater', dataAiHint: 'toyota sienna' },
  { value: 'honda-odyssey', label: 'هوندا أوديسي', imageUrl: 'https://picsum.photos/seed/odyssey/300/200', type: '7seater', dataAiHint: 'honda odyssey' },
  { value: 'chrysler-pacifica', label: 'كرايسلر باسيفيكا', imageUrl: 'https://picsum.photos/seed/pacifica/300/200', type: '7seater', dataAiHint: 'chrysler pacifica' },
];

// Helper to get Arabic type name
export const getArabicCarTypeName = (typeValue: string): string => {
    switch (typeValue) {
        case 'limousine': return 'ليموزين';
        case 'sedan': return 'سيدان (ملاكي)';
        case 'large': return 'سيارة كبيرة';
        case '7seater': return '7 مقاعد';
        default: return typeValue; // Fallback
    }
}


interface CarModelSelectionProps {
  errors?: any;
  onNext?: () => Promise<void> | void;
}

export const CarModelSelection: FC<CarModelSelectionProps> = ({ errors, onNext }) => {
  const { register, watch, setValue, formState } = useFormContext<BookingFormData>();
  const selectedCarType = watch('carType');
  const selectedCarModel = watch('carModel');

  const handleSelect = async (value: string) => {
    setValue('carModel', value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    if (onNext) {
      // Short delay allows the state update to propagate before potential navigation/validation
      await new Promise(resolve => setTimeout(resolve, 50));
      await onNext();
    }
  };

  const availableModels = allCarModels.filter(model => model.type === selectedCarType);

  if (!selectedCarType) {
    return (
      <div className="space-y-4 text-center">
        <Label className="text-xl font-semibold text-foreground">اختر موديل السيارة</Label>
        <p className="text-muted-foreground">الرجاء اختيار نوع السيارة أولاً لرؤية الموديلات المتاحة.</p>
      </div>
    );
  }

    // Handle case where no specific models are defined for a type (auto-advance with default)
    if (availableModels.length === 0) {
      const defaultModelValue = `${selectedCarType}-default`;
      const arabicCarTypeName = getArabicCarTypeName(selectedCarType);
       // Effect to set default model and attempt auto-advance
       React.useEffect(() => {
         setValue('carModel', defaultModelValue, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          const tryAutoAdvance = async () => {
              if (onNext) {
                  // Short delay to ensure state update before advancing
                  await new Promise(resolve => setTimeout(resolve, 50));
                  await onNext();
              }
          }
          tryAutoAdvance();
        // Dependencies: only run when the selected type or onNext changes, and defaultModelValue is recalculated
       }, [selectedCarType, setValue, onNext, defaultModelValue]);

      return (
         <div className="space-y-4 text-center">
           <Label className="text-xl font-semibold text-foreground">موديل السيارة</Label>
           <p className="text-muted-foreground">سيتم تعيين الموديل القياسي لنوع {arabicCarTypeName}.</p>
            {/* Ensure the hidden input is registered */}
            <input type="hidden" {...register('carModel')} value={defaultModelValue} />
             {/* Display potential validation error for carModel */}
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
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"> {/* Adjusted grid and gap */}
        {availableModels.map((model) => (
          <motion.div
             key={model.value}
             whileHover={{ scale: 1.03 }}
             whileTap={{ scale: 0.98 }}
             // Add slight animation on selection
             animate={{ scale: selectedCarModel === model.value ? 1.02 : 1 }}
             transition={{ type: "spring", stiffness: 400, damping: 15 }}
           >
            <Card
              className={cn(
                'glass-card cursor-pointer transition-all duration-200 ease-in-out overflow-hidden',
                selectedCarModel === model.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background/50 dark:ring-offset-black/50 shadow-lg' : 'ring-0 shadow-md hover:shadow-lg', // Enhanced hover/selection effect
                formState.errors.carModel ? 'border-destructive' : 'border-white/20 dark:border-black/20'
              )}
              onClick={() => handleSelect(model.value)}
              role="radio"
              aria-checked={selectedCarModel === model.value}
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect(model.value)}
            >
               {/* Hidden radio input for form state */}
               <input
                 type="radio"
                 id={`carModel-${model.value}`}
                 value={model.value}
                 {...register('carModel')}
                 checked={selectedCarModel === model.value}
                 className="sr-only"
                 aria-labelledby={`carModel-label-${model.value}`}
               />
              <CardHeader className="p-0 relative h-28 sm:h-32"> {/* Reduced height */}
                <Image
                  src={model.imageUrl}
                  alt={model.label} // Use Arabic label for alt text
                  layout="fill"
                  objectFit="cover"
                  className="rounded-t-lg"
                  data-ai-hint={model.dataAiHint}
                  // Add quality prop for optimization
                  quality={75}
                  priority={false} // Only prioritize above-the-fold images if needed
                />
                {/* Gradient overlay for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-t-lg"></div>
              </CardHeader>
              <CardContent className="p-2 sm:p-3"> {/* Reduced padding */}
                <CardTitle id={`carModel-label-${model.value}`} className="text-sm sm:text-base font-medium text-center text-foreground truncate">{model.label}</CardTitle> {/* Reduced font size */}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      {/* Display validation error if carModel field is invalid */}
      {formState.errors.carModel && (
        <p className="text-sm font-medium text-destructive mt-2">{formState.errors.carModel.message}</p>
      )}
    </div>
  );
};
