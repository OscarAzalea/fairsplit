import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  allocateCentsFairly,
  calculatePayPalFeeCents,
  rebalanceSplits,
  TOTAL_BPS,
} from '../src/lib/fairsplit-math.ts';
import { calculateMemberBalances, MEMBER_ROLES } from '../src/lib/balances.ts';
import { computeEpochHash, verifyEpochChain } from '../src/lib/crypto.ts';
import { INITIAL_INFLOWS, INITIAL_PAYOUT_BATCHES } from '../src/lib/initial-data.ts';
import type { Epoch, Inflow, PayoutBatch, ReserveReallocation } from '../src/lib/types.ts';

describe('1. Financial Accounting & Hamilton-Hare Largest Remainder Invariant', () => {
  it('guarantees sum(allocations) === netCents for varied cent amounts', () => {
    const splits = [
      { memberId: 'dev' as const, bps: 4000 },
      { memberId: 'artist' as const, bps: 3000 },
      { memberId: 'writer' as const, bps: 2000 },
      { memberId: 'composer' as const, bps: 1000 },
    ];

    // Test a wide variety of realistic commercial amounts
    const testAmounts = [
      1, 10, 99, 100, 333, 4999, 6500, 12500, 250000, 999999, 10000000,
    ];

    for (let i = 1; i <= 100; i++) {
      testAmounts.push((i * 7919) % 500000 + 1);
    }

    for (const netCents of testAmounts) {
      const allocations = allocateCentsFairly(netCents, splits);
      const allocatedSum = allocations.reduce((sum, a) => sum + a.cents, 0);

      assert.equal(
        allocatedSum,
        netCents,
        `Allocation sum (${allocatedSum}) must exactly equal netCents (${netCents})`
      );
    }
  });

  it('correctly handles non-standard split distributions (e.g. 33.33% / 33.33% / 33.34%)', () => {
    const oddSplits = [
      { memberId: 'dev' as const, bps: 3333 },
      { memberId: 'artist' as const, bps: 3333 },
      { memberId: 'writer' as const, bps: 3334 },
      { memberId: 'composer' as const, bps: 0 },
    ];

    const netCents = 10000; // $100.00
    const allocations = allocateCentsFairly(netCents, oddSplits);
    const sum = allocations.reduce((acc, a) => acc + a.cents, 0);

    assert.equal(sum, 10000);
    // Dev: 3333, Artist: 3333, Writer: 3334
    assert.equal(allocations.find((a) => a.memberId === 'writer')?.cents, 3334);
  });
});

describe('2. Split Dial Auto-Rebalance & Zero-Trap Recovery', () => {
  it('strictly preserves 10,000 BPS (100.00%) invariant on every dial change', () => {
    const initialSplits = { dev: 4000, artist: 3000, writer: 2000, composer: 1000 };

    const testChanges = [
      { role: 'composer' as const, newBps: 2500 },
      { role: 'dev' as const, newBps: 5500 },
      { role: 'artist' as const, newBps: 1000 },
      { role: 'writer' as const, newBps: 0 },
      { role: 'dev' as const, newBps: 10000 },
    ];

    let current = initialSplits;
    for (const change of testChanges) {
      current = rebalanceSplits(current, change.role, change.newBps);
      const sum = current.dev + current.artist + current.writer + current.composer;
      assert.equal(sum, TOTAL_BPS, `Sum of splits must be exactly 10,000 BPS, got ${sum}`);
    }
  });

  it('recovers cleanly when other members are depleted: distributes surplus evenly when remaining were zero', () => {
    const allZeroOthers = { dev: 10000, artist: 0, writer: 0, composer: 0 };
    const rebalanced = rebalanceSplits(allZeroOthers, 'dev', 4000);
    const sum = rebalanced.dev + rebalanced.artist + rebalanced.writer + rebalanced.composer;

    assert.equal(sum, TOTAL_BPS);
    assert.equal(rebalanced.dev, 4000);
    assert.equal(rebalanced.artist, 2000);
    assert.equal(rebalanced.writer, 2000);
    assert.equal(rebalanced.composer, 2000);
  });
});

