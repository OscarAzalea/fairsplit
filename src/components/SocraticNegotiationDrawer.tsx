'use client';

import React, { useState } from 'react';
import { X, Sparkles, HelpCircle, CheckCircle2, ArrowRight, Loader2, Scale } from 'lucide-react';
import { Member, MemberRole, NegotiationResult } from '@/lib/types';
import { bpsToPercent, TOTAL_BPS } from '@/lib/fairsplit-math';

interface SocraticNegotiationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currentSplits: Record<MemberRole, number>;
  proposedSplits: Record<MemberRole, number>;
  onApplyCompromise: (newSplits: Record<MemberRole, number>) => void;
}

export const SocraticNegotiationDrawer: React.FC<SocraticNegotiationDrawerProps> = ({
  isOpen,
  onClose,
  members,
  currentSplits,
  proposedSplits,
  onApplyCompromise,
}) => {
  const [proposer, setProposer] = useState<MemberRole>('dev');
  const [rationale, setRationale] = useState<string>(
    'Expanding composition equity to account for dynamic interactive stems in Milestone 2.'
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [negotiationResult, setNegotiationResult] = useState<NegotiationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunMediation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSplits,
          proposedSplits,
          proposerRole: proposer,
          rationale,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to negotiate: ${res.statusText}`);
      }

      const data: NegotiationResult = await res.json();
      setNegotiationResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mediation request failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-700/60 flex items-center justify-center text-purple-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Socratic AI Negotiation Mediator
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50">
                  Gemini Structured
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ethical trade-off analysis, Socratic inquiry & consensus building
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

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Proposer and Rationale Form */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Initiating Collaborator
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setProposer(m.id)}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 text-xs transition ${
                      proposer === m.id
                        ? 'border-purple-500 bg-purple-950/40 text-purple-200'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>{m.avatar}</span>
                    <div className="truncate">
                      <div className="font-semibold truncate">{m.name}</div>
                      <div className="text-[10px] opacity-70 truncate">{m.roleTitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Proposed Shift Rationale / Milestone Context
              </label>
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={3}
                placeholder="Explain what deliverables, milestones, or risk factors justify adjusting current rev-share..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleRunMediation}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Equity Dynamics & Reasoning...</span>
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  <span>Request Socratic AI Evaluation</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* AI Result Card */}
          {negotiationResult && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Executive Summary */}
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-900/50 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Trade-off Synthesis</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {negotiationResult.summary}
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="text-xs text-slate-400">Consensus Likelihood:</div>
                  <div className="flex items-center gap-2">
                    <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                        style={{ width: `${negotiationResult.consensusLikelihoodScore}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-emerald-300">
                      {negotiationResult.consensusLikelihoodScore}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Socratic Questions */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span>Socratic Probing Inquiries for the Team</span>
                </div>
                <div className="space-y-2.5">
                  {negotiationResult.socraticQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5"
                    >
                      <span className="text-amber-400 font-bold shrink-0">{idx + 1}.</span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proposed Compromise Split */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>AI-Mediated Compromise Baseline</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Strictly 10,000 BPS (100.0%)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {members.map((m) => {
                    const compBps = negotiationResult.compromiseSplits[m.id];
                    const currBps = currentSplits[m.id];
                    const diff = compBps - currBps;

                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center"
                      >
                        <div className="text-sm">{m.avatar}</div>
                        <div className="text-xs font-bold text-slate-200 mt-1">{m.name}</div>
                        <div className="text-base font-extrabold text-white mt-1">
                          {bpsToPercent(compBps)}
                        </div>
                        <div
                          className={`text-[10px] font-medium mt-0.5 ${
                            diff > 0
                              ? 'text-emerald-400'
                              : diff < 0
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {diff > 0 ? `+${bpsToPercent(diff)}` : diff < 0 ? bpsToPercent(diff) : 'Unchanged'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-slate-300 italic pt-1">
                  &ldquo;{negotiationResult.plainRationale}&rdquo;
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onApplyCompromise(negotiationResult.compromiseSplits);
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20"
                  >
                    <span>Adopt This Compromise into Agreement Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
