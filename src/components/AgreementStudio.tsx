'use client';

import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Sparkles,
  CheckCircle,
  FileSignature,
  Layers,
  ArrowRight,
  Shield,
  HelpCircle,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Epoch, Member, MemberRole, RatificationSignature } from '@/lib/types';
import { bpsToPercent, TOTAL_BPS, rebalanceSplits } from '@/lib/fairsplit-math';
import { computeEpochHash, generateMemberSignatureHash } from '@/lib/crypto';
import { SocraticNegotiationDrawer } from './SocraticNegotiationDrawer';

interface AgreementStudioProps {
  members: Member[];
  activeEpoch: Epoch;
  epochs: Epoch[];
  onNewEpochRatified: (newEpoch: Epoch) => void;
}

export const AgreementStudio: React.FC<AgreementStudioProps> = ({
  members,
  activeEpoch,
  epochs,
  onNewEpochRatified,
}) => {
  // Current working splits in dials (BPS)
  const [splits, setSplits] = useState<Record<MemberRole, number>>(() => {
    const initial: Record<MemberRole, number> = { dev: 4000, artist: 3000, writer: 2000, composer: 1000 };
    activeEpoch.splits.forEach((s) => {
      initial[s.memberId] = s.bps;
    });
    return initial;
  });

  const [lockedMembers, setLockedMembers] = useState<Set<MemberRole>>(new Set());
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Ratification flow state
  const [isProposing, setIsProposing] = useState<boolean>(false);
  const [proposedVersion, setProposedVersion] = useState<string>('v2.0');
  const [proposalTitle, setProposalTitle] = useState<string>(
    'Milestone 2: Dynamic Audio & Expansion Agreement'
  );
  const [proposalDescription, setProposalDescription] = useState<string>(
    'Re-allocates proportional equity to account for extended dynamic audio engineering and procedural narrative assets.'
  );

  // Signatures for current proposal
  const [pendingSignatures, setPendingSignatures] = useState<Record<MemberRole, RatificationSignature | null>>({
    dev: null,
    artist: null,
    writer: null,
    composer: null,
  });

  const [ratifiedSuccess, setRatifiedSuccess] = useState<boolean>(false);

  // Toggle lock
  const toggleLock = (role: MemberRole) => {
    setLockedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        // Don't lock all members
        if (next.size < 3) {
          next.add(role);
        }
      }
      return next;
    });
  };

  // Handle slider change with proportional balancing
  const handleSplitChange = (role: MemberRole, newBps: number) => {
    const updated = rebalanceSplits(splits, role, newBps, lockedMembers);
    setSplits(updated);
  };

  // Check if splits differ from active epoch
  const hasChangesFromActive = members.some((m) => {
    const activeBps = activeEpoch.splits.find((s) => s.memberId === m.id)?.bps ?? 0;
    return splits[m.id] !== activeBps;
  });

  // Start Ratification
  const handleStartProposal = () => {
    setIsProposing(true);
    setRatifiedSuccess(false);
    // Reset signatures
    setPendingSignatures({
      dev: null,
      artist: null,
      writer: null,
      composer: null,
    });
  };

  // Sign Proposal as a specific member
  const handleSignAsMember = (role: MemberRole) => {
    const member = members.find((m) => m.id === role)!;
    const now = new Date().toISOString();
    const tempEpochHash = computeEpochHash(
      `epoch-${proposedVersion}`,
      proposedVersion,
      activeEpoch.hash,
      members.map((m) => ({ memberId: m.id, bps: splits[m.id] })),
      now
    );

    const sigHash = generateMemberSignatureHash(role, tempEpochHash, now);

    const newSig: RatificationSignature = {
      memberId: role,
      name: member.name,
      signedAt: now,
      signatureHash: sigHash,
      comment: `Ratified ${proposedVersion} split: ${bpsToPercent(splits[role])}`,
    };

    const nextSigs = { ...pendingSignatures, [role]: newSig };
    setPendingSignatures(nextSigs);

    // Check if 4/4 have signed
    checkAndFinalizeRatification(nextSigs);
  };

  // Fast Ratify All for demo convenience
  const handleFastRatifyAll = () => {
    const now = new Date().toISOString();
    const tempEpochHash = computeEpochHash(
      `epoch-${proposedVersion}`,
      proposedVersion,
      activeEpoch.hash,
      members.map((m) => ({ memberId: m.id, bps: splits[m.id] })),
      now
    );

    const allSigs: Record<MemberRole, RatificationSignature> = {
      dev: {
        memberId: 'dev',
        name: 'Alex Mercer',
        signedAt: now,
        signatureHash: generateMemberSignatureHash('dev', tempEpochHash, now),
        comment: `Ratified ${proposedVersion} engineering baseline.`,
      },
      artist: {
        memberId: 'artist',
        name: 'Elena Vance',
        signedAt: now,
        signatureHash: generateMemberSignatureHash('artist', tempEpochHash, now),
        comment: `Ratified ${proposedVersion} art pipeline baseline.`,
      },
      writer: {
        memberId: 'writer',
        name: 'Marcus Chen',
        signedAt: now,
        signatureHash: generateMemberSignatureHash('writer', tempEpochHash, now),
        comment: `Ratified ${proposedVersion} dialogue & lore baseline.`,
      },
      composer: {
        memberId: 'composer',
        name: 'Lyra Song',
        signedAt: now,
        signatureHash: generateMemberSignatureHash('composer', tempEpochHash, now),
        comment: `Ratified ${proposedVersion} dynamic score & OST baseline.`,
      },
    };

    setPendingSignatures(allSigs);
    checkAndFinalizeRatification(allSigs);
  };

  const checkAndFinalizeRatification = (
    sigs: Record<MemberRole, RatificationSignature | null>
  ) => {
    const allSigned = members.every((m) => sigs[m.id] !== null);
    if (!allSigned) return;

    const now = new Date().toISOString();
    const newSplitsArray = members.map((m) => ({
      memberId: m.id,
      bps: splits[m.id],
    }));

    const finalHash = computeEpochHash(
      `epoch-${proposedVersion}`,
      proposedVersion,
      activeEpoch.hash,
      newSplitsArray,
      now
    );

    const newEpoch: Epoch = {
      epochId: `epoch-${proposedVersion}`,
      version: proposedVersion,
      title: proposalTitle,
      description: proposalDescription,
      createdAt: now,
      effectiveFrom: now,
      splits: newSplitsArray,
      previousHash: activeEpoch.hash,
      hash: finalHash,
      signatures: Object.values(sigs) as RatificationSignature[],
      status: 'ACTIVE',
    };

    setTimeout(() => {
      onNewEpochRatified(newEpoch);
      setRatifiedSuccess(true);
      setIsProposing(false);
    }, 400);
  };

  const signedCount = Object.values(pendingSignatures).filter(Boolean).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Rev-Share Agreement Studio
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">
              Project Aurora
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Collaborative Equity & Ratification Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Adjust splits dynamically with zero rounding loss. Run Gemini Socratic AI mediation to
            resolve trade-offs, then lock consensus via cryptographic multi-party ratification.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Socratic AI Mediator</span>
          </button>

          <button
            onClick={handleStartProposal}
            disabled={!hasChangesFromActive && !isProposing}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
              hasChangesFromActive || isProposing
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <FileSignature className="w-4 h-4" />
            <span>{isProposing ? 'Review Ratification' : 'Propose New Epoch'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification if just ratified */}
      {ratifiedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              <strong>Ratification Complete!</strong> Epoch {activeEpoch.version} has been securely
              anchored to the Trust Ledger with 4/4 digital signatures.
            </span>
          </div>
          <button
            onClick={() => setRatifiedSuccess(false)}
            className="text-xs text-emerald-300 hover:text-white underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Visual Split Distribution Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="text-slate-300 flex items-center gap-2">
            <span>Visual Equity Distribution</span>
            <span className="text-[10px] text-slate-400 font-normal">
              (Total: {TOTAL_BPS.toLocaleString()} BPS = 100.00%)
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            {members.map((m) => (
              <span key={m.id} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      m.id === 'dev'
                        ? '#3b82f6'
                        : m.id === 'artist'
                        ? '#10b981'
                        : m.id === 'writer'
                        ? '#f59e0b'
                        : '#a855f7',
                  }}
                />
                <span className="text-slate-300">{m.name.split(' ')[0]}:</span>
                <span className="text-white font-bold">{bpsToPercent(splits[m.id])}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Stacked Segmented Bar */}
        <div className="h-4 w-full rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
          {members.map((m) => {
            const widthPct = (splits[m.id] / TOTAL_BPS) * 100;
            return (
              <div
                key={m.id}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor:
                    m.id === 'dev'
                      ? '#3b82f6'
                      : m.id === 'artist'
                      ? '#10b981'
                      : m.id === 'writer'
                      ? '#f59e0b'
                      : '#a855f7',
                }}
                className="h-full transition-all duration-200 relative group"
                title={`${m.name}: ${bpsToPercent(splits[m.id])}`}
              />
            );
          })}
        </div>
      </div>

      {/* 4-Member Interactive Dials / Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {members.map((member) => {
          const currentBps = splits[member.id];
          const isLocked = lockedMembers.has(member.id);
          const activeEpochBps =
            activeEpoch.splits.find((s) => s.memberId === member.id)?.bps ?? 0;
          const deltaBps = currentBps - activeEpochBps;

          return (
            <div
              key={member.id}
              className={`p-5 rounded-2xl bg-slate-900 border transition-all ${
                isLocked
                  ? 'border-slate-800 bg-slate-950/60 opacity-80'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Member Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="text-2xl">{member.avatar}</div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{member.name}</h3>
                    <p className="text-[11px] text-slate-400">{member.roleTitle}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleLock(member.id)}
                  className={`p-2 rounded-lg border text-xs transition ${
                    isLocked
                      ? 'bg-amber-950/50 border-amber-800/80 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title={isLocked ? 'Unlock split adjustment' : 'Lock split to freeze equity'}
                >
                  {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Percentage & BPS Display */}
              <div className="mt-5 text-center">
                <div className="text-3xl font-black text-white tracking-tight">
                  {bpsToPercent(currentBps)}
                </div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-slate-400">
                    {currentBps.toLocaleString()} BPS
                  </span>
                  {deltaBps !== 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        deltaBps > 0
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {deltaBps > 0 ? `+${bpsToPercent(deltaBps)}` : bpsToPercent(deltaBps)}
                    </span>
                  )}
                </div>
              </div>

              {/* Precision Slider Dial */}
              <div className="mt-6 space-y-2">
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="50"
                  value={currentBps}
                  disabled={isLocked}
                  onChange={(e) => handleSplitChange(member.id, Number(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                />

                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Footer info */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">PayPal Receiver:</span>
                <span className="text-slate-300 font-mono truncate max-w-[120px]" title={member.paypalEmail}>
                  {member.paypalEmail.split('@')[0]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-Party Ratification Console (Active Proposal Mode) */}
      {isProposing && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-blue-900/60 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">
                  Multi-Party Ratification Protocol
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  Epoch {proposedVersion}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                All 4 members must cryptographically sign to lock and activate this epoch.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300">
                Ratified: <strong className="text-blue-400">{signedCount}/4</strong>
              </span>
              <button
                type="button"
                onClick={handleFastRatifyAll}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold transition"
              >
                Fast-Ratify All (Demo)
              </button>
              <button
                type="button"
                onClick={() => setIsProposing(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Proposal Metadata Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Epoch Version & Title
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={proposedVersion}
                  onChange={(e) => setProposedVersion(e.target.value)}
                  className="w-20 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono font-bold"
                  placeholder="v2.0"
                />
                <input
                  type="text"
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Ratification Scope & Milestone Rationale
              </label>
              <input
                type="text"
                value={proposalDescription}
                onChange={(e) => setProposalDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
              />
            </div>
          </div>

          {/* 4 Signature Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {members.map((member) => {
              const sig = pendingSignatures[member.id];
              const isSigned = sig !== null;

              return (
                <div
                  key={member.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition ${
                    isSigned
                      ? 'bg-emerald-950/30 border-emerald-800/80'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{member.avatar}</span>
                      <div>
                        <div className="text-xs font-bold text-white">{member.name}</div>
                        <div className="text-[10px] text-slate-400">{member.roleTitle}</div>
                      </div>
                    </div>

                    {isSigned ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="text-slate-400">Equity Share:</div>
                    <div className="text-base font-extrabold text-white">
                      {bpsToPercent(splits[member.id])}
                    </div>
                  </div>

                  {isSigned ? (
                    <div className="space-y-1 pt-1 border-t border-emerald-900/60">
                      <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span>Signed Cryptographically</span>
                      </div>
                      <div className="font-mono text-[9px] text-slate-400 truncate">
                        {sig.signatureHash.slice(0, 16)}...
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSignAsMember(member.id)}
                      className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                    >
                      Sign as {member.name.split(' ')[0]}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Socratic AI Negotiation Drawer */}
      <SocraticNegotiationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        members={members}
        currentSplits={splits}
        proposedSplits={splits}
        onApplyCompromise={(newSplits) => {
          setSplits(newSplits);
        }}
      />
    </div>
  );
};
