# Phase 3 — AI security demo and localhost

Date: 2026-10-31. Official repository: `onchainbuilds/MandateLock` (private).

**GO for the local recorded-evidence demonstration. NO-GO for production custody. Live testnet execution remains unimplemented and approval-gated.** Production is frozen at `75051c2fc7ecff6390c49fa67274d70d275d07c8`.

## What runs now

The dependency-free Node server runs at **http://localhost:3000**, bound to `127.0.0.1`. Vanilla HTML/CSS/JS presents owner mandate creation, authorized payment, malicious recipient proposal, independent onchain rejection and concurrent budget enforcement. Windows Node 24.19.0 and Chrome were used for verification; Node 22+ is documented.

This is explicitly **recorded sandbox evidence with a deterministic attack fixture, not a live LLM or live blockchain demo**. The policy evaluator executes locally now. Chain transactions, receipts and balances come from the prior successful Linux sandbox run. Buttons do not create accounts, sign, broadcast or deploy. Separate fixtures and the recorded policy clock are displayed so old authorizations cannot be mistaken for current permissions.

The agent accepts structured proposals. It applies recipient, ceiling, budget, expiry, nonce and authority checks before a deterministic review threshold (amounts at least .25 NEAR). ALLOW constructs only `execute_payment`, exact vault/approved agent key, zero deposit and fixed gas. REVIEW holds without executing; BLOCK cannot construct a call. Instruction text cannot replace trusted mandate context. This is not language understanding or a general prompt-injection immunity claim.

The transport matches every call field against an actual recording. A valid proposal without a matching recording is **UNVERIFIED**, never an invented success. ALLOW does not reserve funds or guarantee future chain acceptance. The malicious instruction is scripted; the independent sandbox rejection demonstrates enforcement when the offchain gate is bypassed.

