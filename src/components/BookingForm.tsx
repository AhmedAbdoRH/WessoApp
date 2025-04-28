"use client";

import type { FC } from 'react';
import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, type SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { AnimatePresence, motion } from "framer-motion";

import { CarTypeSelection } from "./steps/CarTypeSelection";
import { CarModelSelection } from "./steps/CarModelSelection";
import { PassengerSelection } from "./steps/PassengerSelection";
import { LocationSelection } from "./steps/LocationSelection";
import { UserDetails } from "./steps/UserDetails";
import { OrderSummary } from "./steps/OrderSummary";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { Location } from '@/services/location';
import { sendMessageToWhatsapp } from '@/services/whatsapp'; // Import the service

const bookingSchema = z.object({
  carType: z.string().min(1, "Please select a car type"),
  carModel: z.string().optional(), // Optional for now, make required later if needed
  passengers: z.coerce.number().min(1, "At least 1 passenger").max(7, "Maximum 7 passengers"),
  bags: z.coerce.number().min(0, "Cannot have negative bags").max(5, "Maximum 5 bags"), // Allow 0 bags
  pickupLocation: z.object({
    address: z.string().min(1, "Please select a pickup location"),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }).optional(),
  }).optional(),
  dropoffLocation: z.object({
    address: z.string().min(1, "Please select a dropoff location"),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }).optional(),
  }).optional(),
  fullName: z.string().min(2, "Please enter your full name"),
  phoneNumber: z.string().min(10, "Please enter a valid phone number"),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

const steps = [
  { id: 'carType', component: CarTypeSelection, validationFields: ['carType'] },
  { id: 'carModel', component: CarModelSelection, validationFields: ['carModel'] },
  { id: 'passengers', component: PassengerSelection, validationFields: ['passengers', 'bags'] },
  { id: 'location', component: LocationSelection, validationFields: ['pickupLocation', 'dropoffLocation'] },
  { id: 'userDetails', component: UserDetails, validationFields: ['fullName', 'phoneNumber'] },
  { id: 'summary', component: OrderSummary, validationFields: [] }, // No validation needed for summary
];

const BookingForm: FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  const methods = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: "onChange", // Validate on change for better UX
    defaultValues: {
      passengers: 1,
      bags: 1,
      // Initialize locations properly if needed
      pickupLocation: { address: '', coordinates: undefined },
      dropoffLocation: { address: '', coordinates: undefined },
    },
  });

  const { handleSubmit, trigger, formState: { errors, isValid, isSubmitting } } = methods;

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep].validationFields as (keyof BookingFormData)[];
    const isValidStep = await trigger(fieldsToValidate);

    if (isValidStep) {
       if (currentStep < steps.length - 1) {
         setCurrentStep(currentStep + 1);
       }
    } else {
       // Optionally show a toast or highlight errors
       console.log("Step validation failed", errors);
        toast({
            title: "Validation Error",
            description: "Please fill in all required fields correctly.",
            variant: "destructive",
        });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit: SubmitHandler<BookingFormData> = async (data) => {
    console.log("Booking Submitted:", data);
     try {
       const message = `
         New ClearRide Booking:
         Car Type: ${data.carType}
         Model: ${data.carModel || 'Not specified'}
         Passengers: ${data.passengers}
         Bags: ${data.bags}
         From: ${data.pickupLocation?.address || 'Not specified'}
         To: ${data.dropoffLocation?.address || 'Not specified'}
         Name: ${data.fullName}
         Phone: ${data.phoneNumber}
       `;
       // Replace with the actual target WhatsApp number
       const targetPhoneNumber = "+1234567890"; // IMPORTANT: Use a real number with country code
       await sendMessageToWhatsapp(targetPhoneNumber, message);
       toast({
         title: "Booking Successful!",
         description: "Your ride request has been sent.",
       });
       // Optionally reset form or redirect
       // methods.reset();
       // setCurrentStep(0);
     } catch (error) {
       console.error("Error sending WhatsApp message:", error);
       toast({
         title: "Submission Error",
         description: "Could not send your booking request. Please try again.",
         variant: "destructive",
       });
     }
  };

  const CurrentComponent = steps[currentStep].component;
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="glass-card space-y-8 p-6 sm:p-8"
        aria-live="polite" // Improve accessibility for screen readers
      >
         <Progress value={progressPercentage} className="w-full mb-6 h-2 bg-white/20 [&>div]:bg-primary" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <CurrentComponent />
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8 pt-4 border-t border-white/20">
          <Button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="glass-button disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous Step"
          >
            Previous
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="glass-button bg-primary/80 hover:bg-primary text-primary-foreground px-6 py-3 text-lg font-semibold shadow-lg hover:shadow-xl active:scale-95"
              aria-label="Complete Booking"
            >
              {isSubmitting ? "Sending..." : "Complete Booking"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
               // Disable next if current step fields are invalid, more proactive validation
              // disabled={!isValid && steps[currentStep].validationFields.some(field => errors[field as keyof BookingFormData])}
              className="glass-button bg-accent/80 hover:bg-accent text-accent-foreground"
              aria-label="Next Step"
            >
              Next
            </Button>
          )}
        </div>
          {/* Display general form errors if any */}
         {/* {Object.keys(errors).length > 0 && currentStep === steps.length - 1 && ( // Only show general errors on the last step before submission
           <p className="text-red-500 text-sm mt-4 text-center">Please review the form for errors.</p>
         )} */}
      </form>
    </FormProvider>
  );
};

export default BookingForm;
