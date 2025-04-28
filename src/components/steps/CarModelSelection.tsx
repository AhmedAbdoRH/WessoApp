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
  label: string;
  imageUrl: string;
  type: string; // To filter models based on selected car type
}

// Example car models - expand this list based on actual offerings
const allCarModels: CarModelOption[] = [
  // Sedans
  { value: 'toyota-camry', label: 'Toyota Camry', imageUrl: 'https://picsum.photos/seed/camry/300/200', type: 'sedan' },
  { value: 'honda-accord', label: 'Honda Accord', imageUrl: 'https://picsum.photos/seed/accord/300/200', type: 'sedan' },
  { value: 'mercedes-e-class', label: 'Mercedes E-Class', imageUrl: 'https://picsum.photos/seed/eclass/300/200', type: 'sedan' },
  // Limousines
  { value: 'lincoln-stretch', label: 'Lincoln Stretch', imageUrl: 'https://picsum.photos/seed/lincoln/300/200', type: 'limousine' },
  { value: 'cadillac-escalade-limo', label: 'Cadillac Escalade Limo', imageUrl: 'https://picsum.photos/seed/escalade-limo/300/200', type: 'limousine' },
  // Large Cars
  { value: 'chevrolet-suburban', label: 'Chevrolet Suburban', imageUrl: 'https://picsum.photos/seed/suburban/300/200', type: 'large' },
  { value: 'ford-expedition', label: 'Ford Expedition', imageUrl: 'https://picsum.photos/seed/expedition/300/200', type: 'large' },
  // 7-Seaters
  { value: 'toyota-sienna', label: 'Toyota Sienna', imageUrl: 'https://picsum.photos/seed/sienna/300/200', type: '7seater' },
  { value: 'honda-odyssey', label: 'Honda Odyssey', imageUrl: 'https://picsum.photos/seed/odyssey/300/200', type: '7seater' },
  { value: 'chrysler-pacifica', label: 'Chrysler Pacifica', imageUrl: 'https://picsum.photos/seed/pacifica/300/200', type: '7seater' },
];

interface CarModelSelectionProps {
  errors?: any; // Optional errors prop
  onNext?: () => Promise<void> | void; // Optional prop for auto-advancing
}

export const CarModelSelection: FC<CarModelSelectionProps> = ({ errors, onNext }) => {
  const { register, watch, setValue, formState } = useFormContext<BookingFormData>(); // Destructure errors from formState if needed directly here
  const selectedCarType = watch('carType');
  const selectedCarModel = watch('carModel');

  const handleSelect = async (value: string) => {
    setValue('carModel', value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    // If onNext prop is provided, call it to potentially advance the step
    if (onNext) {
      // Add a small delay to allow state update and validation if needed
      await new Promise(resolve => setTimeout(resolve, 50));
      await onNext();
    }
  };

  // Filter models based on the selected car type
  const availableModels = allCarModels.filter(model => model.type === selectedCarType);

  // Handle case where no type is selected yet or no models match
  if (!selectedCarType) {
    return (
      <div className="space-y-4 text-center">
        <Label className="text-xl font-semibold text-foreground">Select Car Model</Label>
        <p className="text-muted-foreground">Please select a car type first to see available models.</p>
      </div>
    );
  }

    if (availableModels.length === 0) {
      // Automatically set a default value if no specific models are available for the type
      const defaultModelValue = `${selectedCarType}-default`;
       React.useEffect(() => {
         setValue('carModel', defaultModelValue, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
         // Auto-advance if possible when a default is set
          const tryAutoAdvance = async () => {
              if (onNext) {
                  await new Promise(resolve => setTimeout(resolve, 50)); // Ensure state update
                  await onNext();
              }
          }
          tryAutoAdvance();

       }, [selectedCarType, setValue, onNext, defaultModelValue]);

      return (
         <div className="space-y-4 text-center">
           <Label className="text-xl font-semibold text-foreground">Car Model</Label>
           <p className="text-muted-foreground">Standard model for {selectedCarType} will be assigned.</p>
            <input type="hidden" {...register('carModel')} value={defaultModelValue} />
            {/* Display the error if the hidden input doesn't satisfy validation */}
             {formState.errors.carModel && ( // Access errors via formState
                <p className="text-sm font-medium text-destructive mt-2">{formState.errors.carModel.message}</p>
            )}
         </div>
       );
    }


  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">Select Car Model</Label>
      <p className="text-sm text-muted-foreground mb-6">Choose a specific model from the selected car type.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableModels.map((model) => (
          <motion.div
             key={model.value}
             whileHover={{ scale: 1.03 }}
             whileTap={{ scale: 0.98 }}
           >
            <Card
              className={cn(
                'glass-card cursor-pointer transition-all duration-200 ease-in-out overflow-hidden',
                selectedCarModel === model.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background/50 dark:ring-offset-black/50' : 'ring-0', // Adjusted ring offset for dark mode
                formState.errors.carModel ? 'border-destructive' : 'border-white/20 dark:border-black/20' // Access errors via formState
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
                 className="sr-only"
                 aria-labelledby={`carModel-label-${model.value}`}
               />
              <CardHeader className="p-0 relative h-32 sm:h-40"> {/* Adjusted height */}
                <Image
                  src={model.imageUrl}
                  alt={model.label}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-t-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-t-lg"></div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4"> {/* Adjusted padding */}
                <CardTitle id={`carModel-label-${model.value}`} className="text-base sm:text-lg font-medium text-center text-foreground truncate">{model.label}</CardTitle>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      {formState.errors.carModel && ( // Access errors via formState
        <p className="text-sm font-medium text-destructive mt-2">{formState.errors.carModel.message}</p>
      )}
    </div>
  );
};
