import BookingForm from '@/components/BookingForm';
import { getAppConfig } from '@/services/adminService';
import { CarFront, Cog } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default async function Home() {
  const appConfig = await getAppConfig();
  const appName = appConfig?.appName || 'ClearRide';
  const logoUrl = appConfig?.logoUrl;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 relative">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-center gap-3 mb-8">
          {logoUrl ? (
            <Image 
              src={logoUrl} 
              alt={`${appName} Logo`} 
              width={60} 
              height={60} 
              className="rounded-md"
              data-ai-hint="app logo"
            />
          ) : (
            <CarFront size={48} className="text-primary" data-ai-hint="limousine car" />
          )}
          <h1 className="text-4xl font-bold text-center text-foreground drop-shadow-md">
            {appName}
          </h1>
        </div>
        <BookingForm />
      </div>
      <Link href="/admin" className="admin-prominent-button" aria-label="لوحة التحكم">
        <Cog size={24} />
      </Link>
    </main>
  );
}
