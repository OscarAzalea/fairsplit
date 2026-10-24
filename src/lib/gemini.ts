import { BalanceAuditResult, Epoch, Inflow, Member, MemberRole, NegotiationResult, PayoutBatch, ReserveReallocation, StudioAdviceResult, PayoutRecommendation, StudioChatResult } from './types';
import { bpsToPercent, centsToDollars, TOTAL_BPS } from './fairsplit-math';
import { calculateMemberBalances } from './balances';

interface NegotiationInput {
  currentSplits: Record<MemberRole, number>;
  proposedSplits: Record<MemberRole, number>;
  proposerRole: MemberRole;
  rationale?: string;
  contextNotes?: string;
}

/**
 * Intelligent Socratic Mediation Engine.
 * Calls Gemini REST API if GEMINI_API_KEY is available, otherwise uses
 * advanced heuristic mediation logic with structured output.
 */
export async function runSocraticNegotiation(
  input: NegotiationInput,
  members: Member[]
): Promise<NegotiationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are the FairSplit Socratic AI Mediator for "Project Aurora", an indie game/creative collective rev-share.
Your role is to evaluate a proposed split adjustment, ask probing Socratic questions regarding contribution, risk, asset longevity, and milestone boundaries, and propose a fair compromise that strictly sums to 10,000 basis points (100.00%).

Team Members:
${members.map((m) => `- ${m.name} (${m.roleTitle}, ID: ${m.id})`).join('\n')}

Current Splits (BPS):
${JSON.stringify(input.currentSplits, null, 2)}

Proposed Splits (BPS) by ${input.proposerRole}:
${JSON.stringify(input.proposedSplits, null, 2)}

Proposer Rationale: "${input.rationale || 'General equity re-alignment'}"
Additional Notes: "${input.contextNotes || 'None'}"

Respond ONLY with a valid JSON object matching this schema:
{
  "summary": "Concise 1-2 sentence executive summary of the tension or core trade-off",
  "socraticQuestions": ["Question 1 regarding deliverables/risk", "Question 2 regarding scope/future maintenance", "Question 3 regarding consensus"],
  "compromiseSplits": {
    "dev": <integer bps>,
    "artist": <integer bps>,
    "writer": <integer bps>,
    "composer": <integer bps>
  },
  "consensusLikelihoodScore": <integer 0-100>,
  "plainRationale": "Explanation of why this compromise protects trust and incentivizes release",
  "suggestedAction": "Concrete next step (e.g. Schedule 15-min sync or Ratify proposed compromise)"
}
CRITICAL: The sum of dev, artist, writer, and composer in compromiseSplits MUST EXACTLY EQUAL 10000.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text) as NegotiationResult;
          // Validate 10000 bps invariant
          const sum =
            (parsed.compromiseSplits.dev || 0) +
            (parsed.compromiseSplits.artist || 0) +
            (parsed.compromiseSplits.writer || 0) +
            (parsed.compromiseSplits.composer || 0);

          if (sum === TOTAL_BPS) {
            return { ...parsed, aiProvider: 'gemini' };
          }
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed or timed out, falling back to heuristic engine:', err);
    }
  }

  // Fallback Intelligent Socratic Heuristic Engine
  return generateHeuristicNegotiation(input, members);
}

