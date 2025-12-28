import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModalProvider } from '@/contexts/ModalContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: 'Kalesh - Watch Kaleshi Videos',
  description: 'Watch and share Kaleshi videos - The ultimate video platform for trending content',
  keywords: 'Kalesh, Kaleshi, videos, watch videos, share videos, video platform, trending videos, viral videos',
  authors: [{ name: 'Kalesh' }],
  openGraph: {
    title: 'Kalesh - Watch Kaleshi Videos',
    description: 'Watch and share Kaleshi videos - The ultimate video platform for trending content',
    type: 'website',
    siteName: 'Kalesh',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kalesh - Watch Kaleshi Videos',
    description: 'Watch and share Kaleshi videos - The ultimate video platform for trending content',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="bg-black font-poppins antialiased">
        <NotificationProvider>
          <ModalProvider>
            <AuthProvider>
              <Header />
              <main className="w-full">{children}</main>
              <MobileNav />
            </AuthProvider>
          </ModalProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}

