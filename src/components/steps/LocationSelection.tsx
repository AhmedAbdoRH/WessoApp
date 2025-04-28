"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, LocateFixed } from 'lucide-react';
import type { BookingFormData } from '../BookingForm';
import { cn } from '@/lib/utils';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useToast } from '@/hooks/use-toast';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// --- Autocomplete Component ---
function LocationAutocomplete({ fieldName, errors, onPlaceSelect, label }: {
  fieldName: `pickupLocation.address` | `dropoffLocation.address`;
  errors: any;
  onPlaceSelect: (type: 'pickup' | 'dropoff', place: google.maps.places.PlaceResult | null, addressString: string) => void;
  label: string; // Label in Arabic
}) {
  const { control, setValue } = useFormContext<BookingFormData>();
  const places = useMapsLibrary('places');
  const [autocomplete, setAutocomplete] = React.useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const placeChangedListener = React.useRef<google.maps.MapsEventListener | null>(null);

  React.useEffect(() => {
    if (!places || !inputRef.current) return;

    if (!autocomplete) {
        const ac = new places.Autocomplete(inputRef.current, {
          fields: ["geometry", "formatted_address", "name"],
          // Restrict search to Egypt
          componentRestrictions: { country: 'EG' },
          // Bias results towards Arabic if possible (might not always work)
          // language: 'ar' // Note: This might affect suggestion quality
        });
        setAutocomplete(ac);

        if (placeChangedListener.current) {
          placeChangedListener.current.remove();
        }

        placeChangedListener.current = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const type = fieldName.startsWith('pickup') ? 'pickup' : 'dropoff';
          if (place.geometry && place.formatted_address) {
            setValue(fieldName, place.formatted_address, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            onPlaceSelect(type, place, place.formatted_address);
          } else {
             console.warn("Place selected without geometry or formatted address:", place);
             const enteredAddress = inputRef.current?.value || '';
             setValue(fieldName, enteredAddress, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
             onPlaceSelect(type, null, enteredAddress);
          }
        });
    }

    return () => {
        if (placeChangedListener.current) {
            placeChangedListener.current.remove();
        }
        if (autocomplete) {
              if(typeof autocomplete.unbindAll === 'function') {
                 autocomplete.unbindAll();
             }
             if (placeChangedListener.current) {
                placeChangedListener.current.remove();
                placeChangedListener.current = null;
             }
        }
    };
  }, [places, autocomplete, fieldName, onPlaceSelect, setValue]);


  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      setTimeout(() => {
          const addressString = event.target.value;
          const placeSelected = autocomplete?.getPlace()?.geometry;

          if (!placeSelected && addressString) {
              const type = fieldName.startsWith('pickup') ? 'pickup' : 'dropoff';
              console.log("Blur event without selection, address:", addressString);
              setValue(fieldName, addressString, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
              onPlaceSelect(type, null, addressString);
          }
      }, 100);
  };

  const errorPath = fieldName.split('.');
  const hasError = errors?.[errorPath[0]]?.[errorPath[1]];

  return (
     <Controller
         name={fieldName}
         control={control}
         render={({ field }) => (
           <Input
             ref={inputRef}
             id={fieldName}
             value={field.value || ''}
             onChange={(e) => field.onChange(e)}
             placeholder={`أدخل عنوان ${label}`}
             // Adjust padding for RTL: pr-10 instead of pl-10
             className={cn("glass-input pr-10", hasError ? "border-destructive" : "")}
             aria-invalid={hasError ? "true" : "false"}
             onBlur={(e) => {
                 field.onBlur();
                 handleBlur(e);
             }}
           />
         )}
       />
  );
}
// --- End Autocomplete Component ---


