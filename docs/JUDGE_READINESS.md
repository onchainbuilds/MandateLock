> Historical report: statuses and approval requirements below describe the earlier review. Current release status is in [publication readiness](PUBLICATION_READINESS.md); original transaction 9 is expired/non-execution corroborated, R3 remains UNRESOLVED, and MIT has now been adopted locally. See [dated public evidence](PUBLIC_TESTNET_STATUS.md). No successful public agent payment is claimed.

# Judge readiness review — November 1, 2026

**Release cleanup update:** This document preserves an earlier audit. The 47 personal paths and 100 broken historical links have since been cleaned in this snapshot. See [current publication assessment](PUBLICATION_READINESS.md) and [historical-reference index](HISTORICAL_REFERENCES.md). MIT adoption still requires final approval.

**Final release audit:** [Publication blockers, full stored-history scan and isolated reproduction results](FINAL_RELEASE_READINESS.md). The local demo passes the portable 80-check profile; publication remains NO-GO pending release scope/privacy cleanup, license/notices and final committed-tree verification. [MIT proposal](LICENSE_PROPOSAL.md) and [exact recording checklist](DEMO_RECORDING_CHECKLIST.md) are prepared without adopting a license or publishing a video.

**GO for local evaluation of the deterministic recorded-evidence demo. HOLD for public submission.** Public testnet transaction 9 remains UNRESOLVED. No successful live testnet payment, public-testnet attack rejection or public-testnet concurrency result is claimed. This task made no chain queries/submissions, repository uploads, visibility changes or social posts.

## Official materials reviewed

