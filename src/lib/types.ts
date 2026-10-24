export type MemberRole = 'dev' | 'artist' | 'writer' | 'composer';

export interface Member {
  id: MemberRole;
  name: string;
  roleTitle: string;
  avatar: string;
  paypalEmail: string;
  baseColor: string; // Tailwind color theme identifier
}

export interface EpochSplit {
  memberId: MemberRole;
  bps: number; // 10000 = 100.00%
}

export interface RatificationSignature {
  memberId: MemberRole;
  name: string;
  signedAt: string;
  signatureHash: string; // SHA-256 of epoch canonical payload + secret
  comment?: string;
}

export interface Epoch {
  epochId: string; // e.g. "epoch-v1.0"
  version: string; // "v1.0", "v2.0"
  title: string;
  description: string;
  createdAt: string;
  effectiveFrom: string;
  splits: EpochSplit[];
  previousHash: string; // 64 hex chars or all zeros for genesis
  hash: string; // SHA-256 canonical hash
  signatures: RatificationSignature[];
  status: 'ACTIVE' | 'PROPOSED' | 'SUPERSEDED';
}

export interface InflowAllocation {
  memberId: MemberRole;
  bps: number;
  cents: number;
}

export interface Inflow {
  id: string; // e.g. "INF-001"
  source: string; // e.g. "Steam Early Access Launch Batch"
  grossCents: number;
  feeCents: number;
  netCents: number;
  currency: 'USD';
  timestamp: string;
  paypalOrderId: string;
  paypalCaptureId?: string;
  paymentMode?: 'PAYPAL_SANDBOX' | 'SIMULATED';
  paymentStatus?: 'COMPLETED' | 'SIMULATED';
  epochId: string; // Immutable link to active epoch
  epochHash: string; // Immutable tie to active epoch SHA-256
  allocations: InflowAllocation[];
}

/**
 * An auditable redistribution of the unpaid reserve under a newly ratified epoch.
 * It leaves the original inflow allocations and completed payouts untouched.
 */
export interface ReserveReallocation {
  id: string;
  createdAt: string;
  epochId: string;
  epochHash: string;
  previousPendingCents: Record<MemberRole, number>;
  allocations: InflowAllocation[];
  includedInflowIds: string[];
  includedPayoutItemIds: string[];
}

export type PayoutStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface PayoutItem {
  senderItemId: string; // Idempotency key, e.g. "ITEM-AURORA-DEV-20261023-01"
  payoutItemId?: string; // PayPal assigned ID
  memberId: MemberRole;
  memberName: string;
  receiverEmail: string;
  amountCents: number;
  currency: 'USD';
  status: PayoutStatus;
  processedAt?: string;
  note: string;
  error?: string;
}

export interface PayoutBatch {
  senderBatchId: string; // Idempotency key, e.g. "BATCH-AURORA-20261023-8942"
  payoutBatchId?: string; // PayPal assigned batch ID
  timestamp: string;
  totalCents: number;
  status: PayoutStatus;
  items: PayoutItem[];
  rawPayload?: Record<string, unknown>;
  rawResponse?: Record<string, unknown>;
}

export interface MemberBalanceSummary {
  memberId: MemberRole;
  name: string;
  roleTitle: string;
  paypalEmail: string;
  totalAllocatedCents: number;
  totalPaidOutCents: number;
  pendingBalanceCents: number;
  inflowCount: number;
}

export interface NegotiationResult {
  aiProvider: 'gemini' | 'heuristic';
  summary: string;
  socraticQuestions: string[];
  compromiseSplits: Record<MemberRole, number>;
  consensusLikelihoodScore: number; // 0 - 100
  plainRationale: string;
  suggestedAction: string;
}

export interface BalanceAuditResult {
  aiProvider: 'gemini' | 'heuristic';
  memberId: MemberRole;
  memberName: string;
  summary: string;
  totalPendingDollars: string;
  epochBreakdown: {
    epochVersion: string;
    bps: number;
    inflowSource: string;
    grossDollars: string;
    feeDollars: string;
    netDollars: string;
    memberShareDollars: string;
    verifiedEpochHash: string;
  }[];
  reserveReallocationHistory: {
    date: string;
    epochVersion: string;
    previousPendingDollars: string;
    newPendingDollars: string;
    changeDollars: string;
  }[];
  payoutHistory: {
    date: string;
    amountDollars: string;
    batchId: string;
    status: string;
  }[];
  integrityAttestation: string;
}

export type ForensicConfidence = 'HIGH' | 'INCONCLUSIVE';

export interface ForensicAttribution {
  suspectRole?: MemberRole;
  suspectName?: string;
  confidence: ForensicConfidence;
  tamperType: 'UNAUTHORIZED_EQUITY_INFLATION' | 'SIGNATURE_FORGERY' | 'LINK_CORRUPTION' | 'UNKNOWN';
  evidence: string;
  verdict: string;
}

export interface ChainVerificationResult {
  isValid: boolean;
  brokenEpochIndex: number | null;
  details: string;
  forensics?: ForensicAttribution;
}

export interface StudioAdviceResult {
  topic: string;
  executiveSummary: string;
  strategicInsight: string;
  actionSteps: string[];
  financialImpact: string;
  confidenceScore: number;
}

export interface PayoutRecommendation {
  id: string;
  createdAt: string;
  requesterRole?: MemberRole;
  requesterName: string;
  isAnonymous: boolean;
  reasonOrNeed: string;
  recommendedDate: string;
  recommendedAmountCents: number;
  feeOptimizationNote: string;
  status: 'PENDING_REVIEW' | 'PRE_AUTHORIZED' | 'DISMISSED';
}

export interface StudioChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  quickOptions?: {
    label: string;
    value: string;
  }[];
  payoutProposal?: PayoutRecommendation;
  isPushedToQueue?: boolean;
}

export interface StudioChatResult {
  reply: string;
  quickOptions?: {
    label: string;
    value: string;
  }[];
  proposal?: PayoutRecommendation;
}



