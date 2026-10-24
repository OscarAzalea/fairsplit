'use client';

import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Sparkles, Loader2, DollarSign, FileCheck, ExternalLink } from 'lucide-react';
import { BalanceAuditResult, Inflow, Member, MemberRole, PayoutBatch, ReserveReallocation } from '@/lib/types';
import { centsToDollars } from '@/lib/fairsplit-math';

interface ExplainBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  inflows: Inflow[];
  payoutBatches: PayoutBatch[];
  reserveReallocations: ReserveReallocation[];
}

export const ExplainBalanceModal: React.FC<ExplainBalanceModalProps> = ({
  isOpen,
  onClose,
  member,
  inflows,
  payoutBatches,
  reserveReallocations,
}) => {
  const [audit, setAudit] = useState<BalanceAuditResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !member) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch('/api/explain-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: member.id,
        inflows,
        payoutBatches,
        reserveReallocations,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Audit fetch failed: ${res.statusText}`);
        return res.json();
      })
      .then((data: BalanceAuditResult) => {
        if (isMounted) setAudit(data);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to retrieve balance audit');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, member, inflows, payoutBatches, reserveReallocations]);

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-950/80 border border-blue-700/60 flex items-center justify-center text-xl">
              {member.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{member.name}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  {member.roleTitle}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI Transparent Financial Audit & Cryptographic Traceability
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs font-medium">
                Auditing deterministic cents across all epochs & PayPal events...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
              {error}
            </div>
          ) : audit ? (
            <>
              {/* Executive Summary Card */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-blue-950/50 via-slate-950 to-indigo-950/40 border border-blue-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>Plain-English Financial Audit</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">
                      {audit.aiProvider === 'gemini' ? 'Gemini API response' : 'Local heuristic fallback'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Verified Pending Balance</span>
                    <span className="text-xl font-extrabold text-emerald-400">
                      {audit.totalPendingDollars}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {audit.summary}
                </p>
              </div>

              {/* Inflow Ledger Itemization */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>Inflow Revenue Distributions</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Strict Integer Cents Allocation
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                      <tr>
                        <th className="p-3">Source Event</th>
                        <th className="p-3">Gross</th>
                        <th className="p-3">PayPal Fee</th>
                        <th className="p-3">Net Revenue</th>
                        <th className="p-3">Original Epoch Share</th>
                        <th className="p-3 text-right">Your Net Share</th>
                        <th className="p-3 text-center">Epoch Tie</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                      {audit.epochBreakdown.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-medium text-slate-200">{row.inflowSource}</td>
                          <td className="p-3 text-slate-400">{row.grossDollars}</td>
                          <td className="p-3 text-red-400">-{row.feeDollars}</td>
                          <td className="p-3 text-slate-300">{row.netDollars}</td>
                          <td className="p-3 font-semibold text-blue-300">
                            {row.epochVersion} ({(row.bps / 100).toFixed(1)}%)
                          </td>
                          <td className="p-3 text-right font-extrabold text-emerald-400">
                            +{row.memberShareDollars}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                              title={`SHA-256: ${row.verifiedEpochHash}`}
                            >
                              {row.verifiedEpochHash}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {audit.reserveReallocationHistory.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Unclaimed Reserve Reallocations</span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Epoch</th>
                          <th className="p-3 text-right">Before</th>
                          <th className="p-3 text-right">After</th>
                          <th className="p-3 text-right">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                        {audit.reserveReallocationHistory.map((row, i) => (
                          <tr key={`${row.date}-${row.epochVersion}-${i}`}>
                            <td className="p-3 text-slate-300">{row.date}</td>
                            <td className="p-3 font-semibold text-emerald-300">{row.epochVersion}</td>
                            <td className="p-3 text-right text-slate-300">{row.previousPendingDollars}</td>
                            <td className="p-3 text-right text-slate-200">{row.newPendingDollars}</td>
                            <td className="p-3 text-right font-bold text-emerald-400">{row.changeDollars}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payouts Deductions History */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <DollarSign className="w-4 h-4 text-blue-400" />
                  <span>Settled PayPal Distributions (Deductions)</span>
                </div>

                {audit.payoutHistory.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                    No payouts have been executed for this collaborator yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                        <tr>
                          <th className="p-3">Payout Date</th>
                          <th className="p-3">Batch Idempotency ID</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Settled Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                        {audit.payoutHistory.map((p, i) => (
                          <tr key={i} className="hover:bg-slate-800/40 transition">
                            <td className="p-3 text-slate-300">{p.date}</td>
                            <td className="p-3 font-mono text-[11px] text-slate-400">{p.batchId}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                                {p.status}
                              </span>
                            </td>
                            <td className="p-3 text-right font-extrabold text-blue-400">
                              -{p.amountDollars}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Cryptographic Attestation Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-200">
                    Trust Ledger Cryptographic Attestation
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {audit.integrityAttestation}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
