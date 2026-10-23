'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Bot,
  Lightbulb,
  ArrowRight,
  Loader2,
  TrendingUp,
  ShieldAlert,
  Coins,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { Epoch, StudioAdviceResult } from '@/lib/types';
import { centsToDollars } from '@/lib/fairsplit-math';

interface StudioAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeEpoch: Epoch;
  pendingReserveCents: number;
  inflowsCount: number;
}

export const StudioAdvisorDrawer: React.FC<StudioAdvisorDrawerProps> = ({
  isOpen,
  onClose,
  activeEpoch,
  pendingReserveCents,
  inflowsCount,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>('PayPal Fee Optimization');
  const [customQuestion, setCustomQuestion] = useState<string>(
    'When should our team trigger our next PayPal batch payout to minimize commercial fees?'
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [adviceResult, setAdviceResult] = useState<StudioAdviceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      if (!res.ok) throw new Error('Failed to fetch studio advice');
      const data: StudioAdviceResult = await res.json();
      setAdviceResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Advisor request failed');
    } finally {
      setIsLoading(false);
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
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Strategic financial governance & fee optimization co-pilot
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
                    className={`p-3 rounded-xl border text-left text-xs transition flex flex-col justify-between space-y-2 ${
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
                  <span>Gemini 3.8 Flash Synthesizing Studio Advisory...</span>
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
              {/* Executive Summary */}
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

              {/* Strategic Insight */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span>Strategic & Industry Analysis</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {adviceResult.strategicInsight}
                </p>
              </div>

              {/* Action Steps */}
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

              {/* Financial & Cashflow Impact */}
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
      </div>
    </div>
  );
};
