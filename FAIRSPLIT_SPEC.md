# FairSplit Specification Document
**PayPal AI Hackathon 2026**
*The Trust-Chained Rev-Share Protocol for Creative Collectives & Indie Studios*

---

## 1. Executive Summary & Problem Space

Modern creative collectives—indie game studios, modding groups, and independent music production crews—face systemic trust friction when distributing collaborative revenue:
1. **Spreadsheet Drift & Math Ambiguity**: Rounding errors across uneven percentages cause lost cents, discrepancy disputes, and unverified deductions.
2. **Retroactive Split Alterations**: Without an immutable historical record, agreements are disputed post-success, leading to team breakdown and delayed game releases.
3. **Black-Box Payouts**: Collaborators receive lump sums via PayPal without transparent, itemized proof of which inflows generated their balance or which fee deductions were made.
4. **Idempotency & Double-Payout Risk**: Manual payouts risk accidental duplicate payments or unverified failures during batch transfers.

**FairSplit** solves this by unifying:
- **Deterministic Fintech Math in Integer Cents** (Hamilton-Hare / Largest Remainder algorithm; zero float errors).
- **Agreement Studio**: Interactive split dials, Gemini-powered Socratic AI negotiation drawer with structured output mediation, and cryptographic 4-party ratification.
- **Trust Ledger**: Append-only SHA-256 hash-chained epochs (`v1.0` -> `v2.0`), where every customer inflow is immutably linked to the active epoch hash.
- **Payments Hub**: Integrated PayPal Sandbox Orders API simulator for revenue inflows and PayPal Sandbox Payouts API batch distribution console with per-item idempotency tracking (`SUCCESS`, `PENDING`, `FAILED`).
- **Explain My Balance AI**: Plain-English, transparent audits explaining every penny without hallucinating numbers.

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
| - Project Aurora 4-way|                                 | - Append-only Epochs  |
| - Interactive Dials   | ===== [Ratification (4/4)] ===> | - SHA-256 Hash Chain  |
| - Gemini Socratic AI  |                                 | - Immutable Inflows   |
| - Digital Signatures  |                                 | - Integrity Verifier  |
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
|  [ INFLOWS: PayPal Orders API ]        [ OUTFLOWS: PayPal Payouts API ] |
|  - Checkout Simulator                  - Batch Distribution Console     |
|  - Real-time Fee Deduction             - Idempotent `sender_item_id`    |
|  - Active Epoch Hash Stamp             - Status: SUCCESS/PEND/FAILED    |
+-------------------------------------------------------------------------+
```

### Absolute Rule: Deterministic Math vs. AI Boundaries
- **All financial calculations** (inflows, merchant fees, basis points splits, remaining penny allocation, payout deductions) are strictly executed in **pure deterministic TypeScript using integer cents**.
- **AI (Gemini)** is strictly partitioned:
  - **Mediation & Socratic Inquiry**: Reasoning about contributor trade-offs, milestones, and dispute resolution.
  - **Plain-English Auditing**: Translating cryptographically verifiable ledger math into human-friendly explanations. AI is NEVER allowed to perform raw arithmetic.

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
  createdAt: string;         // ISO timestamp
  splits: {
    memberId: string;
    role: string;
    name: string;
    bps: number;             // Sum must be 10000
  }[];
  previousHash: string;      // Genesis: "0000000000000000000000000000000000000000000000000000000000000000"
  hash: string;              // SHA-256(canonical JSON)
  signatures: {
    memberId: string;
    name: string;
    signedAt: string;
    signatureHash: string;
  }[];
  status: 'ACTIVE' | 'PROPOSED' | 'SUPERSEDED';
}
```

Canonical Epoch Hash:
$$\text{hash} = \text{SHA-256}(\text{epochId} + \text{version} + \text{previousHash} + \text{splitsCanonicalJson})$$

