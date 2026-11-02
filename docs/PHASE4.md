# Phase 4 — NEAR public testnet preparation

**Transaction 9 recovery:** [Read-only cross-source investigation](PHASE4_TX9_RECOVERY.md). Hash reconstruction matches. Regular/archival RPC report UNKNOWN_TRANSACTION; matched finalized state shows unchanged signer nonce/balances and an Unused payment slot. NearBlocks negative lookup is inconclusive because its known-success control was also empty. Transaction 9 remains UNRESOLVED; permit disabled and 10–13 unsubmitted. Recovery decision required.

**Latest public execution:** [Split deployment results and safe stop](PHASE4_SPLIT_EXECUTION_RESULTS.md). 5A, 5B and 6–8 finalized PASS. Transaction 9 submitted once remains UNVERIFIED after UNKNOWN_TRANSACTION/status timeouts; 10–13 unsubmitted. Confirmed outgoing 6.2316753320710959 NEAR; including transaction 9 uncertainty allowance 6.3519753320710959. Permit disabled. Phase 4 NO-GO pending read-only reconciliation and separate approval.

**Corrected adapter:** [Implementation, local validation and disabled execution package](PHASE4_ADAPTER_REPAIR.md). Split deployment and parent-owner initialization are now wired into both CLIs; 160 local checks pass. Earlier adapter findings below are historical. Public execution still requires explicit approval and fresh preflight.

**Final execution adapter review:** [Current CLI is NO-GO; exact continuation package](PHASE4_ADAPTER_REVIEW.md). Fresh vault code/state is empty and balances/budget remain unchanged; 162 local checks PASS, including audits that reproduce adapter defects. The executable CLI still uses combined vault-signed deployment/initialization and stale continuation accounting. Required local adapter corrections are listed; no public execution, push or additional workflow was performed.

**Initialization sandbox validation:** [Finalized results and updated continuation recommendation](PHASE4_INITIALIZATION_SANDBOX_RESULTS.md). One authorized private CI run succeeded: all six production-Wasm initialization cases, twelve Phase 2A cases and four Phase 2B aggregates PASS; 63 CI native/harness checks and 82 local Node checks PASS. Production unchanged. Refreshed aggregate maximum 7.7960894545824836 NEAR. Split-initialization design GO; public execution remains on hold for separate approval and a reviewed corrected execution adapter.

**Earlier initialization preparation:** [Split deployment / parent-owner initialization proposal](PHASE4_INITIALIZATION_REPAIR.md). Its pending-sandbox status is superseded by the results above; historical public transaction outcomes remain unchanged.

**Latest execution:** [Continuation stopped after FINAL initialization failure](PHASE4_CONTINUATION_RESULTS.md). Transaction 4 PASS; transaction 5 FAIL with ERR_INITIAL_OWNER; transactions 6–13 unsubmitted. Overall 4 PASS / 1 FAIL / 8 UNVERIFIED. No contract remains deployed. Permit disabled; further execution is NO-GO pending a reviewed signer/initialization plan.

**Continuation preparation:** [FastNEAR review and transactions 4–13 approval package](PHASE4_CONTINUATION_APPROVAL.md): fresh FINAL reconciliation PASS, merchant key audit complete, unchanged balances, 135 local tests PASS. Combined maximum outgoing 7.7962449686125 NEAR. Execution remains disabled pending separate approval.

**Latest runtime result:** [Three account creations finalized; RPC safe stop](PHASE4_TESTNET_RESULTS.md). Actual outgoing 5.1213449686125 NEAR; owner balance 4.8786550313875 NEAR. Transactions 4–13 were not submitted. The executable permit is disabled; a reviewed RPC/resumption plan is required before continuation.

**Pre-execution package:** [Creation-charge correction and updated approval](PHASE4_FEE_CORRECTION.md): 129 local tests passed; unchanged 13 calls bounded at 7.801 NEAR including .201 fee allowance, leaving .199 below the 8 NEAR cap. This historical preparation status is superseded by the runtime result above.

**Earlier execution attempt:** [Approved revised run stopped before signing](PHASE4_RUN.md): a .007 NEAR account-creation charge was missing from the .0017 per-creation fee forecast. No setup/agent transaction was submitted in that attempt. The fee model was subsequently corrected and execution separately approved; current balances are in the runtime report above.

**Current approval package:** [Post-bootstrap revised execution plan](PHASE4_REVISED_APPROVAL.md): authorized 10 NEAR grant recognized; outgoing transfers/deposits plus conservative fees bounded at 7.773 of 8 NEAR; 123 local tests pass. No setup/agent execution is authorized yet.

