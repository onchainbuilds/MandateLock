# Phase 4 public testnet execution — safe stop

2026-10-31. **NO-GO for continuation: 3 PASS, 0 FAIL, 10 UNVERIFIED.** Three account-creation transactions finalized successfully. The mandatory post-transaction-3 audit encountered a deprecated RPC endpoint error. No transaction 4–13 was signed or submitted, no provider was switched, and no request was retried. The executable local permit is disabled. This is an infrastructure blocker, not a demonstrated contract defect.

## Stop evidence

The pinned endpoint `https://rpc.testnet.near.org` returned a non-success HTTP response during the finalized key-list audit:

```json
{"code":-429,"message":"WARNING! THIS ENDPOINT IS DEPRECATED! STOP USING IT NOW! Switch to https://fastnear.com or alternative RPC providers at https://docs.near.org/api/rpc/providers"}
```

The numeric HTTP status was not retained; -429 is the captured JSON-RPC code. Stop recorded at **2026-10-31T16:38:14.765Z**, before all execution deadlines. Transaction 3 already had FINAL successful transaction and receipt outcomes, with the exact approved actions, key and amount verified. Its finalized account balance was also read; the separate post-state access-key-list audit did not complete. PASS below refers to the finalized transaction, not completion of that interrupted audit.

## All approved transactions

All amounts below are testnet NEAR. The three completed transactions were signed by `ml-demo-20261031.testnet`, each with the approved CreateAccount, Transfer and AddKey actions.

