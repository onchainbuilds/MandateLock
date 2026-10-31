# MandateLock Phase 2A

Private, manual Linux sandbox validation of a NEAR spending-policy prototype.
The production Rust sources and native tests are unchanged from Phase 1B.
The latest local native run passed 44 tests; all twelve real sandbox scenarios
remain UNVERIFIED until this workflow executes and its evidence is reviewed.

## Execution

After approval, manually dispatch `.github/workflows/phase2a-sandbox.yml` on the
default branch. The job requires a private repository and runs on Ubuntu 24.04.
It uses Rust 1.93.0, near-sdk 5.29.1, cargo-near 0.22.0,
near-workspaces 0.23.0 and sandbox node 2.13.4, with committed Cargo lockfiles.

The workflow runs native tests, builds the actual contract Wasm, and deploys that
artifact only into a disposable local NEAR sandbox on the runner. Accounts and
keys are generated for that sandbox; funds are synthetic. No wallet secrets,
public-chain accounts or funded accounts are required. Dependency downloads and
GitHub evidence uploads use the network; no public-chain deployment, package
publication or hackathon submission occurs.

Download `mandatelock-phase2a-evidence` from the run. It contains the commit SHA,
workflow URL, build/test logs and, when execution reaches them, scenario results,
raw transaction/receipt outcomes, balances, callback gas and concurrency evidence.
Setup failures are not contract-test passes. Missing evidence remains UNVERIFIED.

See [scenario coverage and limitations](docs/PHASE2A_CI.md).
