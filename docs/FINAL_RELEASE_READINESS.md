> Historical report: statuses and approval requirements below describe the earlier review. Current release status is in [publication readiness](PUBLICATION_READINESS.md); original transaction 9 is expired/non-execution corroborated, R3 remains UNRESOLVED, and MIT has now been adopted locally. See [dated public evidence](PUBLIC_TESTNET_STATUS.md). No successful public agent payment is claimed.

# Final release-readiness audit — November 1, 2026

**Release cleanup update:** This document preserves an earlier audit. The 47 personal paths and 100 broken historical links have since been cleaned in this snapshot. See [current publication assessment](PUBLICATION_READINESS.md) and [historical-reference index](HISTORICAL_REFERENCES.md). MIT adoption still requires final approval.

**Overall: NO-GO to publish the current package. GO for the isolated portable judge demonstration.** No credential leak was confirmed in stored Git history. Publication blockers are the unpublished local judge package, personal paths in proposed documentation, broken historical evidence links, and unfinished licensing/notices and release preparation. Public testnet transaction 9 remains **UNRESOLVED**.

No push, publication, visibility change, submission, chain transaction, production edit or dependency installation occurred. Only local audit files/checkouts/reports and read-only official license metadata requests were used.

## Results

| Requirement | Result | Evidence / practical limit |
|---|---|---|
| Entire stored official Git object/history scan | PASS for audited patterns | Five reachable commits, 273 stored objects; all 218 blob/commit/tag objects scanned, including unreachable objects. Config credentials also checked. No private-key/token/password/personal-path/email candidates remained after classification. |
| Secondary local project Git database | PASS for audited patterns | Two reachable commits, 40 objects; all 24 blob/commit/tag objects scanned. No credential candidates. Duplicate history is not counted as new official commits. |
| Signature-shaped scan hits | PASS: public evidence | 141 matches occur in parsed public signature/block-approval fields. They are not private-key records. Match locations and hashes are retained without printing matched values. |
| Complete remote-only history coverage | UNVERIFIED | The audit covers both local object databases and their stored refs; no remote fetch/ref refresh was performed. Confirm remote refs match the reviewed head before a separately approved push/publication. No automated scan guarantees absence of every unknown secret format. |
| Proposed package privacy | FAIL | 47 personal-path references in seven documentation/metadata files. No credential-pattern matches in the proposed snapshot. Redact or exclude those files in an approved release revision. |
| Clean committed checkout has judge package | FAIL | A real local clone at official HEAD a370a7bc3eac05129f364c60c157c4940bd4901b lacks demo/. The new README/demo/docs are still local and unpublished. A judge cloning current committed history cannot run the new quickstart. |
| Isolated proposed release snapshot | PASS: 80 tests | 153 allowlisted files copied without .git, target, node_modules, historical artifacts or secret files. Evidence verifier PASS; demo 17, native 56, harness 7 PASS from fresh target directories. Installed toolchain and global Cargo registry cache were used as documented. |
| Cold dependency downloads / other platforms | UNVERIFIED | No new dependencies installed. Fresh-machine network retrieval, Node 22 specifically, Linux/macOS and new Linux sandbox execution were not retested. Windows Node 24.19.0/Rust 1.93.0 were used. |
| Localhost and deterministic behavior | PASS | Isolated snapshot starts its own temporary loopback server, serves HTTP 200, and returns BLOCK / deterministic policy / broadcast false. Existing localhost:3000 also returns the MandateLock page. No user's existing server was killed. |
| Exact fresh launch on occupied port 3000 | UNVERIFIED | Port 3000 was already serving the demo. The isolated server was tested on a fresh ephemeral loopback port with identical source, and the existing 3000 response was checked separately. The documented port-occupied condition remains accurate. |
| README/demo/JUDGE_READINESS local links | PASS | All entry-document local links resolve in the proposed snapshot. |
| All historical document local references | FAIL | 100 missing local links, mostly to deliberately ignored artifacts/logs. They must be replaced with approved portable evidence, clearly marked local-only, or omitted from release scope. |
| Included sandbox recording | PASS | All 27 evidence hashes, frozen-input hashes, finality/key/accounting and independent competition checks pass without ignored artifacts. |
| README public testnet hashes | PASS against bundled records | Five public setup hashes match their raw transaction hashes and FINAL outcomes; JSON digest matches its companion. Prior receipts/snapshots are dated evidence, not a fresh chain query or independent consensus proof. |
| External links / every old transaction's live lookup | UNVERIFIED | This local audit does not requery all historical hashes/explorers. Private Actions links require access today; old logs and incomplete indexers are not a public evidence strategy. Unknown transaction 9 remains unknown. |
| Dependency license declarations | PASS: inventory complete | 406 Rust package records including local crates, plus 68 installed optional npm dependencies; every locked registry package covered. Missing cached metadata for 43 packages was read from official crates.io version records. No package installed. |
| Third-party notice/distribution obligations | UNVERIFIED / blocker | MPL-2.0 and composite/Unicode/CDLA expressions need retained notices and distribution-specific review. Four npm packages lack a recognized standalone notice filename in the simple check. No blanket all-MIT claim. |
| Root MIT license adopted | FAIL: intentionally pending | Proposal prepared; owner attribution/rights decision and completed text approval are required. No LICENSE was added or license metadata changed. |
| Transaction 9 wording | PASS | README, public evidence and recovery reports explicitly say UNRESOLVED; no successful live payment or public-testnet concurrency result is claimed. |
| Production freeze and existing tests | PASS | All 16 baseline files and both frozen Wasm artifacts unchanged. All 80 portable checks pass. Broader operator tests were not rerun because this task changes no executable production/demo logic. |
| Two-minute video | PLAN READY; recording UNVERIFIED | Exact timing and before/after checklist prepared. No new video, upload or X post was made. |

