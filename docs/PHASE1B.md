# MandateLock — Phase 1B implementation evidence

Date: October 30, 2026 (America/New_York). **Local implementation complete; conditional GO for Phase 2 hardening. No deployment or live-chain claim.**

## A. Implemented files and methods

| File | Responsibility |
| --- | --- |
| `src/model.rs` | Actual production state machine: owner/agent checks, bounded policy, nonce consumption, atomic reservation, settlement, accounting and storage-floor arithmetic |
| `src/contract.rs` | near-sdk 5.29.1 runtime adapter, exported methods, native transfer promise, private runtime-result callback, JSON events/views, storage and liquidity guards |
| `src/tests.rs` | 44 native Rust unit tests calling the same model used by the Wasm adapter |
| `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml` | Standalone contract crate and pinned dependency/compiler selections |
| `scripts/verify-wasm.mjs` | Static Wasm header, module, export surface, import namespace and SHA-256 validation; never instantiates a runtime |

One immutable owner, one agent account, one active mandate, at most eight distinct named recipients, at most three approved Ed25519 keys for that agent account, and 64 payment slots per mandate. Native NEAR only. No frontend, token integrations, arbitrary calls, withdrawal, upgrade, key-management or manual-reconciliation endpoint.

Only the following twelve methods are exported for application use (plus SDK `contract_source_metadata`):

| Method | Parameters / behavior | Authority |
| --- | --- | --- |
| `new` | `owner_id`; initialize once; deployment funds remain reserve, not payment principal | Direct owner signer/predecessor, also vault's immediate parent |
| `fund` | Positive attached NEAR credits unallocated principal; checks backing | Direct owner; only payable method |
| `create_mandate` | `agent_id`, `agent_keys`, `allowed_recipients`, `budget`, `per_transaction_limit`, `expires_at_ns`; allocate funded principal and preallocate slots | Direct owner; no existing mandate |
| `pause` / `resume` | Suspend / resume eligible mandate; cannot resume revoked/expired mandate | Direct owner |
| `revoke` | Irreversibly block new payments for current mandate | Direct owner |
| `retire_mandate` | Return available principal to unallocated; clear only revoked/expired and fully settled mandate | Direct owner |
| `execute_payment` | `mandate_id`, `nonce`, `recipient`, `amount`; reserve and schedule one transfer | Direct configured agent signer/predecessor and approved signing key |
| `on_payment_result` | `mandate_id`, `nonce`; use actual runtime result and stored amount | SDK `#[private]`, explicit vault predecessor, exactly one result |
| `get_policy` | Current immutable terms, owner/agent/keys/recipients and pause/revoke flags; null if none | Read-only |
| `get_accounting` | Owner, last ID, unallocated/available/pending/spent/budget, live floor and raw balance | Read-only |
| `get_payment` | `mandate_id`, `nonce`; stored request or null for unknown ID/index | Read-only |

Amounts, mandate IDs and nanosecond timestamps are decimal strings through U128/U64 and views. Nonce is a numeric slot 0–63, not a protocol transaction nonce. Invalid indices do not allocate storage. A nonce is consumed on acceptance and remains consumed after either terminal outcome. A new nonce is a new authorized attempt, not semantic invoice deduplication.

Initialization is deliberately narrower than the original sketch: e.g. `vault.owner.testnet` can only initialize with `owner.testnet` as owner, called directly by that owner. Parent extraction uses the first dot. This blocks a stranger claiming an uninitialized vault with its own supplied owner argument. SDK initialization protection also prevents reinitialization. Future deployment should still create/deploy/initialize atomically; no deployment procedure was executed here.

## B. Security properties and evidence boundaries

The following properties passed **native state-machine tests**, not a blockchain runtime proof:

| Property | Implementation and executable evidence |
| --- | --- |
| Authorized caller and immutable policy | Every model mutation checks authority; agent execution requires matching account, direct signer and key; owner methods reject agent/proxy identities |
| Recipient and transaction ceiling | Exact membership, positive amount, integer ceiling; unauthorized raw model requests and one-yocto boundaries tested |
| Committed budget | `A + P + S = B`, `P + S <= B`; sums of stored Pending/Succeeded amounts match counters; check and all arithmetic deltas precede mutation |
| Pending reservation | `reserve` consumes nonce and moves A to P before the adapter schedules transfer; two .40 reservations leave .20 and reject a third .40 |
| Expiration and revocation | Timestamp must be strictly before expiry at acceptance; revoked mandates never resume; earlier pending records still settle after revocation/expiry |
| Replay and duplicate settlement | Slots are never cleared after failure; only Pending can become terminal; repeated terminal settlement has no monetary delta or second terminal event path |
| Actual callback authority path | Adapter reads `promise_results_count` and `promise_result_checked(0, 0)`; no amount or success flag is an external callback parameter. Native tests validate private predecessor/result count and stored settlement, while genuine runtime result delivery remains untested |
| Missing callback | No timeout release, resend or owner override exists; pending amount prevents retirement and stays committed |
| Failed-transfer release | Model releases only stored pending amount once; available budget can be unusable until physical refund arrives; liquidity guard is independent of A |
| Checked boundaries | u128 maximum successful/failing settlement, addition/subtraction overflow/underflow, u64 mandate-ID exhaustion, invalid configuration and corrupted accounting tested |
| Bounded storage | Fixed 64-byte recipient fields and fixed payment slot count; Borsh size stays unchanged through accept/fail/settle, including a 64-character recipient |

