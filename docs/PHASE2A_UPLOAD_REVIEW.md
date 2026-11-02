# Phase 2A private GitHub execution approval package

**Execution update:** The user subsequently approved this exact plan. The private
repository was created and sixteen files pushed at commit
`aafa39088174acee179dfc17647e0202b3ee4879`. Workflow
[41197070066](https://github.com/shadehook/MandateLock/actions/runs/41197070066)
ran once and failed. See [PHASE2A.md](PHASE2A.md) for actual results. The following
text preserves the pre-approval review; its pending-action status is historical.

Prepared locally October 31, 2026. No GitHub API call, repository creation, push,
workflow dispatch, Docker or WSL command was made during this preparation.

## Proposed remote action

Create **shadehook/MandateLock**, visibility **private**, default branch **main**.
The account name comes only from the local GitHub CLI configuration; remote
authentication, repository availability and Actions entitlement are unverified.
If that repository already exists, stop before changing it and clarify ownership
and intended use. Do not inspect or change unrelated repositories.

Initialize an isolated Git checkout in `.phase2a-publish`, commit only the sixteen
files below, and push the initial commit to the new private repository. Use a
repository-local author `MandateLock Phase 2A <phase2a@mandatelock.invalid>` to avoid
uploading a personal Git email; no global Git configuration changes. Record the
actual commit SHA, verify remote visibility, then manually dispatch the Phase 2A
workflow once. Monitor that run and download its logs and evidence into this
workspace. No public repository, Pages deployment, release, package publication,
NEAR public-chain deployment or hackathon submission is included.

These actions require the user's explicit approval before proceeding. No repository
URL, commit SHA or workflow execution URL exists yet for this proposed upload.

## Exact commit allowlist

```text
.github/workflows/phase2a-sandbox.yml
.gitignore
Cargo.lock
Cargo.toml
README.md
rust-toolchain.toml
docs/PHASE2A_CI.md
integration-tests/Cargo.lock
integration-tests/Cargo.toml
integration-tests/src/lib.rs
integration-tests/tests/sandbox.rs
scripts/verify-wasm.mjs
src/contract.rs
src/lib.rs
src/model.rs
src/tests.rs
```

The staged README and CI overview are purpose-written summaries. Other selected
files are exact copies of current workspace files. SHA-256 and byte counts for
every candidate are in [phase2a-upload-manifest.json](phase2a-upload-manifest.json).
This approval report and manifest are local records, not part of the upload.

## Privacy and content review

The sixteen candidates were inspected and scanned for PEM private keys, common
GitHub/AWS token formats, credential-bearing URLs, personal email addresses,
Windows user paths, the local username, mnemonic/seed fields and signed download
queries. No such values were detected. All are text source/configuration/docs;
no build artifacts or symlinks were included. Hashes match the manifest. Static
JavaScript syntax validation passed. Pattern checks are not a universal secret
detector, so the small explicit allowlist is also enforced at commit time.

Existing historical docs/logs contain personal absolute paths; the Docker pull
log contains a temporary signed CDN URL. They are excluded, along with all build
targets, Wasm binaries, caches, reference downloads, smoke tests, local GitHub
configuration, sandbox node homes, credentials and existing logs. Native-test
account names and dummy public-key strings are synthetic. The integration harness
generates disposable sandbox keys at runtime and only serializes public key
permissions into its selected evidence directory.

## Workflow verification

- Ubuntu 24.04; Rust 1.93.0; SDK 5.29.1; cargo-near 0.22.0; workspaces 0.23.0;
  sandbox 2.13.4. Both Cargo lockfiles are included. These match the previously
  checked toolchain/API requirements; actual Linux execution remains unverified.
- Only `workflow_dispatch`; no push, PR or scheduled triggers. The job condition
  requires the event repository's private flag to be true.
- Rebuilds actual contract Wasm and runs `integration-tests/tests/sandbox.rs`
  with `sandbox-install`, rather than substituting mocked native tests.
- Runs the 44-test native suite again. Existing production code/tests are unchanged.
- Captures prerequisite, native check, build and sandbox logs, SHA/run URL and
  Wasm metadata. Uploads only `artifacts/phase2a/` with `always()` after failures,
  retained for 14 days. GitHub's job logs also retain step output. A cancellation
  or runner loss may prevent artifact upload; unavailable evidence stays unverified.
- Sandbox deploys occur solely on the runner's local node, with synthetic funds.
  No mainnet/testnet key or funded account is needed. Network use is dependency
  installation plus GitHub checkout/evidence upload; no public-chain endpoint or
  submission step is configured.
- Read-only repository permission; pinned checkout/upload actions; checkout
  credential persistence disabled. No user-provided repository secret required.

All twelve scenarios remain **UNVERIFIED (0 executed)** pending approval and
execution. Phase 2B remains **NO-GO**. Known callback fault, intermediate solvency,
full-access key and owner-delegation limitations remain explicit in the clean CI
overview; a green basic-scenario run alone does not resolve them.
