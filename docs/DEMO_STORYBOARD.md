# MandateLock in two minutes

Record the browser demo, a terminal in the clean checkout, and the linked testnet explorer pages. Keep the source label visible throughout each shot.

| Time | Show | Say |
|---|---|---|
| 0:00–0:15 | A service invoice beside the offline mandate view. Highlight merchant, 0.40 ceiling and 1 NEAR budget. | “I want an agent to pay for this service. If an invoice tells it to switch recipients, my treasury rules should still apply.” |
| 0:15–0:32 | Public T3 receipt and the Mandate 3 policy in the saved observations. | “The owner assigned existing funds to this job. The agent key can call one vault method. The vault checks who gets paid and how much is available.” |
| 0:32–0:55 | Public T4 in the explorer. Run `node scripts/verify-final-testnet.mjs`. Highlight merchant +0.10, slot 0 and the callback ID. | “The merchant received 0.10 testnet NEAR. This private callback settled the reservation. The remaining available budget is 0.90.” |
| 0:55–1:17 | In the recorded browser demo, click the scripted redirect and show BLOCK. Cut to public T5 and expand the vault failure. | “The local fixture blocks a redirect. We also submitted an unauthorized recipient directly on testnet. The vault itself returned ERR_RECIPIENT. The attacker received zero.” |
| 1:17–1:39 | Recorded sandbox competition in the browser. Highlight three distinct signing keys and hashes, two paid requests and one ERR_BUDGET. | “In this separate sandbox job, three requests each asked for 0.40 from a 1 NEAR budget. Two succeeded. The third reached the vault and failed the cumulative limit.” |
| 1:39–2:00 | Return to terminal proof and the two-source finalized height. End on the judge commands. | “The receipts, state snapshots and verifier ship with the source. You can reproduce these checks offline. Missing callbacks can strand funds, and custody of full-access keys still matters.” |

Use **public testnet • captured finalized evidence** for T3–T5, **recorded sandbox** for competition, and **deterministic fixture** for local policy. Use the [exact explorer links and receipt IDs](LIVE_TESTNET.md). End with [judge instructions](JUDGE_PHASE5.md).