The Wasm adapter is compiled and statically validated. Its NEAR wrapper behavior, emitted receipts, receipt-level rollback, event delivery and actual gas/storage charges have **not** been exercised in a sandbox. No runtime success is inferred from the unit-test Context or injected TransferOutcome values. Test names containing “confirmed” mean a confirmed outcome supplied to the model, not an observed live transfer.

The competing-request suite enumerates six submission orderings, two settlement orderings, and four success/failure combinations (48 traces). Another test supplies three approved keys sharing one ledger. These are sequential state-machine traces with unresolved reservations; they are **not real concurrent transaction submissions**. Phase 2 must submit independent-key transactions, verify all executor receipts were included and show pending overlap.

## C. Test and check results

Final result: **44 passed, 0 failed, 0 ignored.** Full named results: phase1b-tests.log (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).

- Format check passed.
- Native model/test Clippy with `-D warnings` passed: native log (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).
- Wasm adapter/model Clippy passed: Wasm log (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).
- Native Windows generated a nonfatal incremental-cache hard-link warning and copied files instead; this did not fail tests or lint.

The initial test run caught an immediate-parent parsing error, corrected before final verification; an intermediate strict lint run caught a boolean-style warning, also corrected. Final logs report the corrected sources. Storage-floor computation was reviewed to use prospective persisted size and tested for stability across a state commit.

Native tests intentionally use the shared deterministic model without the near-sdk host VM. `near-sdk` is a Wasm-target dependency; `borsh` and `near-account-id` are shared. This avoids treating a Windows host VM or SDK `unit-testing` dependency build as already validated. A separate implementation of accounting was not written for tests. The exported SDK wrappers still require Phase 2 compiled-Wasm integration tests.

## D. Compilation and artifact

Verified environment: Rust/Cargo 1.93.0, MSVC Windows x64, near-sdk 5.29.1, cargo-near 0.22.0, Node 24.19.0. Required crate sources were already cached; the initial native test command used offline resolution and created Cargo.lock. No additional system software was installed.

| Evidence | Final result |
| --- | --- |
| Actual contract artifact | `.\target\near\mandatelock.wasm` |
| Size | 160,477 bytes |
| Wasm SHA-256 | `eeded7009d4e56c460744ba7bdf17a52cc04a3d41fa1997903bf7622fb102bb3` |
| Cargo.lock SHA-256 | `2b94d41e4acf7c6b44c331f6e1281d3887c3edac6e6dfe33aca72af7382344fd` |
| Build | `cargo near build non-reproducible-wasm --no-abi --locked`, including wasm-opt; final incremental build 5 seconds |
| Compatibility | cargo-near accepted compiler 1.93.0 for SDK protocol minimum 84 |
| Static validation | Valid Wasm v1 header; Node module parser and WebAssembly.validate passed; twelve expected application functions, SDK metadata function, only `env` imports |

Evidence: build log (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), [artifact inspection JSON](phase1b-wasm.json). The artifact is the actual policy vault, separate from Phase 1A's constant-method smoke artifact. Static validation does not establish NEAR VM acceptance or payment correctness. The known Windows ABI limitation was not retried; no ABI is embedded.

## E. Async accounting, reserves and unresolved integration risks

Acceptance checks and updates the shared state synchronously, then the adapter creates one native Transfer promise followed by a callback. NEAR must commit the state update and promise construction together or roll back the parent receipt. The unit tests cannot establish that runtime guarantee for this compiled artifact.

Successful runtime result: P decreases and S increases by the stored amount. Failed runtime result: P decreases and A increases once. Failure does not issue another transfer to the agent or owner. Unexpected result count or nonempty successful Transfer return data fails closed. The callback is allocated 15 Tgas with zero unused-gas weight; entry requires at least 35 Tgas remaining before scheduling. These are initial conservative limits, not measured runtime sufficiency; Phase 2 must calibrate using compiled-Wasm outcomes. Insufficient callback gas leaves a reservation stuck rather than guessing a refund.

The floor is `(current storage usage - old STATE value length + prospective STATE length + 4096 bytes) * runtime storage byte cost + 0.01 NEAR`. The pinned SDK uses `STATE` as its state key. Code/account usage is retained; the prospective serialized size covers the slots created before SDK state persistence. The 4096-byte headroom also covers initial key/record overhead. The 0.01 NEAR is a chosen operating margin, not measured gas cost or an oracle quote. Runtime storage/receipt measurements remain required.

