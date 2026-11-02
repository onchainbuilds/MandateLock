# Phase 4 initialization repair and gated execution proposal

**Update after the separately authorized sandbox run:** [Initialization sandbox results](PHASE4_INITIALIZATION_SANDBOX_RESULTS.md). All six production-Wasm runtime cases now PASS; the earlier UNVERIFIED entries below are historical preparation results. Refreshed balances and budget remain unchanged. Public execution still requires separate approval and a reviewed corrected execution adapter; no public-chain transaction occurred in the validation task.

2026-11-01. **Local repair preparation complete; public execution NO-GO pending production-equivalent sandbox validation and separate approval.** Production source, Cargo manifests/locks, prior tests, workflows and both frozen Wasm artifacts remain unchanged. No real-account signing, submission, faucet request, deployment, push or CI activation occurred. All execution permits remain disabled.

## Exact initialization authority and hijack analysis

The runtime adapter passes actual `env::current_account_id()`, `env::predecessor_account_id()` and `env::signer_account_id()` into `VaultState::new`; callers cannot supply these context values as JSON. See `src/contract.rs:248` and `src/model.rs:170`.

Initialization requires all of the following:

1. `current_account_id = vault.ml-demo-20261031.testnet`.
2. `owner_id = ml-demo-20261031.testnet`, the vault's **immediate parent**, checked by splitting the current account ID at its first dot.
3. `predecessor_account_id = ml-demo-20261031.testnet`.
4. `signer_account_id = ml-demo-20261031.testnet`.
5. Attached deposit zero, adequate storage/operating backing, and no existing contract state.

The failed combined transaction was signed by the vault and therefore had vault signer/predecessor; `ERR_INITIAL_OWNER` was correct. A separate direct parent-owner call supplies both required identities without giving the owner key to the vault or agent.

An ordinary attacker cannot initialize during the deployment-to-initialization interval: claiming the real parent fails both caller checks; claiming themselves fails the immutable parent relationship. A parent-signed call routed through an attacker predecessor is also rejected, as is an attacker-signed call with a parent predecessor. The new native test exhausts the 3×3 owner/vault/attacker predecessor/signer matrix. No unauthorized initialization takeover path was found in the source. This is **source/native evidence, not a completed production-Wasm runtime proof**.