| # | Operation | Result | Transfer/deposit | Finalized transaction / reason |
|---|---|---|---:|---|
| 1 | Create vault | PASS | 4 | [5fRzq57MiNqMjkNiAsmTcrofEuUcp4roL1XCNYTpTDtV](https://testnet.nearblocks.io/txns/5fRzq57MiNqMjkNiAsmTcrofEuUcp4roL1XCNYTpTDtV) |
| 2 | Create agent | PASS | 1 | [4mxWFevbqohTK4RERAsHPHYKu4dB7eARq8JdHuqeMKrk](https://testnet.nearblocks.io/txns/4mxWFevbqohTK4RERAsHPHYKu4dB7eARq8JdHuqeMKrk) |
| 3 | Create approved merchant | PASS | 0.1 | [FbM4BTPborSUWLL6GVbsJ75csqTz3o3bANwmuMmWjyH4](https://testnet.nearblocks.io/txns/FbM4BTPborSUWLL6GVbsJ75csqTz3o3bANwmuMmWjyH4); separate key-list audit incomplete |
| 4 | Create attacker | UNVERIFIED | — | Not submitted |
| 5 | Deploy frozen Wasm and initialize | UNVERIFIED | — | Not submitted |
| 6 | Install restricted agent keys | UNVERIFIED | — | Not submitted |
| 7 | Fund mandate principal | UNVERIFIED | — | Not submitted |
| 8 | Create mandate | UNVERIFIED | — | Not submitted |
| 9 | Authorized payment | UNVERIFIED | — | Not submitted |
| 10 | Unauthorized-recipient rejection | UNVERIFIED | — | Not submitted |
| 11 | Independent budget request K0 | UNVERIFIED | — | Not submitted |
| 12 | Independent budget request K1 | UNVERIFIED | — | Not submitted |
| 13 | Independent budget request K2 | UNVERIFIED | — | Not submitted |

Each completed transaction burned **0.0071149895375 NEAR**, including the account-creation charge. Every captured receipt succeeded. These are native setup receipts; no contract settlement callback was executed.

| Transaction | Account-creation receipt | Owner refund receipt | Creation receipt gas burnt | Refund receipt gas burnt |
|---|---|---|---:|---:|
| 1 | `8euA8mfthnWanVc6cUGV86fJ7Cxid8kWrs4z2HtpUVEU` | `Cr3ab2PbVMLmT2WPnKkjPsVaYVB2DukUD69ccB7z5PXo` | 7524947687500 | 223182562500 |
| 2 | `B3iEXq6jrfPjygdUsqV93vn1XiPxcqxrsKotux3aqu1m` | `APNESYhdddvB8XAchYqTUSJ8pZn2ABs4N6oVFpUe2maa` | 7524947687500 | 223182562500 |
| 3 | `4Luepq6romfu5xv51kesfX5Uh2BvgedP9VUnkxu2pH2m` | `DGWnpCmTnJkNQ1CwcbKedjThmKzG38AKXYzRp6uxiEd` | 7524947687500 | 223182562500 |

Receipt gas is reported separately from total transaction fees. Full transaction outcomes, receipt outcomes, logs, public keys and signatures are preserved locally.

## Funding reconciliation

| Item | NEAR |
|---|---:|
| Previously authorized faucet grant | 10 |
| Actual transfers/deposits during this execution | 5.1 |
| Actual total fees, including creation charges | 0.0213449686125 |
| **Aggregate outgoing counted against 8 NEAR cap** | **5.1213449686125** |
| Remaining room under outgoing cap | 2.8786550313875 |
| Combined account balances | 9.9786550313875 |

Transfers between demonstration accounts still count against the gross outgoing cap. They are not economic losses; fees explain the difference between the initial grant and combined balances. No additional faucet funding was requested. Creation fees remained within the corrected allowances; there was no budget breach.

Finalized balance snapshot: block **275624894**, hash `4CWZEEVSJD2AzdzYfoMNpcKdHcyWeMnFTFGBG5nRfw3a`, timestamp **1793464629719822611 ns**.

| Account | Balance NEAR | State |
|---|---:|---|
| `ml-demo-20261031.testnet` | 4.8786550313875 | Owner exists |
| `vault.ml-demo-20261031.testnet` | 4 | No deployed contract |
| `agent.ml-demo-20261031.testnet` | 1 | Restricted keys not yet installed |
| `merchant.ml-demo-20261031.testnet` | 0.1 | Account creation finalized |
| `attacker.ml-demo-20261031.testnet` | — | Absent |

Each existing account reports locked balance zero, storage usage 182 bytes, and empty code hash. At the checked protocol storage price of 10^19 yoctoNEAR/byte, each account's storage obligation is 0.00182 NEAR, included within its balance. The owner balance exceeds this obligation; it is not all freely spendable without retaining storage and future fee reserves.

## Security verification and limits

Preflight verified testnet, current protocol fees, finalized owner balance of 10 NEAR, all eight locally derived public keys, initial absence of the four child accounts, signer authority, expiry, funding bounds and frozen artifact. Post-transaction audits 1 and 2 verified finalized balances and access-key permissions. Transaction 3's successful AddKey action is preserved, but the subsequent full key-list audit is incomplete.

The created agent account has its approved operator-held administrator key. This key was not provided to the agent runner or browser. The three restricted function-call keys have **not** been installed. Therefore this run does not establish restricted-agent execution, recipient rejection, hard cumulative budget enforcement, callback accounting or concurrency on public testnet. No same-block concurrency is claimed.

Production source and artifacts remain unchanged. Frozen Linux Wasm SHA-256: `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`. Local freeze verification checks 16 baseline source/test/workflow files and both Linux and Windows artifacts. The contract was not deployed.

Existing limitations remain: uncertain/failed callbacks can strand pending reservations; they must not automatically be released. Full-access operator custody is outside restricted-agent protection. Intra-block solvency remains unverified, and there is no production custody security sign-off. Previous sandbox evidence does not substitute for the unexecuted public-testnet scenarios. The earlier 129 local checks were not rerun as part of this execution; production code was not changed.

## Preserved evidence and safe continuation

- `artifacts/phase4-live-run/result.json`: all 13 results, finalized receipts, balances, fees and exact RPC failure.
- `artifacts/phase4-live-run/audit-0.json` through `audit-3.json`: raw read-only RPC evidence and audits, including the interrupted audit.
- `artifacts/phase4-live-run/01-create-vault.log`, `02-create-agent.log`, `03-create-recipient.log`: actual execution results.
- `artifacts/phase4-live-run/local-key-check.json`: key-match result without private keys.
- `artifacts/phase4-live-run/evidence-manifest.json`: SHA-256 evidence manifest.
- `artifacts/phase4/live/52c3bd8d84b806010536c058491064660b6365eec7853336b6d80919921ef655/`: durable one-shot journals for the three submitted transactions. Preserve these claims; do not delete them or repeat these transactions.
- `artifacts/phase4/frozen-verification.json`: unchanged-source/artifact verification.

**Stop here.** `testnet/approval.local.json` is disabled. No further signing, submissions, funding, provider changes, deployment, pushes, publication or next phase is authorized by this report. A reviewed replacement-RPC and continuation package must reconcile the three completed transactions, finish the interrupted account/key audit, preserve the cumulative budget, recheck protocol fees and deadlines, and start with transaction 4 only after explicit execution approval. The original deadlines remain November 1, 2026: begin before 14:30 UTC, submit before 14:50 UTC, finalize before 15:00 UTC.
