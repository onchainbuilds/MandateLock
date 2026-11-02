# Phase 4 FastNEAR continuation — execution approval package

**Subsequent execution:** Approved continuation attempted transactions 4–5 once, then stopped on FINAL ERR_INITIAL_OWNER. This package is now historical and must not be rerun. See [PHASE4_CONTINUATION_RESULTS.md](PHASE4_CONTINUATION_RESULTS.md); the executable permit is disabled.

2026-10-31. **Preparation PASS; conditional GO for transactions 4–13 only after separate explicit approval.** No real-account transaction was signed or submitted during this review. No funding, deployment, repository push or contract change occurred. The new approval file and existing executable permit both remain disabled.

## RPC investigation and live read-only verification

The previous endpoint returned JSON-RPC `-429` with a deprecation warning. NEAR's [official deprecation notice](https://near.org/blog/deprecation-of-near-org-and-pagoda-co-rpc-endpoints) documents progressively restricted near.org endpoints and recommends migration. This explains the service failure; it is not evidence of a contract failure. No further calls to that deprecated endpoint were needed.

Replacement: **`https://rpc.testnet.fastnear.com`**, explicitly documented as the regular testnet URL in the [FastNEAR RPC reference](https://docs.fastnear.com/rpc). The following checks all passed without an API key on this machine:

| Capability | Evidence |
|---|---|
| Network identity | `status.chain_id` and protocol `chain_id` both `testnet` |
| Finalized block | Height **275626748**, hash `9EXJBBxYwysvDmrrenNwt1G7raxbovYcG67NDk7n5JNN`; timestamp **1793465672160120051 ns** |
| Current protocol fees | Version **88**, action-fee digest unchanged, creation charge **0.007 NEAR**, gas price **100000000 yoctoNEAR/gas**, storage **10000000000000000000 yoctoNEAR/byte** |
| Account reads | All account queries pinned to that finalized block; balances and empty code hashes confirmed |
| Access keys | Both `view_access_key_list` and `view_access_key` succeeded for all four existing accounts |
| Transaction status | `tx` returned FINAL for all three completed transactions; `EXPERIMENTAL_tx_status`, used by the adapter, also returned FINAL for transaction 3 |

Read-only audit completed **2026-10-31T16:54:37.905Z**. Full HTTP statuses and JSON-RPC responses are in `artifacts/phase4-continuation/review.json`. All successful requests returned HTTP 200; attacker absence is a structured `UNKNOWN_ACCOUNT` result. The first sandboxed attempt could not resolve the host (`ENOTFOUND`); the authorized desktop network read succeeded. This was not a transaction retry.

Fresh responses were compared against saved transaction actions, signer, key, nonce, hash, status, transaction outcome and every receipt outcome. All matched. This is a fresh endpoint reconciliation, not a claim of independent consensus verification: FastNEAR also maintains the deprecated endpoints. Regular RPC retention, rate limits and availability can change. No submission capability was exercised; actual `send_tx` acceptance remains unverified until separately authorized execution. No automatic provider fallback is configured.

## Completed transactions — immutable history

| # | Transaction | Reconciliation |
|---|---|---|
| 1 | [Create vault](https://testnet.nearblocks.io/txns/5fRzq57MiNqMjkNiAsmTcrofEuUcp4roL1XCNYTpTDtV) | FINAL success; receipts match |
| 2 | [Create agent](https://testnet.nearblocks.io/txns/4mxWFevbqohTK4RERAsHPHYKu4dB7eARq8JdHuqeMKrk) | FINAL success; receipts match |
| 3 | [Create merchant](https://testnet.nearblocks.io/txns/FbM4BTPborSUWLL6GVbsJ75csqTz3o3bANwmuMmWjyH4) | FINAL success; receipts match; previously interrupted merchant key audit now PASS |

Each cost **0.0071149895375 NEAR** in fees including creation charge. No recreation, refund, compensating transfer or journal reset is proposed.

## Accounts, keys and reserves

O = `ml-demo-20261031.testnet`; V = `vault.ml-demo-20261031.testnet`; A = `agent.ml-demo-20261031.testnet`; R = `merchant.ml-demo-20261031.testnet`; X = `attacker.ml-demo-20261031.testnet`.

| Role | Finalized balance NEAR | Current access/state |
|---|---:|---|
| O | 4.8786550313875 | Exactly reviewed owner FullAccess key; nonce equals transaction 3 nonce |
| V | 4 | Exactly reviewed vault FullAccess key; no contract |
| A | 1 | Exactly reviewed operator-held agentAdmin FullAccess key; restricted keys not installed yet |
| R | 0.1 | Exactly reviewed recipient FullAccess key |
| X | Absent | Must be created by transaction 4 only |

All four existing accounts have locked balance zero, storage usage **182 bytes**, and empty code hash. Each current storage obligation is **0.00182 NEAR**, included within the balance. All balances match the previous final snapshot exactly. Combined holdings remain **9.9786550313875 NEAR**.

All eight existing protected key files were rechecked by public-key derivation: **8/8 PASS, zero signatures created**, at 2026-10-31T16:55:54.476Z. Exact public keys are in [`config.continuation.json`](../testnet/config.continuation.json); no keys, accounts or amounts changed. Private keys remain outside the repository and browser in separate operator/agent directories. Same-user Windows processes are not a strong custody boundary.

Transaction 6 installs only three FunctionCall keys on A: receiver V, method list exactly `["execute_payment"]`, allowance **0.1 NEAR each**, no direct transfer permission. The agent runner can load only its dedicated restricted-key files. Retained owner, vault and agent-administrator FullAccess keys remain operator-controlled and can bypass restricted-agent protections; there is no production custody sign-off.

## Revised aggregate budget

| Component | Maximum NEAR |
|---|---:|
| Already transferred in transactions 1–3 | 5.1 |
| Already burned fees, including creation charges | 0.0213449686125 |
| **Actual outgoing already counted** | **5.1213449686125** |
| Remaining setup transfers/deposits | 1.1 |
| All five requested payouts, including expected rejections | 1.4 |
| Remaining fees, including one creation charge | 0.1749 |
| **Remaining outgoing envelope** | **2.6749** |
| **Combined maximum outgoing** | **7.7962449686125** |
| **Headroom under unchanged 8 NEAR cap** | **0.2037550313875** |

Expected actual payouts are 0.9, but the cap conservatively includes all 1.4 requested. Gas estimates remain bounds, not promised actual fees. The executable full-plan guard still also enforces the stricter historical **7.801** forecast; the continuation guard substitutes actual fees for the first three transactions. Neither guard permits increasing transaction amounts. Remaining ordinary gas-fee allowance is **0.1679**, plus the final **0.007** creation charge.

Funding sufficiency:

- **Owner:** 4.8786550313875 − 1.1 remaining transfers/deposits − 0.0493 remaining owner fee bound = **3.7293550313875**. This exceeds the retained 2 NEAR reserve plus the conservative 4096-byte storage reserve of 0.04096 by **1.6883950313875**.
- **Vault:** 4 current + 1 incoming principal − 0.0239 deploy fee − 0.9 expected payouts = **4.0761** minimum expected final balance. Required conservative storage/operating reserve is **2.57**, plus remaining mandate available 0.1 = **2.67**. Before principal funding, 4 − 0.0239 = **3.9761**, exceeding 2.57. These are planned block-end bounds, not intra-block evidence.
- **Agent:** 1 − 0.1017 remaining fee bound = **0.8983**, exceeding conservative storage reserve **0.04096**. K0's three calls require at most 0.0609 under per-call bounds, below its 0.1 allowance; K1/K2 each need at most 0.0203.
- **Merchant:** currently 0.1, expected 1.0 after successful payouts. **Attacker:** planned 0.1 and no unauthorized receipt; each exceeds current 182-byte account storage costs.

## Exact remaining sequence

The original 13-call plan hash is unchanged: `c690ae71c36dc58b026546167949110889b20f284d372e1d04de562fecb182ab`. Exact action JSON, all keys, method arguments, deposits and gas are in `artifacts/phase4-continuation/exact-remaining-transactions.json`. No transaction is pre-signed; use fresh finalized block references and onchain key nonces only after approval.

| # | Signer/key → receiver | Exact operation / purpose | Deposit or transfer NEAR | Gas | Fee bound NEAR | Expected result |
|---|---|---|---:|---|---:|---|
| 4 | O/owner → X | CreateAccount; Transfer; AddFullAccess(attacker key) | 0.1 | Native protocol actions | 0.0087 | X created with exact key |
| 5 | V/vault → V | Deploy frozen Wasm; `new({owner_id:O})` | 0 | 100 Tgas for `new` | 0.0239 | Atomic deployment and initialization |
| 6 | A/admin → A | Add K0/K1/K2 FunctionCall keys restricted as above | 0 | Native protocol actions | 0.0002 | Exactly three approved restricted keys installed |
| 7 | O/owner → V | `fund({})` | 1 | 100 Tgas | 0.0203 | Unallocated principal 1 |
| 8 | O/owner → V | `create_mandate` with A, K0–K2, [R], budget 1, ceiling 0.4, expiry below | 0 | 100 Tgas | 0.0203 | Mandate 1: available 1 / pending 0 / spent 0 |
| 9 | A/K0 → V | `execute_payment`: mandate_id `"1"`, nonce 0, R, amount 0.1 | 0 | 100 Tgas | 0.0203 | R +0.1; success callback; available 0.9 / pending 0 / spent 0.1 |
| 10 | A/K0 → V | `execute_payment`: mandate_id `"1"`, nonce 1, X, amount 0.1 | 0 | 100 Tgas | 0.0203 | ERR_RECIPIENT; no payout or accounting change |
| 11 | A/K0 → V | `execute_payment`: mandate_id `"1"`, nonce 2, R, amount 0.4 | 0 | 100 Tgas | 0.0203 | Independent budget competitor |
| 12 | A/K1 → V | `execute_payment`: mandate_id `"1"`, nonce 3, R, amount 0.4 | 0 | 100 Tgas | 0.0203 | Independent budget competitor |
| 13 | A/K2 → V | `execute_payment`: mandate_id `"1"`, nonce 4, R, amount 0.4 | 0 | 100 Tgas | 0.0203 | Independent budget competitor |

For 11–13, independently signed requests must reach V: exactly two successful transfers/callbacks and one ERR_BUDGET. No fixed winner is predicted. Nonce conflicts do not count as enforcement. Expected final accounting: **available 0.1 / pending 0 / spent 0.9**, R gains 0.9 and X gains zero. No same-block concurrency claim without receipt evidence. A separate deterministic malicious instruction is locally BLOCKed; transaction 10 is the exact owner-approved direct-contract rejection fixture, not an arbitrary policy bypass.

## Freeze, deadlines and approval binding

Production Linux Wasm SHA-256: **`3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`**, 159542 bytes. All 16 frozen baseline source/test/workflow files and both Linux/Windows artifacts passed unchanged verification. Dependency lock remains `0920f50173b086d97b0fbe6b19822f1178a7167a83461f2ad73f74b5666702eb` (near-api-js 7.4.0).

- Resume before **November 1, 2026, 14:30 UTC**.
- Complete submissions before **14:50 UTC**; confirm FINAL outcomes before **15:00 UTC**.
- Mandate expires at **16:00 UTC**, exact `expires_at_ns = "1793548800000000000"`.

At the live review, more than 21 hours remained before the resume cutoff. There is time under normal conditions, but completion is not guaranteed. Account keys have no scheduled expiry; mandate expiry and fresh transaction block references are independently checked. Repeat read-only preconditions immediately before authorized execution and stop if state, fees, keys, artifact, reserves or deadlines differ.

New files:

- [`config.continuation.json`](../testnet/config.continuation.json): canonical parsed configuration hash **`1da47b4799bb1b2e39449d7fde086b229b7c2d1ad02f253614b4c33bba2100e7`**.
- [`approval.continuation.json`](../testnet/approval.continuation.json): **approved=false**; excludes completed operations, binds unchanged plan/Wasm/dependency lock, fee model 2, cap 8, deadlines and continuation hash **`ba82a7345f3419eb7908291832d04c892e31af3ed633a4d2867dd8709c8acf2e`**.

Changing RPC previously also changed the journal-directory fingerprint. The local correction binds continuation to the original namespace **`52c3bd8d84b806010536c058491064660b6365eec7853336b6d80919921ef655`**, verifies its three exact successful FINAL records and hashes, and rejects replay of completed operations. Existing journals are never copied, overwritten or cleared. Original configs and permits remain preserved. Endpoint selection is exact, with no arbitrary URLs or automatic fallback.

## Tests and reproduction

**135 PASS / 0 FAIL:** 76 Node tests, 44 original native tests, 8 existing native security tests, 7 harness regression tests. Six new test cases cover RPC/config preservation, approval scope/deadlines, deprecated responses without retry or raw error disclosure, uncertain submission with read-only reconciliation, immutable completed journals including missing/uncertain/substituted evidence, and actual-cost continuation/cap rejection.

Existing SDK unit tests sign synthetic offline transactions with ephemeral test keys; no real account key signed any transaction. The separate real-key check only derived public keys. No sandbox workflow or public-chain scenario was rerun.

```powershell
node testnet/review-continuation.mjs
node --test demo/test/*.test.mjs testnet/test/*.test.mjs
cargo test --locked --offline
cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline
node testnet/verify-frozen.mjs
```

The read-only script has an explicit RPC method allowlist excluding all submission methods. Use the installed Cargo executable if its directory is absent from shell PATH. Local HTTP test fixtures required normal desktop loopback access after sandbox EACCES; the rerun passed. Logs, exact transaction JSON, live raw responses, key-check summary and SHA-256 manifest are under `artifacts/phase4-continuation/`. New/changed files were scanned for private-key material and personal paths. No credentials or build artifacts are part of the proposed source package.

## Execution gates and remaining limitations

Request approval for **exactly transactions 4–13 once**, through the reviewed FastNEAR endpoint, within the cumulative 8 NEAR cap and unchanged deadlines. Approval is not granted by this document. Both local permits remain false until separate explicit approval.

After approval: repeat finalized reconciliation, then verify each dependent setup receipt/state before proceeding. Preserve exact hashes, all outcomes/receipts, actual burned fees, account balances, permissions, deployed-code hash, callback events/gas and accounting. For the independently submitted three-call competition, retain every hash before reconciliation and stop further activity if any result is uncertain. No automatic retransmission, refunds, additional funding or reservation restoration. A lost response requires read-only reconciliation of the known hash, never a fresh nonce or a new payment.

Missing/failed callbacks may strand reservations. Retained FullAccess keys bypass contract-level policy. Intra-block solvency remains unverified. Public-testnet scenarios 4–13 are still **UNVERIFIED**, and no production custody security sign-off is given. Any unexpected state, insufficient reserve, fee change, expired deadline or uncertain receipt results in a safe stop and new review. No next phase, push, mainnet action or publication is included.
