> Historical report: statuses and approval requirements below describe the earlier review. Current release status is in [publication readiness](PUBLICATION_READINESS.md); original transaction 9 is expired/non-execution corroborated, R3 remains UNRESOLVED, and MIT has now been adopted locally. See [dated public evidence](PUBLIC_TESTNET_STATUS.md). No successful public agent payment is claimed.

# Phase 4 transaction 9 — later read-only reconciliation

2026-11-01. **UNRESOLVED; replacement proposal NO-GO. The original recent-block validity window has not definitively expired.** No transaction was signed, resent, replaced or submitted. Transactions 10–13 remain unsubmitted. No keys, production code, funding, GitHub or workflow state changed. The execution permit remains disabled.

## Expiration calculation

Original hash: **7T63WVcMJFyBhgqQsJxqV3EWFitYSe3uq5azaU7WSfMp**. Referenced canonical block **7EC3VksVpZhShzwDSKvJnjndYc5jWLubu47Ji8ParJAJ**, height **275681049**; submitted 2026-11-01 01:36:13.003 UTC. Unsigned reconstruction still matches the preserved hash; no signature was generated.

Fresh finalized block **275747977**, hash **Du51cJoBHBS9WMDBvr2LzE7geNa4EGdUKHG2mX6QFVQD**, timestamp **1793535732389655715 ns**, **2026-11-01T12:22:12.389Z**. Current protocol transaction_validity_period is **86400 blocks**. Observed height difference is **66928**, below **86400**. Reference height + validity is **275767449**, still **19472** heights ahead at the observation.

Therefore there is **no definitive expiry proof**. A conservative future checkpoint is finalized height strictly beyond 275767449, followed by validation of the then-applicable canonical-chain expiry rule and state. This is not a predicted UTC time, permission to resend, or evidence that expiry alone proves non-execution. Even after expiry, inclusion history, signer nonce, slot and balances still need reconciliation.

## Cross-provider results

- FastNEAR regular and archival: chain_id testnet; existing hash with sender_account_id agent.ml-demo-20261031.testnet returns UNKNOWN_TRANSACTION.
- **dRPC** (https://near-testnet.drpc.org): chain_id testnet; same hash returns UNKNOWN_TRANSACTION. Its block response identifies the same pinned canonical block, and key/accounting/payment views exactly match FastNEAR. dRPC is a separately operated endpoint; underlying upstream independence is not independently audited.
- Lava testnet endpoint: HTTP 410, discontinued. Candidate PublicNode endpoint: HTTP 404. thirdweb candidate endpoint: HTTP 400 for status; no chain identity established, so no account/transaction queries were sent through it. These are unavailable sources, not negative transaction evidence.
- NearBlocks API lookup and explorer attempt are preserved in the new evidence set. An empty index lookup does not close the gap: the earlier known-finalized positive control also returned empty. HTTP challenge/errors provide no inclusion proof.

No transaction 9 receipt or callback ID is available. UNKNOWN_TRANSACTION is not a confirmed failure receipt. The initial submission response final_execution_status NONE is not inclusion/finality evidence. No claim that the network never observed the transaction is made.

Endpoint selection was informed by [NEAR's provider documentation](https://docs.near.org/api/rpc/providers) and [FastNEAR's regular/archival reference](https://docs.fastnear.com/rpc). Live chain identity and raw responses determine whether an endpoint is usable; a provider listing alone does not.

## Pinned finalized state and pre/post comparison

All FastNEAR queries use the exact finalized hash above. Archival FastNEAR independently reproduces the original pre-submission block state. dRPC reproduces pinned post-state key, accounting and payment views. Equality checks passed in artifacts/phase4-tx9-later/verified.json.

| Observation | Before submission | Latest pinned state |
|---|---|---|
| Agent K0 access-key nonce | 275680959000000 | 275680959000000 |
| Original transaction nonce | 275680959000001 | No observed consumption |
| K0 allowance | 0.1 NEAR | 0.1 NEAR |
| Mandate 1 / payment nonce 0 | Unused | Unused; amount 0, empty recipient, accepted_at_ns 0 |
| Available / pending / spent | 1 / 0 / 0 | 1 / 0 / 0 |
| Budget / unallocated | 1 / 0 | 1 / 0 |

The key remains restricted to vault.ml-demo-20261031.testnet / execute_payment. No terminal payment event, transferred funds, pending reservation or contract-level rejection is observed. These observations establish no finalized payment effect at this block, not permanent non-execution or safe replacement.

| Account | Latest finalized NEAR |
|---|---:|
| owner | 3.7709345959813759 |
| vault | 4.9974730329057058 |
| agent | 0.9999170390418224 |
| recipient | 0.1 |
| attacker | 0.1 |

Vault/agent/merchant balances are unchanged against the exact pre-submission archival reads. Physical vault 4.9974730329057058 covers observed floor 1.71027 plus available liability 1. Accounting invariant remains satisfied. No intra-block solvency claim is made.

## Mandate and execution deadlines

Mandate 1 remains unpaused/unrevoked with expiry **November 1, 16:00 UTC**, 1793548800000000000 ns; it is active at the 12:22 UTC snapshot. The original execution start occurred before its 14:30 UTC cutoff. Submission cutoff **14:50 UTC** and FINAL cutoff **15:00 UTC** remain in the future at this observation. Any proposed new execution must satisfy all original restrictions or receive revised authorization; do not assume the original transaction's expiry evidence will be available before those cutoffs.

The mandate expiry, RPC transaction-validity period and user authorization deadlines are separate constraints. None automatically permits a new payment. No revised executable continuation proposal is prepared because non-execution has not been sufficiently established.

## Spending and funds still at risk

Confirmed aggregate outgoing remains **6.2316753320710959 NEAR**. The **0.1203 NEAR** uncertainty allowance (0.1 payment + 0.0203 fees) remains reserved. Confirmed plus uncertainty is **6.3519753320710959**, leaving **1.6480246679289041 NEAR** unreserved below the original 8 NEAR cap. Unknown transaction fees are not classified as definitively zero.

The original signed payment could still entail up to its approved 0.1 payout plus bounded fees until inclusion/expiry is resolved; the latest observed state shows no such debit. The 1 NEAR mandate principal remains in the vault with no pending reservation. No payment authority or reserve is automatically restored/reused. FullAccess custody limitations remain as previously documented.

## Evidence and safe next action

New evidence is preserved separately under artifacts/phase4-tx9-later: index.json, numbered raw request/response JSON, independent.json, analysis.json and verified.json. Requests retain source, UTC request/completion time, exact params/block/finality, HTTP status, response body and RPC errors. Block heights/hashes are retained in raw results. Old journals and prior testnet evidence were preserved.

**Safest next action: keep execution suspended.** Missing evidence is either a verifiable included/finalized transaction outcome with receipts, or a verified expiration boundary followed by canonical-history/state checks supporting non-execution. A further unknown-hash response alone does not satisfy this.

**Approval boundary:** approve a later bounded read-only recheck after finalized height exceeds 275767449, or close the current demonstration incomplete. No automatic waiting, follow-up job, nonce cancellation, new transaction, replacement, payment continuation or deadline extension is authorized by this report. If the cutoffs have passed by that recheck, any continuation requires a revised timing/expiry plan and separate approval.
