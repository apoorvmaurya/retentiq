import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, DM_Sans } from 'next/font/google';
import './globals.css';

import { ToastProvider } from '@/components/Toast';
import CommandMenu from '@/components/CommandMenu';
import CookieBanner from '@/components/CookieBanner';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://retentiq-chi.vercel.app'),
  title: 'RetentIQ — Customer Health Intelligence',
  description:
    'Spot SaaS churn risk 30–60 days early. AI-powered health scores, smart alerts, and retention playbooks.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.ico',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'RetentIQ — Customer Health Intelligence',
    description:
      'Spot SaaS churn risk 30–60 days early. AI-powered health scores, smart alerts, and retention playbooks.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RetentIQ — Customer Health Intelligence',
      },
    ],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://retentiq.com/#organization',
      name: 'RetentIQ',
      url: 'https://retentiq.com',
      logo: 'https://retentiq.com/og-image.png',
      sameAs: [
        'https://twitter.com/retentiq',
        'https://github.com/retentiq',
        'https://linkedin.com/company/retentiq',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://retentiq.com/#website',
      url: 'https://retentiq.com',
      name: 'RetentIQ',
      publisher: {
        '@id': 'https://retentiq.com/#organization',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://retentiq.com/#software',
      name: 'RetentIQ',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'All',
      offers: {
        '@type': 'Offer',
        price: '49.00',
        priceCurrency: 'USD',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${dmSans.variable} dark`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased text-slate-200 bg-[#020205] relative">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#00D4FF] focus:text-[#0A0F1E] focus:rounded-md focus:font-bold focus:outline-none focus:ring-2 focus:ring-[#00D4FF]"
        >
          Skip to main content
        </a>
        <ToastProvider>
          <div id="main-content" tabIndex={-1} className="outline-none min-h-screen">
            {children}
          </div>
        </ToastProvider>
        <CommandMenu />
        <CookieBanner />
      </body>
    </html>
  );
}
