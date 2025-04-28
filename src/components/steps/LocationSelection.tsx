
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
import { APIProvider, useMapsLibrary, ControlPosition, MapControl } from '@vis.gl/react-google-maps';
import { useToast } from '@/hooks/use-toast';

// IMPORTANT: Ensure this environment variable is set in your .env.local file
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
  const { toast } = useToast();

  React.useEffect(() => {
    if (!places || !inputRef.current) return;

    // Cleanup previous listener if it exists
    if (placeChangedListener.current) {
        placeChangedListener.current.remove();
        placeChangedListener.current = null;
    }
    // Cleanup previous autocomplete instance
    if (autocomplete && typeof autocomplete.unbindAll === 'function') {
        autocomplete.unbindAll();
    }


    const ac = new places.Autocomplete(inputRef.current, {
      fields: ["geometry", "formatted_address", "name"],
      componentRestrictions: { country: 'EG' }, // Restrict search to Egypt
    });
    setAutocomplete(ac);

    console.log(`Autocomplete initialized for ${fieldName}`);

    placeChangedListener.current = ac.addListener("place_changed", () => {
      console.log(`Place changed event fired for ${fieldName}`);
      const place = ac.getPlace();
      const type = fieldName.startsWith('pickup') ? 'pickup' : 'dropoff';

      if (place.geometry && place.formatted_address) {
        console.log(`Place selected for ${fieldName}:`, place.formatted_address);
        setValue(fieldName, place.formatted_address, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        onPlaceSelect(type, place, place.formatted_address);
      } else {
         console.warn("Place selected without geometry or formatted address:", place);
         const enteredAddress = inputRef.current?.value || '';
         if (enteredAddress) {
            console.log(`Using entered address for ${fieldName}: ${enteredAddress}`);
            setValue(fieldName, enteredAddress, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            onPlaceSelect(type, null, enteredAddress); // Attempt geocoding in parent
         } else {
            console.log(`Place changed event for ${fieldName} with no place and no input value.`);
            onPlaceSelect(type, null, ''); // Clear coordinates if address is empty
         }
      }
    });

    // Cleanup function
    return () => {
        console.log(`Cleaning up autocomplete for ${fieldName}`);
        if (placeChangedListener.current) {
            placeChangedListener.current.remove();
            placeChangedListener.current = null;
        }
        // Ensure unbindAll is called if the component unmounts before autocomplete is fully removed
        if (autocomplete && typeof autocomplete.unbindAll === 'function') {
           autocomplete.unbindAll();
           // It might be necessary to remove the input from the DOM *before* unbinding,
           // but React handles DOM cleanup. Let's rely on that for now.
           // See: https://developers.google.com/maps/documentation/javascript/reference/places-widget#Autocomplete.unbindAll
        }
        // It's generally safer to set the state to null on cleanup
        // setAutocomplete(null);
    };
    // Rerun effect if places library loads or fieldName changes
  }, [places, fieldName, onPlaceSelect, setValue, autocomplete]);


  // Handle manual input blur (when user types and clicks away without selecting a suggestion)
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      // Use a small timeout to allow the place_changed event to fire first if a suggestion was clicked.
      setTimeout(() => {
          const addressString = event.target.value;
          // Check if a place was selected *just before* blur. The state update might be slightly delayed.
          // This check might be complex. A simpler approach is to check if the input still has focus
          // or if a place_changed event has recently fired (needs state management).
          // For simplicity, we assume if addressString exists and no place was recently selected,
          // we should treat it as a manual entry.
          const isPlaceSelected = autocomplete?.getPlace()?.geometry; // Check if place is available

          // Check if place_changed listener is still attached - indicating we haven't cleaned up yet
          const listenerExists = !!placeChangedListener.current;

          // Only trigger manual geocoding if no place was selected and the listener is still valid
          if (!isPlaceSelected && addressString && listenerExists) {
              const type = fieldName.startsWith('pickup') ? 'pickup' : 'dropoff';
              console.log(`Blur event for ${fieldName} without selection, address:`, addressString);
              // setValue might have already been called by place_changed if it fired late.
              // It's generally safe to call it again here if needed.
              setValue(fieldName, addressString, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
              onPlaceSelect(type, null, addressString); // Trigger geocoding attempt
          } else if (!addressString && listenerExists) {
              // Clear coordinates if address is cleared on blur
               const type = fieldName.startsWith('pickup') ? 'pickup' : 'dropoff';
               console.log(`Blur event for ${fieldName} with empty address.`);
               setValue(fieldName, '', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
               onPlaceSelect(type, null, '');
          }
      }, 150); // Increased timeout slightly
  };

  const errorPath = fieldName.split('.');
  const hasError = !!errors?.[errorPath[0]]?.[errorPath[1]]; // Use !! to ensure boolean

  return (
     <Controller
         name={fieldName}
         control={control}
         render={({ field }) => (
           <Input
             ref={inputRef}
             id={fieldName}
             {...field} // Use field directly for value and onChange
             placeholder={`أدخل عنوان ${label}`}
             // Adjust padding for RTL: pr-10 instead of pl-10
             className={cn("glass-input pr-10 h-12 text-base", hasError ? "border-destructive" : "")}
             aria-invalid={hasError ? "true" : "false"}
             onBlur={(e) => {
                 field.onBlur(); // Important for react-hook-form state
                 handleBlur(e);
             }}
             // Ensure field.onChange updates the input value correctly
             onChange={(e) => field.onChange(e.target.value)}
           />
         )}
       />
  );
}
// --- End Autocomplete Component ---


export const LocationSelection: FC<{ errors: any }> = ({ errors }) => {
  const { control, setValue, trigger, watch } = useFormContext<BookingFormData>();
  const { toast } = useToast();
  const geocoding = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = React.useState<google.maps.Geocoder | null>(null);
  const [isGeocoderReady, setIsGeocoderReady] = React.useState(false);
  const [isGeocoding, setIsGeocoding] = React.useState(false); // To prevent multiple geocoding requests

  React.useEffect(() => {
      if (!geocoding && !isGeocoderReady) return;
      if (!geocoder) {
          console.log("Initializing Geocoder...");
          setGeocoder(new geocoding.Geocoder());
          setIsGeocoderReady(true);
      }
  }, [geocoding, geocoder, isGeocoderReady]);

   const handleLocationSelect = React.useCallback(
        (type: 'pickup' | 'dropoff', place: google.maps.places.PlaceResult | null, addressString: string) => {
            console.log(`Handling selection for ${type}:`, place ? place.formatted_address : `"${addressString}"`);

            const fieldNamePrefix = type === 'pickup' ? 'pickupLocation' : 'dropoffLocation';
            let finalAddress = addressString;
            let coordinates: { latitude?: number; longitude?: number } | undefined = undefined;

            // 1. Use coordinates from Place object if available
            if (place?.geometry?.location) {
                coordinates = {
                    latitude: place.geometry.location.lat(),
                    longitude: place.geometry.location.lng(),
                };
                finalAddress = place.formatted_address || addressString; // Prefer formatted address
                console.log(`Coordinates from Place for ${type}:`, coordinates);
                setValue(`${fieldNamePrefix}.address`, finalAddress, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                setValue(`${fieldNamePrefix}.coordinates`, coordinates, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                trigger(`${fieldNamePrefix}.address`); // Trigger validation after setting value
                trigger(`${fieldNamePrefix}.coordinates`);
                return; // Done if we got coords from Place
            }

            // 2. If no Place coordinates, and address string is not empty, try geocoding
            if (finalAddress.trim() !== '' && isGeocoderReady && geocoder && !isGeocoding) {
                console.log(`Attempting geocoding for ${type}: "${finalAddress}"`);
                setIsGeocoding(true); // Prevent concurrent requests
                geocoder.geocode({ address: finalAddress, region: 'EG' }, (results, status) => {
                    if (status === 'OK' && results && results[0]?.geometry?.location) {
                        const location = results[0].geometry.location;
                        coordinates = { latitude: location.lat(), longitude: location.lng() };
                        // Use the geocoded address for consistency, but keep original if geocoded is vague
                        finalAddress = results[0].formatted_address || finalAddress;
                        console.log(`Geocoding successful for ${type}:`, coordinates, finalAddress);
                        setValue(`${fieldNamePrefix}.address`, finalAddress, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                        setValue(`${fieldNamePrefix}.coordinates`, coordinates, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                    } else {
                        console.warn(`Geocoding failed for ${type} ("${addressString}"): ${status}`);
                        // Don't clear the address, but clear coordinates and show error
                        setValue(`${fieldNamePrefix}.coordinates`, undefined, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                        toast({ title: "خطأ في الموقع", description: `لم نتمكن من العثور على إحداثيات دقيقة لـ "${finalAddress}". يرجى التحقق من العنوان أو محاولة عنوان أكثر تحديدًا.`, variant: "destructive" });
                    }
                    // Trigger validation regardless of success/failure
                    trigger(`${fieldNamePrefix}.address`);
                    trigger(`${fieldNamePrefix}.coordinates`);
                    setIsGeocoding(false); // Allow next request
                });
            } else if (finalAddress.trim() === '') {
                // 3. If address string is empty, clear coordinates
                console.log(`Clearing coordinates for ${type} due to empty address.`);
                setValue(`${fieldNamePrefix}.coordinates`, undefined, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                setValue(`${fieldNamePrefix}.address`, '', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                trigger(`${fieldNamePrefix}.address`);
                trigger(`${fieldNamePrefix}.coordinates`);
            } else if (!isGeocoderReady || !geocoder) {
                 console.warn("Geocoder not ready for geocoding attempt.");
                 // Optionally notify user, or just rely on subsequent attempts
                 setValue(`${fieldNamePrefix}.coordinates`, undefined, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                 trigger(`${fieldNamePrefix}.address`);
                 trigger(`${fieldNamePrefix}.coordinates`);
                 // Don't toast here, it might be annoying if it happens often during init
            } else if (isGeocoding) {
                console.log("Geocoding already in progress, skipping request for:", addressString);
            }
        },
    [geocoder, isGeocoderReady, setValue, trigger, toast, isGeocoding] // Add dependencies
   );


   const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "خطأ في تحديد الموقع الجغرافي", description: "تحديد الموقع الجغرافي غير مدعوم من قبل متصفحك.", variant: "destructive" });
      return;
    }
    if (!isGeocoderReady || !geocoder) {
        toast({ title: "خطأ في الخريطة", description: "خدمة الترميز الجغرافي ليست جاهزة بعد. يرجى الانتظار لحظة والمحاولة مرة أخرى.", variant: "destructive" });
        return;
    }
     if (isGeocoding) {
        toast({ title: "يرجى الانتظار", description: "جاري معالجة طلب موقع آخر.", variant: "default" });
        return;
    }

    toast({ title: "جارٍ جلب الموقع", description: "الحصول على موقعك الحالي..." });
    setIsGeocoding(true); // Prevent conflicts

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
             trigger('pickupLocation.address'); // Trigger validation
             trigger('pickupLocation.coordinates');
          } else {
            console.warn("Reverse geocoding failed:", status);
            // Set coords anyway, provide a basic address string
             setValue('pickupLocation.address', `الموقع الحالي (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            setValue('pickupLocation.coordinates', coords, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            toast({ title: "خطأ في العنوان", description: "لم نتمكن من العثور على عنوان دقيق لموقعك الحالي. تم تعيين الإحداثيات.", variant: "destructive" });
             trigger('pickupLocation.address');
             trigger('pickupLocation.coordinates');
          }
          setIsGeocoding(false); // Allow next request
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
        setIsGeocoding(false); // Allow next request even on error
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Render fallback if API key is missing
   if (!GOOGLE_MAPS_API_KEY) {
      return (
        <div className="space-y-6">
           <Label className="text-xl font-semibold text-foreground block mb-4">تحديد المسار</Label>
           <div className="rounded-lg bg-destructive/10 p-4 text-center text-destructive glass-card border-destructive/50 shadow-inner mb-6">
            ميزات الإكمال التلقائي للموقع والموقع الحالي معطلة. <br />
            يرجى إضافة مفتاح Google Maps API صالح إلى ملف `.env.local` الخاص بك باسم `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` وإعادة تشغيل الخادم. <br />
            سيتم استخدام الإدخال اليدوي للعنوان فقط.
           </div>
           {/* Manual Input Fallback */}
           <div className="space-y-4">
            <div>
              <Label htmlFor="pickupLocation.address" className="text-sm font-medium text-foreground flex items-center mb-1">
                <MapPin className="w-4 h-4 ml-2 text-primary" /> موقع الانطلاق
              </Label>
              <div className="relative">
                  <MapPin className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                  <Controller
                      name="pickupLocation.address"
                      control={control}
                      render={({ field }) => (
                      <Input
                          id="pickupLocation.address"
                          {...field}
                          placeholder="أدخل عنوان الانطلاق يدويًا"
                          className={cn("glass-input pr-10 h-12 text-base", errors?.pickupLocation?.address ? "border-destructive" : "")}
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
                <MapPin className="w-4 h-4 ml-2 text-accent" /> وجهة الوصول
              </Label>
               <div className="relative">
                  <MapPin className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                  <Controller
                      name="dropoffLocation.address"
                      control={control}
                      render={({ field }) => (
                      <Input
                          id="dropoffLocation.address"
                          {...field}
                          placeholder="أدخل عنوان الوصول يدويًا"
                          className={cn("glass-input pr-10 h-12 text-base", errors?.dropoffLocation?.address ? "border-destructive" : "")}
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
      );
    }


  // Render the component with APIProvider if key exists
  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">تحديد المسار</Label>
       <p className="text-sm text-muted-foreground mb-6">أدخل نقاط الانطلاق والوجهة باستخدام الإكمال التلقائي.</p>

       <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'geocoding']} language="ar">
         <div className="space-y-4">
           {/* Pickup Location */}
           <div>
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="pickupLocation.address" className="text-sm font-medium text-foreground flex items-center">
                   <MapPin className="w-4 h-4 ml-2 text-primary" /> موقع الانطلاق
                </Label>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={handleGetCurrentLocation}
                   disabled={!isGeocoderReady || isGeocoding} // Disable while geocoding
                   className="glass-button text-xs px-2 py-1 h-auto disabled:opacity-50 disabled:cursor-wait"
                   aria-label="استخدام موقعي الحالي لنقطة الانطلاق"
                 >
                   <LocateFixed className="w-3 h-3 ml-1" /> استخدام موقعي الحالي
                 </Button>
              </div>
             <div className="relative">
                 <MapPin className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                  <LocationAutocomplete
                   fieldName="pickupLocation.address"
                   errors={errors}
                   onPlaceSelect={handleLocationSelect}
                   label="الانطلاق"
                  />
             </div>
             {/* Access nested error correctly */}
             {errors?.pickupLocation?.address && (
               <p className="text-sm font-medium text-destructive mt-1">{errors.pickupLocation.address.message}</p>
             )}
              {/* Debug: Display coordinates */}
              {/* {watch('pickupLocation.coordinates') && <pre className="text-xs mt-1">Coords: {JSON.stringify(watch('pickupLocation.coordinates'))}</pre>} */}
           </div>

           {/* Dropoff Location */}
           <div>
             <Label htmlFor="dropoffLocation.address" className="text-sm font-medium text-foreground flex items-center mb-1">
               <MapPin className="w-4 h-4 ml-2 text-accent" /> وجهة الوصول
             </Label>
              <div className="relative">
                 <MapPin className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                  <LocationAutocomplete
                   fieldName="dropoffLocation.address"
                   errors={errors}
                   onPlaceSelect={handleLocationSelect}
                   label="الوصول"
                 />
              </div>
             {/* Access nested error correctly */}
             {errors?.dropoffLocation?.address && (
               <p className="text-sm font-medium text-destructive mt-1">{errors.dropoffLocation.address.message}</p>
             )}
              {/* Debug: Display coordinates */}
              {/* {watch('dropoffLocation.coordinates') && <pre className="text-xs mt-1">Coords: {JSON.stringify(watch('dropoffLocation.coordinates'))}</pre>} */}
           </div>
         </div>
       </APIProvider>

    </div>
  );
};
