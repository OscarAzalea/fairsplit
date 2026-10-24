'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Bot,
  Lightbulb,
  TrendingUp,
  Coins,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  CalendarClock,
  UserCheck,
  UserX,
  Send,
  ArrowRight,
  Shield,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { Epoch, Member, StudioAdviceResult, PayoutRecommendation } from '@/lib/types';
import { centsToDollars } from '@/lib/fairsplit-math';

interface StudioAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeEpoch: Epoch;
  pendingReserveCents: number;
  inflowsCount: number;
  onPushRecommendation?: (rec: PayoutRecommendation) => void;
  currentMember: Member;
}

export const StudioAdvisorDrawer: React.FC<StudioAdvisorDrawerProps> = ({
  isOpen,
  onClose,
  activeEpoch,
  pendingReserveCents,
  inflowsCount,
  onPushRecommendation,
  currentMember,
}) => {
  // Mode Toggle: 'advisory' vs 'scheduler'
  const [activeMode, setActiveMode] = useState<'advisory' | 'scheduler'>('scheduler');

  // Strategy Advisory State
  const [selectedTopic, setSelectedTopic] = useState<string>('PayPal Fee Optimization');
  const [customQuestion, setCustomQuestion] = useState<string>(
    'When should our team trigger our next PayPal batch payout to minimize commercial fees?'
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [adviceResult, setAdviceResult] = useState<StudioAdviceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Collaborator Smart Payout Scheduler State
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [collaboratorNeed, setCollaboratorNeed] = useState<string>(
    'Upcoming personal rent expenses and completed character modeling milestone deliverables.'
  );
  const [isSchedulerLoading, setIsSchedulerLoading] = useState<boolean>(false);
  const [schedulerResult, setSchedulerResult] = useState<PayoutRecommendation | null>(null);
  const [hasPushedToQueue, setHasPushedToQueue] = useState<boolean>(false);

  if (!isOpen) return null;

  const presetTopics = [
    {
      title: 'PayPal Fee Optimization',
      question: 'When should our team trigger our next PayPal batch payout to minimize commercial fees?',
      icon: Coins,
    },
    {
      title: 'Steam Refund Reserve Buffer',
      question: 'How should Project Aurora reserve funds for Steam 14-day customer refunds before distributing payouts?',
      icon: ShieldAlert,
    },
    {
      title: 'DLC & Expansion Rev-Share',
      question: 'How should we structure equity for the Composer on dynamic soundtrack DLC without destabilizing core dev equity?',
      icon: TrendingUp,
    },
  ];

  const handleSelectPreset = (preset: typeof presetTopics[0]) => {
    setSelectedTopic(preset.title);
    setCustomQuestion(preset.question);
    setAdviceResult(null);
  };

  const handleGetAdvice = async () => {
    if (!customQuestion.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: customQuestion,
          topic: selectedTopic,
          activeEpoch,
          pendingCents: pendingReserveCents,
          inflowsCount,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }
      const data: StudioAdviceResult = await res.json();
      setAdviceResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Advisor request failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Smart Payout Scheduler Recommendation
  const handleGeneratePayoutSchedule = async () => {
    setIsSchedulerLoading(true);
    setError(null);
    setHasPushedToQueue(false);

    const displayName = isAnonymous
      ? 'Anonymous Collaborator'
      : `${currentMember.name} (${currentMember.roleTitle})`;

    try {
      const res = await fetch('/api/payout-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterName: displayName,
          isAnonymous,
          requesterRole: isAnonymous ? undefined : currentMember.id,
          reasonOrNeed: collaboratorNeed,
          pendingCents: pendingReserveCents,
          activeEpoch,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate payout recommendation');
      }

      const rec: PayoutRecommendation = await res.json();
      setSchedulerResult(rec);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scheduler request failed');
    } finally {
      setIsSchedulerLoading(false);
    }
  };

  const handlePushToQueue = () => {
    if (schedulerResult && onPushRecommendation) {
      onPushRecommendation(schedulerResult);
      setHasPushedToQueue(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">FairSplit AI Studio Advisor</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Gemini 3.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Autonomous financial governance & payout scheduling mediator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Mode Selector Tabs */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800/80 flex gap-2">
          <button
            onClick={() => setActiveMode('scheduler')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'scheduler'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <CalendarClock className="w-4 h-4 text-cyan-300" />
            <span>Smart Payout Scheduler</span>
          </button>

          <button
            onClick={() => setActiveMode('advisory')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'advisory'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-amber-300" />
            <span>Strategic Studio Advisory</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* TAB 1: SMART PAYOUT SCHEDULER */}
          {activeMode === 'scheduler' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-950 border border-blue-900/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider">
                  <CalendarClock className="w-4 h-4 text-cyan-400" />
                  <span>Peer Liquidity & Payout Mediation</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Need money or want to recommend a payout date without awkward social pressure? Ask the AI to calculate the fee-optimal timing based on studio reserves and anonymously submit a formal recommendation to the team lead.
                </p>
              </div>

              {/* Authenticated Identity Anchor (Zero Spoofing) */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Authenticated Requester Session
                  </span>
                  <span className="font-mono text-slate-500">ID: {currentMember.id}</span>
                </div>

                <div className="flex items-center gap-3 pt-0.5">
                  <div className="text-2xl">{currentMember.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{currentMember.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-950 text-blue-300 border border-blue-800 shrink-0">
                        {currentMember.roleTitle}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {currentMember.paypalEmail}
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[10px] text-slate-400 flex items-start gap-2">
                  <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-300">Anti-Spoofing Enforced:</strong> Your request automatically binds to your logged-in session credentials. To switch personas for testing, use the session switcher in the top navigation header.
                  </span>
                </div>
              </div>

              {/* Privacy / Anonymous Mode Toggle */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {isAnonymous ? (
                    <UserX className="w-5 h-5 text-amber-400" />
                  ) : (
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                  )}
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isAnonymous ? 'Anonymous Request Mode (Protected)' : 'Attributed Request Mode'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isAnonymous
                        ? 'Your identity is masked. The team lead will only see "Anonymous Collaborator", removing social friction.'
                        : `The team lead will see that ${currentMember.name} (${currentMember.roleTitle}) suggested this payout.`}
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Stated Need / Message to AI */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Stated Timeline or Liquidity Need:
                </label>
                <textarea
                  value={collaboratorNeed}
                  onChange={(e) => setCollaboratorNeed(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Rent is due on the 1st; milestone 2 assets delivered..."
                />
              </div>

              {/* Action Trigger */}
              <button
                onClick={handleGeneratePayoutSchedule}
                disabled={isSchedulerLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
              >
                {isSchedulerLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini 3.5 Calculating Optimal Payout Window...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Calculate Optimal Payout Window</span>
                  </>
                )}
              </button>

              {/* Scheduler AI Output Card */}
              {schedulerResult && (
                <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-950 to-indigo-950/40 border border-indigo-900/60 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        Formal AI Recommendation Memo
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                        {schedulerResult.id}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      From: <strong>{schedulerResult.requesterName}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Recommended Date
                      </span>
                      <span className="text-sm font-extrabold text-cyan-400 block mt-0.5">
                        {schedulerResult.recommendedDate}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Recommended Batch Total
                      </span>
                      <span className="text-sm font-extrabold text-emerald-400 block mt-0.5">
                        {centsToDollars(schedulerResult.recommendedAmountCents)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                    <div className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>PayPal Fee Optimization Rationale:</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {schedulerResult.feeOptimizationNote}
                    </p>
                  </div>

                  {/* Submission to Payments Hub Queue */}
                  {hasPushedToQueue ? (
                    <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Pinned to Payments Hub Queue!</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-300">Ready for Lead</span>
                    </div>
                  ) : (
                    <button
                      onClick={handlePushToQueue}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-900/30 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Push Recommendation to Studio Payments Queue</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STRATEGIC STUDIO ADVISORY */}
          {activeMode === 'advisory' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Preset Strategy Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Recommended Advisory Topics
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {presetTopics.map((p, idx) => {
                    const Icon = p.icon;
                    const isSelected = selectedTopic === p.title;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(p)}
                        className={`p-3 rounded-xl border text-left text-xs transition flex flex-col justify-between space-y-2 cursor-pointer ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-cyan-400" />
                        <span className="font-semibold text-white leading-tight">{p.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Context Banner */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Studio Context:</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-300">
                    Active Epoch: <strong className="text-white">{activeEpoch.version}</strong>
                  </span>
                  <span className="text-slate-300">
                    Pending Reserve: <strong className="text-amber-400">{centsToDollars(pendingReserveCents)}</strong>
                  </span>
                </div>
              </div>

              {/* Question Box */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Ask the Studio Advisor
                </label>
                <textarea
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  rows={3}
                  placeholder="Ask anything regarding team splits, Steam refunds, or PayPal fees..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleGetAdvice}
                  disabled={isLoading || !customQuestion.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gemini 3.5 Flash Synthesizing Advisory...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Get Strategic AI Advice</span>
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
                  {error}
                </div>
              )}

              {/* Advice Output */}
              {adviceResult && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                        <Lightbulb className="w-4 h-4 text-cyan-400" />
                        <span>Executive Recommendation</span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        Confidence: {adviceResult.confidenceScore}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-100 font-semibold leading-relaxed">
                      {adviceResult.executiveSummary}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <span>Strategic & Industry Analysis</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      {adviceResult.strategicInsight}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Recommended Action Steps</span>
                    </div>
                    <div className="space-y-2">
                      {adviceResult.actionSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5"
                        >
                          <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                    <div className="font-bold text-slate-300 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span>Financial & Fee Impact</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{adviceResult.financialImpact}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
