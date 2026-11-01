# Phase 4 initialization sandbox validation

This manual-only workflow validates a split deployment/initialization proposal after public-testnet transaction 5 correctly failed with ERR_INITIAL_OWNER. No public-chain actions are part of this workflow.

The production initializer requires the vault's immediate parent as both signer and predecessor. The proposed repair deploys with the vault key, then calls `new` directly from the parent owner. No production source or Wasm changes are permitted.

Six actual sandbox scenarios use the frozen production Wasm: vault-only deployment; attacker claiming the parent; attacker claiming themselves; vault self-initialization; successful parent-owner initialization; and rejected repeated initialization. Evidence includes FINAL transaction/receipt outcomes, actual parent receipt signer/predecessor, balances, stored owner/accounting, storage state and deployed code hash. Unexpected results stop this suite and prevent subsequent workflow steps; logs upload even on failure.

The workflow runs on Ubuntu 24.04 with Rust 1.93.0, near-workspaces 0.23.0 and sandbox 2.13.4. It downloads artifact 13044059219 from the previous successful private-repository run 41205116391, verifies the archive digest and exact Wasm hashes, and does not rebuild or commit binary artifacts. Production SHA-256: `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`.

After the six cases pass, the workflow reruns the original twelve Phase 2A cases and four Phase 2B accounting/security aggregates. Only the existing explicitly labeled Phase 2B fault tests use their pinned diagnostic artifacts. Initialization always uses production Wasm. Native checks include 44 original tests, eight existing security tests, four added authority tests and seven harness regressions. Phase 3 stays local and is not part of this narrow upload.

The repository must remain private and exactly `onchainbuilds/MandateLock`; only `workflow_dispatch` can start this job. Token permissions are read-only contents/actions. No real account keys, faucet, public-chain RPC, frontend, deployments or automatic retries are included. Exactly one push and one manual run are authorized for this validation. If any case fails, stop and review the captured error; do not rerun automatically.

The local public-testnet proposal remains disabled and requires separate execution approval. Its previously reconciled incurred outgoing is 5.2297894545824836 NEAR. Planned remaining deposits/requested payouts are 2.4 NEAR and remaining fee bound 0.1663, for a maximum total 7.7960894545824836 under the original 8 NEAR cap. Refresh account state, fees, reserves and deadlines after runtime validation; do not treat sandbox success as authority to transact publicly.

Retained FullAccess custody, uncertain-callback stranded reservations and unverified intra-block solvency remain limitations. This is not a production custody security sign-off.
