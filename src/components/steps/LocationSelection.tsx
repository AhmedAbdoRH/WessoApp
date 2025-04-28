
"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import type { BookingFormData } from '../BookingForm';
import { cn } from '@/lib/utils'; // Import the cn utility function
// Import Google Maps components - Requires API Key
import { APIProvider, Map, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { Marker } from '@vis.gl/react-google-maps'; // Separate import if needed

// IMPORTANT: Add your Google Maps API Key to .env.local
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// --- Autocomplete Component ---
function LocationAutocomplete({ fieldName, errors, onPlaceSelect }: {
  fieldName: `pickupLocation.address` | `dropoffLocation.address`;
  errors: any;
  onPlaceSelect: (type: 'pickup' | 'dropoff', place: google.maps.places.PlaceResult | null, addressString: string) => void; // Updated signature
}) {
  const { control, setValue } = useFormContext<BookingFormData>(); // Added setValue
  const map = useMap();
  const places = useMapsLibrary('places');
  const [autocomplete, setAutocomplete] = React.useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const placeChangedListener = React.useRef<google.maps.MapsEventListener | null>(null);


  React.useEffect(() => {
    if (!places || !inputRef.current) return;

    // Create Autocomplete instance if it doesn't exist
    if (!autocomplete) {
        const ac = new places.Autocomplete(inputRef.current, {
          fields: ["geometry", "formatted_address", "name"], // Added name
           // Optionally restrict search area, e.g., to Egypt: componentRestrictions: { country: 'EG' }
        });
        setAutocomplete(ac);

        // Remove previous listener before adding a new one
        if (placeChangedListener.current) {
          placeChangedListener.current.remove();
        }

        // Add listener for place selection
        placeChangedListener.current = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const type = fieldName.startsWith('pickup') ? 'pickup' : 'dropoff';
          if (place.geometry && place.formatted_address) {
            if (map && place.geometry.location) {
                map.panTo(place.geometry.location);
                map.setZoom(15); // Zoom in on selected place
            }
            // Update the form field with the selected address
            setValue(fieldName, place.formatted_address, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            onPlaceSelect(type, place, place.formatted_address); // Pass place and address
          } else {
            console.warn("Place selected without geometry or formatted address:", place);
            // Handle cases where the user types something not in Places API but hits Enter
            // Pass null for place, but keep the entered address string
            onPlaceSelect(type, null, inputRef.current?.value || '');
          }
        });
    }


    // Cleanup listener on component unmount
    return () => {
        if (placeChangedListener.current) {
            placeChangedListener.current.remove();
        }
        // Optional: remove Autocomplete instance if component unmounts,
        // though usually it's fine to keep it if the input persists
        // if (autocomplete) {
        //    autocomplete.unbindAll(); // Clean up bindings
        // }
    };

  }, [places, autocomplete, map, fieldName, onPlaceSelect, setValue]);


  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      const addressString = event.target.value;
      // If the user blurs without selecting a place from dropdown,
      // trigger the geocoding simulation/logic
      if (addressString && !autocomplete?.getPlace()?.geometry) {
          const type = fieldName.startsWith('pickup') ? 'pickup' : 'dropoff';
          console.log("Blur event with address:", addressString);
          onPlaceSelect(type, null, addressString); // Pass null place, use address string
      }
  };


  return (
     <Controller
         name={fieldName}
         control={control}
         render={({ field }) => (
           <Input
             ref={inputRef}
             id={fieldName}
             {...field} // Use field from Controller
             placeholder={`Enter ${fieldName.includes('pickup') ? 'pickup' : 'dropoff'} address`}
             className={cn("glass-input pl-10", errors?.[fieldName.split('.')[0]]?.[fieldName.split('.')[1]] ? "border-destructive" : "")}
             aria-invalid={errors?.[fieldName.split('.')[0]]?.[fieldName.split('.')[1]] ? "true" : "false"}
             onBlur={handleBlur} // Handle blur for manual entries
             // onChange is handled by Controller
           />
         )}
       />
  );
}
// --- End Autocomplete Component ---


