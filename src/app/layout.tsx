import type {Metadata} from 'next';
import {Geist} from 'next/font/google';
import './globals.css';
import FartButton from '@/components/FartButton';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FB Images',
  description: '',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
        <FartButton />
      </body>
    </html>
  );
}

