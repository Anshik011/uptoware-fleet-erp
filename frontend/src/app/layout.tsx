import type { Metadata } from 'next';
import './globals.css';
import { BrandingProvider } from '@/context/BrandingContext';
import { AuthProvider } from '@/context/AuthContext';
import { MineProvider } from '@/context/MineContext';
import { branding } from '@/config/branding';

export const metadata: Metadata = {
  title: `${branding.name} | Enterprise Operations Portal`,
  description: `${branding.company} - Commercial fleet operations, statutory compliance and dispatch management.`,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/branding/favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/branding/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/branding/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/branding/icon.png" />
      </head>
      <body className="h-full antialiased bg-slate-50 text-slate-900 overflow-hidden">
        <BrandingProvider>
          <AuthProvider>
            <MineProvider>
              {children}
            </MineProvider>
          </AuthProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
