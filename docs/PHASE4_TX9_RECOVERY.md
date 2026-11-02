# Phase 4 transaction 9 recovery

**Later November 1 check:** [12:22 UTC reconciliation](PHASE4_TX9_RECONCILIATION.md). Finalized height 275747977 remains below reference-plus-validity 275767449. dRPC agrees with FastNEAR on unknown hash and unchanged pinned state. Transaction remains UNRESOLVED; no replacement proposal is ready. Earlier observations below are preserved.

**Classification: UNRESOLVED. Payment sequence remains stopped.** No verifiable inclusion, execution, failure or finalized receipt was found for transaction 9. Current finalized state shows no payment effect, but neither UNKNOWN_TRANSACTION nor unchanged state proves that the transaction can never be included. No signing, broadcast, retry/replacement, account/key change, funding, production edit, push or workflow occurred.

## Exact reconstructed transaction

- Hash: **7T63WVcMJFyBhgqQsJxqV3EWFitYSe3uq5azaU7WSfMp**.
- Signer: **agent.ml-demo-20261031.testnet**; receiver: **vault.ml-demo-20261031.testnet**.
- Public key: **ed25519:8dTURL2rSnsgNQ5w8Z33U4B29UqLW5YFN8UqAN6soVU2**.
- Access-key transaction nonce: **275680959000001**. This differs from contract payment nonce **0**, mandate **1**.
- Recent block: **7EC3VksVpZhShzwDSKvJnjndYc5jWLubu47Ji8ParJAJ**, height **275681049**.
- Method execute_payment; merchant.ml-demo-20261031.testnet; amount **0.1 NEAR** (100000000000000000000000 yoctoNEAR), attached deposit **0**, gas **100 Tgas**.
- Signed journal entry **2026-11-01T01:36:12.836Z**; submission acknowledgment **2026-11-01T01:36:13.003Z**, final_execution_status NONE. Exactly one submission is recorded.

The journal did not preserve signed transaction bytes/signature. Using the installed SDK's unsigned serialization, the recorded call, access-key nonce + 1 and pinned recent block, SHA-256/base58 reconstruction exactly reproduces the recorded hash. This independently binds the public fields to the hash without reading keys or signing. It does not verify the missing original signature bytes or prove propagation beyond the accepting RPC.

Reconstructed fields and unsigned bytes (historical local-only reference; excluded from public snapshot; result retained without inventing evidence). Original journal remains unchanged at artifacts/phase4/live/52c3bd8d84b806010536c058491064660b6365eec7853336b6d80919921ef655/authorized.jsonl.

## Hash lookups and independent-indexing limits

All tx queries used the exact hash with sender_account_id **agent.ml-demo-20261031.testnet** and wait_until NONE, which requests existing status without waiting indefinitely. All three RPC status responses identified chain_id testnet. Error responses do not have a transaction block height or finalized status; these fields are unavailable, not inferred.

| Source | Request UTC | HTTP | Result |
|---|---|---:|---|
| https://rpc.testnet.fastnear.com | 2026-11-01T01:42:16.261Z | 200 | UNKNOWN_TRANSACTION |
| https://archival-rpc.testnet.fastnear.com | 2026-11-01T01:42:16.477Z | 200 | UNKNOWN_TRANSACTION |
| https://archival-rpc.testnet.near.org | 2026-11-01T01:42:19.823Z | 200 | UNKNOWN_TRANSACTION |
| https://testnet.nearblocks.io/txns/7T63WVcMJFyBhgqQsJxqV3EWFitYSe3uq5azaU7WSfMp | 2026-11-01T01:42:23.002Z | 403 | HTTP challenge; no transaction evidence |
| https://api-testnet.nearblocks.io/v1/txns/7T63WVcMJFyBhgqQsJxqV3EWFitYSe3uq5azaU7WSfMp | 2026-11-01T01:42:22.998Z | 200 | txns: [] |

