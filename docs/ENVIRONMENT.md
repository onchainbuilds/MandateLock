# MandateLock — Phase 1A environment and architecture review

Date: October 30, 2026, America/New_York. Scope: native Windows development setup and disposable compilation only. No MandateLock contract or frontend implementation, external account creation, deployment, transaction signing, Git initialization, public repository creation or other-project access is authorized by this phase.

Historical Phase 1A record: Phase 1B was subsequently approved and implemented. See [PHASE1B.md](PHASE1B.md) for the current contract and local test evidence; Phase 1A readiness statements below remain the results of that earlier phase.

The owner explicitly approved installing rustup/Rust 1.93.0, Cargo, the Wasm target, rustfmt/clippy, Microsoft C++ Build Tools/Windows SDK, and official cargo-near 0.22.0 in this chat before installation began. Approval includes the installers' tool directories, caches and user PATH change. It does not approve later chain activity.

This document supersedes Phase 0's requirement to establish local WSL/Linux before starting development: **native Windows is the selected compilation route; Linux sandbox testing can run in a separately authorized GitHub Actions job.** Phase 0 remains a historical inspection record.

## Verified inventory and installation status

| Component | Observed version / evidence | Status |
| --- | --- | --- |
| OS | Windows NT 10.0.26300.0, AMD64 | Native Windows x64 |
| PowerShell | 7.6.5 | Available |
| Node.js | 24.19.0 | Available; no npm dependencies installed |
| npm | 11.17.0 | Available |
| Git | 2.55.0.windows.3 | Available; workspace is not a Git repository |
| Rust compiler | 1.93.0, commit `254b59607d4417e9dffbc307138ae5c86280fe4c`, LLVM 21.1.8 | Installed with official rustup |
| Cargo | 1.93.0 (`083ac5135`, 2025-12-15) | Installed |
| Rust target | `x86_64-pc-windows-msvc` and `wasm32-unknown-unknown` | Both installed |
| rustup | 1.29.2 (`d8c92c676`, 2026-10-21) | Installed |
| rustfmt / clippy | rustfmt 1.8.0-stable; clippy 0.1.93 | Installed; format and Wasm clippy checks passed |
| cargo-near | 0.22.0; CLI prints `cargo-near-near 0.22.0` | Official Windows release binary installed |
| Microsoft Build Tools | VS 2022 product 17.14.44, installation 17.14.37827.9 | Installer exit 0; complete/launchable; no reboot required |
| MSVC compiler / linker | MSVC tool directory 14.44.35207; cl 19.44.35229; link file version 14.44.35229.0 | Native host procedural-macro/build-script linking succeeded in Wasm build |
| Windows SDK | 10.0.22621.0 | Required `dbghelp.lib` and `kernel32.lib` verified after setup |

Before installation, Rust/Cargo/rustup/cargo-near were absent from PATH, the default rustc/rustup files did not exist, vswhere was absent, and standard Visual Studio/Windows Kits directories did not exist. This was a targeted inspection, not a full-disk software census.

Official installers used:

