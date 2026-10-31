# MandateLock

**Give agents authority. Keep spending under control.**

MandateLock is a NEAR-native policy vault prototype for bounded autonomous payments. An owner defines a mandate; the Rust contract implements recipient restrictions, per-payment limits, expiration, nonce replay protection, and a budget that includes pending transfers.

Official repository: [onchainbuilds/MandateLock](https://github.com/onchainbuilds/MandateLock), verified private and empty in the owner's authenticated Chrome session. Migration is prepared locally and awaits explicit upload approval.

**Status: all twelve Phase 2A sandbox scenarios PASS on GitHub-hosted Ubuntu.** The original 44 native tests, four harness regressions and eight additional Phase 2B model tests pass locally. Actual Phase 2A Wasm transactions prove the tested restrictions, genuine failed-transfer settlement and independently keyed concurrent budget enforcement. No public-chain deployment or frontend exists.

Phase 2A: [successful run, transaction hashes, balances, expiry and concurrency evidence](docs/PHASE2A.md). Historical run 41198135753 used commit `a539ef3b4a243afb7376067b40b052645d5f1111` in the former repository. Those links are provenance only; all new GitHub work targets onchainbuilds/MandateLock. [Phase 2B findings and execution gates](docs/PHASE2B.md): GO for approved private sandbox validation, NO-GO for security sign-off/public deployment. New runtime tests are compiled but unexecuted. Docker/WSL troubleshooting remains stopped.

The [harness repair](docs/PHASE2A_HARNESS_REPAIR.md) waits for setup finality,
verifies expiry timestamps, preserves failed observations and strengthens concurrency
evidence. Its six-file update was explicitly approved, pushed and executed. No
production-contract changes or additional workflow runs were made.

See [Phase 1B evidence and API](docs/PHASE1B.md) for methods, test coverage, artifact hash, exact commands and limitations. The NEAR runtime adapter is compiled; native tests exercise its shared state machine, not actual transfer receipts.

```powershell
$env:Path = (Join-Path $env:USERPROFILE '.cargo\bin') + [IO.Path]::PathSeparator + $env:Path
cargo fmt --all -- --check
cargo test --locked
cargo clippy --all-targets --locked -- -D warnings
cargo near check --clippy --locked
cargo near build non-reproducible-wasm --no-abi --locked
node scripts/verify-wasm.mjs
```

Read [the Phase 0 report](docs/PHASE0.md) for the design, official references, threat model, exact test matrix, prerequisites, competitor comparison, and conditional GO recommendation.

Read [the Phase 1A environment report](docs/ENVIRONMENT.md) for installed versions, compilation evidence, the Windows ABI limitation, Linux CI proposal, security review and [executed commands](docs/ENVIRONMENT-COMMANDS.md). The disposable `.phase1a-smoke/` directory contains no payment or policy logic.

The prototype targets native NEAR on sandbox and testnet only. It excludes fungible tokens, swaps, arbitrary contract calls, cross-chain execution, TEEs, and external AI services. It is an independent project and uses no source from other personal projects.

Initialization requires a vault subaccount directly beneath the owner. There is no withdrawal or upgrade endpoint; unused funds can remain stranded. Missing callbacks keep budget reserved, revocation cannot recall scheduled transfers, and a retained vault full-access key bypasses contract policy. This is unaudited development code, not production custody.

Target submission supplied by the project owner: November 14, 2026. Local Phase 2B review is authorized; migration, remote changes and CI execution require fresh approval.
