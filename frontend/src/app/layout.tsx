import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PayGuard | Financial Ledger System',
  description: 'Double-entry bookkeeping ledger with ACID row-locking, Redis rate limiting, and race-condition elimination.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink-bg text-ink-primary antialiased">
        {children}
      </body>
    </html>
  );
}
