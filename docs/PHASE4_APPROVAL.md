# Phase 4 final pre-deployment approval package

Reviewed 2026-10-31. Official private repository: `onchainbuilds/MandateLock`.

**Conditional GO for the exact disposable testnet plan below, only after explicit owner approval.** No account creation, faucet request, public-chain submission, deployment, push or CI execution has occurred. The user separately approved local SDK installation and local credential generation during this review. Production custody remains **NO-GO**.

## Closed preparation gates

| Gate | Verified result |
| --- | --- |
| Installed signing SDK | near-api-js **7.4.0**, Node **24.19.0**; 68 locked dependencies; installation scripts disabled |
| SDK signatures/serialization | PASS: all 13 planned transaction shapes round-trip; signatures independently verify using Node Ed25519; no signed bytes sent or retained |
| SDK/public RPC compatibility | PASS for installed SDK `viewNodeStatus`/`viewBlock` and raw read-only RPC queries on testnet protocol **88** |
| Dependency review | All 68 package resolutions use npm registry HTTPS with SHA-512 integrity; no install-script packages; npm advisory audit reports 0 vulnerabilities at review time (not a security guarantee) |
| Account availability | All five proposed IDs absent at one finalized block; none exist yet |
| Credentials | Eight distinct local keys; derived public keys and account roles match reviewed config; only current Windows user and SYSTEM have file ACL access |
| Restricted agent boundary | Dedicated three-file path allowlist checked before file contents are read; exact onchain FunctionCall permission required before signing |
| Wasm/source freeze | Both Wasm hashes unchanged; all 16 contract/test/workflow baseline files byte-identical |
| Local regression suite | **115 PASS / 0 FAIL**: original 99 + 13 real-SDK transaction tests + 3 custody/network/lock guards |

**Runtime limits:** RPC acceptance of a submitted signature, actual deployed storage, installed onchain permissions, callbacks and testnet payment outcomes cannot be demonstrated before authorized transactions. They remain post-deployment verification gates, not claimed passes. Prior Phase 2B's 75 checks and original 12 sandbox scenarios are preserved, not rerun here. No same-block concurrency has been established on public testnet.

The installed SDK exposed a confirmed adapter compatibility defect: the draft used `api.transactions` and `api.utils`; 7.4.0 exports these helpers at the package root. The adapter and smoke test now use those actual exports. An initial extended test also needed the decoded signature's Ed25519 byte array converted to a Buffer. Those were adapter/test issues, not production contract defects. The SDK read-only probe uses 7.4.0's `viewNodeStatus` and `viewBlock`, rather than older method names.

## Reviewed immutable inputs

- Public config: [`testnet/config.reviewed.json`](../testnet/config.reviewed.json).
- Config SHA-256: `a900b86f3eca441451a63e55e81c7cd17c29b58a16007d935b5904f5ca25059a`.
- Lockfile: [`testnet/package-lock.json`](../testnet/package-lock.json); SHA-256 `0920f50173b086d97b0fbe6b19822f1178a7167a83461f2ad73f74b5666702eb`.
- Approval review copy: [`testnet/approval.reviewed.json`](../testnet/approval.reviewed.json), **approved=false**. A file is not a substitute for owner approval.
- Execution permit expires: **2026-11-01 15:00:00 UTC**; all submissions must occur before this deadline.
- Mandate expiry: **2026-11-01 16:00:00 UTC**, `1793548800000000000` nanoseconds. No automatic extension; refresh and reapprove the config if these dates lapse.
- Deployed artifact must be the retained **159,542-byte Linux production Wasm**, SHA-256 `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`, from baseline commit `75051c2fc7ecff6390c49fa67274d70d275d07c8`.
- Windows Wasm remains `eeded7009d4e56c460744ba7bdf17a52cc04a3d41fa1997903bf7622fb102bb3`; it is not substituted for the tested Linux deployment artifact.

The reviewed config binds protocol version, storage price, action-fee schedule digest, gas-price ceiling and custody profile. Changed config, lockfile, Wasm, protocol fees, storage price, or expired approval stops execution. Access-key transaction nonces and recent block hash must be obtained fresh at signing; they cannot be fixed before the accounts exist. The business actions, keys, deposits, gas and application nonces are fixed below.