## History scope and findings

Audited Git databases: `.migration/checkout/.git` (official local checkout) and `.phase2a-publish/.git` (secondary local development history). The workspace root itself is not a Git repository; `.migration/onchainbuilds-MandateLock` is a source snapshot, not another object database. All stored blob/commit/tag objects were scanned, not merely HEAD files. Tree paths and all-commit file lists were checked for caches, build binaries, logs and credential-like file extensions. No generated binary/cache/log paths were identified in the stored histories under those rules; deliberate raw JSON chain evidence is present and is not a credential.

The official five-commit history was preserved; no branch, commit, tag or remote was changed. Redacted findings and scan scope are in `artifacts/release-audit/history-audit.json`. Regex rules include private-key markers, long ed25519 strings, common token formats, credential fields, personal paths and email addresses; contextual JSON review separates signatures from keys. Unknown formats and remote-only objects remain outside an absolute guarantee. No confirmed issue currently requires a history rewrite or force push.

The proposed local package, unlike stored Git history, contains personal paths in:

- docs/ENVIRONMENT-COMMANDS.md
- docs/ENVIRONMENT.md
- docs/PHASE0.md
- docs/phase1b-wasm.json
- docs/PHASE1B.md
- docs/PHASE2A.md
- docs/PRE_PHASE2_REVIEW.md

Exact file/line locations are in `artifacts/release-audit/proposed-findings.json`; raw personal values are not reproduced here. These are publication/privacy findings, not evidence of a leaked signing key. Original historical documents were preserved rather than silently edited.

## Clean reproduction evidence

`artifacts/release-audit/clean-committed` is a local Git clone detached at a370a7b, with a clean status. It contains exactly committed source and cannot run the new demo because the demo has not been committed. The first local clone attempt was blocked by the sandbox's Git helper permissions; a local-only clone with filesystem permission succeeded. No network clone or remote action occurred.

`artifacts/release-audit/clean-proposed` is an explicitly assembled uncommitted release snapshot, not a claim about the remote repository. Its 153-file pre-audit manifest is in proposed-manifest.json. It excludes old caches/build outputs, installed npm dependencies and private artifacts. README steps were run there:

```text
node demo/evidence.mjs
node demo/agent.mjs authorized
node demo/agent.mjs redirect
node demo/agent.mjs review
node --test demo/test/*.test.mjs
cargo test --locked --offline
cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline
```