export const LocationSelection: FC<{ errors: any }> = ({ errors }) => {
  const { control, setValue, getValues, trigger } = useFormContext<BookingFormData>(); // Added trigger

  // Function to handle place selection from autocomplete or manual input blur
   const handleLocationSelect = (type: 'pickup' | 'dropoff', place: google.maps.places.PlaceResult | null, addressString: string) => {
     console.log(`Handling selection for ${type}:`, place ? place.formatted_address : addressString);

     let coordinates: { latitude?: number; longitude?: number } | undefined = undefined;
     let finalAddress = addressString; // Default to the input string

     if (place?.geometry?.location) {
         coordinates = {
           latitude: place.geometry.location.lat(),
           longitude: place.geometry.location.lng(),
         };
         // Use the formatted address from Google for consistency
         finalAddress = place.formatted_address || addressString;
         console.log(`Coordinates from Place:`, coordinates);
     } else if (finalAddress.trim() !== '') {
        // **Placeholder Geocoding**: If no place result, simulate coordinates based on address string
        // In a real app, you'd call a Geocoding API here to get coordinates from the address string
        // Example: Use a hash or simple check for demo purposes
        console.warn(`No valid place selected for "${finalAddress}". Simulating coordinates.`);
        if (finalAddress.toLowerCase().includes('cairo')) {
             coordinates = { latitude: 30.0444, longitude: 31.2357 };
        } else if (finalAddress.toLowerCase().includes('giza')) {
             coordinates = { latitude: 29.9792, longitude: 31.1342 };
        } else {
             // Simulate generic coordinates if address doesn't match known patterns
             // Make coordinates slightly different to avoid overlap in demo
             const randomOffsetLat = (Math.random() - 0.5) * 0.1;
             const randomOffsetLng = (Math.random() - 0.5) * 0.1;
             coordinates = type === 'pickup'
               ? { latitude: 34.0522 + randomOffsetLat, longitude: -118.2437 + randomOffsetLng }
               : { latitude: 34.1522 + randomOffsetLat, longitude: -118.3437 + randomOffsetLng };
        }
        console.log(`Simulated coordinates for ${finalAddress}:`, coordinates);
     }

     const fieldNamePrefix = type === 'pickup' ? 'pickupLocation' : 'dropoffLocation';
     // Ensure address is updated even if it's just the string entered by the user
     setValue(`${fieldNamePrefix}.address`, finalAddress, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
     setValue(`${fieldNamePrefix}.coordinates`, coordinates, { shouldValidate: true, shouldDirty: true, shouldTouch: true });

     // Trigger validation after setting values
     trigger(`${fieldNamePrefix}.address`);
     trigger(`${fieldNamePrefix}.coordinates`);

     // Update map markers (optional, could also be done via useEffect watching coordinates)
     // Consider adding logic here to update map center/zoom if needed
   };


  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">Set Route</Label>
       <p className="text-sm text-muted-foreground mb-6">Enter your pickup and destination points. You can use the map or type addresses below.</p>

       {/* --- Google Maps Integration (Requires API Key) --- */}
       {GOOGLE_MAPS_API_KEY ? (
         <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places']}> {/* Add places library */}
           <div className="h-64 w-full rounded-lg overflow-hidden glass-card p-0 border-none shadow-inner mb-6">
             <Map
               defaultCenter={{ lat: 30.0444, lng: 31.2357 }} // Example: Cairo center
               defaultZoom={10}
               mapId="clearride-map"
               className="w-full h-full"
               gestureHandling="greedy" // Allow map interaction
               disableDefaultUI={true} // Cleaner map
               zoomControl={true}
             >
               {/* Render Markers based on form values */}
               {getValues('pickupLocation.coordinates.latitude') && getValues('pickupLocation.coordinates.longitude') && (
                 <Marker position={{ lat: getValues('pickupLocation.coordinates.latitude')!, lng: getValues('pickupLocation.coordinates.longitude')! }} title="Pickup" />
               )}
               {getValues('dropoffLocation.coordinates.latitude') && getValues('dropoffLocation.coordinates.longitude') && (
                 <Marker position={{ lat: getValues('dropoffLocation.coordinates.latitude')!, lng: getValues('dropoffLocation.coordinates.longitude')! }} title="Dropoff" />
               )}
             </Map>
           </div>

           {/* --- Input fields with Autocomplete (Inside APIProvider) --- */}
           <div className="space-y-4">
             <div>
               <Label htmlFor="pickupLocation.address" className="text-sm font-medium text-foreground flex items-center mb-1">
                 <MapPin className="w-4 h-4 mr-2 text-primary" /> Pickup Location
               </Label>
               <div className="relative">
                   <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                   {/* Ensure Autocomplete is rendered within Map context */}
                    <LocationAutocomplete
                     fieldName="pickupLocation.address"
                     errors={errors}
                     onPlaceSelect={handleLocationSelect}
                    />
               </div>
               {errors?.pickupLocation?.address && (
                 <p className="text-sm font-medium text-destructive mt-1">{errors.pickupLocation.address.message}</p>
               )}
                {/* Combine coordinate and address errors for simplicity if needed */}
                {/* {errors?.pickupLocation && (errors?.pickupLocation.address || errors?.pickupLocation.coordinates) && (
                   <p className="text-sm font-medium text-destructive mt-1">Please select a valid pickup location.</p>
                 )} */}
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
                   />
                </div>
               {errors?.dropoffLocation?.address && (
                 <p className="text-sm font-medium text-destructive mt-1">{errors.dropoffLocation.address.message}</p>
               )}
               {/* Combine coordinate and address errors */}
                {/* {errors?.dropoffLocation && (errors?.dropoffLocation.address || errors?.dropoffLocation.coordinates) && (
                   <p className="text-sm font-medium text-destructive mt-1">Please select a valid dropoff location.</p>
                 )} */}
             </div>
           </div>
         </APIProvider>
       ) : (
       /* --- Fallback if no API Key --- */
       <div className="space-y-6">
         <div className="h-64 w-full rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground glass-card p-4 border-none shadow-inner mb-6 text-center">
           Map features require a Google Maps API Key.<br /> Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.
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
                          onBlur={() => handleLocationSelect('pickup', null, field.value)} // Simulate coords on blur
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
                          onBlur={() => handleLocationSelect('dropoff', null, field.value)} // Simulate coords on blur
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