Successful AddKey transactions establish recorded receiver/method restrictions. Key allowances pay gas; the contract enforces spending. See [official NEAR access-key semantics](https://docs.near.org/protocol/accounts-contracts/access-keys). No signing credentials are loaded. Sandbox full-access deployment/owner keys remain trusted.

## Evidence and results

Source: [Phase 2B run 41205116391](https://github.com/onchainbuilds/MandateLock/actions/runs/41205116391), commit `75051c2fc7ecff6390c49fa67274d70d275d07c8`, **75 PASS / 0 FAIL**. All original 12 Phase 2A scenarios remain preserved. That suite was **not rerun** during Phase 3. No Docker/WSL troubleshooting or CI dispatch occurred.

| Check | Result | Scope |
| --- | --- | --- |
| Original native contract tests | PASS: 44 | Rerun locally, unchanged |
| Phase 2B accounting models | PASS: 8 | Rerun locally, unchanged |
| Existing harness regressions | PASS: 7 | Original four plus three closure regressions |
| New agent/HTTP demo tests | PASS: 17 | Policy boundaries, exact replay, evidence, server safeguards |
| Local total | **PASS: 76 / FAIL: 0** | Separate from historical sandbox total |
| Browser judge sequence | PASS | Chrome: creation, ALLOW replay, BLOCK, REVIEW, rejection, concurrency |
| Recorded evidence integrity | PASS | 27 raw JSON files match original downloaded-file hashes |
| Production freeze | PASS | Ten source/test/dependency inputs match baseline; Windows Wasm digest unchanged |
| New live sandbox / testnet / LLM | UNVERIFIED / not enabled | No new execution claimed |
| Every intra-block solvency state | UNVERIFIED | No stronger claim than Phase 2B observations |

Local logs: `artifacts/phase3/native-tests.log`, `harness-tests.log`, `demo-tests.log`. These ignored artifacts are not upload candidates. Initial demo-test issues were environmental loopback denial and a test client ignoring a supplied Host header; permission and use of a real HTTP Host header corrected the test setup. They revealed no production contract defect.

### Representative genuine transactions

| Scenario | Transaction hash | Recorded outcome |
| --- | --- | --- |
| Owner creates mandate | `6VCgSdWQXGdkuRoenCy1FeHrZDwmosBrHdbN1rGwjDCK` | Successful owner-signed setup |
| Authorized .10 payment | `GEWrxsiERLQPMDU27oMtprXta3b4YS2Z3L44rWrWgvQs` | Transfer/callback succeed; A=.90 / P=0 / S=.10 |
| Unauthorized recipient | `8awAJCgPyGTzNs8svQiBqwUbw6KvNhgU5pd9SDzRHyGZ` | FINAL ERR_RECIPIENT; A=1 / P=0 / S=0 |
| Concurrent .40 request | `8HtK9FveyKaQV9Qind6Dz6Nzvv8EQTUYj9VRqvQ1yN1K` | ERR_BUDGET at vault |
| Concurrent .40 request | `H1CTi6ZZewo4TGhnfoTcZ6NbvNtg5tG4XZXjmDJTLHRf` | Settled |
| Concurrent .40 request | `J7HRsiNEdbwt7GUhVeUZLQMX9kTXLkkvCLjNBaZCawFW` | Settled |

Three competing transactions used distinct restricted public keys and hashes; all reached the vault. Two payments total .80 against budget 1; final A=.20/P=0/S=.80. Pending overlap was observed in the source run. No nonce conflict counts as enforcement. These direct calls bypass the local REVIEW threshold.

Authorized fixture physical vault: 11.0000704928390809 NEAR before, 10.9001804741237767 after; required liquid backing 2.71045 before, 2.61045 after. Recipient gains exactly .10. Concurrency ends at physical 10.2003146891207616 and required backing 1.9105. Gas refunds affect vault deltas; spending is not inferred solely from balance subtraction. The UI links snapshots and displays receipt IDs, executors, outcomes, reservation/settlement events and Tgas.

For the authorized payment, receipt `4EhptKMjLQGQ2yqb57xrnms45RrTjvZAiTbFwJULRQE5` emits `payment_scheduled` (A=.9/P=.1/S=0), using 3.048218 Tgas. Callback receipt `2V7C6FburW1FwbZLndATtjmYzRT1uhB5RNxvtxGtKz8K` returns true and emits `payment_succeeded` (A=.9/P=0/S=.1), using 2.394319 Tgas. These displayed gas values are rounded from the raw receipts, not worst-case guarantees.

`demo/evidence/manifest.json` records provenance and per-file hashes. Source artifact SHA-256: `fa6f6470af9e214cbfd43dd1b19632816b59667fc3e0bcd8691b3cbf7903b6ef`. Hash checks detect changes relative to the manifest; this is not independent cryptographic chain-proof verification. No public explorer is claimed for ephemeral sandbox hashes.

## Changes and preservation

New `demo/` contains the policy evaluator/CLI, recorded transport, evidence verifier/exporter, HTTP server, three frontend files, 17 tests, metadata, frozen-input manifest, guide and selected raw evidence. Root README is updated; this report is new. Production Rust, Cargo dependencies, existing tests, workflows and Wasm are unchanged.

The exporter validates selected raw files against the original downloaded-file manifest and frozen source against the baseline commit. Ordinary reproduction needs only included evidence; ignored historical artifacts and private GitHub access are not prerequisites. There is no npm installation.

Production hashes:

- Windows Wasm: `eeded7009d4e56c460744ba7bdf17a52cc04a3d41fa1997903bf7622fb102bb3`.
- Prior Linux Wasm: `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87` (historical, not rebuilt here).

Approval package: root README, this report and `demo/`. Exact files/hashes: `artifacts/phase3/package-manifest.json`. Caches, build directories, credentials, personal paths, full historical artifacts and process/log files are excluded. Official checkout/remotes are unchanged; nothing is staged, committed or uploaded.

Final package review covers 42 files. Secret/personal-path scanning found no matches. All 16 baseline contract, integration-test and workflow files checked byte-for-byte remained unchanged; the ten-input startup lock is an additional demo guard.

## Reproduction and judge sequence

From the project directory on Windows:

```powershell
node --version
node demo/evidence.mjs
node --test demo/test/*.test.mjs
node demo/agent.mjs authorized
node demo/agent.mjs redirect
node demo/agent.mjs review
node demo/server.mjs
```

Open http://localhost:3000 and follow steps 01–05; expand receipts/raw snapshots. Expected policy decisions: ALLOW, BLOCK, REVIEW. Only ALLOW with the exact historical call returns a recording; none broadcasts. Ctrl+C stops a foreground server. [Full do/see guide](../demo/README.md).

Existing Rust tests rerun with cached dependencies:

```powershell
cargo test --locked --offline
cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline
```

The server rejects non-local Host headers, cross-origin evaluation, oversized/non-JSON bodies and unknown paths. It serves allowlisted assets and verified raw bytes, uses text-only DOM rendering and a restrictive CSP. These safeguards do not make an arbitrary localhost environment a secure key store. No secrets belong in the demo/browser.

## Remaining security limitations

1. **Stranded reservations:** failed/missing callbacks can leave pending indefinitely, after either a paid transfer or eventual refund. No timer, balance heuristic or demo action releases uncertain budget. Recovery requires trustworthy outcome proof and separate design review; none is added.
2. **Full-access custody:** retained owner/vault keys can replace code or move funds, bypassing policy. Restricted agent permissions do not solve custody. Trusted sandbox deployment keys are not production security.
3. **Intermediate solvency:** events and block-end snapshots support tested accounting, but do not verify every intra-block receipt ordering/balance state. Phase 3 adds no such proof.
4. **No production sign-off:** no independent audit, unrestricted withdrawal or recovery scheme. Unallocated/pending funds may remain stranded. Policy decisions do not establish invoice legitimacy or intent.

## Proposed testnet plan — not executed

1. Obtain approval for named disposable testnet owner, vault subaccount, agent and recipients, faucet-only funding cap, custody and exact actions. No mainnet funds. Remote commits/CI require separate approval.
2. Build frozen source with supported Linux cargo-near; compare against the baseline/environment and record versions/artifact digest. Do not silently accept changed production Wasm.
3. Owner initializes its vault subaccount and funds a 1-NEAR mandate plus measured storage/operational reserves, .40 ceiling, recipient allowlist and expiry. Determine sufficiency from storage/gas; keep funds bounded and disposable given lack of withdrawal/recovery.
4. Install agent function-call keys: exact vault receiver, only `execute_payment`, finite gas allowance and zero attached deposit. Use three independently signed keys for concurrency. Document every full-access holder and retention/removal consequences; do not claim custody protection while those keys bypass policy.
5. Implement/review a distinct live transport. Fetch fresh final state, chain time and key permissions. Hold only restricted agent secrets in a protected local backend, never browser/source/logs. Label LIVE TESTNET and distinguish submission/pending/final settlement. ALLOW remains advisory; the contract reserves atomically. Changing an RPC URL alone cannot enable live mode.
6. Run approved payment, independent rejection and three .40 transactions. Preserve tx/receipt IDs, keys, callback events/gas, recipient/vault balances, storage backing and A+P+S=B. Nonce conflicts invalidate concurrency proof. Requery ambiguous outcomes; never issue a second payment or release pending because a callback is missing.
7. Review results and custody/recovery gaps before further phases. Testnet success is not production sign-off. Publication, social posting and hackathon submission are separate approvals.

## Track alignment and submission boundary

Spending limits and independently enforced agent permissions align with [AI Security & Defense](https://nearhackathon.com/#tracks). The demo shows why an instruction cannot grant payment authority, using genuine contract evidence.

The [official HACKATHON.md](https://nearhackathon.com/HACKATHON.md), read 2026-10-31, permits local-only demos with a reproducible public repo and demo video; screenshots alone do not satisfy that route. A license is required. Q-001 permits work from the October 19 announcement; submissions run November 1–14 UTC. Identify any earlier baseline and eligible diff before submission; no tags or eligibility guarantee are created here. Recheck changing rules before publication.

License choice, baseline/diff disclosure, public visibility, video/X post, team/contact details and submission payload remain owner decisions. The private repository and recorded demo are **not a completed hackathon submission**. No publication, upload, CI dispatch, account creation, deployment or token spending occurred in this phase.