**Latest status:** Revised bootstrap-only authorization completed: owner created with 10 faucet testnet NEAR and confirmed FINAL. Eight setup and five agent transactions remain unexecuted and require separate approval. See [the bootstrap evidence and funding boundary](PHASE4_BOOTSTRAP.md).

**Execution update:** The exact plan was subsequently approved, but execution safely stopped before bootstrap because the faucet's named-account funding amount could not be verified within the 8 NEAR cap. No faucet request or transaction was submitted. See [the individual Phase 4 execution results](PHASE4_EXECUTION.md).

**Update:** [Final pre-deployment review and exact approval package](PHASE4_APPROVAL.md) supersedes the pending SDK/key gates below. The SDK and local keys were subsequently approved and verified; 115 tests pass. Public-chain execution still requires explicit approval. The rest of this document records the initial preparation snapshot.

Date: 2026-10-31. Official repository: `onchainbuilds/MandateLock` (private).

**GO for local preparation review. NO-GO for public testnet execution until the approval and compatibility gates below pass. No production custody security sign-off.** No production contract changes, external account creation/funding, public-chain submissions, SDK installation, pushes, CI runs, deployments or publication occurred.

## Delivered locally

The Phase 3 recorded sandbox demo remains at http://localhost:3000. A separate read-only page at http://localhost:3000/testnet currently shows **TESTNET PREPARATION**, with no invented balances/hashes and a labelled fallback link. Chrome verified the preparation state; no browser errors were observed.

New `testnet/` code prepares an exact unsigned deployment plan, checks approvals, signs through the official SDK boundary, validates current chain state, executes fixed future scenarios and reconciles receipts. Signing/deployment commands are not connected to browser endpoints. `demo/server.mjs` adds only read-only testnet observations/assets. Production Rust, dependencies, existing tests/workflows and Wasm remain unchanged.

Read [the exact operator commands and two-minute judge sequence](../testnet/README.md). Generated unsigned plan: `artifacts/phase4/deployment-plan.json`. It contains the proposed actions and an **unapproved** template. Account IDs are proposals, not reserved/verified accounts. Keys and exact expiry intentionally remain unset.

## Proposed accounts and custody

| Role | Proposed disposable account | Custody / purpose |
| --- | --- | --- |
| Owner | `ml-demo-20261031.testnet` | Human/operator full-access key; funds and administers mandate |
| Contract custody | `vault.ml-demo-20261031.testnet` | Separate operator vault key, frozen Wasm; direct owner subaccount required by contract |
| Agent | `agent.ml-demo-20261031.testnet` | Agent receives only three distinct restricted function-call keys; operator retains separate administrator key |
| Approved recipient | `merchant.ml-demo-20261031.testnet` | Disposable merchant; operator-held independent key |
| Attacker | `attacker.ml-demo-20261031.testnet` | Disposable unapproved recipient; no mandate authority |

Each agent key permits **only** `execute_payment` on the exact vault, with **zero attached deposit** and **0.10 NEAR gas allowance**. There is one account with three independent access keys/nonces, not three identities impersonating the owner. The contract's budget is independent of key gas allowance. Onchain key checks reject FullAccess, unlimited allowance, wrong receiver or broad/empty method lists. [Official access-key documentation](https://docs.near.org/protocol/accounts-contracts/access-keys).

Eight separate public keys are needed. No key pair was generated. Secrets must be outside the repository, protected by OS ACLs, with operator administrative credentials inaccessible to the agent process. Passing only restricted credential paths is a code boundary, not OS isolation. Retained owner/vault/agent-administrator full-access keys remain trusted. Parent/subaccount naming does not itself grant the parent custody over a subaccount's keys. [Official account/action documentation](https://docs.near.org/smart-contracts/anatomy/actions).

## Funding cap and exact proposed actions

**Maximum external faucet funding: 8 testnet NEAR total to the disposable owner. No purchase, bridge, mainnet transfer or automatic top-up.** Distribution is 6.2 NEAR: vault 4 reserve + 1 explicit principal deposit; agent 1 for storage/gas; merchant .1; attacker .1. The balance left with owner covers gas/storage and is not a second mandate. The .30 aggregate key allowances are caps within the agent balance, not additional funding.

