import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DeFi Agent',
  description: 'Automated DeFi portfolio management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
