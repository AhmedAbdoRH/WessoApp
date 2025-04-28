

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

// Refined schema: Ensure coordinates are present if address is, unless explicitly handled otherwise
const locationDetailSchema = z.object({
    address: z.string().min(1, "Address is required"),
    coordinates: z.object({
        latitude: z.number().optional(), // Coordinates might not be available immediately or if geocoding fails
        longitude: z.number().optional(),
    }).optional(),
});

const bookingSchema = z.object({
  carType: z.string().min(1, "Please select a car type"),
  carModel: z.string().min(1,"Please select a car model"),
  passengers: z.coerce.number().min(1, "At least 1 passenger").max(7, "Maximum 7 passengers"),
  bags: z.coerce.number().min(0, "Cannot have negative bags").max(5, "Maximum 5 bags"),
  pickupLocation: locationDetailSchema,
  dropoffLocation: locationDetailSchema,
  fullName: z.string().min(2, "Please enter your full name"),
  phoneNumber: z.string().min(10, "Please enter a valid phone number").regex(/^\+?[0-9\s\-()]+$/, "Please enter a valid phone number"), // Basic phone format regex
});


export type BookingFormData = z.infer<typeof bookingSchema>;

// Define field names more robustly for validation triggers
type StepFieldName = keyof BookingFormData | `${keyof Pick<BookingFormData, 'pickupLocation' | 'dropoffLocation'>}.${keyof BookingFormData['pickupLocation']}`;


const steps: { id: string; component: FC<any>; validationFields: StepFieldName[]; autoAdvance?: boolean }[] = [
  { id: 'carType', component: CarTypeSelection, validationFields: ['carType'], autoAdvance: true },
  { id: 'carModel', component: CarModelSelection, validationFields: ['carModel'], autoAdvance: true },
  { id: 'passengers', component: PassengerSelection, validationFields: ['passengers', 'bags'] },
  // Validate both address and coordinates if available
  { id: 'location', component: LocationSelection, validationFields: ['pickupLocation.address', 'pickupLocation.coordinates', 'dropoffLocation.address', 'dropoffLocation.coordinates'] },
  { id: 'userDetails', component: UserDetails, validationFields: ['fullName', 'phoneNumber'] },
  { id: 'summary', component: OrderSummary, validationFields: [] },
];


