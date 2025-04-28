
# ClearRide Booking App

This is a Next.js application for booking personal car services, built with a focus on a smooth user experience and a glassmorphism design.

## Features

- Multi-step booking form
- Car type and model selection
- Passenger and bag count specification
- Location selection (requires Google Maps API Key)
- User details input
- Order summary review
- WhatsApp integration for submitting booking requests

## Getting Started

1.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

2.  **Set up Environment Variables:**
    Create a `.env.local` file in the root of the project and add your Google Maps API Key:
    ```env
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
    ```
    You can obtain an API key from the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/overview). Make sure to enable the "Maps JavaScript API" and "Places API". For security, restrict the key to your domain(s).

3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

4.  Open [http://localhost:9002](http://localhost:9002) (or your specified port) with your browser to see the result.

## Project Structure

- `src/app/`: Contains the main application pages and layout (using Next.js App Router).
- `src/components/`: Reusable UI components, including the multi-step form structure (`BookingForm.tsx`) and individual step components (`steps/`).
- `src/components/ui/`: ShadCN UI components.
- `src/hooks/`: Custom React hooks (`useToast`, `use-mobile`).
- `src/lib/`: Utility functions (`utils.ts`).
- `src/services/`: Placeholder service functions (e.g., `location.ts`).
- `public/`: Static assets.
- `styles/`: Global CSS and Tailwind configuration.

## Customization

- **Styling**: Modify `src/app/globals.css` and `tailwind.config.ts` to change the theme, colors, and glassmorphism effects.
- **WhatsApp Number**: Update the `targetPhoneNumber` variable in `src/components/BookingForm.tsx` to the desired WhatsApp number for receiving bookings.
- **Car Models**: Edit the `allCarModels` array in `src/components/steps/CarModelSelection.tsx` to reflect available vehicle models.
- **Google Maps**: Ensure your API key is correctly set up in `.env.local` for map and autocomplete functionality. Implement actual geocoding in `src/components/steps/LocationSelection.tsx` if needed beyond the simulation.
