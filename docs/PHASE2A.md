# MandateLock — Phase 2A sandbox validation status

Updated: October 31, 2026. **The corrected approved Ubuntu run succeeded: all twelve mandatory sandbox scenarios PASS, 44 native tests PASS, four harness regressions PASS. GO for the tested Phase 2A sandbox scope. Full security validation and Phase 2B remain NO-GO pending the additional gates below.**

## Corrected GitHub run — latest authoritative result

- Repository: [shadehook/MandateLock](https://github.com/shadehook/MandateLock), verified **private** before push and after execution.
- Commit: [`a539ef3b4a243afb7376067b40b052645d5f1111`](https://github.com/shadehook/MandateLock/commit/a539ef3b4a243afb7376067b40b052645d5f1111).
- Workflow: [41198135753, attempt 1](https://github.com/shadehook/MandateLock/actions/runs/41198135753), **SUCCESS**; job ran October 31, 11:45:03–11:51:42 UTC (6m39s).
- [Evidence artifact 13041995627](https://github.com/shadehook/MandateLock/actions/runs/41198135753/artifacts/13041995627): 1,225,674 bytes; SHA-256 digest `a19e2992f0b53a179d6dfe057c0d7f1407aeaf5d1d89d5f3195323a01001f5c0`; retention until November 14, 2026, 11:51:38 UTC.
- Downloaded evidence: `artifacts/phase2a-corrected/evidence/`; full workflow log (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), raw results (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), independent evidence analysis (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), verification summary (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).

Exactly the six reviewed files were committed/pushed after their hashes, content scan and scope were rechecked. Exactly one corrected workflow was dispatched. The earlier failed run is the only other repository run; neither was rerun. Production source/test hashes remain unchanged. No Docker/WSL attempt, public-chain transaction, repository publication, X post, frontend development or Phase 2B work occurred. This result report is a local update, not an additional push.

### Observed environment and build

Ubuntu 24.04 / Linux x86_64; Rust/Cargo 1.93.0; SDK 5.29.1; cargo-near 0.22.0; near-workspaces 0.23.0; sandbox 2.13.4, protocol 86. Native suite **44/44**, harness guard tests **4/4**, formatting, strict Clippy, actual Wasm build and real sandbox test all passed. The Wasm is 159,542 bytes, SHA-256 `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`, matching the prior Linux build and the downloaded artifact. All twelve fixtures verified their deployed bytes against this Wasm.

GitHub emitted a nonblocking Node 20 action-runtime deprecation annotation; checkout and artifact upload were automatically run on Node 24 and passed. This was not a test failure and no workflow dependency was changed during execution.

### Twelve mandatory scenarios

**12 PASS, 0 FAIL, 0 UNVERIFIED** for the mandatory suite. Expected rejection transactions correctly have failure outcomes; their tests PASS because the intended authorization/budget check rejected them. Full hashes below identify synthetic local-sandbox transactions, not public explorer transactions.

| # | Scenario | Result and actual transaction evidence |
| --- | --- | --- |
| 1 | Authorized payment | **PASS** — `ELK5LSL7eUPFisCR4JjMxnwLtb2k8M1a7bFrBMXyL2x5`; recipient +.10, callback true |
| 2 | Unauthorized recipient | **PASS** — `Am2PS4KZmdLBhP19766zLYRVDHLDnPn9zy5ndEzd927j`; ERR_RECIPIENT, no transfer |
| 3 | Transaction ceiling | **PASS** — `8qRVVDg72ZQLn3CRZcooACXPktDX8q6VznDPkG4xCacR`; ERR_PER_TX_LIMIT |
| 4 | Cumulative budget | **PASS** — .40 + .40 + .20 settled; `CAQHAaxg6NRKuUPpHXkJyigTtz8d52DdsyKTWNcGfgb` rejected one further yocto with ERR_BUDGET |
| 5 | Expired authorization | **PASS** — `G7KRwo183oJ3oykwjqEDHr6HsHV9uyWUhhN7Bgm8fQuv`; verified post-expiry timestamp, ERR_EXPIRED |
| 6 | Replay | **PASS** — `D1AdmDZzMoh6PuK8SW9iAwjczjkxneGdSgKJ7XRWZvPM`; ERR_NONCE_USED after a successful payment |
| 7 | Unauthorized administration | **PASS** — `FJLe3DXw3pZzUKMFUdqSZLmmLEd9fRkMSTR3ojD5aKi7`; ERR_OWNER |
| 8 | Restricted agent key | **PASS** — protocol returned InvalidAccessKeyError(MethodNameMismatch) for revoke; no transaction was included and no receipt/hash was returned in the saved diagnostic |
| 9 | Forged callback | **PASS** — `LUNYRg7eNPMmRznfxdRdjgd2G9fm69ev1ZrgrLdkjhz`; private-method rejection |
| 10 | Successful asynchronous settlement | **PASS** — `J4gqpSUUbwV3ohELRNuUb8s9QF7L6hraE5iRi6MPvNgV`; callback true, A=.90/P=0/S=.10 |
| 11 | Genuine native failure | **PASS** — `A8fAaRZaznmMvgWb8t2gZXVimmmSRePyR7dPeh7eAqYR`; real AccountDoesNotExist transfer receipt, callback false, A=1/P=0/S=0 |
| 12 | Three independent .40 requests | **PASS** — three distinct keys/hashes and vault executions; two settled, one ERR_BUDGET; actual pending overlap .80 |

Additional sequence hashes: budget accepts `Ey2wYnj24e6NZkR7B46mGJF71zr6fbupYQnuH4W1bLjE`, `BEEkrnCJWcQN6wBeJeBKhBv1n8eHWpr72uEgNn1f6ymP`, `FtciYsaqWrDBuKCqMpHeJnU4Sm4jCJ7PFPP5oKWLS3Wf`; first replay-case payment `ALQn5caFQcnKQz4LjJCfM9DtJsC6vowZ6V7wMto2psCS`; failed-slot replay `Axwg4i1FR8wTdzzQN1zPRp7KMVrPC4bJ6XYqCZRuPSdt` returned ERR_NONCE_USED. There are **18 recorded target transactions at FINAL**, in addition to setup transactions and the restricted-key protocol rejection.

### Expiry timestamps

The finalized pre-payment snapshot at block **427** recorded stored expiry **1793447437173942498 ns** and observed block timestamp **1793447437267223105 ns**. The observed timestamp is **93,280,607 ns later**, strictly beyond expiry. The deadline and timestamp were read together before payment submission; the contract returned ERR_EXPIRED, left the slot unused, and left recipient/principal unchanged. Evidence: expiry observation (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), pre-payment snapshot (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), transaction (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).

### Independently submitted concurrency transactions

All calls used signer `agent.concurrency.test.near`, three different approved function-call keys, amount .40 NEAR and separate application slots. All broadcast tasks completed before the harness awaited execution; the recorded completion time was **6,244,279 ns** after the local concurrency timer began. Their vault execution receipts share block hash `FKkdJP7CZVHA6H52zxCHGvNXPNnfTRjntAaLLKXA4Xb4`. No nonce conflict occurred.

| Slot / access-key tx nonce | Public key | Transaction hash | Outcome |
| --- | --- | --- | --- |
| 0 / 884000001 | `ed25519:7aY1BjsoqSQPdUkcEbhj6QtTsozKTbfPzbFK6N5mvKxb` | `HrM5is7PPkNAknb1mHbBdgJJaTD1EcEspJkHjg42mTvT` | Success; callback true |
| 1 / 889000001 | `ed25519:DV6pDou3bp989rP5gQ2d5amEG5VGJVrFKLTYeZdfZMtb` | `Dw4CyEBYAm86QkHzTtN7yAtge5HBoAWUKJRKmwzF3KBn` | Success; callback true |
| 2 / 894000001 | `ed25519:FMy5CS35Qvp3Pj2WU7XEXcsutm3pFpMndNB7Pfyb6z9K` | `FNadh5h9esGrSamawrJarnsxSWhtrpbaD9KnaWb7Z2HK` | Vault receipt ERR_BUDGET |

Vault execution receipt IDs are respectively `DDA3MeVRw21wrpR37VgQGKzP3xH6wxNoheq8W672ZNiY`, `2ivnMaU5gn2ukNvaArumbBmMQekVoXG95qU4bokBChHa`, and `9fsEhZ7Q4JPSKYyXzwcW7DPzANELXbRYvyvJz3bXiWA6`. Scheduling logs show pending rose from .40 to **.80 while spent was still zero**. Both transfers later settled, leaving A=.20/P=0/S=.80 and recipient +.80. Broadcast completion (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), summary (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), all three raw transactions (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).

### Genuine failure and callback evidence

The receiver `absent.failure.test.near` was verified absent. Native transfer receipt `EyDQymetb6sPtv3C2SW9zVAui8xz6yUmCtwJLM9dn9DD` failed with **AccountDoesNotExist**. Callback receipt `Fdbeyv3a3CsTsAnAmwpogbZNwYJUPAinwxDgfGv5LaPf` then succeeded normally, returned **false**, emitted payment_failed and burned **2.380352400690 Tgas**. Slot 0 remained Failed and could not be replayed; available budget returned to 1 with no pending/spent balance. Final physical balance shows no loss of the .10 principal. This is a real transfer failure, not a simulated callback outcome. Raw failed-transfer transaction (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).

The authorized payment's callback `D9YW7pkDmTCQVAsGb6vzF11mXTPLanP2vipqrjiumAfJ` returned **true**, burning **2.394705073755 Tgas**. The dedicated settlement callback `2a2FSqw5u6ZNEYNaLonHSKbWHuTUjQ4328u4G1b1E8mU` returned **true**, burning **2.401251349863 Tgas**. Across all **nine terminal callbacks**, eight returned true and one false; measured gas ranged **2.380352400690–2.416230832134 Tgas**, below the allocated 15 Tgas. Every callback result and receipt is retained in the verification summary (historical local-only reference; excluded from public snapshot; result retained without inventing evidence). This is not a worst-case input/state gas proof.

### Physical vault balances and accounting

Independent post-download checks confirmed **46 final-block snapshots** satisfy A+P+S=B and physical balance >= storage/operating floor + U + A. All twelve setup configuration transactions reached FINAL before the fixture-ready snapshots. Selected exact balances (NEAR):

| Case | Vault before | Vault after | Required backing after | Recipient before → after | A/P/S after |
| --- | --- | --- | --- | --- | --- |
| Authorized .10 | 11.0000704364144744 | 10.9001804413945430 | 2.61045 | 1 → 1.1 | .9/0/.1 |
| Genuine failed .10 | 11.0000710352656824 | 11.0001806333262734 | 2.71034 | Absent account; transfer failed | 1/0/0 |
| Three competing .40 | 11.0000716143986525 | 10.2003146972907287 | 1.91050 | 1 → 1.8 | .2/0/.8 |

Storage/operating floors for these fixtures were respectively 1.71045, 1.71034 and 1.71050 NEAR; storage usage was 165,949, 165,938 and 165,954 bytes. The budget-exhaustion case ended with recipient balance 2 NEAR and A/P/S=0/0/1. Expected gas rewards mean vault balances are not exact principal-only round numbers; residuals were bounded by recorded fee totals. All balance snapshots and derived checks (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).

These are finality-pinned endpoint measurements. They do **not** prove physical solvency after every intervening receipt, or independently decompose each refund/reward amount. Pending reservation overlap was observed through contract logs, not a physical-balance measurement at each reservation.

### Defects, remaining gaps and decision

The previous failures were harness failures: the finality repair allowed all twelve fixtures and scenarios to execute, and the timestamp check established the expiry precondition. No corrected-run harness failure or confirmed production-contract defect was observed. No production code was modified.

**GO for the twelve-scenario Phase 2A sandbox validation scope.** The mandatory suite now has executable, independently inspected evidence, including genuine native failure and valid concurrent transactions. **NO-GO for complete security sign-off / Phase 2B readiness** until the already-identified additional gates are addressed or explicitly scoped by the user:

- **UNVERIFIED:** controlled missing/out-of-gas callback with evidence that reserved budget never auto-restores; native-model tests alone do not establish real fault behavior.
- **UNVERIFIED:** genuine duplicate private callback delivery; forged-callback rejection and native idempotency tests are narrower evidence.
- **UNVERIFIED:** physical solvency at every asynchronous receipt/refund stage and exact reward/refund decomposition.
- **UNVERIFIED:** worst-case callback gas/storage profiling across maximum-size policy inputs.
- Retained full-access vault keys can bypass contract policy, and owner-account delegated administrative keys retain owner authority. Those trust limitations are unchanged; stranded-fund/recovery limitations remain.

The additional-unverified artifact (historical local-only reference; excluded from public snapshot; result retained without inventing evidence) preserves the fault/solvency limits even though the mandatory suite is green. No additional run or Phase 2B action was taken.

### Reproduction and executed actions

Reproduce on approved Linux using the pinned workflow at the commit above. The decisive command was `cargo test --manifest-path integration-tests/Cargo.toml --features sandbox-install --locked --test sandbox -- --nocapture`; root native tests and harness `--lib` regression tests ran beforehand. Exact runner commands/output are in the workflow log.

After approval, the local six-file allowlist was staged and committed as `Repair Phase 2A setup finality and evidence capture`; one normal push advanced main from `aafa39088174acee179dfc17647e0202b3ee4879`. One `gh workflow run phase2a-sandbox.yml --repo shadehook/MandateLock --ref main` dispatched run 41198135753. Read-only watch/view/download/API calls collected results and verified private visibility and run inventory. Raw evidence from the previous failed run was retained separately.

## Historical repair preparation and first-run findings

## Local harness repair — awaiting approval

The finality/snapshot race and missing expiry precondition have been corrected
locally, with stronger receipt, raw-state, balance and failure capture. The
concurrency case verifies independently signed calls, distinct hashes and actual
vault execution and rejects nonce conflicts. Production code and dependency
versions remain unchanged. See [PHASE2A_HARNESS_REPAIR.md](PHASE2A_HARNESS_REPAIR.md)
for the root cause, exact changes, expiry methodology and six-file proposed commit.

Local verification passed: 44 existing native tests, four new harness guard
regressions, root/integration formatting, strict native/integration Clippy,
integration type-check and full Windows integration executable compilation with
`--no-run`. Logs: native tests (historical local-only reference; excluded from public snapshot; result retained without inventing evidence),
native Clippy (historical local-only reference; excluded from public snapshot; result retained without inventing evidence),
type-check (historical local-only reference; excluded from public snapshot; result retained without inventing evidence),
harness regressions (historical local-only reference; excluded from public snapshot; result retained without inventing evidence),
integration Clippy (historical local-only reference; excluded from public snapshot; result retained without inventing evidence),
integration executable build (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).

No remote action, Docker/WSL retry or token expenditure occurred in this repair.
The corrected suite has not run on Linux. All twelve corrected scenario results
remain UNVERIFIED; the historical failed run below is preserved without relabeling.
One corrected private push and one manual run await explicit approval.

## Actual GitHub execution — latest result

- Private repository: [shadehook/MandateLock](https://github.com/shadehook/MandateLock).
- Commit: `aafa39088174acee179dfc17647e0202b3ee4879` (exactly the sixteen approved files).
- Workflow: [41197070066, attempt 1](https://github.com/shadehook/MandateLock/actions/runs/41197070066).
- Job: [real-sandbox](https://github.com/shadehook/MandateLock/actions/runs/41197070066/job/124525302964), October 31, 11:29:45–11:34:37 UTC, duration 4m52s, conclusion **failure**.
- Evidence: [GitHub artifact 13041059184](https://github.com/shadehook/MandateLock/actions/runs/41197070066/artifacts/13041059184), retained until November 14, 2026, 11:34:34 UTC. Downloaded locally under `artifacts/phase2a-github/`.

Before creation, authenticated GitHub identity was verified as `shadehook` with repository/workflow scopes; querying the proposed repository returned HTTP 404. Creation returned owner `shadehook`, private visibility and admin permission. Ownership/privacy were checked again before push and after execution. The final remote inventory shows exactly one workflow run, attempt 1. No Docker/WSL retry, public-chain operation, X post, frontend work, unrelated-project change or Phase 2B work occurred.

### Environment and build evidence

Ubuntu 24.04 / Linux x86_64; Rust/Cargo 1.93.0; cargo-near 0.22.0; Node 22.23.4; near-sdk 5.29.1; near-workspaces 0.23.0; sandbox node **2.13.4**, protocol **86**. All prerequisite, formatting, lint and build steps passed. The native suite passed **44/44**, with no regressions. Linux integration compilation completed and a real sandbox started.

The runner built the actual source into a **159,542-byte Wasm**, SHA-256 `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`, independently rechecked after download. The fixture's downloaded deployed-code comparison passed. This Linux artifact differs from the earlier Windows build; the workflow uses the explicitly non-reproducible host build, so cross-host byte equality was not claimed. Production source and native tests remain unchanged.

### Twelve scenario results

The raw results.json (historical local-only reference; excluded from public snapshot; result retained without inventing evidence) reports **0 PASS, 12 FAIL, 0 UNVERIFIED**. All twelve case functions were attempted. Eleven stopped during the pre-action snapshot and never submitted their intended security-test transaction. Their contract behavior therefore remains **UNVERIFIED**, despite a FAIL result for the test harness. Case 5 submitted a real payment, but its expiry precondition was not established.

| # | Scenario | Recorded test result | Actual execution / security conclusion |
| --- | --- | --- | --- |
| 1 | Authorized payment | **FAIL** — `mandate` | Fixture/snapshot failure before target call; UNVERIFIED by this case |
| 2 | Unauthorized recipient | **FAIL** — `mandate` | Target rejection not exercised; UNVERIFIED |
| 3 | Transaction ceiling | **FAIL** — `mandate` | Target rejection not exercised; UNVERIFIED |
| 4 | Cumulative budget | **FAIL** — `mandate` | Budget sequence not exercised; UNVERIFIED |
| 5 | Expired authorization | **FAIL** — `not the intended contract rejection` | Payment succeeded after fast-forward; actual expiry was not verified, so expired-authority enforcement remains UNVERIFIED |
| 6 | Replay | **FAIL** — `mandate` | Replay not exercised; UNVERIFIED |
| 7 | Unauthorized administration | **FAIL** — `mandate` | Attacker call not exercised; UNVERIFIED |
| 8 | Restricted key | **FAIL** — `mandate` | Keys installed; prohibited-method call not exercised; UNVERIFIED |
| 9 | Forged callback | **FAIL** — `mandate` | Forged callback not exercised; UNVERIFIED |
| 10 | Async success | **FAIL** — `mandate` | Dedicated case not exercised; separate successful callback observed in case 5 |
| 11 | Genuine native failure | **FAIL** — `mandate` | No genuine failed transfer executed; refund handling UNVERIFIED |
| 12 | Three independent .40 requests | **FAIL** — `mandate` | Competing payments not broadcast; concurrency UNVERIFIED |

These failures must not be relabeled as twelve contract vulnerabilities or twelve passing checks. The observed payment below is useful independent evidence, not a replacement PASS for the failed mandatory cases.

### Actual transaction, callback and balances

Raw evidence: transaction and receipts (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), before (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), after (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), callback gas (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), derived arithmetic (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).

- Transaction `EBh6r3HvY4oQucV6d5Sd13LpeHLAmjxc9KrdZwN8JAkG`: `agent.expired.test.near` called `vault.expired.test.near.execute_payment`, nonce slot 0, amount 0.10 NEAR, zero attached deposit. RPC returned **FINAL** and callback result `true`.
- Scheduling receipt `ABhPPmHPZQftaPd1rFLQ7KJo8NworbYFv5uenjaA1XPK` emitted `payment_scheduled`: A=.90, P=.10, S=0.
- Recipient receipt `4UkTVrR7y1QfcZmpKtp5xHotn2V7ofg62x1vF6GGLM6v` succeeded with empty return data.
- Callback receipt `8kGVUiBxxM2HSNRWsJLdzo6rMMzrjKvJinaUxc8QqTPt` emitted `payment_succeeded`, returned true, and burned **2,399,228,572,005 gas = 2.399228572005 Tgas**, below its 15-Tgas allocation. This is one measured execution, not a worst-case gas proof.

| Measurement (NEAR) | Before, final block 1319 | After, final block 1351 |
| --- | --- | --- |
| Recipient balance | 1.000000000000000000000000 | 1.100000000000000000000000 |
| Vault physical balance | 11.000071044422956700000000 | 10.900181252876768200000000 |
| Available / pending / spent | 1 / 0 / 0 | .9 / 0 / .1 |
| Storage + operating floor | 1.71034 | 1.71034 |
| Required liquid backing (floor + U + A) | 2.71034 | 2.61034 |

The recipient received exactly .10 NEAR. A+P+S=B=1 at both snapshots, slot 0 is Succeeded, U=0, and physical backing exceeds required backing at both endpoints. Storage usage is 165,938 bytes at both snapshots. The vault's positive residual after adding back principal is `.0001102084538115` NEAR, bounded by `.0005987067164463` NEAR of recorded transaction/receipt charges. Exact reward decomposition and solvency at every intermediate receipt remain UNVERIFIED. The raw outcomes include refund receipts, but this successful transfer does not establish failed-transfer principal refund behavior.

### Findings and required corrections before another run

1. **Medium — confirmed harness finality gap; likely cause of eleven aborts.** Fixture creation discards the configuration transaction result after `transact()` ([sandbox.rs:200](../integration-tests/tests/sandbox.rs#L200)); `snapshot` immediately selects a final block and expects a mandate ([sandbox.rs:219](../integration-tests/tests/sandbox.rs#L219), [sandbox.rs:263](../integration-tests/tests/sandbox.rs#L263)). The pinned workspaces client uses `broadcast_tx_commit`, which returns at optimistic execution, not final state. A final snapshot can therefore predate configuration. The failures specifically show `state.mandate == None`; rejected snapshots/configuration receipt hashes were not saved, so exact per-case block ordering cannot be reconstructed. Required correction: retain setup transaction hashes/outcomes, wait explicitly for FINAL, then snapshot and verify the configured policy. [Official NEAR execution/finality semantics](https://docs.near.org/api/rpc/transactions).
2. **Medium — confirmed missing expiry precondition.** The fixture sets expiry to chain time +600 seconds ([sandbox.rs:205](../integration-tests/tests/sandbox.rs#L205)), but the case advances 1,200 blocks without checking the resulting timestamp or stored expiry ([sandbox.rs:445](../integration-tests/tests/sandbox.rs#L445)). The transaction succeeded. The artifacts omit those timestamps, so this does **not** prove a contract expiry bypass. Required correction: record the actual policy and chain timestamps and advance until the finalized timestamp is beyond expiry before submitting. Block-count fast-forwarding is not itself proof of the desired timestamp. [Official workspaces time-travel API](https://github.com/near/near-workspaces-rs#time-traveling).
3. **Low — confirmed failure-evidence gap.** `snapshot` saves data only after assertions ([sandbox.rs:310](../integration-tests/tests/sandbox.rs#L310)); setup receipts are discarded. Preserve raw responses before validation and separate setup/snapshot failure from security assertion failure. Otherwise diagnostic evidence is lost precisely when assertions fail.

No production-contract vulnerability was confirmed, and no contract or harness fix was applied in this execution-only turn. The approved initial commit remains unchanged and no second run was dispatched. A corrected harness commit and another remote execution need further approval because the authorization was for the reviewed sixteen-file snapshot and one run.

Missing/duplicate genuine callbacks, intermediate solvency, worst-case gas, failed transfers and concurrency remain unresolved runtime gates. Retained full-access vault keys and owner-account delegated administrative keys remain explicit trust limitations. **Phase 2B: NO-GO.**

### Executed remote command record

```text
gh auth status --hostname github.com
gh api user
gh api repos/shadehook/MandateLock                  # 404 before creation
gh repo create shadehook/MandateLock --private --description 'Private MandateLock Phase 2A sandbox validation'
gh api repos/shadehook/MandateLock                  # ownership/privacy checks
git init --initial-branch=main                     # isolated .phase2a-publish only
git config --local user.name 'MandateLock Phase 2A'
git config --local user.email 'phase2a@mandatelock.invalid'
git config --local core.autocrlf false
git config --local core.hooksPath .disabled-hooks
git remote add origin https://github.com/shadehook/MandateLock.git
git add -- <the sixteen approved manifest paths>
git -c commit.gpgsign=false commit -m 'Prepare private Phase 2A sandbox validation'
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push --set-upstream origin main
gh workflow run phase2a-sandbox.yml --repo shadehook/MandateLock --ref main
gh run watch 41197070066 --repo shadehook/MandateLock --interval 30 --exit-status
gh run download 41197070066 --repo shadehook/MandateLock --name mandatelock-phase2a-evidence --dir artifacts/phase2a-github/evidence
gh run view 41197070066 --repo shadehook/MandateLock --log
```

Additional read-only `gh run view/list`, commit lookup and artifact metadata calls verified run status, remote SHA, private visibility and the single dispatch. Local manifest hashes were checked before staging; staged paths were compared against the exact allowlist. Full workflow step commands/output are in workflow.log (historical local-only reference; excluded from public snapshot; result retained without inventing evidence). No global Git settings changed.

## Historical preparation and Docker records (superseded by the run above)

## Latest controlled diagnostic and preferred fallback

The subsequent GitHub execution request is prepared locally in
[PHASE2A_UPLOAD_REVIEW.md](PHASE2A_UPLOAD_REVIEW.md): proposed private repository
`shadehook/MandateLock`, an exact sixteen-file upload snapshot and hash manifest,
privacy exclusions and workflow checks. No remote action has occurred; repository
creation, push and manual dispatch await explicit approval. All twelve scenarios
remain UNVERIFIED. Docker and WSL troubleshooting remains stopped.

At the user's request, executed `docker pull alpine:3.20` **exactly once**. It exited **1** with `failed to copy: httpReadSeeker: failed open: failed to do request: Get "https://production.cloudfront.docker.com/...": EOF`. The complete, unabridged output (including the returned temporary signed blob URL) is recorded in phase2a-docker-pull-alpine320.log (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).

The download failed, so `docker run --rm alpine:3.20 echo OK` was **not executed**. Docker troubleshooting stopped. No further image pulls, Docker reinstall/reset, network changes or contract edits were performed. **Zero of twelve sandbox scenarios executed; all twelve remain UNVERIFIED**, as individually listed below. There are no transaction receipts, callback outcomes, measured sandbox balances or concurrency evidence from this attempt. Native tests were not rerun; their latest execution remains 44 passed.

The preferred fallback is now the existing [manual Ubuntu workflow](../.github/workflows/phase2a-sandbox.yml) in an **approved private GitHub repository**. Locally prepared changes add a job condition requiring `github.event.repository.private == true` and an explicit path to the actual compiled Wasm. The workflow remains manual-only, with read-only repository permissions, pinned actions, no public-chain deployment and evidence retention after failure. It has not run; preparation is not validation.

After explicit approval to create/use a private repository, push the reviewed source and activate CI:

1. Include the root manifests/lockfile/toolchain, `src/`, `scripts/verify-wasm.mjs`, integration manifests/lockfile/source/tests, and `.github/workflows/phase2a-sandbox.yml`; exclude local build targets, caches, credentials and generated artifacts. The runner rebuilds the actual contract.
2. Place the workflow on the repository's default branch, ensure Actions is enabled, then manually select **Actions → MandateLock Phase 2A sandbox (manual) → Run workflow**. GitHub documents the default-branch and write-access requirements for [manual dispatch](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow). The private-repository condition uses the event payload from the official [GitHub context](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts).
3. Retrieve `mandatelock-phase2a-evidence`: inspect `results.json`, raw receipts, before/after balances, callback gas, concurrency records and `additional-unverified.json`. A setup failure before scenarios run is infrastructure failure, not twelve contract failures or passes. Missing results remain UNVERIFIED.
4. Resolve actual integration failures and the additional fault/solvency gates before reconsidering Phase 2B.

No repository was created, published or pushed; no external CI was activated. Ubuntu execution remains pending that approval. **Phase 2B: NO-GO.**

## October 31 resume: running Docker Engine

Executed exactly:

```powershell
docker info
docker version
docker run --rm alpine:3.21 uname -srm
```

| Check | Observed result |
| --- | --- |
| `docker info` | **PASS**, exit 0; context `desktop-linux`, server 29.6.2, OSType `linux`, architecture `x86_64` |
| `docker version` | **PASS**, client/server 29.6.2; Docker Desktop 4.83.0; server `linux/amd64` |
| Minimal Linux container | **FAIL — image acquisition**, exit 1; Alpine was not cached and its layer download ended with EOF |
| Existing near-workspaces suite through Docker | **UNVERIFIED**; no Linux container process or NEAR node started |
| All twelve mandatory scenarios | **UNVERIFIED**, individually listed below; no new PASS/FAIL contract results |
| Transaction/receipt IDs, callback gas, real balances, concurrency evidence | **UNVERIFIED / unavailable**, because no sandbox transaction executed |

Docker is accessible; the earlier engine-startup error is **not** the current blocker. The minimal test reached Docker Hub, then failed fetching the layer blob `sha256:f439434f9e6739ae2f80313f260d2084bb89feaf7220a06a5398e6b90797e2e3` from `production.cloudfront.docker.com`:

```text
Unable to find image 'alpine:3.21' locally
3.21: Pulling from library/alpine
docker: failed to copy: httpReadSeeker: failed open: failed to do request:
Get "https://production.cloudfront.docker.com/registry-v2/docker/registry/v2/blobs/sha256/f4/f439434f9e6739ae2f80313f260d2084bb89feaf7220a06a5398e6b90797e2e3/data?[signed query omitted]": EOF
```

Only the temporary signed URL query is omitted above; the error chain, host, blob path and terminal `EOF` are preserved. The failing command did not reach `uname`, so it does not establish successful Linux container execution. Docker's Linux backend meets the host architecture prerequisite in principle; compatibility/execution of the actual Rust/sandbox container remains unverified. The minimal Alpine probe was not intended as the glibc-based Rust sandbox runner.

Stopped after this first failed image pull, as requested. No alternate registries, repeated pulls, proxy changes, Docker repairs, resets, contract edits, public-chain activity or external CI activation were attempted. Production source/test/manifest/lockfile hashes still match Phase 1B. Native tests were not rerun during this short resume; the prior 44-pass result below remains the latest native execution evidence.

**Phase 2B remains NO-GO.** Successful image acquisition and supported Linux execution are still needed before the twelve real compiled-Wasm scenarios can produce balances, receipts and concurrency evidence. The earlier prepared harness and inactive workflow remain available.

## October 30 preparation record

The requested fallback is ready locally: a near-workspaces **0.23.0** integration crate and manual GitHub Actions Linux workflow. Nothing was uploaded, pushed, published or activated. No public NEAR network was contacted, and no accounts, signed transactions or deployments were created in this phase. The production contract and its 44 native tests remain unchanged.

## Actual setup and executed checks

Windows Rust/Cargo 1.93.0 and the Phase 1B Wasm were available. A normal-process WSL inventory was denied; an elevated read-only inventory found only the existing `docker-desktop` WSL2 distribution, stopped. Docker's Linux engine pipe was unavailable. Starting the already-installed Docker Desktop was attempted; its backend failed before Linux startup with:

```text
starting services: initializing Inference manager:
listening on unix://<USER_HOME>/AppData/Local/Docker/run/dockerInference:
The file cannot be accessed by the system.
(listener: The filename, directory name, or volume label syntax is incorrect.)
```

Source: existing Docker backend startup log, read during this phase. No factory reset, repair, WSL distribution installation, Docker update or other system dependency installation was performed. The three task-owned Docker CLI waits were stopped after identifying their command lines; unrelated processes were not terminated. There is no approved remote Linux host or activated CI runner to substitute for the failed engine.

| Executed local check | Result | Evidence |
| --- | --- | --- |
| Existing native suite | **PASS: 44 passed, 0 failed, 0 ignored** | phase2a-native-tests.log (historical local-only reference; excluded from public snapshot; result retained without inventing evidence) |
| Integration dependency resolution | **PASS**, separate Cargo.lock generated | [integration lockfile](../integration-tests/Cargo.lock) |
| Integration Rust type-check on Windows | **PASS**; does not start a node | phase2a-integration-check.log (historical local-only reference; excluded from public snapshot; result retained without inventing evidence) |
| Integration strict Clippy | **PASS**, `-D warnings` | phase2a-integration-clippy.log (historical local-only reference; excluded from public snapshot; result retained without inventing evidence) |
| Root/integration formatting | **PASS** | Commands below |
| Local Linux engine startup | **FAIL: infrastructure**, not a contract test failure | Error above |
| Linux compilation, sandbox startup and all real transactions | **UNVERIFIED / not executed** | No transaction or receipt IDs exist |

Native tests again produced only the known nonfatal incremental-cache hard-link warning. Cargo restored Rust crates into the user cache; it did not install additional system software. The initial lockfile attempt ran before the crate target existed and failed; adding the harness target resolved it. No production code bug was discovered or patched.

## Implemented integration suite

Source: [integration-tests/tests/sandbox.rs](../integration-tests/tests/sandbox.rs). It type-checks against the actual pinned APIs. It refuses execution on non-Linux hosts and only constructs a **local sandbox**; it rejects non-loopback evidence RPC URLs. No testnet/mainnet constructor or credential file is used.

Locked components include near-workspaces 0.23.0, near-sandbox 0.3.16 and nearcore-family dependencies 0.37.4. The node version is explicitly **2.13.4** through `sandbox_with_version`, matching the resolved sandbox package's default. This is a prepared configuration, not an observed running node. `sandbox-install` is enabled only for a future supported Linux execution; it was disabled during Windows type-checking.

Each fixture creates a disposable owner and a **direct child** vault. Account creation, reserve funding, trusted fixture key addition, actual Wasm deployment and owner initialization are batched. The harness compares downloaded contract code bytes with the supplied actual Wasm. It creates separate agent, merchant and attacker accounts, and installs three distinct agent-account function-call keys scoped to `execute_payment` with explicit finite gas allowances. Those private keys stay in memory and are never written to evidence. The retained vault and agent administrative keys are trusted fixture keys, not agent-wrapper credentials.

Fixture reserve: 10 synthetic NEAR before initialization, with 1 synthetic NEAR separately credited as mandate principal. This intentionally avoids funding only the principal while overlooking code/storage requirements. These are test inputs, not real funds or measured minimum reserves.

### Required sandbox results

Every row is implemented but **UNVERIFIED here** because no node ran. None is counted as a simulated pass or a contract failure.

| # | Scenario | Executable assertions | Actual result |
| --- | --- | --- | --- |
| 1 | Authorized payment | Recipient increases exactly .10; scheduled/succeeded events; slot Succeeded; A=.90,P=0,S=.10 | **UNVERIFIED** |
| 2 | Unauthorized recipient | Contract ERR_RECIPIENT, no outgoing lifecycle, unchanged recipient/principal, unused slot | **UNVERIFIED** |
| 3 | Transaction ceiling | .40 plus one yocto rejected with ERR_PER_TX_LIMIT | **UNVERIFIED** |
| 4 | Cumulative budget | .40+.40+.20 succeeds; additional yocto rejects; A=P=0,S=1 | **UNVERIFIED** |
| 5 | Expired mandate | Advance sandbox blocks; actual contract must return ERR_EXPIRED | **UNVERIFIED** |
| 6 | Replay | Fresh signed call reusing a successful slot rejects ERR_NONCE_USED; no second receipt of principal | **UNVERIFIED** |
| 7 | Unauthorized administration | Attacker's real revoke call rejects owner authorization | **UNVERIFIED** |
| 8 | Restricted agent key | Protocol rejects prohibited revoke method; no vault state/balance change | **UNVERIFIED** |
| 9 | Forged callback | Attacker's actual on_payment_result call fails private authorization | **UNVERIFIED** |
| 10 | Successful async settlement | Real callback, terminal record, physical payment, accounting and gas evidence | **UNVERIFIED** |
| 11 | Genuine native transfer failure | Verify named receiver is absent, observe AccountDoesNotExist receipt, normal failed callback, restored A, consumed nonce and no recipient credit | **UNVERIFIED** |
| 12 | Three independent .40 requests | Three different approved keys broadcast before awaiting completion; all reach vault; two accepted, one ERR_BUDGET; recipient +.80; A=.20,P=0,S=.80 | **UNVERIFIED** |

For case 11, inability to establish or observe a genuine native failure is explicitly recorded as **UNVERIFIED**, not PASS; the suite then exits unsuccessfully. A genuine failed outgoing transfer with broken settlement remains a FAIL. Case 12 treats nonce/transport/unrelated errors as failures, never as budget enforcement. Pending overlap is separately reported PASS only if successful scheduling receipts record at least .80 pending; otherwise overlap remains UNVERIFIED even if the competing submissions prove the total budget bound.

## Accounting and evidence collection

Future results go under ignored `artifacts/phase2a/` and are uploaded by the prepared workflow only after external execution is authorized:

- `environment.json`: actual node status/protocol version and supplied Wasm hash/size.
- Per-fixture `keys.json`: public account/key permissions, including explicit retained full-access-vault-key disclosure; no private keys.
- Before/after snapshots pinned to the **same final block** for account balances, get_accounting and raw STATE. The harness decodes all 64 actual stored payment records, verifies their Pending/Succeeded sums, checks A+P+S=B and P+S<=B, and checks view/raw balance agreement.
- Raw RPC transaction results requested with `wait_until=FINAL`, including actual transaction hashes, receipt IDs, executors, outcomes, logs, gas and tokens burnt. No fake identifiers are supplied in this report.
- Callback gas records identify terminal-event receipts and assert positive gas no greater than the configured 15 Tgas. No gas measurement has yet occurred.
- Final physical backing checks require vault balance >= live storage/operating floor + U + A, after all refunds finalize. Pending outgoing principal is not subtracted from physical balance twice.
- Merchant/attacker payment deltas are exact. Vault balance reconciliation permits a positive fee/reward residual bounded by actual transaction token charges; **exact gas-reward decomposition is not established**. Raw values are retained for further analysis.

**Solvency throughout asynchronous execution is not proven.** Final pinned snapshots and reservation logs are narrower evidence than every intermediate receipt. A failed outgoing receipt may create a refund receivable before liquidity arrives; restoring budget does not itself assert liquidity. The prepared harness does not fabricate transient balance observations.

These additional critical cases remain runtime-UNVERIFIED even after a future clean run of the twelve basic scenarios unless separately exercised:

| Case | Existing evidence | Remaining work |
| --- | --- | --- |
| Missing/out-of-gas callback never auto-restores budget | Existing native tests and unchanged no-timeout implementation | Controlled real receipt fault with separately labeled artifact/instrumentation; observe persistent P |
| Duplicate settlement cannot debit/credit twice | Existing native duplicate-outcome tests; private wrapper forgery test prepared | Genuine duplicate private callback delivery/result fixture; do not treat a direct call with zero results as duplicate delivery |
| Solvency at each relevant asynchronous stage | Prepared terminal snapshots, actual-state sums and pending-event checks | Controlled intermediate receipt/refund observations |
| Worst-case callback gas and storage | Prepared per-receipt measurement; native fixed-size and arithmetic tests | Maximum-input/state runtime profiling plus a safe gas margin |

The suite writes these limitations to `additional-unverified.json`. A future green basic-scenario run must not be represented as completion of these separate gates.

## Reproduction and inactive Linux workflow

Prepared workflow: [.github/workflows/phase2a-sandbox.yml](../.github/workflows/phase2a-sandbox.yml). It is manual `workflow_dispatch` only, with no push/PR trigger, read-only repository permission, disabled checkout credential persistence and pinned checkout/upload-action commits. It installs build prerequisites on an ephemeral Ubuntu 24.04 runner, uses Rust 1.93.0 and official cargo-near 0.22.0, runs native checks, builds the actual no-ABI contract and runs the integration suite. Evidence uploads even after failure. No workflow was activated and no repository was created.

Commands actually executed from this workspace (PowerShell with the installed Cargo bin on PATH):

```powershell
$rustBin = Join-Path $env:USERPROFILE '.cargo\bin'
$env:Path = $rustBin + [IO.Path]::PathSeparator + $env:Path
cargo test --lib --locked --offline
cargo generate-lockfile --manifest-path integration-tests/Cargo.toml
cargo fmt --manifest-path integration-tests/Cargo.toml --all
cargo check --manifest-path integration-tests/Cargo.toml --tests --locked
cargo clippy --manifest-path integration-tests/Cargo.toml --tests --locked -- -D warnings
cargo fmt --all -- --check
cargo fmt --manifest-path integration-tests/Cargo.toml --all -- --check
```

Check/test output was captured with `2>&1 | Tee-Object -FilePath docs/phase2a-*.log` and native exit codes propagated. WSL/Docker discovery commands were `wsl --list --quiet`, elevated `wsl --list --verbose`, `docker info --format '{{.ServerVersion}}'`, `docker desktop --help`, and `docker desktop start`. Startup/status waits were abandoned only after the backend's actual startup error was identified.

On an **approved supported Linux environment**, after installing the pinned toolchain/build tool, the execution commands are:

```bash
set -euo pipefail
cargo test --lib --locked
cargo near build non-reproducible-wasm --no-abi --locked
node scripts/verify-wasm.mjs
cargo test --manifest-path integration-tests/Cargo.toml --features sandbox-install --locked \
  --test sandbox -- --nocapture
```

The final command has **not** been executed in this session. Publication, pushing code and activating the prepared external workflow still require approval. An existing approved Linux host could run the same commands without a public repository.

## Bugs, limitations and Phase 2B decision

No sandbox-confirmed contract bug exists because no sandbox ran. No production contract fix or authorization change was made. The new harness and its lockfile compile/type-check on Windows, but Linux compilation, binary installation and execution remain unverified. The root contract sources, tests, manifest and lockfile hashes still match Phase 1B.

Retained full-access keys remain an explicit trusted-fixture bypass. Owner-account delegated admin keys retain the pre-review authority caveat. Missing callbacks can strand reservations; there is no withdrawal/repair/upgrade feature, and revocation cannot recall scheduled payments. None was weakened to obtain test results.

**NO-GO for Phase 2B/public testnet readiness.** First run and inspect the prepared Linux suite, obtain real balances/receipt/gas evidence, resolve any confirmed failures, and finish the critical fault/solvency gates. The requested fallback preparation is complete; the objective of real NEAR sandbox validation is **not yet achieved**. Stop here without frontend work, public testnet/mainnet activity, external CI activation or unrelated-project changes.