function generateHeuristicNegotiation(
  input: NegotiationInput,
  members: Member[]
): NegotiationResult {
  const proposer = members.find((m) => m.id === input.proposerRole) || members[0];
  const delta = input.proposedSplits[input.proposerRole] - input.currentSplits[input.proposerRole];

  // Calculate gentle midpoint compromise between current and proposed
  const rawCompromise: Record<MemberRole, number> = {
    dev: Math.round((input.currentSplits.dev + input.proposedSplits.dev) / 2),
    artist: Math.round((input.currentSplits.artist + input.proposedSplits.artist) / 2),
    writer: Math.round((input.currentSplits.writer + input.proposedSplits.writer) / 2),
    composer: Math.round((input.currentSplits.composer + input.proposedSplits.composer) / 2),
  };

  // Ensure exact 10,000 bps
  const sum = rawCompromise.dev + rawCompromise.artist + rawCompromise.writer + rawCompromise.composer;
  const drift = TOTAL_BPS - sum;
  rawCompromise.dev += drift;

  let socraticQuestions: string[] = [];
  let summary = '';
  let rationale = '';

  if (delta > 0) {
    summary = `${proposer.name} (${proposer.roleTitle}) requested a +${bpsToPercent(delta)} equity expansion, shifting proportional weight from other core disciplines.`;
    socraticQuestions = [
      `What ongoing post-launch maintenance, DLC roadmap commitments, or unbilled asset overhead justify this +${bpsToPercent(delta)} expansion?`,
      `Does the reduced allocation for counterpart roles risk demotivating polish during final release certification and bug-fixing sprints?`,
      `Could this adjustment be structured conditionally (e.g., active only for DLC revenue or after hitting a specific milestone)?`,
    ];
    rationale = `The suggested compromise awards +${bpsToPercent(rawCompromise[input.proposerRole] - input.currentSplits[input.proposerRole])} to acknowledge increased workload while keeping the foundational equity distribution stable across engineering and art.`;
  } else if (delta < 0) {
    summary = `${proposer.name} proposed a voluntary reduction of ${bpsToPercent(Math.abs(delta))}, offering to distribute equity to fellow team members.`;
    socraticQuestions = [
      `Is this reallocation reflecting a permanent decrease in production scope, or an acknowledgment of milestone completion?`,
      `Should the ceded percentage be earmarked specifically for post-launch marketing and localization reserves instead?`,
      `Are all team members clear on who assumes responsibility for residual technical debt and release support?`,
    ];
    rationale = `Reallocates surplus equity to bolster collaborative momentum without destabilizing baseline ownership.`;
  } else {
    summary = `Proposed splits mirror the existing active baseline.`;
    socraticQuestions = [
      `Are current milestones proceeding as anticipated under the active epoch?`,
      `Are any contributors facing unforeseen bottlenecks in art pipelines or audio mastering?`,
      `Is it time to formalize milestone 2 deliverables into a ratified v2.0 epoch?`,
    ];
    rationale = `The current split maintains unanimous agreement and matches production velocity.`;
  }

  const consensusScore = Math.max(
    50,
    Math.min(95, 88 - Math.abs(delta) / 50)
  );

  return {
    aiProvider: 'heuristic',
    summary,
    socraticQuestions,
    compromiseSplits: rawCompromise,
    consensusLikelihoodScore: Math.round(consensusScore),
    plainRationale: rationale,
    suggestedAction:
      consensusScore >= 75
        ? 'Proceed to Multi-Party Ratification in Agreement Studio.'
        : 'Review Socratic questions with the team before submitting for final signatures.',
  };
}

/**
 * Generates an exhaustive, transparent Plain-English AI Balance Audit
 * for a specific collaborator. Translates deterministic cents math into
 * an indisputable, human-friendly explanation.
 */