Initialization and configuration check physical backing; owner funding credits only explicitly attached principal. Execution protects the live floor, unallocated principal and the new outgoing amount; it does not subtract previously scheduled P a second time. Returned gas and unsolicited native transfers do not raise the mandate budget. An owner can top up reserve with a plain native transfer without crediting principal, but no such transaction was performed. Refund-before-callback ordering is not assumed.

Required Phase 2 evidence:

1. Actual native success, nonexistent named-recipient failure, refund arrival and callback outcomes; capture full receipt trees and final raw balance deltas separately from fees/rewards.
2. Exported initialization, U128/U64 decoding, zero-deposit restrictions, agent account/key checks, malicious proxy and private callback behavior through compiled Wasm.
3. Three independently submitted .40 requests: all reach the executor; exactly two accepted for fresh 1.00 budget; show pending overlap and distinguish access-key nonce failures from budget rejections.
4. Failure/missing-callback and refund-delay faults, duplicate settlement, parent-receipt rollback and measured callback gas/storage floors. Label instrumentation separately from production artifact evidence.
5. Linux unit/runtime and near-workspaces sandbox setup; Linux ABI generation if needed. No Actions workflow, repository or external test environment was provisioned here.

## F. Known security limitations

- Retained full-access vault keys can transfer funds, redeploy or delete the account outside contract rules. The implementation cannot constrain those protocol actions. Any later retained-key demonstration must disclose this; key removal requires separate review/authorization and is irreversible here.
- Missing/failed callbacks can strand committed budget even if funds were delivered. There is deliberately no timeout release or unverified manual recovery.
- Revocation/expiry blocks new acceptance; previously scheduled payments can complete later. No cancellation promise is made.
- No owner withdrawal, upgrade, owner rotation or recovery endpoint. Unused funds remain in the vault; loss of the owner key can strand administration. Do not fund this prototype beyond explicitly approved synthetic development amounts.
- A compromised authorized agent can spend the entire granted budget on approved recipients and consume all 64 request slots. New nonces are new attempts; semantic invoice replay, recipient collusion and onward transfers are outside these controls.
- No deployed keys were inspected or modified because there is no deployment. Restricting an agent's actual function-call key remains a future setup and integration-test task.
- This is not audited, formally verified, sandbox-tested or suitable for production custody. No runtime security property is claimed solely from static Wasm validation.

## G. Reproduction commands and remaining blockers

From `.` in PowerShell, using the installed Phase 1A toolchain:

```powershell
$rustBin = Join-Path $env:USERPROFILE '.cargo\bin'
$env:Path = $rustBin + [IO.Path]::PathSeparator + $env:Path
cargo fmt --all -- --check
cargo test --lib --locked --offline
cargo clippy --all-targets --locked --offline -- -D warnings
cargo near check --clippy --locked
cargo near build non-reproducible-wasm --no-abi --locked
node scripts/verify-wasm.mjs
```

All commands above were executed successfully. Each command must exit 0 before proceeding; PowerShell does not stop on native errors automatically. On a new machine without the cached dependencies, omit `--offline` on the first test command to permit Cargo downloads, retaining `--locked`. This is crate restoration, not a new system dependency requirement.

Implementation commands also executed: `cargo fmt --all` after edits; initial `cargo test --lib --offline` to generate the lockfile; repeated test/lint/build commands after corrections. Final captured checks used `2>&1 | Tee-Object -FilePath docs/<log-name>` followed by explicit `$LASTEXITCODE` propagation. All initial/final build commands used `--no-abi`; no ABI troubleshooting was repeated. `Get-FileHash -LiteralPath Cargo.lock -Algorithm SHA256` verified the lock hash.

What prevents a credible testnet demonstration today: no Linux sandbox/runtime integration proof, no independent transaction concurrency evidence, no measured callback/storage/refund behavior, and no approval for testnet accounts/funding/deployment/signing. Phase 1B added no external repository action, system installation, frontend or other-project change.

## H. Recommendation

**GO for Phase 2 local/security hardening after explicit approval.** The core state machine has executable evidence, the actual contract compiles, and the artifact exposes the intended restricted API. **NO-GO for a testnet demonstration or custody-security claim until the compiled-Wasm integration gates above pass and external actions are authorized.**

Official references consulted: [private callbacks](https://docs.near.org/smart-contracts/security/cross-contract-calls/callbacks), [unit-test limits](https://docs.near.org/smart-contracts/testing/unit-test), and [asynchronous calls](https://docs.near.org/smart-contracts/anatomy/crosscontract). These support the implementation/testing boundary; they do not audit this contract.

Stopped after Phase 1B. No frontend or deployment work was started.