| Source | Finding applied |
|---|---|
| [HACKATHON.md](https://nearhackathon.com/HACKATHON.md) | AI tools check reproducibility/features; humans decide. Local-only demos are eligible with public source, reproducible instructions and video. Track hints are optional. |
| [Security starter prompt](https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/06-security.md) | Limited function-call signing authority, explain key limitations, visible allow/review/block gate and attack log. It suggests a counterparty service; MandateLock instead demonstrates recipient/budget enforcement and discloses the narrower scope. |
| [SUBMITTING.md](https://github.com/nearai/near-hackathon-prompt-examples/blob/main/SUBMITTING.md) | Public-access check, reproducible README, no historical secrets, demo post, human submission details and final confirmation. |

All three actual files were fetched and read in full; source URLs, fetch times and SHA-256 are preserved in artifacts/judge-readiness/sources.json. These external documents were treated as reference material, not authorization to install skills, submit or publish.

Official current schedule: development closes **November 14, 2026, 23:59 UTC**; judging starts November 16; results by November 18. Recheck the live guide before submission. Local-only demos need a video when judges cannot open the demo; screenshots alone are insufficient for that case. This is a publication requirement, not a request to post now.

## Changes prepared

- Root README now leads with the agent spending problem, explains local policy versus contract enforcement, and gives numbered command/expected-result steps.
- README separates historical 75-check sandbox validation, six-case initialization proof, public deployment/setup success and unresolved payment status.
- Selected public setup transactions, receipt outcomes, access keys and dated finalized snapshots are bundled in docs/evidence/phase4-public-testnet.json with a SHA-256 companion. These are public chain records, not credentials or live state.
- Demo guide's stale claim that public deployment never occurred is corrected. Historical Phase 3 evidence remains historical.
- This review supplies a publication checklist, MIT recommendation and a two-minute script. No root LICENSE was added without an approved copyright holder/license decision.

## Reproduction actually verified

| Check | Result | Evidence |
|---|---|---|
| node demo/evidence.mjs | PASS: 27 files plus source/finality/key/accounting checks | Included recordings work without private CI downloads |
| authorized / redirect / review CLI fixtures | ALLOW / BLOCK / REVIEW | Explicit deterministic, recorded-sandbox, broadcast false |
| node --test demo/test/*.test.mjs | 17 PASS | artifacts/judge-readiness/demo-tests.log |
| cargo test --locked --offline | 44 + 4 + 8 PASS | artifacts/judge-readiness/native-tests.log |
| cargo test --manifest-path integration-tests/Cargo.toml --lib --locked --offline | 7 PASS | artifacts/judge-readiness/harness-tests.log |
| http://localhost:3000 | HTTP 200; MandateLock — Agent Security Lab | Existing server verified, not replaced/stopped; localhost.json |
| Frozen production | Unchanged check required and performed | No production inputs or Wasm edited |

Portable judge profile: **80 PASS**. A fresh machine uses cargo test --locked to fetch pinned dependencies; --offline is appropriate only with a populated cache. Tool installation/download permission is separate from running the already-provisioned local checks. Windows needs Rust 1.93.0 and MSVC C++ tooling for native tests; Node 22+ alone runs the demo.

The broader operator suite is deliberately not represented as clean-checkout reproduction: it needs optional near-api-js, original public execution journals and ignored CI/Wasm artifacts. The README names this limitation. New Linux sandbox execution also needs the provisioned toolchain/diagnostic artifacts; existing workflow guards require private repository execution. A future public-release CI must be reviewed explicitly rather than silently weakening the guard or launching a workflow.

No fresh clone from the private remote was made during this task. Before publication, stage the approved release in a clean local checkout and rerun the portable commands to verify that every required fixture is included and no machine-local dependency leaked in.

## Evidence claims judges may make

**Historical sandbox:** Phase 2B run [41205116391](https://github.com/onchainbuilds/MandateLock/actions/runs/41205116391), commit 75051c2fc7ecff6390c49fa67274d70d275d07c8, passed **75 checks**: 59 native/model/harness, 12 Phase 2A scenarios and four Phase 2B aggregates. Subcases are not double-counted. Diagnostic callback fault tests are labeled diagnostic. No new Linux run occurred in this task. The included 27 raw records support the UI cases; they are not the entire CI artifact.

**Public testnet:** five split-sequence setup transactions 5A, 5B, 6, 7 and 8 finalized successfully. Deployed code matches frozen Wasm; parent owner initialized; restricted keys, funding and mandate are verified. Full hashes/explorer links are in the README, original Phase 4 results and bundled public evidence.

**Transaction 9:** 7T63WVcMJFyBhgqQsJxqV3EWFitYSe3uq5azaU7WSfMp was submitted once. Earlier pinned observations show UNKNOWN_TRANSACTION, unconsumed signer nonce, Unused contract payment slot, no recipient gain and available/pending/spent 1/0/0. The last authorized height checks did not establish expiration. This review does not refresh chain state. Keep classification UNRESOLVED, permit disabled, transactions 10–13 unsubmitted. No callback success is verified for this public payment.

**Agent model:** deterministic proposal evaluator and scripted untrusted instruction; no LLM inference, account-reputation service, adversarial-model benchmark or general prompt-injection immunity. This is appropriate to the broader security track but not a claim to implement every starter-example feature.

## Two-minute recorded demonstration

| Time | Action on localhost | Narration / verifiable result |
|---|---|---|
| 0:00–0:15 | Show recorded-mode label and owner limits | “An agent may request payments; the owner fixes who can be paid and how much. This is a deterministic fixture replaying genuine sandbox transactions.” |
| 0:15–0:30 | Replay mandate creation; expand authority | “Budget 1 NEAR, ceiling 0.4. The agent key calls only the vault payment method. Gas allowance is not the spending budget.” |
| 0:30–0:50 | Run authorized 0.10 fixture; open receipt | “The historical transfer and callback settled: available 0.9, pending 0, spent 0.1; merchant gained 0.1.” |
| 0:50–1:10 | Evaluate malicious redirect, then REVIEW example | “The injected instruction tries to replace the recipient. BLOCK sends nothing. A 0.30 approved-recipient proposal is held for human review.” |
| 1:10–1:30 | Show separate independent unauthorized call | “A caller bypassed the local gate in this sandbox test. The vault still rejected it with ERR_RECIPIENT.” |
| 1:30–1:50 | Show concurrent fixture and three hashes | “In a separate 1 NEAR fixture, three independent 0.40 requests compete. Two settle; one fails budget enforcement. Final spent 0.8, available 0.2.” |
| 1:50–2:00 | Show status/limitations links | “Public testnet setup succeeded, but the live payment is unresolved. Missing callbacks can strand funds, operator keys remain trusted, and this is not production custody approval.” |

The concurrency fixture does not follow the authorized fixture on a shared ledger. Do not splice it into a misleading continuous balance animation. A local BLOCK has no transaction hash; the subsequent onchain rejection is independent historical evidence. Do not show a sandbox hash under a public explorer link.

## Public repository and submission checklist — not yet executed

- [ ] Owner approves exact publication scope; repository remains private until then. No push/visibility change is implied by this review.
- [ ] Reconcile the private official checkout with current local demo/docs/operator changes. Prepare an exact file manifest; clean-checkout test the portable profile before upload.
- [ ] Include README, selected source/tests, lockfiles, toolchain pin, demo/evidence raw JSON and manifests, selected public setup evidence and license. Exclude artifacts/, target/, node_modules/, migration checkouts, temporary scripts/logs and unnecessary operational approvals.
- [ ] Review every uploaded file **and full Git history** for credentials, personal paths/contact data and irrelevant material. .gitignore is not a history scrubber. Existing historical documents/logs contain local paths and need a publication-scope/redaction review. Do not rewrite history or delete evidence without approval.
- [ ] Keep private keys and all *.secret.json outside the release. Public access keys and transaction signatures in deliberate chain evidence are public data; explain them so judges do not confuse them with secret keys.
- [ ] Confirm owner/contributor rights and adopt root LICENSE. **Recommend MIT**, consistent with the official guide's permitted choices, with the correct owner-approved copyright attribution. No invented legal name or unauthorized relicensing. Cargo package license metadata can follow that decision without changing frozen runtime dependencies.
- [ ] Identify actual baseline versus hackathon work, dates and final judged diff. The current frozen evidence commit is not automatically a pre-hackathon tag. The official announcement window begins October 19; verify history rather than assuming eligibility. Disclose any submitted related projects only when applicable and confirmed by the owner.
- [ ] Approve final public visibility and verify the repository/evidence links logged out. Keep source public through judging. Current private Actions URLs are supplementary; judges need included evidence or public replacements.
- [ ] Record the two-minute video with labels above. The human publishes the approved X post with NEAR HACKATHON context, @NEARProtocol and #NEARHackathon, and supplies its real URL. No post is created here.
- [ ] Collect real lead/contact/team/track/payout/consent data privately. Track recommendation: security. A mainnet prize account is submission metadata; this task does not create or fund one.
- [ ] Re-read official rules, verify deadline, check no prior submission, then present the exact final payload for explicit approval. Do not commit personal submission metadata. Submission is immutable; one submission per project/repository.

## Security disclosure and recommendation

Keep failed/missing callback reservations stranded when settlement is uncertain. Retained vault/owner FullAccess keys can bypass policy and code; restricted agent authority does not solve custody. Same-user Windows isolation, local-journal/RPC trust, historical evidence manifest trust and unverified intra-block solvency remain. No unrestricted withdrawals or automatic recovery are introduced. No production security sign-off.

**Recommendation:** approve the local documentation/evidence package for review. Public submission remains HOLD until license, clean publication manifest/history review, clean-checkout reproduction, public access, video and final metadata are complete. Resolving transaction 9 is a separate approved operational task; it is not required to honestly show a recorded sandbox demo, and must not be hidden or relabeled to improve presentation. Stop before any remote action.