- Rust's [Windows installation page](https://rust-lang.org/tools/install/) and [MSVC prerequisites](https://rust-lang.github.io/rustup/installation/windows-msvc.html). Selected minimal host components: MSVC x64/x86 tools and Windows 11 SDK, without the full Visual Studio IDE. Host-side procedural macros/build scripts and ABI tooling need a native linker even when the final output is Wasm.
- Rustup x64 executable from `static.rust-lang.org`; SHA-256 `00f139da614dced87d3c3d4121c43eebdac3c1bf8a5ee86b9d80dfd71c8d70fd` matched its official checksum before execution. An initial comparison failed because PowerShell returned the checksum body as bytes; decoding UTF-8 resolved it. The failed verification attempt did not run the installer.
- Microsoft bootstrapper from `https://aka.ms/vs/17/release/vs_buildtools.exe`; Authenticode status Valid, signer Microsoft Corporation. No reboot is initiated by the command.
- [cargo-near 0.22.0 official release](https://github.com/near/cargo-near/releases/tag/cargo-near-v0.22.0), using its pinned PowerShell installer. It installs `cargo-near.exe` into `<USER_HOME>\.cargo\bin`. `-NoModifyPath` avoided a duplicate PATH edit after rustup.

Rustup installed tools in `<USER_HOME>\.cargo\bin` and the compiler under `<USER_HOME>\.rustup`. A running Codex/shell may retain its old PATH until restarted. Build commands here explicitly prepend Cargo's bin to the process PATH. No WSL or Docker installation/startup is part of Phase 1A.

## Selected dependency versions and compatibility reasoning

| Item | Selection | Official evidence and limits |
| --- | --- | --- |
| Host/Wasm compiler | Rust 1.93.0 MSVC | Conservative shared minimum for selected releases; pinned in disposable `rust-toolchain.toml` |
| Contract SDK | `near-sdk = "=5.29.1"` | [Tagged workspace manifest](https://raw.githubusercontent.com/near/near-sdk-rs/near-sdk-v5.29.1/Cargo.toml) declares Rust 1.93; use identical SDK release for future unit-testing feature |
| Build tool | cargo-near 0.22.0 | [Tagged package manifest](https://raw.githubusercontent.com/near/cargo-near/cargo-near-v0.22.0/cargo-near/Cargo.toml) declares Rust 1.93; Windows x64 prebuilt release avoids compiling the CLI's entire dependency tree |
| Unit framework | Rust test harness + near-sdk 5.29.1 `unit-testing` | Planned for Phase 1B; not a dependency of the minimal Wasm smoke crate. Native Windows compatibility of the heavier unit-runtime dependencies is not yet established |
| Integration framework | `near-workspaces = "=0.23.0"`, separate Linux test crate | [Tagged root manifest](https://raw.githubusercontent.com/near/near-workspaces-rs/near-workspaces-v0.23.0/Cargo.toml) was retrieved directly and declares Rust **1.93**, resolving Phase 0's missing-tag uncertainty |
| Sandbox family | near-sandbox 0.3.12, nearcore 2.13 dependency family | [Tagged integration manifest](https://raw.githubusercontent.com/near/near-workspaces-rs/near-workspaces-v0.23.0/workspaces/Cargo.toml); commit Cargo.lock later to freeze actual compatible resolution |

The [SDK package manifest](https://raw.githubusercontent.com/near/near-sdk-rs/near-sdk-v5.29.1/near-sdk/Cargo.toml) itself uses near-workspaces 0.23.0 for development tests and nearcore 0.37-family test dependencies. This supports the selection; it is not a substitute for compiling and running the future full test suite. Avoid SDK 5.30 and framework 0.24 release candidates for the initial proof.

Do not use current `main` manifests to infer the minimum compiler of an older tagged release. Phase 0's provisional Rust 1.95 recommendation is replaced by the tagged-release-based Rust 1.93 selection. If a freshly resolved dependency needs a newer compiler, record the conflict and select a compatible lockfile rather than silently upgrading the compiler or skipping protocol compatibility checks.

Use `cargo near build non-reproducible-wasm` for local Windows builds. It is the documented local build mode; Docker applies to the separate reproducible-container mode. The installed CLI's help states that it supplies `--cfg near` and performs Wasm postprocessing. Do not disable wasm-opt or Rust-version checks to force a green result. The first smoke command uses `--no-abi` to isolate Wasm compilation; it does not prove ABI generation works. See [cargo-near build documentation](https://github.com/near/cargo-near).

## Disposable smoke test and evidence

Location: `.phase1a-smoke/` inside this workspace. It is a standalone, unpublished crate named `mandatelock-environment-smoke`, with only a default state type and a read-only method returning 42. It contains no owner, policy, authorization, budget, transfer, callback, storage ledger or frontend. It is not the start of the MandateLock implementation.

Build command (executed from the smoke directory):

```powershell
$rustBin = Join-Path $env:USERPROFILE '.cargo\bin'
$env:Path = $rustBin + [IO.Path]::PathSeparator + $env:Path
cargo near build non-reproducible-wasm --no-abi 2>&1 | Tee-Object -FilePath build.log
exit $LASTEXITCODE
```

**Final compilation result: PASS with `--no-abi --locked`.** The first attempt ran before SDK setup completed and failed with LNK1181 for `dbghelp.lib`. After the Microsoft installer exited 0 and libraries were verified, the locked retry completed successfully in 23 seconds, including wasm-opt. cargo-near explicitly accepted Rust 1.93.0 for the SDK's minimum protocol version 84. No check or optimizer was bypassed.

| Evidence | Verified result |
| --- | --- |
| Command | `cargo near build non-reproducible-wasm --no-abi --locked` |
| Output | `.phase1a-smoke/target/near/mandatelock_environment_smoke.wasm` |
| Size | 18,221 bytes |
| SHA-256 | `6dec779bbdb16dd962e6ddd37fc34741c310b38e532280136d81cf575d4c1b3c` |
| First eight bytes | `0061736d01000000`, Wasm version 1 header |
| Static Node validation | `new WebAssembly.Module(bytes)` succeeded; export `answer` present; NEAR `env` imports include storage_read, register_len, read_register, value_return and panic_utf8 |
| Formatting | `cargo fmt --all -- --check` passed |
| Wasm-target lint | `cargo near check --clippy --locked` passed in 7 seconds |
| Lockfile SHA-256 | `765e914f5839a795b58708c281e5c1cc3e940fbb70d5e041d0cafc4b8c1487de` |
| Resolved SDK / near-sys | 5.29.1 / 0.2.14 |

Logs: initial SDK-timing failure (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), successful locked build (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), clippy (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), and static artifact verification (historical local-only reference; excluded from public snapshot; result retained without inventing evidence). The disposable source and Cargo.lock are retained for reproducibility; target build products are ignored. No generated Wasm was deployed or executed as a blockchain transaction.

**Additional standard ABI build: FAIL on Windows for this selected combination.** `cargo near build non-reproducible-wasm --locked` reached host ABI DLL linking and failed with LNK2019/LNK1120 (50 unresolved NEAR symbols, including `prepaid_gas`, `storage_read` and `p256_verify`). The complete error is in build-with-abi.log (historical local-only reference; excluded from public snapshot; result retained without inventing evidence). This is distinct from the repaired missing-SDK library error: the standard ABI pass requires further compatibility work. No dependency or linker patch was applied to mask it. Use the passing `--no-abi` command locally; attempt ABI generation on Linux CI later and report its actual result. No Linux ABI success is claimed yet.

Exact substantive inspection/install/build commands and outcomes are recorded in [ENVIRONMENT-COMMANDS.md](ENVIRONMENT-COMMANDS.md).

The Rust [Wasm target documentation](https://doc.rust-lang.org/rustc/platform-support/wasm32-unknown-unknown.html) supports cross-compilation from Windows; compiling a Wasm file proves build capability, not NEAR runtime acceptance or payment security. A NEAR runtime integration test is a later gate.

## Linux sandbox alternative without local WSL or Docker

The official [near-workspaces README](https://raw.githubusercontent.com/near/near-workspaces-rs/main/README.md) lists Linux/macOS for sandbox tests. Do not add this integration dependency to the Windows smoke crate or promise native Windows sandbox support.

Proposed later GitHub Actions job, **not created or run in Phase 1A**:

1. After authorization to use a repository and Actions, run an `ubuntu-24.04` x64 hosted job; record the exact runner image and tool versions. A public repository is not required; private Actions use depends on the account's available quota.
2. Use read-only repository permissions, no wallet secrets, no deployment jobs, a bounded job timeout, and immutable commit pins for Actions. Do not use a privileged pull-request event to execute untrusted code.
3. Install pinned Rust 1.93.0 with Wasm target and pinned cargo-near; restore only compatible dependency caches. Build the contract with its locked dependencies using the local build mode on the Linux runner.
4. Run Rust unit tests on Linux if their runtime dependencies do not support Windows. Keep a separate integration crate so Windows Wasm builds never try to install a Linux sandbox binary.
5. Run near-workspaces sandbox tests entirely against the runner's ephemeral local node. No testnet or mainnet access, account credentials, imported chain state or funded external accounts are necessary.
6. Upload compiler/build logs, Wasm hash, sandbox/runtime version, test results and relevant receipt traces. A CI green badge must include genuine concurrent-submission and callback/failure tests before claiming those properties.

Proposed future commands, after actual contract/test crates exist:

```text
cargo fmt --all -- --check
cargo near build non-reproducible-wasm --no-abi --locked
cargo test --locked --lib
cargo test --locked --manifest-path integration-tests/Cargo.toml
```

These commands have not been run against MandateLock: the contract and integration test crates do not exist. Linux hosted VMs are supported by [GitHub Actions documentation](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners). No workflow was uploaded and no repository was created.

## Four security architecture findings

### Atomic cumulative spending

Design remains credible if the vault checks `a <= A` and writes `A -= a`, `P += a`, and the consumed request record in the **same successful invocation** that schedules the outgoing transfer. There must be no awaited external decision between checking and reserving. `A + P + S = B`; committed spend is `P + S`, not S alone. Check all arithmetic and keep only one active mandate.

Three separately keyed requests for .40 against fresh B=1 can admit at most two regardless of their order. Single-account runtime state transitions provide serialization; the offchain workers still submit competing requests. Prove all three requests reached the executor, rather than mistaking protocol nonce rejection or client serialization for budget enforcement. Explicitly test pending overlap. This is a design finding, not an implemented guarantee. [NEAR execution model](https://docs.near.org/protocol/transactions/transaction-execution)

### Failed, delayed and missing callbacks

Distinguish outgoing transfer failure from callback failure. Genuine transfer failure can move stored amount P back to A exactly once; a successful transfer moves P to S. A delayed result leaves P reserved. If a transfer succeeds but its callback panics or runs out of gas, the recipient may be paid while the vault remains Pending: retain P and pause for investigation. Do not resend or credit budget based on a timeout, root transaction status, client error or owner-supplied outcome flag.

Reserve callback gas, preallocate bounded record space, and ensure settlement makes no external calls or refunds to the zero-deposit agent. A restored budget is not necessarily already liquid; recheck actual transferable balance above the storage/operating floor before reuse. Missing-callback recovery is a deliberate liveness limitation of the minimum design. Introducing authenticated reconciliation later requires a separate design and tests. [NEAR asynchronous calls](https://docs.near.org/smart-contracts/anatomy/crosscontract)

### Retained full-access deployment keys

A full-access key on the vault can transfer native NEAR, replace code, add keys or delete the account outside MandateLock methods. Owner checks cannot constrain those protocol actions. Retaining such a key means the security claim is conditional on the deployer remaining trusted; UI concealment or putting the key offline does not remove the authority.

For an eventual stronger immutable proof, separately review and authorize removal of all vault keys only after atomic initialization, code-hash checks and owner-path validation. Keep owner authority in a different account and contract storage. Phase 1A removes no keys. A keyless vault without upgrade/recovery/withdrawal methods can trap unused funds or bugs permanently, so removal is not a routine setup step. [NEAR full-access and locked accounts](https://docs.near.org/protocol/accounts-contracts/access-keys)

### Private callback authorization and double settlement

Use `#[private]` and verify predecessor equals the vault, exactly one runtime promise result, and an exact stored Pending mandate/request record. Read amount and recipient from that record; the external ABI must not accept a caller's success/failure flag or substitute amount. A callback-result argument alone does not authenticate its origin.

Allow only Pending -> Succeeded or Pending -> Failed. A repeated terminal callback is a no-op with no second monetary delta or terminal event; mismatched/unknown results leave money state unchanged. No timeout reset, public reconciliation method or agent-accessible self-call primitive may bypass this check. A retained vault key can originate self-calls, which is another reason private callbacks do not neutralize deployment-key authority. Test generated method wrappers through Wasm integration, as direct Rust method invocation does not prove the exported wrapper enforces `#[private]`. [NEAR private callbacks](https://docs.near.org/smart-contracts/security/cross-contract-calls/callbacks)

## Remaining gates and Phase 1B recommendation

**Windows is ready for local Phase 1B source development and Wasm compilation with `--no-abi`.** Setup and compilation portions of Phase 1A are complete. Overall runtime/security validation remains incomplete:

- Standard Windows ABI generation failed as documented. It is not required to produce the verified Wasm, but the normal ABI build path is not ready.
- SDK `unit-testing` runtime dependencies have not been compiled or run on Windows; route to Linux if unsupported. No MandateLock tests exist yet.
- Native Windows sandbox integration is not supported by the selected framework's documented requirements. Linux Actions is proposed, not provisioned or executed; repository/CI authorization remains a later gate.
- Wasm static validation is not NEAR runtime execution. Sandbox gas/storage/refund/authorization and true competing-request behavior remain mandatory before any security claim.
- Shell restart may be needed to pick up the persisted Cargo PATH entry; it was verified present in the user PATH. No reboot is required by the Microsoft installer.

Phase 1B, only after explicit approval:

1. Freeze compatible versions and retain lockfiles; establish Linux CI availability before relying on unit-runtime or integration coverage.
2. Review the bounded state/API, identity separation, atomic initialization, integer amounts, fixed request slots, events and errors.
3. Implement owner funding/mandate lifecycle and direct-agent identity/key guards; no arbitrary calls, upgrades, withdrawal shortcuts or frontend.
4. Implement reservation, native transfer scheduling and private settlement together; no interim executor that sends funds without reserving.
5. Implement accounting/property tests and adversarial cases from Phase 0. Test no double settlement, replay, expiry, revocation and missing callbacks before UI work.
6. Require compiled-Wasm Linux tests for keys, callbacks, refunds, storage/gas and competing requests before advancing to any separately authorized external proof.

**Stop after Phase 1A.** No MandateLock business logic or frontend was implemented. The successful constant-method build is environment evidence only. Phase 1B still requires explicit approval.
