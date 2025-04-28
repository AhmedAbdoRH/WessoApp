"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Car, Users, Luggage, MapPin, User, Phone, ExternalLink } from 'lucide-react';
import type { BookingFormData } from '../BookingForm';
import { Button } from '@/components/ui/button';
import { getArabicCarTypeName } from './CarModelSelection'; // Import helper for type name

// Helper function to generate Google Maps link from coordinates
const getGoogleMapsLink = (coords?: { latitude?: number; longitude?: number }): string | null => {
  if (coords?.latitude && coords?.longitude) {
    return `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
  }
  return null;
};

// Helper function to generate Google Maps search link from address
const getGoogleMapsLinkFromAddress = (address?: string): string | null => {
    if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }
    return null;
};

// Helper for car model label (handles the default case)
const getCarModelLabel = (type: string, model: string): string => {
    if (model.endsWith('-default')) {
        return `الموديل القياسي (${getArabicCarTypeName(type)})`;
    }
    // Find the model label from the (hypothetical) imported list or map
    // For now, just return the model value if not default
    // You might need to pass the allCarModels list or a similar structure here
    return model || "لم يتم الاختيار";
}


export const OrderSummary: FC<{ errors?: any }> = () => {
  const { getValues } = useFormContext<BookingFormData>();
  const formData = getValues();

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

  // Arabic labels
  const summaryItems = [
    { icon: Car, label: "نوع السيارة", value: getArabicCarTypeName(formData.carType) || "لم يتم الاختيار" },
    { icon: Car, label: "الموديل", value: getCarModelLabel(formData.carType, formData.carModel) },
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
    { icon: User, label: "الاسم", value: formData.fullName },
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
             {/* Adjust margin for RTL: ml-2 */}
             <span className="flex items-center font-medium text-muted-foreground flex-shrink-0 w-1/3">
               <item.icon className="w-4 h-4 ml-2 text-primary flex-shrink-0" />
               {item.label}:
             </span>
             <div className="text-left flex flex-col items-start flex-grow w-2/3"> {/* Changed text alignment to left for Arabic */}
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
                        {/* Adjust margin for RTL: mr-1 */}
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
