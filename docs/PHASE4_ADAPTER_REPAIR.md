# Phase 4 adapter repair — implementation complete locally

**GO for local adapter validation; public execution awaits explicit approval and fresh preflight.** No public transaction, funding, deployment, push or CI dispatch occurred. Production source and frozen Wasm remain unchanged.

## Corrected execution

Both deploy.mjs and run.mjs now invoke execution-cli.mjs / execution.mjs. The CLI rejects all account-creation operations and the historical combined deploy-init operation.

5A selects the vault key and deploys frozen Wasm to itself. 5B selects the parent owner key and directly calls new(owner_id=owner), with zero deposit and 100 Tgas. The actual owner-to-vault receipt must match signer, predecessor, public key and actions. Deployment code is independently retrieved and hash-checked; initialized owner, accounting, policy and key permissions are verified with reads pinned at/after receipt blocks.

All five historical FINAL outcomes are reconciled: four successful creations plus failed transaction 5. New journals begin at deploy-only. Every step requires preceding verified repair journals, including transaction 10 before concurrency. Durable exclusive claims prevent retries after interruption or uncertainty. Read-only reconciliation never resubmits or releases pending reservations.

Returned hash, signer, receiver, public key, nonce, actions, deposits, gas and receipt completeness are checked. Self-account native actions may execute in the transaction outcome; cross-account initialization requires its direct receipt. DeployContract outcome data may be a 32-byte code hash rather than full bytes; both representations are checked against the frozen hash, followed by downloaded-code verification.

Before each operation, balances, storage, code and keys must match the initial reviewed snapshot or last verified post-state. Actual fees and conservatively counted requested payouts are reconciled with the remaining priced plan. Signer reserves, restricted key allowances, protocol parameters and deadlines remain enforced.

## Tests and evidence

**160 local checks PASS:** 97 Node tests, 44 original native tests, eight existing security tests, four initialization authority tests and seven harness tests. Historical negative audit tests were replaced by positive corrected-runner regressions, explaining the changed total. Existing functional tests remain passing.

The complete mocked engine sequence executes five setup transactions and five agent transactions, exactly once each. Tests reject historical/repeated operations, skipped setup/rejection dependencies, altered permits, wrong keys/actions, missing receipts and uncertain outcomes. Real private keys are not read; offline SDK tests use ephemeral keys and invalid block hashes.

Formatting, root/integration Clippy with -D warnings, and all integration compilation targets passed. Compiler warnings concerned only incremental-cache hard-link fallback. Logs and file hashes: artifacts/phase4-adapter-repair/.

Commands executed:

```powershell
node --test demo/test/*.test.mjs testnet/test/*.test.mjs
cargo fmt --all -- --check
cargo fmt --manifest-path integration-tests/Cargo.toml --all -- --check
cargo test --locked --offline
cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline
cargo clippy --locked --offline --all-targets -- -D warnings
cargo clippy --manifest-path integration-tests/Cargo.toml --locked --offline --all-targets -- -D warnings
cargo test --manifest-path integration-tests/Cargo.toml --locked --offline --no-run
node testnet/verify-frozen.mjs
```

The installed Cargo executable was invoked by absolute path where necessary. Localhost permission was required for existing UI tests. No dependency installation or Linux runtime rerun occurred.

## Match to six production-Wasm sandbox scenarios

| Existing runtime scenario | Result | Adapter mapping |
|---|---|---|
| Vault deploy-only | PASS | Frozen deploy only; actual saved receipt accepted by new validator |
| Attacker claims parent | PASS: rejected | Fixed configuration and parent signer requirement |
| Attacker claims self | PASS: rejected | Fixed parent owner argument |
| Vault initializes | PASS: rejected | 5B exclusively selects owner key; combined route rejected |
| Parent initializes | PASS | Actual saved signer/predecessor receipt accepted; zero deposit, 100 Tgas |
| Repeat initialization | PASS: rejected | Empty-state precondition and exclusive operation claim; runtime failure stops |

These are preserved results from the prior authorized Linux run, not newly executed public tests. New adapter sequence evidence is explicitly mocked. Frozen production SHA-256 remains 3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87 (159542 bytes). Both artifacts and all 16 frozen baseline files passed unchanged verification.

## Disabled continuation approval package

