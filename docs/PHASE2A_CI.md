# Phase 2A scenario coverage

All scenarios currently UNVERIFIED: none has executed in a real sandbox yet.

1. Authorized payment and exact recipient balance increase.
2. Unauthorized recipient rejection.
3. Per-transaction ceiling enforcement.
4. Cumulative mandate budget enforcement.
5. Expired mandate rejection.
6. Consumed authorization nonce rejection.
7. Unauthorized administration rejection.
8. Restricted agent key prohibited-method rejection.
9. Forged settlement callback rejection.
10. Successful asynchronous transfer settlement.
11. Genuine native transfer failure and accounting restoration.
12. Three independent-key 0.40 NEAR requests against a 1.00 NEAR budget;
    all must reach the vault, with two accepted and one rejected for budget.

The harness checks final accounting, physical backing, receipt outcomes and
callback gas. It never treats access-key nonce conflicts as budget enforcement.
If a genuine transfer failure cannot be established, that scenario is UNVERIFIED.

## Remaining security limits

The fixture retains trusted full-access vault keys; those keys bypass contract
policy at the protocol level. Owner-account keys delegated administrative methods
can exercise owner authority. Keys and identities in native tests are synthetic
test inputs; they are not public-chain credentials.

Missing callbacks can strand reserved budget. There is no automatic timeout
restoration, withdrawal, repair or upgrade endpoint. Revocation cannot recall
already scheduled transfers. Genuine duplicate private callback delivery,
controlled missing callbacks, worst-case callback gas and solvency at every
intermediate receipt remain separate unverified gates, even if all twelve basic
scenarios pass. No Phase 2B or public-testnet readiness is claimed.

## Reproduction on supported Linux

Install the workflow's build prerequisites and pinned Rust/cargo-near versions,
then run from the repository root:

```bash
set -euo pipefail
cargo test --lib --locked
cargo near build non-reproducible-wasm --no-abi --locked
node scripts/verify-wasm.mjs
cargo test --manifest-path integration-tests/Cargo.toml --features sandbox-install --locked --test sandbox -- --nocapture
```

Only a local sandbox is constructed; evidence RPC requests reject non-loopback
addresses. Keep sandbox node home directories, private keys and local caches
out of both commits and evidence artifacts.
