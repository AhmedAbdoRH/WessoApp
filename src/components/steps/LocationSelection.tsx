"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import type { BookingFormData } from '../BookingForm';
import { cn } from '@/lib/utils'; // Import the cn utility function
// Import Google Maps components if API key is available
// import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

// IMPORTANT: Replace with your actual Google Maps API Key
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; // Store in .env.local

export const LocationSelection: FC<{ errors: any }> = ({ errors }) => { // Receive errors prop
  const { control, setValue } = useFormContext<BookingFormData>();

  // Placeholder function for handling map clicks or search results
  const handleLocationSelect = (type: 'pickup' | 'dropoff', address: string) => {
     // In a real app, you'd use geocoding here to get actual coordinates
     console.log(`Selected ${type}: ${address}`);
     // Use dummy coordinates for now
     const dummyCoordinates = { latitude: 34.0522, longitude: -118.2437 };

     if (type === 'pickup') {
       // Update both address and coordinates
       setValue('pickupLocation', { address: address, coordinates: dummyCoordinates }, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
     } else {
        setValue('dropoffLocation', { address: address, coordinates: dummyCoordinates }, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
     }
   };


  return (
    <div className="space-y-6">
      <Label className="text-xl font-semibold text-foreground block mb-4">Set Route</Label>
       <p className="text-sm text-muted-foreground mb-6">Enter your pickup and destination points.</p>

       {/* Use APIProvider if API key is available */}
      {/* {GOOGLE_MAPS_API_KEY ? (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <div className="h-64 w-full rounded-lg overflow-hidden glass-card p-0 border-none shadow-inner">
            <Map
              defaultCenter={{ lat: 34.0522, lng: -118.2437 }} // Example: Los Angeles
              defaultZoom={10}
              mapId="clearride-map" // Optional: For custom styling
              className="w-full h-full"
            >
               {/* Add Markers and search functionality here */}
               {/* Example Marker: <Marker position={{ lat: 34.0522, lng: -118.2437 }} /> */}
            {/* </Map>
          </div>
        </APIProvider>
      ) : (
        <div className="h-64 w-full rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground glass-card p-0 border-none shadow-inner">
          Map requires Google Maps API Key
        </div>
      )} */}

       {/* Input fields for pickup and dropoff */}
      <div className="space-y-4">
         <div>
           <Label htmlFor="pickupLocation" className="text-sm font-medium text-foreground flex items-center mb-1">
             <MapPin className="w-4 h-4 mr-2 text-primary" /> Pickup Location
           </Label>
           <Controller
             name="pickupLocation.address" // Control the address field
             control={control}
             rules={{ required: 'Pickup location is required' }} // Add basic required rule if needed
             render={({ field }) => (
               <Input
                 id="pickupLocation"
                 {...field} // Spread field props (onChange, onBlur, value, name, ref)
                 placeholder="Enter pickup address"
                 className={cn("glass-input", errors?.pickupLocation?.address ? "border-destructive" : "")}
                 // Optionally call handleLocationSelect on blur or debounce
                 onBlur={() => handleLocationSelect('pickup', field.value)}
                 aria-invalid={errors?.pickupLocation?.address ? "true" : "false"}
               />
             )}
           />
           {errors?.pickupLocation?.address && (
             <p className="text-sm font-medium text-destructive mt-1">{errors.pickupLocation.address.message}</p>
           )}
            {/* Display coordinate errors if they exist (though they are optional in schema) */}
           {errors?.pickupLocation?.coordinates && (
             <p className="text-sm font-medium text-destructive mt-1">Invalid coordinates for pickup.</p>
           )}
         </div>

         <div>
           <Label htmlFor="dropoffLocation" className="text-sm font-medium text-foreground flex items-center mb-1">
             <MapPin className="w-4 h-4 mr-2 text-accent" /> Dropoff Location
           </Label>
           <Controller
             name="dropoffLocation.address" // Control the address field
             control={control}
             rules={{ required: 'Dropoff location is required' }} // Add basic required rule if needed
             render={({ field }) => (
               <Input
                 id="dropoffLocation"
                  {...field} // Spread field props
                 placeholder="Enter dropoff address"
                  className={cn("glass-input", errors?.dropoffLocation?.address ? "border-destructive" : "")}
                 // Optionally call handleLocationSelect on blur or debounce
                  onBlur={() => handleLocationSelect('dropoff', field.value)}
                  aria-invalid={errors?.dropoffLocation?.address ? "true" : "false"}
               />
             )}
           />
           {errors?.dropoffLocation?.address && (
             <p className="text-sm font-medium text-destructive mt-1">{errors.dropoffLocation.address.message}</p>
           )}
            {/* Display coordinate errors if they exist */}
            {errors?.dropoffLocation?.coordinates && (
             <p className="text-sm font-medium text-destructive mt-1">Invalid coordinates for dropoff.</p>
           )}
         </div>
      </div>

    </div>
  );
};
