// src/app/page.tsx

import BookingForm from '@/components/BookingForm';
import { getAppConfig } from '@/services/adminService';
import { CarFront, Cog } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ClientOnly from '@/components/ClientOnly'; 

export default async function Home() {
  const appConfig = await getAppConfig();
  const appName = appConfig?.appName || 'ClearRide'; // appName is still fetched for alt text
  const logoUrl = "https://el-wesam.com/logo-m.png"; // Hardcoded logo URL

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 relative">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-center gap-3 mb-12 mt-8"> {/* Increased mb for more space after logo */}
          {logoUrl ? (
            <Image 
              src={logoUrl} 
              alt={`${appName} Logo`} 
              width={120} // Increased logo size significantly
              height={120} // Increased logo size significantly
              className="rounded-lg shadow-lg" // More prominent shadow and rounding
              data-ai-hint="app logo"
              priority // Prioritize loading the logo
            />
          ) : (
            <CarFront size={60} className="text-primary drop-shadow-lg" data-ai-hint="limousine car icon" /> // Larger icon with drop shadow
          )}
          {/* App name (h1) removed as per request */}
        </div>
        <ClientOnly>
          <BookingForm />
        </ClientOnly>
      </div>
      <ClientOnly>
        <Link href="/admin" className="admin-prominent-button" aria-label="لوحة التحكم">
          <Cog size={24} />
        </Link>
      </ClientOnly>
    </main>
  );
}
