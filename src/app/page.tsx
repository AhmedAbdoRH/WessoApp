import BookingForm from '@/components/BookingForm';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-foreground drop-shadow-md">
          ClearRide Booking
        </h1>
        <BookingForm />
      </div>
       <Toaster />
    </main>
  );
}
