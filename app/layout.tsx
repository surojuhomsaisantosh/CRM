import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { BrandThemeApplier } from '@/app/crm/settings/brand-settings/BrandThemeApplier';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_COMPANY_NAME || 'CRM',
  description: 'High-performance CRM & Pipeline Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f7f8fa] text-[#0f1d33] antialiased">
        <BrandThemeApplier />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