## Account availability and key custody

RPC: `https://rpc.testnet.near.org`, chain `testnet`. Availability read at **2026-10-31 14:40:52 UTC**, finalized block **275612698**, hash `3aNde3jzCSnbEUnZYBK9iv4wAhkkSsdz9xERZKp5tfXi`. Each account query returned structured `UNKNOWN_ACCOUNT`, not a timeout interpreted as absence. The SDK separately read finalized block 275612905 successfully.

| Alias | Exact ID | Current state / required action |
| --- | --- | --- |
| O: owner | `ml-demo-20261031.testnet` | Absent; root bootstrap required |
| V: vault custody | `vault.ml-demo-20261031.testnet` | Absent; create as direct owner subaccount |
| A: agent | `agent.ml-demo-20261031.testnet` | Absent; create separate account |
| R: merchant | `merchant.ml-demo-20261031.testnet` | Absent; create approved recipient |
| X: attacker | `attacker.ml-demo-20261031.testnet` | Absent; create unapproved recipient |

Availability is not a reservation. Requery immediately before bootstrap/setup and stop if any unexpected account exists; do not rename, reuse or overwrite it silently.

| Credential role | Exact public key | Proposed onchain permission / holder |
| --- | --- | --- |
| Owner | `ed25519:uuukiCHdpBwSHGzoxGTQBZLJt4mLo8xaQZWW2uM1no4` | O FullAccess; operator only |
| Vault | `ed25519:HNbuxCPLJDP7NdVzC9nfRnH3CXYE4GxSECPMVm1fstUD` | V FullAccess; operator only |
| Agent administrator | `ed25519:CT9t96mxq34JXQVi8wwn91uxrg2zwwF7dZ97afh4gmcE` | A FullAccess; operator only, never passed to agent runner |
| Merchant | `ed25519:7ANwdL5Ydro9N5fFrXLij71sDQLZC6HecJMEW8DfdbM1` | R FullAccess; operator only |
| Attacker | `ed25519:FXDtEpmVTLyyNBma3v9cjzsSr2Sa8eCXsoeK82zYUf8S` | X FullAccess; operator only |
| Agent K0 | `ed25519:8dTURL2rSnsgNQ5w8Z33U4B29UqLW5YFN8UqAN6soVU2` | A FunctionCall → V, only `execute_payment`, .10 NEAR gas allowance |
| Agent K1 | `ed25519:8w6pfvV598veazW3mDoHkipAVPFZHrVjB3eFs4inWdLC` | Same restriction, independent access-key nonce |
| Agent K2 | `ed25519:9AzP8cJvtQuUX8WEnuB5mhedQdvPi1sWsDZF95c7o2ay` | Same restriction, independent access-key nonce |

