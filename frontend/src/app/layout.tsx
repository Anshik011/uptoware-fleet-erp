import type { Metadata } from 'next';
import './globals.css';
import { BrandingProvider } from '@/context/BrandingContext';
import { AuthProvider } from '@/context/AuthContext';
import { branding } from '@/config/branding';

export const metadata: Metadata = {
  title: `${branding.name} | Enterprise Operations Portal`,
  description: `${branding.company} - Commercial fleet operations, statutory compliance and dispatch management.`,
  icons: {
    icon: branding.assets.favicon,
    shortcut: branding.assets.favicon,
    apple: branding.assets.icon,
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
        <link rel="icon" href="/branding/favicon.png" type="image/png" />
      </head>
      <body className="h-full antialiased bg-slate-50 text-slate-900 overflow-hidden">
        <BrandingProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
