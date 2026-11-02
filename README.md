# MandateLock

**Give an agent authority to pay for one bounded job, while the owner keeps control of the treasury.**

An owner sets a NEAR mandate: approved agent keys and recipients, a per-payment ceiling, total budget and expiry. The agent can propose payments. The frozen Rust contract authenticates the caller, reserves budget before asynchronous transfers, and settles accounting through private callbacks. Racing requests cannot each reuse the same remaining budget.

This helps an agent buy services from an approved supplier while processing untrusted instructions. A malicious recipient redirect is blocked locally; an independently submitted unauthorized call still faces the contract. The human task label is offchain metadata, not proof of service delivery or a semantic rule understood by the contract.

**Current product:** a JSON CLI/SDK for mandate inspection and restricted-key-bound unsigned requests, an advisory ALLOW/REVIEW/BLOCK preflight, machine-readable evidence receipts, and a localhost recorded-evidence demo. No live LLM is used. Sandbox mode replays genuine historical transactions; testnet mode is read-only and cannot sign or broadcast.

Official repository [onchainbuilds/MandateLock](https://github.com/onchainbuilds/MandateLock). Hackathon track **AI Security & Defense**.

On November 2, 2026, Mandate 3 paid the authorized merchant **0.10 testnet NEAR**. The private callback settled slot 0. A separate restricted-key request reached the vault and failed with **ERR_RECIPIENT**. FastNEAR and dRPC agreed at finalized height **275933389**. [T4](https://testnet.nearblocks.io/txns/EWywBLBSiwZ5F47GYwwSGyBrbMJPz6v6Svj6ECqXKHuT) · [T5](https://testnet.nearblocks.io/txns/6YEmjM2aaj5YBzg48844XKgLxJqN5EboV7PV1bGjvR3m) · [Receipts and balance evidence](docs/LIVE_TESTNET.md)

T4 callback receipt `DK419poBwS851QphdEBDSWncUB1kFBSGD1unCrsorxE` settled the payment. T5 vault receipt `6NtZDTGovHSxaC4JxtV5Knkw3p1aCjV9E6Enpdn4bzGK` recorded the rejection. Three-key budget competition is a separate Linux sandbox recording.

## Try the compute buyer

Run **`node agent/judge.mjs`** for the complete offline MCP walkthrough. A scripted client inspects spending authority, drafts a one-hour compute job, hands off a restricted-key-bound request, attempts a recipient redirect and verifies both public settlement and recorded sandbox competition. [Agent connection, commands and task workflow](docs/PHASE6.md). Open http://localhost:3000/testnet for captured public receipts or an explicit live read-only refresh.

## Run this, expect this

Use Node 22+ (tested 24.19.0), Rust 1.93.0 for native tests, and MSVC Build Tools/SDK for Windows Rust. The Node interface/demo has no npm dependencies. No keys, funds, AI API subscription, Docker or RPC are needed for this judge path. Run from the repository root:

1. `node scripts/verify-final-testnet.mjs` → five finalized public transactions, merchant +0.10, attacker +0, and final mandate accounting 0.90 / 0 / 0.10. This command reads the bundled observations offline.
2. `node agent/cli.mjs inspect --mode offline` → recorded mandate, limits, lifecycle and execution disabled.
3. `node agent/cli.mjs request --mode offline --fixture authorized --task service-order-42` → ALLOW, unsigned intent, NOT_SUBMITTED.
4. `node agent/cli.mjs request --mode sandbox --fixture authorized` → **recorded** finalized success, callback and accounting; no broadcast.
5. `node agent/cli.mjs request --mode offline --fixture redirect` → BLOCK; use `--fixture review` for REVIEW.
6. `node agent/challenge.mjs` → eight evidence-verification cases PASS, labeled production or diagnostic **recorded sandbox**, with no new chain execution.
7. `node --test agent/test/*.test.mjs demo/test/*.test.mjs testnet/test/ui.test.mjs` → **53 PASS**. `cargo test --locked` → **56 PASS**. `cargo test --manifest-path integration-tests/Cargo.toml --lib --locked` → **7 PASS**. Total **116 portable tests**; add `--offline` to Cargo commands when dependencies are cached.
8. `node demo/server.mjs` → open http://localhost:3000 and follow the numbered recorded mandate/payment/attack/concurrency sequence. Ctrl+C stops your instance. If port 3000 is occupied, do not terminate an unknown process.

An actual agent process can submit its own JSON proposal with `node agent/cli.mjs request --mode offline --input request.json --task service-order-42`, or use `--input -` for stdin. This returns structured decisions; it does not claim an LLM made them or a payment occurred. [Exact request format, SDK exports, modes and expected outcomes](docs/JUDGE_PHASE5.md).

## What the evidence demonstrates

- The contract enforces agent/key authority, recipient allowlist, ceiling, cumulative budget, expiry and replay protection. Available funds become pending before transfer promises execute.
- NEAR function-call keys restrict receiver/method and prohibit attached deposits. Their finite allowance purchases gas separately from the payment budget. The corrected preflight includes minimum receipt gas purchase price and account storage reserves.
- [Machine-readable receipts](agent/receipt.schema.json) distinguish transaction finality from payment settlement. Timeout or missing callback never converts UNKNOWN to failure or releases budget.
- [Original recordings](demo/evidence/manifest.json) and [expanded challenge records](agent/evidence/manifest.json) are hash-verified. Three independently signed .40 requests yield two payments and ERR_BUDGET, without nonce conflicts. The verifier reports same-block **sandbox inclusion** only where recorded hashes establish it, not public-testnet concurrency.
- Historical Linux validation passed **75 checks**, including all 12 Phase 2A scenarios and four Phase 2B aggregates. [Bundled summary](docs/evidence/phase2b-75-summary.json). This is prior execution, not 75 new tests run by the challenge. Callback fault cases explicitly use diagnostic Wasm.

The browser replays separate sandbox fixtures. The public testnet proof is available through the offline verification command above. [Judge walkthrough](docs/JUDGE_PHASE5.md) · [Two-minute storyboard](docs/DEMO_STORYBOARD.md)

## Remaining limits

Failed or missing callbacks can strand reservations indefinitely after either a paid or refunded transfer. **No safe automatic recovery is implemented.** Retained owner/vault full-access keys and the separate operator-held agent-admin key remain custody risks; the agent/browser receives none of them. Finalized snapshots do not prove all intra-block solvency states. RPC observations and manifests are trusted inputs, not independent whole-chain proofs. There is **no production custody security sign-off**.

Preflight is advisory and can become stale; only an approved transaction reaching the contract can enforce current state. Task names, REVIEW thresholds and instruction text add no onchain authority. Historical public-testnet operator scripts remain disabled and outside the portable judge path. New sandbox execution requires supported Linux and separate authorization; none was performed for Phase 5.

Frozen production Wasm SHA-256: `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`. [Frozen source manifest](demo/production-lock.json). No contract changes were required.

[MIT LICENSE](LICENSE): Copyright (c) 2026 onchainbuilds. [Third-party notices](THIRD_PARTY_NOTICES.md). AI-assisted development is disclosed; no external inference service is used. [Phase 5 audit and results](docs/PHASE5.md). Public release, the demo post and final application require separate owner approval.