describe('3. Illustrative Checkout Fee Estimate', () => {
  it('computes the demo assumption in cents and never exceeds gross', () => {
    // $10.00 = 1000 cents -> 1000 * 0.0299 = 29.9 -> 30 cents + 49 cents = 79 cents
    assert.equal(calculatePayPalFeeCents(1000), 79);

    // $49.99 = 4999 cents -> 4999 * 0.0299 = 149.47 -> 149 cents + 49 cents = 198 cents
    assert.equal(calculatePayPalFeeCents(4999), 198);

    // $0.00 = 0 fee
    assert.equal(calculatePayPalFeeCents(0), 0);
    assert.equal(calculatePayPalFeeCents(1), 1);
  });
});

describe('4. Cumulative Reserve Balances & Demo Payout Deductions', () => {
  it('correctly tracks member balances and only deducts successful payout items', () => {
    const genesisEpoch: Epoch = {
      epochId: 'epoch-v1.0',
      version: 'v1.0',
      title: 'Genesis',
      description: 'Genesis',
      createdAt: '2026-10-01T00:00:00.000Z',
      effectiveFrom: '2026-10-01T00:00:00.000Z',
      splits: [
        { memberId: 'dev', bps: 4000 },
        { memberId: 'artist', bps: 3000 },
        { memberId: 'writer', bps: 2000 },
        { memberId: 'composer', bps: 1000 },
      ],
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      hash: 'test-genesis-hash',
      signatures: [],
      status: 'ACTIVE',
    };

    const inflows: Inflow[] = [
      {
        id: 'INF-TEST-1',
        source: 'itch.io Sale',
        grossCents: 10000,
        feeCents: 348,
        netCents: 9652,
        currency: 'USD',
        timestamp: '2026-10-15T00:00:00.000Z',
        paypalOrderId: 'ORD-1',
        epochId: genesisEpoch.epochId,
        epochHash: genesisEpoch.hash,
        allocations: allocateCentsFairly(9652, genesisEpoch.splits),
      },
    ];

    // Initial balances before any payout
    const initialBalances = calculateMemberBalances(inflows, []);
    // Total net cents allocated across all members must equal 9652
    const totalAllocated = MEMBER_ROLES.reduce((sum, role) => sum + initialBalances[role], 0);
    assert.equal(totalAllocated, 9652);

    // Simulate batch payout where dev succeeds ($20.00 = 2000 cents) and artist fails ($15.00)
    const payoutBatches: PayoutBatch[] = [
      {
        senderBatchId: 'SIM-BATCH-001',
        payoutBatchId: 'SIM-BATCH-RESULT-1',
        timestamp: '2026-10-20T00:00:00.000Z',
        totalCents: 3500,
        mode: 'SIMULATED',
        status: 'SUCCESS',
        items: [
          {
            memberId: 'dev',
            memberName: 'Alex Mercer',
            receiverEmail: 'alex.dev@aurora.studio',
            amountCents: 2000,
            currency: 'USD',
            status: 'SUCCESS',
            senderItemId: 'ITEM-DEV-1',
            payoutItemId: 'SIM-ITEM-1',
            note: 'Demo payout',
          },
          {
            memberId: 'artist',
            memberName: 'Elena Vance',
            receiverEmail: 'elena.art@aurora.studio',
            amountCents: 1500,
            currency: 'USD',
            status: 'FAILED', // Failed payout should NOT deduct from balance
            senderItemId: 'ITEM-ART-1',
            error: 'Receiver account restricted',
            note: 'Demo payout',
          },
        ],
      },
    ];

    const updatedBalances = calculateMemberBalances(inflows, payoutBatches);

    // Dev balance decreased by exactly 2000 cents
    assert.equal(updatedBalances.dev, initialBalances.dev - 2000);
    // Artist balance is UNCHANGED because their payout failed
    assert.equal(updatedBalances.artist, initialBalances.artist);
  });

  it('applies the 25/55/15/5 split to the seeded unpaid reserve', () => {
    const before = calculateMemberBalances(INITIAL_INFLOWS, INITIAL_PAYOUT_BATCHES);
    const totalPending = MEMBER_ROLES.reduce((sum, role) => sum + before[role], 0);
    assert.equal(totalPending, 268158);

    const newSplits = [
      { memberId: 'dev' as const, bps: 2500 },
      { memberId: 'artist' as const, bps: 5500 },
      { memberId: 'writer' as const, bps: 1500 },
      { memberId: 'composer' as const, bps: 500 },
    ];
    const snapshot: ReserveReallocation = {
      id: 'TEST-RESERVE',
      createdAt: '2026-10-24T00:00:00.000Z',
      epochId: 'epoch-v2.0',
      epochHash: 'test-v2-hash',
      previousPendingCents: before,
      allocations: allocateCentsFairly(totalPending, newSplits),
      includedInflowIds: INITIAL_INFLOWS.map((inflow) => inflow.id),
      includedPayoutItemIds: INITIAL_PAYOUT_BATCHES.flatMap((batch) =>
        batch.items.filter((item) => item.status === 'SUCCESS').map((item) => item.senderItemId)
      ),
    };

    const balances = calculateMemberBalances(INITIAL_INFLOWS, INITIAL_PAYOUT_BATCHES, [snapshot]);
    assert.equal(balances.dev, 67039);
    assert.equal(balances.artist, 147487);

    const demoNetCents = 96961;
    const demoInflow: Inflow = {
      ...INITIAL_INFLOWS[0],
      id: 'SIM-INF-TEST',
      source: 'Demo inflow',
      grossCents: 100000,
      feeCents: 3039,
      netCents: demoNetCents,
      allocations: allocateCentsFairly(demoNetCents, newSplits),
    };
    const withDemo = calculateMemberBalances([...INITIAL_INFLOWS, demoInflow], INITIAL_PAYOUT_BATCHES, [snapshot]);
    assert.equal(withDemo.dev - balances.dev, 24240);
    assert.equal(withDemo.artist - balances.artist, 53329);
    assert.deepEqual(calculateMemberBalances(INITIAL_INFLOWS, INITIAL_PAYOUT_BATCHES, [snapshot]), balances);
  });
});

