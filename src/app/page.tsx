'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { AgreementStudio } from '@/components/AgreementStudio';
import { TrustLedger } from '@/components/TrustLedger';
import { CollaboratorBalances } from '@/components/CollaboratorBalances';
import { PaymentsHub } from '@/components/PaymentsHub';
import { StudioAdvisorDrawer } from '@/components/StudioAdvisorDrawer';
import { GENESIS_EPOCH, INITIAL_INFLOWS, INITIAL_PAYOUT_BATCHES, MEMBERS } from '@/lib/initial-data';

import { Epoch, Inflow, PayoutBatch } from '@/lib/types';
import { verifyEpochChain } from '@/lib/crypto';
import { ShieldCheck, Sparkles, Layers, DollarSign, Wallet } from 'lucide-react';

export default function FairSplitApp() {
  const [epochs, setEpochs] = useState<Epoch[]>([GENESIS_EPOCH]);
  const [activeEpoch, setActiveEpoch] = useState<Epoch>(GENESIS_EPOCH);
  const [inflows, setInflows] = useState<Inflow[]>(INITIAL_INFLOWS);
  const [payoutBatches, setPayoutBatches] = useState<PayoutBatch[]>(INITIAL_PAYOUT_BATCHES);
  const [activeTab, setActiveTab] = useState<'studio' | 'ledger' | 'balances' | 'payments'>('studio');
  const [isAdvisorOpen, setIsAdvisorOpen] = useState<boolean>(false);


  const [isVerifyingChain, setIsVerifyingChain] = useState<boolean>(false);
  const [verifyAlert, setVerifyAlert] = useState<{ show: boolean; msg: string; valid: boolean }>({
    show: false,
    msg: '',
    valid: true,
  });

  const [isTampered, setIsTampered] = useState<boolean>(false);
  const [backupEpochs, setBackupEpochs] = useState<Epoch[] | null>(null);

  // Compute Studio Financial Totals
  const totalGrossCents = inflows.reduce((sum, inf) => sum + inf.grossCents, 0);
  const totalNetCents = inflows.reduce((sum, inf) => sum + inf.netCents, 0);
  let totalPaidCents = 0;
  payoutBatches.forEach((batch) => {
    batch.items.forEach((item) => {
      if (item.status === 'SUCCESS') totalPaidCents += item.amountCents;
    });
  });

  // Ratify new epoch
  const handleNewEpochRatified = (newEpoch: Epoch) => {
    // Supersede previously active epoch
    const updatedEpochs = epochs.map((e) =>
      e.epochId === activeEpoch.epochId ? { ...e, status: 'SUPERSEDED' as const } : e
    );
    const nextEpochs = [...updatedEpochs, newEpoch];

    setEpochs(nextEpochs);
    setActiveEpoch(newEpoch);
  };

  // Capture new inflow
  const handleNewInflow = (newInflow: Inflow) => {
    setInflows((prev) => [newInflow, ...prev]);
  };

  // Add new payout batch
  const handleNewPayoutBatch = (newBatch: PayoutBatch) => {
    setPayoutBatches((prev) => [newBatch, ...prev]);
  };

  // Cryptographic Chain Verification Trigger
  const handleVerifyChain = () => {
    setIsVerifyingChain(true);
    setTimeout(() => {
      const result = verifyEpochChain(epochs);
      setIsVerifyingChain(false);
      setVerifyAlert({
        show: true,
        msg: result.details,
        valid: result.isValid,
      });
      setTimeout(() => {
        setVerifyAlert((prev) => ({ ...prev, show: false }));
      }, 5000);
    }, 400);
  };

  // Malicious Tamper Simulation (Judge Demo Tool)
  const handleTamperEpoch = (mode: 'dev_equity' | 'random_corruption') => {
    if (!backupEpochs) {
      setBackupEpochs(JSON.parse(JSON.stringify(epochs)));
    }
    const tampered = JSON.parse(JSON.stringify(epochs)) as Epoch[];
    if (tampered[0]) {
      if (mode === 'dev_equity') {
        // Specifically inflate Dev's equity by 1% (4000 -> 4100 BPS)
        tampered[0].splits[0].bps += 100;
      } else {
        // Random bit flip in timestamp where no single member benefits
        tampered[0].createdAt = '2026-10-01T12:00:00.001Z';
      }
      setEpochs(tampered);
      setIsTampered(true);
    }
  };

  // Restore True State
  const handleRestoreEpochs = () => {
    if (backupEpochs) {
      setEpochs(backupEpochs);
      setIsTampered(false);
      setBackupEpochs(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen">
      {/* Global Header */}
      <Header
        activeEpoch={activeEpoch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalGrossCents={totalGrossCents}
        totalNetCents={totalNetCents}
        totalPaidCents={totalPaidCents}
        isVerifyingChain={isVerifyingChain}
        onVerifyChain={handleVerifyChain}
        onOpenAdvisor={() => setIsAdvisorOpen(true)}
      />


      {/* Floating Verification Notification */}
      {verifyAlert.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`p-4 rounded-xl shadow-2xl border flex items-center gap-3 text-xs max-w-md ${
              verifyAlert.valid
                ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
                : 'bg-red-950 border-red-700 text-red-200'
            }`}
          >
            <ShieldCheck className={`w-5 h-5 shrink-0 ${verifyAlert.valid ? 'text-emerald-400' : 'text-red-400'}`} />
            <div>
              <strong className="block font-bold">
                {verifyAlert.valid ? 'Cryptographic Chain Valid' : 'Integrity Compromised!'}
              </strong>
              <span>{verifyAlert.msg}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'studio' && (
          <AgreementStudio
            members={MEMBERS}
            activeEpoch={activeEpoch}
            epochs={epochs}
            onNewEpochRatified={handleNewEpochRatified}
          />
        )}

        {activeTab === 'ledger' && (
          <TrustLedger
            epochs={epochs}
            inflows={inflows}
            onTamperEpoch={handleTamperEpoch}
            onRestoreEpochs={handleRestoreEpochs}
            isTampered={isTampered}
          />
        )}

        {activeTab === 'balances' && (
          <CollaboratorBalances
            members={MEMBERS}
            activeEpoch={activeEpoch}
            inflows={inflows}
            payoutBatches={payoutBatches}
            onNavigateToPayouts={() => setActiveTab('payments')}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsHub
            members={MEMBERS}
            activeEpoch={activeEpoch}
            inflows={inflows}
            payoutBatches={payoutBatches}
            onNewInflow={handleNewInflow}
            onNewPayoutBatch={handleNewPayoutBatch}
          />
        )}
      </main>

      {/* Gemini AI Studio Advisor Drawer */}
      <StudioAdvisorDrawer
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        activeEpoch={activeEpoch}
        pendingReserveCents={totalNetCents - totalPaidCents}
        inflowsCount={inflows.length}
      />


      {/* Global Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Built for the <strong className="text-slate-400">PayPal AI Hackathon 2026</strong>.
            All fintech math computed deterministically in cents.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Project Aurora Rev-Share</span>
            <span>&bull;</span>
            <span className="font-mono text-[11px]">Active: {activeEpoch.version}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
