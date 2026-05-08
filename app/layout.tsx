import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AuthSessionProvider from './session-provider';
import ServiceWorkerRegistrar from './service-worker-registrar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: { default: 'Mira Finance', template: '%s · Mira' },
  description: 'Organizador financeiro pessoal',
  applicationName: 'Mira Finance',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mira',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#212017',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AuthSessionProvider>
          <div className="mira" style={{ minHeight: '100dvh' }}>
            {children}
          </div>
        </AuthSessionProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
