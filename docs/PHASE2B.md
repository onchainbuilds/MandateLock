# MandateLock Phase 2B — local security review and test preparation

October 31, 2026. **Local review and implementation complete; runtime validation pending. GO for a separately approved private Linux sandbox run. NO-GO for Phase 2B security sign-off, public deployment or production custody.** No production contract defect was demonstrated, so production code and the original 44 native tests are unchanged. No remote was changed, code uploaded, workflow dispatched, account created or public-network transaction submitted in this phase.

## Repository and evidence provenance

Chrome's authenticated user menu identified `onchainbuilds`; the repository page identified owner `onchainbuilds`, name `MandateLock`, visibility **Private**, and the empty-repository quick setup. Official destination: https://github.com/onchainbuilds/MandateLock. Verification was read-only. Git CLI credentials previously identified the old account; they are **not approved for uploads** and must independently verify as onchainbuilds before any future Git network action. A CLI 404 using the old identity was not evidence that the new private repository was absent.

The workspace root has no `.git`. The isolated `.phase2a-publish` checkout is clean at `a539ef3b4a243afb7376067b40b052645d5f1111`, with parent `aafa39088174acee179dfc17647e0202b3ee4879`. Its old remote remains untouched. Preserve both commits with a local Git bundle; build the future migration from that history and overlay the reviewed package. Never force-push or overwrite new/unrelated remote content. Old repository links in historical reports identify previous evidence only.