export async function runBalanceAudit(
  memberId: MemberRole,
  member: Member,
  inflows: Inflow[],
  payoutBatches: PayoutBatch[],
  reserveReallocations: ReserveReallocation[] = []
): Promise<BalanceAuditResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Filter member's allocations
  const memberInflowAllocations = inflows.map((inflow) => {
    const alloc = inflow.allocations.find((a) => a.memberId === memberId) || {
      bps: 0,
      cents: 0,
    };
    return {
      inflowId: inflow.id,
      source: inflow.source,
      grossCents: inflow.grossCents,
      feeCents: inflow.feeCents,
      netCents: inflow.netCents,
      memberBps: alloc.bps,
      memberCents: alloc.cents,
      epochId: inflow.epochId,
      epochHash: inflow.epochHash,
      timestamp: inflow.timestamp,
    };
  });

  const totalAllocatedCents = memberInflowAllocations.reduce((sum, i) => sum + i.memberCents, 0);

  // Filter member's payouts
  const memberPayoutItems: {
    date: string;
    amountCents: number;
    batchId: string;
    status: string;
  }[] = [];

  let totalPaidCents = 0;
  payoutBatches.forEach((batch) => {
    batch.items.forEach((item) => {
      if (item.memberId === memberId && item.status === 'SUCCESS') {
        totalPaidCents += item.amountCents;
        memberPayoutItems.push({
          date: item.processedAt || batch.timestamp,
          amountCents: item.amountCents,
          batchId: batch.senderBatchId,
          status: batch.mode === 'SIMULATED' ? 'SIMULATED' : 'SEED SAMPLE',
        });
      }
    });
  });

  const pendingCents = calculateMemberBalances(inflows, payoutBatches, reserveReallocations)[memberId];
  const effectiveAllocatedCents = pendingCents + totalPaidCents;

  const epochBreakdown = memberInflowAllocations.map((item) => ({
    epochVersion: item.epochId.replace('epoch-', ''),
    bps: item.memberBps,
    inflowSource: item.source,
    grossDollars: centsToDollars(item.grossCents),
    feeDollars: centsToDollars(item.feeCents),
    netDollars: centsToDollars(item.netCents),
    memberShareDollars: centsToDollars(item.memberCents),
    verifiedEpochHash: `${item.epochHash.slice(0, 10)}...${item.epochHash.slice(-6)}`,
  }));

  const payoutHistory = memberPayoutItems.map((p) => ({
    date: new Date(p.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    amountDollars: centsToDollars(p.amountCents),
    batchId: p.batchId,
    status: p.status,
  }));

  const reserveReallocationHistory = reserveReallocations.map((reallocation) => {
    const previousPendingCents = reallocation.previousPendingCents[memberId] ?? 0;
    const newPendingCents = reallocation.allocations.find((allocation) => allocation.memberId === memberId)?.cents ?? 0;

    return {
      date: new Date(reallocation.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      epochVersion: reallocation.epochId.replace('epoch-', ''),
      previousPendingDollars: centsToDollars(previousPendingCents),
      newPendingDollars: centsToDollars(newPendingCents),
      changeDollars: centsToDollars(newPendingCents - previousPendingCents),
    };
  });

  const netReserveAdjustmentCents = effectiveAllocatedCents - totalAllocatedCents;
  let summary = `Your current pending balance is ${centsToDollars(
    pendingCents
  )}. The original inflow ledger allocated ${centsToDollars(
    totalAllocatedCents
  )} to you across ${inflows.length} customer revenue events, and ${centsToDollars(
    totalPaidCents
  )} has been deducted in the demo ledger. ${reserveReallocationHistory.length > 0
    ? `A reserve reallocation under a demo-approved epoch changed your net allocation by ${centsToDollars(netReserveAdjustmentCents)} while leaving original inflow and payout sample records intact.`
    : 'No reserve reallocation has been applied.'}`;
  let aiProvider: 'gemini' | 'heuristic' = 'heuristic';

  if (apiKey) {
    try {
      const auditPrompt = `You are the FairSplit AI Auditor. Explain to ${member.name} (${member.roleTitle}) why their balance is exactly ${centsToDollars(pendingCents)}.
Inflow details:
${JSON.stringify(epochBreakdown, null, 2)}
Reserve reallocation history:
${JSON.stringify(reserveReallocationHistory, null, 2)}
Payout details:
${JSON.stringify(payoutHistory, null, 2)}

Current pending balance: ${centsToDollars(pendingCents)}. Original inflow allocation total: ${centsToDollars(totalAllocatedCents)}. Net change from reserve reallocation: ${centsToDollars(netReserveAdjustmentCents)}. Demo payout deductions (seeded examples or simulations; not PayPal payout settlements): ${centsToDollars(totalPaidCents)}.
Explain that reserve reallocation changes only unpaid balances and does not rewrite historical inflow allocations or demo payout deductions. Do not claim real payouts, identity verification, immutable storage, or legal signatures. Provide a concise, 2-paragraph professional and transparent summary. All amounts are computed deterministically in cents.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(7000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: auditPrompt }] }],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (geminiText) {
          summary = geminiText.trim();
          aiProvider = 'gemini';
        }
      }
    } catch (e) {
      console.warn('Gemini balance audit API fallback:', e);
    }
  }

  return {
    aiProvider,
    memberId,
    memberName: member.name,
    summary,
    totalPendingDollars: centsToDollars(pendingCents),
    epochBreakdown,
    reserveReallocationHistory,
    payoutHistory,
    integrityAttestation: `This demo calculates balances in integer cents and links agreement records with SHA-256 hashes in the current browser session. It does not verify user identity or provide immutable storage.`,
  };
}

/**
 * Autonomous Gemini Studio Advisor Engine.
 * Provides high-level strategic, financial, and rev-share advice tailored
 * to Project Aurora's active epoch, pending balance, and milestone dynamics.
 */
export async function runStudioAdvisor(
  userQuery: string,
  topic: string,
  activeEpoch: Epoch,
  pendingCents: number,
  inflowsCount: number
): Promise<StudioAdviceResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are the FairSplit Autonomous AI Financial & Rev-Share Advisor for "Project Aurora", an indie game collective.
Team Composition under Active Epoch ${activeEpoch.version}:
${activeEpoch.splits.map((s) => `- ${s.memberId.toUpperCase()}: ${(s.bps / 100).toFixed(1)}% (${s.bps} BPS)`).join('\n')}
Current Studio Financial Context:
- Unclaimed Pending Balance: ${centsToDollars(pendingCents)} (${pendingCents} integer cents)
- Inflow Events Captured to Date: ${inflowsCount}
- PayPal Processing Fee Model: 2.99% + $0.49 per commercial inflow

User Inquiry Topic: "${topic}"
User Specific Question: "${userQuery}"

Provide strategic, practical, and highly intelligent advice.
Respond ONLY with a valid JSON object matching this schema:
{
  "topic": "${topic}",
  "executiveSummary": "Concise 1-2 sentence core recommendation",
  "strategicInsight": "Deeper analysis explaining industry norms (e.g. Steam refund buffers, milestone vesting, or fee minimization thresholds)",
  "actionSteps": [
    "Concrete step 1",
    "Concrete step 2",
    "Concrete step 3"
  ],
  "financialImpact": "Explanation of cashflow impact, fee savings, or risk mitigation in dollars/cents",
  "confidenceScore": <integer 80-99>
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(7000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text) as StudioAdviceResult;
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Gemini Studio Advisor API call fallback:', err);
    }
  }

  // Fallback Heuristic Advisor Engine
  return generateHeuristicAdvisor(userQuery, topic, activeEpoch, pendingCents);
}

function generateHeuristicAdvisor(
  userQuery: string,
  topic: string,
  activeEpoch: Epoch,
  pendingCents: number
): StudioAdviceResult {
  if (topic.toLowerCase().includes('payout') || topic.toLowerCase().includes('fee')) {
    return {
      topic: 'PayPal Fee Optimization & Payout Timing',
      executiveSummary: `Review the unpaid reserve and recipient details before proposing a batch payout date.`,
      strategicInsight: `This demo has an illustrative checkout fee estimate, but no verified PayPal Payouts fee quote. Use your Sandbox account's current pricing before making a real payout decision.`,
      actionSteps: [
        `Check the available reserve before proposing a distribution.`,
        `Review the four recipient addresses and each demo balance.`,
        `Agree on a cadence with the team before connecting a real payout integration.`,
      ],
      financialImpact: `No payout savings estimate is available without verified fee terms and a real payout quote.`,
      confidenceScore: 50,
    };
  }

  if (topic.toLowerCase().includes('refund') || topic.toLowerCase().includes('steam')) {
    return {
      topic: 'Steam 14-Day Refund Buffer Strategy',
      executiveSummary: `Review the platform's current refund policy and agree on a reserve before proposing distributions.`,
      strategicInsight: `Refunds can reduce available revenue after a sale. This demo does not enforce a reserve policy or track real refund events.`,
      actionSteps: [
        `Discuss whether to reserve part of the current ${centsToDollars(pendingCents)} demo balance.`,
        `Check the platform's current refund terms before choosing a release date.`,
        `Ensure all 4 members agree on clawback responsibility for disputed customer returns.`,
      ],
      financialImpact: `A reserve may reduce refund exposure; the appropriate amount needs actual sales and refund data.`,
      confidenceScore: 50,
    };
  }

  return {
    topic: 'Milestone-Based Equity Governance',
    executiveSummary: `Structure non-core asset expansion (such as DLC or OST) through milestone-based rev-share epochs rather than permanently mutating foundational code equity.`,
    strategicInsight: `Core engineering (40%) and art (30%) anchor the game's foundation. Reallocating permanent equity for temporary workload spikes risks team friction when maintenance debt arises post-launch.`,
    actionSteps: [
      `Review whether the active ${activeEpoch.version} agreement covers the base game.`,
      `Propose a new epoch if DLC needs a different split, including a Composer share the team agrees to.`,
      `Record demo approval from all four members in Agreement Studio.`,
    ],
    financialImpact: `Incentivizes dynamic soundtrack production while preserving long-term developer commitment for updates.`,
    confidenceScore: 90,
  };
}

/**
 * Autonomous Gemini Payout Scheduler & Liquidity Mediator.
 * Formulates fee-optimized payout dates for collaborators and prepares
 * a formal studio recommendation memo for the team lead.
 */
export async function runPayoutSchedulerAdvice(
  requesterName: string,
  isAnonymous: boolean,
  reasonOrNeed: string,
  pendingCents: number,
  activeEpoch: Epoch
): Promise<PayoutRecommendation> {
  const apiKey = process.env.GEMINI_API_KEY;
  const id = `REC-PAYOUT-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // Baseline recommended date: 7 days from now formatted
  const targetDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const formattedDate = targetDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (apiKey) {
    try {
      const prompt = `You are the FairSplit AI Financial Controller & Liquidity Mediator for "Project Aurora".
A team collaborator (${isAnonymous ? 'requesting Anonymously' : requesterName}) has requested advice on when the studio should schedule its next PayPal batch payout.
Context:
- Current Unclaimed Pending Balance: ${centsToDollars(pendingCents)}
- Active Contract Epoch: ${activeEpoch.version}
- Collaborator stated need: "${reasonOrNeed}"
- Payout batches are simulated. There is no verified PayPal Payouts fee quote or automated payout scheduling.

Provide a proposed review date within the next 7-14 days that considers member liquidity. Do not assert specific fee savings or that a payout has been scheduled.
Respond ONLY with a valid JSON object matching this schema:
{
  "recommendedDate": "<valid date in the next 7-14 days>",
  "recommendedAmountCents": <integer cents to propose, up to ${Math.max(0, pendingCents)}>,
  "feeOptimizationNote": "<1-2 sentences explaining that this is a proposal for review and fee terms must be checked>"
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(7000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            id,
            createdAt: now,
            requesterName: isAnonymous ? 'Anonymous Collaborator' : requesterName,
            isAnonymous,
            reasonOrNeed: reasonOrNeed || 'Routine liquidity & milestone review',
            recommendedDate: parsed.recommendedDate || formattedDate,
            recommendedAmountCents: Math.min(Math.max(0, pendingCents), Math.max(0, Math.floor(Number(parsed.recommendedAmountCents) || 0))),
            feeOptimizationNote: parsed.feeOptimizationNote || 'Review reserve availability and current PayPal fee terms before any real payout.',
            status: 'PENDING_REVIEW',
          };
        }
      }
    } catch (e) {
      console.warn('Gemini Payout Scheduler API call fallback:', e);
    }
  }

  // Heuristic Fallback
  return {
    id,
    createdAt: now,
    requesterName: isAnonymous ? 'Anonymous Collaborator' : requesterName,
    isAnonymous,
    reasonOrNeed: reasonOrNeed || 'Routine liquidity & milestone review',
    recommendedDate: formattedDate,
    recommendedAmountCents: Math.max(0, pendingCents),
    feeOptimizationNote: `Proposes reviewing up to ${centsToDollars(Math.max(0, pendingCents))} on ${formattedDate}; check current fee terms and available funds before any real payout.`,
    status: 'PENDING_REVIEW',
  };
}

