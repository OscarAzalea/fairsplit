'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, RefreshCw, Send, Sparkles } from 'lucide-react';

interface IntegrationStatus {
  paypalCheckout: {
    mode: 'sandbox' | 'simulated' | 'incomplete';
  };
  gemini: 'key-configured' | 'heuristic';
  payouts: 'simulated';
}

export const IntegrationStatusBar: React.FC = () => {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/integration-status', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Integration status unavailable');
        return (await response.json()) as IntegrationStatus;
      })
      .then((value) => {
        if (!cancelled) setStatus(value);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const geminiLabel = status?.gemini === 'key-configured'
    ? 'Gemini key set · fallback enabled'
    : status?.gemini === 'heuristic'
      ? 'AI heuristic demo'
      : loadError
        ? 'AI status unavailable'
        : 'Checking AI…';
  const paypalLabel = status?.paypalCheckout.mode === 'sandbox'
    ? 'PayPal Sandbox credentials set'
    : status?.paypalCheckout.mode === 'simulated'
      ? 'Checkout simulator'
      : status?.paypalCheckout.mode === 'incomplete'
        ? 'PayPal setup incomplete'
        : loadError
          ? 'Checkout status unavailable'
          : 'Checking checkout…';

  return (
    <div className="border-b border-slate-800 bg-slate-950/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-medium text-slate-400" aria-live="polite">
          <span className="inline-flex items-center gap-1.5" title="Gemini is used when configured and available; AI features fall back to local heuristics on API errors.">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            {geminiLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
            {paypalLabel}
          </span>
          <span className="inline-flex items-center gap-1.5" title="Payout batch processing is simulated in this demo.">
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            Payout batches simulated
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-700 bg-slate-900 text-[10px] font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition"
          aria-label="Reset demo and restore the seeded example data"
          title="Restore the seeded demo data"
        >
          <RefreshCw className="w-3 h-3" />
          Reset demo
        </button>
      </div>
    </div>
  );
};
