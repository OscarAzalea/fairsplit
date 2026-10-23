# 🗺️ FairSplit Product Roadmap & Action Plan
**PayPal AI Hackathon 2026**
*Project Aurora Collaborative Rev-Share & Trust Ledger*

---

## ✅ Phase 1: Completed Foundation (Already Live)

- [x] **Deterministic Math Engine in Integer Cents**: Hamilton-Hare Largest Remainder Method implemented in `src/lib/fairsplit-math.ts`. Guaranteed zero float rounding drift.
- [x] **Agreement Studio**: 4-member Project Aurora rev-share (*Dev 40%, Artist 30%, Writer 20%, Composer 10%*) with dynamic auto-rebalancing dials ($10,000\text{ BPS}$).
- [x] **Live Google Gemini 3.8 Flash Integration**: Fully verified API handshake powering the Socratic Negotiation Drawer.
- [x] **Trust Ledger (SHA-256)**: Append-only epoch chaining with the **"Certainty-Only" Anti-Tamper Forensics Engine** and interactive judge tamper simulator.
- [x] **Live PayPal Developer Sandbox Handshake**: Authenticated live Sandbox App (`APP-6UM36143X5181574L`) with Orders and Payouts endpoints.
- [x] **Public GitHub Repository**: Published at [`OscarAzalea/fairsplit`](https://github.com/OscarAzalea/fairsplit) with full MIT open-source license and `FAIRSPLIT_SPEC.md`.

---

## 🚀 Phase 2: Next High-Impact Feature Upgrades

### Task 2.1: Interactive Visual PayPal Checkout Modal
> **Goal**: Replace the simple button trigger with an authentic, sleek PayPal Smart Checkout experience that mimics the official PayPal payment flow.

- [ ] **PayPal Smart Button Component**:
  - Iconic PayPal yellow/gold branded button (*"Pay with PayPal"*).
  - Debit/Credit card secondary option (*Black button: "Debit or Credit Card"*).
- [ ] **Modal Experience**:
  - Backdrop blur overlay with authentic PayPal header, security padlock icon, and sandbox indicator.
  - Itemized order breakdown:
    - Game Title: *"Project Aurora - Early Access Release"*
    - Subtotal, PayPal Merchant Fee ($2.99\% + \$0.49$), and Net Credited.
  - Buyer test persona selection (*e.g. John Doe - Sandbox Buyer*).
- [ ] **Execution & Receipt**:
  - Live loading spinner with PayPal processing animation.
  - Instant transition to **"Payment Captured & Anchored to Epoch"** with SHA-256 hash proof badge.

---

### Task 2.2: Gemini AI Studio Advisor Hub
> **Goal**: Provide an autonomous financial and rev-share advisor panel directly in the app. Solves complex studio governance questions using live Gemini 3.8 Flash inference.

- [ ] **Context-Aware Studio Prompts**:
  - **Equity & Milestones**: *"How should we restructure rev-shares for our upcoming DLC soundtrack expansion without de-motivating the core dev team?"*
  - **Payout Timing & Fee Minimization**: *"When is the optimal balance threshold to trigger PayPal batch payouts to minimize commercial fees?"*
  - **Refund Reserve Buffer**: *"How should we buffer for Steam's 14-day refund window before distributing launch revenue?"*
- [ ] **Custom Studio Inquiries**:
  - Interactive chat drawer where team leads can ask any financial, tax, or legal co-op question.
  - Consumes live ledger context (active epoch splits, total pending reserve, inflow history) so advice is personalized to Project Aurora.

---

### Task 2.3: Exportable Cryptographic Audit Certificate
> **Goal**: Allow any collaborator or judge to download or print an official, cryptographically verifiable Payout Certificate.

- [ ] **One-Click Certificate Generator**:
  - Added to every member's balance card (*"Export Audit Certificate"*).
  - Formatted certificate containing:
    - Member Name, Role, PayPal Destination Email.
    - Total Gross Inflows, Itemized PayPal Fees, Net Cents.
    - Canonical SHA-256 Epoch Hashes (`v1.0`, `v2.0`).
    - Digital Signature Verification Hashes.
    - Anti-tamper verification seal.
- [ ] **Print / Save as PDF**:
  - Clean CSS `@media print` styling for clean, professional paper/PDF export.

---

## 🌐 Phase 3: Cloud Deployment (Cloudflare Pages)

- [ ] Connect `https://github.com/OscarAzalea/fairsplit` to **Cloudflare Pages**.
- [ ] Configure Environment Variables on Cloudflare:
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_CLIENT_SECRET`
  - `GEMINI_API_KEY`
  - `PAYPAL_ENVIRONMENT=sandbox`
- [ ] Verify live production URL: `https://fairsplit.pages.dev` (or Netlify/Render fallback).

---

## 🏆 Phase 4: Devpost Submission & Demo Video

- [ ] **2-Minute Demo Video Recording**:
  - Scene 1: Agreement Studio & auto-rebalancing dials (0:00 - 0:30).
  - Scene 2: Socratic AI Mediator & Ratification to Epoch `v2.0` (0:30 - 1:00).
  - Scene 3: Anti-Tamper Forensics with High-Confidence Suspect Identification (1:00 - 1:30).
  - Scene 4: Visual PayPal Checkout Modal & Batch Payout Execution (1:30 - 2:00).
- [ ] Upload video to YouTube (Unlisted or Public).
- [ ] Finalize Devpost submission form before **November 12, 2026**.
