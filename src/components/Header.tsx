'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Sparkles, RefreshCw, Layers, DollarSign, Wallet, Bot, ChevronDown, Check, UserCheck } from 'lucide-react';
import { Epoch, Member, MemberRole } from '@/lib/types';
import { centsToDollars } from '@/lib/fairsplit-math';

interface HeaderProps {
  activeEpoch: Epoch;
  activeTab: 'studio' | 'ledger' | 'balances' | 'payments';
  setActiveTab: (tab: 'studio' | 'ledger' | 'balances' | 'payments') => void;
  totalGrossCents: number;
  totalNetCents: number;
  totalPaidCents: number;
  isVerifyingChain: boolean;
  onVerifyChain: () => void;
  onOpenAdvisor: () => void;
  currentMember: Member;
  members: Member[];
  onSwitchMember: (role: MemberRole) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeEpoch,
  activeTab,
  setActiveTab,
  totalGrossCents,
  totalNetCents,
  totalPaidCents,
  isVerifyingChain,
  onVerifyChain,
  onOpenAdvisor,
  currentMember,
  members,
  onSwitchMember,
}) => {
  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSessionDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pendingCents = totalNetCents - totalPaidCents;

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Hackathon Tag */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 shadow-lg shadow-blue-500/20 text-white font-black text-xl tracking-tight">
              FS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">FairSplit</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  PayPal AI Hackathon
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Fintech Rev-Share & Trust Ledger for &ldquo;Project Aurora&rdquo;
              </p>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="hidden lg:flex items-center gap-6 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <div>
              <div className="text-slate-400">Total Inflows (Gross)</div>
              <div className="font-semibold text-slate-200">{centsToDollars(totalGrossCents)}</div>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <div className="text-slate-400">Net Allocated</div>
              <div className="font-semibold text-emerald-400">{centsToDollars(totalNetCents)}</div>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <div className="text-slate-400">Paid Out (PayPal)</div>
              <div className="font-semibold text-blue-400">{centsToDollars(totalPaidCents)}</div>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <div className="text-slate-400">Pending Reserve</div>
              <div className="font-semibold text-amber-400">{centsToDollars(pendingCents)}</div>
            </div>
          </div>

          {/* Active Epoch, Session Switcher & Action buttons */}
          <div className="flex items-center gap-3">
            {/* Authenticated Persona Switcher */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsSessionDropdownOpen(!isSessionDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 text-xs font-medium text-slate-200 transition cursor-pointer shadow-sm hover:border-blue-500/50"
                title="Switch simulated logged-in persona for demo evaluation"
              >
                <span className="text-sm">{currentMember.avatar}</span>
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-[10px] text-slate-400 font-mono">Workstation:</span>
                  <span className="font-bold text-white truncate max-w-[110px]">{currentMember.name.split(' ')[0]} ({currentMember.roleTitle.split(' ')[0]})</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSessionDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isSessionDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-2.5 py-1.5 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Demo Workstation Persona</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-mono">
                      <UserCheck className="w-3 h-3" /> Active
                    </span>
                  </div>
                  <div className="py-1 space-y-0.5">
                    {members.map((m) => {
                      const isActive = m.id === currentMember.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            onSwitchMember(m.id);
                            setIsSessionDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left transition cursor-pointer ${
                            isActive
                              ? 'bg-blue-950/80 text-white font-bold border border-blue-800/80'
                              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{m.avatar}</span>
                            <div>
                              <div className="font-semibold">{m.name}</div>
                              <div className="text-[10px] text-slate-400">{m.roleTitle}</div>
                            </div>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-cyan-400" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-2 py-1.5 border-t border-slate-800 text-[10px] text-slate-500">
                    Demo simulation: Allows testing the 4 contributor workstations from a single browser session.
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active: {activeEpoch.version}</span>
            </div>

            <button
              onClick={onOpenAdvisor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition shadow-md shadow-cyan-600/20 cursor-pointer"
              title="Open Gemini AI Studio Advisor"
            >
              <Bot className="w-4 h-4" />
              <span>AI Advisor</span>
            </button>

            <button
              onClick={onVerifyChain}
              disabled={isVerifyingChain}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs transition cursor-pointer"
              title="Verify cryptographic SHA-256 chain integrity"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Verify Chain</span>
            </button>
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 sm:space-x-4 border-t border-slate-800/80 py-2.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'studio'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Agreement Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'ledger'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Trust Ledger (SHA-256)</span>
          </button>

          <button
            onClick={() => setActiveTab('balances')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'balances'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Collaborator Balances</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'payments'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Payments Hub (PayPal Sandbox)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
