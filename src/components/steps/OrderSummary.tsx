"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Car, Users, Luggage, MapPin, User, Phone } from 'lucide-react';
import type { BookingFormData } from '../BookingForm';

// Added errors prop, though it's not used in this component currently
export const OrderSummary: FC<{ errors?: any }> = () => {
  const { getValues } = useFormContext<BookingFormData>();
  const formData = getValues();

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

  const summaryItems = [
    { icon: Car, label: "Car Type", value: formData.carType || "Not selected" },
    { icon: Car, label: "Model", value: formData.carModel || "Not selected" }, // Updated to show selected model
    { icon: Users, label: "Passengers", value: formData.passengers },
    { icon: Luggage, label: "Bags", value: formData.bags },
    { icon: MapPin, label: "Pickup", value: formData.pickupLocation?.address || "Not set" },
    { icon: MapPin, label: "Dropoff", value: formData.dropoffLocation?.address || "Not set" },
    { icon: User, label: "Name", value: formData.fullName },
    { icon: Phone, label: "Phone", value: formData.phoneNumber },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground text-center mb-6">Order Summary</h2>
      <p className="text-sm text-muted-foreground text-center mb-8">Please review your booking details before confirming.</p>

      <motion.div
         className="space-y-4 p-4 bg-white/10 dark:bg-black/10 rounded-lg backdrop-blur-sm shadow-inner border border-white/10 dark:border-black/10"
         initial="hidden"
         animate="visible"
         variants={{ visible: { transition: { staggerChildren: 0.1 } } }} // Stagger children animation
       >
         {summaryItems.map((item, index) => (
           <motion.div
             key={item.label}
             className="flex items-start justify-between text-sm py-2 border-b border-white/10 dark:border-black/10 last:border-b-0"
             variants={summaryItemVariants}
             custom={index} // Pass index for staggered delay
           >
             <span className="flex items-center font-medium text-muted-foreground">
               <item.icon className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
               {item.label}:
             </span>
             {/* Ensure value is displayed, handle potential undefined/null */}
             <span className="text-right text-foreground font-semibold ml-2 break-words">{String(item.value ?? 'N/A')}</span>
           </motion.div>
         ))}
      </motion.div>
    </div>
  );
};

    