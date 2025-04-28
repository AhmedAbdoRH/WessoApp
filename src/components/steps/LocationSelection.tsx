
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
// import { APIProvider, Map, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
// import { Marker } from '@vis.gl/react-google-maps'; // Separate import if needed

// IMPORTANT: Add your Google Maps API Key to .env.local
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// --- Autocomplete Component (Example Structure - Requires API Key & Libraries) ---
// function LocationAutocomplete({ fieldName, errors, onPlaceSelect }: {
//   fieldName: `pickupLocation.address` | `dropoffLocation.address`;
//   errors: any;
//   onPlaceSelect: (type: 'pickup' | 'dropoff', place: google.maps.places.PlaceResult) => void;
// }) {
//   const { control } = useFormContext<BookingFormData>();
//   const map = useMap();
//   const places = useMapsLibrary('places');
//   const [autocomplete, setAutocomplete] = React.useState<google.maps.places.Autocomplete | null>(null);
//   const inputRef = React.useRef<HTMLInputElement>(null);

//   React.useEffect(() => {
//     if (!places || !inputRef.current || autocomplete) return;

//     const ac = new places.Autocomplete(inputRef.current, {
//       fields: ["geometry", "formatted_address"],
//       // Optionally restrict search area, e.g., to Egypt: componentRestrictions: { country: 'EG' }
//     });
//     setAutocomplete(ac);

//     ac.addListener("place_changed", () => {
//       const place = ac.getPlace();
//       if (place.geometry && place.formatted_address) {
//         if (map && place.geometry.location) {
//             map.panTo(place.geometry.location);
//             map.setZoom(15); // Zoom in on selected place
//         }
//         const type = fieldName === 'pickupLocation.address' ? 'pickup' : 'dropoff';
//         onPlaceSelect(type, place);
//       } else {
//         console.warn("Place selected without geometry or formatted address:", place);
//         // Handle cases where the user types something not in Places API
//       }
//     });

//   }, [places, autocomplete, map, fieldName, onPlaceSelect]);


//   return (
//      <Controller
//          name={fieldName}
//          control={control}
//          render={({ field }) => (
//            <Input
//              ref={inputRef}
//              id={fieldName}
//              {...field}
//              placeholder={`Enter ${fieldName.includes('pickup') ? 'pickup' : 'dropoff'} address`}
//              className={cn("glass-input pl-10", errors?.[fieldName.split('.')[0]]?.[fieldName.split('.')[1]] ? "border-destructive" : "")}
//              aria-invalid={errors?.[fieldName.split('.')[0]]?.[fieldName.split('.')[1]] ? "true" : "false"}
//              // onChange={(e) => { // Allow typing without immediate API calls if preferred
//              //   field.onChange(e.target.value);
//              // }}
//            />
//          )}
//        />
//   );
// }
// --- End Autocomplete Component ---