Historical authoritative run: [41198135753](https://github.com/shadehook/MandateLock/actions/runs/41198135753), completed successfully at the first SHA above. All twelve required scenarios PASS, 44 native tests PASS, four harness tests PASS. Linux Wasm SHA-256 `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`. The full downloaded evidence remains under `artifacts/phase2a-corrected/`; migration includes selected raw transactions, callback results and balance snapshots, plus a hash manifest of the complete local archive. No new Phase 2B sandbox results are implied by that historical run.

## Findings and decisions

| ID / severity | Finding and evidence | Decision |
| --- | --- | --- |
| B1 High — confirmed availability limitation; runtime fault reproduction pending | `src/model.rs:302` refuses retirement with pending reservations. `src/model.rs:378` releases them only on an authenticated result. A lost/failed callback can strand P forever, even after expiry/revocation. Eight new model tests include delayed settlement, absent results, mixed duplicate outcomes and refund ordering. [Callbacks can fail](https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-failures). | Retain fail-closed behavior. Never infer failure from age or a balance increase. No timeout release, resend, manual success flag or owner override added. A future recovery design would require independently verifiable receipt evidence and separate review. |
| B2 Low — defense verified in model; runtime duplicate test unexecuted | `src/model.rs:398` returns Duplicate for either terminal status before changing balances. Mandate ID prevents a delayed old result targeting a reused nonce. `src/contract.rs:126` checks private predecessor and exactly one genuine promise result. Opposite-result duplicates leave the complete state unchanged. [Private callbacks](https://docs.near.org/smart-contracts/security/cross-contract-calls/callbacks). | Add a labeled test-only artifact that schedules additional real transfer results into the unchanged callback. This is deliberate injection, not proof that the network naturally redelivers receipts. No production retry endpoint. |
| B3 Medium — unverified intermediate runtime solvency; model liquidity protection passes | `src/model.rs:366` checks physical balance >= floor + U + outgoing amount. Failed settlement can restore A before a refund arrives; a temporarily illiquid A does not establish a lost asset. New tests exercise both refund/callback orders at the protected floor. Prior 46 final snapshots are backed, but do not prove every intervening receipt. [Refunds](https://docs.near.org/smart-contracts/security/cross-contract-calls/refunds); [NEP-616 refund ordering](https://github.com/near/NEPs/blob/master/neps/nep-0616.md). | Preserve independent physical guard. Prepared runner queries balance/accounting at each distinct receipt block, records floor + U + A and checks protected floor + U. Same-block receipt ordering and exact in-flight refund assets remain UNVERIFIED; block-end samples cannot close that gate. |
| B4 Medium — unverified maximum-state runtime gas/failure behavior | `src/contract.rs:8` allocates 15 Tgas with unused gas weight zero at line 121. Original nine callbacks used 2.380352400690–2.416230832134 Tgas. Fixed 64 slots bound scans/serialization, but observed typical gas is not a universal upper bound. [Callback failure](https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-failures), [expected failures must settle normally](https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-panics). | Prepared actual-Wasm case uses three keys, eight 64-character named recipients, all 64 slots, both transfer outcomes, gas and storage checks. Require measured callback gas below 10 Tgas, leaving >5 Tgas margin. A separate 1-Tgas artifact injects callback failure; it does not demonstrate that the production 15-Tgas allocation is insufficient. |
| B5 High — confirmed custody trust boundary | A retained vault full-access key can sign protocol Transfer/DeleteAccount/DeployContract actions, bypassing `execute_payment` entirely. The Phase 2A fixture explicitly retains one. Owner identity checks (`src/model.rs:187`) also allow owner-account function-call keys delegated administrative methods. [Official access keys](https://docs.near.org/protocol/accounts-contracts/access-keys). | Added an actual-production-Wasm sandbox test demonstrating an out-of-policy protocol Transfer with the trusted fixture key. Runtime test still unexecuted. Restrict agent credentials to the separate agent account; never give it owner/vault keys. Do not remove the last vault key casually: no recovery/upgrade/withdrawal endpoint exists. A later key-removal or multisig custody policy needs explicit approval and review. |

No Critical finding or confirmed new contract accounting/authorization defect was reproduced. These findings do not establish recovery, production solvency or custody guarantees. Gas griefing within authorized slots, allowed-recipient dishonesty, administrative key compromise, retained reserve funds, and dependency/runtime trust remain limitations.

Solvency accounting must distinguish cash at the vault from outgoing principal and in-flight refunds. P is committed budget, not necessarily cash still in the vault: an outgoing transfer may already have debited it, or a recipient may already be paid while settlement is delayed. Do not subtract P twice from liquidity, and do not call a refund receivable liquid before it arrives. Full intermediate conservation needs receipt-linked assets and liabilities; the block-end probes only measure their stated subset.

## Local changes and checks

- Added `tests/phase2b_model.rs`: eight focused tests against the actual production state machine; original `src/tests.rs` remains byte-identical.
- Added `integration-tests/tests/support/phase2b.rs`: opt-in, ignored-by-default Linux suite, imported by the existing harness without altering its twelve scenario implementations. Four cases cover actual production maximum-state gas/balances, actual production full-access custody, diagnostic duplicate settlement, and diagnostic callback out-of-gas. The last case covers both a paid recipient with P stranded through expiry/revoke/retire, and a genuinely failed/refunded transfer whose failed callback still leaves P reserved.
- Added `scripts/prepare-phase2b-fixtures.mjs`: generates two source copies under ignored `target/`, checks exact edit anchors and records original/variant source hashes. Lowgas changes only 15 to 1 Tgas. Duplicate adds one private helper emitting one-yocto native transfers and forwarding results into the unchanged callback. Neither artifact is a deployable production deliverable.
- Added manual-only `.github/workflows/phase2b-security.yml`, using Ubuntu 24.04, Rust 1.93.0, SDK 5.29.1, cargo-near 0.22.0, near-workspaces 0.23.0 and sandbox 2.13.4. It first reruns the original twelve scenarios, then the additional four cases. Both workflows now require the official repository name **and** private visibility. No secrets or public network are required; only loopback sandbox RPC is used. Always-upload artifacts retain logs, raw RPC/receipts, assertions, balances and labeled binaries on failure. Workflows have not been run.
- Broadened local artifact/secret exclusions and updated README for the official repository. Historic reports remain preserved; only upload copies redact local paths.

| Executed locally | Result |
| --- | --- |
| Original native suite | PASS 44/44 |
| New Phase 2B native transitions | PASS 8/8 |
| Original harness regressions | PASS 4/4 |
| Root + integration rustfmt | PASS |
| Root + integration Clippy, `-D warnings` | PASS |
| Wasm adapter Clippy | PASS |
| Production Wasm build and export validation | PASS; 160,477 bytes, SHA-256 `eeded7009d4e56c460744ba7bdf17a52cc04a3d41fa1997903bf7622fb102bb3`, unchanged Windows artifact |
| Two diagnostic Wasm builds | PASS; build evidence only, not sandbox execution |
| Expanded integration test binary (`--no-run`) | PASS; compiled and linked on Windows |
| New sandbox cases | UNVERIFIED 4/4; not executed pending approval |
| Original twelve sandbox cases | Preserved historical PASS 12/12; not rerun in this phase |

Local logs are in `artifacts/phase2b-local/`. The initial native/integration commands emitted the known nonfatal incremental-cache hard-link warning. There were no test failures or production fixes. Windows and Linux optimized Wasm hashes differ; compare artifacts within their recorded build environments. No Linux compatibility or fault result is inferred from Windows compilation.

## Reproduction and outstanding gates

Executed from the workspace using the already-installed tools (Cargo bin prepended to the process PATH):

```text
cargo fmt --all
cargo fmt --manifest-path integration-tests/Cargo.toml --all
cargo test --locked --offline
cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline
cargo clippy --manifest-path integration-tests/Cargo.toml --all-targets --locked --offline -- -D warnings
cargo test --manifest-path integration-tests/Cargo.toml --test sandbox --no-run --locked --offline
cargo fmt --all -- --check
cargo fmt --manifest-path integration-tests/Cargo.toml --all -- --check
cargo clippy --all-targets --locked --offline -- -D warnings
cargo near check --clippy --locked
cargo near build non-reproducible-wasm --no-abi --locked
node scripts/verify-wasm.mjs
node scripts/prepare-phase2b-fixtures.mjs
cargo build --manifest-path target/phase2b-fixtures/lowgas/Cargo.toml --target wasm32-unknown-unknown --release --locked --offline --target-dir target/phase2b-lowgas-build
cargo build --manifest-path target/phase2b-fixtures/duplicate/Cargo.toml --target wasm32-unknown-unknown --release --locked --offline --target-dir target/phase2b-duplicate-build
```

The prepared workflow is the reproducible Linux command sequence. To run the extra suite there, set `MANDATELOCK_WASM` to the production build, `MANDATELOCK_LOWGAS_WASM` and `MANDATELOCK_DUPLICATE_WASM` to their labeled builds, and `MANDATELOCK_EVIDENCE_DIR` to a fresh Phase 2B directory; execute:

```text
cargo test --manifest-path integration-tests/Cargo.toml --features sandbox-install --locked --test sandbox phase2b_security_gaps -- --ignored --nocapture
```

Required before security sign-off: approved Linux execution and evidence review; robust interpretation of intra-block account/refund changes or node-level receipt instrumentation; deliberate recovery/custody decisions. The prepared fault tests intentionally cannot prove missing delivery in an unmodified runtime, all possible callback gas paths, or solvency at every intra-block boundary. Those gaps must remain explicit even if all four new cases pass. No public testnet or frontend work is authorized.
