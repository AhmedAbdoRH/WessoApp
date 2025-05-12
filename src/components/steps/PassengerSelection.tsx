
"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { User, Users, Briefcase, Luggage, Package } from 'lucide-react'; 
import { cn } from '@/lib/utils';
import type { BookingFormData } from '../BookingForm';
import { motion } from 'framer-motion';


const passengerOptions = [1, 2, 3, 4];
const bagOptions = [0, 1, 2, 3];

const getPassengerLabel = (num: number): string => {
  if (num === 1) return 'راكب واحد';
  if (num === 2) return 'راكبان';
  if (num >= 3 && num <= 10) return `${num} ركاب`; 
  return `${num} راكب`; 
};

const getBagLabel = (num: number): string => {
  if (num === 0) return 'بدون حقائب';
  if (num === 1) return 'حقيبة واحدة';
  if (num === 2) return 'حقيبتان';
  if (num >= 3 && num <= 10) return `${num} حقائب`; 
  return `${num} حقيبة`; 
};

const PassengerIcon: FC<{ count: number }> = ({ count }) => {
  if (count === 1) return <User className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />;
  return <Users className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />;
};

const BagIcon: FC<{ count: number }> = ({ count }) => {
  if (count === 0) return <Package className="w-8 h-8 sm:w-10 sm:h-10 text-primary" data-ai-hint="no package" />;
  if (count === 1) return <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-primary" data-ai-hint="single briefcase" />;
  return <Luggage className="w-8 h-8 sm:w-10 sm:h-10 text-primary" data-ai-hint="multiple luggage" />;
};

interface PassengerSelectionProps {
  errors: any; // This will be formState.errors from BookingForm
  onNext?: () => Promise<void> | void; // For auto-advancing
  selectionType: 'passengers' | 'bags'; // To determine which section to render
}

export const PassengerSelection: FC<PassengerSelectionProps> = ({ errors, onNext, selectionType }) => {
  const { setValue, watch } = useFormContext<BookingFormData>();
  const selectedPassengers = watch('passengers');
  const selectedBags = watch('bags');

  const handlePassengerSelect = async (num: number) => {
    setValue('passengers', num, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    if (onNext && selectionType === 'passengers') {
      await new Promise(resolve => setTimeout(resolve, 50)); // Ensure RHF processes update
      await onNext(); // Calls BookingForm.handleNext which validates and advances
    }
  };

  const handleBagSelect = async (num: number) => {
    setValue('bags', num, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    if (onNext && selectionType === 'bags') {
      await new Promise(resolve => setTimeout(resolve, 50)); // Ensure RHF processes update
      await onNext(); // Calls BookingForm.handleNext which validates and advances
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <div className="space-y-8">
      {selectionType === 'passengers' && (
        <div>
          <Label className="text-xl font-semibold text-foreground block mb-4">عدد الركاب</Label>
          <p className="text-sm text-muted-foreground mb-6">كم عدد الأشخاص المسافرين؟</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {passengerOptions.map((num) => (
              <motion.div
                key={`passenger-${num}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.2, delay: num * 0.05 }}
                whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.95 }}
              >
                <Card
                  className={cn(
                    'glass-card cursor-pointer transition-all duration-200 ease-in-out aspect-square flex flex-col items-center justify-center text-center p-2 sm:p-3',
                    selectedPassengers === num ? 'ring-2 ring-primary ring-offset-2 ring-offset-background/50 dark:ring-offset-black/50 shadow-lg' : 'ring-0 shadow-md hover:shadow-lg',
                    errors?.passengers ? 'border-destructive' : 'border-white/20 dark:border-black/20'
                  )}
                  onClick={() => handlePassengerSelect(num)}
                  role="radio"
                  aria-checked={selectedPassengers === num}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handlePassengerSelect(num)}
                >
                  <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                    <PassengerIcon count={num} />
                    <span className="text-sm sm:text-base font-medium text-foreground">{getPassengerLabel(num)}</span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          {errors?.passengers && (
            <p className="text-sm font-medium text-destructive mt-2">{errors.passengers.message}</p>
          )}
        </div>
      )}

      {selectionType === 'bags' && (
        <div>
          <Label className="text-xl font-semibold text-foreground block mb-4">عدد الحقائب</Label>
          <p className="text-sm text-muted-foreground mb-6">تقدير كمية الأمتعة.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {bagOptions.map((num) => (
              <motion.div
                key={`bag-${num}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.2, delay: num * 0.05 }}
                whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.95 }}
              >
                <Card
                  className={cn(
                    'glass-card cursor-pointer transition-all duration-200 ease-in-out aspect-square flex flex-col items-center justify-center text-center p-2 sm:p-3',
                    selectedBags === num ? 'ring-2 ring-primary ring-offset-2 ring-offset-background/50 dark:ring-offset-black/50 shadow-lg' : 'ring-0 shadow-md hover:shadow-lg',
                    errors?.bags ? 'border-destructive' : 'border-white/20 dark:border-black/20'
                  )}
                  onClick={() => handleBagSelect(num)}
                  role="radio"
                  aria-checked={selectedBags === num}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleBagSelect(num)}
                >
                  <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                    <BagIcon count={num} />
                    <span className="text-sm sm:text-base font-medium text-foreground">{getBagLabel(num)}</span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          {errors?.bags && (
            <p className="text-sm font-medium text-destructive mt-2">{errors.bags.message}</p>
          )}
        </div>
      )}
    </div>
  );
};
