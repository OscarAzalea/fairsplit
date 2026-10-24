# FairSplit Specification Document
**PayPal AI Hackathon 2026**
*The Trust-Chained Rev-Share Protocol for Creative Collectives & Indie Studios*

---

## 1. Executive Summary & Problem Space

Modern creative collectives—indie game studios, modding groups, and independent music production crews—face systemic trust friction when distributing collaborative revenue:
1. **Spreadsheet Drift & Math Ambiguity**: Rounding errors across uneven percentages cause lost cents, discrepancy disputes, and unverified deductions.
2. **Retroactive Split Alterations**: Without a visible agreement history, teams can dispute which split was active when revenue arrived.
3. **Black-Box Payouts**: Collaborators receive lump sums via PayPal without transparent, itemized proof of which inflows generated their balance or which fee deductions were made.
4. **Payout Planning**: Teams need to review proposed amounts and recipients before connecting a real payout system.

**FairSplit** solves this by unifying:
- **Deterministic Fintech Math in Integer Cents** (Hamilton-Hare / Largest Remainder algorithm; zero float errors).
- **Agreement Studio**: Interactive split dials and direct percentage entry, Gemini-powered Socratic AI negotiation, and a four-member demo approval flow.
- **Trust Ledger**: SHA-256 linked agreement records in browser memory, where every inflow references the active agreement hash. The verifier checks internal consistency, not identity or immutable storage.
- **Payments Hub**: PayPal Sandbox Orders checkout with buyer approval and server-side capture when credentials are configured; local simulation otherwise. Payout payloads are prepared and their results are simulated in this version.
- **Explain My Balance AI**: Integer-cent calculations are performed in code; Gemini may provide a plain-English explanation of those calculated values.

---

## 2. Core Architecture & Design Philosophy

```
  +-------------------------------------------------------------------------+
  |                             FAIRSPLIT CORE                              |
  +-------------------------------------------------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
+-----------------------+                                 +-----------------------+
|   AGREEMENT STUDIO    |                                 |     TRUST LEDGER      |
| - Project Aurora 4-way|                                 | - Session Epochs      |
| - Direct % Entry      | ===== [Demo Approval (4/4)] ==> | - SHA-256 Hash Links  |
| - Gemini Socratic AI  |                                 | - Recorded Inflows    |
| - Demo Approvals      |                                 | - Integrity Verifier  |
+-----------------------+                                 +-----------------------+
                                                                   |
                                                                   v
                                                          +-----------------------+
                                                          |  COLLABORATOR BALANCES|
                                                          | - Deterministic Cents |
                                                          | - "Explain My Balance"|
                                                          +-----------------------+
                                                                   |
                                                                   v
+-------------------------------------------------------------------------+
|                              PAYMENTS HUB                               |
|                                                                         |
|  [ INFLOWS: PayPal Orders API ]        [ OUTFLOWS: Payout Demo ]         |
|  - Buyer Approval + Capture            - Batch Payload Preview           |
|  - Actual Fee or Estimate               - Simulated Result                |
|  - Active Epoch Hash Stamp             - No Funds Sent                   |
+-------------------------------------------------------------------------+
```

### Absolute Rule: Deterministic Math vs. AI Boundaries
- **All financial calculations** (inflows, merchant fees, basis points splits, remaining penny allocation, payout deductions) are strictly executed in **pure deterministic TypeScript using integer cents**.
- **AI (Gemini)** is strictly partitioned:
  - **Mediation & Socratic Inquiry**: Reasoning about contributor trade-offs, milestones, and dispute resolution.
  - **Plain-English Auditing**: Translating code-calculated ledger math into human-friendly explanations. AI is not used to calculate balances.

---

## 3. Data Model & Cryptographic Schema

### 3.1 Basis Points & Member Registry (Project Aurora)
Every percent is stored as **Basis Points (bps)** where $100.00\% = 10,000\text{ bps}$.

| Member ID | Role | Name | Initial Split | Initial BPS | PayPal Sandbox Email |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `dev` | Lead Engineer | Alex Mercer | 40.0% | 4,000 bps | `alex.dev@auroragame.studio` |
| `artist` | Art Director | Elena Vance | 30.0% | 3,000 bps | `elena.art@auroragame.studio` |
| `writer` | Narrative Lead | Marcus Chen | 20.0% | 2,000 bps | `marcus.writer@auroragame.studio` |
| `composer` | Sound & OST | Lyra Song | 10.0% | 1,000 bps | `lyra.music@auroragame.studio` |
| **Total** | | | **100.0%** | **10,000 bps** | |

