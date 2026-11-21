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
    <html lang="en" className="h-full bg-slate-900">
      <body className="min-h-full antialiased bg-slate-900 text-slate-900">
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