Repeated initialization is blocked by the SDK-generated `#[init]` wrapper in `src/contract.rs:24–25`, before the Rust constructor can replace state. The installed **near-sdk-macros 5.29.1** generator checks `ContractState::state_exists()` and panics if true (`src/core_impl/code_generator/impl_item_method_info.rs:207–211` in that dependency). There is no `ignore_state` attribute. The [official SDK initializer documentation](https://docs.rs/near-sdk/latest/near_sdk/attr.near.html) describes this guard; the local pinned generator was also inspected directly.

FullAccess key holders remain a separate custody risk: the vault key can replace code, and a compromised parent-owner key satisfies owner authorization. This repair does not claim protection from those custodians, add keys, relax authorization, or add an owner-recovery method. The uninitialized window is kept short by awaiting finalized deployment and code verification before the authorized owner call.

## Proposed sequence — ten new transactions only

O = `ml-demo-20261031.testnet`; V = `vault.ml-demo-20261031.testnet`; A = `agent.ml-demo-20261031.testnet`; R = `merchant.ml-demo-20261031.testnet`; X = `attacker.ml-demo-20261031.testnet`. K0–K2 and all operator keys remain exactly those in `testnet/config.continuation.json`.

Transactions 1–4 and failed transaction 5 are immutable historical execution. **Never repeat account creation or resubmit the failed combined transaction.** 5A/5B below are a new, separately gated proposal. Including historical execution, there would be 15 submitted transactions, not a rewritten 13-transaction history.

| Label | Signer/key → receiver | Exact operation | Attached deposit NEAR | Gas | Fee bound NEAR | Required result |
|---|---|---|---:|---|---:|---|
| 5A | V/vault FullAccess → V | DeployContract: frozen Wasm only | 0 | Native action, no function gas | 0.0037 | FINAL success; code hash matches; STATE absent |
| 5B | O/owner FullAccess → V | `new({owner_id:O})` | 0 | 100 Tgas | 0.0203 | FINAL success; owner O; zero principal/budget; adequate backing |
| 6 | A/admin FullAccess → A | Add K0/K1/K2 FunctionCall keys: receiver V; only `execute_payment`; allowance 0.1 each | 0 | Native actions | 0.0002 | Exact three restricted keys; agent never receives vault FullAccess key |
| 7 | O/owner → V | `fund({})` | 1 | 100 Tgas | 0.0203 | Unallocated principal 1 |
| 8 | O/owner → V | `create_mandate`: agent A, K0–K2, recipients [R], budget 1, ceiling 0.4, expiry below | 0 | 100 Tgas | 0.0203 | Mandate 1; available 1 / pending 0 / spent 0 |
| 9 | A/K0 → V | `execute_payment`: mandate `"1"`, nonce 0, R, amount 0.1 | 0 | 100 Tgas | 0.0203 | Payout and successful callback; spent 0.1 |
| 10 | A/K0 → V | `execute_payment`: mandate `"1"`, nonce 1, X, amount 0.1 | 0 | 100 Tgas | 0.0203 | ERR_RECIPIENT; no unauthorized payout |
| 11 | A/K0 → V | `execute_payment`: mandate `"1"`, nonce 2, R, amount 0.4 | 0 | 100 Tgas | 0.0203 | Independent budget competitor |
| 12 | A/K1 → V | `execute_payment`: mandate `"1"`, nonce 3, R, amount 0.4 | 0 | 100 Tgas | 0.0203 | Independent budget competitor |
| 13 | A/K2 → V | `execute_payment`: mandate `"1"`, nonce 4, R, amount 0.4 | 0 | 100 Tgas | 0.0203 | Independent budget competitor |

Exactly two of 11–13 must pay and settle; one must reach V and fail ERR_BUDGET. Expected final available 0.1 / pending 0 / spent 0.9; merchant gain 0.9, attacker gain zero. Nonce conflicts are not budget enforcement. No same-block concurrency claim without receipt evidence. Unauthorized and repeated **initialization** attempts are sandbox tests only and are not extra public-testnet transactions in this proposal.

Machine-readable exact actions: `artifacts/phase4-initialization-repair/exact-plan.json` and [`testnet/approval.initialization-repair.json`](../testnet/approval.initialization-repair.json). New plan SHA-256: **`ca065b31cc8bb9f42044e470aa0cd7cd38cef8118424b689d75c910853888493`**. The proposal is **approved=false, execution_ready=false**. It is deliberately not accepted by the old execution entry points; do not edit an old permit to bypass the sandbox gate. A reviewed execution entry point must consume the corrected plan and preserve all five historical journals before any future approval is exercised.

## Fresh finalized reconciliation and funding

Read-only FastNEAR audit completed **2026-11-01T00:44:23.321Z**, finalized block **275675683**, hash `H2yr95zxYwdNp6SU3S49K4FgEEdNuvwDHPPDr6JF65a`, timestamp `1793493858943919947` ns. All five historical hashes, actions, outcomes and receipts matched the saved FINAL records. Four account creations remain successful; transaction 5 remains a finalized initialization failure.

| Account | Finalized balance NEAR | State |
|---|---:|---|
| O | 4.77154004185 | Reviewed owner FullAccess key, nonce unchanged |
| V | 3.9986705035675164 | Reviewed vault FullAccess key, no code |
| A | 1 | Reviewed operator-held administrator key; no restricted keys yet |
| R | 0.1 | Reviewed recipient key |
| X | 0.1 | Reviewed attacker key; **already exists** |

All five have empty code hash, locked zero and storage usage 182 bytes. Key lists and nonces are unchanged from the stopped run. No account must be recreated. Combined balance is **9.9702105454175164 NEAR**.

Current protocol remains version **88**, gas price **100000000 yoctoNEAR/gas**, storage price **10000000000000000000 yoctoNEAR/byte**, creation charge **0.007 NEAR**, and unchanged reviewed action-fee digest. The new remaining plan contains **zero account creations**, so it incurs no additional creation charges. All historical creation charges and failed-deployment fees remain in incurred spending.

| Budget component | NEAR |
|---|---:|
| Actual aggregate already incurred | 5.2297894545824836 |
| Remaining attached deposits (`fund`) | 1 |
| All requested payouts, including two expected rejections | 1.4 |
| Remaining conservative fees | 0.1663 |
| **Remaining envelope** | **2.5663** |
| **Maximum aggregate outgoing** | **7.7960894545824836** |
| **Headroom below unchanged 8 NEAR cap** | **0.2039105454175164** |

5A + 5B fee bound is **0.0240**, versus **0.0239** for one combined transaction: the added transaction increases the projected remaining fee bound by **0.0001 NEAR**. The actual **0.0013294964324836 NEAR** already burned by the failed combined transaction is separately retained in incurred spending. Current gas/action costs are priced by the shared `priceCalls` function; existing 13-call forecasts remain unchanged and their regressions pass.

Signer reserves after all remaining maximum fees:

- Owner: 4.77154004185 − 1 deposit − 0.0609 fees = **3.71064004185 NEAR**. Retain 2 NEAR plus conservative 4096-byte storage reserve **0.04096**; excess above these reserves is **1.66968004185**.
- Vault before principal funding: 3.9986705035675164 − 0.0037 deployment fee = **3.9949705035675164**. Conservative 256000-byte storage plus operating floor is **2.57**. Owner pays initialization gas. With later +1 principal and −0.9 expected payouts, expected minimum final vault balance is **4.0949705035675164**, exceeding 2.57 + 0.1 remaining available budget.
- Agent: 1 − 0.1017 fees = **0.8983**, above **0.04096** conservative storage reserve. K0's three 0.0203 fee bounds total 0.0609, below its 0.1 allowance; each other key uses at most 0.0203.
- Each existing account's current 182-byte storage requirement is **0.00182**, already covered by its balance. The deployed/initialized storage usage must still be measured by sandbox and finalized runtime snapshots; 2.57 is a conservative bound, not a claim of observed deployed storage.

No transfer amounts, mandate limits, public keys, requested payment amounts or gas allocations were silently changed. Only the deployment/initialization action grouping and initialization signer changed.

## Test evidence and unresolved runtime gate

**145 local regression tests PASS, 0 regression failures:** 82 Node tests, 44 original native contract tests, 8 existing native security tests, 4 new native initialization tests, and 7 existing harness tests. Existing Phase 2A/2B source and evidence and Phase 3 demo tests remain intact. No historical sandbox result is relabelled as new execution.

New production-equivalent test: [`integration-tests/tests/initialization_repair.rs`](../integration-tests/tests/initialization_repair.rs). It uses **near-workspaces 0.23.0**, the exact frozen production Wasm, separate existing-vault deployment and parent-owner initialization, a vault starting balance matching the public-testnet balance, direct actor transactions and finalized receipts. It preserves account balances, full state, code hash, transaction gas, receipts and failed assertions. Unauthorized calls must fail with ERR_INITIAL_OWNER and leave state unchanged; parent initialization must produce the correct owner, zero accounting and backing; repeated initialization must fail through the SDK state guard and preserve state.

| New real-sandbox scenario | Result |
|---|---|
| Vault-signed deploy-only with exact frozen Wasm | UNVERIFIED |
| Attacker initializes while claiming real parent | UNVERIFIED |
| Attacker initializes while claiming themselves | UNVERIFIED |
| Vault tries self-initialization | UNVERIFIED |
| Separate direct parent-owner initialization | UNVERIFIED |
| Repeated parent initialization rejected with unchanged state | UNVERIFIED |

The test **compiled successfully**, but running it on this Windows host exited **101** with `UNVERIFIED: native Windows sandbox unsupported; no download or startup attempted`. Rust reports the enclosing integration test as FAILED because the required runtime is unavailable; none of its six chain scenarios executed, and this is not a demonstrated contract-test failure. There is no installed sandbox command on PATH. The pinned near-workspaces 0.23.0 README lists Linux/macOS sandbox support. Prior instructions prohibit further Docker/WSL attempts; no such attempts were made. No new software or remote workflow was installed/run.

Formatting, frozen-artifact checks and Clippy for the new sandbox target passed. The source/native tests support the authority analysis, but **do not satisfy the requested production-equivalent runtime validation**. Public execution remains blocked until that evidence exists.

## Local reproduction and next approval boundary

Windows offline checks (use the installed Cargo path if absent from PATH):

```powershell
node --test demo/test/*.test.mjs testnet/test/*.test.mjs
cargo test --locked --offline
cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline
cargo test --manifest-path integration-tests/Cargo.toml --test initialization_repair --no-run --locked --offline
cargo clippy --manifest-path integration-tests/Cargo.toml --test initialization_repair --locked --offline -- -D warnings
node testnet/verify-frozen.mjs
node testnet/review-initialization-repair.mjs # read-only testnet queries, rewrites disabled proposal
```

On an already provisioned, authorized Linux host with the pinned dependencies and sandbox binary, from the project root:

```bash
export NEAR_SANDBOX_BIN_PATH=/absolute/path/to/approved/near-sandbox
bash scripts/validate-initialization-repair.sh
```

The runner does not install dependencies, download software, use real account credentials or contact public testnet. It checks the frozen Wasm hash, runs the new local sandbox test, and requires all six FINAL cases to pass. The mandatory artifact is `artifacts/phase2b-closure-run/evidence/phase2a/mandatelock.wasm`; do not substitute a diagnostic or differently built binary. Preserve `artifacts/phase4-initialization-repair/sandbox/` even if the command fails. A remote CI fallback would need separate authorization and is not activated here.

Frozen production SHA-256 remains **`3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`**, 159542 bytes. Both frozen artifacts and all 16 baseline source/test/workflow files passed unchanged verification. New tests are additive. Private keys remain outside the repository; existing offline SDK tests use synthetic ephemeral credentials, never real broadcast signatures.

Original cutoffs remain **November 1, 2026: start before 14:30 UTC, submit before 14:50 UTC, FINAL before 15:00 UTC**. Mandate expiry remains **16:00 UTC**, `1793548800000000000` ns. The read-only check left roughly 13 hours 46 minutes before the start cutoff. Availability of time does not waive the sandbox gate. If validation/approval cannot complete in time, stop and request a new timing/expiry plan; do not silently extend it.

**Approval package status: HOLD / NO-GO for public execution.** Next required work is a supported production-Wasm sandbox validation run, followed by review of its receipts and the corrected execution adapter, refreshed balances/fees/keys/deadlines, and separate explicit approval for the ten new transactions. No public testnet signing or submission is authorized by this document.

Retained FullAccess custody, same-user Windows isolation limits, stranded reservations after uncertain callbacks and unverified intra-block solvency remain. No production custody sign-off is given.