| Ordered step | Signer → receiver | Actions |
| --- | --- | --- |
| Root bootstrap prerequisite | Approved operator/faucet | Create owner with chosen owner public key, at most 8 faucet NEAR; not automated here |
| `create-vault` | Owner → vault | CreateAccount + Transfer 4 NEAR + distinct vault FullAccess key |
| `create-agent` | Owner → agent | CreateAccount + Transfer 1 NEAR + operator agent-admin FullAccess key |
| `create-recipient` | Owner → merchant | CreateAccount + Transfer .1 NEAR + merchant key |
| `create-attacker` | Owner → attacker | CreateAccount + Transfer .1 NEAR + attacker key |
| `deploy-init` | Vault → vault | Proven Linux Wasm + `new(owner_id)` in one batch; refuse existing code |
| `install-agent-keys` | Agent administrator → agent | Add three exact receiver/method function-call keys, .1 allowance each |
| `fund` | Owner → vault | `fund`, attached deposit 1 NEAR |
| `mandate` | Owner → vault | `create_mandate`: agent, three keys, merchant only, budget 1, ceiling .4, approved exact expiry |

Eight scripted deployment transactions follow the owner bootstrap. Creation batches fail if an account already exists; no unrelated content is overwritten. Each step requires a prior FINAL success in the exact configuration's journal. There are no automatic retries or resets. Function calls use 100 Tgas; the production settlement callback remains fixed at 15 Tgas. Before payment, the adapter measures the onchain floor, physical backing, gas price, storage cost and agent allowance/balance. Reserve 4 is a cap allocation based on earlier artifact size, not a promise of every future protocol/storage condition; insufficient funding stops execution and requires review.

## Proposed payment sequence — not executed

Use one initial mandate, ID 1, without retiring or resetting it:

| Scenario | Proposed transaction(s) | Expected result, not runtime evidence |
| --- | --- | --- |
| Authorized payment | Agent key 0, application nonce 0, merchant .10 | ALLOW; success callback; A=.90/P=0/S=.10 |
| Malicious redirect | Scripted structured proposal to attacker .10 | Deterministic BLOCK; **no transaction**, no LLM |
| Direct contract rejection | Key 0, application nonce 1, attacker .10 | Independently submitted exact security fixture; ERR_RECIPIENT at vault; accounting unchanged |
| Cumulative concurrency | Keys 0/1/2, application nonces 2/3/4, merchant .40 each | Three independently submitted calls; two settle, one ERR_BUDGET; final **A=.10/P=0/S=.90** |

Five agent transactions total. The .10 earlier payment explains the difference from Phase 3's separate concurrency recording (which ended A=.20/S=.80). Direct rejection and concurrency are exact, operator-approved stress fixtures that bypass the offchain BLOCK/REVIEW gate. No arbitrary bypass API exists. A nonce conflict, missing vault receipt, timeout or unknown callback is never counted as successful enforcement.

## Verification and frontend contract

Before signing, the adapter checks the RPC chain ID is `testnet`, pins all views to one recent finalized block, hashes deployed Wasm bytes, checks the exact owner/agent/keys/recipient/budget/ceiling/expiry, confirms unused application nonces, checks account backing and key gas funding. The configured endpoint is pinned; cross-host redirects are refused. Fresh observation age and approval deadline are checked again before broadcasts.

