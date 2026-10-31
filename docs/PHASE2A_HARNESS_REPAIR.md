# Phase 2A harness repair — local approval package

**Execution update:** The six-file correction was subsequently approved and pushed
as `a539ef3b4a243afb7376067b40b052645d5f1111`. The single corrected
[workflow run](https://github.com/shadehook/MandateLock/actions/runs/41198135753)
succeeded: 12/12 sandbox scenarios, 44/44 native tests and 4/4 harness regressions.
See [PHASE2A.md](PHASE2A.md) for actual receipts, balances, expiry timestamps,
independent concurrency evidence and unresolved security gates. The following
approval package is preserved as historical preparation; its pending-run wording
describes the state before that approval.

The corrected harness is prepared locally. No GitHub API, push, workflow dispatch,
Docker/WSL operation, public-chain transaction or token expenditure was performed
during this repair. Production contract code is unchanged. Another private push
and one manual workflow run require explicit approval.

## Root cause and limits of the original evidence

Run `41197070066`, commit `aafa39088174acee179dfc17647e0202b3ee4879`, produced
eleven exact `mandate` errors at `state.mandate.as_ref().context("mandate")`.
This means Borsh decoding succeeded but the selected state's mandate was None;
it was not a missing STATE entry or an account-balance assertion.

The pinned workspaces 0.23.0 client implements `.transact()` using
`broadcast_tx_commit`. That call returns at optimistic execution. The old setup
discarded the successful `create_mandate` transaction outcome and immediately
read a block selected with `finality: final`. Such a block can precede mandate
creation. This is the identified synchronization defect and explains why the
expiry case, which delayed the read, got past setup. Funding was not changed:
the existing fixture has 10 synthetic NEAR reserve plus 1 NEAR principal, and
the captured successful case was solvent at both recorded endpoints.

The old failures did not save setup transaction hashes or rejected snapshots.
Exact receipt-versus-snapshot ordering for those eleven historical cases cannot
be reconstructed. The repair removes the demonstrated code-level race; runtime
confirmation must come from the corrected Linux run. See the official
[NEAR transaction finality semantics](https://docs.near.org/api/rpc/transactions).

## Corrections

- Capture owner/account creation, deployment/initialization, access-key installation,
  funding and mandate creation outcomes. Request `tx` with `wait_until: FINAL`,
  verify the returned transaction hash/signer and finality, and retain raw receipts
  before proceeding to dependent operations.
- Read policy, accounting, raw STATE and all five account balances at one final
  block. Verify the initialized owner, mandate ID, configured keys/recipients,
  limits, expiry, budget identity and sufficient physical backing before testing.
- Give the expiry fixture a 10-second lifetime measured from a real finalized
  block. Poll finalized timestamps every 250 ms, bounded by 60 seconds, until
  timestamp > expiry. Record those observations and recheck the actual stored
  expiry against the pre-payment snapshot. A timeout fails without submitting
  the payment. No fixed block-count-to-time assumption remains.
- Journal every custom RPC request/response, including failures, before decoding
  or assertions. Store raw snapshots, transaction results and callback gas before
  validation, and attempt post-payment balances even if callback validation fails.
  Write per-scenario progress and assertion errors; initialize all twelve rows as
  UNVERIFIED before sandbox startup so unexecuted cases remain explicit.
- Keep three independently keyed asynchronous broadcasts behind a shared barrier;
  join all broadcast tasks before waiting for execution. Record hashes, public
  signing keys and submission timing. Collect every obtainable result before
  checking the three calls. Require exact signer/receiver/key/payment arguments,
  three unique hashes, actual vault execution, two successful transfers and one
  vault receipt failing specifically with ERR_BUDGET. Reject nonce conflicts.
- Tighten the prohibited-method test to require MethodNameMismatch instead of
  accepting any generic access-key error.
- Add four local regression tests for optimistic finality, mismatched transaction
  identities, strict expiry boundaries, and invalid concurrency evidence. These
  validate harness guards, not sandbox behavior. Run them and integration Clippy
  in CI before the actual compiled-Wasm suite.

The callback allocation, storage reserve model, business logic, dependencies and
lockfiles have not changed. No new system dependency was installed.

## Local validation

All requested local checks completed successfully:

| Check | Result |
| --- | --- |
| Root and integration formatting | PASS |
| Existing production native suite | PASS: 44 passed, 0 failed |
| Production native Clippy, warnings denied | PASS |
| Integration type-check, all tests | PASS |
| Harness regression suite | PASS: 4 passed, 0 failed |
| Integration Clippy, all targets, warnings denied | PASS |
| Integration executable compilation/link, without execution | PASS on Windows |
| Corrected Linux sandbox scenarios | UNVERIFIED: not run |

The only warnings were the known nonfatal Windows incremental-cache hard-link
fallbacks. No production code, native tests, manifest or lockfile changed.
The integration executable was built with `--no-run`; no sandbox was started.
The earlier actual Linux Wasm build remains evidence for the unchanged contract,
not execution evidence for this repaired harness.

Commands use the installed Rust 1.93.0 toolchain and existing cached dependencies:

```text
cargo fmt --all -- --check
cargo fmt --manifest-path integration-tests/Cargo.toml --all -- --check
cargo test --lib --locked --offline
cargo clippy --all-targets --locked --offline -- -D warnings
cargo check --manifest-path integration-tests/Cargo.toml --tests --locked --offline
cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline
cargo clippy --manifest-path integration-tests/Cargo.toml --all-targets --locked --offline -- -D warnings
cargo test --manifest-path integration-tests/Cargo.toml --test sandbox --no-run --locked --offline
```

## Proposed commit contents

Base commit: `aafa39088174acee179dfc17647e0202b3ee4879`. Only these six files are
proposed for the corrected private push:

```text
.github/workflows/phase2a-sandbox.yml
integration-tests/src/lib.rs
integration-tests/tests/sandbox.rs
README.md
docs/PHASE2A_CI.md
docs/PHASE2A_HARNESS_REPAIR.md
```

README and CI docs are the clean publication copies. Local historical docs,
personal paths, logs, RPC evidence, build outputs, caches and private keys are
excluded. The candidate retains the private-repository-only job condition and
manual workflow_dispatch trigger, selected evidence upload, pinned actions and
read-only repository permission. No frontend or public deployment is added.

The complete seventeen-file candidate tree (six changed/new files and eleven
unchanged baseline files) passed local content review and scans for common token
formats, PEM and serialized private keys, personal email/Windows paths and signed
URLs. No such values or build artifacts were detected. Source, manifest and
lockfile hashes outside the allowlist match the approved initial snapshot. Git
diff whitespace validation passed. These scans supplement the explicit allowlist;
they are not a universal guarantee that any arbitrary input is secret-free.

## Remaining risks and next gate

The corrected suite has not executed on Linux. Actual refund behavior, concurrency,
all twelve assertions and the repair's runtime effect remain pending the approved
run. A real failed transfer that cannot be established remains UNVERIFIED.
Missing/duplicate genuine callbacks, worst-case gas and solvency at every receipt
remain additional gates. Trusted full-access vault keys and owner-account delegated
administrative authority remain explicit limitations. Phase 2B stays NO-GO.

Approval requested after local verification: one corrected commit/push to the
existing private repository and one manual Phase 2A workflow run, followed by
evidence inspection. No further rerun or Phase 2B work is included.
