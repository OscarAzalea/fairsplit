'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { AgreementStudio } from '@/components/AgreementStudio';
import { TrustLedger } from '@/components/TrustLedger';
import { CollaboratorBalances } from '@/components/CollaboratorBalances';
import { PaymentsHub } from '@/components/PaymentsHub';
import { StudioAdvisorDrawer } from '@/components/StudioAdvisorDrawer';
import { GENESIS_EPOCH, INITIAL_INFLOWS, INITIAL_PAYOUT_BATCHES, MEMBERS } from '@/lib/initial-data';

import { Epoch, Inflow, PayoutBatch, PayoutRecommendation, MemberRole, ReserveReallocation } from '@/lib/types';
import { verifyEpochChain } from '@/lib/crypto';
import { dollarsToCents, calculatePayPalFeeCents, allocateCentsFairly } from '@/lib/fairsplit-math';
import { calculateMemberBalances, isSimulatedInflow, MEMBER_ROLES } from '@/lib/balances';
import { ShieldCheck, Sparkles, Layers, DollarSign, Wallet } from 'lucide-react';

export default function FairSplitApp() {
  const [epochs, setEpochs] = useState<Epoch[]>([GENESIS_EPOCH]);
  const [activeEpoch, setActiveEpoch] = useState<Epoch>(GENESIS_EPOCH);
  const [inflows, setInflows] = useState<Inflow[]>(INITIAL_INFLOWS);
  const [payoutBatches, setPayoutBatches] = useState<PayoutBatch[]>(INITIAL_PAYOUT_BATCHES);
  const [reserveReallocations, setReserveReallocations] = useState<ReserveReallocation[]>([]);
  const [activeTab, setActiveTab] = useState<'studio' | 'ledger' | 'balances' | 'payments'>('studio');
  const [isAdvisorOpen, setIsAdvisorOpen] = useState<boolean>(false);

  // Authenticated Session Persona (defaults to Elena Vance, Artist)
  const [currentMemberId, setCurrentMemberId] = useState<MemberRole>('artist');
  const currentMember = MEMBERS.find((m) => m.id === currentMemberId) || MEMBERS[1];


  const [isVerifyingChain, setIsVerifyingChain] = useState<boolean>(false);
  const [verifyAlert, setVerifyAlert] = useState<{ show: boolean; msg: string; valid: boolean }>({
    show: false,
    msg: '',
    valid: true,
  });

  const [isTampered, setIsTampered] = useState<boolean>(false);
  const [backupEpochs, setBackupEpochs] = useState<Epoch[] | null>(null);

  // AI Payout Recommendations Queue (Peer Liquidity Mediation)
  const [payoutRecommendations, setPayoutRecommendations] = useState<PayoutRecommendation[]>([
    {
      id: 'REC-AURORA-01',
      createdAt: new Date().toISOString(),
      requesterName: 'Anonymous Collaborator',
      isAnonymous: true,
      reasonOrNeed: 'Upcoming studio milestone & personal living liquidity review',
      recommendedDate: 'Friday, Nov 1, 2026',
      recommendedAmountCents: 268158,
      feeOptimizationNote: 'Recommends scheduling the batch release on Friday, Nov 1 to clear pending reserves while keeping relative PayPal fee drag under 1.1%.',
      status: 'PENDING_REVIEW',
    },
  ]);

  const handlePushRecommendation = (rec: PayoutRecommendation) => {
    setPayoutRecommendations((prev) => [rec, ...prev.filter((r) => r.id !== rec.id)]);
    setActiveTab('payments');
    setIsAdvisorOpen(false);
  };

  const handleDismissRecommendation = (id: string) => {
    setPayoutRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'DISMISSED' as const } : r))
    );
  };

  // Compute Studio Financial Totals
  const totalGrossCents = inflows.reduce((sum, inf) => sum + inf.grossCents, 0);
  const totalNetCents = inflows.reduce((sum, inf) => sum + inf.netCents, 0);
  let totalPaidCents = 0;
  payoutBatches.forEach((batch) => {
    batch.items.forEach((item) => {
      if (item.status === 'SUCCESS') totalPaidCents += item.amountCents;
    });
  });

  // Recalculate the unpaid pool under a signed epoch while keeping the source
  // inflows and completed payout records intact.
  const reallocatePendingReservesForEpoch = (epoch: Epoch) => {
    const previousPendingCents = calculateMemberBalances(inflows, payoutBatches, reserveReallocations);
    const totalUnclaimedCents = MEMBER_ROLES.reduce(
      (sum, role) => sum + previousPendingCents[role],
      0
    );

    if (totalUnclaimedCents <= 0) return;

    const reallocation: ReserveReallocation = {
      id: `RESERVE-${epoch.epochId}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      epochId: epoch.epochId,
      epochHash: epoch.hash,
      previousPendingCents,
      allocations: allocateCentsFairly(totalUnclaimedCents, epoch.splits),
      includedInflowIds: inflows.map((inflow) => inflow.id),
      includedPayoutItemIds: payoutBatches.flatMap((batch) =>
        batch.items.filter((item) => item.status === 'SUCCESS').map((item) => item.senderItemId)
      ),
    };

    setReserveReallocations((previous) => [...previous, reallocation]);
  };

  // Ratify new epoch
  const handleNewEpochRatified = (newEpoch: Epoch) => {
    // Supersede previously active epoch
    const updatedEpochs = epochs.map((e) =>
      e.epochId === activeEpoch.epochId ? { ...e, status: 'SUPERSEDED' as const } : e
    );
    const nextEpochs = [...updatedEpochs, newEpoch];

    setEpochs(nextEpochs);
    setActiveEpoch(newEpoch);
    reallocatePendingReservesForEpoch(newEpoch);
  };

  // Capture new inflow
  const handleNewInflow = (newInflow: Inflow) => {
    setInflows((prev) => [newInflow, ...prev]);
  };

  // Quick Inflow Simulator under active epoch
  const handleSimulateQuickInflow = (grossDollars: number = 1000) => {
    const grossCents = dollarsToCents(grossDollars);
    const feeCents = calculatePayPalFeeCents(grossCents);
    const netCents = Math.max(0, grossCents - feeCents);
    const allocations = allocateCentsFairly(netCents, activeEpoch.splits);
    const now = new Date().toISOString();
    const simulationId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newInflow: Inflow = {
      id: `SIM-INF-${simulationId}`,
      source: `Steam Sale Batch (${activeEpoch.version} Inflow)`,
      grossCents,
      feeCents,
      netCents,
      currency: 'USD',
      timestamp: now,
      paypalOrderId: `ORDER-${simulationId}`,
      paymentMode: 'SIMULATED',
      paymentStatus: 'SIMULATED',
      epochId: activeEpoch.epochId,
      epochHash: activeEpoch.hash,
      allocations,
    };
    setInflows((prev) => [newInflow, ...prev]);
  };

  const handleClearSimulatedInflows = () => {
    const simulatedIds = new Set(inflows.filter(isSimulatedInflow).map((inflow) => inflow.id));
    if (simulatedIds.size === 0) return;

    setInflows((prev) => prev.filter((inflow) => !simulatedIds.has(inflow.id)));

    // Keep the latest reserve snapshot that predates simulated inflows, if one exists.
    let lastValidReallocationIndex = -1;
    reserveReallocations.forEach((reallocation, index) => {
      const includesSimulation = reallocation.includedInflowIds.some((id) => simulatedIds.has(id));
      if (!includesSimulation) lastValidReallocationIndex = index;
    });
    setReserveReallocations((prev) => prev.slice(0, lastValidReallocationIndex + 1));
  };

  // Fallback for pending reserves that predate this session's ratification.
  const handleApplyActiveEpochToReserves = () => {
    reallocatePendingReservesForEpoch(activeEpoch);
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
        currentMember={currentMember}
        members={MEMBERS}
        onSwitchMember={(role) => setCurrentMemberId(role)}
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
            currentMember={currentMember}
          />
        )}

        {activeTab === 'ledger' && (
          <TrustLedger
            epochs={epochs}
            inflows={inflows}
            onTamperEpoch={handleTamperEpoch}
            onRestoreEpochs={handleRestoreEpochs}
            isTampered={isTampered}
            onVerifyChain={handleVerifyChain}
            isVerifyingChain={isVerifyingChain}
          />
        )}

        {activeTab === 'balances' && (
          <CollaboratorBalances
            members={MEMBERS}
            activeEpoch={activeEpoch}
            inflows={inflows}
            payoutBatches={payoutBatches}
            reserveReallocations={reserveReallocations}
            onApplyActiveEpochToReserves={handleApplyActiveEpochToReserves}
            onNavigateToPayouts={() => setActiveTab('payments')}
            currentMember={currentMember}
            onSimulateQuickInflow={handleSimulateQuickInflow}
            onClearSimulatedInflows={handleClearSimulatedInflows}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsHub
            members={MEMBERS}
            activeEpoch={activeEpoch}
            inflows={inflows}
            payoutBatches={payoutBatches}
            reserveReallocations={reserveReallocations}
            onNewInflow={handleNewInflow}
            onNewPayoutBatch={handleNewPayoutBatch}
            payoutRecommendations={payoutRecommendations}
            onDismissRecommendation={handleDismissRecommendation}
            onPreloadBatch={() => setActiveTab('payments')}
            currentMember={currentMember}
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
        onPushRecommendation={handlePushRecommendation}
        currentMember={currentMember}
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
