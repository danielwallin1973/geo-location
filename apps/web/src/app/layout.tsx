import type { Metadata, Viewport } from 'next';
import '@/styles/globals.scss';

export const metadata: Metadata = {
  title: 'Geo Audio – museum i det offentliga rummet',
  description:
    'Lyssna på geologisk och historisk information om platser du passerar.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b0f14',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