/**
 * Conversational FairSplit Studio AI Advisor & Payout Mediator.
 * Handles freeform conversational inquiries, financial questions,
 * and peer payout scheduling without rigid form clicks.
 */
export async function runStudioChat(
  userMessage: string,
  chatHistory: Array<{ sender: 'ai' | 'user'; text: string }>,
  currentMember: Member,
  activeEpoch: Epoch,
  pendingReserveCents: number,
  inflowsCount: number
): Promise<StudioChatResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Format 7 days from now
  const targetDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const formattedDate = targetDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const lowerMsg = userMessage.toLowerCase().trim();

  // Check for attribution selection in conversation
  const isAttributionResponse =
    lowerMsg === 'attributed' ||
    lowerMsg === 'anonymous' ||
    lowerMsg === 'ai_suggestion' ||
    lowerMsg.includes('my name') ||
    lowerMsg.includes('say i proposed') ||
    lowerMsg.includes('from me') ||
    lowerMsg.includes(currentMember.name.toLowerCase().split(' ')[0]) ||
    lowerMsg.includes('anonym') ||
    lowerMsg.includes('secret') ||
    lowerMsg.includes('just an ai') ||
    lowerMsg.includes('ai suggestion') ||
    lowerMsg.includes('ai optimize');

  // If chatHistory contains the attribution question or user gave an attribution reply:
  const lastAiMessage = [...chatHistory].reverse().find((m) => m.sender === 'ai');
  const wasAskingAttribution =
    lastAiMessage &&
    (lastAiMessage.text.includes('how would you like me to attribute') ||
      lastAiMessage.text.includes('should it say you proposed it') ||
      lastAiMessage.text.includes('attribute this recommendation') ||
      lastAiMessage.text.includes('attribute this request') ||
      lastAiMessage.text.includes('attribute it') ||
      lastAiMessage.text.includes('How should I label'));

  if (isAttributionResponse || wasAskingAttribution) {
    let isAnonymous = false;
    let requesterName = `${currentMember.name} (${currentMember.roleTitle})`;
    let attributionLabel = `Under your name (${currentMember.name})`;

    if (
      lowerMsg === 'anonymous' ||
      lowerMsg.includes('anonym') ||
      lowerMsg.includes('secret') ||
      lowerMsg.includes('mask')
    ) {
      isAnonymous = true;
      requesterName = 'Anonymous Collaborator';
      attributionLabel = 'Anonymous in this demo queue';
    } else if (
      lowerMsg === 'ai_suggestion' ||
      lowerMsg.includes('just an ai') ||
      lowerMsg.includes('ai suggestion') ||
      lowerMsg.includes('autonomous')
    ) {
      isAnonymous = true;
      requesterName = 'FairSplit AI suggestion';
      attributionLabel = 'AI suggestion';
    }

    if (pendingReserveCents <= 0) {
      return { reply: 'There is no available demo reserve to propose for payout yet. Record an inflow first, then I can prepare a suggestion for team review.' };
    }
    const recId = `REC-PAYOUT-${crypto.randomUUID()}`;
    const amountCents = pendingReserveCents;

    const proposal: PayoutRecommendation = {
      id: recId,
      createdAt: new Date().toISOString(),
      requesterRole: isAnonymous ? undefined : currentMember.id,
      requesterName,
      isAnonymous,
      reasonOrNeed: 'Upcoming liquidity requirement & milestone compensation',
      recommendedDate: formattedDate,
      recommendedAmountCents: amountCents,
      feeOptimizationNote: `Proposes reviewing ${centsToDollars(amountCents)} on ${formattedDate}. Confirm available funds and current fee terms before any real payout.`,
      status: 'PENDING_REVIEW',
    };

    return {
      reply: `I prepared a demo recommendation labelled **${attributionLabel}**.\n\nIt proposes reviewing up to **${centsToDollars(amountCents)}** on **${formattedDate}**. No payout is scheduled, and the team should confirm fee terms and available funds.\n\nShall I add this suggestion to the Payments Hub queue for Marcus to review?`,
      proposal,
    };
  }

  // Check if user is asking to make a payout earlier or asking for money/rent
  const isPayoutRequest =
    lowerMsg.includes('payout') ||
    lowerMsg.includes('pay out') ||
    lowerMsg.includes('earlier') ||
    lowerMsg.includes('rent') ||
    lowerMsg.includes('advance') ||
    lowerMsg.includes('money') ||
    lowerMsg.includes('cash') ||
    lowerMsg.includes('batch') ||
    lowerMsg.includes('disburse') ||
    lowerMsg.includes('withdraw') ||
    lowerMsg.includes('suggest');

  if (isPayoutRequest) {
    if (pendingReserveCents <= 0) {
      return { reply: 'The demo reserve is currently empty. Record an inflow first, then I can propose a payout date for team review.' };
    }
    return {
      reply: `The demo reserve is **${centsToDollars(pendingReserveCents)}**. I can suggest **${formattedDate}** as a date for the team to review a possible payout; this does not schedule one.\n\nHow should I label the suggestion?\n• Under your name (**${currentMember.name}**)?\n• Anonymous?\n• Or as an AI suggestion?`,
      quickOptions: [
        { label: `👤 Under my name (${currentMember.name.split(' ')[0]})`, value: 'attributed' },
        { label: '🕵️ Anonymous', value: 'anonymous' },
        { label: '🤖 Just an AI suggestion', value: 'ai_suggestion' },
      ],
    };
  }

  // If Gemini API is available and it's a general question, call Gemini 3.5 Flash Lite
  if (apiKey) {
    try {
      const historyText = chatHistory
        .slice(-4)
        .map((m) => `${m.sender === 'user' ? currentMember.name : 'AI Advisor'}: ${m.text}`)
        .join('\n');

      const prompt = `You are FairSplit AI Studio Advisor for "Project Aurora", an indie game collective rev-share.
User chatting with you: ${currentMember.name} (${currentMember.roleTitle}, ID: ${currentMember.id}).
Active Contract Epoch: ${activeEpoch.version}
Current Studio Pending Reserve: ${centsToDollars(pendingReserveCents)} (${pendingReserveCents} cents).
Total Inflows Processed: ${inflowsCount}
Checkout fee preview: illustrative 2.99% + $0.49 per inflow; real capture amounts take priority. Payouts are simulated with no verified fee quote.

Recent Chat:
${historyText}

User Query: "${userMessage}"

Respond conversationally and concisely (2-4 sentences max). Do not claim a payout was sent or scheduled, a fee was verified, or a savings amount was proven.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 250,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { reply: text.trim() };
        }
      }
    } catch (err) {
      console.warn('Gemini chat API fallback:', err);
    }
  }

  // Fallback heuristic answers for common advisory topics
  if (lowerMsg.includes('steam') || lowerMsg.includes('refund')) {
    return {
      reply: `Refunds can reduce available revenue after a sale. The current demo reserve is **${centsToDollars(pendingReserveCents)}**. Review Steam's current refund terms and agree on an amount to hold before proposing a distribution; this app does not track refunds automatically.`,
    };
  }

  if (lowerMsg.includes('fee') || lowerMsg.includes('cost')) {
    return {
      reply: `FairSplit's checkout preview uses an illustrative 2.99% + $0.49 fee assumption; a real Sandbox capture uses PayPal's returned net and fee when available. Payouts here are simulated, so I cannot verify a payout fee or claim that a particular batch date saves money.`,
    };
  }

  if (lowerMsg.includes('dlc') || lowerMsg.includes('ost') || lowerMsg.includes('expansion') || lowerMsg.includes('composer')) {
    return {
      reply: `Rather than mutating the base game equity permanently, the best practice is to ratify a milestone-specific **Epoch v2.0** in Agreement Studio. That way, the Composer can receive a higher cut (e.g. 25-35%) on soundtrack DLC sales while maintaining foundational splits on the base game.`,
    };
  }

  return {
    reply: `I'm monitoring Project Aurora's active contract (${activeEpoch.version}) with **${centsToDollars(pendingReserveCents)}** in pending reserves. Feel free to ask about payout timing, Steam refund buffers, or rev-share adjustments—or let me know if you want me to propose an earlier payout date to Marcus!`,
  };
}


