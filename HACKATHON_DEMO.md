# FairSplit judge demo

Aim for a recording under three minutes. Start with **Reset demo** so the seeded example is visible.

## Short walkthrough

**0:00–0:20 — The problem**  
Creative teams often track shared revenue in spreadsheets. FairSplit ties each captured inflow to a versioned split agreement so the team can inspect the math and history.

**0:20–0:55 — Agreement and AI**  
Change one collaborator's share in Agreement Studio and show that the allocation remains at 10,000 basis points. Open the Socratic mediator. Point out the result label: **Gemini API result** means the Gemini request returned a valid proposal; **Local heuristic fallback** means the local fallback answered. The proposed split is checked before it can be adopted.

**0:55–1:20 — Demo approval and history**
Set Elena to 55% and Alex to 25%, then use the four-member demo approval flow. Show that the existing unpaid reserve is immediately redistributed and Elena's pending balance exceeds Alex's. The browser session has no real user authentication or legally binding signatures. Open Trust Ledger and verify the hash links.

With the untouched seeded ledger and the remaining shares set to Marcus 15% and Lyra 5%, expected pending balances are **Elena $1,474.87** and **Alex $670.39** (total reserve **$2,681.58**). A $1,000 demo inflow adds $533.29 to Elena and $242.40 to Alex. **Clear Demo Activity** restores the seeded balances while keeping the 55/25 split active.

**1:20–2:05 — PayPal checkout**  
If Sandbox credentials are configured, choose a preset, open checkout, approve it using a PayPal Sandbox buyer account, and show the PayPal-returned order and capture IDs in the receipt and ledger. If credentials are absent, use **Run demo capture** and say clearly that it is simulated. The app never charges a live PayPal account.

**2:05–2:35 — Balances and payout preview**  
Show the integer-cent allocation and explain why sample payout deductions can make historical totals differ from the active percentage. Inspect the payout batch payload and run **Simulate payout batch**. State clearly that payouts are simulated and no funds are sent.

**2:35–2:50 — Close**  
Return to the seeded state with **Reset demo**.

## Recording checklist

- Use a clean browser window at a readable zoom level.
- Keep the integration status bar visible so judges can see Gemini, checkout, and payout modes.
- If recording a real Sandbox checkout, sign in with a Sandbox buyer account, not a personal production account.
- Distinguish seeded sample data, real PayPal Sandbox captures, and simulated payouts.
- Keep API keys and server logs out of the recording.
- Publish a public YouTube demo under three minutes and include the public repository, MIT license, and hosted demo in the submission.