FastNEAR regular and archival URLs are documented in the [provider RPC reference](https://docs.fastnear.com/rpc). The legacy near.org archival endpoint also returned UNKNOWN_TRANSACTION. These are not three independent providers: [NEAR's deprecation notice](https://near.org/blog/deprecation-of-near-org-and-pagoda-co-rpc-endpoints) says FastNEAR maintains the legacy endpoints.

NearBlocks is an independent indexer. Its API returned HTTP 200 with txns: [] for transaction 9, **but also returned txns: [] for known-finalized initialization 5B** (5BsdHLzKh9UwgcjWdCY8kVhqoq7PzxXSCncDmFrZ5tS). Therefore the negative index lookup is inconclusive; index lag/coverage or endpoint behavior is unresolved. The explorer page returned HTTP 403 with a challenge. Neither result establishes absence. Positive-control response (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).

No receipt IDs were recoverable for transaction 9. No transfer or callback success/failure event can be claimed. The runtime's submission acknowledgment proves the request was observed by that RPC; it does not prove validator acceptance, inclusion or finality. “Never observed by the network” cannot be established from these interfaces.

## Consistent finalized state

Pre-submission snapshot: height **275681049**, hash **7EC3VksVpZhShzwDSKvJnjndYc5jWLubu47Ji8ParJAJ**, obtained before signing. Post-submission finalized reference: height **275681708**, hash **EvCavZyEELmMTqUTcoVB4i8DuB7Y8YierK2yKnLaPDw9**, timestamp **1793497341603754236 ns** / **2026-11-01T01:42:21.603Z**.

Both regular and archival FastNEAR were queried at that exact post block. All returned query block hashes/heights match. Account results and accounting/policy/payment views agree byte-for-byte across the two endpoints. Historical archive reads at the exact pre-submission block independently match the journal's key nonce and the vault/agent/merchant balances. These are endpoint observations, not locally verified cryptographic state proofs.

| Account | Finalized NEAR | Comparison |
|---|---:|---|
| owner | 3.7709345959813759 | Unchanged from stopped-run snapshot |
| vault | 4.9974730329057058 | Unchanged from stopped-run snapshot |
| agent | 0.9999170390418224 | Unchanged from stopped-run snapshot |
| recipient | 0.1 | Unchanged from stopped-run snapshot |
| attacker | 0.1 | Unchanged from stopped-run snapshot |

Access-key nonce remains **275680959000000**, one below transaction nonce **275680959000001**. Permission remains FunctionCall receiver vault.ml-demo-20261031.testnet, only execute_payment, allowance **0.1 NEAR**. No allowance consumption is observed. Contract payment record remains **Unused**, amount 0, empty recipient, accepted_at_ns 0, both before and after submission.

Vault available **1**, pending **0**, spent **0**, budget **1**, unallocated **0**. Accounting identity holds. Physical vault **4.9974730329057058 NEAR** exceeds storage/operating floor **1.71027** plus available obligation **1**. Merchant gain is zero at this snapshot. These observations do not show a stranded reservation, paid transfer, reverted payment or failed callback. They also do not justify automatic replacement or reservation release. Intra-block solvency remains unverified.

## Budget

Confirmed cumulative outgoing remains **6.2316753320710959 NEAR**, comprising historical 5.2297894545824836, new 1 NEAR funding and 0.0018858774886123 finalized setup fees. There is **no observed transaction-9 charge**, but its actual fee remains unknown without an outcome; do not label it definitively zero.

Retain **0.1203 NEAR** for transaction 9's 0.1 payment plus 0.0203 fee bound. Confirmed plus uncertainty = **6.3519753320710959**, leaving **1.6480246679289041** unreserved below the 8 NEAR cap. Transactions 10–13 are unsubmitted. Their previously proposed requested payouts plus fees total 1.3812; including those would yield 7.7331753320710959 under current bounds, but this is a forecast, not permission to resume.

## Expiry and execution window

Mandate expiry remains **2026-11-01 16:00 UTC**, **1793548800000000000 ns**. It was **not expired** at the pinned 01:42 UTC observation. Original cutoffs—start before 14:30, submissions before 14:50, FINAL before 15:00 UTC on November 1—were still in the future. Timing remains available in principle, but uncertainty blocks use of the payment sequence. Recheck all cutoffs before any future authorization.

Protocol query reports transaction_validity_period **86400 blocks**. The reference block is only **659 heights** behind the observed finalized block; do not treat the original transaction as expired. Reference height + validity is **275767449**. This is a conservative checkpoint for later investigation, not a wall-clock estimate or an automatic replacement trigger. Any expiry-based recovery must revalidate the applicable runtime rule, finalized canonical history, nonce and contract state after the window, and still requires separate approval. Mandate expiry and transaction inclusion validity are different limits.

## Evidence and next safe action

Full raw evidence index (historical local-only reference; excluded from public snapshot; result retained without inventing evidence) and numbered JSON files preserve each request source, method/parameters, request/completion UTC timestamps, HTTP status, raw response body and requested finality/block. Query response block heights/hashes are retained verbatim. Status/indexer errors have no consensus finality. Verified local analysis (historical local-only reference; excluded from public snapshot; result retained without inventing evidence) records cross-source and pre/post equality checks. A separate positive control preserves indexer limitations.

**Keep transaction 9 UNRESOLVED and the execution permit disabled. Do not resend/replace it or submit 10–13.** Exact next safe action is a separately chosen read-only reconciliation of this same hash and canonical state at a later finalized block, plus provider/indexer diagnosis if desired. If proof of inclusion appears, verify every receipt/callback and spending before proposing continuation. If it remains absent, establish expiry and unchanged nonce/state rather than assuming cancellation. Any new transaction or revised deadline needs new explicit authorization.

**Recovery decision requested:** keep the run suspended and authorize a later bounded read-only reconciliation/provider diagnosis, or close this demonstration as incomplete. Neither choice authorizes signing, nonce replacement, key changes or payment continuation. No further action is scheduled automatically.
