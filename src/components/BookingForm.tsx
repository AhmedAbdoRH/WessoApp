
"use client";

import type { FC } from 'react';
import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, type SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { motion } from "framer-motion";

import { CarTypeSelection } from "./steps/CarTypeSelection";
import { CarModelSelection } from "./steps/CarModelSelection";
import { PassengerSelection } from "./steps/PassengerSelection";
import { LocationSelection } from "./steps/LocationSelection";
import { UserDetails } from "./steps/UserDetails";
import { OrderSummary } from "./steps/OrderSummary";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
// import { sendMessageToWhatsapp } from '@/services/whatsapp'; // No longer needed for client-side redirect

const bookingSchema = z.object({
  carType: z.string().min(1, "Please select a car type"),
  carModel: z.string().min(1,"Please select a car model"), // Made required
  passengers: z.coerce.number().min(1, "At least 1 passenger").max(7, "Maximum 7 passengers"),
  bags: z.coerce.number().min(0, "Cannot have negative bags").max(5, "Maximum 5 bags"), // Allow 0 bags
  pickupLocation: z.object({
    address: z.string().min(1, "Please provide a pickup address"),
    coordinates: z.object({
      latitude: z.number().optional(), // Coordinates are optional but preferred
      longitude: z.number().optional(),
    }).optional(),
  }).refine(val => val?.address, { message: "Pickup location address is required" }), // Ensure address is provided
  dropoffLocation: z.object({
    address: z.string().min(1, "Please provide a dropoff address"),
    coordinates: z.object({
      latitude: z.number().optional(), // Coordinates are optional but preferred
      longitude: z.number().optional(),
    }).optional(),
   }).refine(val => val?.address, { message: "Dropoff location address is required" }), // Ensure address is provided
  fullName: z.string().min(2, "Please enter your full name"),
  phoneNumber: z.string().min(10, "Please enter a valid phone number"),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

const steps = [
  { id: 'carType', component: CarTypeSelection, validationFields: ['carType'], autoAdvance: true }, // Auto advance on selection
  { id: 'carModel', component: CarModelSelection, validationFields: ['carModel'], autoAdvance: true }, // Auto advance on selection
  { id: 'passengers', component: PassengerSelection, validationFields: ['passengers', 'bags'] },
  { id: 'location', component: LocationSelection, validationFields: ['pickupLocation.address', 'dropoffLocation.address', 'pickupLocation.coordinates', 'dropoffLocation.coordinates'] }, // Validate address and potentially coordinates
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
      pickupLocation: { address: '', coordinates: { latitude: undefined, longitude: undefined } },
      dropoffLocation: { address: '', coordinates: { latitude: undefined, longitude: undefined } },
      fullName: '',
      phoneNumber: '',
      carType: '',
      carModel: '',
    },
  });

  const { handleSubmit, trigger, formState: { errors, isSubmitting } } = methods;

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep].validationFields as (keyof BookingFormData | `pickupLocation.${keyof BookingFormData['pickupLocation']}` | `dropoffLocation.${keyof BookingFormData['dropoffLocation']}`)[];
    // Trigger validation only for the fields relevant to the current step
    const isValidStep = await trigger(fieldsToValidate.length > 0 ? fieldsToValidate : undefined, { shouldFocus: true });


    if (isValidStep) {
       if (currentStep < steps.length - 1) {
         setCurrentStep(currentStep + 1);
       }
    } else {
       console.log("Step validation failed", errors);
        // Find the first error message for the current step
        const firstErrorField = fieldsToValidate.find(field => {
            // Handle nested fields like pickupLocation.address
            const parts = field.split('.');
            let errorObj: any = errors;
            for (const part of parts) {
                if (!errorObj) return false;
                errorObj = errorObj[part];
            }
            return !!errorObj;
        });

        let errorMessage = "Please fill in all required fields correctly.";
        if (firstErrorField) {
             const parts = firstErrorField.split('.');
             let errorObj: any = errors;
             for (const part of parts) {
                 if (!errorObj) break;
                 errorObj = errorObj[part];
             }
             if (errorObj && errorObj.message) {
                 errorMessage = typeof errorObj.message === 'string' ? errorObj.message : "Please check the highlighted fields.";
             }
        }

        toast({
            title: "Validation Error",
            description: errorMessage,
            variant: "destructive",
        });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

   // Function to generate Google Maps link
   const getGoogleMapsLink = (coords?: { latitude?: number; longitude?: number }): string | null => {
     if (coords && coords.latitude && coords.longitude) {
       return `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
     }
     return null;
   };

  const onSubmit: SubmitHandler<BookingFormData> = async (data) => {
     // Final validation before submitting
     const isValidForm = await trigger(); // Validate all fields
     if (!isValidForm) {
         toast({
             title: "Incomplete Form",
             description: "Please review the form for errors before submitting.",
             variant: "destructive",
         });
         // Optionally navigate back to the first step with an error
          const firstErrorStep = steps.findIndex(step => step.validationFields.some(field => {
                const parts = field.split('.');
                let errorObj: any = errors;
                for (const part of parts) {
                    if (!errorObj) return false;
                    errorObj = errorObj[part];
                }
                return !!errorObj;
            }));
          if (firstErrorStep !== -1 && firstErrorStep < currentStep) {
              setCurrentStep(firstErrorStep);
          }
         return;
     }

     console.log("Booking Submitted:", data);
     try {
        const pickupLink = getGoogleMapsLink(data.pickupLocation.coordinates);
        const dropoffLink = getGoogleMapsLink(data.dropoffLocation.coordinates);

       // Format the message for WhatsApp
       const message = `
         New ClearRide Booking Request:
         -----------------------------
         Car Type: ${data.carType}
         Car Model: ${data.carModel}
         Passengers: ${data.passengers}
         Bags: ${data.bags}
         -----------------------------
         Pickup Location: ${data.pickupLocation.address}
         ${pickupLink ? `Map: ${pickupLink}` : '(Coordinates not available)'}

         Dropoff Location: ${data.dropoffLocation.address}
          ${dropoffLink ? `Map: ${dropoffLink}` : '(Coordinates not available)'}
         -----------------------------
         Client Name: ${data.fullName}
         Client Phone: ${data.phoneNumber}
         -----------------------------
         Please confirm these details or let us know if you need any changes.
       `.trim().replace(/\n\s+/g, '\n'); // Clean up extra whitespace

       const encodedMessage = encodeURIComponent(message);
       // IMPORTANT: Use the target phone number provided by the user
       const targetPhoneNumber = "201100434503"; // User's requested number
       const whatsappUrl = `https://wa.me/${targetPhoneNumber}?text=${encodedMessage}`;

       toast({
         title: "Booking Ready!",
         description: "Redirecting to WhatsApp to send your booking request...",
       });

       // Redirect the user to WhatsApp
       window.location.href = whatsappUrl;

       // Optionally reset form after a delay or based on some condition
       // setTimeout(() => {
       //   methods.reset();
       //   setCurrentStep(0);
       // }, 3000); // Reset after 3 seconds

     } catch (error) {
       console.error("Error preparing WhatsApp redirect:", error);
       toast({
         title: "Submission Error",
         description: "Could not prepare your booking request for WhatsApp. Please try again.",
         variant: "destructive",
       });
     }
  };

  const CurrentComponent = steps[currentStep].component;
  const shouldAutoAdvance = steps[currentStep].autoAdvance && currentStep < steps.length - 1; // Prevent auto-advance from summary
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="glass-card space-y-8 p-6 sm:p-8"
        aria-live="polite" // Improve accessibility for screen readers
        noValidate // Disable native browser validation
      >
         <Progress value={progressPercentage} className="w-full mb-6 h-2 bg-white/20 dark:bg-black/20 [&>div]:bg-primary" />

          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: currentStep > 0 ? 50 : -50 }} // Animate from right if moving forward, left if backward
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }} // Always exit to left
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
             {/* Pass handleNext only to components that should auto-advance */}
            <CurrentComponent
              errors={errors}
              {...(shouldAutoAdvance && { onNext: handleNext })}
             />
          </motion.div>


        <div className="flex justify-between mt-8 pt-4 border-t border-white/20 dark:border-black/20">
          <Button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="glass-button disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous Step"
          >
            Previous
          </Button>

          {/* Hide Next button for auto-advancing steps AND the summary step */}
          {!shouldAutoAdvance && currentStep !== steps.length - 1 && (
             <Button
               type="button"
               onClick={handleNext}
               className="glass-button bg-accent/80 hover:bg-accent text-accent-foreground"
               aria-label="Next Step"
             >
               Next
             </Button>
           )}

          {currentStep === steps.length - 1 && (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="glass-button bg-primary/80 hover:bg-primary text-primary-foreground px-6 py-3 text-lg font-semibold shadow-lg hover:shadow-xl active:scale-95"
              aria-label="Confirm and Send via WhatsApp"
            >
              {isSubmitting ? "Processing..." : "Confirm & Send via WhatsApp"}
            </Button>
          )}
        </div>
         {/* Optional: Display all current errors for debugging */}
         {/* <pre className="text-xs text-destructive">{JSON.stringify(errors, null, 2)}</pre> */}
      </form>
    </FormProvider>
  );
};

export default BookingForm;
