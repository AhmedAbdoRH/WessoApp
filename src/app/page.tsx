import BookingForm from '@/components/BookingForm';
import { CarFront } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-foreground drop-shadow-md flex items-center justify-center gap-3">
          <CarFront size={40} className="text-primary" data-ai-hint="limousine car" />
          Wesso.App
        </h1>
        <BookingForm />
      </div>
      {/* Toaster is now in RootLayout */}
    </main>
  );
}
