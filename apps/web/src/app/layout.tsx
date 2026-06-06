import type { Metadata } from 'next';
import { Instrument_Serif, DM_Sans } from 'next/font/google';
import './globals.css';

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

export const metadata: Metadata = {
  title: 'RetentIQ — Customer Health Intelligence',
  description:
    'Spot SaaS churn risk 30–60 days early. AI-powered health scores, smart alerts, and retention playbooks.',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${dmSans.variable} dark h-full`}>
      <body className="font-sans antialiased text-slate-200 bg-[#020205] h-full">{children}</body>
    </html>
  );
}