### 3.2 Largest Remainder Method (Zero Float Drift)
To distribute $N$ net cents across $M$ members with basis points $b_i$:
1. $c^{\text{base}}_i = \lfloor \frac{N \times b_i}{10000} \rfloor$
2. $r_i = (N \times b_i) - (c^{\text{base}}_i \times 10000)$
3. $\text{Shortfall} = N - \sum c^{\text{base}}_i$
4. Sort members descending by remainder $r_i$, and award $+1$ cent to the top $\text{Shortfall}$ members.
5. $\sum c^{\text{final}}_i \equiv N$ (Guaranteed exact zero-loss distribution).

### 3.3 Epoch Schema & SHA-256 Hash Chain
Each epoch is linked cryptographically to its predecessor:
```typescript
interface Epoch {
  epochId: string;           // e.g. "epoch-v1.0"
  version: string;           // "v1.0", "v2.0"
  title: string;             // "Genesis Production Agreement"
  description: string;
  createdAt: string;         // ISO timestamp
  effectiveFrom: string;     // ISO timestamp
  splits: {
    memberId: string;
    bps: number;             // Sum must be 10000
  }[];
  previousHash: string;      // Genesis: "0000000000000000000000000000000000000000000000000000000000000000"
  hash: string;              // SHA-256(canonical JSON)
  signatures: {
    memberId: string;
    name: string;
    signedAt: string;
    signatureHash: string;   // Demo hash, not an authenticated signature
  }[];
  status: 'ACTIVE' | 'PROPOSED' | 'SUPERSEDED';
}
```

The code hashes `FAIRSPLIT_EPOCH:` followed by JSON containing `epochId`, `version`, `previousHash`, `createdAt`, and splits sorted by `memberId`. The session checks this value and the preceding link; it has no independent trusted anchor.

### 3.4 Inflow Schema (Epoch Reference)
```typescript
interface Inflow {
  id: string;                // e.g. "INF-001"
  source: string;            // e.g. "Steam Sale Batch - Early Access"
  grossCents: number;        // e.g. 250000 ($2,500.00)
  feeCents: number;          // PayPal-reported fee or illustrative estimate
  netCents: number;          // 242476 cents ($2,424.76)
  currency: 'USD';
  timestamp: string;
  paypalOrderId: string;     // Sandbox order ID or clearly labelled demo ID
  paypalCaptureId?: string;
  paymentMode?: 'PAYPAL_SANDBOX' | 'SIMULATED' | 'SEED';
  paymentStatus?: 'COMPLETED' | 'SIMULATED' | 'SAMPLE';
  feeIsEstimated?: boolean;
  epochId: string;           // "epoch-v1.0"
  epochHash: string;         // SHA-256 of epoch active at moment of capture
  allocations: {
    memberId: string;
    bps: number;
    cents: number;
  }[];
}
```

---

## 4. Subsystems Specification

### 4.1 Agreement Studio
- **Interactive Multi-Dial Controller**: Allows adjusting basis points while ensuring total always normalizes to 10,000 bps (100.00%). Individual dials can be locked to freeze a member's equity while redistributing among the remaining members.
- **Socratic AI Negotiation Drawer (Gemini)**:
  - Invoked during disagreements or adjustments.
  - Takes current splits, proposed splits, and user dispute context.
  - Returns structured output:
    ```json
    {
      "summary": "Trade-off analysis between Lead Engineering and OST production",
      "socraticQuestions": [
        "Does the composer retain master rights, or are all assets work-for-hire?",
        "Will the proposed 5% transfer from Writer to Composer apply only post-launch?"
      ],
      "compromiseSplit": {
        "dev": 3800,
        "artist": 3000,
        "writer": 1800,
        "composer": 1400
      },
      "consensusLikelihoodScore": 85,
      "plainRationale": "Compromise balances Composer's custom dynamic score requirements while preserving Lead Dev's tech equity."
    }
    ```
- **Ratification Protocol**:
  - Requires all 4 members to sign before activating epoch.
  - Records demo approvals with SHA-256-derived values; there is no user identity verification or legally binding signature.
  - Locks previous epoch to `SUPERSEDED`, sets new epoch to `ACTIVE`, and re-chains hash.

