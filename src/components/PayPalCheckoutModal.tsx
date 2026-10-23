'use client';

import React, { useState } from 'react';
import {
  X,
  Lock,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Loader2,
  ArrowRight,
  ExternalLink,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { Epoch, Inflow, InflowAllocation } from '@/lib/types';
import { centsToDollars, dollarsToCents, calculatePayPalFeeCents, allocateCentsFairly } from '@/lib/fairsplit-math';

interface PayPalCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEpoch: Epoch;
  source: string;
  grossDollars: number;
  onSuccess: (inflow: Inflow) => void;
}

export const PayPalCheckoutModal: React.FC<PayPalCheckoutModalProps> = ({
  isOpen,
  onClose,
  activeEpoch,
  source,
  grossDollars,
  onSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'paypal' | 'card'>('paypal');
  const [testBuyer, setTestBuyer] = useState<'gamer' | 'patron' | 'distributor'>('gamer');
  const [stage, setStage] = useState<'checkout' | 'authorizing' | 'success'>('checkout');
  const [orderResult, setOrderResult] = useState<{
    orderId: string;
    captureId: string;
    inflow: Inflow;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const grossCents = dollarsToCents(grossDollars);
  const feeCents = calculatePayPalFeeCents(grossCents);
  const netCents = Math.max(0, grossCents - feeCents);
  const allocations = allocateCentsFairly(netCents, activeEpoch.splits);

  const buyerProfiles = {
    gamer: {
      name: 'Alex Gamer (Steam Player)',
      email: 'alex.gamer-buyer@sandbox.paypal.com',
      wallet: 'PayPal Balance ($5,000.00 USD)',
    },
    patron: {
      name: 'Sarah Chen (OST Collector)',
      email: 'sarah.collector@sandbox.paypal.com',
      wallet: 'Visa ending in 4242',
    },
    distributor: {
      name: 'Indie Bundle Distributor',
      email: 'distro.payments@sandbox.paypal.com',
      wallet: 'PayPal Corporate Account',
    },
  };

  const currentBuyer = buyerProfiles[testBuyer];

  const handleExecutePayment = async () => {
    setStage('authorizing');
    setErrorMessage(null);

    try {
      // 1. Create PayPal Sandbox Order
      const createRes = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountDollars: grossDollars,
          description: source,
        }),
      });

      if (!createRes.ok) throw new Error('PayPal Order creation failed');
      const orderData = await createRes.json();
      const orderId = orderData.id;

      // 2. Capture PayPal Sandbox Order
      const captureRes = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amountDollars: grossDollars,
        }),
      });

      if (!captureRes.ok) throw new Error('PayPal Order capture failed');
      const captureData = await captureRes.json();
      const captureId =
        captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || `CAP-${Date.now()}`;

      // 3. Construct permanent Inflow tied to active Epoch
      const now = new Date().toISOString();
      const newInflow: Inflow = {
        id: `INF-${Math.floor(100 + Math.random() * 900)}`,
        source,
        grossCents,
        feeCents,
        netCents,
        currency: 'USD',
        timestamp: now,
        paypalOrderId: orderId,
        epochId: activeEpoch.epochId,
        epochHash: activeEpoch.hash,
        allocations,
      };

      setOrderResult({ orderId, captureId, inflow: newInflow });
      setStage('success');
      onSuccess(newInflow);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'PayPal checkout failed');
      setStage('checkout');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-8">
        {/* Authentic PayPal Branded Top Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center text-white font-black tracking-tight text-lg">
              <span className="text-[#0079C1] italic">Pay</span>
              <span className="text-[#00457C] italic">Pal</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-950 text-blue-300 border border-blue-800">
              Developer Sandbox
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>TLS 1.3 Encrypted</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {stage === 'checkout' && (
            <>
              {/* Order Itemization Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <ShoppingBag className="w-4 h-4 text-blue-400" />
                    <span>Purchase Summary</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-900 text-slate-400 border border-slate-800">
                    Epoch {activeEpoch.version}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-semibold">{source}</span>
                    <span className="font-bold text-white">{centsToDollars(grossCents)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>PayPal Commercial Processing Fee (2.99% + $0.49):</span>
                    <span className="text-red-400 font-medium">-{centsToDollars(feeCents)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-xs">
                    <span className="text-slate-300 font-bold">Studio Net Revenue:</span>
                    <span className="text-emerald-400 font-extrabold">{centsToDollars(netCents)}</span>
                  </div>
                </div>
              </div>

              {/* Sandbox Buyer Persona Selector */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Sandbox Buyer Persona
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestBuyer('gamer')}
                    className={`p-2 rounded-xl border text-left text-xs transition ${
                      testBuyer === 'gamer'
                        ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <div className="font-bold truncate">Steam Player</div>
                    <div className="text-[10px] text-slate-500 truncate">Alex Gamer</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestBuyer('patron')}
                    className={`p-2 rounded-xl border text-left text-xs transition ${
                      testBuyer === 'patron'
                        ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <div className="font-bold truncate">OST Collector</div>
                    <div className="text-[10px] text-slate-500 truncate">Sarah Chen</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestBuyer('distributor')}
                    className={`p-2 rounded-xl border text-left text-xs transition ${
                      testBuyer === 'distributor'
                        ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <div className="font-bold truncate">Bundle Distro</div>
                    <div className="text-[10px] text-slate-500 truncate">Indie Partner</div>
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Buyer:</span>
                    <span className="text-slate-200 font-medium">{currentBuyer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="text-slate-300 font-mono">{currentBuyer.wallet}</span>
                  </div>
                </div>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950 border border-red-800 text-red-300 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Authentic PayPal Buttons */}
              <div className="space-y-3 pt-2">
                {/* Official Gold PayPal Button */}
                <button
                  type="button"
                  onClick={handleExecutePayment}
                  className="w-full h-12 rounded-full bg-[#FFC439] hover:bg-[#F2BA36] active:bg-[#E5AF30] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FFC439]/20 transition cursor-pointer"
                >
                  <span className="text-[#0079C1] italic text-base">Pay</span>
                  <span className="text-[#00457C] italic text-base">Pal</span>
                  <span className="text-slate-900 font-bold ml-1">({centsToDollars(grossCents)})</span>
                </button>

                {/* Secondary Card Button */}
                <button
                  type="button"
                  onClick={handleExecutePayment}
                  className="w-full h-12 rounded-full bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-slate-300" />
                  <span>Debit or Credit Card</span>
                </button>

                <p className="text-center text-[10px] text-slate-500 pt-1">
                  Simulated via PayPal Sandbox Orders API (`/v2/checkout/orders`)
                </p>
              </div>
            </>
          )}

          {stage === 'authorizing' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-950/80 border border-blue-700 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Contacting PayPal Sandbox Gateway...</h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  Authorizing order, computing commercial fee deduction, and cryptographically stamping to Epoch {activeEpoch.version}.
                </p>
              </div>
            </div>
          )}

          {stage === 'success' && orderResult && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-600 mx-auto flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Payment Captured & Anchored!</h3>
                <p className="text-xs text-slate-400">
                  Customer transaction successfully settled through the PayPal Orders API.
                </p>
              </div>

              {/* Receipt Details */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>PayPal Order ID:</span>
                  <span className="font-mono text-blue-400 font-bold">{orderResult.orderId}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>PayPal Capture ID:</span>
                  <span className="font-mono text-slate-300">{orderResult.captureId}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Gross Settled:</span>
                  <span className="text-white font-bold">{centsToDollars(grossCents)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>PayPal Fee:</span>
                  <span className="text-red-400 font-medium">-{centsToDollars(feeCents)}</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                  <span className="font-bold">Net Distributed:</span>
                  <span className="text-emerald-400 font-extrabold">{centsToDollars(netCents)}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                  <span>Anchored Epoch:</span>
                  <span className="font-mono text-emerald-400">{activeEpoch.version} ({orderResult.inflow.epochHash.slice(0, 10)}...)</span>
                </div>
              </div>

              {/* Done Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30"
              >
                Done (View in Trust Ledger)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
