
"use client";

import type { FC } from 'react';
import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, type SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { motion } from "framer-motion";
import { ArrowLeft } from 'lucide-react'; // Import ArrowLeft icon

import { CarTypeSelection } from "./steps/CarTypeSelection";
import { CarModelSelection } from "./steps/CarModelSelection";
import { PassengerSelection } from "./steps/PassengerSelection";
import { LocationSelection } from "./steps/LocationSelection";
// Import the updated step components
import { FirstNameInput } from "./steps/FirstNameInput"; // Renamed from FullNameInput
import { PhoneNumberInput } from "./steps/PhoneNumberInput";
import { OrderSummary } from "./steps/OrderSummary";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

// Validation messages in Arabic
const locationDetailSchema = z.object({
    address: z.string().min(1, "العنوان مطلوب"),
    coordinates: z.object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
    }).optional(),
});

const bookingSchema = z.object({
  carType: z.string().min(1, "الرجاء اختيار نوع السيارة"),
  carModel: z.string().min(1,"الرجاء اختيار موديل السيارة"),
  passengers: z.coerce.number().min(1, "راكب واحد على الأقل").max(7, "7 ركاب كحد أقصى"),
  bags: z.coerce.number().min(0, "لا يمكن أن يكون عدد الحقائب سالباً").max(5, "5 حقائب كحد أقصى"),
  pickupLocation: locationDetailSchema,
  dropoffLocation: locationDetailSchema,
  firstName: z.string().min(2, "الرجاء إدخال الاسم الأول"), // Changed from fullName
  phoneNumber: z.string().min(10, "الرجاء إدخال رقم هاتف صحيح").regex(/^\+?[0-9\s\-()]+$/, "الرجاء إدخال رقم هاتف صحيح"),
});


export type BookingFormData = z.infer<typeof bookingSchema>;

// Define field names more robustly for validation triggers
// Update field name from fullName to firstName
type StepFieldName = Exclude<keyof BookingFormData, 'fullName'> | 'firstName' | `${keyof Pick<BookingFormData, 'pickupLocation' | 'dropoffLocation'>}.${keyof BookingFormData['pickupLocation']}`;


