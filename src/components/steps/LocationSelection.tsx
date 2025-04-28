
"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button'; // Import Button
import { MapPin, LocateFixed } from 'lucide-react'; // Import LocateFixed icon
import type { BookingFormData } from '../BookingForm';
import { cn } from '@/lib/utils';
import { APIProvider, useMapsLibrary, useMap } from '@vis.gl/react-google-maps'; // Keep APIProvider, remove Map and Marker
import { useToast } from '@/hooks/use-toast'; // Import useToast for feedback

// IMPORTANT: Add your Google Maps API Key to .env.local
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// --- Autocomplete Component ---
function LocationAutocomplete({ fieldName, errors, onPlaceSelect, label }: {
  fieldName: `pickupLocation.address` | `dropoffLocation.address`;
  errors: any;
  onPlaceSelect: (type: 'pickup' | 'dropoff', place: google.maps.places.PlaceResult | null, addressString: string) => void;
  label: string; // Add label prop
}) {
  const { control, setValue } = useFormContext<BookingFormData>();
  const places = useMapsLibrary('places'); // Ensure 'places' library is loaded
  const [autocomplete, setAutocomplete] = React.useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const placeChangedListener = React.useRef<google.maps.MapsEventListener | null>(null);


  React.useEffect(() => {
    if (!places || !inputRef.current) return;

    if (!autocomplete) {
        const ac = new places.Autocomplete(inputRef.current, {
          fields: ["geometry", "formatted_address", "name"], // Request necessary fields
          // Optionally restrict search area, e.g., to Egypt: componentRestrictions: { country: 'EG' }
        });
        setAutocomplete(ac);

        if (placeChangedListener.current) {
          placeChangedListener.current.remove();
        }

        placeChangedListener.current = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const type = fieldName.startsWith('pickup') ? 'pickup' : 'dropoff';
          if (place.geometry && place.formatted_address) {
            // Update the form field with the selected address FIRST
            setValue(fieldName, place.formatted_address, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            // THEN call the callback to handle coordinates etc.
            onPlaceSelect(type, place, place.formatted_address);
          } else {
             console.warn("Place selected without geometry or formatted address:", place);
             // If user enters text and hits enter without selecting a suggestion
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
        // Clean up autocomplete instance and listeners when the component unmounts
        // This prevents potential memory leaks if the component is frequently mounted/unmounted
        if (autocomplete) {
             // google.maps.event.clearInstanceListeners(autocomplete); // Deprecated way
             // UnbindAll seems to be the way, but might not be strictly necessary if listeners are cleared
              if(typeof autocomplete.unbindAll === 'function') {
                 autocomplete.unbindAll();
             }
             // Consider removing the listener specifically if unbindAll isn't available/reliable
             if (placeChangedListener.current) {
                placeChangedListener.current.remove();
                placeChangedListener.current = null; // Clear ref
             }
        }
    };
  // Add autocomplete to dependency array to ensure cleanup/re-init if it changes (though it shouldn't often)
  }, [places, autocomplete, fieldName, onPlaceSelect, setValue]);


  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      // Use timeout to allow place_changed event to fire first if a selection was made
      setTimeout(() => {
          const addressString = event.target.value;
          // Check if a place was selected *just before* blur
          const placeSelected = autocomplete?.getPlace()?.geometry;

          if (!placeSelected && addressString) {
              const type = fieldName.startsWith('pickup') ? 'pickup' : 'dropoff';
              console.log("Blur event without selection, address:", addressString);
              // Update form value on blur even if no suggestion was selected
              setValue(fieldName, addressString, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
              // Trigger coordinate lookup/simulation based on the raw address string
              onPlaceSelect(type, null, addressString);
          }
      }, 100); // 100ms delay might be enough
  };


  return (
     <Controller
         name={fieldName}
         control={control}
         render={({ field }) => (
           <Input
             ref={inputRef} // Attach ref here
             id={fieldName}
             value={field.value || ''} // Controlled input value
             onChange={(e) => {
                 field.onChange(e); // Update RHF state
                 // If you need immediate feedback/actions on typing, add here
             }}
             placeholder={`Enter ${label} address`}
             className={cn("glass-input pl-10", errors?.[fieldName.split('.')[0]]?.[fieldName.split('.')[1]] ? "border-destructive" : "")}
             aria-invalid={errors?.[fieldName.split('.')[0]]?.[fieldName.split('.')[1]] ? "true" : "false"}
             onBlur={(e) => {
                 field.onBlur(); // RHF blur handler
                 handleBlur(e); // Custom blur handler
             }}
             // Remove onBlur={handleBlur} if Controller's onBlur is sufficient, but custom one adds delay logic
           />
         )}
       />
  );
}
// --- End Autocomplete Component ---


export const LocationSelection: FC<{ errors: any }> = ({ errors }) => {
  const { control, setValue, trigger } = useFormContext<BookingFormData>();
  const { toast } = useToast();
  const geocoding = useMapsLibrary('geocoding'); // Load geocoding library
  const [geocoder, setGeocoder] = React.useState<google.maps.Geocoder | null>(null);

  React.useEffect(() => {
      if (!geocoding) return;
      setGeocoder(new geocoding.Geocoder());
  }, [geocoding]);

  // Function to handle place selection from autocomplete or manual input blur
   const handleLocationSelect = (type: 'pickup' | 'dropoff', place: google.maps.places.PlaceResult | null, addressString: string) => {
     console.log(`Handling selection for ${type}:`, place ? place.formatted_address : addressString);

     let coordinates: { latitude?: number; longitude?: number } | undefined = undefined;
     let finalAddress = addressString; // Default to the input string

     const fieldNamePrefix = type === 'pickup' ? 'pickupLocation' : 'dropoffLocation';

     if (place?.geometry?.location) {
         coordinates = {
           latitude: place.geometry.location.lat(),
           longitude: place.geometry.location.lng(),
         };
         finalAddress = place.formatted_address || addressString; // Use Google's formatted address
         console.log(`Coordinates from Place:`, coordinates);

         // Update address field (already done by Autocomplete component, but ensure consistency)
          setValue(`${fieldNamePrefix}.address`, finalAddress, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
         // Update coordinates
         setValue(`${fieldNamePrefix}.coordinates`, coordinates, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
         // Trigger validation
         trigger(`${fieldNamePrefix}.address`);
         trigger(`${fieldNamePrefix}.coordinates`);

     } else if (finalAddress.trim() !== '' && geocoder) {
        // If no Place object but address string exists, try to geocode it
        console.log(`Geocoding address string: "${finalAddress}"`);
        geocoder.geocode({ address: finalAddress }, (results, status) => {
           if (status === 'OK' && results && results[0]?.geometry?.location) {
             const location = results[0].geometry.location;
             coordinates = { latitude: location.lat(), longitude: location.lng() };
             finalAddress = results[0].formatted_address || finalAddress; // Use geocoded address if available
             console.log(`Geocoding successful for "${addressString}":`, coordinates, finalAddress);
             // Update form values
             setValue(`${fieldNamePrefix}.address`, finalAddress, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
             setValue(`${fieldNamePrefix}.coordinates`, coordinates, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
           } else {
             console.warn(`Geocoding failed for "${addressString}": ${status}`);
             toast({ title: "Location Error", description: `Could not find coordinates for "${finalAddress}". Please try a more specific address.`, variant: "destructive" });
             // Clear coordinates if geocoding fails
             setValue(`${fieldNamePrefix}.coordinates`, undefined, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
           }
            // Trigger validation after geocoding attempt
           trigger(`${fieldNamePrefix}.address`);
           trigger(`${fieldNamePrefix}.coordinates`);
        });
     } else if (finalAddress.trim() === '') {
        // If address is empty, clear coordinates
         setValue(`${fieldNamePrefix}.coordinates`, undefined, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          trigger(`${fieldNamePrefix}.address`);
          trigger(`${fieldNamePrefix}.coordinates`);
     } else if (!geocoder) {
         console.warn("Geocoder not ready yet.");
         // Fallback: clear coordinates if geocoder isn't ready and no place was selected
         setValue(`${fieldNamePrefix}.coordinates`, undefined, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          trigger(`${fieldNamePrefix}.address`);
          trigger(`${fieldNamePrefix}.coordinates`);
     }
   };

   // --- Handle Get Current Location ---
   const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation Error", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }
    if (!geocoder) {
        toast({ title: "Map Error", description: "Geocoder service is not ready yet. Please wait a moment.", variant: "destructive" });
        return;
    }

    toast({ title: "Fetching Location", description: "Getting your current position..." });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        console.log("Current coordinates:", coords);

        // Reverse geocode to get address
        geocoder.geocode({ location: { lat: coords.latitude, lng: coords.longitude } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const address = results[0].formatted_address;
            console.log("Reverse geocoded address:", address);
            setValue('pickupLocation.address', address, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            setValue('pickupLocation.coordinates', coords, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            toast({ title: "Location Set", description: `Pickup location set to: ${address}` });
             trigger('pickupLocation.address');
             trigger('pickupLocation.coordinates');
          } else {
            console.warn("Reverse geocoding failed:", status);
            // Still set coordinates, but show error for address
            setValue('pickupLocation.coordinates', coords, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            setValue('pickupLocation.address', `Lat: ${coords.latitude.toFixed(4)}, Lng: ${coords.longitude.toFixed(4)}`, { shouldValidate: true, shouldDirty: true, shouldTouch: true }); // Fallback address
            toast({ title: "Address Error", description: "Could not find address for your current location. Coordinates set.", variant: "destructive" });
             trigger('pickupLocation.address');
             trigger('pickupLocation.coordinates');
          }
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        let message = "An unknown error occurred.";
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = "Location permission denied. Please enable location access in your browser settings.";
                break;
            case error.POSITION_UNAVAILABLE:
                message = "Location information is unavailable.";
                break;
            case error.TIMEOUT:
                message = "The request to get user location timed out.";
                break;
        }
        toast({ title: "Geolocation Error", description: message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Options
    );
  };

  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">Set Route</Label>
       <p className="text-sm text-muted-foreground mb-6">Enter your pickup and destination points.</p>

       {/* --- Render based on API Key availability --- */}
       {GOOGLE_MAPS_API_KEY ? (
         // APIProvider is necessary for useMapsLibrary hook
         <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'geocoding']}>
            {/* --- Input fields with Autocomplete (Inside APIProvider) --- */}
           <div className="space-y-4">
             <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="pickupLocation.address" className="text-sm font-medium text-foreground flex items-center">
                     <MapPin className="w-4 h-4 mr-2 text-primary" /> Pickup Location
                  </Label>
                   {/* "Use Current Location" Button */}
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={handleGetCurrentLocation}
                     className="glass-button text-xs px-2 py-1 h-auto" // Smaller button
                   >
                     <LocateFixed className="w-3 h-3 mr-1" /> Use Current Location
                   </Button>
                </div>
               <div className="relative">
                   <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                   {/* Ensure Autocomplete is rendered within Map context */}
                    <LocationAutocomplete
                     fieldName="pickupLocation.address"
                     errors={errors}
                     onPlaceSelect={handleLocationSelect}
                     label="pickup"
                    />
               </div>
               {errors?.pickupLocation?.address && (
                 <p className="text-sm font-medium text-destructive mt-1">{errors.pickupLocation.address.message}</p>
               )}
             </div>

             <div>
               <Label htmlFor="dropoffLocation.address" className="text-sm font-medium text-foreground flex items-center mb-1">
                 <MapPin className="w-4 h-4 mr-2 text-accent" /> Dropoff Location
               </Label>
                <div className="relative">
                   <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                    <LocationAutocomplete
                     fieldName="dropoffLocation.address"
                     errors={errors}
                     onPlaceSelect={handleLocationSelect}
                     label="dropoff"
                   />
                </div>
               {errors?.dropoffLocation?.address && (
                 <p className="text-sm font-medium text-destructive mt-1">{errors.dropoffLocation.address.message}</p>
               )}
             </div>
           </div>
         </APIProvider>
       ) : (
       /* --- Fallback if no API Key --- */
       <div className="space-y-6">
         <div className="rounded-lg bg-muted/50 p-4 text-center text-muted-foreground glass-card border-none shadow-inner mb-6">
           Location autocomplete and current location features require a Google Maps API Key. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file. Falling back to manual address input.
         </div>
         {/* Fallback Input Fields (No Autocomplete) */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="pickupLocation.address" className="text-sm font-medium text-foreground flex items-center mb-1">
                <MapPin className="w-4 h-4 mr-2 text-primary" /> Pickup Location
              </Label>
              <div className="relative">
                  <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                  <Controller
                      name="pickupLocation.address"
                      control={control}
                      render={({ field }) => (
                      <Input
                          id="pickupLocation.address"
                          {...field}
                          placeholder="Enter pickup address"
                          className={cn("glass-input pl-10", errors?.pickupLocation?.address ? "border-destructive" : "")}
                          // Simple blur update (no geocoding/simulation in fallback)
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
                <MapPin className="w-4 h-4 mr-2 text-accent" /> Dropoff Location
              </Label>
               <div className="relative">
                  <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                  <Controller
                      name="dropoffLocation.address"
                      control={control}
                      render={({ field }) => (
                      <Input
                          id="dropoffLocation.address"
                          {...field}
                          placeholder="Enter dropoff address"
                          className={cn("glass-input pl-10", errors?.dropoffLocation?.address ? "border-destructive" : "")}
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
