import type { Metadata } from 'next';
// Consider using an Arabic font, e.g., Tajawal or Cairo
// import { Cairo } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { getAppConfig } from '@/services/adminService'; // For app name

// Example using Cairo font
// const cairo = Cairo({
//   variable: '--font-cairo',
//   subsets: ['arabic', 'latin'],
//   display: 'swap', // Ensure text is visible while font loads
// });

// export const metadata: Metadata = {
//   // Update metadata for Arabic
//   title: 'ClearRide', // Default title
//   description: 'خدمة حجز سيارات شخصية', // Personalized car booking service
// };

export async function generateMetadata(): Promise<Metadata> {
  const appConfig = await getAppConfig();
  const appName = appConfig?.appName || 'ClearRide';
  return {
    title: `${appName} - حجز سيارات`,
    description: `احجز رحلتك القادمة مع ${appName}. خدمة توصيل سيارات شخصية متميزة.`,
  };
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Add lang="ar" and dir="rtl". Removed className="dark" to allow ThemeProvider to control theme.
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      {/* Apply the font variable if using a custom Arabic font */}
      {/* <body className={`${cairo.variable} font-sans antialiased`}> */}
      <body className={`antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark" // Default to dark theme
          enableSystem={false} // Disable system preference detection
          disableTransitionOnChange
        >
          {children}
           <Toaster /> {/* Render Toaster here so it's available on all pages */}
        </ThemeProvider>
      </body>
    </html>
  );
}