[testnet/approval.split.json](../testnet/approval.split.json) binds exact configuration, ten-action plan, five historical hashes, initial state snapshot, SDK lock, sandbox evidence, Wasm, deadlines and maximum costs. approved=false and execution_ready=false.

O = ml-demo-20261031.testnet; V = vault.O; A = agent.O; R = merchant.O; X = attacker.O. Full account IDs/public keys/actions are in the package. All function calls use 100 Tgas; only fund attaches a deposit. Native deployment/key actions have no function-call gas allocation.

| Label | Signer → receiver | Operation | Deposit/requested payout NEAR | Max fee NEAR | Expected result |
|---|---|---|---:|---:|---|
| 5A | V → V | Frozen deploy only | 0 | 0.0037 | Exact code; empty STATE |
| 5B | O → V | new(owner_id=O) | 0 | 0.0203 | Owner identities; zero accounting |
| 6 | A/admin → A | Install three restricted keys | 0 | 0.0002 | V/execute_payment only; allowance 0.1 each |
| 7 | O → V | fund | 1 attached | 0.0203 | Unallocated principal 1 |
| 8 | O → V | create_mandate: A, three keys, [R], budget 1, ceiling 0.4 | 0 | 0.0203 | Mandate 1; available 1 |
| 9 | A/K0 → V | payment nonce 0, R, 0.1 | 0.1 requested | 0.0203 | Paid and callback settled |
| 10 | A/K0 → V | payment nonce 1, X, 0.1 | 0.1 requested | 0.0203 | ERR_RECIPIENT; no payout |
| 11 | A/K0 → V | payment nonce 2, R, 0.4 | 0.4 requested | 0.0203 | Independent competitor |
| 12 | A/K1 → V | payment nonce 3, R, 0.4 | 0.4 requested | 0.0203 | Independent competitor |
| 13 | A/K2 → V | payment nonce 4, R, 0.4 | 0.4 requested | 0.0203 | Independent competitor |

Exactly two competitors must settle; one must reach the contract and fail ERR_BUDGET. Final available/pending/spent = 0.1/0/0.9; merchant gain 0.9; attacker gain zero. No same-block claim or nonce-conflict substitution.

Historical outgoing 5.2297894545824836 + remaining deposit 1 + all requested payouts 1.4 + remaining fee allowance 0.1663 = **7.7960894545824836 NEAR**, leaving **0.2039105454175164** below 8. Split fees total 0.0240; failed-5 fees remain included. No new creation or faucet request.

Last reconciled balances: owner 4.77154004185, vault 3.9986705035675164, agent 1, merchant 0.1, attacker 0.1. No live RPC reads were made during this local-only repair. Fresh preflight must confirm unchanged state. Conservative projected reserves: owner 3.71064004185, vault before principal funding 3.9949705035675164, agent 0.8983; vault storage/operating allowance 2.57.

## Commands after separate approval only

Run deploy.mjs once each for deploy-only, initialize-owner, install-agent-keys, fund, mandate, then run.mjs for authorized, direct-rejection, concurrency. Matching operator/restricted credentials stay outside repository and browser.

```text
node testnet/deploy.mjs <step> testnet/config.continuation.json testnet/approval.split.json <operator-key-file>
node testnet/run.mjs authorized testnet/config.continuation.json testnet/approval.split.json <K0-file>
node testnet/run.mjs direct-rejection testnet/config.continuation.json testnet/approval.split.json <K0-file>
node testnet/run.mjs concurrency testnet/config.continuation.json testnet/approval.split.json <K0-file> <K1-file> <K2-file>
```

These commands currently stop at disabled approval. On any mismatched state, failure, uncertainty, stale block, reserve/cap breach or deadline, stop. Never delete a claim to retry. Reconcile existing hashes read-only.

Original November 1 cutoffs remain start before 14:30 UTC, submissions before 14:50 UTC, FINAL before 15:00 UTC; mandate expiry 16:00 UTC / 1793548800000000000 ns. The window was open at the local check around 01:31 UTC, but must be rechecked at execution. No silent extension.

**Approval requested:** exactly ten new testnet transactions above, once each, within the original 8 NEAR cap and subject to unchanged finalized preconditions. No public execution until explicit approval. Retained FullAccess custody, same-user key isolation, stranded uncertain reservations and unverified intra-block solvency remain; no production custody sign-off.
