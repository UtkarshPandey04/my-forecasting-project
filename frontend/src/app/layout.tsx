import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AeroSense — Physics-Guided Atmospheric & Air Quality Intelligence',
  description: 'Research-grade coupled atmospheric and air pollution forecasting system for Delhi NCR up to 72 hours ahead.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#06090e] text-slate-100 min-h-screen selection:bg-sky-500/20 selection:text-sky-200 antialiased`}>
        {children}
      </body>
    </html>
  );
}
