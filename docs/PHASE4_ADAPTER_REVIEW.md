# Phase 4 final execution adapter review

2026-11-01. **NO-GO for public testnet execution.** The six-scenario production-Wasm sandbox proof remains valid, but the actual public CLI still implements the failed combined deployment. The split design is a planning module, not a wired execution adapter. This review did not change the execution scripts or production code, enable permits, read real private keys, submit public transactions, push, or trigger CI.

## Confirmed findings

| Severity | Finding | Exact implementation | Evidence and consequence |
|---|---|---|---|
| High | 5A/5B are absent from the executable CLI | testnet/deploy.mjs:15; testnet/plan.mjs:46; testnet/initialization-repair.mjs:1 | CLI uses deploymentPlan, whose deploy-init contains DeployContract + new signed by V. Mocked deploy-only and initialize-owner stop with Unknown step. Reusing the combined step gives the wrong initializer authority. |
| High | History/dependency/budget model is stale | testnet/continuation.mjs:8 and :20; testnet/deploy.mjs:19; testnet/run.mjs:31 | Only transactions 1–3 are recognized by continuation accounting, rather than four creations plus failed 5. Fund still requires a successful deploy-init marker, which must never exist for this history. Actual journal exclusive claims stop repeats, but do not make the sequence executable. |
| Medium | Deployment receipt validation accepts inconsistent evidence | testnet/deploy.mjs:47–52 | VM tests accept a changed public key, changed actions and empty receipts while hash/signer/receiver and top-level success are fixed. No post-deployment view_code, view_state or stored-owner/accounting check exists. This is a confirmed validator gap under inconsistent RPC fixtures, not evidence that NEAR accepted an invalid signature or of a contract exploit. |
| Medium | Strict scenario ordering is incomplete | testnet/run.mjs:18–25; testnet/adapter.mjs:66–74 | Both rejection and concurrency use spent 0.1/available 0.9; the CLI does not require the finalized transaction-10 rejection journal before concurrency. The correct plan must explicitly preserve this dependency. Source finding; not a new public execution. |
| Medium | Approval/budget binding still targets legacy operations | testnet/plan.mjs:52–77; testnet/budget.mjs:52–60 | The disabled repair proposal has action objects and a new plan hash. Legacy approval expects operation strings and legacy continuation metadata, while the fee guard binds the old 13-call plan. Turning approved=true alone cannot make this safe. The start cutoff also names create-attacker, not new 5A. |

No production contract defect was found. No finding calls for weakening owner checks or changing the frozen Wasm. The public execution scripts have not been silently replaced during this review.

## Initialization identity and exact artifact

src/model.rs:170–178 requires owner_id to equal the current vault's immediate parent AND both runtime predecessor and signer to equal that owner. src/contract.rs:24–29 uses #[init], calls the model with actual runtime context, and enforces backing; callers cannot set those identities in JSON. The [official initializer documentation](https://docs.near.org/smart-contracts/anatomy/functions) explains initialization functions; the application's stricter owner rule comes from its actual source and finalized sandbox receipts.

- **5A:** signer V using its reviewed vault FullAccess key; receiver V; one DeployContract action containing the frozen production bytes. No new call in this transaction.
- **5B:** signer O using its reviewed owner key; receiver V; one direct FunctionCall new({owner_id:O}), **deposit 0**, **100000000000000 gas (100 Tgas)**. The direct receipt must have predecessor O and Action signer O. Never select the vault key for new.
- Proven sandbox success hash **6nPck8SYSFuQW1Ci36qoQ6bLvy62nety17g88ZTW6FtY**; initialization receipt **Gqt4vTyrso5NQFLBpm9wgAjQJsGYTDZS3T6tFZGJdMPe**. All three unauthorized cases and repeated initialization rejected as expected in [the preserved results](PHASE4_INITIALIZATION_SANDBOX_RESULTS.md).
- Exact local artifact: **artifacts/phase2b-closure-run/evidence/phase2a/mandatelock.wasm**; **159542 bytes**; SHA-256 **3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87**. Both production artifacts and all 16 frozen baseline files passed unchanged verification.
- Installed near-api-js **7.4.0** can serialize/sign each split action correctly in two new offline tests with disposable in-memory keys and an invalid zero block hash. Those tests prove SDK serialization only; they do not make the public CLI support the split sequence.

## Local adapter test evidence

