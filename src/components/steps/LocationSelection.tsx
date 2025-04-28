"use client";

import type { FC } from 'react';
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import type { BookingFormData } from '../BookingForm';
// Import Google Maps components if API key is available
// import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

// IMPORTANT: Replace with your actual Google Maps API Key
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; // Store in .env.local

export const LocationSelection: FC = () => {
  const { control, formState: { errors }, setValue } = useFormContext<BookingFormData>();

  // Placeholder function for handling map clicks or search results
  const handleLocationSelect = (type: 'pickup' | 'dropoff', address: string) => {
     // In a real app, you'd use geocoding here
     console.log(`Selected ${type}: ${address}`);
     if (type === 'pickup') {
       setValue('pickupLocation', { address, coordinates: { latitude: 34.0522, longitude: -118.2437 } }, { shouldValidate: true }); // Dummy coords
     } else {
       setValue('dropoffLocation', { address, coordinates: { latitude: 34.0522, longitude: -118.2437 } }, { shouldValidate: true }); // Dummy coords
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
             name="pickupLocation.address"
             control={control}
             render={({ field }) => (
               <Input
                 id="pickupLocation"
                 {...field}
                 placeholder="Enter pickup address"
                 className="glass-input"
                 onChange={(e) => {
                   field.onChange(e);
                   // Optionally trigger search or suggestions here
                 }}
               />
             )}
           />
           {errors.pickupLocation?.address && (
             <p className="text-sm font-medium text-destructive mt-1">{errors.pickupLocation.address.message}</p>
           )}
             {/* Hidden inputs for coordinates if needed */}
             {/* <input type="hidden" {...register('pickupLocation.coordinates.latitude')} />
             <input type="hidden" {...register('pickupLocation.coordinates.longitude')} /> */}
         </div>

         <div>
           <Label htmlFor="dropoffLocation" className="text-sm font-medium text-foreground flex items-center mb-1">
             <MapPin className="w-4 h-4 mr-2 text-accent" /> Dropoff Location
           </Label>
           <Controller
             name="dropoffLocation.address"
             control={control}
             render={({ field }) => (
               <Input
                 id="dropoffLocation"
                 {...field}
                 placeholder="Enter dropoff address"
                 className="glass-input"
                 onChange={(e) => {
                   field.onChange(e);
                   // Optionally trigger search or suggestions here
                 }}
               />
             )}
           />
           {errors.dropoffLocation?.address && (
             <p className="text-sm font-medium text-destructive mt-1">{errors.dropoffLocation.address.message}</p>
           )}
            {/* Hidden inputs for coordinates if needed */}
             {/* <input type="hidden" {...register('dropoffLocation.coordinates.latitude')} />
             <input type="hidden" {...register('dropoffLocation.coordinates.longitude')} /> */}
         </div>
      </div>

    </div>
  );
};
