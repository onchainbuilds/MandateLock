# Phase 4 initialization sandbox results and continuation recommendation

2026-11-01. **Sandbox validation GO: six of six PASS; no unexpected failures. Public execution HOLD pending separate approval and a reviewed split-plan execution adapter.** No public-chain transaction, account creation, faucet request or signing occurred during this validation task.

## Authorized execution and provenance

- Exactly one normal push, four additive files (492 insertions): `.github/workflows/phase4-initialization.yml`, `docs/PHASE4_INITIALIZATION_VALIDATION.md`, `integration-tests/tests/initialization_repair.rs`, `tests/initialization_authority.rs`. No production source, existing tests, Cargo locks or binary artifacts were committed.
- Commit **a370a7bc3eac05129f364c60c157c4940bd4901b**; parent **75051c2fc7ecff6390c49fa67274d70d275d07c8**. Exact staged blobs were reviewed for credentials, private keys, personal paths and artifacts; no matches. Manifest: upload-manifest.json (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).
- GitHub CLI identity **onchainbuilds**, repository owner **onchainbuilds**, private **true**, verified before push and again after completion. Chrome was used for repository inspection, manual dispatch and monitoring. Its artifact download timed out; authenticated CLI downloaded the artifact without rerunning the workflow.
- [Workflow run 41259151981](https://github.com/onchainbuilds/MandateLock/actions/runs/41259151981): **success**, attempt **1**, one total run of this workflow. Manual dispatch; start 00:59:32 UTC, complete 01:10:05 UTC. No retry or second dispatch.
- Ubuntu 24.04, Rust 1.93.0, near-workspaces 0.23.0, sandbox 2.13.4. Frozen production Wasm reused from the previously verified artifact, not rebuilt or replaced. All six new cases execute production Wasm, not diagnostic fixtures.
- Production SHA-256 **3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87**, **159542 bytes**. Deployed code retrieved and hash-checked in every scenario. Windows artifact also unchanged: **eeded7009d4e56c460744ba7bdf17a52cc04a3d41fa1997903bf7622fb102bb3**. Final local freeze check passed all 16 baseline files and both artifacts; official checkout is clean.

## Six production-Wasm runtime scenarios

Every row has actual FINAL transaction and receipt outcomes. Expected contract rejections are scenario PASS, not unexpected execution failures. Sandbox hashes have no public explorer URLs.

| Scenario | Result | Actual transaction hash | Verified outcome |
|---|---|---|---|
| Vault-authorized deploy-only | **PASS** | `HdA3FyZFZ8X8ZdULzimAXGLseui6r4gGvRCXQgesQAXY` | Success; empty STATE |
| Attacker claims parent owner | **PASS** | `CTJqTkQVSjNDqB66uzQ9S3uvsrEaifuqTuC3a6oTkP1o` | ERR_INITIAL_OWNER; empty STATE |
| Attacker claims themselves | **PASS** | `AhT4CtQsjAmWtZzcq1EG33p6xTYoLTmzSHzKCSJyY6KZ` | ERR_INITIAL_OWNER; empty STATE |
| Vault attempts self-initialization | **PASS** | `BozedYf1sJeVH7tGgsfQBLPXDQ6up84cADHnDM5cpaXL` | ERR_INITIAL_OWNER; empty STATE |
| Direct parent-owner initialization | **PASS** | `6nPck8SYSFuQW1Ci36qoQ6bLvy62nety17g88ZTW6FtY` | Success; stored parent owner and zero accounting |
| Repeated parent initialization | **PASS** | `Fb8FhY5vSqe2QEvoxU6GxrD3TQX5xBgGCz8Rskf8Uanz` | Already initialized; identical STATE |

Parent initialization receipt **Gqt4vTyrso5NQFLBpm9wgAjQJsGYTDZS3T6tFZGJdMPe** records signer, receipt signer and predecessor **repair-owner.test.near**, receiver **vault.repair-owner.test.near**, method **new**. Stored owner matches. All three unauthorized initialization attempts preserve empty contract state; the repeated call preserves byte-identical initialized state. Native tests also cover mismatched signer/predecessor combinations; those additional combinations are not claimed as separate runtime scenarios.

After initialization, budget, available, pending, spent, unallocated principal and last mandate ID are all zero. Observed vault balance **3.9973641799762573 NEAR**, reported storage/operating floor **1.64916 NEAR**, deployed initialized storage **159820 bytes**. These are finalized snapshots, not intra-receipt solvency proof. The three-account sandbox topology uses disposable synthetic funds, with vault initial funding matching the stopped public vault balance.

| Case | Main action receipt ID | Receipt gas burnt (gas units) | Sum of transaction/receipt tokens_burnt (NEAR) | Finalized vault balance NEAR | Vault storage bytes |
|---|---|---:|---:|---:|---:|
| vault-deploy-only | `AS1sY6Y77Zt1PrE3UQrQ6JgkZpiDtekH9Pg1q6wsQWhR` | 10594921881648 | 0.0011974706618106 | 3.9974730329057058 | 159724 |
| attacker-claims-parent | `ADjQVxsY19p1R7Mb2bHUNMUhyNpBtTGVgpodgVL7MLkT` | 1227299419606 | 0.0001537266268206 | 3.9974832074201731 | 159724 |
| attacker-claims-self | `65T8GixNNiRWVGZbe6QDzchBSW2q5ULxANccZzCS7Boc` | 1227089982022 | 0.0001537199881767 | 3.9974933754502789 | 159724 |
| vault-self-init | `2V5Eu5ZHXV3DtjMNqm6WbUPwZYDu9RiFNkGeh1wdW13L` | 1227704466658 | 0.0001535853404018 | 3.997349976775756 | 159724 |
| parent-init | `Gqt4vTyrso5NQFLBpm9wgAjQJsGYTDZS3T6tFZGJdMPe` | 1361588954070 | 0.000167155580267 | 3.9973641799762573 | 159820 |
| repeat-parent-init | `2JFu14mFgBn5YJbaM8kwgfvnxxrKMdkhEsuu3RTdjtWp` | 1154430178015 | 0.0001464397026615 | 3.9973721684134769 | 159820 |

The fee column sums raw outcome fields; it is not the net decline of combined account balances, because runtime contract gas rewards can credit the vault, including after rejected calls. State preservation does not imply unchanged gas-paying account balances. Complete signer balances, gas, refund receipts and errors are retained in each case's FINAL and snapshot JSON. Initialization creates no application callback; its extra receipt is a protocol gas refund. Payment callback behavior is covered by the rerun accounting suites below.

## Regression results

**85 CI checks/scenarios PASS, 0 FAIL, 0 UNVERIFIED:** 44 original native tests, eight existing security tests, four new initialization authority tests, seven harness regressions, six initialization runtime scenarios, twelve Phase 2A runtime scenarios and four Phase 2B aggregate runtime scenarios. The six initialization scenarios run inside one Rust integration test; these totals count named scenarios rather than only Rust test functions. Formatting and Clippy passed. **82 local Node/demo/planning tests also PASS**; thus 145 local/native checks remain passing, with 22 sandbox scenarios additionally validated. No production defect was discovered; the original public failure was a deployment orchestration error correctly rejected by authorization.

| Existing sandbox scenario | Result |
|---|---|
| Phase 2A: 01 authorized payment | PASS |
| Phase 2A: 02 unauthorized recipient | PASS |
| Phase 2A: 03 transaction ceiling | PASS |
| Phase 2A: 04 total budget | PASS |
| Phase 2A: 05 expired authorization | PASS |
| Phase 2A: 06 replay | PASS |
| Phase 2A: 07 unauthorized administration | PASS |
| Phase 2A: 08 restricted key | PASS |
| Phase 2A: 09 forged callback | PASS |
| Phase 2A: 10 async successful settlement | PASS |
| Phase 2A: 11 genuine native failure | PASS |
| Phase 2A: 12 independent competing requests | PASS |
| Phase 2B: production maximum-state gas and receipt-block balances | PASS |
| Phase 2B: production full-access custody limitation | PASS |
| Phase 2B: diagnostic duplicate callback idempotency | PASS |
| Phase 2B: diagnostic out-of-gas callback leaves pending | PASS |

The two Phase 2B fault-injection aggregates remain explicitly diagnostic; they use their previously pinned production-equivalent fixtures and are not relabelled as unmodified production behavior. The paid-transfer and refunded-transfer callback-failure branches are inside the diagnostic out-of-gas aggregate. Missing callback recovery and intra-block solvency are not newly proven by passing this workflow.

## Evidence archive

[GitHub artifact 13065150488](https://github.com/onchainbuilds/MandateLock/actions/runs/41259151981/artifacts/13065150488), name **mandatelock-phase4-initialization-evidence**, downloaded ZIP **5274208 bytes**, verified SHA-256 **6d359ff024aabc6afdd2fae05c3669a713c59c48617cf4f0353d600779923825**.

Local evidence.zip (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), extracted initialization results (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), independent analysis (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), receipt identities (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), accounting (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), Phase 2A results (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), Phase 2B results (historical local-only reference; excluded from public snapshot; result retained without inventing evidence). Raw receipts, balances, code/state snapshots, native/Clippy/runtime logs and source-artifact provenance are preserved, including expected rejection errors. Workflow artifact upload runs even on failure. A Node20 action-runtime deprecation warning did not affect this successful run; it can be handled separately.

## Refreshed public-testnet state and budget — read-only

Audit completed **2026-11-01T01:15:38.407Z**, FastNEAR testnet finalized block **275678921**, hash **5QHV6GMdipqZgvkbqSPLBrQyeLnSTuDcvft1WJhGANqg**, timestamp **1793495734610085267 ns**. All five historical transactions' actions, statuses and receipt outcomes match saved FINAL evidence: transactions 1–4 remain successful account creations; failed transaction 5 remains ERR_INITIAL_OWNER. Never recreate those accounts or repeat the combined transaction. Fresh raw audit (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).

| Public account | Finalized NEAR | Verified state |
|---|---:|---|
| owner: ml-demo-20261031.testnet | 4.77154004185 | Reviewed operator FullAccess key and nonce unchanged; no code; 182 bytes storage |
| vault: vault.ml-demo-20261031.testnet | 3.9986705035675164 | Reviewed operator FullAccess key and nonce unchanged; no code; 182 bytes storage |
| agent: agent.ml-demo-20261031.testnet | 1 | Reviewed operator FullAccess key and nonce unchanged; no code; 182 bytes storage |
| recipient: merchant.ml-demo-20261031.testnet | 0.1 | Reviewed operator FullAccess key and nonce unchanged; no code; 182 bytes storage |
| attacker: attacker.ml-demo-20261031.testnet | 0.1 | Reviewed operator FullAccess key and nonce unchanged; no code; 182 bytes storage |

All accounts have locked balance zero; the attacker already exists. No restricted agent keys are installed yet. The future three agent keys remain restricted to vault receiver / execute_payment / 0.1 NEAR allowance each; only the operator holds the separate agent administrator key. Vault FullAccess must never enter the agent/browser client.

Protocol version **88**, current gas price **100000000 yoctoNEAR/gas**, storage price **10000000000000000000 yoctoNEAR/byte**. Reviewed action-fee digest unchanged. No remaining account creation, so no further 0.007 NEAR creation charges; historical charges remain included.

| Envelope component | NEAR |
|---|---:|
| Actual outgoing already incurred, including failed transaction 5 | 5.2297894545824836 |
| Remaining attached deposits | 1 |
| All requested payouts, including expected rejected requests | 1.4 |
| Remaining conservative fee bound | 0.1663 |
| Remaining maximum envelope | 2.5663 |
| **Aggregate maximum** | **7.7960894545824836** |
| **Headroom under 8 NEAR** | **0.2039105454175164** |

The 10 NEAR grant is already received; no further funding is required. Internal transfers are counted in the approved outgoing envelope even when they remain within the five-account system. Conservative fees, not observed sandbox fees, govern this public cap.

## Proposed continuation: ten new transactions, unchanged amounts

O = ml-demo-20261031.testnet; V = vault.O; A = agent.O; R = merchant.O; X = attacker.O. Full account IDs and public keys are in the disabled updated exact proposal (historical local-only reference; excluded from public snapshot; result retained without inventing evidence). No new public unauthorized-initialization probes are included.

| Label | Signer → receiver | Operation | Deposit NEAR | Gas | Fee bound NEAR | Expected outcome |
|---|---|---|---:|---|---:|---|
| 5A | V → V | Frozen DeployContract only | 0 | Native action | 0.0037 | FINAL success; exact code hash, absent STATE |
| 5B | O → V | new(owner_id=O) | 0 | 100 Tgas | 0.0203 | FINAL success; owner O, zero principal/accounting |
| 6 | A/admin → A | Install K0/K1/K2 restricted function-call keys | 0 | Native actions | 0.0002 | Exact receiver V/method execute_payment/allowance 0.1 each |
| 7 | O → V | fund | 1 | 100 Tgas | 0.0203 | Unallocated principal 1 |
| 8 | O → V | create_mandate: A, K0–K2, [R], budget 1, ceiling 0.4 | 0 | 100 Tgas | 0.0203 | Mandate 1; available 1, pending/spent 0 |
| 9 | A/K0 → V | execute_payment nonce 0, R, amount 0.1 | 0 | 100 Tgas | 0.0203 | Paid and settled |
| 10 | A/K0 → V | execute_payment nonce 1, X, amount 0.1 | 0 | 100 Tgas | 0.0203 | ERR_RECIPIENT; no payout |
| 11 | A/K0 → V | execute_payment nonce 2, R, amount 0.4 | 0 | 100 Tgas | 0.0203 | Independent competitor |
| 12 | A/K1 → V | execute_payment nonce 3, R, amount 0.4 | 0 | 100 Tgas | 0.0203 | Independent competitor |
| 13 | A/K2 → V | execute_payment nonce 4, R, amount 0.4 | 0 | 100 Tgas | 0.0203 | Independent competitor |

Exactly two of 11–13 must settle and one must reach V and fail ERR_BUDGET. Final mandate available 0.1 / pending 0 / spent 0.9, recipient gain 0.9, attacker gain zero. No nonce-conflict substitution or unsupported same-block concurrency claim. Plan SHA-256 **ca065b31cc8bb9f42044e470aa0cd7cd38cef8118424b689d75c910853888493**. Public history would contain the five already submitted transactions plus these ten, not a rewritten 13-transaction record.

Conservative reserves after future fees/deposits: owner **3.71064004185**, exceeding 2 + 0.04096 storage reserve; vault before principal funding **3.9949705035675164**, exceeding conservative storage/operating floor **2.57**; expected final vault **4.0949705035675164**, exceeding 2.57 + 0.1 remaining obligation; agent **0.8983**, exceeding 0.04096 storage. Actual public deployed storage must still be measured; sandbox measured 159820 bytes with shorter account IDs, so the 256000-byte conservative allowance remains unchanged.

## Decision and stop conditions

**GO for the validated split-initialization design. HOLD / NO-GO for immediate public execution.** Sandbox evidence now closes the initialization runtime gate. The old combined deployment runner must not be reused: a reviewed execution adapter must enforce the exact new plan, preserve all five historical journals, independently verify code/state after 5A, and issue 5B from O only after finalized deployment. The proposal remains approved=false and execution_ready=false. No public transaction is authorized by this report.

Original deadlines remain November 1, 2026: begin before **14:30 UTC**, submit before **14:50 UTC**, confirm FINAL before **15:00 UTC**. Mandate expiry remains **16:00 UTC**, **1793548800000000000 ns**. The 01:15 UTC audit is within the window; this is not a guarantee of future approval/execution timing. Repeat finalized network, account, nonce, keys, balances, protocol fees, Wasm hash, expiry and envelope checks immediately before any separately approved execution. Stop on deadline, mismatched state, uncertain receipt or cap breach; never blindly resubmit.

Remaining limitations: operator FullAccess keys can replace code or exercise administrative custody; same-user Windows process separation is not a security boundary; failed/missing callbacks can strand pending reservations; uncertain settlement never automatically restores budget or authorizes a second payment; receipt-block/finalized balance evidence does not prove intra-block solvency. No production custody security sign-off. No production defect was found by this run.

This results report and refreshed approval proposal are local-only after the authorized push. No second push, workflow, public-chain deployment or next phase was initiated. Separate explicit approval is required before public execution.