export const LocationSelection: FC<{ errors: any }> = ({ errors }) => {
  const { control, setValue, getValues } = useFormContext<BookingFormData>();

  // Function to handle place selection from autocomplete or manual input blur
  const handleLocationSelect = (type: 'pickup' | 'dropoff', address: string, place?: google.maps.places.PlaceResult) => {
     console.log(`Selected ${type}:`, place ? place.formatted_address : address);

     let coordinates: { latitude?: number; longitude?: number } | undefined = undefined;

     if (place?.geometry?.location) {
         coordinates = {
           latitude: place.geometry.location.lat(),
           longitude: place.geometry.location.lng(),
         };
         // Update address field with the formatted address from Google for consistency
         address = place.formatted_address || address;
     } else if (address.trim() !== '') {
        // **Placeholder Geocoding**: If no place result, simulate coordinates based on address string
        // In a real app, you'd call a Geocoding API here to get coordinates from the address string
        // Example: Use a hash or simple check for demo purposes
        if (address.toLowerCase().includes('cairo')) {
             coordinates = { latitude: 30.0444, longitude: 31.2357 };
        } else if (address.toLowerCase().includes('giza')) {
             coordinates = { latitude: 29.9792, longitude: 31.1342 };
        } else {
             // Simulate generic coordinates if address doesn't match known patterns
             coordinates = { latitude: 34.0522 + (Math.random() - 0.5), longitude: -118.2437 + (Math.random() - 0.5) };
        }
        console.log(`Simulated coordinates for ${address}:`, coordinates);
     }

     const fieldNamePrefix = type === 'pickup' ? 'pickupLocation' : 'dropoffLocation';
     setValue(`${fieldNamePrefix}.address`, address, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
     setValue(`${fieldNamePrefix}.coordinates`, coordinates, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
   };


  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">Set Route</Label>
       <p className="text-sm text-muted-foreground mb-6">Enter your pickup and destination points. You can use the map or type addresses below.</p>

       {/* --- Google Maps Integration (Requires API Key) --- */}
       {/* {GOOGLE_MAPS_API_KEY ? (
         <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
           <div className="h-64 w-full rounded-lg overflow-hidden glass-card p-0 border-none shadow-inner mb-6">
             <Map
               defaultCenter={{ lat: 30.0444, lng: 31.2357 }} // Example: Cairo center
               defaultZoom={10}
               mapId="clearride-map"
               className="w-full h-full"
               gestureHandling="greedy" // Allow map interaction
             > */}
               {/* Render Markers based on form values */}
               {/* {getValues('pickupLocation.coordinates.latitude') && getValues('pickupLocation.coordinates.longitude') && (
                 <Marker position={{ lat: getValues('pickupLocation.coordinates.latitude')!, lng: getValues('pickupLocation.coordinates.longitude')! }} title="Pickup" />
               )}
               {getValues('dropoffLocation.coordinates.latitude') && getValues('dropoffLocation.coordinates.longitude') && (
                 <Marker position={{ lat: getValues('dropoffLocation.coordinates.latitude')!, lng: getValues('dropoffLocation.coordinates.longitude')! }} title="Dropoff" />
               )} */}
             {/* </Map>
           </div> */}

           {/* --- Input fields with Autocomplete (Inside APIProvider) --- */}
           {/* <div className="space-y-4">
             <div>
               <Label htmlFor="pickupLocation.address" className="text-sm font-medium text-foreground flex items-center mb-1">
                 <MapPin className="w-4 h-4 mr-2 text-primary" /> Pickup Location
               </Label>
               <div className="relative">
                   <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/>
                   <LocationAutocomplete
                     fieldName="pickupLocation.address"
                     errors={errors}
                     onPlaceSelect={handleLocationSelect}
                    />
               </div>
               {errors?.pickupLocation?.address && (
                 <p className="text-sm font-medium text-destructive mt-1">{errors.pickupLocation.address.message}</p>
               )}
                {errors?.pickupLocation?.coordinates && !errors?.pickupLocation?.address && ( // Show coordinate error only if address is valid but coords missing/invalid
                 <p className="text-sm font-medium text-destructive mt-1">Could not determine coordinates for pickup.</p>
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
                   />
                </div>
               {errors?.dropoffLocation?.address && (
                 <p className="text-sm font-medium text-destructive mt-1">{errors.dropoffLocation.address.message}</p>
               )}
               {errors?.dropoffLocation?.coordinates && !errors?.dropoffLocation?.address && (
                 <p className="text-sm font-medium text-destructive mt-1">Could not determine coordinates for dropoff.</p>
               )}
             </div>
           </div> */}
         {/* </APIProvider>
       ) : ( */}
       {/* --- Fallback if no API Key --- */}
       {/* <div className="h-64 w-full rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground glass-card p-0 border-none shadow-inner mb-6">
         Map requires Google Maps API Key for full features.
       </div> */}
         <div className="space-y-4">
           <div>
             <Label htmlFor="pickupLocation.address" className="text-sm font-medium text-foreground flex items-center mb-1">
               <MapPin className="w-4 h-4 mr-2 text-primary" /> Pickup Location
             </Label>
             <div className="relative"> {/* Added relative positioning */}
                 <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/> {/* Icon */}
                 <Controller
                     name="pickupLocation.address"
                     control={control}
                     render={({ field }) => (
                     <Input
                         id="pickupLocation.address"
                         {...field}
                         placeholder="Enter pickup address"
                         className={cn("glass-input pl-10", errors?.pickupLocation?.address ? "border-destructive" : "")}
                         onBlur={() => handleLocationSelect('pickup', field.value)} // Get coords on blur
                         aria-invalid={errors?.pickupLocation?.address ? "true" : "false"}
                     />
                     )}
                 />
             </div>
             {errors?.pickupLocation?.address && (
                 <p className="text-sm font-medium text-destructive mt-1">{errors.pickupLocation.address.message}</p>
             )}
              {/* Display coordinate errors if they exist */}
             {errors?.pickupLocation?.coordinates && !errors?.pickupLocation?.address && ( // Show coord error if address is valid
                 <p className="text-sm font-medium text-destructive mt-1">Could not get coordinates for pickup.</p>
             )}
           </div>

           <div>
             <Label htmlFor="dropoffLocation.address" className="text-sm font-medium text-foreground flex items-center mb-1">
               <MapPin className="w-4 h-4 mr-2 text-accent" /> Dropoff Location
             </Label>
              <div className="relative"> {/* Added relative positioning */}
                 <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"/> {/* Icon */}
                 <Controller
                     name="dropoffLocation.address"
                     control={control}
                     render={({ field }) => (
                     <Input
                         id="dropoffLocation.address"
                         {...field}
                         placeholder="Enter dropoff address"
                         className={cn("glass-input pl-10", errors?.dropoffLocation?.address ? "border-destructive" : "")}
                         onBlur={() => handleLocationSelect('dropoff', field.value)} // Get coords on blur
                         aria-invalid={errors?.dropoffLocation?.address ? "true" : "false"}
                     />
                     )}
                 />
             </div>
             {errors?.dropoffLocation?.address && (
                 <p className="text-sm font-medium text-destructive mt-1">{errors.dropoffLocation.address.message}</p>
             )}
              {/* Display coordinate errors if they exist */}
              {errors?.dropoffLocation?.coordinates && !errors?.dropoffLocation?.address && ( // Show coord error if address is valid
                 <p className="text-sm font-medium text-destructive mt-1">Could not get coordinates for dropoff.</p>
             )}
           </div>
         </div>
       {/* )} */}

    </div>
  );
};
