# Judge entry point: a bounded spending task

MandateLock serves an owner who delegates a paid task to an autonomous agent but does not want the agent to control the treasury. Example: “buy this service from this merchant, spend no more than .40 per request or 1 NEAR overall, and stop at expiry.” The agent may choose proposals; the owner selects the mandate. A prompt-injected recipient or racing requests cannot change the contract's configured limits.

The task name is offchain metadata. The onchain boundary is the owner-created mandate ID, account/key allowlist, recipient list, ceiling, budget, expiry and replay slots. The contract does not understand whether a service was delivered or whether two proposals belong to the same semantic job. This is a spending authorization prototype, not escrow, an autonomous approver, or prompt-injection immunity.

## Verify the public run

On November 2, 2026, Mandate 3 paid the authorized merchant **0.10 testnet NEAR**. The private callback settled slot 0. A separate restricted-key request reached the vault and failed with **ERR_RECIPIENT**. FastNEAR and dRPC agreed at finalized height **275933389**. [T4](https://testnet.nearblocks.io/txns/EWywBLBSiwZ5F47GYwwSGyBrbMJPz6v6Svj6ECqXKHuT) · [T5](https://testnet.nearblocks.io/txns/6YEmjM2aaj5YBzg48844XKgLxJqN5EboV7PV1bGjvR3m) · [Receipts and balance evidence](LIVE_TESTNET.md)

Run `node scripts/verify-final-testnet.mjs` from the repository root. The captured responses contain all five finalized transactions. T4 callback `DK419poBwS851QphdEBDSWncUB1kFBSGD1unCrsorxE` emitted `payment_succeeded`. T5 vault receipt `6NtZDTGovHSxaC4JxtV5Knkw3p1aCjV9E6Enpdn4bzGK` contains the contract panic. The three-key concurrency case below was executed in the Linux sandbox.

## One clean local path

Use Node 22+ (tested 24.19.0), Rust 1.93.0 and the pinned Cargo locks. On Windows, Rust native compilation requires MSVC Build Tools/Windows SDK. The Node demo/interface has no npm dependencies. No wallet, keys, AI API subscription, Docker or RPC is needed for these commands. Cargo needs its locked dependencies cached or downloaded by the user; append `--offline` when cached. Run from the repository root:

1. `node agent/cli.mjs inspect --mode offline`

   Expect JSON with mandate 1, ACTIVE **at the recording's time**, the merchant/agent restrictions, available 1/pending 0/spent 0, and `execution_enabled:false`. It is not current testnet state.

2. `node agent/cli.mjs request --mode offline --fixture authorized --task service-order-42`

   Expect ALLOW, a stable content-derived request ID, a zero-deposit unsigned `execute_payment` intent bound to a restricted public key, protocol-aware fee projection, and NOT_SUBMITTED. The projected fees use a labeled historical protocol-88 reference, not the sandbox's historical protocol-86 fee schedule.

3. `node agent/cli.mjs request --mode sandbox --fixture authorized --task service-order-42`

   Expect **recorded sandbox replay**, FINALIZED_SUCCESS / SUCCEEDED, the actual historical transaction hash, terminal callback receipt/gas and accounting. There is no new sandbox execution. A task label attached now is not claimed to have existed in that historical transaction.

4. `node agent/cli.mjs request --mode offline --fixture redirect`

   Expect BLOCK, no unsigned intent and NOT_SUBMITTED. `--fixture review` returns REVIEW for the advisory .25 NEAR threshold. Neither response submits anything.

5. `node agent/challenge.mjs`

   Expect verification PASS for **eight recorded cases**: legitimate payment, unauthorized recipient, replay, expiry, three-key competition, genuine native transfer failure, paid-transfer callback failure, refunded-transfer callback failure. Each is labeled recorded-production-sandbox or recorded-diagnostic-sandbox. “PASS” means the verifier found the expected historical evidence, not a new runtime test. The latter two correctly leave payment status UNKNOWN and pending .1; they do not demonstrate recovery.

6. `node --test agent/test/*.test.mjs demo/test/*.test.mjs`

   Expect **43 tests pass** (26 interface/security regressions + 17 existing demo tests). New tests use mocks/recorded data, not keys, signatures or a network. Then `cargo test --locked` gives **56 native tests**, and `cargo test --manifest-path integration-tests/Cargo.toml --lib --locked` gives **7 harness tests**. Total portable profile: **106 tests**. These counts do not include the historical 75-check Linux run.

7. `node demo/server.mjs`

   Open http://localhost:3000. Follow the page's numbered sequence: replay mandate creation; legitimate payment; malicious redirect; independent onchain rejection; three concurrent .40 requests. All are explicitly recorded fixtures. Stop with Ctrl+C. If 3000 is occupied, stop only your own known demo instance or use the exported server API with another port; do not terminate an unknown process.

## An actual agent can call the interface

Any process capable of invoking a CLI can submit its own JSON proposal, without a model-specific SDK:

```text
node agent/cli.mjs request --mode offline --input request.json --task service-order-42
```

Example file (recipient matches the bundled authorized fixture):

```json
{"recipient":"merchant.authorized.test.near","amount":"0.10","nonce":0,"instruction":"Pay the approved service invoice."}
```

Use `--input -` for JSON on stdin. The SDK exports `inspect`, `prepare`, and `requestIdentity` from `agent/sdk.mjs`; `agent/receipts.mjs` normalizes evidence. This is a usable inspection/request-preparation interface, not proof that an LLM used it or that a payment was made. All output is JSON. Unknown modes/options, authority overrides and malformed proposals fail closed. Task identifiers are non-secret labels; do not put credentials or personal information in request text.

`testnet` mode uses read-only finalized observations and requires explicit `--vault`, `--agent`, `--public-key` values. For example, `inspect --mode testnet` with those arguments reads the current mandate, key, accounts, protocol and deployed code hash. A `request` additionally evaluates a proposal against that snapshot. No signing/broadcast method exists; no flag enables it. These optional commands contact public RPC and were **not run** during Phase 5. Existing R3 uncertainty and execution permits remain untouched. Preparation is not approval: an allowed unsigned intent may become stale or lose a race before any future authorized execution.

## What NEAR enforces, and what is advisory

| Control | Generic offchain agent check | MandateLock boundary |
|---|---|---|
| Recipient and amount checks | Agent can bypass local logic | Frozen contract checks allowlist, per-call ceiling and mandate |
| Cumulative spending under racing calls | Concurrent callers may each see stale balance | Contract reserves available budget before scheduling transfer |
| Key scope | Full wallet keys may expose all account actions | Function-call key binds receiver/method; zero deposit; finite gas allowance |
| Task/job identity | Human-readable local label | Owner-created mandate ID is onchain; task meaning/delivery is not |
| Review threshold | Local product policy | REVIEW remains offchain; it neither overrides nor adds contract permission |
| Final payment result | RPC acknowledgement can be mistaken for success | Receipt separates transaction finality, callback settlement and accounting |
| Callback uncertainty | Unsafe timer/refund heuristics may restore quota | Pending stays reserved; no safe automatic recovery is offered |
| Operator custody | Key management is often omitted | Retained full-access owner/vault/admin keys are disclosed, not solved |

This comparison is about control designs, not claims about particular competitors. Function-call-key allowance pays gas; it is not the mandate's payment budget or a token transfer. The Phase 4 .1-allowance defect showed why the protocol's minimum receipt gas purchase price matters. The new preflight reuses the corrected calculator, checks account storage/gas reserves and vault backing, and refuses unreviewed protocol versions. Fixed 100 Tgas matches the reviewed payment profile; actual runtime gas behavior remains subject to evidence and protocol changes.

## Receipt and evidence interpretation

[Receipt schema](../agent/receipt.schema.json) has request/task identity, advisory authorization, transaction hash when matched, finality, transaction status, payment status, settlement, accounting and callback IDs/gas. A transaction can finalize with failure while the payment is still UNKNOWN because transfer succeeded but callback failed. A transfer may fail and the callback successfully restore available budget; that is FINALIZED_FAILURE / FAILED_REFUNDED at the payment level. Timeouts/UNKNOWN_TRANSACTION never imply finalized failure. No receipt is a cryptographic proof independent of its input source.

[Original recording manifest](../demo/evidence/manifest.json) and [expanded challenge manifest](../agent/evidence/manifest.json) preserve exact source bytes and provenance. The challenge independently checks three distinct hashes/keys, two successes and ERR_BUDGET, final ledger identity, and inclusion block hashes. These records establish same-block transaction inclusion **in that sandbox run only**; receipts may execute in later blocks. They do not prove public-testnet same-block competition or all intra-block solvency states.

Original transaction 9 and R3 both expired with finalized nonce and state corroborating non-execution. T4 is the successful later payment. Earlier phase reports describe their observation dates. No production custody sign-off is given. [Public testnet evidence](LIVE_TESTNET.md) · [Demo storyboard](DEMO_STORYBOARD.md)
