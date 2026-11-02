> Historical report: statuses and approval requirements below describe the earlier review. Current release status is in [publication readiness](PUBLICATION_READINESS.md); original transaction 9 is expired/non-execution corroborated, R3 remains UNRESOLVED, and MIT has now been adopted locally. See [dated public evidence](PUBLIC_TESTNET_STATUS.md). No successful public agent payment is claimed.

# Phase 4 split execution — safe stop

**NO-GO for completion/next phase.** Five new setup transactions finalized and passed. Transaction 9 was submitted exactly once but its outcome is UNVERIFIED. Transactions 10–13 were not signed/submitted. No automatic retry, budget release, new faucet request, production change, push or CI action occurred. Execution permit is disabled again.

## Transactions

| Label | Result | Transaction / public explorer | Observed outcome fees NEAR | Total gas burnt |
|---|---|---|---:|---:|
| 5A | PASS | [FFs4queFZfMke1CBoZ1jX1oBTzXWBEZ31MyGu23qacA3](https://testnet.nearblocks.io/txns/FFs4queFZfMke1CBoZ1jX1oBTzXWBEZ31MyGu23qacA3) | 0.0011974706618106 | 12197889180606 |
| 5B | PASS | [5BsdHLzKh9UwgcjWdCY8kVhqoq7PzxXSCncDmFrZ5tS](https://testnet.nearblocks.io/txns/5BsdHLzKh9UwgcjWdCY8kVhqoq7PzxXSCncDmFrZ5tS) | 0.0001703484158012 | 1926666720512 |
| 6 | PASS | [FeP7DzoCL7WuzMT7CPkA1PwBjiAmzLr7pm8PzuWeJVNR](https://testnet.nearblocks.io/txns/FeP7DzoCL7WuzMT7CPkA1PwBjiAmzLr7pm8PzuWeJVNR) | 0.0000829609581776 | 1052792144276 |
| 7 | PASS | [8ws9gKm8fSzE9oYAwDqNC3teX1BL1EeHDsncsf5sKK5k](https://testnet.nearblocks.io/txns/8ws9gKm8fSzE9oYAwDqNC3teX1BL1EeHDsncsf5sKK5k) | 0.0001864381144689 | 2087563707189 |
| 8 | PASS | [6LaurmokNwS2aNDttLKamcmEyCV4EnX6nYWdk1rCrUh9](https://testnet.nearblocks.io/txns/6LaurmokNwS2aNDttLKamcmEyCV4EnX6nYWdk1rCrUh9) | 0.000248659338354 | 2709775946040 |
| 9 | UNVERIFIED | [7T63WVcMJFyBhgqQsJxqV3EWFitYSe3uq5azaU7WSfMp](https://testnet.nearblocks.io/txns/7T63WVcMJFyBhgqQsJxqV3EWFitYSe3uq5azaU7WSfMp) | Unknown; retain 0.0203 bound | Unknown |
| 10 | UNVERIFIED — not submitted | None | 0 | 0 |
| 11 | UNVERIFIED — not submitted | None | 0 | 0 |
| 12 | UNVERIFIED — not submitted | None | 0 | 0 |
| 13 | UNVERIFIED — not submitted | None | 0 | 0 |

No confirmed new chain failure is reported. Expected unauthorized-recipient and cumulative-budget rejections were not exercised. A hash link is not evidence of inclusion; explorer availability for transaction 9 is not established.

5A deployed the exact frozen production Wasm, SHA-256 3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87, and left STATE empty. 5B directly initialized with parent-owner signer/predecessor ml-demo-20261031.testnet, zero deposit and 100 Tgas. Its initialization receipt is 5SsNWNAnBBPQ1f9anxmDz56dqreyog1FyvGaY1CArC8n. Stored owner is correct; accounting initially zero.

6 installed exactly three function-call keys, receiver vault.ml-demo-20261031.testnet, method execute_payment only, allowance 0.1 NEAR each. The separate administrator FullAccess key remains operator-held. 7 credited 1 NEAR unallocated principal. 8 created mandate 1 with available 1, pending/spent 0, approved agent/recipient, 0.4 ceiling and expiry 1793548800000000000 ns.

## Safe stop and uncertainty

Transaction 9 submission at 2026-11-01T01:36:13.003Z returned final_execution_status NONE. The first FINAL status query timed out. No further transactions were submitted. Read-only tx lookup subsequently returned HTTP 200 JSON-RPC -32000 HANDLER_ERROR / UNKNOWN_TRANSACTION: the requested transaction does not exist according to that RPC response. This does not prove permanent rejection or make resubmission safe. The cause is unresolved; no confirmed contract defect is demonstrated.

Raw error: artifacts/phase4-split-run/9-status-raw.json. Durable signed hash and single submission: artifacts/phase4/live/52c3bd8d84b806010536c058491064660b6365eec7853336b6d80919921ef655/authorized.jsonl. The runner performs bounded read-only reconciliation; it never resubmits. Any later reconciliation must use this same hash. No verified-operation marker exists for transaction 9 unless a fully verified result is later recorded; this report does not infer success from a submission acknowledgment.

## Finalized observed balances and accounting

Read-only snapshot at finalized block 275681357, hash H4Ed4ahRH15gr9R1iFH9fZBLmCJ3s6v134Q2B3DF4xbq, timestamp 1793497139349517762 ns. These are observed balances at that block, not a final settlement claim for uncertain transaction 9.

| Account | NEAR |
|---|---:|
| owner | 3.7709345959813759 |
| vault | 4.9974730329057058 |
| agent | 0.9999170390418224 |
| recipient | 0.1 |
| attacker | 0.1 |

Vault accounting: available **1**, pending **0**, spent **0**, budget **1**, unallocated **0**. Thus available + pending + spent = budget. Physical vault **4.9974730329057058** covers observed floor **1.71027** + available **1** = **2.71027**. No merchant gain or payment callback is observed. Restricted-key nonces/allowances remained unchanged in this snapshot. This is finalized-block evidence, not intra-block solvency proof.

## Spending reconciliation

Historical transactions 1–5 remain unchanged and cost 5.2297894545824836 NEAR under the approved outgoing accounting. New confirmed setup fees total **0.0018858774886123**. New confirmed principal transfer is **1** NEAR. Confirmed cumulative outgoing = **6.2316753320710959 NEAR**, leaving **1.7683246679289041** below 8.

Transaction 9 remains uncertain: retain its full 0.1 requested payout + 0.0203 fee bound. Confirmed spending plus that uncertainty envelope is **6.3519753320710959 NEAR**, below 8. Do not report transaction 9 fees as zero or treat unused envelope as approval to spend. No costs were incurred for unsubmitted 10–13. The original authorized whole-plan bound was 7.7960894545824836.

Fees are sums of tokens_burnt across transaction and receipt outcomes, not gas multiplied by a single assumed price. All amounts are testnet NEAR. Complete raw transactions/receipts, code/state snapshots, balances, keys and protocol preflight are in artifacts/phase4-split-run and the durable journals.

## Receipt evidence

| Label | Receipt ID | Outcome | Gas burnt |
|---|---|---|---:|
| 5A | 8fyztLSiLY4vDnZg3mufE84Bg1s5MHyTdZ95bBpWAPcc | {"SuccessValue":""} | 10594921881648 |
| 5A | FgsKH2Hr4GUsrdbYokAFL6tVJxHjEPjqTt68DGGy8pPJ | {"SuccessValue":""} | 223182562500 |
| 5B | 5SsNWNAnBBPQ1f9anxmDz56dqreyog1FyvGaY1CArC8n | {"SuccessValue":""} | 1393421941982 |
| 5B | 6557q4XVWMAzZxKbQFYgTJmFYaqJ8J6LQXVZRNVaPZmH | {"SuccessValue":""} | 223182562500 |
| 6 | 98jJwtHqSAzgxE53LchiVFBVrcsiHrkyxQR7KDsdRBoz | {"SuccessValue":""} | 414804790888 |
| 6 | AEhVg8zGia2cPyAmKvBmdDj9m2ZzDBmEbXhGNppLs2xs | {"SuccessValue":""} | 223182562500 |
| 7 | GJk4wLDuv5VcLXRTWMaGiSAqseFsTBPq98mYt8NPBjCa | {"SuccessValue":""} | 1556035542399 |
| 7 | GdQcV8kqBURbdDq8TehRB1WYLSd7VZihzpfECTBJPFS | {"SuccessValue":""} | 223182562500 |
| 8 | A6Y7uHMWH52XKcpNXyeN6sQvx72ekUWZw4gZakyQtzbz | {"SuccessValue":"IjEi"} | 2158315988380 |
| 8 | 9NBvSKN8wG1zH5UWdQUSMviqcm5A1WRGAoHTeEJr45od | {"SuccessValue":""} | 223182562500 |

No application payment callback is verified. Successful setup receipts and protocol gas refund receipts must not be mislabeled as payment callbacks. No concurrency test was submitted, and no same-block concurrency claim is made.

## Decision

Public deployment, owner initialization, restricted-key installation, principal funding and mandate creation: **PASS**. Authorized payment, malicious recipient rejection and budget concurrency demonstration: **UNVERIFIED**. Overall Phase 4 **NO-GO / incomplete due to safe stop**, not a production-custody sign-off.

Original November 1 deadline was not reached during this run. Future action still requires fresh deadline checks and separate approval. First reconcile transaction 9 read-only and investigate the RPC/inclusion issue; do not recreate accounts, redeploy, reinitialize, repeat funding, or resend the payment. Transactions 1–5 and 5A–8 are immutable history. Retained full-access custody, uncertain-callback stranded reservations and unverified intra-block solvency remain limitations.
