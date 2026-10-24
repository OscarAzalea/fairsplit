# FairSplit judge demo

Aim for a recording under three minutes. Start with **Reset demo** so the seeded example is visible.

## Short walkthrough

**0:00–0:20 — The problem**  
Creative teams often track shared revenue in spreadsheets. FairSplit ties each captured inflow to a versioned split agreement so the team can inspect the math and history.

**0:20–0:55 — Agreement and AI**  
Change one collaborator's share in Agreement Studio and show that the allocation remains at 10,000 basis points. Open the Socratic mediator. Point out the result label: **Gemini API result** means the Gemini request returned a valid proposal; **Local heuristic fallback** means the local fallback answered. The proposed split is checked before it can be adopted.

**0:55–1:20 — Human approval and history**  
Show the proposal and multi-member ratification flow. The seeded app demonstrates the signature and hash-chain workflow; the demo does not provide real user authentication or legally binding e-signatures. Open Trust Ledger and verify the epoch chain.

**1:20–2:05 — PayPal checkout**  
If Sandbox credentials are configured, choose a preset, open checkout, approve it using a PayPal Sandbox buyer account, and show the PayPal-returned order and capture IDs in the receipt and ledger. If credentials are absent, use **Run demo capture** and say clearly that it is simulated. The app never charges a live PayPal account.

**2:05–2:35 — Balances and payout preview**  
Show how the inflow was allocated across collaborators. Inspect the payout batch payload and run **Simulate payout batch**. State clearly that payouts are simulated and no funds are sent.

**2:35–2:50 — Close**  
Return to the seeded state with **Reset demo**.

## Recording checklist

- Use a clean browser window at a readable zoom level.
- Keep the integration status bar visible so judges can see Gemini, checkout, and payout modes.
- If recording a real Sandbox checkout, sign in with a Sandbox buyer account, not a personal production account.
- Do not call a local simulator or simulated payout a completed PayPal transaction.
- Keep API keys and server logs out of the recording.
- Check the hackathon's current submission page for its video and repository requirements before submitting.