### 4.2 Trust Ledger
- **Live Chain Explorer**: Visual representation of `v1.0 -> v2.0` blocks with hashes, timestamps, and signatures.
- **Integrity Verifier**: Client-side re-computation of SHA-256 hashes and links for the current session.
- **Tamper Demonstration**: A changed split or timestamp produces a hash mismatch. This does not prove who made the change; actor attribution is always inconclusive.
- **Collaborator Balance Cards**:
  - Real-time calculation uses recorded inflow allocations, seeded and simulated payout deductions, and reserve reallocation snapshots.
  - Existing inflows retain their capture epoch. Demo approval of a new epoch automatically applies its split to the unpaid reserve; this changes pending entitlements without rewriting historical inflow allocations or demo payout records.
  - Subsequent inflows and payouts are applied on top of the latest reserve snapshot, so the balance cards and payout preparation use the same cents-exact balance calculation.
  - One-click trigger for **"Explain My Balance"** AI Auditor.


### 4.3 Payments Hub (PayPal Sandbox Checkout and Payout Demo)

#### A. Inflows (PayPal Orders API)
- With both Sandbox credentials configured, creates an order using `/v2/checkout/orders`, lets a Sandbox buyer approve it through PayPal Checkout, and captures it server-side only after approval.
- Without either credential, uses the local simulator. An API error is shown to the user and does not silently fall back to simulation.
- Stores the returned order ID, capture ID, capture mode, and status in the ledger.
- Uses PayPal's returned fee and net amounts when supplied; otherwise displays and records the app's estimate:
  $$\text{feeCents} = \text{round}(\text{grossCents} \times 0.0299) + 49$$
- Stamps a completed capture with the active `epochId` and `epochHash`.

#### B. Outflows (Simulated Payout Batch)
- Prepares a Payouts API payload for inspection:
  - `sender_batch_header.sender_batch_id`: Stable preview ID within the current demo state.
  - `items[].sender_item_id`: Stable per-member preview ID within the current demo state.
  - `items[].receiver`: Collaborator PayPal email.
  - `items[].amount.value`: Converted from cents to formatted USD string (e.g. `"969.90"`).
- Simulates each item's result. No PayPal Payouts API call is made and no money is sent.
- Deducts simulated paid cents from the demo balance when the simulated item status is `SUCCESS`.

---

## 5. API Endpoints Reference

| Route | Method | Purpose |
| :--- | :--- | :--- |
| `/api/negotiate` | `POST` | Gemini Socratic mediator reasoning & structured compromise proposal |
| `/api/explain-balance` | `POST` | Plain-English transparent financial breakdown for a member |
| `/api/paypal/create-order` | `POST` | Creates PayPal Sandbox Order for customer checkout |
| `/api/paypal/capture-order` | `POST` | Captures the approved Sandbox order; simulator mode is explicit |
| `/api/paypal/create-payout` | `POST` | Simulates a payout batch from the prepared payload |
| `/api/integration-status` | `GET` | Reports configured AI and PayPal modes without returning secrets |

---

## 6. Environment Variables (`.env.local`)

```env
# Optional Gemini API Key (App includes intelligent offline heuristic fallback)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional PayPal Sandbox credentials (set both or leave both blank)
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_secret
```

---

## 7. Verification & Hackathon Testing Guide
1. **Agreement Studio**: Adjust dials to test proportional auto-balancing (always sums to 100.00%). Open the Socratic AI drawer to request mediation. Propose a new epoch and complete 4/4 ratification.
2. **Trust Ledger**: Observe the SHA-256 hash links update from `v1.0` to `v2.0`. Run the Ledger Integrity Verifier to check the current session's consistency.
3. **Payments Hub (Inflows)**: Trigger the `$49.99` direct-purchase example or a custom amount. With credentials, approve it as a Sandbox buyer; otherwise use the clearly labelled simulator. Review the captured or simulated amount and deterministic cents distribution.
4. **Explain My Balance**: Click the audit button on any collaborator to see Gemini's step-by-step mathematical breakdown.
5. **Payments Hub (Payouts)**: Select members, inspect the raw Payouts API batch payload and run the simulated distribution. This demo sends no funds.
