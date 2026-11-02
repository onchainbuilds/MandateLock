# Phase 4 approved revised execution — pre-signing safe stop

**Subsequent local correction:** [PHASE4_FEE_CORRECTION.md](PHASE4_FEE_CORRECTION.md) accounts for the current creation charge and adds six regressions. It awaits new explicit execution approval; no transactions followed the safe stop. This file preserves the original finding.

2026-10-31. **NO-GO for continued execution with the current fee model.** The exact revised plan was authorized, but a pre-execution review found a confirmed tooling defect before any executable permit was activated, credential signed, or transaction was submitted. The production contract is not implicated.

## Confirmed preflight defect

`testnet/budget.mjs` prices account creation from `runtime_config.transaction_costs` gas units multiplied by the reported gas price. It does not account for `runtime_config.account_creation_charge`. The current finalized protocol exposes that charge as `7000000000000000000000` yoctoNEAR (**.007 NEAR**), while each approved account-creation fee row permits only **.0017 NEAR**.

The [official NEAR account-cost documentation](https://docs.near.org/integrations/accounts) confirms that the creator pays a .007 NEAR creation charge through gas fees, in addition to other transaction fees. This is distinct from the recipient's storage balance. The previously finalized owner bootstrap provides independent execution evidence: transaction and receipt outcomes report **.0071149895375 NEAR** in total tokens burned for CreateAccount + Transfer + AddKey.

This is a **confirmed fee-forecast/preflight defect**, not a failed sandbox/testnet contract test. It was missed in the earlier review and its local tests. The approved `checkDeploymentFunding` owner-balance envelope subtracts only .0017 for the first creation: after a normal creation it would reject the owner's lower balance before step 2. Continuing by increasing that tolerance or changing the fee permit during execution would depart from the exact reviewed guard. No such change was made.

The overall 8 NEAR cap has **not** been exceeded. Adding four full .007 charges to the old 7.773 envelope gives an illustrative conservative **7.801 NEAR**, still below 8. This is a diagnostic arithmetic check, not a corrected, tested or approved replacement fee model; the charge is collected through gas, so its pricing and interaction with existing gas estimates must be handled accurately. The safe stop concerns the invalid per-step funding assumptions, not an assertion that the approved demonstration necessarily needs more than 8 NEAR.

## Fresh finalized checks

Observed **2026-10-31 15:48:18 UTC (11:48:18 a.m. EDT)** at finalized block **275619744**, hash `CjzY1MkTzf3A3jKuVjwkJWBEpELirdGKaQ1AyLat4HWY`:

| Check | Result |
| --- | --- |
| Network | PASS: pinned NEAR testnet RPC; protocol and existing fee/storage/gas guards matched |
| Configuration, lockfile, exact plan and production Wasm | PASS: match revised approval |
| Deadline | PASS: before November 1 14:30 UTC start cutoff and 14:50 UTC submission cutoff |
| Owner balance | **10 NEAR**; locked 0; storage 182 bytes |
| Owner code | Empty: `11111111111111111111111111111111` |
| Owner authority | Exactly one reviewed FullAccess key, nonce `275614533000000`; local key derives to the same public key |
| Vault, agent, merchant, attacker | All four absent; not zero-balance existing accounts |
| Execution journals | No setup/agent journal exists for the reviewed config |
| Account-creation fee sufficiency | **FAIL**: forecast .0017 versus creation charge .007 plus other fees |

Owner public key remains `ed25519:uuukiCHdpBwSHGzoxGTQBZLJt4mLo8xaQZWW2uM1no4`. Linux Wasm remains `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`; all 16 baseline files and both Wasm artifacts were checked unchanged. No other private key was needed for this read-only stop investigation.

## All 13 transaction results

UNVERIFIED means **not submitted**. No transaction was attempted and no transaction failed onchain.

| # | Planned transaction | Result | Hash / receipts / callbacks |
| --- | --- | --- | --- |
| 1 | Create vault; transfer 4 | UNVERIFIED | Not signed or submitted |
| 2 | Create agent; transfer 1 | UNVERIFIED | Not signed or submitted |
| 3 | Create merchant; transfer .1 | UNVERIFIED | Not signed or submitted |
| 4 | Create attacker; transfer .1 | UNVERIFIED | Not signed or submitted |
| 5 | Deploy frozen Wasm and initialize | UNVERIFIED | Not signed or submitted |
| 6 | Install three restricted agent keys | UNVERIFIED | Not signed or submitted |
| 7 | Fund vault principal with 1 | UNVERIFIED | Not signed or submitted |
| 8 | Create mandate | UNVERIFIED | Not signed or submitted |
| 9 | Authorized .10 payment | UNVERIFIED | No payment or settlement callback |
| 10 | Unauthorized-recipient rejection | UNVERIFIED | No rejection claimed |
| 11 | K0 .40 budget competitor | UNVERIFIED | No concurrency evidence |
| 12 | K1 .40 budget competitor | UNVERIFIED | No concurrency evidence |
| 13 | K2 .40 budget competitor | UNVERIFIED | No concurrency evidence |

**Run totals:** 0 signed, 0 submitted, 0 transaction PASS, 0 transaction FAIL, **13 UNVERIFIED**. No new transaction hashes or explorer links exist. Same-block concurrency and callback behavior remain unverified.

## Funding and evidence

- Historical faucet grant: 10 testnet NEAR, already FINAL under the separate bootstrap authorization.
- This run: **0 NEAR outgoing transfers/deposits, 0 NEAR transaction fees, 0 additional faucet requests**.
- Remaining finalized owner balance: **10 NEAR**. The other four accounts remain absent.
- Historical bootstrap hash: [HhF51drrwKbaauC1MQLqpPjFUcHXHzvCvX9qzAvvoAjQ](https://testnet.nearblocks.io/txns/HhF51drrwKbaauC1MQLqpPjFUcHXHzvCvX9qzAvvoAjQ). It was not repeated and is not counted as one of these 13 transactions.

Evidence: `artifacts/phase4-approved-run/result.json`, `protocol.json`, `gas.json`, `block.json`, `status.json`, five account query responses and `owner-keys.json`. The result file preserves each planned action and its unsubmitted status. Prior bootstrap receipts remain in `artifacts/phase4-execution/bootstrap-final-transaction.json`.

The `approved:false` review permit remains unchanged; no active permit was created. No production/execution source was modified in this turn. No tests were rerun: the earlier 123 passing local tests remain valid historical results but did not cover this protocol charge. Private keys stayed outside the repository/browser and were not printed. No push, CI, deployment, mainnet action or publication occurred.

## Required local correction before another execution approval

1. Account for the current creation charge in the fee calculation and ordered owner-balance bounds. Bind the relevant protocol field in the reviewed network assumptions.
2. Add regressions using the captured protocol and finalized bootstrap fee evidence; include a charge exceeding the old per-step allowance and a changed charge despite an unchanged action-fee digest.
3. Recalculate the fee permit, outgoing envelope and reserves, keeping the 8 NEAR maximum and every production transaction shape unchanged unless separately approved.
4. Present the local correction and test results for explicit approval before resuming. Do not weaken checks or use the diagnostic 7.801 figure as automatic authorization.

No further phase is started. Remaining contract/security limitations are unchanged: full-access custody bypasses policy; same-user processes are not isolated; missing callbacks can strand pending obligations; intra-block solvency has not been established; no production custody sign-off.
