# MandateLock agent security demo

Windows localhost demonstration using a frozen NEAR contract and authentic recorded sandbox evidence. **Deterministic attack fixture, not an LLM. Recorded transactions, not live execution.** No wallet, private keys, funded account, Docker, WSL, npm install or external API is needed.

## Start on Windows

Prerequisite: Node.js 22 or later (verified with 24.19.0); Chrome or another modern browser. From the MandateLock project directory:

```powershell
node --version
node demo/evidence.mjs
node demo/server.mjs
```

Open **http://localhost:3000**. Keep the terminal running; Ctrl+C stops the server. It binds to **127.0.0.1 only**. If port 3000 is occupied, stop your own previous demo instance first; do not kill an unidentified process. Startup fails if evidence or frozen production inputs differ. No rebuild or download is needed: the 27 selected JSON files are included under `demo/evidence/`.

Equivalent commands: `npm --prefix demo start`, `npm --prefix demo test`, `npm --prefix demo run verify`. There are no npm dependencies or install step.

## Two-minute judge sequence: do this → see this

1. **Create mandate** → choose **Replay mandate creation**. Inspect the actual owner-signed `create_mandate` transaction, 1.00 NEAR budget, 0.40 ceiling, agent, recipient allowlist and expiry. This does not create a new mandate.
2. **Authorized payment** → **Run policy + replay payment**. Local decision **ALLOW**; exact historical call match. Available becomes .90, pending 0, spent .10. Actual recipient received .10 NEAR. Expand receipt outcomes for reservation/callback events and gas; open the raw transaction or before/after snapshots.
3. **Malicious instruction** → **Evaluate proposal**. The explicitly scripted message supplies an attacker-recipient proposal. **BLOCK**: owner allowlist cannot be changed by instruction text. There is no transaction for this local BLOCK. **Show REVIEW example** gives .30 NEAR to an approved recipient: **REVIEW**, no signing/broadcast. REVIEW is an offchain hold, not contract authorization.
4. **Onchain rejection** → inspect a separate independently submitted sandbox transaction that bypassed the local gate. **ERR_RECIPIENT**, FINAL failure at the vault; balances remain A=1/P=0/S=0. This is contract enforcement, not a claim that a local policy check submitted the attack.
5. **Competing payments** → inspect three .40 requests with different public keys and hashes, all reaching the vault. Two succeed; one fails **ERR_BUDGET**. A=.20/P=0/S=.80; pending overlap observed. No nonce conflict was counted as budget protection.

The three account fixtures are independent. The UI names each fixture and checkpoint; navigating steps selects recorded state, not a continuous new ledger. The historical policy clock is explicit. These mandates are not current live authorizations. The extra `absent.*` allowlisted recipient in the source fixtures supported genuine native-failure testing; it is visible in the authority details.

## Run the minimal agent integration

```powershell
node demo/agent.mjs authorized
node demo/agent.mjs redirect
node demo/agent.mjs review
node --test demo/test/*.test.mjs
```

Expected decisions: **ALLOW / BLOCK / REVIEW**, respectively. ALLOW produces a bounded call description: approved agent/public key, exact vault receiver, `execute_payment`, zero attached deposit, fixed 100-Tgas call budget and mandate/nonce arguments. The recording adapter only returns evidence when every call field matches an actual recorded transaction. A different valid amount yields **UNVERIFIED**, not an invented success. BLOCK and REVIEW cannot build or execute calls.

Authority is extracted from actual successful AddKey transactions and checked against payment signing keys: separate agent account, exact vault receiver, method list containing only `execute_payment`, finite gas allowance. The key allowance covers gas; the contract enforces spending. No full-access signing key is loaded into this demo. The source sandbox retained trusted full-access keys; this is an explicit limitation, not a keyless-custody claim.

The policy gate uses integer yoctoNEAR, explicit trusted policy context, hard limits before the .25-NEAR REVIEW threshold, replay/expiry checks and strict proposal fields. It does not interpret arbitrary language, assess invoice legitimacy or promise prompt-injection immunity. A malicious agent may bypass this offchain gate; the recorded independent rejection/concurrency cases demonstrate the contract boundary. A snapshot ALLOW is not a reservation or guarantee that a future transaction will succeed.

## Evidence and reproduction

Source: [successful Phase 2B run 41205116391](https://github.com/onchainbuilds/MandateLock/actions/runs/41205116391), commit `75051c2fc7ecff6390c49fa67274d70d275d07c8`, 75 PASS / 0 FAIL. Those are prior sandbox results, separate from the 17 new local demo tests. The private GitHub run requires access, but included JSON evidence works offline. The manifest records source commit, artifact SHA-256 and every selected file's hash. Hash checks detect changes relative to this manifest; this app is not a cryptographic chain-proof verifier or public explorer.

Re-export only if the original downloaded artifact remains at `artifacts/phase2b-closure-run/evidence` and the official local checkout retains the proven commit:

```powershell
node demo/export-evidence.mjs
node demo/evidence.mjs
```

Ordinary users **do not need to re-export**. The exporter checks the original downloaded-file hash manifest and copies raw bytes, without fetching new data. The frozen production manifest checks source, original tests, dependency locks and toolchain. Production Wasm is not bundled with the web app.

For new sandbox evidence, the existing Linux near-workspaces 0.23.0 suite is the execution path; see the prepared manual workflow and [Phase 2B commands](../docs/PHASE2B.md). Do not label the UI live just because a future run exists. Import it as a new recording with its provenance, or implement and review a live transport separately. This Phase 3 work did not run Linux/Docker/WSL, dispatch CI or submit any chain transaction.

## Files and trust boundaries

- `agent.mjs`: deterministic evaluator, restricted call builder, exact-match recorded transport and CLI fixtures.
- `evidence.mjs`: startup integrity/finality/key checks and read-only fixture registry.
- `server.mjs`: dependency-free Node HTTP server; same-origin JSON evaluation; explicit asset/evidence allowlists; no signer/deploy/broadcast endpoint.
- `public/`: vanilla HTML/CSS/JS. No external fonts, analytics, CDNs, frameworks or animations.
- `test/`: policy boundaries, replay honesty, existing transaction evidence and localhost HTTP safeguards.

## Safety limitations and future testnet

Failed/missing callbacks can strand pending reservations indefinitely. Never restore uncertain budget based on a timer or a balance increase. Retained owner/vault full-access keys are trusted and can bypass policy. Block-end snapshots do not prove every intra-block solvency state. There is no unrestricted withdrawal or production custody security sign-off.

The browser uses recorded sandbox transactions. The separate public testnet run settled T4 and rejected T5. Verify it with `node scripts/verify-final-testnet.mjs` from the repository root. [Final public receipts and balances](../docs/LIVE_TESTNET.md).

Official track context: [AI Security & Defense](https://nearhackathon.com/#tracks) emphasizes spending controls, policy engines and limited agent authority. [Official NEAR key documentation](https://docs.near.org/protocol/accounts-contracts/access-keys) explains receiver/method restrictions and gas allowances. The local-only submission requirements, license, video, public repository and eventual X post require separate review/approval; nothing is published by running this demo.
