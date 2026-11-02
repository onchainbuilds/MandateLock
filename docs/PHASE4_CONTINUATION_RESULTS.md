# Phase 4 continuation results — safe stop after initialization failure

2026-11-01 UTC. **NO-GO for further execution. Overall: 4 PASS, 1 FAIL, 8 UNVERIFIED.** This continuation submitted transactions 4 and 5 exactly once. Transaction 4 succeeded; transaction 5 reached FINAL with `ERR_INITIAL_OWNER`. No transaction 6–13 was signed or submitted. Transactions 1–3 were never repeated. The executable local permit is disabled.

## Preflight and stop

Repeated preflight passed at finalized block **275674955**: exact approved source/configuration/transaction plan, testnet identity, original three FINAL receipts, unchanged account balances and keys, absent attacker, empty vault code, protocol version 88 and unchanged creation charge/gas/storage parameters. All eight protected credentials matched the reviewed public keys by derivation, without signing during the key check. The projected combined outgoing envelope remained **7.7962449686125 NEAR**. Execution began around November 1 **00:38 UTC**, well before the 14:30 / 14:50 / 15:00 UTC cutoffs.

Transaction 5 returned:

```json
{"Failure":{"ActionError":{"index":1,"kind":{"FunctionCallError":{"ExecutionError":"Smart contract panicked: ERR_INITIAL_OWNER"}}}}}
```

