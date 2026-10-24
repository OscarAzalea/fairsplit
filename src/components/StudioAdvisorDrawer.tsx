'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Bot,
  Send,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  CalendarClock,
  Coins,
  RefreshCw,
} from 'lucide-react';
import { Epoch, Member, PayoutRecommendation, StudioChatMessage } from '@/lib/types';
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

function messageId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
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
  const [messages, setMessages] = useState<StudioChatMessage[]>(() => [{
    id: 'msg-initial-greeting',
    sender: 'ai',
    text: `Hi ${currentMember.name.split(' ')[0]}! 👋 I'm your FairSplit Studio Advisor. Ask me about your demo balance, agreements, or a suggested payout date for the team lead to review.`,
    timestamp: 'Welcome',
  }]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [submittedProposalIds, setSubmittedProposalIds] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: StudioChatMessage = {
      id: messageId('user'),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          chatHistory: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
          currentMember,
          activeEpoch,
          pendingReserveCents,
          inflowsCount,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();

      const aiMsg: StudioChatMessage = {
        id: messageId('ai'),
        sender: 'ai',
        text: data.reply || 'I processed your request.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickOptions: data.quickOptions,
        payoutProposal: data.proposal,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      console.error('AI chat failed:', err);
      // Friendly fallback
      const aiMsg: StudioChatMessage = {
        id: messageId('ai-err'),
        sender: 'ai',
        text: `I'm having a brief connection delay, but I'm monitoring our ${centsToDollars(pendingReserveCents)} pending reserve. If you'd like to propose an early payout to Marcus, let me know if it should be under your name, anonymous, or an AI suggestion!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickOptions: [
          { label: `👤 Under my name (${currentMember.name.split(' ')[0]})`, value: 'attributed' },
          { label: '🕵️ Anonymous', value: 'anonymous' },
          { label: '🤖 Just an AI suggestion', value: 'ai_suggestion' },
        ],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushProposal = (proposal: PayoutRecommendation) => {
    if (onPushRecommendation) {
      onPushRecommendation(proposal);
      setSubmittedProposalIds((prev) => new Set(prev).add(proposal.id));

      // Add confirmation message to chat
      const confirmMsg: StudioChatMessage = {
        id: messageId('ai-confirm'),
        sender: 'ai',
        text: `✅ Done! The recommendation memo is now in this demo session's Payments Hub queue.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, confirmMsg]);
    }
  };

  const handleResetChat = () => {
    const firstName = currentMember.name.split(' ')[0];
    setMessages([
      {
        id: 'msg-initial-greeting-reset',
        sender: 'ai',
        text: `Hi ${firstName}! 👋 Ask me anything about studio finances or request an early payout batch for Marcus!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const starterSuggestions = [
    'Can we propose an early payout to Marcus? Rent is due soon.',
    'What should we check before proposing the next payout batch?',
    'How much should we set aside for Steam refund buffers?',
    'How should we structure DLC rev-share for the Composer?',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">FairSplit AI Studio Advisor</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                  Gemini when available
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  Logged in as <strong className="text-slate-200">{currentMember.avatar} {currentMember.name}</strong> ({currentMember.roleTitle})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChat}
              title="Reset conversation"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Context Pill Banner */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active Epoch: <strong className="text-slate-200">{activeEpoch.version}</strong></span>
          </div>
          <div>
            <span>Pending Reserves: <strong className="text-amber-400">{centsToDollars(pendingReserveCents)}</strong></span>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200 ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-sm ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Interactive Quick Option Pills (e.g. Attribution Choices) */}
                  {!isUser && msg.quickOptions && msg.quickOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in duration-200">
                      {msg.quickOptions.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(opt.value)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interactive Payout Recommendation Memo Card */}
                  {!isUser && msg.payoutProposal && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-indigo-900/60 shadow-lg shadow-indigo-950/20 space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                          <CalendarClock className="w-3.5 h-3.5" />
                          <span>Payout Recommendation Memo</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {msg.payoutProposal.id}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Recommended Date</span>
                          <span className="font-extrabold text-cyan-300 block mt-0.5">
                            {msg.payoutProposal.recommendedDate}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Batch Amount</span>
                          <span className="font-extrabold text-emerald-400 block mt-0.5">
                            {centsToDollars(msg.payoutProposal.recommendedAmountCents)}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-1">
                        <div>
                          <strong className="text-slate-300">Attribution:</strong> {msg.payoutProposal.requesterName}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-start gap-1">
                          <Coins className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                          <span>{msg.payoutProposal.feeOptimizationNote}</span>
                        </div>
                      </div>

                      {submittedProposalIds.has(msg.payoutProposal.id) ? (
                        <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-center gap-1.5 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Submitted to Payments Queue (Pinned for Marcus)</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePushProposal(msg.payoutProposal!)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-md shadow-emerald-900/30 cursor-pointer active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit to Payments Hub Queue</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className={`text-[10px] text-slate-500 font-mono px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shrink-0">
                    {currentMember.avatar}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3 items-center animate-in fade-in duration-150">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 rounded-2xl rounded-tl-none bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>FairSplit AI is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter Suggestion Chips (shown when 1 message in chat) */}
        {messages.length === 1 && !isLoading && (
          <div className="px-5 py-2 border-t border-slate-800/60 bg-slate-950/40 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Suggested Prompts</span>
            <div className="flex flex-wrap gap-1.5">
              {starterSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(suggestion)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] transition cursor-pointer text-left truncate max-w-full"
                >
                  💬 {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything or say 'Can we make the payout earlier?'..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-blue-600/20 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 mt-2">
            <span>Gemini when available · PayPal Sandbox checkout · payout batches simulated</span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};
