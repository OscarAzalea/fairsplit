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
} from 'lucide-react';
import { Epoch, Inflow, Member, MemberRole, PayoutBatch } from '@/lib/types';
import { bpsToPercent, centsToDollars } from '@/lib/fairsplit-math';
import { ExplainBalanceModal } from './ExplainBalanceModal';
import { PayoutCertificateModal } from './PayoutCertificateModal';
import { FileText } from 'lucide-react';


interface CollaboratorBalancesProps {
  members: Member[];
  activeEpoch: Epoch;
  inflows: Inflow[];
  payoutBatches: PayoutBatch[];
  onNavigateToPayouts: () => void;
  currentMember?: Member;
}

export const CollaboratorBalances: React.FC<CollaboratorBalancesProps> = ({
  members,
  activeEpoch,
  inflows,
  payoutBatches,
  onNavigateToPayouts,
  currentMember,
}) => {
  const [selectedAuditMember, setSelectedAuditMember] = useState<Member | null>(null);
  const [selectedCertMember, setSelectedCertMember] = useState<Member | null>(null);


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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition"
          >
            <span>Execute Batch Payout</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
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
