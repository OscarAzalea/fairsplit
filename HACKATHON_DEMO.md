# FairSplit: under-three-minute judge video

Record the live [Cloudflare demo](https://fairsplit.horusosiris404-210.workers.dev/) in a browser. Use short clips and trim loading or sign-in pauses. Keep the browser large enough to read names, amounts, and the integration status bar. The payout feature is a simulator, so never describe it as a PayPal transfer.

## Before recording

1. Click **Reset demo**. Check that the active agreement is **v1.0**, with Alex **40%** and Elena **30%**. In Collaborator Balances, the seeded pending amounts should be Alex **$1,072.63** and Elena **$804.48**. Reset clears prior local demo activity; it does not alter the Cloudflare deployment.
2. Have a **PayPal Sandbox buyer account** ready. Use it only on PayPal's Sandbox sign-in screen. Do not show its password, API keys, or production PayPal account in the video.
3. Use a small custom checkout amount, such as **$1.00**, for the capture clip. If buyer approval cannot be completed, omit any claim that a capture happened. Show the Sandbox checkout button and label this as an uncompleted checkout instead.
4. Rehearse the Gemini request before recording. Use the actual **Gemini API result** badge only when it appears. The app may show **Local heuristic fallback** when Gemini is slow or unavailable; keep that label truthful if it appears.

## Shot list and narration

| Time | On screen | Say this |
| --- | --- | --- |
| 0:00–0:15 | Collaborator Balances, seeded Alex and Elena cards. | “When a creative team shares revenue, changing the agreement can make unpaid balances hard to explain. FairSplit gives the team a versioned agreement and an auditable balance.” |
| 0:15–0:50 | Agreement Studio. Tap the four numbers and enter Alex **25**, Elena **55**, Marcus **15**, Lyra **5**. Show the **100%** total. Open **Socratic AI Mediator**, select Elena, enter the rationale below, and show the provider badge and response. | “Elena’s art scope grew, so I propose 55 percent for her and 25 for Alex. The shares must add to 100 percent. Gemini examines the trade-offs and suggests questions; it does not change the contract itself.” |
| 0:50–1:15 | Close the mediator. Click **Propose New Epoch**. Enter the title and rationale below. Click **Sandbox: Auto-Fill Peer Signatures (Testing Only)**. Show **v2.0** active. | “This is a demo approval flow. It records the revised agreement in a SHA-256 linked history. These approval slots are simulated, not authenticated signatures.” |
| 1:15–1:40 | Collaborator Balances: show Elena **$1,474.87** above Alex **$670.39**. Then Trust Ledger: show v1.0 and v2.0, and click **Check Epoch Hashes**. | “The unpaid reserve now follows the new agreement: Elena’s pending balance exceeds Alex’s. Earlier inflows still show which agreement was active when they arrived, and the epoch hashes verify.” |
| 1:40–2:20 | Payments Hub. Choose **Custom Amount**, enter **$1.00**, open checkout, then use the PayPal Sandbox buyer account. Trim the sign-in pause. Show the completed receipt with PayPal order and capture IDs, then its Sandbox entry in Trust Ledger. | “This checkout goes through PayPal Sandbox. FairSplit records the inflow only after PayPal confirms capture, and links the returned IDs to the active agreement.” |
| 2:20–2:40 | Payments Hub payout section. Show the selected collaborators and **Inspect Raw PayPal Payouts JSON Payload**; optionally show a demo batch report. | “Payouts are a preview and simulation here. The app calculates each person’s amount in integer cents, but sends no payout money.” |
| 2:40–2:50 | Return to the active split or balances. | “FairSplit makes split changes, captured revenue, and the remaining balance visible to the whole team.” |

**Mediator rationale:** “Elena completed expanded art and 3D work for this milestone. Review a fair change to the revenue split and the effect on the rest of the team.”

If the mediator badge says **Local heuristic fallback**, replace the Gemini narration with: “The AI request fell back to a labeled local suggestion; a human still decides whether to revise the agreement.” Record a separate successful Gemini response before claiming the Gemini call worked in this scene.

The mediator may suggest a compromise different from 25/55/15/5. Show its trade-offs, then close it without clicking **Adopt This Compromise** if the next scene demonstrates the team's proposed 25/55/15/5. Describe the following approval as a *demo* of the team's decision, not as proof that four real people consented.

**Epoch title:** “Art expansion: revised team split”

**Epoch rationale:** “Demo proposal: increase Elena’s share for expanded art work and redistribute the unclaimed reserve.”

The balance amounts above assume an untouched seeded ledger and no new checkout. The seeded net reserve totals **$2,681.58**; it includes sample payout deductions. After a Sandbox capture, balances change. Do not read the seeded amounts as the final amounts after checkout.

## Final check

- Keep the published video **under three minutes** and make the YouTube link public.
- Show the app in a browser, with readable text and the status bar visible.
- Distinguish seeded examples, a completed PayPal **Sandbox** capture, Gemini or its labeled fallback, and simulated payouts.
- Put the live demo URL and public GitHub repository in the video description and hackathon submission.
