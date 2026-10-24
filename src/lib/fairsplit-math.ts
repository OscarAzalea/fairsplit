import { EpochSplit, InflowAllocation, MemberRole } from './types';

export const TOTAL_BPS = 10000; // 100.00%

/**
 * Converts a dollar amount to integer cents deterministically.
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Converts cents to a human-readable USD string format, e.g. "$1,234.56".
 */
export function centsToDollars(cents: number): string {
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const dollars = (absCents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}$${dollars}`;
}

/**
 * Formats basis points into human-readable percentage, e.g. 4000 -> "40.0%".
 */
export function bpsToPercent(bps: number): string {
  const pct = (bps / 100).toFixed(1);
  return `${pct.endsWith('.0') ? pct.slice(0, -2) : pct}%`;
}

/**
 * Exact percentage representation with 2 decimals, e.g. 3333 -> "33.33%".
 */
export function bpsToExactPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/**
 * Calculates PayPal Standard Commercial transaction fee in cents:
 * 2.99% + $0.49 (49 cents).
 */
export function calculatePayPalFeeCents(grossCents: number): number {
  if (grossCents <= 0) return 0;
  // 2.99% = 0.0299 * grossCents + 49 cents fixed
  const percentageFee = Math.round(grossCents * 0.0299);
  const fixedFee = 49;
  return percentageFee + fixedFee;
}

/**
 * Hamilton-Hare Largest Remainder Method for Fair Penny Allocation.
 * Ensures the sum of individual member allocations strictly equals netInflowCents
 * with zero penny loss or drift, regardless of how uneven the splits are.
 */
export function allocateCentsFairly(
  netInflowCents: number,
  splits: EpochSplit[]
): InflowAllocation[] {
  if (netInflowCents <= 0) {
    return splits.map((s) => ({
      memberId: s.memberId,
      bps: s.bps,
      cents: 0,
    }));
  }

  // Calculate base allocations and remainders
  const allocations = splits.map((split, index) => {
    const rawCents = (netInflowCents * split.bps) / TOTAL_BPS;
    const floorCents = Math.floor(rawCents);
    const remainder = netInflowCents * split.bps - floorCents * TOTAL_BPS;

    return {
      index,
      memberId: split.memberId,
      bps: split.bps,
      cents: floorCents,
      remainder,
    };
  });

  // Calculate remaining pennies (shortfall)
  const currentTotal = allocations.reduce((acc, curr) => acc + curr.cents, 0);
  const shortfall = netInflowCents - currentTotal;

  // Award +1 cent to members with the largest remainders
  if (shortfall > 0) {
    // Sort by remainder descending
    const sorted = [...allocations].sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < shortfall; i++) {
      sorted[i % sorted.length].cents += 1;
    }
  }

  return allocations.map((a) => ({
    memberId: a.memberId,
    bps: a.bps,
    cents: a.cents,
  }));
}

/**
 * Re-balances splits when one member's dial is dragged,
 * locking frozen members and proportionally adjusting the others so total === 10000 bps.
 */
export function rebalanceSplits(
  currentSplits: Record<MemberRole, number>,
  changedMember: MemberRole,
  newBps: number,
  lockedMembers: Set<MemberRole> = new Set()
): Record<MemberRole, number> {
  const clampedNewBps = Math.max(0, Math.min(TOTAL_BPS, Math.round(Number(newBps) || 0)));
  const roles: MemberRole[] = ['dev', 'artist', 'writer', 'composer'];

  // Identify unlocked members other than the changed one
  const otherUnlockedRoles = roles.filter(
    (role) => role !== changedMember && !lockedMembers.has(role)
  );

  // If no other members are unlocked, cannot change
  if (otherUnlockedRoles.length === 0) {
    return { ...currentSplits };
  }

  // Calculate total locked BPS
  const lockedBpsTotal = roles
    .filter((role) => lockedMembers.has(role) && role !== changedMember)
    .reduce((sum, role) => sum + (currentSplits[role] || 0), 0);

  // Maximum allowed for changed member
  const maxAllowedForChanged = Math.max(0, TOTAL_BPS - lockedBpsTotal);
  const targetChangedBps = Math.min(clampedNewBps, maxAllowedForChanged);

  const remainingToDistribute = Math.max(0, TOTAL_BPS - lockedBpsTotal - targetChangedBps);
  const previousOtherUnlockedTotal = otherUnlockedRoles.reduce(
    (sum, role) => sum + (currentSplits[role] || 0),
    0
  );

  const nextSplits: Record<MemberRole, number> = { ...currentSplits };
  nextSplits[changedMember] = targetChangedBps;

  if (remainingToDistribute === 0) {
    // Everyone else unlocked becomes 0
    otherUnlockedRoles.forEach((role) => {
      nextSplits[role] = 0;
    });
    return nextSplits;
  }

  // If all other unlocked roles currently have 0 BPS, distribute evenly
  if (previousOtherUnlockedTotal === 0) {
    const evenShare = Math.floor(remainingToDistribute / otherUnlockedRoles.length);
    let distributed = 0;
    otherUnlockedRoles.forEach((role, i) => {
      if (i === otherUnlockedRoles.length - 1) {
        nextSplits[role] = Math.max(0, remainingToDistribute - distributed);
      } else {
        nextSplits[role] = evenShare;
        distributed += evenShare;
      }
    });
  } else {
    // Proportionally distribute
    let distributed = 0;
    otherUnlockedRoles.forEach((role, i) => {
      if (i === otherUnlockedRoles.length - 1) {
        nextSplits[role] = Math.max(0, remainingToDistribute - distributed);
      } else {
        const weight = (currentSplits[role] || 0) / previousOtherUnlockedTotal;
        const share = Math.round(weight * remainingToDistribute);
        nextSplits[role] = Math.max(0, share);
        distributed += share;
      }
    });

    // Fix rounding drift
    const totalNow = roles.reduce((sum, r) => sum + (nextSplits[r] || 0), 0);
    const drift = TOTAL_BPS - totalNow;
    if (drift !== 0 && otherUnlockedRoles.length > 0) {
      nextSplits[otherUnlockedRoles[0]] = Math.max(0, (nextSplits[otherUnlockedRoles[0]] || 0) + drift);
    }
  }

  // Final invariant check: Guarantee strict 10,000 BPS
  const finalSum = roles.reduce((sum, r) => sum + (nextSplits[r] || 0), 0);
  if (finalSum !== TOTAL_BPS && otherUnlockedRoles.length > 0) {
    nextSplits[otherUnlockedRoles[0]] += (TOTAL_BPS - finalSum);
  }

  return nextSplits;
}
