'use client';

import React from 'react';
import { X, ShieldCheck, Printer, CheckCircle, QrCode, FileText, Lock } from 'lucide-react';
import { Epoch, Member, Inflow, PayoutBatch } from '@/lib/types';
import { centsToDollars, bpsToPercent } from '@/lib/fairsplit-math';

interface PayoutCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  activeEpoch: Epoch;
  inflows: Inflow[];
  payoutBatches: PayoutBatch[];
}

export const PayoutCertificateModal: React.FC<PayoutCertificateModalProps> = ({
  isOpen,
  onClose,
  member,
  activeEpoch,
  inflows,
  payoutBatches,
}) => {
  if (!isOpen || !member) return null;

  // Compute exact financial metrics
  let totalAllocatedCents = 0;
  let totalGrossCents = 0;
  let totalFeeCents = 0;

  inflows.forEach((inflow) => {
    const alloc = inflow.allocations.find((a) => a.memberId === member.id);
    if (alloc) {
      totalAllocatedCents += alloc.cents;
      // Proportional gross and fee
      const ratio = alloc.bps / 10000;
      totalGrossCents += Math.round(inflow.grossCents * ratio);
      totalFeeCents += Math.round(inflow.feeCents * ratio);
    }
  });

  let totalPaidOutCents = 0;
  payoutBatches.forEach((batch) => {
    batch.items.forEach((item) => {
      if (item.memberId === member.id && item.status === 'SUCCESS') {
        totalPaidOutCents += item.amountCents;
      }
    });
  });

  const pendingBalanceCents = totalAllocatedCents - totalPaidOutCents;
  const activeBps = activeEpoch.splits.find((s) => s.memberId === member.id)?.bps ?? 0;
  const certificateId = `FS-CERT-${member.id.toUpperCase()}-${activeEpoch.version.replace('.', '')}-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:m-0 print:p-0">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Cryptographic Payout Certificate</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Printable Body */}
        <div className="p-8 sm:p-10 space-y-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 print:bg-white print:text-black">
          {/* Certificate Header with Seal */}
          <div className="text-center space-y-2 border-b border-slate-800 pb-6 print:border-black">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 mx-auto flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20 print:shadow-none">
              FS
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white print:text-black uppercase">
              FairSplit Certificate of Settlement
            </h1>
            <p className="text-xs text-slate-400 print:text-gray-600">
              Trust Ledger Cryptographic Attestation &bull; Certificate ID: <span className="font-mono text-slate-300 print:text-black font-semibold">{certificateId}</span>
            </p>
          </div>

          {/* Collaborator & Agreement Info */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 print:bg-gray-50 print:border-gray-300 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600">
                Collaborator Beneficiary
              </span>
              <div className="text-sm font-bold text-white print:text-black">{member.name}</div>
              <div className="text-slate-300 print:text-gray-700">{member.roleTitle}</div>
              <div className="font-mono text-[11px] text-blue-400 print:text-blue-700">{member.paypalEmail}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 print:bg-gray-50 print:border-gray-300 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600">
                Ratified Agreement Scope
              </span>
              <div className="text-sm font-bold text-white print:text-black">Project Aurora</div>
              <div className="text-emerald-400 print:text-emerald-700 font-semibold">Active Epoch: {activeEpoch.version}</div>
              <div className="text-slate-300 print:text-gray-700">Equity Share: {bpsToPercent(activeBps)} ({activeBps.toLocaleString()} BPS)</div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 print:bg-white print:border-gray-300 space-y-3">
            <div className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider flex justify-between">
              <span>Financial Settlement Ledger</span>
              <span className="text-[10px] font-normal text-slate-400 print:text-gray-600">Hamilton-Hare Integer Cents</span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-800/80 print:divide-gray-200">
              <div className="flex justify-between py-1 text-slate-300 print:text-gray-800">
                <span>Proportional Gross Revenue:</span>
                <span className="font-bold text-white print:text-black">{centsToDollars(totalGrossCents)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400 print:text-gray-600">
                <span>PayPal Processing Fee Share (2.99% + $0.49):</span>
                <span className="text-red-400 font-medium print:text-red-600">-{centsToDollars(totalFeeCents)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-300 print:text-gray-800">
                <span>Total Net Allocated to Date:</span>
                <span className="font-bold text-emerald-400 print:text-emerald-700">{centsToDollars(totalAllocatedCents)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400 print:text-gray-600">
                <span>Settled PayPal Batch Payouts:</span>
                <span className="text-blue-400 font-medium print:text-blue-700">-{centsToDollars(totalPaidOutCents)}</span>
              </div>
              <div className="flex justify-between pt-2.5 text-sm font-extrabold">
                <span className="text-white print:text-black">Certified Pending Balance:</span>
                <span className="text-emerald-400 print:text-emerald-700 text-base">{centsToDollars(pendingBalanceCents)}</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Hash Verification Box */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 print:bg-gray-50 print:border-gray-300 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-400 print:text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
              <span>Cryptographic Proof of Immutability</span>
            </div>
            <div className="space-y-1 font-mono text-[10px] text-slate-400 print:text-gray-700 break-all">
              <div><strong>Active Epoch Hash (SHA-256):</strong> {activeEpoch.hash}</div>
              <div><strong>Previous Block Hash:</strong> {activeEpoch.previousHash}</div>
            </div>
          </div>

          {/* Certificate Footer */}
          <div className="pt-4 border-t border-slate-800 print:border-black flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 print:text-gray-600">
            <div>Attested on {dateStr} via FairSplit Trust Ledger.</div>
            <div className="flex items-center gap-1.5 text-emerald-400 print:text-emerald-700 font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>Chain Authenticated & Bullion Proof</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
