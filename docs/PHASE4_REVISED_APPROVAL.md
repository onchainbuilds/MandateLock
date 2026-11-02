# Phase 4 post-bootstrap execution approval package

**Subsequent execution status:** This exact plan was approved, but a confirmed fee-model omission triggered a safe stop before signing. The current per-account-creation fee bound is invalid; see [PHASE4_RUN.md](PHASE4_RUN.md). Do not execute using this package until the fee correction is reviewed and approved.

Reviewed 2026-10-31. **Conditional GO for the following 13 transactions only after new explicit approval.** No funding request, signing with real credentials, transaction submission, deployment, push or CI was performed during this revision. The bootstrap is already complete and must not be repeated. Production custody remains NO-GO.

## Current verified state and immutable inputs

At **2026-10-31 15:05:30 UTC (11:05:30 a.m. EDT)**, finalized block **275615223**, hash `4TYuVrkip1yydcDQJcTcrLxZWtDzC6yrRokKy3JwSbxU`:

- Owner `ml-demo-20261031.testnet`: **10 NEAR**, locked 0, storage 182 bytes, empty code hash `11111111111111111111111111111111`.
- Exactly one owner FullAccess key: `ed25519:uuukiCHdpBwSHGzoxGTQBZLJt4mLo8xaQZWW2uM1no4`; observed nonce `275614533000000`.
- `vault.ml-demo-20261031.testnet`, `agent.ml-demo-20261031.testnet`, `merchant.ml-demo-20261031.testnet`, `attacker.ml-demo-20261031.testnet`: all absent.
- Bootstrap [HhF51drrwKbaauC1MQLqpPjFUcHXHzvCvX9qzAvvoAjQ](https://testnet.nearblocks.io/txns/HhF51drrwKbaauC1MQLqpPjFUcHXHzvCvX9qzAvvoAjQ) was rechecked FINAL.
- Pinned testnet RPC, protocol 88, action-fee digest, storage price `10^19` yoctoNEAR/byte, gas price `100000000` yoctoNEAR/gas all matched the reviewed configuration.
- All eight protected local keys derive to their reviewed public keys. All eight credential-file ACLs allow only the current Windows user and SYSTEM. No key regeneration or permission change occurred.

The five account IDs, eight public keys and mandate expiry remain exactly as in [`testnet/config.reviewed.json`](../testnet/config.reviewed.json). Config SHA-256: `a900b86f3eca441451a63e55e81c7cd17c29b58a16007d935b5904f5ca25059a`. Lockfile SHA-256: `0920f50173b086d97b0fbe6b19822f1178a7167a83461f2ad73f74b5666702eb`.

**Frozen Linux production Wasm:** 159,542 bytes; SHA-256 `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`. Baseline commit `75051c2fc7ecff6390c49fa67274d70d275d07c8`. All 16 baseline files and both Wasm artifacts still match. Windows artifact is not substituted.

The revised review permit [`testnet/approval.revised.json`](../testnet/approval.revised.json) remains **`approved:false`**. It binds the existing finalized bootstrap, 10 NEAR starting balance, outgoing cap, fee envelope, configuration, lockfile, Wasm, deadlines and exact transaction plan hash `c690ae71c36dc58b026546167949110889b20f284d372e1d04de562fecb182ab`. The earlier review permit is historical and cannot pass the new execution budget guard.

## Revised budget

All figures below are NEAR. The 8 NEAR outgoing cap conservatively includes fees as well as gross transfers/attached deposits. It counts setup funding and later vault payouts separately, even though those are movements between demonstration accounts. It is not a measure of net economic loss.

| Component | Expected outcomes | Conservative approval envelope |
| --- | ---: | ---: |
| Eight setup transfers and attached deposits | 6.200 | 6.200 |
| Five agent requests' downstream transfers | .900 successful payouts | 1.400: every requested payout, including expected rejections |
| Fees for all 13 transactions | Actual fees to be measured | .173 |
| Gross outgoing including fee bound | **7.273** | **7.773** |
| Remaining room below 8 cap | .727 | **.227** |

The fee envelope uses the current verified protocol schedule, twice the estimated action/prepaid gas cost, and upward whole-Tgas rounding. It includes gas reserved for payment transfers/callbacks within each 100 Tgas call. These are estimates with safety margin, not measured future fees. A changed protocol, fee schedule, storage price, excessive gas price or fee envelope stops signing. No extra transaction, payment, top-up or retry is included. Bootstrap sponsor fees were paid before this plan by `testnet` and are not paid from the owner's 10 NEAR balance.

Fee allocation: owner **.0474**, vault **.0239**, agent **.1017**. Every FunctionCall attaches **100 Tgas**; the production settlement callback remains **15 Tgas**. Native actions have no caller-selected prepaid gas field. The three agent-key gas allowances are .10 each within the agent account balance, not additional transfers.

| Account | Funds allocated / expected post-run balance after fee bound | Storage/operating bound | Remaining reserve after obligations |
| --- | ---: | ---: | ---: |
| Owner | Starts 10; sends 6.2; balance **3.75260** | .04096 (4,096 bytes) | **3.71164**, includes at least 2 kept at owner |
| Vault | Receives 4 reserve + 1 principal; pays .9; balance **4.07610** | **2.57000** (256,000 bytes + .01 operating) | **1.40610**, after retaining .1 unspent mandate obligation |
| Agent | Receives 1; balance **.89830** | .04096 | **.85734** |
| Merchant | Receives .1 setup + .9 payouts; balance **1.00000** | .04096 | **.95904** |
| Attacker | Receives .1 setup; no authorized payout; balance **.10000** | .04096 | **.05904** |

Storage is reserved within those balances, not an additional outgoing transfer. The vault bound includes code and fixed-slot state headroom; actual deployed storage still requires measurement. The expected combined balance across all five accounts after the conservative fee allowance is **9.827 NEAR**: internal transfers do not reduce that aggregate. Do not subtract the gross 7.773 envelope again from the combined balance.

## Exact transaction sequence

Aliases: O=`ml-demo-20261031.testnet`; V=`vault.ml-demo-20261031.testnet`; A=`agent.ml-demo-20261031.testnet`; R=`merchant.ml-demo-20261031.testnet`; X=`attacker.ml-demo-20261031.testnet`. Operator keys and K0/K1/K2 are the unchanged public keys in the reviewed config. Operator-held agent administrator FullAccess is never supplied to the agent runner.

| # | Signer → receiver | Exact operation / native amount or attached deposit | Call gas | Fee bound | Expected result |
| --- | --- | --- | --- | ---: | --- |
| 1 | O/owner → V | CreateAccount; Transfer **4**; AddFullAccess(vault key) | Native | .0017 | Vault created with reserve |
| 2 | O/owner → A | CreateAccount; Transfer **1**; AddFullAccess(agentAdmin key) | Native | .0017 | Separate agent gas account |
| 3 | O/owner → R | CreateAccount; Transfer **.1**; AddFullAccess(recipient key) | Native | .0017 | Approved recipient exists |
| 4 | O/owner → X | CreateAccount; Transfer **.1**; AddFullAccess(attacker key) | Native | .0017 | Unapproved recipient exists |
| 5 | V/vault → V | Deploy exact frozen Wasm; `new({owner_id:O})`, deposit **0** | 100 Tgas for `new` | .0239 | Atomic deployment/initialization |
| 6 | A/agentAdmin → A | Add K0/K1/K2 as FunctionCall keys: receiver V, only `execute_payment`, allowance **.10 each** | Native | .0002 | Restricted agent authority |
| 7 | O/owner → V | `fund({})`, deposit **1** | 100 Tgas | .0203 | Principal funded |
| 8 | O/owner → V | `create_mandate`: agent A, keys K0–K2, recipients [R], budget **1**, ceiling **.4**, expiry below; deposit **0** | 100 Tgas | .0203 | Mandate 1, available 1/pending 0/spent 0 |
| 9 | A/K0 → V | `execute_payment`: mandate 1, application nonce **0**, R, amount **.10**, deposit **0** | 100 Tgas | .0203 | ALLOW; actual transfer and terminal callback; A=.9/P=0/S=.1 |
| 10 | A/K0 → V | Same method: mandate 1, nonce **1**, X, amount **.10**, deposit **0** | 100 Tgas | .0203 | Expected ERR_RECIPIENT at vault; no payout |
| 11 | A/K0 → V | Same method: mandate 1, nonce **2**, R, amount **.40**, deposit **0** | 100 Tgas | .0203 | Independent budget competitor |
| 12 | A/K1 → V | Same method: mandate 1, nonce **3**, R, amount **.40**, deposit **0** | 100 Tgas | .0203 | Independent budget competitor |
| 13 | A/K2 → V | Same method: mandate 1, nonce **4**, R, amount **.40**, deposit **0** | 100 Tgas | .0203 | Independent budget competitor |

Submit #11–13 independently using distinct keys/access-key nonces, before awaiting finality. Any two should pay; one should reach the vault and fail ERR_BUDGET. Final expected available **.1**, pending **0**, spent **.9**; merchant gains **.9** overall. No same-block execution is promised. The documented expected rejection in #10 and one budget rejection in #11–13 are successful security-test outcomes; any other failure or receipt inconsistency stops subsequent execution. A nonce conflict is not budget enforcement evidence.

The malicious redirect policy demonstration is local, deterministic BLOCK and produces no transaction. #10 intentionally bypasses that gate as the exact approved security fixture. The concurrency requests similarly bypass local REVIEW for this fixed stress case. No live LLM claim or arbitrary browser bypass is introduced.

The exact 13 transaction shapes match the previous approval artifact after excluding display-only scenario labels. Accounts, keys, methods, arguments, amounts, gas, application nonces and mandate expiry did not change. Runtime access-key nonces and recent block hashes must be read fresh, not frozen in advance. Machine-readable actions and fee bounds: `artifacts/phase4-revised/exact-transactions.json`.

## Deadline and validity

- Mandate expiry unchanged: **November 1, 2026, 16:00 UTC (11:00 a.m. EST)**; `1793548800000000000` ns.
- Final confirmation deadline unchanged: **November 1, 2026, 15:00 UTC (10:00 a.m. EST)**.
- New conservative start cutoff: begin #1 **before 14:30 UTC (9:30 a.m. EST)** on November 1.
- New last-submission cutoff: submit any remaining transaction **before 14:50 UTC (9:50 a.m. EST)**, reserving at least ten minutes for finality. These cutoffs are enforced in approval validation; they do not extend the original deadline.

The live review left approximately **23 h 54 min** until the final deadline. That permits the planned sequential setup and three payment batches under normal RPC/finality conditions. No future network completion time is guaranteed. If confirmation is unavailable, stop without resubmission; reaching the deadline leaves the affected outcome UNVERIFIED and requires a revised plan. Do not start near the original deadline or silently extend expiry. Ed25519 key material has no date expiry; role matches and the current owner permission passed, while the three restricted onchain permissions still need installation and verification at step 6.

## Local changes and validation

Changes are limited to local execution tooling/tests/documentation:

- `budget.mjs`: binds the known bootstrap, exact 13-call plan, incoming 10/outgoing 8 distinction and .173 fee ceiling; checks cumulative requested transfers plus fees; verifies ordered owner-balance bounds, retained 2 NEAR and all remaining signer fees/storage/deposits.
- `deploy.mjs`: replaces the obsolete owner≤8 check with those stricter contextual checks; verifies the single owner key and empty owner code; preserves ordered FINAL predecessor checks, signer authority, deployment overwrite protection, config/lock/Wasm/expiry checks and no-retry journal. Adds a bounded fresh-block clock check before broadcast.
- `run.mjs`: checks the same aggregate budget permit before agent signing; existing restricted-key, policy, pending-state, funding, receipt and nonce checks remain.
- `plan.mjs` and `approval.revised.json`: new disabled approval schema and conservative cutoffs. Legacy review documents are preserved; no executable permit activated.
- `review-revised-budget.mjs`: reproduces the forecast offline from captured current protocol/state.
- Eight focused regression tests cover grant acceptance, unexpected balances, ordered spending, storage/locked/code checks, worst-request accounting, fee overruns, approval substitutions and cutoffs.

**123 PASS / 0 FAIL:** 64 Node tests (all 56 previous tests plus 8 new), 44 original native contract tests, 8 existing Rust tests, and 7 harness library tests. No sandbox/CI runtime rerun occurred. All original Phase 2A/2B runtime evidence is preserved. The real installed SDK still passes signing/encoding tests for all 13 transaction shapes with ephemeral offline test keys. No real credential signed a transaction during this revision.

Reproduce locally:

```powershell
node testnet/review-revised-budget.mjs
node --test demo/test/*.test.mjs testnet/test/*.test.mjs
cargo test --locked --offline
cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline
node testnet/verify-frozen.mjs
```

Fresh read-only state/key checks, funding forecast, exact action comparison, tests and review manifest are preserved under `artifacts/phase4-revised/`. Sources contain public keys and generic credential paths only; private credentials, caches, build outputs and evidence artifacts remain excluded from future source uploads. No upload is currently authorized.

## Required next approval and safe stop

Approve **exactly setup #1–8 and agent #9–13 once**, in this order with the final batch independently submitted, under this revised disabled permit, 8 NEAR gross outgoing cap including the .173 conservative fee envelope, unchanged contract/keys, and earlier start/submission cutoffs. No bootstrap or additional faucet funding is part of this request. Only after that approval may a separate local executable permit be activated.

Before each submission, recheck expected finalized state, account/key authority, funding, network/fee conditions, exact actions, deposits/gas, Wasm and deadline. Preserve real transaction hashes before the single broadcast; require FINAL transaction and receipt evidence plus consistent post-state snapshots. If an outcome is uncertain, read its hash without retrying. No pending reservation release, compensating payment, arbitrary withdrawal, top-up, account substitution, key change, redeploy or cleanup transaction is authorized.

Security limitations remain: full-access operator custody can bypass contract controls; same-user Windows processes are not isolated; failed/missing callbacks can strand reservations; block-end observations do not establish intra-block solvency; no production custody security sign-off. Public testnet payment/callback behavior remains UNVERIFIED until separately approved execution. No push, CI, public repository, mainnet or further phase is included.
