# MandateLock Phase 2B — security validation

## Corrected approved execution — October 31, 2026

**Workflow SUCCESS. 75 PASS / 0 FAIL: 59 native/model/harness tests + 12 original Phase 2A scenarios + four Phase 2B aggregate scenarios.** Both independently executed fault branches also PASS; they are subcases of the fourth aggregate and are not counted twice. All corrected runtime cases executed. **GO for the scoped Phase 2B sandbox-validation milestone with documented limitations. NO-GO for unrestricted production custody or an unconditional security/solvency guarantee.** No next phase is started or approved by this assessment.

- Private official repository and ownership verified in Chrome; GitHub CLI authenticated as **onchainbuilds**. Seven working-tree files, then all seven staged blobs, matched the approved SHA-256 manifest exactly. Sensitive-string/path scan and reviewed scope passed. Production sources, original tests, manifests/lockfiles and local production Wasm remained unchanged. The official remote was still at the expected parent before pushing.
- Exactly **one normal push and one manual Chrome dispatch** under this approval. Commit [75051c2fc7ecff6390c49fa67274d70d275d07c8](https://github.com/onchainbuilds/MandateLock/commit/75051c2fc7ecff6390c49fa67274d70d275d07c8), parent d80992baaa41b860c4eadcbf2c6f584293a7d4b4. [Workflow 41205116391, run #2](https://github.com/onchainbuilds/MandateLock/actions/runs/41205116391), manually triggered by onchainbuilds at 09:20 EDT; duration **9m44s**, Ubuntu job **9m40s**. No rerun, production modification, visibility change or public deployment.
- Ubuntu 24.04; Rust/Cargo 1.93.0, cargo-near 0.22.0, SDK 5.29.1, near-workspaces 0.23.0, sandbox 2.13.4, protocol 86. Formatting, strict Clippy, all builds and static artifact/provenance checks PASS. Production Linux Wasm SHA-256 **3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87**, unchanged from proven Phase 2A. The corrected diagnostic pipeline selected onchain host functions and preserved production/shared source inputs; the private duplicate helper and lowgas allocation remain explicitly test-only modifications.
- [Artifact 13044059219](https://github.com/onchainbuilds/MandateLock/actions/runs/41205116391/artifacts/13044059219), downloaded through Chrome: **5,371,464 bytes**, SHA-256 **fa6f6470af9e214cbfd43dd1b19632816b59667fc3e0bcd8691b3cbf7903b6ef**, matching GitHub's digest. **4,566 files** retained under `artifacts/phase2b-closure-run/evidence/`, including transaction failures that are expected by negative tests. Full parsed receipts/balances (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), offline consistency analysis (historical local-only reference; excluded from public snapshot; result retained without inventing evidence), per-file hash manifest, original zip and run screenshot are retained locally. The Node 20-to-24 action warning was nonblocking.

### Original twelve scenarios — current-run results

These are disposable sandbox hashes, not public explorer transactions. A rejected malicious request is a PASS when its required rejection/accounting assertions hold.

| Scenario | Result | Representative transaction/evidence |
| --- | --- | --- |
| 01 authorized payment | **PASS** | `GEWrxsiERLQPMDU27oMtprXta3b4YS2Z3L44rWrWgvQs` |
| 02 unauthorized recipient | **PASS** | `8awAJCgPyGTzNs8svQiBqwUbw6KvNhgU5pd9SDzRHyGZ` |
| 03 transaction ceiling | **PASS** | `9p2yJFqpdU9noeJZW73PBrFPaeJst6yfZfpDE5r5vD1H` |
| 04 total budget | **PASS** | `JCnvZjQnBZXVCA7tWUMgB6fjhbQ8w5B2eZs44dyq79Go` |
| 05 expired authorization | **PASS** | `FYNbzuiKfAhJgdwFfHQfEoLNZ9Drkyhee5sJSQu85Nhc` |
| 06 replay | **PASS** | `14P2mjFXLZmd4mjHge4etFD81hwEFWrMerUEqxZameyS` |
| 07 unauthorized administration | **PASS** | `4YGRBfnSUYZvqTcwxwZds8UYkkA8WddZMk9iSSsQPi5i` |
| 08 restricted key | **PASS** | Protocol MethodNameMismatch; no included transaction hash |
| 09 forged callback | **PASS** | `4pSr5YDozkCFYexnJm3zvsYUJDjcdwzCdTWp73tv8VHB` |
| 10 async successful settlement | **PASS** | `8ZRVaZgboZYZ4pY7cW6p7eaJ3phoR1GTMHRtgmW1N8MQ` |
| 11 genuine native failure | **PASS** | `768uzENQcswtPaDwag9mpeKJaHjVBfHVrcCtZtxRFbg1` |
| 12 independent competing requests | **PASS** | `8HtK9FveyKaQV9Qind6Dz6Nzvv8EQTUYj9VRqvQ1yN1K` |

Expiry precondition: **1793453144060815397 > 1793453143961822561 ns** before submission. Concurrent .40 requests used three independent keys and all reached the vault: `H1CTi6ZZewo4TGhnfoTcZ6NbvNtg5tG4XZXjmDJTLHRf` and `J7HRsiNEdbwt7GUhVeUZLQMX9kTXLkkvCLjNBaZCawFW` succeeded; `8HtK9FveyKaQV9Qind6Dz6Nzvv8EQTUYj9VRqvQ1yN1K` failed ERR_BUDGET. Accepted=2, budget-rejected=1, observed pending overlap=PASS; no nonce conflict counted.

### Four Phase 2B scenarios and independent fault branches

| Aggregate scenario | Result | Evidence |
| --- | --- | --- |
| Production maximum-state gas, solvency and successful retirement | **PASS** | 64 slots, 32 successful transfers, 32 genuine failures; 258 receipt-block observations including retirement. Callback gas **2.454551126232–2.466162270289 Tgas**, within the 15-Tgas allocation and below the 10-Tgas test threshold. First tx `Z8NVTqeBmZcyGtio6g7DkRJkqTw4fhfPCPVSfvZmSXm`, true callback `2TP9ESu9JMgevnCndT1dVohbSEhhhm6ksKj7wym67Vje`. Last tx `HvRUpaHj9zdTY3f1es5qEikKdJyDwd6h2iNwopyYdFK`, false callback `HbQ6HuAMCXTVpr2dNLbRThP5nFeBDKtd7JpT513qjbp3`. |
| Production full-access-key custody limitation | **PASS — limitation confirmed** | Tx `9qhnXoSEhVHPP2hDc36iFwh8CYJTGLimq1rJ3NSMUvuH` directly transferred .10 NEAR to the attacker (1 → 1.1), with no contract callback or ledger debit. Vault 11.000070521766673 → 10.900025885254173 NEAR including fees. This is a custody bypass, not a contract authorization failure. |
| Corrected diagnostic duplicate callbacks | **PASS** | All four repeat callbacks returned false and logged duplicate_settlement_ignored, with no second terminal event, ledger/journal change or principal repayment. Two successful diagnostic probes delivered only two additional yoctoNEAR. Recipient ended at 1.100000000000000000000002 NEAR; A=.9/P=0/S=.1. Sixteen receipt-block checks passed. |
| Corrected diagnostic callback failure | **PASS**, both independent branches PASS | Paid recipient and genuine failed/refunded transfer each left A=.9/P=.1/S=0, including after expiry, revoke, rejected retirement, rejected owner/direct-self callback and rejected repeat payment. Each branch has 12 receipt-block observations and its own runtime/node/evidence. |

| Fault branch | Result | Payment transaction | Receipts and retirement behavior | Physical vault NEAR, before → after callback |
| --- | --- | --- | --- | --- |
| Paid transfer | **PASS** | `8r7isUs71goN9AYebvNpjPTeSYw6BNvQyXTkyta2sLgc` | Transfer `2Fj5iXcyarWXEnegyvFSRNUduyQykuDwCqVU4w36gVP9`; callback `5KfYZdnkeE8wi5dGVcWLHisWMocCnJ9Dv8a3fmr9Vmiz` failed out of gas; retirement `729aizeZMMcnXiounEMMoFGCnw6uH1UDW3np9GFt5toa` failed with ERR_NOT_RETIRABLE and left state unchanged. | 11.0000705938295361 → 10.9001654602169347 |
| Failed/refunded transfer | **PASS** | `7CgEErSgDKKRBYi2DEwxuHJ4frnZjVZnQa2sQzXgbGNw` | Transfer `H51bRJ4mqfm74nDkcvrXobG9BF4X34i1bjppVVre33Lm`; callback `3S5LjqmLczTnBR78M7Xxt8E5BvBsz6wj9cuFzmrRLLz5` failed out of gas; retirement `3d6HXxLa5PRrCFKPpJMEqEPFtsLKJtZkVwjkdiKi7uTN` failed with ERR_NOT_RETIRABLE and left state unchanged. | 11.000070624110065 → 11.0001655353796778 |

Paid-branch merchant balance was **1 → 1.1 NEAR**; refunded-branch merchant remained **1 NEAR**, and the absent target's native transfer failed with AccountDoesNotExist. Final refund reconciliation verifies zero outgoing principal (fee/reward bounded), while its .10 budget remains pending. Both callbacks consumed **1.888160117030 Tgas at the whole-receipt level** under a deliberately reduced **1-Tgas function allocation**; receipt overhead explains the different quantities. This does not show that the production 15-Tgas callback allocation is insufficient.

Before revocation/retirement probes, observed timestamp exceeded expiry in both nodes:

- Paid branch: **1793453375014746429 > 1793453374904223879 ns**.
- Refunded branch: **1793453396488422366 > 1793453396384269399 ns**.

Both post-retirement-attempt snapshots retain the same policy/journal and A=.9/P=.1/S=0. Owner callback attempts failed private authorization; direct vault self-calls failed ERR_RESULT_COUNT; repeat payments failed ERR_REVOKED without another transfer. The original Phase 2A replay scenario separately verifies nonce protection before revocation. No uncertain reservation was released.

Duplicate callback evidence (all return false):

| Transaction | Callback receipt | Whole receipt Tgas |
| --- | --- | --- |
| `6bBR63SSipow33XLhUxSK9RRYGA27RiaYuEuvGEorE1E` | `B84vGZZUBNw3eENLJoF2Vu7J57vJdoCuNiWzt5VrNchQ` | 2.229798744473 |
| `GNFocTGp4DEbAAMyYvyEZXo4k2tThsvTeUxtUismKP5N` | `G9wr4cFMtgEwZi7Uy5uyTRj7yzpmkKe4afgoaEHGpJrP` | 2.220862227110 |
| `7gKzZBQRx2VYMgNRxZposiWLf6SUnzo5gQJVDpzzYJ47` | `9MF7fgLYgcowivyzPLxtvxyEHbnyivwc3SH7dvnE4bXX` | 2.229813554081 |
| `EueUnGkhHSDUFS6JrjNWxAKHy4xkJ41wuvzJZQErKdFU` | `GkXMk4J15tvhr7iXPVfekH2tXcButqaX8fN7BwckxFKB` | 2.220877036718 |

The corrected diagnostic Wasm hashes were **951f0864e4102cde5f8bb56cd6cd4603fe75abb599d1c47451cb0c5991b6e944** (lowgas) and **3f815f555aba93fd9b894a63e72d75b39e758c79e7bafaa25725e2003f2f6ec6** (duplicate). These are compatible with the production build configuration, not identical production binaries or proof of natural network redelivery.

### Successful retirement and solvency

Production retirement tx **2FRZoAxeJKCQbHF7K163z3SfVfUBoKCveJT3NLf9dM2P** succeeded after all transfers settled. Before: A=.68/P=0/S=.32/U=0. After: policy=null, A=P=S=B=0, **U=.68**, last mandate ID stays **2**. Actual vault **10.6876128757099286 NEAR**, storage usage **159818 bytes**, floor **1.64914 NEAR**, floor+U **2.32914 NEAR**. Retiring the mandate reclassifies remaining principal; it does not withdraw it.

Offline verification found **106 target transactions FINAL**, **81 callback receipts**, **153 active-mandate final snapshots** with A+P+S=B and matching journal sums, plus the separate successful-retirement state. All **298 distinct receipt-block observations** (258 maximum-state/retirement, 16 duplicate, 12 paid-fault, 12 refund-fault) retained protected reserves and liquid backing in this run. No accounting inconsistency was found. Minimum observed excess over floor+U+A: **8.160179739641246099999997 NEAR**. These generously funded fixtures are not near-insolvency stress tests.

**PASS** covers the observed block-end states, authenticated settlement behavior and tested gas paths. **UNVERIFIED**: every intra-block receipt boundary, exact in-flight refund conservation, near-floor runtime funding, every possible gas path and permanent missing-delivery behavior. The callback-failure tests establish failed execution and retained obligations, not successful recovery.

### Defects, limitations and decision

The previous diagnostic-build mismatch and error-string-dependent harness failure are corrected and confirmed by this successful runtime run. **No new harness failure or production-contract accounting/authorization defect was demonstrated.** Expected gas failures, AccountDoesNotExist and authorization/retirement rejections are test evidence, not failed scenarios.

**High limitations remain:** an uncertain/failed callback can strand pending reservations indefinitely, and retained full-access keys bypass policy. No safe automatic recovery exists through the current API; time, balance changes, owner statements and new probe promises do not authenticate an original transfer outcome. A separate recovery/custody design and review would be needed before public custody. **Medium evidence limitations remain:** intra-block/refund conservation and near-floor runtime behavior, as qualified above.

**GO for completion of the explicitly scoped Phase 2B sandbox tests with these limitations recorded. NO-GO for an unconditional production security sign-off or public-funds deployment.** No uncertain budget release, second payment, additional run, public deployment or next phase was introduced. This execution report is a local documentation update only and has not been pushed. The historical preparation/failure reports below remain preserved; their pending-run language is superseded by this section.


## Final-closure corrections — local only, October 31, 2026

**Local checks PASS: 59 tests (44 original + 8 existing model + 4 original harness + 3 new harness regressions). Corrected Linux sandbox execution: UNVERIFIED; not run. GO to request approval for one corrected private sandbox run; NO-GO for final security sign-off or public deployment.** The previous run remains historical evidence: 71 PASS / 1 FAIL, including all twelve original sandbox scenarios. No production contract defect has been confirmed and no production code, dependency version or lockfile changed.

### Corrections and evidence boundaries

- **Diagnostic build corrected locally.** Both fixture copies now use exactly the production `cargo near build non-reproducible-wasm --no-abi --locked` pipeline, including onchain SDK selection and Wasm optimization; only manifest/output directories differ. `scripts/verify-phase2b-fixtures.mjs` validates actual Wasm host imports (including `panic_utf8`), expected exports, distinct artifact hashes and all fixture input hashes. Shared source, manifest, toolchain and lockfile bytes must equal production. The old downloaded lowgas artifact was deliberately checked and rejected for missing `panic_utf8`. This is a static build/provenance check, not a runtime pass. [cargo-near 0.22.0 documentation](https://docs.rs/crate/cargo-near/0.22.0) describes its onchain `cfg(near)` selection.
- **Retirement assertions corrected.** The harness requires a FINAL failed transaction and failed vault receipt, then compares policy, journal, mandate counter and all accounting obligations against the captured pre-call state. It checks no committed retirement/payment event, unchanged recipient balances, fee-bounded vault movement and final backing. No particular panic text establishes success or failure. A generic trap can satisfy the rejection behavior but does not establish its underlying cause. Three new regression tests reject successful/unexecuted calls and state changes even when an error reports failure.
- **Both callback-fault branches are independent.** Separate sandbox workers, evidence directories and PASS/FAIL/UNVERIFIED rows cover (a) paid recipient + out-of-gas callback and (b) genuine AccountDoesNotExist transfer + principal refund + out-of-gas callback. Failure of one does not suppress the other. Both require A=.9/P=.1/S=0, a Pending journal slot, an actual failed vault callback receipt, recipient balance evidence and physical vault reconciliation. Static callback allocation and whole-receipt gas are recorded separately.
- **State after retirement attempts is captured first.** Each branch waits for a finalized timestamp strictly beyond expiry, revokes, captures state before and after attempted retirement, and tests owner/direct-self callback calls without the original promise result. A repeated payment after revocation/expiry must also leave pending state and recipient balances unchanged; the original Phase 2A replay test remains the nonce-specific control. No timeout release, retry transfer or recovery endpoint was added.
- **Successful retirement control added to the production maximum-state scenario.** After all 64 payments settle, retirement must succeed once, remove the mandate, preserve its counter, move exactly the remaining available amount to unallocated, retain physical principal (apart from fee rewards), and keep the storage/operating reserve backed. Its raw post-retirement state, accounting/policy views and account balance are retained. The original Phase 2A setup snapshot still requires an active mandate.
- **Duplicate callbacks use the corrected build.** Four same/opposite-result injections still exercise the unchanged callback using a labeled private test-only helper. Added receipt-block observations precede their assertions. This tests idempotency with real promise results in the production build configuration; it does not prove natural network redelivery or turn the diagnostic helper into a safe recovery method.
- **Intermediate evidence expanded.** Every queried receipt block now records block height/time, transaction/receipt IDs, raw state, decoded journal/view consistency, physical balance, protected floor+unallocated and floor+unallocated+available. All observed blocks are captured before reporting reserve/journal violations. Fault, duplicate and retirement probes now use these checks. Liquid backing is recorded separately because available budget can temporarily await an in-flight refund; the reserve guard must still hold. End-of-block queries do not expose every intra-block receipt boundary. Exact in-flight refund conservation and tight-reserve runtime stress remain UNVERIFIED; the existing model tests cover both refund/callback orderings.

### Local verification results

| Check | Current result |
| --- | --- |
| Original native tests | **PASS 44/44** |
| Existing Phase 2B model tests | **PASS 8/8** |
| Original harness regressions | **PASS 4/4**, preserved |
| New behavioral-rejection regressions | **PASS 3/3** |
| Root/integration formatting and strict Clippy; Wasm adapter Clippy | **PASS** |
| Integration sandbox binary compilation (`--no-run`) | **PASS**, not execution |
| Production and both corrected diagnostic Wasm builds | **PASS** |
| Onchain host/provenance gate, and rejection of old incompatible Wasm | **PASS** |
| Original 12 sandbox scenarios on corrected revision | **UNVERIFIED**; historical **PASS 12/12**, unchanged implementations |
| Corrected production maximum-state + positive retirement | **UNVERIFIED** runtime |
| Production custody demonstration | Historical **PASS**; **UNVERIFIED** rerun |
| Corrected duplicate callback case | **UNVERIFIED** runtime; old mismatched-artifact PASS is not production-equivalent evidence |
| Paid transfer + failed callback, including post-retirement checks | **UNVERIFIED** runtime; previous aggregate case **FAIL** |
| Failed/refunded transfer + failed callback | **UNVERIFIED** runtime; previously interrupted |
| Every individual receipt's solvency / near-floor runtime funding | **UNVERIFIED** |

Windows build fingerprints (compare within the same OS/build environment):

| Artifact | Bytes | SHA-256 |
| --- | --- | --- |
| Production, unchanged | 160477 | `eeded7009d4e56c460744ba7bdf17a52cc04a3d41fa1997903bf7622fb102bb3` |
| TEST-ONLY lowgas | 160476 | `5d082e032fa61c5e3555120866d5ae1a7c66ac74d1f49fa3084541f7856d0de8` |
| TEST-ONLY duplicate | 163218 | `bdfcd293bd11dfacb416d5b9afb6b4eff15b41e4f6c7244d4ad7e604c15221b2` |

Local logs and validation JSON are in `artifacts/phase2b-closure/`, excluded from the proposed commit. A transient Rust String-reference comparison compilation error during editing was corrected; the subsequent Clippy and integration compilation pass. The existing nonfatal Windows incremental-cache hard-link warning remains.

### Recovery investigation and sign-off

**No safe automatic recovery exists through the current contract API after a callback has failed.** A delayed original callback can still settle an authentic result after expiry/revocation (covered by the existing model test). A callback that has already failed is not automatically retried: its own writes roll back while earlier receipts remain committed. The protocol normally schedules attached callbacks even after transfer failure; permanent missing delivery itself was not reproduced here. [Official callback failure behavior](https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-failures).

Balance growth is not a receipt-specific proof: it can arise from a refund, unrelated funding or rewards. A timeout cannot distinguish an already-paid transfer from a refunded failure. Owner assertions, a direct self-call without promise results, or a newly created probe transfer do not authenticate the original result. Reissuing the payment risks paying twice; crediting available budget risks reusing spent authorization. A future recovery mechanism would need verified evidence bound to the exact original transfer and mandate/nonce, one-time settlement, and separate design review. The current contract has no historical-outcome proof verifier; adding one is outside this minimal correction. **Pending remains reserved indefinitely when uncertain.**

Remaining **High limitations**: stranded reservations can permanently prevent retirement, and retained vault full-access keys bypass contract policy. Remaining **Medium evidence gaps**: corrected fault/duplicate runtime outcomes, intra-block refund solvency and near-floor runtime funding. The earlier Medium build defect and Low assertion defect are locally corrected, pending Linux confirmation. No production correction is justified by the available evidence. **NO-GO for security closure/public custody; GO only for a separately approved private validation run.** Even a fully passing run will not erase the stated custody/recovery limitations.

### Approval package and reproduction

Proposed contents are exactly seven files, based on official commit `d80992baaa41b860c4eadcbf2c6f584293a7d4b4`:

1. `.github/workflows/phase2b-security.yml` — production-equivalent diagnostic build and static gate.
2. `scripts/verify-phase2b-fixtures.mjs` — new artifact/provenance gate.
3. `integration-tests/src/lib.rs` — expose focused validation module; original four regressions unchanged.
4. `integration-tests/src/phase2b.rs` — behavioral rejection predicate and three regressions.
5. `integration-tests/tests/sandbox.rs` — give only the two additional fault fixtures short observed expiries; original twelve scenario implementations unchanged.
6. `integration-tests/tests/support/phase2b.rs` — independent fault cases, state/balance/receipt checks and successful retirement control.
7. `docs/PHASE2B.md` — prior execution report plus this correction/approval record.

No credentials, personal machine paths, caches, binaries, temporary edit scripts, dependencies or new raw sandbox evidence are proposed for upload. The official checkout retains its existing history and remote. The workflow remains manual-only, private-repository guarded, Ubuntu 24.04, sandbox-only, with `always()` evidence upload. No GitHub operation, commit, push, workflow trigger, dependency installation or Docker/WSL attempt occurred during this correction.

Executed local verification commands used the already-installed Cargo tools and offline dependency resolution:

```text
cargo test --locked --offline
cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline
cargo fmt --all -- --check
cargo fmt --manifest-path integration-tests/Cargo.toml --all -- --check
cargo clippy --all-targets --locked --offline -- -D warnings
cargo clippy --manifest-path integration-tests/Cargo.toml --all-targets --locked --offline -- -D warnings
cargo near check --clippy --locked
cargo test --manifest-path integration-tests/Cargo.toml --test sandbox --no-run --locked --offline
node scripts/prepare-phase2b-fixtures.mjs
cargo near build non-reproducible-wasm --no-abi --locked
cargo near build non-reproducible-wasm --no-abi --locked --manifest-path target/phase2b-fixtures/lowgas/Cargo.toml --out-dir target/phase2b-lowgas-output
cargo near build non-reproducible-wasm --no-abi --locked --manifest-path target/phase2b-fixtures/duplicate/Cargo.toml --out-dir target/phase2b-duplicate-output
node scripts/verify-phase2b-fixtures.mjs target/near/mandatelock.wasm target/phase2b-lowgas-output/mandatelock.wasm target/phase2b-duplicate-output/mandatelock.wasm artifacts/phase2b-closure/fixture-build-validation.json
```

`CARGO_NET_OFFLINE=true` was set for cargo-near checks/builds. For the negative control, replace the two diagnostic paths above with the prior downloaded `artifacts/phase2b-github/evidence/phase2b/TEST-ONLY-{lowgas,duplicate}.wasm` paths; expected exit is nonzero for missing onchain imports. A corrected Linux run must execute the original twelve scenarios and all four additional cases, preserve both fault-branch rows and raw evidence, and report actual hashes/gas/balances without importing historical outcomes as new results. **Stop here pending explicit approval for any commit/push/manual dispatch.**

## Approved migration and runtime execution — October 31, 2026

**Migration complete. Phase 2B workflow FAIL: 3/4 new scenarios PASS, 1/4 FAIL. Original Phase 2A scenarios PASS 12/12; native/model/harness tests PASS 56/56 (44 + 8 + 4). Total named tests/scenarios: 71 PASS, 1 FAIL. NO-GO for Phase 2B completion or public deployment.** The failed scenario exposed diagnostic-build and assertion defects; it did not demonstrate successful retirement of pending funds or a production-contract defect.

- Official repository: [onchainbuilds/MandateLock](https://github.com/onchainbuilds/MandateLock), verified private and empty in Chrome before the migration, private after the push. GitHub CLI login and authenticated `/user` both verified `onchainbuilds`; the old account was inactive. The new checkout explicitly uses the authenticated CLI credential helper and only the official remote.
- Commit: [`d80992baaa41b860c4eadcbf2c6f584293a7d4b4`](https://github.com/onchainbuilds/MandateLock/commit/d80992baaa41b860c4eadcbf2c6f584293a7d4b4). All **210 committed files exactly matched** the reviewed upload hashes. Both original commits remain ancestors. The CRLF evidence record was preserved byte-for-byte; whitespace checking treated CR as a line ending. No caches, generated binaries or signing secrets were committed. The complete older evidence and Git bundle remain preserved locally.
- Exactly **one normal push**, followed by exactly **one manual dispatch in Chrome**: [workflow 41202822467, attempt 1](https://github.com/onchainbuilds/MandateLock/actions/runs/41202822467), manually triggered by onchainbuilds at 08:49 EDT; total duration **8m 58s**, job **8m 52s**. No retry, force-push, repository visibility change or public NEAR deployment occurred.
- [Artifact 13043740969](https://github.com/onchainbuilds/MandateLock/actions/runs/41202822467/artifacts/13043740969), downloaded through Chrome: **3,792,091 bytes**, SHA-256 `abed112b735a97aaa4563452fab6f8ae797971a72afd4eec904621526184df59`, matching GitHub's digest. All **3,472 extracted files** are retained under `artifacts/phase2b-github/evidence/`; the original zip, per-file hash manifest and offline analysis (historical local-only reference; excluded from public snapshot; result retained without inventing evidence) are preserved beside it. Detailed transactions, callbacks and balances (historical local-only reference; excluded from public snapshot; result retained without inventing evidence).
- Ubuntu 24.04 x86_64, Rust/Cargo 1.93.0, cargo-near 0.22.0, near-sdk 5.29.1, near-workspaces 0.23.0, sandbox 2.13.4, protocol 86. Production Wasm remains **159,542 bytes**, SHA-256 `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`, identical to the proven Phase 2A Linux artifact. Formatting, strict Clippy and production build passed. The Node 20-to-24 action-runtime warning was nonblocking.

### Four new runtime scenarios

Results below are the runner's actual outcomes, with their evidence limits. All hashes identify disposable sandbox transactions, not public-network explorer records.

| Scenario | Result | Transaction, callback and balance evidence |
| --- | --- | --- |
| Production maximum-state gas and receipt-block balances | **PASS** | 64 requests with three keys and eight 64-character recipients: 32 successful transfers, 32 genuine AccountDoesNotExist failures. First tx `CT1DFtP21tQ1zgVJeEHzr4VrZPwdqqZUniYUKDiRonw8`, callback `4ygtTB2LysxUJAsLP3zoj2t1e2NoygqaFfccp36EXt4J` returned true. Last tx `37K2Pr9hwJDZ4EiVJWhzMpUGkHES92maYccv2JKofY3f`, transfer receipt `5MhETvKc1BEeDmWUD97PXV3UEjxL3JTL5PqXRTZE4oHK` failed; callback `4AUeVn3ZhHFFdQqwSj5jtt9ALh2acKXASgUHwCuM9WGW` returned false. Callback gas **2.454366828888–2.465977972945 Tgas**, below the 10-Tgas test threshold and 15-Tgas allocation. Recipient 1 → 1.32 NEAR; final A/P/S=.68/0/.32. Storage stayed 166,430 bytes. |
| Production full-access custody limitation | **PASS — demonstrates a limitation** | Protocol Transfer tx `5RVtiysdMWTuXA8ifdAN4jcGStzNqiWWSJhfS6A5eoLH`, recipient receipt `AfZ2tohp4ZiEzhiX7uD1g3agVaSnf82qJC2U3fVQHYJn` succeeded (0.223182562500 Tgas). Attacker balance 1 → 1.1 NEAR; no MandateLock callback or payment record; ledger stays A=1/P=0/S=0. Vault 11.0000704969112142 → 10.9000258603987142 NEAR, including protocol fees. A retained vault key bypasses policy. |
| Diagnostic duplicate callback idempotency | **PASS as run; build-equivalence gap remains** | Four injected real promise results logged `duplicate_settlement_ignored`, returned false and left the ledger/journal unchanged, including opposite outcomes for already succeeded/failed slots. Example tx `6GHwgCC96DAuvWtfUNTrd23vBnD6kyKSdDrTJrKYtQty`, callback `7vos5UkEf2Ayv7wZFiRTgo4Ce3R9SQK4vD97t1hs6emF`. Last tx `9VJnzYCX26nDDFPGoskTh5SKk4cLduJQiDZ9PyKcS6Ya`, callback `GQ6ZNrFvyJsKKrCrfBaeTK7LtGpvNNYhxGkmA8zUtSgA`. Callback gas **2.367054517304–2.376042045539 Tgas**. Final A/P/S=.9/0/.1; recipient 1.100000000000000000000002 NEAR includes exactly two one-yocto diagnostic probes. This modified artifact used the wrong SDK build mode; repeat with corrected build before production-equivalent sign-off. |
| Diagnostic out-of-gas callback leaves pending | **FAIL — harness assertion/build issue; partial evidence** | Tx `3kfuVmDbZT9kmGZDQHafNW8C3iYUBbhidmf7QbDobrHW` paid recipient .10 NEAR. Callback `FahefbVypBwFbmqc9vEBy27ApSHyGF8dwyUivVwuV1Bm` failed with `Exceeded the prepaid gas.` under the test-only 1-Tgas allocation. Recorded **whole receipt gas** was 1.888160117030 Tgas, including receipt overhead; it is not the static function-call allocation. Snapshot remained A=.9/P=.1/S=0. Post-expiry revocation also logged P=.1. Retirement tx `Ce3EhsQVL4nbZHNzYZx3YxBWBNsZ2gRAmFC7xaUANU6t` **failed**, but its generic trap did not match the asserted error string. The post-retirement snapshot and the separate failed-transfer/refund-plus-failed-callback branch were never reached: **UNVERIFIED**. |

### Confirmed harness defects, not a demonstrated contract exploit

1. **Medium — incorrect diagnostic build mode.** [Workflow line 87](../.github/workflows/phase2b-security.yml#L87) builds both fixtures with plain `cargo build --target wasm32-unknown-unknown`. In near-sdk 5.29.1, `src/lib.rs:147` documents that `cfg(near)`, supplied by cargo-near, selects onchain host functions; bare Wasm selects pure-Rust fallbacks, explicitly not intended for onchain use. `near-sdk-env` 0.1.6 `src/lib.rs:79` makes `panic_str` call `panic_utf8` in host mode and Rust panic in local mode. The downloaded production Wasm imports `panic_utf8`; **neither diagnostic Wasm imports it**. Their source edits were labeled, but their SDK compilation mode was also different. The duplicate fixture's PASS is real evidence for that artifact, not a production-equivalent build proof.
2. **Low — misleading failure assertion and lost post-failure coverage.** [Harness line 349](../integration-tests/tests/support/phase2b.rs#L349) combines `retired.is_failure()` and an `ERR_NOT_RETIRABLE` string match, then labels either mismatch `stranded pending was retired`. The actual FINAL transaction and receipt `JCWjF9vwVuGojMDNdT3xYKPMGt9BMWrxQ5cuchoBjEi3` show **Failure**, with `WebAssembly trap: An \`unreachable\` opcode was executed.` and no terminal success event. Thus the assertion message does not describe what happened. The diagnostic panic behavior is consistent with the wrong build mode; the generic trap alone does not prove the precise underlying guard. The early return at this assertion prevented the later snapshot, fault receipt-block checks and refunded-transfer fault case.

No production source or workflow was modified after this run, and no second push/run was attempted. The next proposed repair is to build both diagnostics through the same cargo-near onchain pipeline as production, verify mode/imports and artifact provenance, split retirement-failure and exact-error assertions, always capture state before reporting an assertion failure, and run the two fault branches independently. Do not weaken the retirement guard or silently accept any generic trap as correct rejection.

### Solvency, expiry and accounting evidence

Offline checks found **95 target transactions at FINAL**, **131 final snapshots** (46 Phase 2A + 85 Phase 2B) satisfying A+P+S=B, matching pending/spent journal sums and physical balance >= floor+U+A. The maximum-state case supplied **256 distinct receipt-block observations**, all with protected reserves and liquid backing intact. The minimum observed excess over floor+U+A in those samples was **8.2849948707125335 NEAR**. This large fixture reserve means these are not near-insolvency stress measurements.

| Observation | Physical vault NEAR | Floor + U + A NEAR | A/P/S |
| --- | --- | --- | --- |
| Maximum-state final | 10.6875318658433592 | 2.39526 | .68 / 0 / .32 |
| Duplicate final, diagnostic artifact | 10.898464299962033399999998 | 3.87841 | .9 / 0 / .1 |
| After out-of-gas callback, diagnostic artifact | 10.9001829140585705 | 3.83268 | .9 / .1 / 0 |

The fault fixture observed timestamp **1793451513792058743 ns > expiry 1793451513601008739 ns** before revocation. Revocation tx `Fz5RQn8442BG56PuBaNrDaHdYWt75Fbe9yWU6rfvKfTs` retained P=.1. There is no post-retirement state snapshot because the harness assertion stopped execution. The 256 intermediate samples belong to the maximum-state case; they do not cover the incomplete fault branch. Block-end views do not expose ordering within a block or account for every in-flight refund asset.

### Original twelve Phase 2A scenarios — all PASS again

| # | Scenario | Current-run transaction evidence |
| --- | --- | --- |
| 1 | Authorized payment | `6QFJKhgiGsftZoYNWrZcD7rasXE3QKh7xBUAbqfGh7uz` |
| 2 | Unauthorized recipient | `FeNGB4Er2Sf4Uf6iBw61EyfnvC2kEiAGpemcZmCBZzcU` |
| 3 | Transaction ceiling | `Bs9GRcVVquM7ar77e6SAFf14PSkWmuySmczjdgzxZuNG` |
| 4 | Total budget | `BGDh3XZRuBAuFsmVnUFMwFnYqMRpDCySfxGX8tWhssj3` rejects further spending |
| 5 | Expiry | `DNy2xm8MUc4Lx33NY2TsbEX4CRWDubYfCc3nC5WyZrv6`; observed 1793451291545396113 > 1793451291442480073 ns |
| 6 | Replay | `EHgCb4eGvb3fE6gv5LzYPNYmZsogDoJ9gfV8EH2WcMDb` |
| 7 | Unauthorized administration | `Hv8VnFmZVTyaHwfwRza9Zyw6BYdX3eWjuveFc4TgXaD1` |
| 8 | Restricted agent key | Protocol MethodNameMismatch rejection; no included transaction hash |
| 9 | Forged callback | `9rFR7WEMjj4EKxd1GRzfjTupbcT32yurMxqLY4HiFpH5` |
| 10 | Successful asynchronous settlement | `DiV5Ew2h3YSzEi7Zt2rFcCJq3FAFPZx3iZXvgYudjjwv` |
| 11 | Genuine native failure and refund | `E4Sn6X8mzyBd4iGe352UedjMkpq3YjM2q8XSYwFT8vZP` |
| 12 | Independent concurrent .40 requests | Three distinct keys and included vault executions: `6FdtKd1zuHQ48eh6zv4HVFVMzYEGGYA5r2e9gv37Qbzr` and `7i1dYGpVWLqbEWvda7s5p1JCSEuwwM5vzQPVPwNkTNHG` succeed; `3vAXNb8pZg1iCUXei4DjeCQX16EKHhpNGPhJ4NQx7HZZ` fails ERR_BUDGET. Pending overlap PASS; no nonce conflict counted. |

**Remaining gates:** correct the diagnostic build and rerun only after new approval; finish the fault/refund branch and post-failure state capture; retain the distinction between receipt-block snapshots and every-receipt solvency; test tighter funding where relevant; make an explicit recovery/custody decision before any public deployment. Missing-result delivery itself is not proved by inducing callback out-of-gas. Full-access-key bypass and permanently stranded reservations remain limitations. **NO-GO for Phase 2B security sign-off.**

This execution report is a local update, not another commit or push. Reproduction is pinned to the commit/workflow above; that version reproduces the diagnostic build defect as well. All previous local preparation below is historical and its pending-approval wording has been superseded by this execution record.

## Historical local preparation

October 31, 2026. **Local review and implementation complete; runtime validation pending. GO for a separately approved private Linux sandbox run. NO-GO for Phase 2B security sign-off, public deployment or production custody.** No production contract defect was demonstrated, so production code and the original 44 native tests are unchanged. No remote was changed, code uploaded, workflow dispatched, account created or public-network transaction submitted in this phase.

## Repository and evidence provenance

Chrome's authenticated user menu identified `onchainbuilds`; the repository page identified owner `onchainbuilds`, name `MandateLock`, visibility **Private**, and the empty-repository quick setup. Official destination: https://github.com/onchainbuilds/MandateLock. Verification was read-only. Git CLI credentials previously identified the old account; they are **not approved for uploads** and must independently verify as onchainbuilds before any future Git network action. A CLI 404 using the old identity was not evidence that the new private repository was absent.

The workspace root has no `.git`. The isolated `.phase2a-publish` checkout is clean at `a539ef3b4a243afb7376067b40b052645d5f1111`, with parent `aafa39088174acee179dfc17647e0202b3ee4879`. Its old remote remains untouched. Preserve both commits with a local Git bundle; build the future migration from that history and overlay the reviewed package. Never force-push or overwrite new/unrelated remote content. Old repository links in historical reports identify previous evidence only.

Historical authoritative run: [41198135753](https://github.com/shadehook/MandateLock/actions/runs/41198135753), completed successfully at the first SHA above. All twelve required scenarios PASS, 44 native tests PASS, four harness tests PASS. Linux Wasm SHA-256 `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`. The full downloaded evidence remains under `artifacts/phase2a-corrected/`; migration includes selected raw transactions, callback results and balance snapshots, plus a hash manifest of the complete local archive. No new Phase 2B sandbox results are implied by that historical run.

## Findings and decisions

| ID / severity | Finding and evidence | Decision |
| --- | --- | --- |
| B1 High — confirmed availability limitation; runtime fault reproduction pending | `src/model.rs:302` refuses retirement with pending reservations. `src/model.rs:378` releases them only on an authenticated result. A lost/failed callback can strand P forever, even after expiry/revocation. Eight new model tests include delayed settlement, absent results, mixed duplicate outcomes and refund ordering. [Callbacks can fail](https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-failures). | Retain fail-closed behavior. Never infer failure from age or a balance increase. No timeout release, resend, manual success flag or owner override added. A future recovery design would require independently verifiable receipt evidence and separate review. |
| B2 Low — defense verified in model; runtime duplicate test unexecuted | `src/model.rs:398` returns Duplicate for either terminal status before changing balances. Mandate ID prevents a delayed old result targeting a reused nonce. `src/contract.rs:126` checks private predecessor and exactly one genuine promise result. Opposite-result duplicates leave the complete state unchanged. [Private callbacks](https://docs.near.org/smart-contracts/security/cross-contract-calls/callbacks). | Add a labeled test-only artifact that schedules additional real transfer results into the unchanged callback. This is deliberate injection, not proof that the network naturally redelivers receipts. No production retry endpoint. |
| B3 Medium — unverified intermediate runtime solvency; model liquidity protection passes | `src/model.rs:366` checks physical balance >= floor + U + outgoing amount. Failed settlement can restore A before a refund arrives; a temporarily illiquid A does not establish a lost asset. New tests exercise both refund/callback orders at the protected floor. Prior 46 final snapshots are backed, but do not prove every intervening receipt. [Refunds](https://docs.near.org/smart-contracts/security/cross-contract-calls/refunds); [NEP-616 refund ordering](https://github.com/near/NEPs/blob/master/neps/nep-0616.md). | Preserve independent physical guard. Prepared runner queries balance/accounting at each distinct receipt block, records floor + U + A and checks protected floor + U. Same-block receipt ordering and exact in-flight refund assets remain UNVERIFIED; block-end samples cannot close that gate. |
| B4 Medium — unverified maximum-state runtime gas/failure behavior | `src/contract.rs:8` allocates 15 Tgas with unused gas weight zero at line 121. Original nine callbacks used 2.380352400690–2.416230832134 Tgas. Fixed 64 slots bound scans/serialization, but observed typical gas is not a universal upper bound. [Callback failure](https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-failures), [expected failures must settle normally](https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-panics). | Prepared actual-Wasm case uses three keys, eight 64-character named recipients, all 64 slots, both transfer outcomes, gas and storage checks. Require measured callback gas below 10 Tgas, leaving >5 Tgas margin. A separate 1-Tgas artifact injects callback failure; it does not demonstrate that the production 15-Tgas allocation is insufficient. |
| B5 High — confirmed custody trust boundary | A retained vault full-access key can sign protocol Transfer/DeleteAccount/DeployContract actions, bypassing `execute_payment` entirely. The Phase 2A fixture explicitly retains one. Owner identity checks (`src/model.rs:187`) also allow owner-account function-call keys delegated administrative methods. [Official access keys](https://docs.near.org/protocol/accounts-contracts/access-keys). | Added an actual-production-Wasm sandbox test demonstrating an out-of-policy protocol Transfer with the trusted fixture key. Runtime test still unexecuted. Restrict agent credentials to the separate agent account; never give it owner/vault keys. Do not remove the last vault key casually: no recovery/upgrade/withdrawal endpoint exists. A later key-removal or multisig custody policy needs explicit approval and review. |

No Critical finding or confirmed new contract accounting/authorization defect was reproduced. These findings do not establish recovery, production solvency or custody guarantees. Gas griefing within authorized slots, allowed-recipient dishonesty, administrative key compromise, retained reserve funds, and dependency/runtime trust remain limitations.

Solvency accounting must distinguish cash at the vault from outgoing principal and in-flight refunds. P is committed budget, not necessarily cash still in the vault: an outgoing transfer may already have debited it, or a recipient may already be paid while settlement is delayed. Do not subtract P twice from liquidity, and do not call a refund receivable liquid before it arrives. Full intermediate conservation needs receipt-linked assets and liabilities; the block-end probes only measure their stated subset.

## Local changes and checks

- Added `tests/phase2b_model.rs`: eight focused tests against the actual production state machine; original `src/tests.rs` remains byte-identical.
- Added `integration-tests/tests/support/phase2b.rs`: opt-in, ignored-by-default Linux suite, imported by the existing harness without altering its twelve scenario implementations. Four cases cover actual production maximum-state gas/balances, actual production full-access custody, diagnostic duplicate settlement, and diagnostic callback out-of-gas. The last case covers both a paid recipient with P stranded through expiry/revoke/retire, and a genuinely failed/refunded transfer whose failed callback still leaves P reserved.
- Added `scripts/prepare-phase2b-fixtures.mjs`: generates two source copies under ignored `target/`, checks exact edit anchors and records original/variant source hashes. Lowgas changes only 15 to 1 Tgas. Duplicate adds one private helper emitting one-yocto native transfers and forwarding results into the unchanged callback. Neither artifact is a deployable production deliverable.
- Added manual-only `.github/workflows/phase2b-security.yml`, using Ubuntu 24.04, Rust 1.93.0, SDK 5.29.1, cargo-near 0.22.0, near-workspaces 0.23.0 and sandbox 2.13.4. It first reruns the original twelve scenarios, then the additional four cases. Both workflows now require the official repository name **and** private visibility. No secrets or public network are required; only loopback sandbox RPC is used. Always-upload artifacts retain logs, raw RPC/receipts, assertions, balances and labeled binaries on failure. Workflows have not been run.
- Broadened local artifact/secret exclusions and updated README for the official repository. Historic reports remain preserved; only upload copies redact local paths.

| Executed locally | Result |
| --- | --- |
| Original native suite | PASS 44/44 |
| New Phase 2B native transitions | PASS 8/8 |
| Original harness regressions | PASS 4/4 |
| Root + integration rustfmt | PASS |
| Root + integration Clippy, `-D warnings` | PASS |
| Wasm adapter Clippy | PASS |
| Production Wasm build and export validation | PASS; 160,477 bytes, SHA-256 `eeded7009d4e56c460744ba7bdf17a52cc04a3d41fa1997903bf7622fb102bb3`, unchanged Windows artifact |
| Two diagnostic Wasm builds | PASS; build evidence only, not sandbox execution |
| Expanded integration test binary (`--no-run`) | PASS; compiled and linked on Windows |
| New sandbox cases | UNVERIFIED 4/4; not executed pending approval |
| Original twelve sandbox cases | Preserved historical PASS 12/12; not rerun in this phase |

Local logs are in `artifacts/phase2b-local/`. The initial native/integration commands emitted the known nonfatal incremental-cache hard-link warning. There were no test failures or production fixes. Windows and Linux optimized Wasm hashes differ; compare artifacts within their recorded build environments. No Linux compatibility or fault result is inferred from Windows compilation.

## Reproduction and outstanding gates

Executed from the workspace using the already-installed tools (Cargo bin prepended to the process PATH):

```text
cargo fmt --all
cargo fmt --manifest-path integration-tests/Cargo.toml --all
cargo test --locked --offline
cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline
cargo clippy --manifest-path integration-tests/Cargo.toml --all-targets --locked --offline -- -D warnings
cargo test --manifest-path integration-tests/Cargo.toml --test sandbox --no-run --locked --offline
cargo fmt --all -- --check
cargo fmt --manifest-path integration-tests/Cargo.toml --all -- --check
cargo clippy --all-targets --locked --offline -- -D warnings
cargo near check --clippy --locked
cargo near build non-reproducible-wasm --no-abi --locked
node scripts/verify-wasm.mjs
node scripts/prepare-phase2b-fixtures.mjs
cargo build --manifest-path target/phase2b-fixtures/lowgas/Cargo.toml --target wasm32-unknown-unknown --release --locked --offline --target-dir target/phase2b-lowgas-build
cargo build --manifest-path target/phase2b-fixtures/duplicate/Cargo.toml --target wasm32-unknown-unknown --release --locked --offline --target-dir target/phase2b-duplicate-build
```

The prepared workflow is the reproducible Linux command sequence. To run the extra suite there, set `MANDATELOCK_WASM` to the production build, `MANDATELOCK_LOWGAS_WASM` and `MANDATELOCK_DUPLICATE_WASM` to their labeled builds, and `MANDATELOCK_EVIDENCE_DIR` to a fresh Phase 2B directory; execute:

```text
cargo test --manifest-path integration-tests/Cargo.toml --features sandbox-install --locked --test sandbox phase2b_security_gaps -- --ignored --nocapture
```

Required before security sign-off: approved Linux execution and evidence review; robust interpretation of intra-block account/refund changes or node-level receipt instrumentation; deliberate recovery/custody decisions. The prepared fault tests intentionally cannot prove missing delivery in an unmodified runtime, all possible callback gas paths, or solvency at every intra-block boundary. Those gaps must remain explicit even if all four new cases pass. No public testnet or frontend work is authorized.
