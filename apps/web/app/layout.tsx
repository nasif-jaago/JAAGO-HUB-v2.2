import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'JAAGO HUB v2.2 — Enterprise NGO Platform',
  description: 'Enterprise Modular ERP for JAAGO Foundation Bangladesh',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'JAAGO HUB',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4EFE4' },
    { media: '(prefers-color-scheme: dark)', color: '#0F0F10' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${plusJakarta.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-brand selection:text-primary-foreground">
        {children}
      </body>
    </html>
  );
}
