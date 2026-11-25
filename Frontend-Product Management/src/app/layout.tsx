import type { Metadata } from 'next';
import './globals.css';
import ThemeRegistry from '@/components/ThemeRegistry';
import StoreProvider from '@/components/StoreProvider';

export const metadata: Metadata = {
  title: 'Management Portal - Billing & Shop Management',
  description: 'Enterprise Shop Billing, Inventory and Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <ThemeRegistry>
            {children}
          </ThemeRegistry>
        </StoreProvider>
      </body>
    </html>
  );
}
