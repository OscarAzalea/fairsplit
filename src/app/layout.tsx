import type { Metadata } from 'next';
import './globals.css';
import { IntegrationStatusBar } from '@/components/IntegrationStatusBar';

export const metadata: Metadata = {
  title: 'FairSplit | PayPal AI Hackathon 2026',
  description:
    'FairSplit demo for creative teams: PayPal Sandbox checkout, Gemini-assisted split negotiation, SHA-256 epoch integrity checks, and simulated payout previews.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-slate-950 text-slate-100 antialiased">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
        <IntegrationStatusBar />
        {children}
      </body>
    </html>
  );
}
