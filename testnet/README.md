> Historical report: statuses and approval requirements below describe the earlier review. Current release status is in [publication readiness](../docs/PUBLICATION_READINESS.md); original transaction 9 is expired/non-execution corroborated, R3 remains UNRESOLVED, and MIT has now been adopted locally. See [dated public evidence](../docs/PUBLIC_TESTNET_STATUS.md). No successful public agent payment is claimed.

# Public testnet preparation

**Current execution tooling:** see [the corrected creation-charge approval package](../docs/PHASE4_FEE_CORRECTION.md). Owner bootstrap has finalized with 10 NEAR; the exact 13 remaining transactions require separate approval using `config.fee-reviewed.json` and `approval.fee-reviewed.json` (currently false). The outgoing envelope is 7.801 NEAR, including .201 fees, below the 8 cap. Historical commands below require these corrected inputs; do not use the superseded .173 fee permit, repeat bootstrap or regenerate keys. Local tests total 129 PASS.

**Owner bootstrap is complete; no setup, contract deployment or agent payment has executed.** The production contract is frozen. This package is not production custody software.

**Earlier pre-deployment review (historical):** installation of near-api-js 7.4.0 and eight local keys was approved; 115 tests passed before bootstrap and the subsequent budget tests. See [that earlier review](../docs/PHASE4_APPROVAL.md). The pending-installation/key steps below are historical preparation guidance; do not regenerate existing keys. SDK tests require the installed/locked dependency. The operator's actual admin file is `agentAdmin.secret.json`.

## Reproduce locally now

Windows prerequisite: Node.js 22.22.2+ (verified 24.19.0). From the project root:

```powershell
node testnet/prepare.mjs
node testnet/verify-frozen.mjs
node --test demo/test/*.test.mjs testnet/test/*.test.mjs
node demo/server.mjs
```

`prepare.mjs` writes an unsigned plan to `artifacts/phase4/deployment-plan.json`. It never loads the SDK, keys or a network client. `verify-frozen.mjs` also requires the existing local official checkout and historical Wasm artifacts; it compares all 16 baseline contract/test/workflow files. The ordinary demo remains dependency-free.

Open http://localhost:3000/testnet for **TESTNET PREPARATION**, no fabricated hashes. The page can only read local observations. http://localhost:3000 remains the separate **RECORDED SANDBOX** fallback with its 27 authentic evidence files. Stop a foreground server with Ctrl+C; do not terminate an unidentified process occupying port 3000.

## Files and execution boundary

| File | Responsibility |
| --- | --- |
| `config.example.json` | Proposed five account IDs; actual public keys and expiry deliberately unset |
| `plan.mjs`, `prepare.mjs` | Fixed actions, cap, account separation, exact-config approval binding, proven Wasm hash |
| `adapter.mjs` | Testnet/pinned-state/bytecode/key checks, policy, receipts, balances, gas and outcome verification |
| `sdk.mjs`, `sdk-smoke.mjs` | Official SDK signing/serialization boundary; runtime compatibility pending installation |
| `deploy.mjs` | Exactly one approved ordered deployment step; separate operator credential |
| `run.mjs` | Exact approved agent scenarios, independent keys, no automatic retries |
| `journal.mjs`, `reconcile.mjs` | Durable pre-broadcast hashes; read-only receipt recovery and local observation output |
| `test/` | Offline synthetic unit fixtures and loopback HTTP tests; not testnet evidence |

The browser has **no signing or submission endpoint**. Future public testnet activity is operator-driven through CLI scripts. `run.mjs` requires the credential's account/public key to match the restricted agent, and checks its onchain permission before loading it. Full-access agent, owner or vault keys are refused in this path. Administrative deployment credentials are read only by the separate deployment command.

## Approval gates — do not run yet

1. Approve the proposed IDs, faucet-only cap, full-access custody and installation of `near-api-js@7.4.0`. Check name availability before creating anything; if a name is occupied, stop and revise the package. No alternate account name is silently substituted.
2. Install only after approval; review the generated lockfile/dependency tree. Run the offline SDK compatibility gate before any account creation or transaction:

```powershell
npm install --prefix testnet --ignore-scripts
node testnet/sdk-smoke.mjs
```