describe('5. SHA-256 Epoch Chaining & Tamper Anomaly Detection', () => {
  it('validates authentic epoch chains and detects unauthorized split tampering', () => {
    const genesisSplits = [
      { memberId: 'dev' as const, bps: 4000 },
      { memberId: 'artist' as const, bps: 3000 },
      { memberId: 'writer' as const, bps: 2000 },
      { memberId: 'composer' as const, bps: 1000 },
    ];

    const genesisHash = computeEpochHash(
      'epoch-v1.0',
      'v1.0',
      '0000000000000000000000000000000000000000000000000000000000000000',
      genesisSplits,
      '2026-10-01T00:00:00.000Z'
    );

    const authenticGenesis: Epoch = {
      epochId: 'epoch-v1.0',
      version: 'v1.0',
      title: 'Genesis',
      description: 'Genesis agreement',
      createdAt: '2026-10-01T00:00:00.000Z',
      effectiveFrom: '2026-10-01T00:00:00.000Z',
      splits: genesisSplits,
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      hash: genesisHash,
      signatures: [],
      status: 'ACTIVE',
    };

    // Authentic chain must verify as valid
    const validResult = verifyEpochChain([authenticGenesis]);
    assert.equal(validResult.isValid, true);

    // Now simulate an unauthorized split tamper: dev covertly inflates their share to 55%
    const tamperedGenesis: Epoch = {
      ...authenticGenesis,
      splits: [
        { memberId: 'dev', bps: 5500 }, // Tampered from 4000 to 5500
        { memberId: 'artist', bps: 2500 },
        { memberId: 'writer', bps: 1000 },
        { memberId: 'composer', bps: 1000 },
      ],
      // The hash is NOT updated, creating a cryptographic mismatch
    };

    const tamperResult = verifyEpochChain([tamperedGenesis]);
    assert.equal(tamperResult.isValid, false);
    assert.equal(tamperResult.brokenEpochIndex, 0);

    assert.equal(tamperResult.forensics?.confidence, 'INCONCLUSIVE');
    assert.equal(tamperResult.forensics?.suspectRole, undefined);
  });
});
