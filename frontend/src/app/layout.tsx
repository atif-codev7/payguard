import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PayGuard | High-Concurrency Financial Ledger System',
  description: 'Enterprise double-entry bookkeeping ledger with ACID row-locking, Redis rate limiting, and zero race-condition guarantees.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