The exact top-level dependency is pinned, but **no transitive lockfile exists yet**, and this SDK gate has not run. These commands download software, not chain transactions. After reviewing the generated lock, later reproduction should use `npm ci --prefix testnet --ignore-scripts`. Stop if the smoke test fails; do not change production code to accommodate tooling.

3. Prepare eight distinct Ed25519 credentials under operator control: owner, vault custody, agent administrator, merchant, attacker, and three restricted agent keys. Store secrets outside the repository, protect with OS ACLs, keep administrative keys inaccessible to the agent process. Only the three restricted agent credentials are handed to agent execution. The key material acquires permissions when installed onchain; public keys alone confer no authority.
4. Populate ignored `testnet/config.local.json` with the selected public keys and exact future expiry. Recommended mandate lifetime: one hour from the intended deployment session. Copy the example locally, without changing the pinned RPC/network/Wasm. The expected credential JSON contains `account_id`, `public_key`, `private_key`; do not paste secrets into commands, chat, config, browser or logs. Account-name checks/key generation/faucet bootstrap are operator prerequisites, not automated by this package.
5. Regenerate and review the concrete package:

```powershell
node testnet/prepare.mjs testnet/config.local.json
```

The reviewed configuration's SHA-256, Wasm digest, exact operations, approval deadline and cap must be in ignored `testnet/approval.local.json`. The generated template says `approved:false`. Change that only after explicit owner approval for the concrete package. The file is an operational guard, **not a cryptographic authorization system**; anyone controlling local files and credentials remains trusted.

6. After explicit account/funding approval, the operator creates the root owner with the approved owner public key and at most 8 faucet NEAR total. Do not use a real-funded account or a faucet that cannot satisfy the chosen account/key arrangement; report that blocker. The scripts deliberately do not automate a wallet, faucet or root-account creation flow.

## Proposed deployment commands — require approval

Run from the project root, only after the gates above pass. `$operatorKeyDir` and `$agentKeyDir` are separately protected, absolute directories **outside** this repository; set them to the approved locations. They must not be accessible to an untrusted model or web frontend. The commands pass paths, never secret strings.

```powershell
node testnet/deploy.mjs create-vault testnet/config.local.json testnet/approval.local.json (Join-Path $operatorKeyDir 'owner.secret.json')
node testnet/deploy.mjs create-agent testnet/config.local.json testnet/approval.local.json (Join-Path $operatorKeyDir 'owner.secret.json')
node testnet/deploy.mjs create-recipient testnet/config.local.json testnet/approval.local.json (Join-Path $operatorKeyDir 'owner.secret.json')
node testnet/deploy.mjs create-attacker testnet/config.local.json testnet/approval.local.json (Join-Path $operatorKeyDir 'owner.secret.json')
node testnet/deploy.mjs deploy-init testnet/config.local.json testnet/approval.local.json (Join-Path $operatorKeyDir 'vault.secret.json')
node testnet/deploy.mjs install-agent-keys testnet/config.local.json testnet/approval.local.json (Join-Path $operatorKeyDir 'agentAdmin.secret.json')
node testnet/deploy.mjs fund testnet/config.local.json testnet/approval.local.json (Join-Path $operatorKeyDir 'owner.secret.json')
node testnet/deploy.mjs mandate testnet/config.local.json testnet/approval.local.json (Join-Path $operatorKeyDir 'owner.secret.json')
```

Stop on **any** failed/unverified step. Each predecessor needs a durable FINAL success. Account creation fails atomically if an account exists; deployment refuses an existing contract. Deployment + `new(owner_id)` share a batch. No overwrite, key deletion, top-up, retry, retirement, new mandate or withdrawal is automated.

The deploy artifact is the **exact Linux production Wasm from the successful Phase 2B run**, retained at `artifacts/phase2b-closure-run/evidence/phase2a/mandatelock.wasm`; SHA-256 `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`. Do not substitute diagnostic fixtures or the different Windows build. Another machine needs the approved private artifact retrieved separately, verified by digest, at this path (or a separately reviewed config path). No download/deployment is hidden in these scripts.

## Proposed demonstration commands — require approval

Use one fresh mandate, in this order. Only `observe` reads; the other commands submit transactions and must not be run without approval.

