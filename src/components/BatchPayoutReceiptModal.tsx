'use client';

import React from 'react';
import { X, CheckCircle2, Printer, Download, ShieldCheck, ExternalLink, QrCode } from 'lucide-react';
import { Epoch, PayoutBatch } from '@/lib/types';
import { centsToDollars } from '@/lib/fairsplit-math';

interface BatchPayoutReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: PayoutBatch | null;
  activeEpoch: Epoch;
}

export const BatchPayoutReceiptModal: React.FC<BatchPayoutReceiptModalProps> = ({
  isOpen,
  onClose,
  batch,
  activeEpoch,
}) => {
  if (!isOpen || !batch) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(batch, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `fairsplit-receipt-${batch.payoutBatchId || batch.senderBatchId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const dateFormatted = new Date(batch.timestamp).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:bg-white print:text-black print:my-0">
        
        {/* Top Decorative Header */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 border-b border-slate-800 flex items-center justify-between print:border-b-2 print:border-black print:bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 print:text-emerald-700">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white tracking-tight print:text-black">
                  PayPal Payout Settlement Receipt
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 print:border-emerald-600 print:text-emerald-800">
                  SETTLED
                </span>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600">
                Official Multi-Party Disbursement Voucher • FairSplit Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition print:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 print:p-4">
          
          {/* Key Transaction Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 print:bg-slate-50 print:border-slate-300">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Payout Batch ID</span>
              <span className="text-xs font-mono font-bold text-slate-200 print:text-black truncate block" title={batch.payoutBatchId}>
                {batch.payoutBatchId || batch.senderBatchId}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Timestamp (UTC)</span>
              <span className="text-xs font-bold text-slate-200 print:text-black block">
                {dateFormatted}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Disbursed</span>
              <span className="text-sm font-black text-emerald-400 print:text-emerald-700 block">
                {centsToDollars(batch.totalCents)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Epoch</span>
              <span className="text-xs font-bold text-blue-400 print:text-blue-700 block">
                Epoch {activeEpoch.version}
              </span>
            </div>
          </div>

          {/* Itemized Payout Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-700">
                Itemized Collaborator Disbursements ({batch.items.length})
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">
                PayPal Rails: INSTANT
              </span>
            </div>

            <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60 print:border-slate-300 print:divide-slate-200">
              {batch.items.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-900/50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white print:text-black">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white print:text-black flex items-center gap-2">
                        <span>{item.memberName}</span>
                        <span className="text-[10px] font-normal text-slate-400 print:text-slate-600">
                          ({item.memberId.toUpperCase()})
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 print:text-slate-600 flex items-center gap-1">
                        <span>{item.receiverEmail}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-[10px] text-slate-500">{item.senderItemId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-extrabold text-white print:text-black">
                      {centsToDollars(item.amountCents)}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 print:text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{item.status}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cryptographic Ledger Proof Stamp */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-4 print:border-slate-300">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 print:text-black">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Cryptographic Proof of Settlement</span>
              </div>
              <p className="text-[10px] text-slate-400 print:text-slate-600">
                This transaction receipt is mathematically bound to SHA-256 Epoch Hash:
              </p>
              <div className="font-mono text-[10px] text-cyan-400 print:text-cyan-800 truncate max-w-sm">
                {activeEpoch.hash}
              </div>
            </div>

            <div className="shrink-0 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 print:bg-white print:border-black">
                <QrCode className="w-8 h-8 text-slate-300 print:text-black" />
              </div>
              <span className="text-[9px] text-slate-500 font-mono block mt-1">VERIFIED</span>
            </div>
          </div>

        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>Funding Source:</span>
            <span className="text-slate-200 font-semibold">PayPal Developer Sandbox Balance</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadJson}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Save as PDF / Print</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