export const LocationSelection: FC<{ errors: any }> = ({ errors }) => {
  const { control, setValue, trigger } = useFormContext<BookingFormData>();
  const { toast } = useToast();
  const geocoding = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = React.useState<google.maps.Geocoder | null>(null);

  React.useEffect(() => {
      if (!geocoding) return;
      setGeocoder(new geocoding.Geocoder());
  }, [geocoding]);

   const handleLocationSelect = (type: 'pickup' | 'dropoff', place: google.maps.places.PlaceResult | null, addressString: string) => {
     console.log(`Handling selection for ${type}:`, place ? place.formatted_address : addressString);

     let coordinates: { latitude?: number; longitude?: number } | undefined = undefined;
     let finalAddress = addressString;

     const fieldNamePrefix = type === 'pickup' ? 'pickupLocation' : 'dropoffLocation';

     if (place?.geometry?.location) {
         coordinates = {
           latitude: place.geometry.location.lat(),
           longitude: place.geometry.location.lng(),
         };
         finalAddress = place.formatted_address || addressString;
         console.log(`Coordinates from Place:`, coordinates);

          setValue(`${fieldNamePrefix}.address`, finalAddress, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
         setValue(`${fieldNamePrefix}.coordinates`, coordinates, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
         trigger(`${fieldNamePrefix}.address`);
         trigger(`${fieldNamePrefix}.coordinates`);

     } else if (finalAddress.trim() !== '' && geocoder) {
        console.log(`Geocoding address string: "${finalAddress}"`);
        geocoder.geocode({ address: finalAddress, region: 'EG' }, (results, status) => { // Add region bias
           if (status === 'OK' && results && results[0]?.geometry?.location) {
             const location = results[0].geometry.location;
             coordinates = { latitude: location.lat(), longitude: location.lng() };
             finalAddress = results[0].formatted_address || finalAddress;
             console.log(`Geocoding successful for "${addressString}":`, coordinates, finalAddress);
             setValue(`${fieldNamePrefix}.address`, finalAddress, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
             setValue(`${fieldNamePrefix}.coordinates`, coordinates, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
           } else {
             console.warn(`Geocoding failed for "${addressString}": ${status}`);
             toast({ title: "خطأ في الموقع", description: `لم نتمكن من العثور على إحداثيات لـ "${finalAddress}". يرجى محاولة عنوان أكثر تحديدًا.`, variant: "destructive" });
             setValue(`${fieldNamePrefix}.coordinates`, undefined, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
           }
           trigger(`${fieldNamePrefix}.address`);
           trigger(`${fieldNamePrefix}.coordinates`);
        });
     } else if (finalAddress.trim() === '') {
         setValue(`${fieldNamePrefix}.coordinates`, undefined, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          trigger(`${fieldNamePrefix}.address`);
          trigger(`${fieldNamePrefix}.coordinates`);
     } else if (!geocoder) {
         console.warn("Geocoder not ready yet.");
         toast({ title: "خطأ في الخريطة", description: "خدمة الترميز الجغرافي ليست جاهزة بعد. يرجى الانتظار لحظة.", variant: "destructive" });
         setValue(`${fieldNamePrefix}.coordinates`, undefined, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          trigger(`${fieldNamePrefix}.address`);
          trigger(`${fieldNamePrefix}.coordinates`);
     }
   };

   const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "خطأ في تحديد الموقع الجغرافي", description: "تحديد الموقع الجغرافي غير مدعوم من قبل متصفحك.", variant: "destructive" });
      return;
    }
    if (!geocoder) {
        toast({ title: "خطأ في الخريطة", description: "خدمة الترميز الجغرافي ليست جاهزة بعد. يرجى الانتظار لحظة.", variant: "destructive" });
        return;
    }

    toast({ title: "جارٍ جلب الموقع", description: "الحصول على موقعك الحالي..." });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        console.log("Current coordinates:", coords);

        geocoder.geocode({ location: { lat: coords.latitude, lng: coords.longitude } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const address = results[0].formatted_address;
            console.log("Reverse geocoded address:", address);
            setValue('pickupLocation.address', address, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            setValue('pickupLocation.coordinates', coords, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            toast({ title: "تم تحديد الموقع", description: `تم تحديد موقع الانطلاق: ${address}` });
             trigger('pickupLocation.address');
             trigger('pickupLocation.coordinates');
          } else {
            console.warn("Reverse geocoding failed:", status);
            setValue('pickupLocation.coordinates', coords, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            setValue('pickupLocation.address', `خط العرض: ${coords.latitude.toFixed(4)}, خط الطول: ${coords.longitude.toFixed(4)}`, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            toast({ title: "خطأ في العنوان", description: "لم نتمكن من العثور على عنوان لموقعك الحالي. تم تعيين الإحداثيات.", variant: "destructive" });
             trigger('pickupLocation.address');
             trigger('pickupLocation.coordinates');
          }
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        let message = "حدث خطأ غير معروف.";
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = "تم رفض إذن تحديد الموقع. يرجى تمكين الوصول إلى الموقع في إعدادات المتصفح.";
                break;
            case error.POSITION_UNAVAILABLE:
                message = "معلومات الموقع غير متوفرة.";
                break;
            case error.TIMEOUT:
                message = "انتهت مهلة طلب الحصول على موقع المستخدم.";
                break;
        }
        toast({ title: "خطأ في تحديد الموقع الجغرافي", description: message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">تحديد المسار</Label>
       <p className="text-sm text-muted-foreground mb-6">أدخل نقاط الانطلاق والوجهة.</p>

       {GOOGLE_MAPS_API_KEY ? (
         <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'geocoding']} language="ar">
           <div className="space-y-4">
             <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="pickupLocation.address" className="text-sm font-medium text-foreground flex items-center">
                     {/* Adjust margin for RTL: ml-2 */}
                     <MapPin className="w-4 h-4 ml-2 text-primary" /> موقع الانطلاق
                  </Label>
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={handleGetCurrentLocation}
                     className="glass-button text-xs px-2 py-1 h-auto"
                   >
                     {/* Adjust margin for RTL: ml-1 */}
                     <LocateFixed className="w-3 h-3 ml-1" /> استخدام موقعي الحالي
                   </Button>
                </div>
               <div className="relative">
                   {/* Position icon for RTL: right-3 */}
                   <MapPin className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                    <LocationAutocomplete
                     fieldName="pickupLocation.address"
                     errors={errors}
                     onPlaceSelect={handleLocationSelect}
                     label="الانطلاق" // Arabic label
                    />
               </div>
               {errors?.pickupLocation?.address && (
                 <p className="text-sm font-medium text-destructive mt-1">{errors.pickupLocation.address.message}</p>
               )}
             </div>

             <div>
               <Label htmlFor="dropoffLocation.address" className="text-sm font-medium text-foreground flex items-center mb-1">
                 {/* Adjust margin for RTL: ml-2 */}
                 <MapPin className="w-4 h-4 ml-2 text-accent" /> وجهة الوصول
               </Label>
                <div className="relative">
                   {/* Position icon for RTL: right-3 */}
                   <MapPin className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                    <LocationAutocomplete
                     fieldName="dropoffLocation.address"
                     errors={errors}
                     onPlaceSelect={handleLocationSelect}
                     label="الوصول" // Arabic label
                   />
                </div>
               {errors?.dropoffLocation?.address && (
                 <p className="text-sm font-medium text-destructive mt-1">{errors.dropoffLocation.address.message}</p>
               )}
             </div>
           </div>
         </APIProvider>
       ) : (
       <div className="space-y-6">
         <div className="rounded-lg bg-muted/50 p-4 text-center text-muted-foreground glass-card border-none shadow-inner mb-6">
            ميزات الإكمال التلقائي للموقع والموقع الحالي تتطلب مفتاح Google Maps API. الرجاء إضافة NEXT_PUBLIC_GOOGLE_MAPS_API_KEY إلى ملف .env.local الخاص بك. سيتم الرجوع إلى الإدخال اليدوي للعنوان.
         </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pickupLocation.address" className="text-sm font-medium text-foreground flex items-center mb-1">
                {/* Adjust margin for RTL: ml-2 */}
                <MapPin className="w-4 h-4 ml-2 text-primary" /> موقع الانطلاق
              </Label>
              <div className="relative">
                  {/* Position icon for RTL: right-3 */}
                  <MapPin className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                  <Controller
                      name="pickupLocation.address"
                      control={control}
                      render={({ field }) => (
                      <Input
                          id="pickupLocation.address"
                          {...field}
                          placeholder="أدخل عنوان الانطلاق"
                          // Adjust padding for RTL: pr-10
                          className={cn("glass-input pr-10", errors?.pickupLocation?.address ? "border-destructive" : "")}
                          onBlur={() => trigger('pickupLocation.address')}
                          aria-invalid={errors?.pickupLocation?.address ? "true" : "false"}
                      />
                      )}
                  />
              </div>
              {errors?.pickupLocation?.address && (
                  <p className="text-sm font-medium text-destructive mt-1">{errors.pickupLocation.address.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="dropoffLocation.address" className="text-sm font-medium text-foreground flex items-center mb-1">
                {/* Adjust margin for RTL: ml-2 */}
                <MapPin className="w-4 h-4 ml-2 text-accent" /> وجهة الوصول
              </Label>
               <div className="relative">
                  {/* Position icon for RTL: right-3 */}
                  <MapPin className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                  <Controller
                      name="dropoffLocation.address"
                      control={control}
                      render={({ field }) => (
                      <Input
                          id="dropoffLocation.address"
                          {...field}
                          placeholder="أدخل عنوان الوصول"
                          // Adjust padding for RTL: pr-10
                          className={cn("glass-input pr-10", errors?.dropoffLocation?.address ? "border-destructive" : "")}
                           onBlur={() => trigger('dropoffLocation.address')}
                          aria-invalid={errors?.dropoffLocation?.address ? "true" : "false"}
                      />
                      )}
                  />
              </div>
              {errors?.dropoffLocation?.address && (
                  <p className="text-sm font-medium text-destructive mt-1">{errors.dropoffLocation.address.message}</p>
              )}
            </div>
          </div>
         </div>
       )}

    </div>
  );
};
