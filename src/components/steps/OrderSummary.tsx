// src/components/steps/OrderSummary.tsx
"use client";

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Car, Users, Luggage, MapPin, User, Phone, ExternalLink } from 'lucide-react';
import type { BookingFormData } from '../BookingForm';
import { Button } from '@/components/ui/button';
import { getArabicCarTypeName as resolveCarTypeName } from './CarModelSelection'; // Renamed for clarity
import type { CarTypeOptionAdmin, CarModelOptionAdmin } from '@/types/admin';
import { getCarModelsForBooking } from '@/services/adminService'; // To fetch model details if needed

const getGoogleMapsLink = (coords?: { latitude?: number; longitude?: number }): string | null => {
  if (coords?.latitude && coords?.longitude) {
    return `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
  }
  return null;
};

const getGoogleMapsLinkFromAddress = (address?: string): string | null => {
    if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }
    return null;
};

interface OrderSummaryProps {
  errors?: any;
  allCarTypes: Pick<CarTypeOptionAdmin, 'value' | 'label'>[]; // Passed from BookingForm
}

export const OrderSummary: FC<OrderSummaryProps> = ({ allCarTypes }) => {
  const { getValues, watch } = useFormContext<BookingFormData>();
  const formData = getValues();
  const [carModelLabel, setCarModelLabel] = useState(formData.carModel);

  const watchedCarType = watch('carType');
  const watchedCarModel = watch('carModel');

  useEffect(() => {
    if (watchedCarType && watchedCarModel) {
      if (watchedCarModel.endsWith('-default')) {
        const carTypeName = resolveCarTypeName(watchedCarType, allCarTypes);
        setCarModelLabel(`الموديل القياسي (${carTypeName})`);
      } else {
        // Fetch the specific model's label
        getCarModelsForBooking(watchedCarType).then(models => {
          const foundModel = models.find(m => m.value === watchedCarModel);
          setCarModelLabel(foundModel?.label || watchedCarModel);
        }).catch(() => {
          setCarModelLabel(watchedCarModel); // Fallback to ID if fetch fails
        });
      }
    } else {
      setCarModelLabel(watchedCarModel || "لم يتم الاختيار");
    }
  }, [watchedCarType, watchedCarModel, allCarTypes]);


  const pickupLink = getGoogleMapsLink(formData.pickupLocation?.coordinates) || getGoogleMapsLinkFromAddress(formData.pickupLocation?.address);
  const dropoffLink = getGoogleMapsLink(formData.dropoffLocation?.coordinates) || getGoogleMapsLinkFromAddress(formData.dropoffLocation?.address);

  const summaryItemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
        ease: "easeOut"
      }
    })
  };

  const carTypeName = formData.carType ? resolveCarTypeName(formData.carType, allCarTypes) : "لم يتم الاختيار";
  
  const summaryItems = [
    { icon: Car, label: "نوع السيارة", value: carTypeName },
    { icon: Car, label: "الموديل", value: carModelLabel },
    { icon: Users, label: "الركاب", value: formData.passengers },
    { icon: Luggage, label: "الحقائب", value: formData.bags },
    {
      icon: MapPin,
      label: "الانطلاق",
      value: formData.pickupLocation?.address || "لم يتم التحديد",
      link: pickupLink
    },
    {
      icon: MapPin,
      label: "الوصول",
      value: formData.dropoffLocation?.address || "لم يتم التحديد",
      link: dropoffLink
    },
    { icon: User, label: "الاسم", value: formData.firstName },
    { icon: Phone, label: "الهاتف", value: formData.phoneNumber },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground text-center mb-6">ملخص الطلب</h2>
      <p className="text-sm text-muted-foreground text-center mb-8">يرجى مراجعة تفاصيل حجزك قبل التأكيد.</p>

      <motion.div
         className="space-y-4 p-4 bg-white/10 dark:bg-black/10 rounded-lg backdrop-blur-sm shadow-inner border border-white/10 dark:border-black/10"
         initial="hidden"
         animate="visible"
         variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
       >
         {summaryItems.map((item, index) => (
           <motion.div
             key={`${item.label}-${index}`}
             className="flex items-start justify-between text-sm py-2 border-b border-white/10 dark:border-black/10 last:border-b-0 gap-4"
             variants={summaryItemVariants}
             custom={index}
           >
             <span className="flex items-center font-medium text-muted-foreground flex-shrink-0 w-1/3">
               <item.icon className="w-4 h-4 ml-2 text-primary flex-shrink-0" />
               {item.label}:
             </span>
             <div className="text-left flex flex-col items-start flex-grow w-2/3">
                 <span className="text-foreground font-semibold break-words text-wrap">{String(item.value ?? 'غير متوفر')}</span>
                 {item.link && (
                    <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 mt-1 text-xs text-primary hover:text-accent whitespace-nowrap"
                        onClick={(e) => {
                            e.preventDefault();
                            window.open(item.link!, '_blank', 'noopener,noreferrer');
                        }}
                        aria-label={`فتح موقع ${item.label} على خرائط جوجل`}
                    >
                        عرض على الخريطة
                        <ExternalLink className="w-3 h-3 mr-1 flex-shrink-0" />
                    </Button>
                 )}
             </div>
           </motion.div>
         ))}
      </motion.div>
    </div>
  );
};
