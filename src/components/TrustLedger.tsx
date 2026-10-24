'use client';

import React, { useState } from 'react';
import {
  Layers,
  ShieldCheck,
  ShieldAlert,
  Link as LinkIcon,
  Copy,
  Check,
  Clock,
  SearchCheck,
} from 'lucide-react';
import { Epoch, Inflow } from '@/lib/types';
import { bpsToPercent, centsToDollars } from '@/lib/fairsplit-math';
import { verifyEpochChain } from '@/lib/crypto';

interface TrustLedgerProps {
  epochs: Epoch[];
  inflows: Inflow[];
  onTamperEpoch?: (mode: 'dev_equity' | 'random_corruption') => void;
  onRestoreEpochs?: () => void;
  isTampered?: boolean;
  onVerifyChain?: () => void;
  isVerifyingChain?: boolean;
}

export const TrustLedger: React.FC<TrustLedgerProps> = ({
  epochs,
  inflows,
  onTamperEpoch,
  onRestoreEpochs,
  isTampered,
  onVerifyChain,
  isVerifyingChain,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const verification = verifyEpochChain(epochs);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 1800);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Ledger Header & Cryptographic Status */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Trust Ledger Protocol
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">
              SHA-256 linked demo records
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Epoch Integrity & Inflow Links
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            This browser session links agreement versions by SHA-256 hash. Each recorded inflow
            stores the agreement active at capture. Demo data stays in this browser until Reset demo.
          </p>
        </div>

        {/* Verification Badge & Sandbox Test Tools */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          {onVerifyChain && (
            <button
              type="button"
              onClick={onVerifyChain}
              disabled={isVerifyingChain}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-md shadow-emerald-900/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Recompute each epoch hash and check links in the current demo session"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>{isVerifyingChain ? 'Checking Hashes...' : 'Check Epoch Hashes'}</span>
            </button>
          )}

          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
              verification.isValid
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                : 'bg-red-950/80 border-red-800 text-red-300 animate-bounce'
            }`}
          >
            {verification.isValid ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Epoch Hashes Match</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Tamper Detected! Invalid Chain</span>
              </>
            )}
          </div>

          {onTamperEpoch && onRestoreEpochs && (
            <div className="flex flex-wrap items-center gap-2">
              {isTampered ? (
                <button
                  type="button"
                  onClick={onRestoreEpochs}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                >
                  Restore True State
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onTamperEpoch('dev_equity')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-300 border border-slate-700 text-slate-300 text-xs font-medium transition"
                    title="Change the demo split to show a hash mismatch; the hash cannot identify the editor"
                  >
                    Simulate Split Tamper
                  </button>
                  <button
                    type="button"
                    onClick={() => onTamperEpoch('random_corruption')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-950 hover:text-amber-300 border border-slate-700 text-slate-300 text-xs font-medium transition"
                    title="Simulates anonymous payload corruption (Inconclusive)"
                  >
                    Simulate Random Corruption
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hash mismatch explanation */}
      {!verification.isValid && verification.forensics && (
        <div className="p-5 rounded-2xl border bg-amber-950/70 border-amber-700 transition-all animate-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-900 border border-amber-500 flex items-center justify-center text-amber-200">
                <SearchCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Hash Mismatch: Actor Unknown
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900 text-amber-200 border border-amber-600">
                    Attribution: Inconclusive
                  </span>
                </div>
                <p className="text-xs text-slate-300/90 mt-0.5">
                  A hash mismatch detects changed data. It cannot identify who changed it.
                </p>
              </div>
            </div>

          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Actor Attribution
              </span>
              <div className="text-amber-300 italic font-medium">Unknown from hash evidence</div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                {verification.forensics.verdict}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Hash Check Details
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-mono text-[11px]">
                {verification.forensics.evidence}
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Epochs Hash Chain Visualizer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Epoch Sequence (v1.0 &rarr; v2.0...)</span>
          </div>
          <span>Total Blocks: {epochs.length}</span>
        </div>

        <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {epochs.map((epoch) => {
            return (
              <div
                key={epoch.epochId}
                className={`relative p-5 rounded-2xl bg-slate-900 border transition-all ${
                  epoch.status === 'ACTIVE'
                    ? 'border-emerald-700/80 shadow-lg shadow-emerald-950/30'
                    : 'border-slate-800'
                }`}
              >
                {/* Timeline node circle */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-5 w-4 h-4 rounded-full border-2 transform -translate-x-1/2 flex items-center justify-center ${
                    epoch.status === 'ACTIVE'
                      ? 'bg-emerald-500 border-emerald-400 ring-4 ring-emerald-950'
                      : 'bg-slate-800 border-slate-600'
                  }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{epoch.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        epoch.status === 'ACTIVE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {epoch.version} &bull; {epoch.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(epoch.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-2">{epoch.description}</p>

                {/* Hashes: previousHash -> hash */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <LinkIcon className="w-3 h-3 text-slate-400" />
                      <span>Previous Epoch Hash</span>
                    </span>
                    <div className="font-mono text-[11px] text-slate-400 truncate select-all">
                      {epoch.previousHash}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Canonical Epoch SHA-256</span>
                      </span>
                      <button
                        onClick={() => copyToClipboard(epoch.hash)}
                        className="text-slate-400 hover:text-white transition"
                        title="Copy full hash"
                      >
                        {copiedHash === epoch.hash ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-[11px] text-emerald-300 truncate select-all">
                      {epoch.hash}
                    </div>
                  </div>
                </div>

                {/* Splits Summary */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-slate-400 font-semibold">Ratified Splits:</span>
                  {epoch.splits.map((s) => (
                    <span
                      key={s.memberId}
                      className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-200"
                    >
                      <strong className="uppercase text-slate-400 mr-1">{s.memberId}:</strong>
                      <span className="font-bold">{bpsToPercent(s.bps)}</span>
                    </span>
                  ))}
                  <span className="ml-auto text-slate-400 text-[11px]">
                    Demo approvals: {epoch.signatures.length}/4
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inflow records and epoch references */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-blue-400" />
            <span>Recorded Inflow Links to Epochs</span>
          </div>
          <span className="text-slate-400 font-normal">
            Each inflow stores the active epoch hash in this demo session
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="p-3">Inflow ID</th>
                <th className="p-3">Source Channel</th>
                <th className="p-3">PayPal IDs / Mode</th>
                <th className="p-3">Gross</th>
                <th className="p-3">Fee / Estimate</th>
                <th className="p-3 font-semibold text-slate-200">Net Cents</th>
                <th className="p-3">Bound Epoch</th>
                <th className="p-3 text-right">Epoch SHA-256 Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
              {inflows.map((inflow) => (
                <tr key={inflow.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-mono font-bold text-blue-400">{inflow.id}</td>
                  <td className="p-3 font-medium text-slate-200">{inflow.source}</td>
                  <td className="p-3 font-mono text-[10px] text-slate-400">
                    <div>{inflow.paymentMode === 'PAYPAL_SANDBOX' ? 'PayPal order' : 'Demo order'}: {inflow.paypalOrderId}</div>
                    {inflow.paypalCaptureId && (
                      <div className="text-slate-500">Capture: {inflow.paypalCaptureId}</div>
                    )}
                    <div
                      className={
                        inflow.paymentMode === 'PAYPAL_SANDBOX'
                          ? 'text-blue-400'
                          : inflow.paymentMode === 'SIMULATED'
                            ? 'text-amber-400'
                            : 'text-slate-600'
                      }
                    >
                      {inflow.paymentMode === 'SEED' ? 'Seeded example' : inflow.paymentMode || 'Seeded example'} · {inflow.paymentStatus || 'sample'}
                    </div>
                  </td>
                  <td className="p-3 text-slate-400">{centsToDollars(inflow.grossCents)}</td>
                  <td className="p-3 text-red-400">-{centsToDollars(inflow.feeCents)}{inflow.feeIsEstimated ? ' (est.)' : ''}</td>
                  <td className="p-3 font-extrabold text-emerald-400">
                    {centsToDollars(inflow.netCents)}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                      {inflow.epochId.replace('epoch-', '')}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span
                      className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                      title={inflow.epochHash}
                    >
                      {inflow.epochHash.slice(0, 10)}...{inflow.epochHash.slice(-6)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