Each transaction hash is computed and durably journaled before a single `send_tx` attempt. Three competition submissions start independently before any finality wait. Read-only reconciliation asks for FINAL outcomes, including refund receipts. A lost send response still has a known hash; no new transaction or nonce is automatically issued. [Official transaction finality/RPC documentation](https://docs.near.org/api/rpc/transactions).

The verifier requires the expected signer/public key/receiver/action/arguments, actual vault execution, terminal callback event, application-slot transition, recipient balance delta and A+P+S=B. After snapshots must not predate any receipt block. It compares physical vault amount with floor + unallocated + available, and separately reports pending obligations rather than double-counting transfers already sent. Raw receipt logs/status/gas and before/after observations persist even when assertions fail. Query results are pinned to the same block to avoid mixing different accounting states. [Official account/contract query API](https://docs.near.org/api/rpc/contracts).

The browser displays locally observed testnet hashes, FINAL/uncertain status, callback logs, gas, actual balances, block hashes/timestamps and fixed `https://testnet.nearblocks.io/txns/<hash>` links. These links are generated only from actual execution records; there are no sample testnet hashes. The explorer returned HTTP 403 to the documentation fetch during preparation; availability is **UNVERIFIED**, and raw RPC/journal evidence remains primary. The page is a snapshot viewer, not an always-current chain feed. Refresh reads only the local journal. If unavailable, it shows uncertainty and offers the separately labelled sandbox recording.

## Versions, tests and freeze evidence

| Verification | Result |
| --- | --- |
| Existing 44 contract native tests | PASS, rerun |
| Existing 8 accounting model tests | PASS, rerun |
| Existing 7 harness regressions | PASS, rerun |
| Existing 17 Phase 3 demo tests | PASS, rerun |
| New Phase 4 offline/loopback tests | PASS: 23 |
| Local total | **99 PASS / 0 FAIL** |
| Frozen baseline files | PASS: 16 byte-identical files versus `75051c2fc7ecff6390c49fa67274d70d275d07c8` |
| Windows and Linux production Wasm | PASS: unchanged hashes |
| Prior Phase 2B 75-check sandbox run | Historical PASS, not rerun; all 12 scenarios preserved |
| Official SDK import/sign/encode/runtime compatibility | **UNVERIFIED**, not installed or executed |
| Testnet account availability, faucet, deployment, payments | **UNVERIFIED**, not attempted |
| Every intra-block solvency state | **UNVERIFIED**, unchanged limitation |

Node 24.19.0 was used. The proposed official `near-api-js@7.4.0` is exact-pinned in a separate private package, based on the [official release](https://github.com/near/near-api-js/releases/tag/near-api-js%407.4.0) and [API library docs](https://docs.near.org/tools/near-api). The SDK's [transaction signer](https://near.github.io/near-api-js/interfaces/signers_signer.SignTransactionReturn.html) returns a hash and signed transaction; serialization goes through the library, with no custom signature or Borsh implementation. Rust remains 1.93.0 / near-sdk 5.29.1; no production dependency changes. A lockfile, dependency review and `sdk-smoke.mjs` round trip are mandatory after installation approval and **before** any external transaction. No compatibility claim is made from mocked tests.

Proven Linux artifact, selected for deployment: `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`.

Preserved Windows artifact: `eeded7009d4e56c460744ba7bdf17a52cc04a3d41fa1997903bf7622fb102bb3`.

Local evidence: `artifacts/phase4/{node-tests.log,native-tests.log,harness-tests.log,frozen-verification.json,deployment-plan.json,package-manifest.json,preparation.png}`. Native builds emitted the existing incremental-cache hard-link warning and copied files successfully; no test regression. An initial concurrent log-directory setup race was corrected before the recorded test runs. These artifacts are excluded from source uploads.

## Focused security review

| Severity | Finding / status | Treatment |
| --- | --- | --- |
| High | Known trusted full-access custody can bypass policy | Visible; separate operator credentials, no vault key passed to agent; no production sign-off |
| High | Known failed/missing callbacks can strand reservations | No auto-release, timer recovery, retirement or compensating payment; pending blocks new demo scenarios |
| Medium | SDK/transitive dependencies and public RPC execution unverified | Install only with approval; review lockfile; pass offline signing gate; then bounded testnet validation |
| Medium | Intra-block physical solvency and near-reserve runtime behavior unverified | Before/after and receipt evidence do not close this gap; no stronger claim |
| Medium | RPC/local journal/operator integrity is trusted | Exact bytecode/key/state checks, localhost-only viewer; not a light client or hostile-host defense |
| Medium | Ambiguous broadcast/finality could otherwise produce duplicate payments | Durable exclusive operation claims and hashes; single submission, read-only reconciliation, no automatic restart |
| Low | Explorer availability unverified | Never use explorer rendering alone as proof; preserve raw outcomes |

No production defect was demonstrated in Phase 4, and no contract correction was made. Prepared safety checks passed unit tests, which do not establish live-network behavior. The journal/approval JSON files are operational safeguards, not protection from an operator able to alter source, files and keys. There is no LLM, live prompt-injection defense claim, withdrawal facility or safe automatic recovery mechanism for ambiguous settlements.

## Deployment approval package and stop point

The package is locally reviewable, but **not yet authorization to execute**. Proposed approval scope:

`artifacts/phase4/package-manifest.json` lists 23 Phase 4 files and a combined 61-file local Phase 3/4 package for a future separate upload review. Credential/personal-path scanning found no matches; build artifacts, private configuration, credentials and logs are excluded. The official Git checkout remains clean. This manifest does not authorize an upload.

1. Install only the pinned SDK, review its generated lockfile, run the offline compatibility check; prepare separate protected keys and confirm the five proposed account names. Stop if compatibility or names differ.
2. Approve the finalized public-key/config hash, exact expiry and approval deadline, custody arrangement, root bootstrap and at most 8 faucet NEAR total. No automatic fallback account or funding increase.
3. Perform the eight ordered deployment transactions and five agent transactions listed above once each, with read-only reconciliation and local evidence capture. Stop on failure/uncertainty; do not delete claims or silently retry.
4. No repository upload, public visibility change, CI dispatch, mainnet action, X post or further phase is included.

Public keys, exact expiry, SDK lockfile and account availability are intentionally unresolved inputs to the **final** concrete execution approval. No external account, credential or transaction is fabricated to fill them. The next safe step is owner approval of preparation/SDK/key-custody choices, followed by review of the populated execution manifest before funding/deployment.