// Updated steps array with FirstName and PhoneNumber as separate steps
const steps: { id: string; component: FC<any>; validationFields: StepFieldName[]; autoAdvance?: boolean }[] = [
  { id: 'carType', component: CarTypeSelection, validationFields: ['carType'], autoAdvance: true },
  { id: 'carModel', component: CarModelSelection, validationFields: ['carModel'], autoAdvance: true },
  { id: 'passengers', component: PassengerSelection, validationFields: ['passengers', 'bags'] },
  { id: 'location', component: LocationSelection, validationFields: ['pickupLocation.address', 'pickupLocation.coordinates', 'dropoffLocation.address', 'dropoffLocation.coordinates'] },
  { id: 'firstName', component: FirstNameInput, validationFields: ['firstName'] }, // Updated step for First Name
  { id: 'phoneNumber', component: PhoneNumberInput, validationFields: ['phoneNumber'] }, // New step for Phone Number
  { id: 'summary', component: OrderSummary, validationFields: [] }, // Summary is the last step
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
      pickupLocation: { address: '', coordinates: undefined },
      dropoffLocation: { address: '', coordinates: undefined },
      firstName: '', // Changed from fullName
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

        let errorMessage = "الرجاء تعبئة جميع الحقول المطلوبة بشكل صحيح.";
        if (firstErrorField) {
             const parts = firstErrorField.split('.');
             let errorObj: any = errors;
             for (const part of parts) {
                 if (!errorObj) break;
                 errorObj = errorObj[part];
             }
             // Handle nested error messages correctly
             if (errorObj && errorObj.message) {
                 errorMessage = typeof errorObj.message === 'string' ? errorObj.message : "الرجاء التحقق من الحقول المحددة.";
             } else if (errorObj?.address?.message) { // Check for nested address errors
                 errorMessage = typeof errorObj.address.message === 'string' ? errorObj.address.message : "الرجاء التحقق من حقول الموقع.";
             }
        }

        toast({
            title: "خطأ في التحقق",
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
             title: "نموذج غير مكتمل",
             description: "الرجاء مراجعة النموذج بحثًا عن الأخطاء قبل الإرسال.",
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

       // Format the message for WhatsApp in Arabic
       const message = `
*طلب حجز جديد من Wesso.App:*
-----------------------------
*نوع السيارة:* ${data.carType}
*موديل السيارة:* ${data.carModel}
*عدد الركاب:* ${data.passengers}
*عدد الحقائب:* ${data.bags}
-----------------------------
*مكان الانطلاق:* ${data.pickupLocation.address}${pickupMapLink ? `\n📍 رابط الخريطة: ${pickupMapLink}` : ''}

*وجهة الوصول:* ${data.dropoffLocation.address}${dropoffMapLink ? `\n🏁 رابط الخريطة: ${dropoffMapLink}` : ''}
-----------------------------
*اسم العميل:* ${data.firstName}
*رقم هاتف العميل:* ${data.phoneNumber}
-----------------------------
يرجى تأكيد هذه التفاصيل.
       `.trim().replace(/\n\s+/g, '\n'); // Clean up extra whitespace

       const encodedMessage = encodeURIComponent(message);
       const targetPhoneNumber = "201100434503"; // User's requested number
       const whatsappUrl = `https://wa.me/${targetPhoneNumber}?text=${encodedMessage}`;

       toast({
         title: "الحجز جاهز!",
         description: "جاري إعادة توجيهك إلى واتساب لإرسال طلبك...",
       });

       // Redirect the user to WhatsApp in a new tab/window
       window.open(whatsappUrl, '_blank');

     } catch (error) {
       console.error("Error preparing WhatsApp redirect:", error);
       toast({
         title: "خطأ في الإرسال",
         description: "تعذر تحضير طلب الحجز الخاص بك لواتساب. يرجى المحاولة مرة أخرى.",
         variant: "destructive",
       });
     }
  };

  const CurrentComponent = steps[currentStep].component;
  const shouldAutoAdvance = steps[currentStep].autoAdvance && currentStep < steps.length - 1;
  // Updated progress calculation based on the new number of steps
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="glass-card space-y-8 p-6 sm:p-8"
        aria-live="polite"
        noValidate
      >
         <Progress value={progressPercentage} className="w-full mb-6 h-2 bg-white/20 dark:bg-black/20 [&>div]:bg-primary" dir="ltr" />

          <motion.div
            key={currentStep} // Ensures component remounts on step change for animation
            initial={{ opacity: 0, x: currentStep > 0 ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
             <CurrentComponent
                errors={errors} // Pass errors down to step components
                {...(shouldAutoAdvance && { onNext: handleNext })}
             />
          </motion.div>


        <div className="flex justify-between items-center mt-8 pt-4 border-t border-white/20 dark:border-black/20 relative">
           <Button
             type="button"
             onClick={handlePrevious}
             disabled={currentStep === 0}
             className="glass-button disabled:opacity-50 disabled:cursor-not-allowed absolute left-0"
             aria-label="الخطوة السابقة"
           >
             <ArrowLeft className="h-5 w-5" />
           </Button>

           <div className="flex-grow"></div>

           <div className="flex justify-center flex-grow">
             {currentStep === steps.length - 1 ? (
               <Button
                 type="submit"
                 disabled={isSubmitting}
                 className="glass-button bg-primary/80 hover:bg-primary text-primary-foreground px-6 py-3 text-lg font-semibold shadow-lg hover:shadow-xl active:scale-95"
                 aria-label="تأكيد وإرسال عبر واتساب"
               >
                 {isSubmitting ? "جاري المعالجة..." : "تأكيد وإرسال"}
               </Button>
             ) : (
               !shouldAutoAdvance && (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="glass-button bg-accent/80 hover:bg-accent text-accent-foreground"
                    aria-label="الخطوة التالية"
                  >
                    التالي
                  </Button>
                )
             )}
           </div>

           <div className="flex-grow"></div>

        </div>
      </form>
    </FormProvider>
  );
};

export default BookingForm;
