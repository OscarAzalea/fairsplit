import type {  Inflow, MemberRole, PayoutBatch, ReserveReallocation  } from './types';

export const MEMBER_ROLES: MemberRole[] = ['dev', 'artist', 'writer', 'composer'];

export function isSimulatedInflow(inflow: Inflow): boolean {
  return inflow.paymentMode === 'SIMULATED' ||
    (inflow.paypalOrderId.startsWith('ORDER-') && inflow.source.startsWith('Steam Sale Batch ('));
}

const emptyBalances = (): Record<MemberRole, number> => ({
  dev: 0,
  artist: 0,
  writer: 0,
  composer: 0,
});

export function calculateSettledPayouts(
  payoutBatches: PayoutBatch[]
): Record<MemberRole, number> {
  const paidCents = emptyBalances();

  payoutBatches.forEach((batch) => {
    batch.items.forEach((item) => {
      if (item.status === 'SUCCESS') {
        paidCents[item.memberId] += item.amountCents;
      }
    });
  });

  return paidCents;
}

/**
 * Computes the current unpaid reserve from immutable inflows, successful payouts,
 * and any reserve reallocations. Reallocations act as snapshots: later inflows and
 * payouts are applied on top, while the original ledger entries remain unchanged.
 */
export function calculateMemberBalances(
  inflows: Inflow[],
  payoutBatches: PayoutBatch[],
  reserveReallocations: ReserveReallocation[] = []
): Record<MemberRole, number> {
  const latestReallocation = reserveReallocations[reserveReallocations.length - 1];
  const balances = emptyBalances();
  const includedInflowIds = new Set(latestReallocation?.includedInflowIds ?? []);
  const includedPayoutItemIds = new Set(latestReallocation?.includedPayoutItemIds ?? []);

  if (latestReallocation) {
    latestReallocation.allocations.forEach((allocation) => {
      balances[allocation.memberId] += allocation.cents;
    });
  }

  inflows.forEach((inflow) => {
    if (includedInflowIds.has(inflow.id)) return;
    inflow.allocations.forEach((allocation) => {
      balances[allocation.memberId] += allocation.cents;
    });
  });

  payoutBatches.forEach((batch) => {
    batch.items.forEach((item) => {
      if (item.status === 'SUCCESS' && !includedPayoutItemIds.has(item.senderItemId)) {
        balances[item.memberId] -= item.amountCents;
      }
    });
  });

  return balances;
}
