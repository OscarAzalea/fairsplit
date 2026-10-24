import type { Epoch, Inflow, Member, PayoutBatch } from './types';
import { computeEpochHash, generateMemberSignatureHash } from './crypto';
import { allocateCentsFairly, calculatePayPalFeeCents, dollarsToCents } from './fairsplit-math';

export const MEMBERS: Member[] = [
  {
    id: 'dev',
    name: 'Alex Mercer',
    roleTitle: 'Lead Engineer & Tech Director',
    avatar: '👨‍💻',
    paypalEmail: 'alex.dev@auroragame.studio',
    baseColor: 'blue',
  },
  {
    id: 'artist',
    name: 'Elena Vance',
    roleTitle: 'Art Director & 3D Lead',
    avatar: '🎨',
    paypalEmail: 'elena.art@auroragame.studio',
    baseColor: 'emerald',
  },
  {
    id: 'writer',
    name: 'Marcus Chen',
    roleTitle: 'Narrative Lead & Worldbuilder',
    avatar: '✍️',
    paypalEmail: 'marcus.writer@auroragame.studio',
    baseColor: 'amber',
  },
  {
    id: 'composer',
    name: 'Lyra Song',
    roleTitle: 'Sound Designer & OST Composer',
    avatar: '🎵',
    paypalEmail: 'lyra.music@auroragame.studio',
    baseColor: 'purple',
  },
];

const GENESIS_CREATED_AT = '2026-10-01T12:00:00.000Z';
const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

const genesisSplits = [
  { memberId: 'dev' as const, bps: 4000 },
  { memberId: 'artist' as const, bps: 3000 },
  { memberId: 'writer' as const, bps: 2000 },
  { memberId: 'composer' as const, bps: 1000 },
];

const genesisHash = computeEpochHash(
  'epoch-v1.0',
  'v1.0',
  GENESIS_PREV_HASH,
  genesisSplits,
  GENESIS_CREATED_AT
);

export const GENESIS_EPOCH: Epoch = {
  epochId: 'epoch-v1.0',
  version: 'v1.0',
  title: 'Project Aurora: Production Genesis Agreement',
  description:
    'Core rev-share ratification establishing foundational equity for pre-launch development milestones.',
  createdAt: GENESIS_CREATED_AT,
  effectiveFrom: GENESIS_CREATED_AT,
  splits: genesisSplits,
  previousHash: GENESIS_PREV_HASH,
  hash: genesisHash,
  signatures: MEMBERS.map((m) => ({
    memberId: m.id,
    name: m.name,
    signedAt: GENESIS_CREATED_AT,
    signatureHash: generateMemberSignatureHash(m.id, genesisHash, GENESIS_CREATED_AT),
    comment: 'Ratified genesis baseline for Project Aurora.',
  })),
  status: 'ACTIVE',
};

// Initial Seed Inflows under Epoch v1.0
function createSeedInflow(
  id: string,
  source: string,
  grossDollars: number,
  timestamp: string,
  paypalOrderId: string,
  epoch: Epoch
): Inflow {
  const grossCents = dollarsToCents(grossDollars);
  const feeCents = calculatePayPalFeeCents(grossCents);
  const netCents = grossCents - feeCents;
  const allocations = allocateCentsFairly(netCents, epoch.splits);

  return {
    id,
    source,
    grossCents,
    feeCents,
    netCents,
    currency: 'USD',
    timestamp,
    paypalOrderId,
    paymentMode: 'SEED',
    paymentStatus: 'SAMPLE',
    feeIsEstimated: true,
    epochId: epoch.epochId,
    epochHash: epoch.hash,
    allocations,
  };
}

export const INITIAL_INFLOWS: Inflow[] = [
  createSeedInflow(
    'INF-001',
    'itch.io Direct Launch Batch (Digital Deluxe)',
    2500.0,
    '2026-10-15T18:30:00.000Z',
    'SEED-ORDER-STEAM-9182',
    GENESIS_EPOCH
  ),
  createSeedInflow(
    'INF-002',
    'Bandcamp Deluxe OST & Artbook Bundle',
    450.0,
    '2026-10-18T14:15:00.000Z',
    'SEED-ORDER-BC-7721',
    GENESIS_EPOCH
  ),
  createSeedInflow(
    'INF-003',
    'itch.io Creator Spotlight Supporter Pass',
    125.0,
    '2026-10-21T09:45:00.000Z',
    'SEED-ORDER-ITCH-3304',
    GENESIS_EPOCH
  ),
];

export const INITIAL_PAYOUT_BATCHES: PayoutBatch[] = [
  {
    senderBatchId: 'BATCH-AURORA-20261019-1001',
    payoutBatchId: 'SEED-BATCH-88291034',
    timestamp: '2026-10-19T16:00:00.000Z',
    totalCents: 30000, // $300 total seed distribution
    status: 'SUCCESS',
    mode: 'SEED',
    items: [
      {
        senderItemId: 'ITEM-AURORA-DEV-001',
        payoutItemId: 'SEED-ITEM-9911',
        memberId: 'dev',
        memberName: 'Alex Mercer',
        receiverEmail: 'alex.dev@auroragame.studio',
        amountCents: 12000, // $120.00
        currency: 'USD',
        status: 'SUCCESS',
        processedAt: '2026-10-19T16:00:05.000Z',
        note: 'Initial distribution milestone advance',
      },
      {
        senderItemId: 'ITEM-AURORA-ART-001',
        payoutItemId: 'SEED-ITEM-9912',
        memberId: 'artist',
        memberName: 'Elena Vance',
        receiverEmail: 'elena.art@auroragame.studio',
        amountCents: 9000, // $90.00
        currency: 'USD',
        status: 'SUCCESS',
        processedAt: '2026-10-19T16:00:06.000Z',
        note: 'Initial distribution milestone advance',
      },
      {
        senderItemId: 'ITEM-AURORA-WRT-001',
        payoutItemId: 'SEED-ITEM-9913',
        memberId: 'writer',
        memberName: 'Marcus Chen',
        receiverEmail: 'marcus.writer@auroragame.studio',
        amountCents: 6000, // $60.00
        currency: 'USD',
        status: 'SUCCESS',
        processedAt: '2026-10-19T16:00:07.000Z',
        note: 'Initial distribution milestone advance',
      },
      {
        senderItemId: 'ITEM-AURORA-CMP-001',
        payoutItemId: 'SEED-ITEM-9914',
        memberId: 'composer',
        memberName: 'Lyra Song',
        receiverEmail: 'lyra.music@auroragame.studio',
        amountCents: 3000, // $30.00
        currency: 'USD',
        status: 'SUCCESS',
        processedAt: '2026-10-19T16:00:08.000Z',
        note: 'Initial distribution milestone advance',
      },
    ],
  },
];