```powershell
node testnet/run.mjs observe testnet/config.local.json testnet/approval.local.json
node testnet/run.mjs authorized testnet/config.local.json testnet/approval.local.json (Join-Path $agentKeyDir 'agent-0.secret.json')
node testnet/run.mjs direct-rejection testnet/config.local.json testnet/approval.local.json (Join-Path $agentKeyDir 'agent-0.secret.json')
node testnet/run.mjs concurrency testnet/config.local.json testnet/approval.local.json (Join-Path $agentKeyDir 'agent-0.secret.json') (Join-Path $agentKeyDir 'agent-1.secret.json') (Join-Path $agentKeyDir 'agent-2.secret.json')
```

Expected, **not yet observed on testnet**:

- Authorized: application nonce 0, .10 NEAR to merchant; ALLOW; actual successful transfer/callback; A=.90/P=0/S=.10.
- Scripted redirect: deterministic BLOCK, no transaction. The operator-run command captures this policy result against fresh final state.
- Direct rejection: separate exact .10 request, application nonce 1, attacker recipient; restricted agent key; ERR_RECIPIENT at vault; no transfer or budget change. This explicit security fixture bypasses the offchain policy, not contract authorization.
- Concurrency: application nonces 2/3/4, .40 each, three independent keys and access-key nonces. Two successes + one ERR_BUDGET. Final **A=.10/P=0/S=.90**, because .10 was spent earlier. Expected new merchant gain .80. These exact reviewed stress calls bypass the local REVIEW hold.

No promise of simultaneous inclusion is made. All three broadcasts start before awaiting finality, and all must reach the contract. A nonce conflict or missing receipt invalidates the proof. The cumulative budget is the same 1 NEAR throughout; no reset or refund is used to make the demonstration work.

## Evidence, uncertain outcomes and reproduction

Each operation claims an exclusive local journal under `artifacts/phase4/live/<config-hash>/`. It records the transaction hash and exact call **before the only broadcast attempt**, then raw final transaction/receipt outcomes, before/after snapshots and assertions. These are sensitive operational evidence files to review before any future upload; they contain public metadata, not private keys or signed bytes.

The viewer reads `artifacts/phase4/live/session.json`, shows timestamps, real hashes, status, receipt logs/gas, balances and fixed testnet explorer links. Refresh rereads local observations; it is not an always-current RPC feed. Public testnet observations and sandbox recordings never silently replace each other. Raw receipts remain the fallback if the explorer is unavailable.

If broadcast/finality is uncertain, do not rerun the scenario, delete its journal, change nonce, retire the mandate or infer failure from a timeout. Read the known hash instead:

```powershell
node testnet/reconcile.mjs testnet/config.local.json ACTUAL_TX_HASH ACTUAL_SIGNER_ID
```

This command only queries receipts. Its result does not clear claims or restore budget. A signed-but-not-final operation requires manual review against chain outcomes before any new authorization. Existing pending state blocks subsequent scenario execution. Logs survive failed assertions. Full-access keys and local journal/RPC integrity remain trusted; this is not a secure autonomous wallet service.

## Two-minute judge script

Prepare deployment outside the two minutes; public finality can take longer. Do not claim it finished on schedule if receipts remain pending.

| Time | Action and explanation |
| --- | --- |
| 0:00–0:20 | Show owner-created mandate, 1 NEAR budget, .40 ceiling, merchant allowlist and restricted agent receiver/method. Identify public testnet mode. |
| 0:20–0:45 | Execute approved .10 payment; refresh. Show actual hash, merchant delta, terminal callback and A=.90/P=0/S=.10. |
| 0:45–1:05 | Show scripted malicious recipient proposal and deterministic BLOCK. Explicitly say no LLM and no broadcast for this policy decision. |
| 1:05–1:25 | Submit the independently approved direct attack; show vault receipt ERR_RECIPIENT and unchanged budget/attacker balance. |
| 1:25–2:00 | Submit three independent .40 requests. Show keys/hashes, two settlements, one budget rejection and final A=.10/P=0/S=.90. Leave unresolved outcomes visibly pending. |

If the live path is unavailable, say so and select the recorded sandbox fallback. Never label the recording as a new public testnet run.

See [Phase 4 security review and approval package](../docs/PHASE4.md). Stranded reservations, trusted full-access custody, unverified intra-block solvency and **no production custody sign-off** remain visible in both UI modes.