**162 local checks PASS, 0 test assertion failures:** 99 Node/demo/planning checks (82 existing + 17 new review checks), 44 original native contract tests, 8 existing security tests, 4 initialization authority tests, 7 harness tests. **These passing audit assertions reproduce known adapter failures; they are not a readiness PASS.** The prior 6 + 12 + 4 Linux runtime scenarios remain preserved evidence and were not rerun or re-counted as new execution.

The actual deploy.mjs source runs inside an isolated VM with its real plan, approval, budget, journal and continuation modules. Network transport, credential access and signing are replaced with explicit mocks; the only submitted fixture is an invalid non-broadcastable string delivered to an in-memory RPC stub. Real private-key files and fetch are not available to this VM. Synthetic permits exist only in memory. Temporary test journals are separate from all real execution journals; byte-preservation is asserted.

| Mock scenario | Actual CLI behavior | Mock sends | Outcome |
|---|---|---:|---|
| disabled | stopped | 0 | Explicit owner approval package required |
| empty-receipts | accepted | 1 | Accepted response and recorded verified-deployment-step |
| existing-failed | stopped | 0 | EEXIST — existing operation journal |
| existing-fourth | stopped | 0 | EEXIST — existing operation journal |
| expired | stopped | 0 | Approval expired |
| fund-after-split | stopped | 0 | Previous step not verified; reconcile, do not rerun |
| nonfinal | stopped | 1 | Uncertain deployment; stop |
| receipt-failure | stopped | 1 | A deployment receipt failed |
| split-deploy | stopped | 0 | Unknown step |
| split-init | stopped | 0 | Unknown step |
| uncertain | stopped | 1 | Uncertain deployment; stop |
| wrong-actions | accepted | 1 | Accepted response and recorded verified-deployment-step |
| wrong-hash | stopped | 1 | Expected values to be strictly equal: |
| wrong-initializer | stopped | 1 | Deployment step failed |
| wrong-key | accepted | 1 | Accepted response and recorded verified-deployment-step |

Uncertain submission uses one send only, followed by read-only status queries; no retry/resubmission occurs. Nonfinal outcomes, mismatched hashes and explicit failed receipts stop. Existing transaction-4 and failed-5 journal claims stop before signing. However, the current runner does **not** stop on every unexpected response: the three validation-gap fixtures above are accepted. These outcomes must be reversed into strict rejection tests in a corrected adapter.

Logs: all Node tests (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), native tests (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), harness tests (historical local-only reference; excluded from public snapshot; result retained without inventing evidence). Mock per-case calls/receipts/journal events are under artifacts/phase4-adapter-review/mock. Initial VM tests hit a cross-realm object-prototype mismatch in the audit fixture; using the same JSON realm corrected the harness without bypassing production assertions. The first full Node run hit sandbox EACCES on a localhost UI test; rerunning with loopback permission passed. Native compilation emitted a cache hard-link fallback warning only.

## Fresh finalized public state — read-only

Audit **2026-11-01T01:21:27.748Z**, RPC **https://rpc.testnet.fastnear.com**, chain_id testnet, FINAL block **275679519**, hash **5qkwfZp1GbqTPtWzbutBbpJQiEYXPW3htF1L6MYnb4Cn**, timestamp **1793496083281104265 ns**. All five historical transaction actions, statuses and receipt outcomes match saved FINAL records. No transaction was signed or sent in this audit. Raw audit (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).

