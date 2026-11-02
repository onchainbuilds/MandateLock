# Phase 4 corrected fee model and execution approval package

**Execution update:** This corrected plan was approved and transactions 1–3 finalized successfully. A deprecated-endpoint RPC error then stopped further submissions. See [PHASE4_TESTNET_RESULTS.md](PHASE4_TESTNET_RESULTS.md). Do not restart the plan or repeat the three completed transactions.

2026-10-31. **Conditional GO for the unchanged 13-transaction demonstration after explicit execution approval.** The corrected conservative outgoing envelope is **7.801 NEAR**, below the **8 NEAR** cap by **.199 NEAR**. No transaction amounts, methods, keys, gas allocations or expiry settings were changed. No real-account transaction was signed/submitted, no faucet request was made, and no deployment, push or CI occurred during this local correction.

This package supersedes the fee assumptions in `PHASE4_REVISED_APPROVAL.md`. The earlier safe stop and bootstrap evidence remain preserved. The new execution permit is disabled.

## Root cause and correction

The old forecast multiplied action gas units by ordinary gas price but omitted `runtime_config.account_creation_charge`. The earlier .0017 NEAR per-creation allowance could not cover a .007 charge plus transaction fees. [Official account-cost documentation](https://docs.near.org/integrations/accounts) describes the charge as collected through gas fees, separately from storage balance obligations.

`testnet/budget.mjs` now reads that charge from the captured/live protocol, adds it for each CreateAccount action, and exposes gas allowance and creation charge separately. The network guard requires a positive, explicitly reviewed charge and rejects changes even when the action-fee digest is unchanged. There is no default zero or hardcoded .007 fallback. The permit binds fee-model version 2 and the exact charge. Existing owner reserves, ordered balance bounds, signature/role, network, hash, expiry and no-retry checks remain intact.

The calculation is a **conservative allowance**, not a claim to reproduce exact runtime fee collection. It retains the entire old doubled gas allowance, including creation-related gas units, then adds the fixed charge. Any overlap is deliberate headroom rather than an additional onchain action/deposit. Finalized execution must still measure actual fees and refunds. The historical bootstrap's **.0071149895375 NEAR** burned fee fits inside the new **.0087** creation allowance and exceeds the old **.0017** allowance; regressions assert both facts.

## Fresh finalized inputs and preserved state

At **2026-10-31 15:51:03 UTC (11:51:03 a.m. EDT)**, block **275620024**, hash `C5hpDT3B8CdiFA9peQbL9StLjSqHhq8PxQdSks2tVKDg`:

| Input/check | Verified result |
| --- | --- |
| Network / RPC | testnet / `https://rpc.testnet.near.org` |
| Protocol | 88 |
| Ordinary gas price P | `100000000` yoctoNEAR/gas |
| Creation charge C | `7000000000000000000000` yoctoNEAR = **.007 NEAR** |
| Storage price | `10000000000000000000` yoctoNEAR/byte |
| Owner | `ml-demo-20261031.testnet`, **10 NEAR**, locked 0, storage 182 bytes |
| Owner code | Empty code hash `11111111111111111111111111111111` |
| Owner key | Exactly `ed25519:uuukiCHdpBwSHGzoxGTQBZLJt4mLo8xaQZWW2uM1no4`, FullAccess, nonce `275614533000000` |
| Four proposed subaccounts | Vault, agent, merchant and attacker all absent |
| Keys/custody | All reviewed account IDs and eight public keys unchanged; private files untouched and outside repository/browser; agent onchain keys not installed yet |

Raw current RPC evidence is in `artifacts/phase4-fee-correction/`. A compact public protocol-fee fixture records the block, current parameters and bootstrap fee reference in `testnet/test/fixtures/protocol-fees-88.json`. No live account state is inferred from unit fixtures.

**Production freeze:** all 16 baseline files and both Wasm artifacts still match. Linux deployment Wasm SHA-256 remains `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87` (159,542 bytes), baseline commit `75051c2fc7ecff6390c49fa67274d70d275d07c8`. Windows Wasm is not substituted. No new compile or contract change was needed.

## Exact fee calculation

For each transaction, G is the sum of captured protocol action/receipt gas costs, relevant byte costs and prepaid FunctionCall gas. The existing calculation uses the larger send cost and a twofold margin:

```text
gas allowance = ceil(2 × G / 10^12) × 10^12 × P
creation allowance = number of CreateAccount actions × C
total fee allowance = gas allowance + creation allowance
```

| Transaction group | Count | Gas allowance each | Creation charge each | Total fees |
| --- | ---: | ---: | ---: | ---: |
| Account creations #1–4 | 4 | .0017 | .007 | **.0348** |
| Deploy/init #5 | 1 | .0239 | 0 | **.0239** |
| Install keys #6 | 1 | .0002 | 0 | **.0002** |
| Fund, mandate, five agent calls #7–13 | 7 | .0203 | 0 | **.1421** |
| Total | 13 | **.1730 total** | **.0280 total** | **.2010** |

Each actual FunctionCall still has **100 Tgas**, with the production payment callback allocated **15 Tgas** within the promise chain. Native actions have no caller-selected prepaid gas field. Fee-equivalent estimates such as 17 or 239 Tgas are not substituted into the wire transactions.

| Aggregate outgoing calculation | NEAR |
| --- | ---: |
| Setup transfers/attached deposits | **6.200** |
| Every requested agent payout, including expected rejections | **1.400** |
| Corrected conservative fees | **.201** |
| **Conservative total** | **7.801** |
| **Headroom under 8** | **.199** |
| Expected successful payouts | .900 |
| Expected transfers/deposits plus fee allowance | **7.301** |

No adjustment to payment amounts or funding is needed. The bound counts both setup funding and downstream payouts as gross outgoing transfers; it deliberately does not assume rejected payments to meet the cap. There is no automatic top-up, repeated payment or additional transaction. Historical bootstrap sponsor fees are outside this subsequent outgoing plan and did not reduce the owner's observed 10 NEAR.

## Storage and remaining reserves

Creation charges are paid by the creator. They do not remove the need to retain storage balance for the deployed vault. Although small accounts can benefit from the protocol's creation-funded storage allowance, the plan retains the larger reviewed 4,096-byte bound for ordinary accounts. No existing storage safeguard was relaxed.

| Account | Expected balance after fee allowance and successful outcomes | Storage/operating allowance | Reserve after obligations |
| --- | ---: | ---: | ---: |
| Owner | 10 − 6.2 − .0754 = **3.72460** | .04096 | **3.68364**, including at least 2 retained at owner |
| Vault | 5 − .9 − .0239 = **4.07610** | 2.57000 | **1.40610**, after retaining .1 unspent mandate liability |
| Agent | 1 − .1017 = **.89830** | .04096 | **.85734** |
| Merchant | .1 + .9 = **1.00000** | .04096 | **.95904** |
| Attacker | **.10000** | .04096 | **.05904** |

The vault allowance is 256,000 bytes × current storage price plus .01 operating margin. Actual storage must be checked after deployment. Gas allowances of .10 per agent key are limits within the agent's balance, not extra funding. Combined expected account balances after the .201 fee allowance are **9.799 NEAR**: internal transfers do not reduce their aggregate. Storage encumbrances are not added again to the outgoing transfer budget.

## Exact unchanged transaction sequence

O=`ml-demo-20261031.testnet`; V=`vault.ml-demo-20261031.testnet`; A=`agent.ml-demo-20261031.testnet`; R=`merchant.ml-demo-20261031.testnet`; X=`attacker.ml-demo-20261031.testnet`. Keys are exactly those in the new config; K0/K1/K2 are its three agent keys. FullAccess administrative keys remain operator-only.

| # | Signer/key → receiver | Actions / amount / attached deposit | Call gas | Corrected fee bound | Expected outcome |
| --- | --- | --- | --- | ---: | --- |
| 1 | O/owner → V | CreateAccount; Transfer **4**; AddFullAccess(vault key) | Native | **.0087** | Vault with reserve |
| 2 | O/owner → A | CreateAccount; Transfer **1**; AddFullAccess(agentAdmin key) | Native | **.0087** | Agent gas account |
| 3 | O/owner → R | CreateAccount; Transfer **.1**; AddFullAccess(recipient key) | Native | **.0087** | Approved recipient |
| 4 | O/owner → X | CreateAccount; Transfer **.1**; AddFullAccess(attacker key) | Native | **.0087** | Unapproved recipient |
| 5 | V/vault → V | Deploy frozen Wasm; `new({owner_id:O})`, deposit **0** | 100 Tgas | .0239 | Atomic deploy/init |
| 6 | A/admin → A | Add K0/K1/K2: FunctionCall → V, only `execute_payment`, allowance **.10 each** | Native | .0002 | Restricted keys installed |
| 7 | O/owner → V | `fund({})`, deposit **1** | 100 Tgas | .0203 | Principal funded |
| 8 | O/owner → V | `create_mandate`: A, K0–K2, [R], budget **1**, ceiling **.4**, expiry below, deposit **0** | 100 Tgas | .0203 | Mandate 1 |
| 9 | A/K0 → V | `execute_payment`: mandate 1, nonce **0**, R, amount **.10**, deposit **0** | 100 Tgas | .0203 | Transfer/callback succeeds |
| 10 | A/K0 → V | Same method: mandate 1, nonce **1**, X, amount **.10**, deposit **0** | 100 Tgas | .0203 | ERR_RECIPIENT, no payout |
| 11 | A/K0 → V | Same method: mandate 1, nonce **2**, R, amount **.40**, deposit **0** | 100 Tgas | .0203 | Independent competitor |
| 12 | A/K1 → V | Same method: mandate 1, nonce **3**, R, amount **.40**, deposit **0** | 100 Tgas | .0203 | Independent competitor |
| 13 | A/K2 → V | Same method: mandate 1, nonce **4**, R, amount **.40**, deposit **0** | 100 Tgas | .0203 | Independent competitor |

#11–13 use three distinct keys and independently submitted valid transactions before awaiting finality. Expected: two successful payouts and one ERR_BUDGET, with no nonce-conflict substitution. Final expected available .1 / pending 0 / spent .9, merchant gain .9. No same-block claim without actual receipt evidence. Local malicious redirect remains a clearly labelled deterministic BLOCK without a broadcast; #10 is the separately approved bypass fixture. Every runtime outcome remains UNVERIFIED until execution.

Machine-readable transactions and fee breakdown: `artifacts/phase4-fee-correction/exact-transactions.json`. A deep comparison verifies all 13 calls equal the prior plan. The plan hash remains `c690ae71c36dc58b026546167949110889b20f284d372e1d04de562fecb182ab`.

## Approval binding and deadline

Use only:

- [`testnet/config.fee-reviewed.json`](../testnet/config.fee-reviewed.json): original settings plus the reviewed protocol creation charge. SHA-256 of canonical parsed config: **`52c3bd8d84b806010536c058491064660b6365eec7853336b6d80919921ef655`**.
- [`testnet/approval.fee-reviewed.json`](../testnet/approval.fee-reviewed.json): **approved=false**, fee-model version 2, creation charge .007, maximum fee allowance **.201**, outgoing cap **8**, verified bootstrap **10**, unchanged plan hash/Wasm/lockfile/deadlines. The earlier .173 permits cannot pass the corrected budget guard.

No older review artifact was overwritten to conceal the previous defect. A new config fingerprint means a new journal namespace; no prior setup/agent transaction or journal exists, and current account absence was verified. This is not permission to reset or reuse a namespace after any future broadcast.

Cutoffs are unchanged:

- Begin before **November 1, 2026, 14:30 UTC (9:30 a.m. EST)**.
- Submit before **14:50 UTC (9:50 a.m. EST)**.
- Confirm before **15:00 UTC (10:00 a.m. EST)**.
- Mandate expiry remains **16:00 UTC (11:00 a.m. EST)**, `1793548800000000000` ns.

At the fresh check, approximately **22 h 39 min** remained before the start cutoff. The sequence has scheduling room under normal network conditions; completion time is not guaranteed. Recheck all preconditions before each submission. Any cutoff, changed charge/fees/protocol, unexpected account state, insufficient reserve, receipt uncertainty or potential overrun stops execution. Never resubmit uncertain transactions, compensate payments, or release pending reservations automatically.

## Regression evidence and reproduction

**129 PASS / 0 FAIL:** 70 Node tests, 44 original native contract tests, 8 existing Rust tests and 7 harness library tests. Six new regression cases cover:

1. All four current creation charges, unchanged non-creation fees, exact .201 / 7.801 totals and the independently observed bootstrap fee.
2. A post-creation owner balance reflecting the observed fee: corrected bound accepts it, old .0017 bound rejects it.
3. A changed creation charge despite an unchanged action-fee digest.
4. Missing/zero charge rejection, preventing silent gas-only fallback.
5. Increased creation charges pushing the same transaction amounts over the 8 NEAR cap.
6. Old permit/model/fee rejection and corrected approval binding.

The full existing suite was preserved. Offline SDK tests use ephemeral test keys and an invalid block hash; no real-account transaction signing occurred. No Linux sandbox/CI runtime rerun was performed. Earlier Phase 2A/2B evidence remains historical, not relabelled as public-testnet execution.

```powershell
node testnet/review-revised-budget.mjs
node --test demo/test/*.test.mjs testnet/test/*.test.mjs
cargo test --locked --offline
cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline
node testnet/verify-frozen.mjs
```

`funding-review.mjs` now delegates to the corrected forecast instead of retaining a runnable underpriced calculation. Both forecast entry points are offline and use the captured protocol/state; neither signs nor submits. Current read-only evidence, exact fee arithmetic, tests, plan comparison and file manifest are under `artifacts/phase4-fee-correction/`.

## Decision and remaining limitations

**GO for local correction completeness; conditional GO for the unchanged testnet sequence only after explicit approval of this corrected package.** No cap increase, funding request or transaction-amount adjustment is needed. All 13 transactions remain unexecuted. The retained 10 NEAR owner balance, original keys, production contract and Wasm are preserved.

This is not a production custody sign-off. Retained FullAccess keys can bypass contract policy; same-user Windows processes are not isolated; failed/missing callbacks can strand reservations; intra-block solvency remains unverified. Actual execution must preserve finalized transaction/receipt hashes, permissions, callback gas, balances and budget enforcement evidence. No push, CI, publication, mainnet or further phase is authorized.