### 3.4 Inflow Schema (Immutable Epoch Binding)
```typescript
interface Inflow {
  id: string;                // e.g. "INF-001"
  source: string;            // e.g. "Steam Sale Batch - Early Access"
  grossCents: number;        // e.g. 250000 ($2,500.00)
  feeCents: number;          // PayPal fee (2.99% + $0.49 = 7524 cents)
  netCents: number;          // 242476 cents ($2,424.76)
  currency: 'USD';
  timestamp: string;
  paypalOrderId: string;     // PayPal Sandbox Order ID
  epochId: string;           // "epoch-v1.0"
  epochHash: string;         // SHA-256 of epoch active at moment of capture
  allocations: {
    memberId: string;
    role: string;
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
  - Signs payload with deterministic SHA-256 member key simulation.
  - Locks previous epoch to `SUPERSEDED`, sets new epoch to `ACTIVE`, and re-chains hash.

### 4.2 Trust Ledger
- **Live Chain Explorer**: Visual representation of `v1.0 -> v2.0` blocks with hashes, timestamps, and signatures.
- **Cryptographic Verifier**: Client-side re-computation of SHA-256 hashes verifying that zero tampering has occurred.
- **Forensic Anti-Tamper Attribution ("Certainty-Only" Attribution Engine)**:
  - When an epoch hash mismatch occurs, the cryptographic engine performs mathematical delta analysis across all signed counter-party allocations.
  - **High-Confidence Attribution**: If a single participant's equity share was unilaterally inflated without valid counter-party digital signatures, the forensic engine attributes the suspect with 100% cryptographic certainty and flags an automated payout freeze.
  - **Withheld Attribution (Inconclusive)**: If the corruption is an anonymous or structural bit flip in transport where no individual collaborator benefits, attribution is explicitly withheld to prevent false accusations.
- **Collaborator Balance Cards**:
  - Real-time calculation: $\text{Pending Balance} = \sum \text{Allocated Inflows} - \sum \text{Executed Payouts}$.
  - One-click trigger for **"Explain My Balance"** AI Auditor.


### 4.3 Payments Hub (PayPal Sandbox Integration)

#### A. Inflows (PayPal Orders API Simulator & Live Sandbox)
- Simulates or executes `/v2/checkout/orders` with `intent: CAPTURE`.
- Calculates merchant fee:
  $$\text{feeCents} = \text{round}(\text{grossCents} \times 0.0299) + 49$$
- Automatically stamps capture with active `epochId` and `epochHash`.
- Records transaction with immediate credit to member accounts.

#### B. Outflows (PayPal Payouts API Batch Distribution Console)
- Prepares batch payload conforming to PayPal Payouts API:
  - `sender_batch_header.sender_batch_id`: Unique idempotency key `BATCH-AURORA-[TIMESTAMP]-[RAND]`.
  - `items[].sender_item_id`: Unique idempotency key `ITEM-AURORA-[MEMBER_ID]-[TIMESTAMP]`.
  - `items[].receiver`: Collaborator PayPal email.
  - `items[].amount.value`: Converted from cents to formatted USD string (e.g. `"969.90"`).
- Calls `/api/paypal/create-payout` (with Sandbox API keys or realistic sandbox simulator).
- Tracks per-item status: `PENDING` $\to$ `SUCCESS` / `FAILED`.
- Deducts paid cents from pending balance upon `SUCCESS`.

---

## 5. API Endpoints Reference

| Route | Method | Purpose |
| :--- | :--- | :--- |
| `/api/negotiate` | `POST` | Gemini Socratic mediator reasoning & structured compromise proposal |
| `/api/explain-balance` | `POST` | Plain-English transparent financial breakdown for a member |
| `/api/paypal/create-order` | `POST` | Creates PayPal Sandbox Order for customer checkout |
| `/api/paypal/capture-order` | `POST` | Captures PayPal Order, computes fees, ties to epoch |
| `/api/paypal/create-payout` | `POST` | Dispatches idempotent batch payout via PayPal Payouts API |
| `/api/paypal/payout-status` | `GET` | Queries batch status and item execution states |

---

## 6. Environment Variables (`.env.local`)

```env
# Optional Gemini API Key (App includes intelligent offline heuristic fallback)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional PayPal Sandbox Credentials (App includes built-in live sandbox simulator)
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_secret
PAYPAL_ENVIRONMENT=sandbox
```

---

## 7. Verification & Hackathon Testing Guide
1. **Agreement Studio**: Adjust dials to test proportional auto-balancing (always sums to 100.00%). Open the Socratic AI drawer to request mediation. Propose a new epoch and complete 4/4 ratification.
2. **Trust Ledger**: Observe the SHA-256 hash chain update from `v1.0` to `v2.0`. Run the Ledger Integrity Verifier to validate chain authenticity.
3. **Payments Hub (Inflows)**: Trigger a `$2,500.00` Steam Sale batch or custom amount. Notice the exact fee ($75.24) and deterministic cents distribution to each member.
4. **Explain My Balance**: Click the audit button on any collaborator to see Gemini's step-by-step mathematical breakdown.
5. **Payments Hub (Payouts)**: Select members, inspect the raw PayPal Payouts API batch payload with idempotent keys, and execute the distribution.