The vault has empty code hash **11111111111111111111111111111111** and pinned view_state values **[]**: **no deployed contract and no initialization state**. Account and key reads use the same finalized block. Read semantics follow the [official account/state RPC documentation](https://docs.near.org/api/rpc/contracts). Finalized transaction checks use the [official transaction-status API](https://docs.near.org/api/rpc/transactions), not explorer rendering alone.

| Role/account | Finalized NEAR | Access/state |
|---|---:|---|
| owner: ml-demo-20261031.testnet | 4.77154004185 | One reviewed FullAccess key; nonce unchanged; locked 0; storage 182 bytes; no code |
| vault: vault.ml-demo-20261031.testnet | 3.9986705035675164 | One reviewed FullAccess key; nonce unchanged; locked 0; storage 182 bytes; no code |
| agent: agent.ml-demo-20261031.testnet | 1 | One reviewed FullAccess key; nonce unchanged; locked 0; storage 182 bytes; no code |
| recipient: merchant.ml-demo-20261031.testnet | 0.1 | One reviewed FullAccess key; nonce unchanged; locked 0; storage 182 bytes; no code |
| attacker: attacker.ml-demo-20261031.testnet | 0.1 | One reviewed FullAccess key; nonce unchanged; locked 0; storage 182 bytes; no code |

All four subaccounts already exist; never create or refund them again. Transaction 5 remains finalized ERR_INITIAL_OWNER and its fees remain charged. None of the restricted agent keys is installed yet. The three reviewed agent public keys and five operator public keys are reproduced in the disabled continuation-package.json (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), which contains no private credentials. Future agent access must be exactly receiver V / method execute_payment / allowance 0.1 each. The operator retains the separate agent-admin key; the demo agent/browser must never receive owner/vault FullAccess keys.

## Reconciled cap and reserves

Protocol version **88**, gas price **100000000 yoctoNEAR/gas**, storage price **10000000000000000000 yoctoNEAR/byte**; reviewed action-fee digest unchanged. Fixed creation charge remains **0.007 NEAR**, already included in historical costs. Remaining plan has zero account creations.

| Component | NEAR |
|---|---:|
| Authorized received faucet grant | 10 |
| Actual outgoing already incurred, including failed 5 | 5.2297894545824836 |
| Remaining attached fund deposit | 1 |
| All remaining requested payouts, including expected rejections | 1.4 |
| Remaining conservative transaction fee allowance | 0.1663 |
| **Remaining envelope** | **2.5663** |
| **Aggregate outgoing maximum** | **7.7960894545824836** |
| **Headroom under original 8 NEAR cap** | **0.2039105454175164** |

5A fee bound **0.0037** plus 5B **0.0203** = **0.0240 NEAR**; splitting adds **0.0001** compared with a single new combined call. The already-incurred failed-5 fee **0.0013294964324836** remains included separately. Do not substitute sandbox gas measurements for conservative public fee bounds. Total fees and principal movements count toward the original aggregate cap even for internal transfers.

Owner remaining conservative balance **3.71064004185**, exceeding retained 2 + 0.04096 storage reserve. Vault before funding **3.9949705035675164**, exceeding conservative 256000-byte storage/operating floor **2.57**; expected final vault after +1 funding and 0.9 payouts **4.0949705035675164**, exceeding 2.57 + 0.1 outstanding available balance. Agent conservative end **0.8983**, exceeding 0.04096 storage reserve. Existing 182-byte accounts require 0.00182 each. K0's three payment fee bounds total 0.0609 < its 0.1 allowance; K1 and K2 require at most 0.0203 each.

## Exact proposed continuation and dependency checks

O = ml-demo-20261031.testnet; V = vault.ml-demo-20261031.testnet; A = agent.ml-demo-20261031.testnet; R = merchant.ml-demo-20261031.testnet; X = attacker.ml-demo-20261031.testnet. K0/K1/K2 are the three unchanged reviewed restricted keys. Every function call has 100 Tgas; deposits are zero except fund. Payment amount is a requested contract payout, not an attached deposit.

| Label | Signer/key → receiver | Exact operation | Deposit + requested payout NEAR | Max fee NEAR | Max outgoing NEAR | Required result/dependency |
|---|---|---|---:|---:|---:|---|
| 5A | V/vault → V | DeployContract frozen Wasm only | 0 | 0.0037 | 0.0037 | Five historical outcomes reconciled; FINAL; exact code hash; STATE absent |
| 5B | O/owner → V | new({owner_id:O}) | 0 | 0.0203 | 0.0203 | Verified 5A; owner signer/predecessor; stored owner O; zero accounting |
| 6 | A/admin → A | Add K0/K1/K2, receiver V, only execute_payment, allowance 0.1 each | 0 | 0.0002 | 0.0002 | Verified 5B; exact finalized key permissions |
| 7 | O/owner → V | fund({}) | 1 | 0.0203 | 1.0203 | Verified 6; unallocated principal becomes 1 |
| 8 | O/owner → V | create_mandate: A, K0–K2, [R], budget 1, ceiling 0.4, expiry below | 0 | 0.0203 | 0.0203 | Verified 7; mandate 1; available 1, pending/spent 0 |
| 9 | A/K0 → V | execute_payment: mandate 1, nonce 0, R, amount 0.1 | 0 + 0.1 | 0.0203 | 0.1203 | Verified 8; payout and terminal successful callback |
| 10 | A/K0 → V | execute_payment: mandate 1, nonce 1, X, amount 0.1 | 0 + 0.1 | 0.0203 | 0.1203 | Verified 9; ERR_RECIPIENT; no payout/accounting change |
| 11 | A/K0 → V | execute_payment: mandate 1, nonce 2, R, amount 0.4 | 0 + 0.4 | 0.0203 | 0.4203 | Verified 10; independently submitted three-key batch |
| 12 | A/K1 → V | execute_payment: mandate 1, nonce 3, R, amount 0.4 | 0 + 0.4 | 0.0203 | 0.4203 | Same independently submitted batch; no nonce conflict accepted |
| 13 | A/K2 → V | execute_payment: mandate 1, nonce 4, R, amount 0.4 | 0 + 0.4 | 0.0203 | 0.4203 | Batch exactly two payouts, one ERR_BUDGET; all FINAL |

The proposal lists each exact JSON action, public key, maximum fee, deposit, payout and per-transaction safe-stop condition in continuation-package.json. Fingerprint **ca065b31cc8bb9f42044e470aa0cd7cd38cef8118424b689d75c910853888493**, unchanged from the reviewed split plan. One shared journal history must preserve successful 1–4 and failed 5; new claims begin at deploy-only/5A, followed by initialize-owner/5B. Never replace a failed deploy-init journal with a success marker. Proposed public history totals 15 submitted transactions: five historical + ten new.

For every step: require expected network/account/key/nonce/funding/expiry/code/plan bindings; durable exclusive claim and signed hash before one submission; verify actual actions and every required receipt; pin post-state at/after all receipt blocks; reconcile charged fees and remaining reserves before continuing. Stop on uncertain or unexpected outcome, stale state, fee/cap breach or deadline. Never delete/restart a claim or release uncertain pending reservations. For concurrent calls, do not authorize a second batch; resolve all already-submitted hashes read-only after any uncertainty. No same-block concurrency claim without actual receipt evidence.

## Required local adapter correction before any execution approval

1. Wire the exact repairPlan into the public entry point with separate signer selection for 5A/5B; leave historical deploymentPlan for historical tests only.
2. Bind a new disabled permit to the exact ten-operation plan, five historical hashes, reviewed artifact/dependencies, cap, per-step fees, and 5A start cutoff. Reconcile four completed creations plus failed 5, not the old three-transaction baseline. Preserve exclusive historical journals.
3. Implement post-5A code/empty-state verification and post-5B direct receipt identities, stored owner and zero accounting; validate public key, full action bytes/arguments, receipt completeness and pinned post-state before writing a verified marker. Apply equivalent exact-state checks to key installation, funding and mandate creation.
4. Route agent execution through the corrected cumulative fee/history model and require verified predecessor operation markers, including rejection 10 before the concurrent batch. Use the existing restricted-key checks, successful callback/accounting validation and no-resubmission transport behavior.
5. Replace the known-gap audit expectations with positive stop/rejection assertions and demonstrate the full corrected mocked sequence, failure cases and dependency ordering before seeking public execution approval.

These are required orchestration fixes, not authorization changes or new contract features. This review deliberately does not certify a nonexistent corrected runner or treat successful plan serialization as completed integration.

## Timing, reproduction and final decision

Original November 1 cutoffs: start before **14:30 UTC**, submit before **14:50 UTC**, FINAL by **15:00 UTC**. Mandate expiry **16:00 UTC**, **1793548800000000000 ns**. Read-only audit at 01:21 UTC was within the window, with more than 13 hours before the start cutoff. Timing must be rechecked after adapter corrections and immediately before separately approved execution; expired deadlines require a revised plan, never a silent extension.

Local checks executed:

`node --test demo/test/*.test.mjs testnet/test/*.test.mjs` — 99 PASS. The review test automatically launches isolated child VMs using --experimental-vm-modules; no network submission occurs.

`cargo test --locked --offline` — 44 + 4 + 8 PASS.

`cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline` — 7 PASS.

`node testnet/verify-frozen.mjs` — unchanged production PASS.

`node artifacts/phase4-adapter-review/read-only.mjs` — finalized testnet account/state/history/fee reads only; writes a disabled local proposal.

**Final recommendation: NO-GO for public execution with the current scripts.** Budget/funding, frozen Wasm, sandbox design and current empty vault preconditions PASS. Execution-adapter equivalence, corrected dependency/budget wiring and strict deployment receipt/state verification FAIL review. Corrected-runner behavior remains UNVERIFIED because that runner does not yet exist. All public permits remain disabled; separate explicit execution approval will still be required after those defects are corrected and tested.

Retained FullAccess custody, same-user Windows key isolation, potentially stranded reservations after missing/failed callbacks, and unverified intra-block solvency remain. No production custody security sign-off. No automatic uncertain-reservation release or compensating second payment is permitted.

Local changes consist of this report, its index link, two additive offline review-test files and local audit/evidence files only. No production source, Wasm, execution runner, existing permit, key or historical journal was changed. The official checkout remains clean; no push or CI run occurred.
