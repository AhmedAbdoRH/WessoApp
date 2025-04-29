import type { Metadata } from 'next';
// Consider using an Arabic font, e.g., Tajawal or Cairo
// import { Cairo } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider'; // Import ThemeProvider
import { Toaster } from '@/components/ui/toaster'; // Import Toaster globally

// Example using Cairo font
// const cairo = Cairo({
//   variable: '--font-cairo',
//   subsets: ['arabic', 'latin'],
//   display: 'swap', // Ensure text is visible while font loads
// });

export const metadata: Metadata = {
  // Update metadata for Arabic
  title: 'تطبيق حجز كلير رايد',
  description: 'تم إنشاؤه بواسطة Firebase Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Add lang="ar" and dir="rtl" and force dark theme
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
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
