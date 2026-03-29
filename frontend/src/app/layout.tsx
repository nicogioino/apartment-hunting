import type { Metadata } from 'next';
import './globals.css';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Apartment Hunter',
  description: 'AI-ranked apartment listings from ZonaProp',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={cn('dark font-sans', geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
