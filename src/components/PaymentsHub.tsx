'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Send,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Code2,
  RefreshCw,
  ExternalLink,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
  Bot,
  X,
} from 'lucide-react';
import { Epoch, Inflow, Member, MemberRole, PayoutBatch, PayoutItem, PayoutStatus, PayoutRecommendation } from '@/lib/types';
import {
  allocateCentsFairly,
  calculatePayPalFeeCents,
  centsToDollars,
  dollarsToCents,
  bpsToPercent,
} from '@/lib/fairsplit-math';
import { PayPalCheckoutModal } from './PayPalCheckoutModal';
import { BatchPayoutReceiptModal } from './BatchPayoutReceiptModal';
import { Printer } from 'lucide-react';


interface PaymentsHubProps {
  members: Member[];
  activeEpoch: Epoch;
  inflows: Inflow[];
  payoutBatches: PayoutBatch[];
  onNewInflow: (inflow: Inflow) => void;
  onNewPayoutBatch: (batch: PayoutBatch) => void;
  payoutRecommendations?: PayoutRecommendation[];
  onDismissRecommendation?: (id: string) => void;
  onPreloadBatch?: (rec: PayoutRecommendation) => void;
  currentMember?: Member;
}

export const PaymentsHub: React.FC<PaymentsHubProps> = ({
  members,
  activeEpoch,
  inflows,
  payoutBatches,
  onNewInflow,
  onNewPayoutBatch,
  payoutRecommendations = [],
  onDismissRecommendation,
  onPreloadBatch,
  currentMember,
}) => {
  // Inflow Simulator State
  const [selectedPreset, setSelectedPreset] = useState<'steam' | 'bandcamp' | 'patreon' | 'custom'>('steam');
  const [inflowSource, setInflowSource] = useState<string>('Steam Early Access Launch Batch');
  const [inflowGrossDollars, setInflowGrossDollars] = useState<number>(2500.0);
  const [isInflowProcessing, setIsInflowProcessing] = useState<boolean>(false);
  const [inflowSuccessOrderId, setInflowSuccessOrderId] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);


  // Outflow / Payouts Batch Console State
  const [selectedMembersForPayout, setSelectedMembersForPayout] = useState<Set<MemberRole>>(
    new Set(['dev', 'artist', 'writer', 'composer'])
  );
  const [isPayoutProcessing, setIsPayoutProcessing] = useState<boolean>(false);
  const [showRawJsonPayload, setShowRawJsonPayload] = useState<boolean>(false);
  const [lastExecutedBatch, setLastExecutedBatch] = useState<PayoutBatch | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // Derive collaborator pending balances in cents
  const memberBalances: Record<MemberRole, number> = { dev: 0, artist: 0, writer: 0, composer: 0 };
  inflows.forEach((inflow) => {
    inflow.allocations.forEach((alloc) => {
      memberBalances[alloc.memberId] += alloc.cents;
    });
  });
  payoutBatches.forEach((batch) => {
    batch.items.forEach((item) => {
      if (item.status === 'SUCCESS') {
        memberBalances[item.memberId] -= item.amountCents;
      }
    });
  });

  // Handle Preset Inflow Selection
  const handleSelectPreset = (preset: 'steam' | 'bandcamp' | 'patreon' | 'custom') => {
    setSelectedPreset(preset);
    setInflowSuccessOrderId(null);
    if (preset === 'steam') {
      setInflowSource('Steam Sale Batch - Milestone 2 Expansion');
      setInflowGrossDollars(2500.0);
    } else if (preset === 'bandcamp') {
      setInflowSource('Bandcamp Deluxe OST & Stems Pack');
      setInflowGrossDollars(450.0);
    } else if (preset === 'patreon') {
      setInflowSource('Patreon Monthly Backer Pool');
      setInflowGrossDollars(125.0);
    }
  };

  // Compute live inflow preview values in cents
  const previewGrossCents = dollarsToCents(inflowGrossDollars || 0);
  const previewFeeCents = calculatePayPalFeeCents(previewGrossCents);
  const previewNetCents = Math.max(0, previewGrossCents - previewFeeCents);
  const previewAllocations = allocateCentsFairly(previewNetCents, activeEpoch.splits);

  // Trigger PayPal Orders API Capture
  const handleCaptureInflow = async () => {
    if (previewGrossCents <= 0) return;
    setIsInflowProcessing(true);
    setInflowSuccessOrderId(null);

    try {
      // 1. Create PayPal Order
      const createRes = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountDollars: inflowGrossDollars,
          description: inflowSource,
        }),
      });

      if (!createRes.ok) throw new Error('Order creation failed');
      const orderData = await createRes.json();
      const orderId = orderData.id;

      // 2. Capture PayPal Order
      const captureRes = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amountDollars: inflowGrossDollars,
        }),
      });

      if (!captureRes.ok) throw new Error('Order capture failed');

      // 3. Append to Trust Ledger with active epoch stamp
      const now = new Date().toISOString();
      const newInflow: Inflow = {
        id: `INF-${Math.floor(100 + Math.random() * 900)}`,
        source: inflowSource,
        grossCents: previewGrossCents,
        feeCents: previewFeeCents,
        netCents: previewNetCents,
        currency: 'USD',
        timestamp: now,
        paypalOrderId: orderId,
        epochId: activeEpoch.epochId,
        epochHash: activeEpoch.hash,
        allocations: previewAllocations,
      };

      onNewInflow(newInflow);
      setInflowSuccessOrderId(orderId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'PayPal order processing failed');
    } finally {
      setIsInflowProcessing(false);
    }
  };

  // Toggle member in payout batch
  const toggleMemberPayoutSelection = (role: MemberRole) => {
    setSelectedMembersForPayout((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  // Build items for payout batch
  const payoutItemsToExecute: PayoutItem[] = members
    .filter((m) => selectedMembersForPayout.has(m.id) && memberBalances[m.id] > 0)
    .map((m) => ({
      senderItemId: `ITEM-AURORA-${m.id.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      memberId: m.id,
      memberName: m.name,
      receiverEmail: m.paypalEmail,
      amountCents: memberBalances[m.id],
      currency: 'USD',
      status: 'PENDING' as PayoutStatus,
      note: `FairSplit settlement under active Epoch ${activeEpoch.version}`,
    }));

  const totalPayoutBatchCents = payoutItemsToExecute.reduce((sum, item) => sum + item.amountCents, 0);
  const senderBatchId = `BATCH-AURORA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Raw PayPal Payouts Payload for inspection
  const rawPayloadPreview = {
    sender_batch_header: {
      sender_batch_id: senderBatchId,
      email_subject: 'Your Project Aurora Rev-Share Payout is Here!',
      email_message: `FairSplit has verified and distributed your earnings under active epoch ${activeEpoch.version}.`,
      recipient_type: 'EMAIL',
    },
    items: payoutItemsToExecute.map((item) => ({
      recipient_type: 'EMAIL',
      amount: {
        value: (item.amountCents / 100).toFixed(2),
        currency: 'USD',
      },
      receiver: item.receiverEmail,
      note: item.note,
      sender_item_id: item.senderItemId,
    })),
  };

  // Execute PayPal Payouts Batch
  const handleExecutePayoutBatch = async () => {
    if (payoutItemsToExecute.length === 0) return;
    setIsPayoutProcessing(true);
    setLastExecutedBatch(null);

    try {
      const res = await fetch('/api/paypal/create-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderBatchId,
          items: payoutItemsToExecute,
        }),
      });

      if (!res.ok) throw new Error('Payout batch execution failed');
      const data = await res.json();

      const newBatch: PayoutBatch = {
        senderBatchId,
        payoutBatchId: data.payoutBatchId,
        timestamp: new Date().toISOString(),
        totalCents: totalPayoutBatchCents,
        status: data.status,
        items: data.items,
        rawPayload: data.rawPayload,
        rawResponse: data.rawResponse,
      };

      onNewPayoutBatch(newBatch);
      setLastExecutedBatch(newBatch);
      setIsReceiptModalOpen(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'PayPal Payouts batch failed');
    } finally {
      setIsPayoutProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Payments Engine
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">
              PayPal Sandbox APIs
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Inflow Simulator & Batch Payouts Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Simulate incoming sales captured through the PayPal Orders API, and execute idempotent
            batch distributions to all collaborators via the PayPal Payouts API.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Active Epoch: {activeEpoch.version}</span>
        </div>
      </div>

      {/* AI Payout Advisory Banner from Team Members */}
      {payoutRecommendations.filter((r) => r.status === 'PENDING_REVIEW').map((rec) => (
        <div
          key={rec.id}
          className="p-5 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 border border-blue-700/80 shadow-xl shadow-blue-950/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-300"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-cyan-600/20">
              <Bot className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white">
                  AI Payout Advisory: {rec.requesterName}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Target Window: {rec.recommendedDate}
                </span>
                {rec.isAnonymous && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                    Anonymous Mode (Identity Protected)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                {rec.feeOptimizationNote}
              </p>
              <div className="text-[11px] text-slate-400 font-mono">
                Stated Member Context: &ldquo;{rec.reasonOrNeed}&rdquo;
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => onPreloadBatch && onPreloadBatch(rec)}
              className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Review & Pre-Load Batch ({centsToDollars(rec.recommendedAmountCents)})</span>
            </button>

            {onDismissRecommendation && (
              <button
                onClick={() => onDismissRecommendation(rec.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Dismiss advisory"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Two Column Grid: Inflows (Orders API) & Outflows (Payouts API) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PANEL 1: INFLOWS (PayPal Orders API Simulator) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-700/60 flex items-center justify-center text-blue-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Inflows: PayPal Orders API</h2>
                <p className="text-xs text-slate-400">Capture revenue & tie immutably to active epoch</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
              /v2/checkout/orders
            </span>
          </div>

          {/* Quick Preset Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Quick Inflow Triggers
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset('steam')}
                className={`p-2.5 rounded-xl border text-left text-xs transition ${
                  selectedPreset === 'steam'
                    ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold truncate">Steam Batch</div>
                <div className="text-[11px] text-slate-400">$2,500.00</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('bandcamp')}
                className={`p-2.5 rounded-xl border text-left text-xs transition ${
                  selectedPreset === 'bandcamp'
                    ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold truncate">Bandcamp Pack</div>
                <div className="text-[11px] text-slate-400">$450.00</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('patreon')}
                className={`p-2.5 rounded-xl border text-left text-xs transition ${
                  selectedPreset === 'patreon'
                    ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold truncate">Patreon Pool</div>
                <div className="text-[11px] text-slate-400">$125.00</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('custom')}
                className={`p-2.5 rounded-xl border text-left text-xs transition ${
                  selectedPreset === 'custom'
                    ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold truncate">Custom Amount</div>
                <div className="text-[11px] text-slate-400">Manual</div>
              </button>
            </div>
          </div>

          {/* Source & Amount Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Channel / Source Description
              </label>
              <input
                type="text"
                value={inflowSource}
                onChange={(e) => setInflowSource(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Gross Amount ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={inflowGrossDollars}
                onChange={(e) => setInflowGrossDollars(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono font-bold"
              />
            </div>
          </div>

          {/* Deterministic Math & Fee Deduction Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Deterministic Fee Calculation</span>
              <span className="text-[10px] text-slate-400 font-mono">
                PayPal Standard: 2.99% + $0.49
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Gross Revenue</span>
                <span className="text-sm font-bold text-white">
                  {centsToDollars(previewGrossCents)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">PayPal Fee</span>
                <span className="text-sm font-bold text-red-400">
                  -{centsToDollars(previewFeeCents)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Net Distributed</span>
                <span className="text-sm font-black text-emerald-400">
                  {centsToDollars(previewNetCents)}
                </span>
              </div>
            </div>

            {/* Inflow Split Preview Table */}
            <div className="pt-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex justify-between">
                <span>Distribution Under Epoch {activeEpoch.version}</span>
                <span>Zero Float Drift (Hamilton-Hare)</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {previewAllocations.map((alloc) => (
                  <div
                    key={alloc.memberId}
                    className="p-2 rounded bg-slate-900/60 border border-slate-800/80"
                  >
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      {alloc.memberId} ({bpsToPercent(alloc.bps)})
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      {centsToDollars(alloc.cents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {inflowSuccessOrderId && (
            <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Captured! Order <strong>{inflowSuccessOrderId}</strong> stamped to Epoch{' '}
                  <strong>{activeEpoch.version}</strong>.
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">SHA-256 Anchored</span>
            </div>
          )}

          {/* Action Button: Opens Visual Authentic PayPal Checkout Modal */}
          <button
            onClick={() => setIsCheckoutModalOpen(true)}
            disabled={previewGrossCents <= 0}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-[#FFC439] hover:bg-[#F2BA36] active:bg-[#E5AF30] text-black text-xs font-black shadow-lg shadow-[#FFC439]/20 transition cursor-pointer disabled:opacity-50"
          >
            <span className="text-[#0079C1] italic text-sm">Pay</span>
            <span className="text-[#00457C] italic text-sm">Pal</span>
            <span>Launch Smart Checkout ({centsToDollars(previewGrossCents)})</span>
          </button>

          {/* Render Visual PayPal Checkout Modal */}
          <PayPalCheckoutModal
            isOpen={isCheckoutModalOpen}
            onClose={() => setIsCheckoutModalOpen(false)}
            activeEpoch={activeEpoch}
            source={inflowSource}
            grossDollars={inflowGrossDollars}
            onSuccess={(newInflow) => {
              onNewInflow(newInflow);
              setInflowSuccessOrderId(newInflow.paypalOrderId);
            }}
          />
        </div>


        {/* PANEL 2: OUTFLOWS (PayPal Payouts API Batch Distribution) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Outflows: PayPal Payouts API</h2>
                <p className="text-xs text-slate-400">Idempotent batch disbursement console</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              /v1/payments/payouts
            </span>
          </div>

          {/* Members Selection List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Select Collaborators for Batch Distribution</span>
              <span className="text-[10px] text-slate-400">
                Pending: {centsToDollars(totalPayoutBatchCents)}
              </span>
            </div>

            <div className="space-y-2">
              {members.map((member) => {
                const balance = memberBalances[member.id];
                const isSelected = selectedMembersForPayout.has(member.id);
                const hasBalance = balance > 0;

                return (
                  <div
                    key={member.id}
                    onClick={() => hasBalance && toggleMemberPayoutSelection(member.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                      isSelected && hasBalance
                        ? 'border-indigo-600 bg-indigo-950/30'
                        : hasBalance
                        ? 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        : 'border-slate-900 bg-slate-950/40 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected && hasBalance}
                        disabled={!hasBalance}
                        onChange={() => {}}
                        className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span className="text-xl">{member.avatar}</span>
                      <div>
                        <div className="text-xs font-bold text-white">{member.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {member.paypalEmail}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-emerald-400">
                        {centsToDollars(balance)}
                      </div>
                      <div className="text-[9px] font-mono text-slate-500">
                        ITEM-{member.id.toUpperCase()}-IDEMPOTENT
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Batch Metadata & Idempotency Key Info */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Idempotency Batch Header:</span>
              <span className="font-mono text-slate-200">{senderBatchId}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Target Receivers:</span>
              <span className="text-slate-200 font-bold">{payoutItemsToExecute.length} members</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Total Settlement:</span>
              <span className="text-emerald-400 font-extrabold">
                {centsToDollars(totalPayoutBatchCents)}
              </span>
            </div>
          </div>

          {/* Raw JSON Payload Inspector Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowRawJsonPayload((v) => !v)}
              className="flex items-center justify-between w-full py-1.5 px-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 hover:text-white transition"
            >
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span>Inspect Raw PayPal Payouts JSON Payload</span>
              </span>
              {showRawJsonPayload ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showRawJsonPayload && (
              <pre className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-48">
                {JSON.stringify(rawPayloadPreview, null, 2)}
              </pre>
            )}
          </div>

          {/* Success Banner if just executed */}
          {lastExecutedBatch && (
            <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>PayPal Batch {lastExecutedBatch.payoutBatchId} Processed!</span>
              </div>
              <p className="text-[11px] text-emerald-300/80">
                Successfully disbursed {centsToDollars(lastExecutedBatch.totalCents)} across{' '}
                {lastExecutedBatch.items.length} collaborators. Idempotent balances cleared.
              </p>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>View Official Settlement Receipt (PDF)</span>
              </button>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleExecutePayoutBatch}
            disabled={isPayoutProcessing || payoutItemsToExecute.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {isPayoutProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing PayPal Sandbox Batch Payout...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  Disburse Batch via PayPal Payouts ({centsToDollars(totalPayoutBatchCents)})
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Official PayPal Settlement Receipt Modal */}
      <BatchPayoutReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        batch={lastExecutedBatch}
        activeEpoch={activeEpoch}
      />
    </div>
  );
};