The approved transaction used the **vault** key to sign an atomic DeployContract + `new({owner_id:"ml-demo-20261031.testnet"})` batch to the vault. The frozen initializer explicitly requires both signer and predecessor to equal the parent owner: [`src/model.rs:170`](../src/model.rs#L170), specifically checks on lines 173–175. Its native test already rejects the vault acting as initializer: [`src/tests.rs:506`](../src/tests.rs#L506). The approved deployment plan encoded the incompatible vault signer: [`testnet/plan.mjs`](../testnet/plan.mjs), `deploymentPlan`, `deploy-init` entry.

**Confirmed deployment-plan defect, not a confirmed production-contract defect.** The contract enforced its intended authorization. The preparation review and adapter tests failed to catch the incompatibility between the exact deployment sequence and the tested initializer rule. No production behavior was changed to bypass that rule. Any correction requires a separately reviewed transaction sequence and approval; the failed transaction must not simply be retried.

## All 13 transaction outcomes

Amounts are testnet NEAR. All listed hashes have FINAL outcomes. PASS for transactions 1–4 refers to account creation, not contract-security demonstration.

| # | Operation | Result | Actual fee | Hash / explorer |
|---|---|---|---:|---|
| 1 | Create vault (prior run) | PASS | 0.0071149895375 | [5fRzq57MiNqMjkNiAsmTcrofEuUcp4roL1XCNYTpTDtV](https://testnet.nearblocks.io/txns/5fRzq57MiNqMjkNiAsmTcrofEuUcp4roL1XCNYTpTDtV) |
| 2 | Create agent (prior run) | PASS | 0.0071149895375 | [4mxWFevbqohTK4RERAsHPHYKu4dB7eARq8JdHuqeMKrk](https://testnet.nearblocks.io/txns/4mxWFevbqohTK4RERAsHPHYKu4dB7eARq8JdHuqeMKrk) |
| 3 | Create merchant (prior run) | PASS | 0.0071149895375 | [FbM4BTPborSUWLL6GVbsJ75csqTz3o3bANwmuMmWjyH4](https://testnet.nearblocks.io/txns/FbM4BTPborSUWLL6GVbsJ75csqTz3o3bANwmuMmWjyH4) |
| 4 | Create attacker | PASS | 0.0071149895375 | [J6sMAMgiGzuf6ZkGxZYtDe9813fvp6mWBPsqw8yqyzqM](https://testnet.nearblocks.io/txns/J6sMAMgiGzuf6ZkGxZYtDe9813fvp6mWBPsqw8yqyzqM) |
| 5 | Deploy and initialize | FAIL — ERR_INITIAL_OWNER | 0.0013294964324836 | [7drvA54gJDQcBBMbY7qfygwbzNTJZSRcBTgNmktP7e3b](https://testnet.nearblocks.io/txns/7drvA54gJDQcBBMbY7qfygwbzNTJZSRcBTgNmktP7e3b) |
| 6 | Install restricted keys | UNVERIFIED | 0 | Not signed/submitted |
| 7 | Fund principal | UNVERIFIED | 0 | Not signed/submitted |
| 8 | Create mandate | UNVERIFIED | 0 | Not signed/submitted |
| 9 | Authorized payment | UNVERIFIED | 0 | Not signed/submitted |
| 10 | Unauthorized-recipient rejection | UNVERIFIED | 0 | Not signed/submitted |
| 11 | Independent budget request K0 | UNVERIFIED | 0 | Not signed/submitted |
| 12 | Independent budget request K1 | UNVERIFIED | 0 | Not signed/submitted |
| 13 | Independent budget request K2 | UNVERIFIED | 0 | Not signed/submitted |

## Final receipts, callbacks and artifact evidence

Transaction 4's native account-creation and refund receipts succeeded; its new account and exact key were confirmed before transaction 5. Full receipt identifiers and raw outcomes are preserved in `result.json`, `audit-4.json` and the immutable execution journal.

Transaction 5:

- Main vault receipt **`8wAfnFy6wbu9W3r4tAixXgKgZLkUQL4rdjirXU7u6ZnU`**: FAIL with `ERR_INITIAL_OWNER` at action index 1; gas burnt **11715085679150**, tokens burnt **0.001171508567915 NEAR**, no logs.
- Protocol refund receipt **`DShuWdyX4xvG2hKvywDp3KAdbQEZ5BmZnejKheqiMEE2`**: SuccessValue; gas burnt **223182562500**, tokens burnt **0**. This is a protocol gas refund, not a payment callback or manually submitted refund.
- Transaction outcome gas burnt **1579878645686**, tokens burnt **0.0001579878645686 NEAR**. Combined transaction/receipt fee **0.0013294964324836 NEAR**.
- Fresh read-only `tx` returned the same FINAL transaction and receipts. The exact signer, receiver, initializer args, zero deposit and 100 Tgas matched the approved plan.
- RPC `DeployContract.code` contains a base64-encoded code hash; decoding it gives the exact frozen SHA-256 **`3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`**. A first diagnostic verifier incorrectly hashed those hash bytes again and failed locally. Its evidence was preserved; the read-only verifier was corrected and completed. This diagnostic issue neither caused the contract failure nor indicated changed Wasm, and no transaction was retried.

The final vault code hash is empty and storage remains 182 bytes: the failed batch did **not** leave deployed contract code. No mandate, contract principal, payment, settlement callback, pending reservation or agent execution was created. Callback accounting, recipient enforcement and cumulative spending demonstrations remain UNVERIFIED on public testnet. No same-block concurrency claim is made.

## Exact balance and budget reconciliation

Finalized block **275675132**, hash **`3fjptf68EQ26FhNyfeZ6yLoAYSxPB5kH2vYoNjAJoEfn`**. Every account/code/key query was pinned to this block, which is at or after all transaction-5 receipt blocks.

| Account | Finalized balance NEAR |
|---|---:|
| `ml-demo-20261031.testnet` | 4.77154004185 |
| `vault.ml-demo-20261031.testnet` | 3.9986705035675164 |
| `agent.ml-demo-20261031.testnet` | 1 |
| `merchant.ml-demo-20261031.testnet` | 0.1 |
| `attacker.ml-demo-20261031.testnet` | 0.1 |
| **Combined balances** | **9.9702105454175164** |

All five accounts retain exactly their reviewed operator-held FullAccess key, locked balance zero, storage usage 182 bytes and empty code hash. No restricted agent keys were installed. All balances exceed the current 0.00182 NEAR account-storage obligation; these obligations are included within account balances, not extra outgoing transfers.

| Budget item | NEAR |
|---|---:|
| Historical authorized faucet grant | 10 |
| Transfers/deposits so far | 5.2 |
| Total actual fees, including four creation charges | 0.0297894545824836 |
| **Aggregate outgoing against the 8 NEAR cap** | **5.2297894545824836** |
| Remaining cap headroom | 2.7702105454175164 |

Transfers still held by child accounts count toward the gross outgoing cap. Combined balances equal **10 minus actual total fees** exactly. There was no cap breach or extra faucet request. The failed deployment consumed fees but no attached deposit. There are no contract obligations to release or restore.

## Preservation and remaining restrictions

The production source and both frozen Wasm artifacts passed unchanged verification again after the stop (16 baseline files; evidence `artifacts/phase4/frozen-verification.json`). No production code or deployment-plan correction was made during this execution. The earlier 135 local test results remain historical; no sandbox or CI run was triggered.

Execution evidence is in `artifacts/phase4-continuation-run/`: repeated preflight `review.json`, public-key match summary, per-step logs, `audit-4.json`, raw `deploy-failure.json`, first/corrected read-only stop audit, all-13 `result.json`, and `evidence-manifest.json`. Original one-shot journals remain under `artifacts/phase4/live/52c3bd8d84b806010536c058491064660b6365eec7853336b6d80919921ef655/`; exactly five operations have journals and exactly one submission each. Never delete or reset them.

**NO-GO:** the approved continuation cannot finish with its current deployment/initialization sequence. A local-only correction proposal should reconcile the failed fee expenditure and existing accounts, preserve owner authorization and all completed/failed journals, and obtain separate approval for any changed sequence. Do not resubmit transaction 5, recreate accounts, refund funds, change keys or production code, push, publish or start another phase without explicit approval.

Existing limitations remain: retained FullAccess custody, no strong same-user Windows isolation, potentially stranded reservations after uncertain callbacks in a deployed system, and unverified intra-block solvency. This partial testnet run provides no production custody sign-off.
