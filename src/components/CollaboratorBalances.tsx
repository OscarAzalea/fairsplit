'use client';

import React, { useState } from 'react';
import {
  Wallet,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  ExternalLink,
  Coins,
  RefreshCw,
  TrendingUp,
  History,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Epoch, Inflow, Member, MemberRole, PayoutBatch } from '@/lib/types';
import { bpsToPercent, centsToDollars } from '@/lib/fairsplit-math';
import { ExplainBalanceModal } from './ExplainBalanceModal';
import { PayoutCertificateModal } from './PayoutCertificateModal';

interface CollaboratorBalancesProps {
  members: Member[];
  activeEpoch: Epoch;
  inflows: Inflow[];
  payoutBatches: PayoutBatch[];
  onNavigateToPayouts: () => void;
  currentMember?: Member;
  onSimulateQuickInflow?: (grossDollars?: number) => void;
  onReallocatePendingReserves?: () => void;
}

export const CollaboratorBalances: React.FC<CollaboratorBalancesProps> = ({
  members,
  activeEpoch,
  inflows,
  payoutBatches,
  onNavigateToPayouts,
  currentMember,
  onSimulateQuickInflow,
  onReallocatePendingReserves,
}) => {
  const [selectedAuditMember, setSelectedAuditMember] = useState<Member | null>(null);
  const [selectedCertMember, setSelectedCertMember] = useState<Member | null>(null);
  const [showLedgerHistory, setShowLedgerHistory] = useState<boolean>(true);
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  const triggerAlert = (msg: string) => {
    setActionAlert(msg);
    setTimeout(() => setActionAlert(null), 4000);
  };

  // Calculate balances per member in deterministic cents
  const memberBalances = members.map((member) => {
    let totalAllocatedCents = 0;
    let inflowCount = 0;

    inflows.forEach((inflow) => {
      const alloc = inflow.allocations.find((a) => a.memberId === member.id);
      if (alloc) {
        totalAllocatedCents += alloc.cents;
        inflowCount++;
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

    return {
      member,
      totalAllocatedCents,
      totalPaidOutCents,
      pendingBalanceCents,
      inflowCount,
      activeBps,
    };
  });

  const grandTotalPending = memberBalances.reduce((sum, m) => sum + m.pendingBalanceCents, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Notification Toast */}
      {actionAlert && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs flex items-center justify-between shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionAlert}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-xs text-emerald-400 hover:text-white underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Deterministic Settlement
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">
              Active Epoch {activeEpoch.version}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Collaborator Balance Registry & AI Audit Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Each collaborator&apos;s balance is derived deterministically down to the exact integer cent.
            Click &ldquo;Explain My Balance&rdquo; for an instant Gemini-powered audit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">
              Total Pending Reserve
            </div>
            <div className="text-lg font-black text-amber-400">
              {centsToDollars(grandTotalPending)}
            </div>
          </div>

          <button
            onClick={onNavigateToPayouts}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            <span>Execute Batch Payout</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Epoch Governance & Live Revenue Simulator Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-950/90 border border-blue-700/60 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            <Coins className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white">Active Contract Split ({activeEpoch.version}):</span>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300 font-bold">
                {activeEpoch.splits.map((s) => (
                  <span key={s.memberId} className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800">
                    {members.find((m) => m.id === s.memberId)?.name.split(' ')[0]}: {bpsToPercent(s.bps)}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Inflows are tied to the active epoch at arrival. Want to see balances update? Simulate an inflow or apply the new epoch to unwithdrawn reserves.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
          {onSimulateQuickInflow && (
            <button
              type="button"
              onClick={() => {
                onSimulateQuickInflow(1000);
                triggerAlert(`Simulated $1,000 inflow under Epoch ${activeEpoch.version}! Balances updated in real-time.`);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 transition cursor-pointer"
              title="Simulates a new $1,000 game sale split under the active epoch"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate +$1,000 Inflow ({activeEpoch.version})</span>
            </button>
          )}

          {onReallocatePendingReserves && (
            <button
              type="button"
              onClick={() => {
                onReallocatePendingReserves();
                triggerAlert(`Re-allocated all unwithdrawn reserves according to Epoch ${activeEpoch.version} splits!`);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer"
              title="Re-balance the entire unwithdrawn reserve according to the active epoch"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Apply {activeEpoch.version} to Unclaimed Reserves</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Member Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {memberBalances.map(
          ({
            member,
            totalAllocatedCents,
            totalPaidOutCents,
            pendingBalanceCents,
            inflowCount,
            activeBps,
          }) => {
            const isCurrent = currentMember?.id === member.id;
            return (
              <div
                key={member.id}
                className={`p-5 rounded-2xl bg-slate-900 border flex flex-col justify-between transition space-y-5 ${
                  isCurrent
                    ? 'border-blue-500/80 shadow-lg shadow-blue-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Member Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{member.avatar}</div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-white">{member.name}</h3>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{member.roleTitle}</p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                    {bpsToPercent(activeBps)} share
                  </span>
                </div>

                {/* Pending Balance Spotlight */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Unclaimed Pending Balance
                  </span>
                  <div className="text-2xl font-black text-emerald-400 tracking-tight">
                    {centsToDollars(pendingBalanceCents)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {pendingBalanceCents.toLocaleString()} integer cents
                  </div>
                </div>

                {/* Next Inflow Projection */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Active Rate ({activeEpoch.version}):</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {bpsToPercent(activeBps)} (+{centsToDollars(Math.round(100000 * (activeBps / 10000)))} / $1k)
                  </span>
                </div>

                {/* Financial Metrics */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Gross Allocations:</span>
                    <span className="text-slate-200 font-medium">
                      {centsToDollars(totalAllocatedCents)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Settled Payouts:</span>
                    <span className="text-blue-400 font-medium">
                      -{centsToDollars(totalPaidOutCents)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Inflows Captured:</span>
                    <span className="text-slate-200 font-medium">{inflowCount} events</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
                    <span>PayPal Destination:</span>
                    <span className="text-slate-300 font-mono truncate max-w-[120px]" title={member.paypalEmail}>
                      {member.paypalEmail}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAuditMember(member)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition border border-slate-700/60 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Explain My Balance (AI)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCertMember(member)}
                    className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 text-[11px] font-medium transition border border-slate-800 hover:border-emerald-800/60 cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-emerald-400" />
                    <span>Export Audit Certificate</span>
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Historical Inflow Attribution & Trust Ledger Section */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-700/60 flex items-center justify-center text-blue-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Inflow Settlement & Epoch Attribution Ledger
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                  {inflows.length} Events
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Transparent cryptographic tie connecting every PayPal customer dollar to the governing epoch split
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLedgerHistory(!showLedgerHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <span>{showLedgerHistory ? 'Collapse History' : 'Expand History'}</span>
            {showLedgerHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showLedgerHistory && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-950/80 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Inflow ID & Source</th>
                  <th className="py-2.5 px-3">Gross / Fee</th>
                  <th className="py-2.5 px-3">Net Allocated</th>
                  <th className="py-2.5 px-3">Contract Epoch</th>
                  <th className="py-2.5 px-3">Dev Share</th>
                  <th className="py-2.5 px-3">Artist Share</th>
                  <th className="py-2.5 px-3">Writer Share</th>
                  <th className="py-2.5 px-3">Composer Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {inflows.map((inf) => {
                  const devShare = inf.allocations.find((a) => a.memberId === 'dev')?.cents ?? 0;
                  const artistShare = inf.allocations.find((a) => a.memberId === 'artist')?.cents ?? 0;
                  const writerShare = inf.allocations.find((a) => a.memberId === 'writer')?.cents ?? 0;
                  const composerShare = inf.allocations.find((a) => a.memberId === 'composer')?.cents ?? 0;

                  return (
                    <tr key={inf.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{inf.source}</div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <span>{inf.id}</span>
                          <span>&bull;</span>
                          <span>{new Date(inf.timestamp).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <div className="text-slate-200">{centsToDollars(inf.grossCents)}</div>
                        <div className="text-[10px] text-slate-500">-{centsToDollars(inf.feeCents)} fee</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        {centsToDollars(inf.netCents)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                          {inf.epochId.replace('epoch-', '')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-200">{centsToDollars(devShare)}</td>
                      <td className="py-3 px-3 font-mono text-slate-200">{centsToDollars(artistShare)}</td>
                      <td className="py-3 px-3 font-mono text-slate-200">{centsToDollars(writerShare)}</td>
                      <td className="py-3 px-3 font-mono text-slate-200">{centsToDollars(composerShare)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Explain Balance Modal */}
      <ExplainBalanceModal
        isOpen={selectedAuditMember !== null}
        onClose={() => setSelectedAuditMember(null)}
        member={selectedAuditMember}
        inflows={inflows}
        payoutBatches={payoutBatches}
      />

      {/* Cryptographic Payout Certificate Modal */}
      <PayoutCertificateModal
        isOpen={selectedCertMember !== null}
        onClose={() => setSelectedCertMember(null)}
        member={selectedCertMember}
        activeEpoch={activeEpoch}
        inflows={inflows}
        payoutBatches={payoutBatches}
      />
    </div>
  );
};
