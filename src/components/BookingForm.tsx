"use client";

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, type SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { motion } from "framer-motion";
import { Arrow } from "./steps/CarModelSelection";
import { PassengerSelection } from "./steps/PassengerSelection";
import { LocationSelection } from "./steps/LocationSelection";
import { FirstNameInput } from "./steps/FirstNameInput";
import { PhoneNumberInput } from "./steps/PhoneNumberInput";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getCarTypesForBooking, getCarModelsForBooking, checkPhoneNumberExists } from '@/services/adminService';
import type { CarTypeOptionAdmin } from '@/types/admin';

const locationDetailSchema = z.object({
  address: z.string().min(1, "العنوان مطلوب"),
  coordinates: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
});

const bookingSchema = z.object({
  carType: z.string().min(1, "الرجاء اختيار نوع السيارة"),
  carModel: z.string().min(1, "الرجاء اختيار موديل السيارة"),
  passengers: z.coerce.number().min(1, "راكب واحد على الأقل").max(4, "4 ركاب كحد أقصى"),
  bags: z.coerce.number().min(0, "لا يمكن أن يكون عدد الحقائب سالباً").max(3, "3 حقائب كحد أقصى"),
  pickupLocation: locationDetailSchema,
  dropoffLocation: locationDetailSchema,
  firstName: z.string().min(2, "الرجاء إدخال الاسم الأول"),
  phoneNumber: z.string().min(10, "الرجاء إدخال رقم هاتف صحيح").regex(/^\+?[0-9\s\-()]+$/, "الرجاء إدخال رقم هاتف صحيح"),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

type StepFieldName =
  | Exclude<keyof BookingFormData, 'fullName'>
  | 'firstName'
  | `${keyof Pick<BookingFormData, 'pickupLocation' | 'dropoffLocation'>}.${keyof BookingFormData['pickupLocation']}`;

type StepDefinition = {
  id: string;
  component: FC<any>;
  validationFields: StepFieldName[];
  autoAdvance?: boolean;
  props?: Record<string, any>;
};

const stepIcons = [
  "◆", // نوع السيارة - معين ممتلئ
  "◇", // موديل السيارة - معين فارغ
  "■", // عدد الركاب - مربع ممتلئ
  "□", // عدد الحقائب - مربع فارغ
  "●", // الموقع - دائرة ممتلئة
  "○", // الاسم الأول - دائرة فارغة
  "▣", // رقم الهاتف - مربع بحواف مزدوجة
];
const stepLabels = [
  "نوع السيارة",
  "موديل السيارة",
  "عدد الركاب",
  "عدد الحقائب",
  "الموقع",
  "الاسم الأول",
  "رقم الهاتف"
];

const BookingForm: FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [carTypes, setCarTypes] = useState<Omit<CarTypeOptionAdmin, 'order' | 'id' | 'publicId'>[]>([]);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const { toast } = useToast();

  const methods = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: "onChange",
    defaultValues: {
      carType: '',
      carModel: '',
      passengers: undefined as number | undefined,
      bags: undefined as number | undefined,
      pickupLocation: { address: '', coordinates: undefined },
      dropoffLocation: { address: '', coordinates: undefined },
      firstName: '',
      phoneNumber: '',
    },
  });
  const { handleSubmit, trigger, formState: { errors, isSubmitting } } = methods;

  useEffect(() => {
    async function fetchInitialData() {
      try {
        setIsLoadingInitialData(true);
        const fetchedCarTypes = await getCarTypesForBooking();
        setCarTypes(fetchedCarTypes);
      } catch (error) {
        toast({
          title: "خطأ في تحميل البيانات",
          description: "لم نتمكن من تحميل بيانات أنواع السيارات. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingInitialData(false);
      }
    }
    fetchInitialData();
  }, [toast]);

  // الخطوات بدون ملخص الطلب
  const steps: StepDefinition[] = useMemo(() => [
    { id: 'carType', component: CarTypeSelection, validationFields: ['carType'], autoAdvance: true, props: { carTypes: carTypes } },
    { id: 'carModel', component: CarModelSelection, validationFields: ['carModel'], autoAdvance: true, props: { allCarTypes: carTypes } },
    { id: 'passengers', component: PassengerSelection, validationFields: ['passengers'], autoAdvance: true, props: { selectionType: 'passengers' } },
    { id: 'bags', component: PassengerSelection, validationFields: ['bags'], autoAdvance: true, props: { selectionType: 'bags' } },
    { id: 'location', component: LocationSelection, validationFields: ['pickupLocation.address', 'pickupLocation.coordinates', 'dropoffLocation.address', 'dropoffLocation.coordinates'], props: {} },
    { id: 'firstName', component: FirstNameInput, validationFields: ['firstName'], props: { autoFocus: true } },
    { id: 'phoneNumber', component: PhoneNumberInput, validationFields: ['phoneNumber'], props: { autoFocus: true } },
  ], [carTypes]);

  if (isLoadingInitialData) {
    return (
      <div className="glass-card space-y-8 p-6 sm:p-8 flex justify-center items-center min-h-[300px]">
        <p className="text-foreground text-lg">جاري تحميل إعدادات الحجز...</p>
      </div>
    );
  }

  if (steps.length === 0 || !steps[currentStep]) {
    return (
      <div className="glass-card space-y-8 p-6 sm:p-8 flex justify-center items-center min-h-[300px]">
        <p className="text-destructive text-lg">خطأ في تهيئة خطوات الحجز. يرجى المحاولة لاحقاً.</p>
      </div>
    );
  }
  const CurrentComponent = steps[currentStep].component;
  const shouldAutoAdvance = steps[currentStep].autoAdvance && currentStep < steps.length - 1;

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep].validationFields;
    const isValidStep = await trigger(fieldsToValidate.length > 0 ? fieldsToValidate : undefined, { shouldFocus: true });

    if (isValidStep) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } else {
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
        if (errorObj && errorObj.message) {
          errorMessage = typeof errorObj.message === 'string' ? errorObj.message : "الرجاء التحقق من الحقول المحددة.";
        } else if (errorObj?.address?.message) {
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
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const getGoogleMapsLinkFromAddress = (address?: string): string | null => {
    if (address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }
    return null;
  };

  const onSubmit: SubmitHandler<BookingFormData> = async (data) => {
    const isValidForm = await trigger();
    if (!isValidForm) {
      toast({
        title: "نموذج غير مكتمل",
        description: "الرجاء مراجعة النموذج بحثًا عن الأخطاء قبل الإرسال.",
        variant: "destructive",
      });
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

    // بيانات الطلب
    let carTypeLabelValue = data.carType;
    const carTypeFromState = carTypes.find(ct => ct.value === data.carType);
    if (carTypeFromState) carTypeLabelValue = carTypeFromState.label;

    let carModelLabelValue = data.carModel;
    if (data.carType) {
      try {
        const modelsForType = await getCarModelsForBooking(data.carType);
        const foundModel = modelsForType.find(m => m.value === data.carModel);
        if (foundModel) {
          carModelLabelValue = foundModel.label;
        } else if (data.carModel && data.carModel.endsWith('-default')) {
          const carTypeNameForDefault = carTypes.find(ct => ct.value === data.carType)?.label || data.carType;
          carModelLabelValue = `الموديل القياسي (${carTypeNameForDefault})`;
        }
      } catch (e) {}
    }

    try {
      const bookingDocData = {
        ...data,
        carTypeLabel: carTypeLabelValue,
        carModelLabel: carModelLabelValue,
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, "bookings"), bookingDocData);
      toast({
        title: "تم إرسال الطلب بنجاح!",
        description: "تم حفظ طلب الحجز الخاص بك، وسيتم التواصل معك قريباً.",
      });
    } catch (error) {}

    // حفظ جهة الاتصال
    try {
      const numberExists = await checkPhoneNumberExists(data.phoneNumber);
      if (!numberExists) {
        const contactData = {
          firstName: data.firstName,
          phoneNumber: data.phoneNumber,
          createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, "customerContacts"), contactData);
      }
    } catch {}

    const pickupMapLink = getGoogleMapsLinkFromAddress(data.pickupLocation.address);
    const dropoffMapLink = getGoogleMapsLinkFromAddress(data.dropoffLocation.address);

    // الرسالة مع الرموز الهندسية
    const message = `
طلب حجز جديد من Wesso.App
━━━━━━━━━━━━━━━━━━
${stepIcons[0]} نوع الرحلة: ${carTypeLabelValue}
${stepIcons[1]} موديل السيارة: ${carModelLabelValue}
${stepIcons[2]} عدد الركاب: ${data.passengers}
${stepIcons[3]} عدد الحقائب: ${data.bags}
━━━━━━━━━━━━━━━━━━
${stepIcons[4]} مكان الانطلاق: ${data.pickupLocation.address}${pickupMapLink ? `\n(رابط الخريطة: ${pickupMapLink})` : ''}
━━━━━━━━━━━━━━━━━━
${stepIcons[4]} وجهة الوصول: ${data.dropoffLocation.address}${dropoffMapLink ? `\n(رابط الخريطة: ${dropoffMapLink})` : ''}
━━━━━━━━━━━━━━━━━━
${stepIcons[5]} اسم العميل: ${data.firstName}
${stepIcons[6]} رقم هاتف العميل: ${data.phoneNumber}
    `.trim().replace(/^\s+/gm, '');

    const encodedMessage = encodeURIComponent(message);
    const targetPhoneNumber = "201100434503";
    const whatsappUrl = `https://wa.me/${targetPhoneNumber}?text=${encodedMessage}`;
    try {
      window.open(whatsappUrl, '_blank');
      toast({
        title: "جاري فتح واتساب...",
        description: "إذا لم يفتح واتساب تلقائيًا، يرجى التحقق من إعدادات المتصفح.",
      });
    } catch {
      toast({
        title: "خطأ في فتح واتساب",
        description: "لم نتمكن من فتح واتساب تلقائيًا. يرجى المحاولة يدويًا أو التأكد من تثبيت واتساب.",
        variant: "destructive",
      });
    }
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="glass-card space-y-8 p-6 sm:p-8"
        aria-live="polite"
        noValidate
      >
        <Progress
          value={progressPercentage}
          className="w-full mb-6 h-3 bg-transparent dark:bg-transparent [&>div]:bg-primary"
          dir="ltr"
        />

        <div className="flex items-center gap-2 mb-4 text-xl font-bold">
          <span className="text-2xl text-white">{stepIcons[currentStep]}</span>
          <span className="text-white">{stepLabels[currentStep]}</span>
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: currentStep > 0 ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: currentStep > 0 ? -50 : 50 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <CurrentComponent
            errors={errors}
            {... })}
            {...steps[currentStep].props}
            autoFocus={steps[currentStep].props?.autoFocus}
          />
        </motion.div>

        <div className="flex justify-between items-center mt-8 pt-4 border-t border-border/20 relative">
          {currentStep > 0 && (
            <Button
              type="button"
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="glass-button disabled:opacity-50 disabled:cursor-not-allowed absolute left-0 text-accent-foreground dark:text-accent-foreground"
              aria-label="الخطوة السابقة"
            >
             5 w-5" />
            </Button>
          )}

          <div className="flex-grow"></div>
          <div className="flex justify-center flex-grow">
            {currentStep === steps.length - 1 ? (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="glass-button bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 text-lg font-semibold shadow-lg hover:shadow-xl active:scale-95"
                aria-label="تأكيد وإرسال الطلب"
              >
                {isSubmitting ? "جاري الإرسال..." : "تأكيد وإرسال ) (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="glass-button bg-accent hover:bg-accent/90 text-accent-foreground"
                  aria-label="التالي"
                >
                  التالي
                </Button>
              )
            )}
          </div>
          <div className="flex-grow"></div>
          <div className="w-10 h-10"></div>
        </div>
      </form>
    </FormProvider>
  );
};

export default BookingForm;