Results: ALLOW/BLOCK/REVIEW with recorded-sandbox and broadcast false; 27 evidence checks; **17 + 56 + 7 = 80 tests PASS**. No original target directories were copied; Rust compiled fresh target outputs using the already-installed Rust toolchain and documented global source cache. `--offline` verifies the cached-dependency profile, not cold network availability. No npm install was required for the portable demo.

The isolated server's API/evidence response exposes authorized/recipient/concurrency fixtures and a deterministic redirect BLOCK. Its source bytes match the workspace. An audit helper initially used an incorrect relative comparison path; that helper was fixed and rerun successfully. No product source changed. See clean-server.json, clean-demo-tests.log, clean-native-tests.log and clean-harness-tests.log.

The missing-links inventory is `artifacts/release-audit/missing-local-links.json`. The broader operator suite intentionally needs installed SDK/private operational journals/ignored CI artifacts and is not the public quickstart; README correctly discloses that. Do not advertise all operator checks as clean-clone reproducibility until those dependencies are packaged or tests split appropriately.

## Evidence, licensing and video proposals

Public setup records in docs/evidence/phase4-public-testnet.json verify deploy, owner initialization, restricted-key installation, funding and mandate creation. The companion SHA-256 and README explorer hashes passed offline cross-checks. The 75-check Phase 2B result remains historical: 59 native/model/harness + 12 Phase 2A + four Phase 2B aggregates, not 75 new blockchain transactions. Diagnostic fault-injection branches are labeled accordingly. No new sandbox run occurred.

Transaction 9 hash remains **7T63WVcMJFyBhgqQsJxqV3EWFitYSe3uq5azaU7WSfMp**, **UNRESOLVED**. This audit neither queries its current state nor changes the earlier uncertainty reserve. Transactions 10–13 remain unsubmitted. Do not hide uncertainty in the video or relabel a historical sandbox payout as public-testnet success.

[MIT proposal](LICENSE_PROPOSAL.md): suggested project license MIT, year 2026 subject to confirmation, copyright holder pending owner approval. Exact standard text would come from the [OSI MIT reference](https://opensource.org/license/mit) after approval; no legal identity is invented and no root license is adopted. Third-party dependencies retain their licenses. Root source manifests remain frozen.

Complete license inventory: `artifacts/release-audit/dependency-licenses.json`, using Cargo metadata as documented in the [Cargo reference](https://doc.rust-lang.org/cargo/commands/cargo-metadata.html), installed npm manifests and official crates.io version metadata. **memory_units and wee_alloc** declare MPL-2.0. The npm notice-file check needs follow-up for **borsh, bs58, isarray and near-seed-phrase**. License expressions are not substitutes for preserving required notices or assessing a binary distribution.

[Recording checklist and exact 0:00–2:00 sequence](DEMO_RECORDING_CHECKLIST.md) is prepared: mode/limits, authorized payment receipt, malicious redirect BLOCK and REVIEW, independent contract rejection, three-request budget fixture, public-testnet status and limitations. No browser recording or fresh visual click-through was performed in this audit; the server/API/tests passed and prior visual demonstration evidence is historical.

## Approval package and next steps

Before making the repository public:

1. Approve the exact current source/demo/docs release scope and personal-path redaction/exclusion plan. Keep original operational evidence locally. Replace or mark the 100 historical local-only references; entry documents already resolve.
2. Confirm the copyright holder/contributor rights and completed MIT LICENSE proposal; assemble required third-party notices. No approval is inferred from this report.
3. Stage that approved package in the official checkout, produce a final blob manifest, rerun the portable checks from its exact committed tree, and verify remote refs match the audited history. This task did not stage/commit/push it.
4. Record/review the two-minute video, verify no private information appears, and separately approve any public repository visibility change and submission/post actions. Private Actions links should remain supplementary; the judge quickstart and chosen evidence must work without them.

**Stop point: local audit complete, publication NO-GO pending the above decisions and fixes.** Public visibility, commits/pushes, history rewrite, license adoption, X posting, final submission and any transaction recovery require separate authorization. No proposed continuation of public payments is included.
