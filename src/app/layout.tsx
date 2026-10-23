import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FairSplit | PayPal AI Hackathon 2026',
  description:
    'Fintech web app for collaborative creative teams (Project Aurora). Append-only SHA-256 Trust Ledger, Gemini Socratic AI rev-share negotiation, and PayPal Orders & Payouts APIs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-slate-950 text-slate-100 antialiased">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
