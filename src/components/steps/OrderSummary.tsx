

"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Car, Users, Luggage, MapPin, User, Phone, ExternalLink } from 'lucide-react';
import type { BookingFormData } from '../BookingForm';
import { Button } from '@/components/ui/button'; // Import Button for link

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


// Added errors prop, though it's not used in this component currently
export const OrderSummary: FC<{ errors?: any }> = () => {
  const { getValues } = useFormContext<BookingFormData>();
  const formData = getValues();

  // Prefer coordinate link, fall back to address search link
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

  // Structure items for better rendering logic
  const summaryItems = [
    { icon: Car, label: "Car Type", value: formData.carType || "Not selected" },
    { icon: Car, label: "Model", value: formData.carModel || "Not selected" },
    { icon: Users, label: "Passengers", value: formData.passengers },
    { icon: Luggage, label: "Bags", value: formData.bags },
    {
      icon: MapPin,
      label: "Pickup",
      value: formData.pickupLocation?.address || "Not set",
      link: pickupLink
    },
    {
      icon: MapPin,
      label: "Dropoff",
      value: formData.dropoffLocation?.address || "Not set",
      link: dropoffLink
    },
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
             key={`${item.label}-${index}`} // Use index in key for potentially duplicate labels like MapPin
             className="flex items-start justify-between text-sm py-2 border-b border-white/10 dark:border-black/10 last:border-b-0 gap-4" // Increased gap
             variants={summaryItemVariants}
             custom={index} // Pass index for staggered delay
           >
             <span className="flex items-center font-medium text-muted-foreground flex-shrink-0 w-1/3"> {/* Assign width to label column */}
               <item.icon className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
               {item.label}:
             </span>
             <div className="text-right flex flex-col items-end flex-grow w-2/3"> {/* Assign width to value column */}
                 <span className="text-foreground font-semibold break-words text-wrap">{String(item.value ?? 'N/A')}</span>
                 {item.link && (
                    <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 mt-1 text-xs text-primary hover:text-accent whitespace-nowrap" // Prevent wrap on button
                        onClick={(e) => {
                            e.preventDefault(); // Prevent potential form interaction
                            window.open(item.link!, '_blank', 'noopener,noreferrer'); // Securely open link
                        }}
                        aria-label={`Open ${item.label} location on Google Maps`}
                    >
                        View on Map
                        <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                    </Button>
                 )}
             </div>
           </motion.div>
         ))}
      </motion.div>
    </div>
  );
};