const BookingForm: FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  const methods = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: "onChange", // Validate on change
    defaultValues: {
      passengers: 1,
      bags: 1,
      pickupLocation: { address: '', coordinates: undefined }, // Initialize coordinates as undefined
      dropoffLocation: { address: '', coordinates: undefined },
      fullName: '',
      phoneNumber: '',
      carType: '',
      carModel: '',
    },
  });

  const { handleSubmit, trigger, formState: { errors, isSubmitting }, watch } = methods;

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep].validationFields;
    const isValidStep = await trigger(fieldsToValidate.length > 0 ? fieldsToValidate : undefined, { shouldFocus: true });

    if (isValidStep) {
       if (currentStep < steps.length - 1) {
         setCurrentStep(currentStep + 1);
       }
    } else {
       console.log("Step validation failed", errors);
        // Find the first error message for the current step
        const firstErrorField = fieldsToValidate.find(field => {
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
             // Handle nested error messages correctly
             if (errorObj && errorObj.message) {
                 errorMessage = typeof errorObj.message === 'string' ? errorObj.message : "Please check the highlighted fields.";
             } else if (errorObj?.address?.message) { // Check for nested address errors
                 errorMessage = typeof errorObj.address.message === 'string' ? errorObj.address.message : "Please check the location fields.";
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

   // Function to generate Google Maps link from coordinates
   const getGoogleMapsLink = (coords?: { latitude?: number; longitude?: number }): string | null => {
     if (coords?.latitude && coords?.longitude) {
       return `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
     }
     return null;
   };

   // Function to generate Google Maps link from address string (less precise)
    const getGoogleMapsLinkFromAddress = (address?: string): string | null => {
        if (address) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        }
        return null;
    };


  const onSubmit: SubmitHandler<BookingFormData> = async (data) => {
     // Final validation before submitting
     const isValidForm = await trigger();
     if (!isValidForm) {
         console.log("Final validation failed", errors);
         toast({
             title: "Incomplete Form",
             description: "Please review the form for errors before submitting.",
             variant: "destructive",
         });
         // Navigate back to the first step with an error
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
       // Generate links preferentially from coordinates, fall back to address search if coords missing
       const pickupMapLink = getGoogleMapsLink(data.pickupLocation.coordinates) || getGoogleMapsLinkFromAddress(data.pickupLocation.address);
       const dropoffMapLink = getGoogleMapsLink(data.dropoffLocation.coordinates) || getGoogleMapsLinkFromAddress(data.dropoffLocation.address);

       // Format the message for WhatsApp
       const message = `
*New ClearRide Booking Request:*
-----------------------------
*Car Type:* ${data.carType}
*Car Model:* ${data.carModel}
*Passengers:* ${data.passengers}
*Bags:* ${data.bags}
-----------------------------
*Pickup:* ${data.pickupLocation.address}${pickupMapLink ? `\n🗺️ Map: ${pickupMapLink}` : ''}

*Dropoff:* ${data.dropoffLocation.address}${dropoffMapLink ? `\n🗺️ Map: ${dropoffMapLink}` : ''}
-----------------------------
*Client Name:* ${data.fullName}
*Client Phone:* ${data.phoneNumber}
-----------------------------
Please confirm these details.
       `.trim().replace(/\n\s+/g, '\n'); // Clean up extra whitespace

       const encodedMessage = encodeURIComponent(message);
       const targetPhoneNumber = "201100434503"; // User's requested number
       const whatsappUrl = `https://wa.me/${targetPhoneNumber}?text=${encodedMessage}`;

       toast({
         title: "Booking Ready!",
         description: "Redirecting to WhatsApp to send your request...",
       });

       // Redirect the user to WhatsApp in a new tab/window
       window.open(whatsappUrl, '_blank');

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
  const shouldAutoAdvance = steps[currentStep].autoAdvance && currentStep < steps.length - 1;
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  // Watch for changes in auto-advancing fields to trigger next step
  // This is an alternative if passing onNext prop becomes complex
  // React.useEffect(() => {
  //   const currentStepConfig = steps[currentStep];
  //   if (currentStepConfig.autoAdvance) {
  //     const subscription = watch((value, { name, type }) => {
  //       if (currentStepConfig.validationFields.includes(name as StepFieldName) && type === 'change') {
  //         // Debounce or add a small delay to avoid rapid triggers
  //         const timer = setTimeout(() => {
  //           handleNext();
  //         }, 100); // Adjust delay as needed
  //         return () => clearTimeout(timer);
  //       }
  //     });
  //     return () => subscription.unsubscribe();
  //   }
  // }, [currentStep, watch, handleNext]);


  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="glass-card space-y-8 p-6 sm:p-8"
        aria-live="polite"
        noValidate
      >
         <Progress value={progressPercentage} className="w-full mb-6 h-2 bg-white/20 dark:bg-black/20 [&>div]:bg-primary" />

          <motion.div
            key={currentStep} // Ensures component remounts on step change for animation
            initial={{ opacity: 0, x: currentStep > 0 ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }} // Animate exit as well
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
             {/* Pass handleNext only to components that should auto-advance AND error state */}
             <CurrentComponent
                errors={errors} // Pass errors down to step components
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

          {/* Hide Next button for auto-advancing steps and the summary step */}
          {!shouldAutoAdvance && currentStep !== steps.length - 1 && (
             <Button
               type="button"
               onClick={handleNext} // Standard next button triggers validation via handleNext
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
         {/* Debug: Display current form errors */}
         {/* {Object.keys(errors).length > 0 && (
            <pre className="text-xs text-destructive mt-4 p-2 bg-destructive/10 rounded">
                Errors: {JSON.stringify(errors, null, 2)}
            </pre>
         )} */}
      </form>
    </FormProvider>
  );
};

export default BookingForm;