These permissions are **proposed, not installed yet**. Public keys have no account authority until installed. Function-call allowance pays gas; contract accounting controls vault spending. [Official access-key rules](https://docs.near.org/protocol/accounts-contracts/access-keys).

Credentials reside under `%LOCALAPPDATA%/MandateLock/phase4-20261031/`, outside the repository. `operator/` holds five administrative/recipient files; `agent/` holds only `agent-0.secret.json`, `agent-1.secret.json`, `agent-2.secret.json`. The root's inherited ACLs are removed; all eight files were checked for current-user/SYSTEM-only access. Secret values are absent from code, manifests, logs, browser data and the demo client. The agent runner refuses an operator path **before reading the file**; the browser has no key loader or signing endpoint.

**Windows limitation:** separate folders/ACLs do not isolate mutually hostile processes running as the same Windows user. The reviewed scope is a trusted, deterministic operator demo with restricted agent inputs, not an untrusted LLM process with filesystem/tool access. No claim is made that a malicious same-user process cannot read operator files. Stronger OS/user/hardware custody needs separate work/approval. Retained vault keys can bypass all contract policy.

## Exact proposed transaction sequence

Amounts below are NEAR; 1 NEAR = 10²⁴ yoctoNEAR. Every FunctionCall has **100 Tgas** prepaid. Protocol actions such as CreateAccount/AddKey/DeployContract have **no caller-selected gas field**; their protocol fees are estimated separately. The production callback remains **15 Tgas** inside the payment promise chain, not another operator transaction.

**Bootstrap prerequisite, separate from the 13 scripted transactions:** create O with the exact owner public key above and credit **at most 8 faucet NEAR total**, counting bootstrap balance and any separately approved funding together. Do not use purchased/mainnet funds. No faucet request has been made. Before a future request, verify the service can honor the chosen public key and ≤8 cap; if a fixed grant would exceed it, stop before requesting it. Bootstrap's sponsor transaction hash/actual credited amount must be recorded. The plan does not conceal bootstrap as one of the eight script transactions or assume it is already complete.

| # | Signer/key → receiver | Method/actions and deposit | Prepaid call gas | Expected result and purpose |
| --- | --- | --- | --- | --- |
| 1 | O/owner → V | CreateAccount; Transfer **4**; AddFullAccessKey(vault key) | N/A: protocol actions | New vault with reserve only |
| 2 | O/owner → A | CreateAccount; Transfer **1**; AddFullAccessKey(agent-admin key) | N/A | Agent gas/storage account, admin key retained by operator |
| 3 | O/owner → R | CreateAccount; Transfer **.1**; AddFullAccessKey(merchant key) | N/A | Existing named recipient for genuine transfer |
| 4 | O/owner → X | CreateAccount; Transfer **.1**; AddFullAccessKey(attacker key) | N/A | Existing but unapproved destination |
| 5 | V/vault → V | DeployContract(exact Wasm); `new({owner_id:O})`, deposit **0** | **100 Tgas** for `new`; deployment separately priced | Atomic deploy/init, owner set; refuse existing code |
| 6 | A/agent-admin → A | Three AddFunctionCallKey actions: K0/K1/K2, receiver V, methods [`execute_payment`], allowance **.1 each**; deposit **0** | N/A | Restricted payment authority only |
| 7 | O/owner → V | `fund({})`, deposit **1** | **100 Tgas** | Principal/unallocated balance becomes 1 |
| 8 | O/owner → V | `create_mandate`: A; keys K0/K1/K2; recipients [R]; budget **1**; ceiling **.4**; exact expiry above; deposit **0** | **100 Tgas** | Mandate ID 1, available 1, pending/spent 0 |
| 9 | A/K0 → V | `execute_payment({mandate_id:"1",nonce:0,recipient:R,amount:"100000000000000000000000"})`, deposit **0** | **100 Tgas** | Pay .10; successful callback; A=.90/P=0/S=.10 |
| 10 | A/K0 → V | Same method, nonce **1**, recipient **X**, amount **.10**, deposit **0** | **100 Tgas** | Independent direct attack reaches vault; ERR_RECIPIENT; unchanged accounting |
| 11 | A/K0 → V | Same method, nonce **2**, recipient **R**, amount **.40**, deposit **0** | **100 Tgas** | First of three independently submitted budget competitors |
| 12 | A/K1 → V | Same method, nonce **3**, recipient **R**, amount **.40**, deposit **0** | **100 Tgas** | Second independent key/transaction |
| 13 | A/K2 → V | Same method, nonce **4**, recipient **R**, amount **.40**, deposit **0** | **100 Tgas** | Third independent key/transaction |

For #11–13, **any two** may succeed; exactly one should fail ERR_BUDGET. Final expected A=.10/P=0/S=.90 and aggregate merchant gain .90. No fixed transaction is promised to win. Broadcast all three before awaiting finality; distinct keys/nonces/hashes and vault receipts are mandatory. This demonstrates independently competing requests against a cumulative budget; **same-block execution is not claimed**.

The scripted malicious instruction is a separate local deterministic BLOCK with **no transaction**. #10 deliberately bypasses that offchain gate as an approved security fixture. #11–13 similarly bypass the local REVIEW threshold for the exact stress scenario. No arbitrary-policy-bypass endpoint is exposed. All exact JSON actions are in `artifacts/phase4-final/exact-transactions.json`.

## Funding, storage and fees

Observed protocol 88: gas price **100,000,000 yoctoNEAR/gas**; storage **10¹⁹ yoctoNEAR/byte**. These are captured public RPC values, not stale fee assumptions. The reviewed runtime guard rejects a higher gas price or changed protocol/action/storage schedule before signing. [Protocol configuration API](https://docs.near.org/api/rpc/protocol), [storage staking](https://docs.near.org/protocol/storage/storage-staking).

| Allocation / conservative bound | NEAR |
| --- | ---: |
| Maximum aggregate faucet credit to O | **8.00000** |
| Planned distributions: V 4 reserve + 1 principal, A 1, R .1, X .1 | **6.20000** |
| Owner scripted fees (conservative) | .04740 |
| Vault deploy/init fees (conservative, paid from 4 reserve) | .02390 |
| Agent setup + five calls (conservative, paid from agent's 1) | .10170 |
| Total scripted fee allowance estimate | **.17300** |
| Vault storage/operating bound: 256,000 bytes plus .01 operating margin | **2.57000** |
| Ordinary-account storage bound: 4,096 bytes each | .04096 |
| Owner headroom after distributions, its storage bound and scripted fees | **1.71164** |
| Vault reserve headroom after its storage/operating bound and deploy fees, excluding 1 principal | **1.40610** |
| Agent headroom after its storage bound and setup/payment fees | **.85734** |

The 256 KB vault bound generously covers the 159,542-byte code, 64 fixed 90-byte payment slots, bounded state strings, records and storage headroom. Actual serialized state and runtime storage must still be measured after deployment; source-derived estimates are not deployed measurements. Merchant and attacker .1 allocations each exceed the .04096 ordinary-account bound. Gas allowances are caps inside the agent balance, not three extra deposits. Transfer amounts spend the existing mandate principal; they are not added again to funding.

Fee calculations use the captured per-action/per-byte schedule, prepaid function gas, a factor of two and rounding up. Conservative gas-equivalent fee budgets: #1–4 **17 Tgas each**, #5 **239**, #6 **2**, #7–13 **203 each**. These are **estimation bounds**, not the actual wire gas field or a protocol maximum. Actual function gas remains 100 Tgas; native actions have no prepaid field. Detailed arithmetic is reproducible with `node testnet/funding-review.mjs`.

Root bootstrap service behavior/fees are not tested because no account/faucet request is allowed yet. After approved bootstrap, require sufficient actual owner liquid balance for 6.2 distribution + remaining owner fees/storage and verify total credits never exceed 8. Insufficient grant, changed schedule, larger storage or inadequate balance stops execution; no automatic top-up or cap increase is permitted.

## Required finalized evidence

1. Capture root bootstrap and each setup transaction's real hash, signer, receiver, decoded actions, FINAL result and every receipt. Confirm created key permissions and deployed bytecode hash before agent execution.
2. Pin policy, payment slots, access keys, account balances and code views to the same recent finalized block. Record block hash/time and identity; never mix block states.
3. For #9, require FINAL success, actual merchant transfer receipt, `payment_scheduled` reservation and terminal `payment_succeeded` callback from V, return true, callback gas, Succeeded slot 0, merchant +.10 and A=.90/P=0/S=.10.
4. For local BLOCK, record structured attacker proposal, deterministic decision and chain policy clock, explicitly `broadcast=false`; no hash is fabricated.
5. For #10, require actual V receipt with ERR_RECIPIENT, unchanged X/R balances, unused slot 1 and unchanged mandate budget. An RPC rejection or nonce conflict is not equivalent evidence.
6. For #11–13, require three unique keys/hashes, independently assigned access-key nonces, exact .40 requests and actual V execution. Require two terminal successful callbacks/slots, one ERR_BUDGET with unused slot, merchant +.80 for the batch and final A=.10/P=0/S=.90. Save receipt block hashes/heights; only assert same-block execution if those actual independent results prove it.
7. For every before/after state check A+P+S=1, physical account balance, storage/operating floor, unallocated/available backing and pending obligations. Never infer spend solely from gas-affected vault balance deltas. Require after snapshot at/after every finalized receipt block. No intra-block solvency guarantee follows from block-end views.
8. Preserve raw failures, refund receipts, callback outcomes and measured gas. FINAL includes refund finality; a transaction response alone is insufficient. [Official finality semantics](https://docs.near.org/api/rpc/transactions).

The localhost root stays **RECORDED SANDBOX / no LLM**. `/testnet` stays **TESTNET PREPARATION** until actual execution journals exist, then labels **PUBLIC TESTNET OBSERVATIONS** with observation timestamps. It is a read-only journal view, not a continuously current RPC feed. Real hashes get fixed testnet explorer links; raw receipts remain primary if the explorer is unavailable. There is no browser signing/broadcast endpoint or silent mode switch. Existing loopback tests confirm these boundaries; new local keys are never passed to the server/client.

The running localhost APIs were also checked at 2026-10-31 14:49:26 UTC: recorded sandbox has `live_enabled:false`; testnet preparation has `broadcast_enabled:false` and zero transactions. See `artifacts/phase4-final/localhost-review.json`.

## Local package review

The final manifest covers **71 unpublished Phase 3/4 source and retained public-evidence files**, including **20 changed/new files since the initial Phase 4 package**. No unresolved credential, personal-path or excluded-build-file findings remain. Seventeen credential-shaped scan matches were inspected structurally and are public `transaction.signature` fields in preserved sandbox receipts, not private keys. The scan is heuristic, supplemented by source review; it is not a formal secret-detection guarantee. Dependencies, caches, private files and build artifacts remain excluded. The official local checkout remains clean. See `artifacts/phase4-final/package-manifest.json` for hashes and dispositions; no commit or upload is authorized by this package.

## Safe stop, not automatic rollback

- Before any signed/broadcast operation: mismatched key/role/config/lock/Wasm, existing unexpected account, expired approval, changed fee schedule, inadequate balance or stale state means stop and report. Do not substitute accounts, keys, deposits or gas.
- Every operation has an exclusive journal claim. Its transaction hash and exact call are flushed before the single broadcast attempt. A lost response is uncertain; retain the claim and query the same hash with `testnet/reconcile.mjs`.
- Never delete a claim to rerun, allocate a new nonce to repeat an uncertain payment, release pending based on time/balance, or issue a compensating payment. A claim without final evidence requires manual review, even if it might not have been submitted.
- Once included, a chain action cannot be rolled back by this package. Stop subsequent steps and leave accounts/funds in place. No automatic account deletion, withdrawal, contract replacement, key change, pause/revoke transaction or extra deposit is included in the 13-transaction approval. Any such intervention requires separate approval.
- Missing/failed callbacks may strand reservations permanently. Retained owner/vault full-access keys bypass policy. Near-reserve runtime behavior and every intra-block solvency point remain unverified. No production custody sign-off or untrusted-agent OS isolation claim.

## Reproduction and approval request

Current installation/keys are already prepared under the user's explicit local-only approval. Do not regenerate them. For another reviewed checkout, reproduce dependencies from the lockfile with `npm ci --prefix testnet --ignore-scripts`; private keys are not in that checkout and must be handled through a separately approved custody process.

```powershell
node testnet/sdk-smoke.mjs
node --test demo/test/*.test.mjs testnet/test/*.test.mjs
node testnet/verify-frozen.mjs
node testnet/funding-review.mjs
node testnet/predeployment-readonly.mjs testnet/config.reviewed.json
```

The last command performs only public status/block/account/protocol reads. Rust regressions: `cargo test --locked --offline` and `cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline`. Logs and manifests are in `artifacts/phase4-final/`; source approval candidates exclude artifacts, node_modules, credentials and personal paths.

**Requested next approval:** bootstrap exactly O with its reviewed public key and ≤8 aggregate faucet NEAR, then execute setup #1–8 and agent calls #9–13 once, under the reviewed config/hash/deadlines and safe-stop rules. Recheck all live preconditions first. If the faucet cannot honor the exact key/cap or an account now exists, stop without requesting funds or substituting a plan. This approval would not include pushes, CI, publication, mainnet, new features or another phase.

The review-copy permit remains `approved:false`. No execution permit is activated and no public-chain write occurs before the owner explicitly approves this package.
