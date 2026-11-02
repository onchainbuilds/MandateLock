# Phase 5 — agent request interface and verifiable security challenge

**GO for local agent integration and judge evaluation. NO-GO for public-chain execution, production custody, or claiming the hackathon entry complete.** No keys were created, no transaction was signed/broadcast, no accounts changed, no workflow or remote publication occurred. R3 remains UNRESOLVED. Production contract/model, locks, Wasm and historical evidence are preserved.

## Gap audit and reuse

| Area | Existing capability | Phase 5 addition or boundary |
|---|---|---|
| Real agent integration | `demo/agent.mjs` deterministic fixture evaluator and recorded transport | Importable SDK and JSON/stdin CLI accept a real external process's proposals; no live LLM claim |
| Restricted-key signing | `testnet/sdk.mjs` near-api-js 7.4.0 explicit restricted credential/signing path | Reused public call shape, not credential loading; new interface outputs unsigned restricted-key-bound requests only |
| Preflight | Corrected `testnet/access-key-cost.mjs`, account/storage/ledger checks, execution permit gates | Reuses fee calculator and deterministic policy; adds general mandate observation, lifecycle, stale-state/code/key/custody checks |
| Lifecycle | Frozen `get_policy`, `get_accounting`, `get_payment` and owner retirement/creation | Unified inspect view: no mandate, active-at-observation, paused, revoked or expired; pending is never automatically recovered |
| Settlement/failure | Genuine native-failure records, successful callbacks, diagnostic paid/refunded callback failures | Structured receipt separates finalized transaction from payment result and pending uncertainty |
| Machine-readable evidence | Raw RPC/receipt/state JSON and file manifests | Versioned receipt schema with request identity, authorization, known hash, finality, settlement, callback gas and accounting |
| Concurrency | Three restricted keys, independently submitted valid sandbox transactions, budget rejection | Challenge verifies actual outcome counts/accounting and reports matching inclusion-block hashes; scope remains recorded sandbox |
| Judge workflow | 80 portable checks, localhost recorded demo, historical 75-check Linux run | One-command eight-case challenge, 26 new tests, concise README and dedicated judge guide |

The product remains task-scoped by mapping an owner's job to one mandate. Task labels/intent text are local metadata, not new contract-enforced semantics. Service delivery, task authenticity, durable client-side idempotency and live LLM reasoning are not implemented. The frozen contract's application nonce remains the authoritative replay defense. Features requiring semantic task enforcement or safe uncertain-callback recovery would require contract/product redesign and are explicitly not implemented.

## Interface and modes

`agent/sdk.mjs`: `inspect`, `prepare`, `requestIdentity`, recorded context/fixture helpers. `agent/cli.mjs`: `inspect|request`, JSON input file or stdin, explicit offline/sandbox/testnet modes. Calls bind the observed mandate, agent account/key, vault, method, application nonce, recipient, amount, zero deposit and fixed reviewed 100 Tgas. Request identity is deterministic; it is not a transaction signature or reserved nonce. There is no execution switch and no signing/broadcast import in the interface.

- **Offline:** inspect a labeled recorded policy; perform advisory checks and return an unsigned intent. Fee projection uses a labeled captured public protocol-88 reference, not a fresh network observation or historical sandbox fee claim.
- **Sandbox:** same request API, with exact-match replay of verified production sandbox records. If a call does not match a recording, no successful execution is invented. A newly supplied task label is not attributed to the historical transaction.
- **Testnet:** explicit public account/key arguments; read-only pinned finalized views and frozen deployed-code verification. Requests remain unsigned and disabled even if advisory checks ALLOW. These optional network reads were not invoked during this task. R3 is neither retried nor reconciled by this interface.

The fixed read-only transport allowlists only status, block, query and protocol-config methods on reviewed testnet endpoints. No arbitrary endpoint, mainnet or mutating RPC is accepted. The historical signing adapter remains separate and disabled. Closing that boundary for a real authorized payment remains future approved work; Phase 5 does not claim a complete live payment service.

## Safety and evidence

Preflight checks policy/key binding, lifecycle/expiry, recipient, ceiling, available budget, request slot, policy/accounting consistency, finite key allowance, protocol minimum receipt-gas purchase price, account storage/prepaid-gas funding and vault liquid backing. Testnet observations must be recent, pinned to one finalized block and match frozen Wasm. Retained vault full-access keys generate an explicit custody warning; absent custody evidence is labeled unverified. Pending obligations cause REVIEW, not budget release.

Local review policy is advisory. It cannot override the contract, reserve budget or guarantee a later transaction will succeed. The onchain contract remains responsible for current authorization, atomic reservations, replay and private/idempotent callback settlement. Protocol changes fail closed rather than silently retaining old fee assumptions.

`agent/receipts.mjs` and [JSON schema](../agent/receipt.schema.json) distinguish:

- NOT_SUBMITTED from UNKNOWN.
- FINALIZED_SUCCESS/FINALIZED_FAILURE of the transaction from payment status.
- SUCCEEDED, FAILED_REFUNDED, REJECTED, PENDING_UNCERTAIN and UNKNOWN settlement.

A known submitted hash can accompany UNKNOWN without a receipt. Final payment classification requires matching signer/key/receiver/method/args/gas, FINAL outcomes, the relevant vault event and matching accounting/slot state. Timeout alone never becomes failure. Receipts trust their supplied evidence/RPC observations; hashes ensure local consistency, not independent whole-chain cryptographic verification.

`agent/challenge.mjs` verifies eight cases: authorized payment, unauthorized recipient, replay, expiry with a strictly post-expiry block timestamp, concurrent cumulative budget, genuine absent-recipient native failure with refund settlement, and two diagnostic failed-callback branches (paid and refunded). The latter remain payment UNKNOWN with .1 pending; later payment and retirement rejection are retained. No recovery is fabricated. The original recordings are copied byte-for-byte into an expanded manifest; source paths and workflow provenance remain explicit.

## Verification

**200 permitted local tests PASS / 0 FAIL:** 26 new interface/evidence tests + 17 demo + 94 nonsigning private operator + 56 native contract/security + 7 harness. `cargo fmt --check`, root Clippy and integration `--tests --no-run` pass. Existing compiler-cache hard-link warnings do not indicate source/test failures. Initial development failures exposed a mutable shared test protocol reference and a verifier assumption about receipt-body availability; these were corrected locally without changing production code or records.

Two existing SDK/review test files create ephemeral keys and signatures, so they were deliberately not run under this task's no-key-creation restriction. New sandbox runtime tests were not executed under the no-broadcast restriction/native Windows limitation. Historical 75-check runtime and six initialization results remain prior evidence, not newly rerun successes. No claim is made that every executable integration scenario ran locally.

The portable judge profile is **106 tests** (26 agent + 17 demo + 56 native + 7 harness), plus the eight-case evidence verifier. It needs no private artifact download or optional near-api-js installation. The additional 94 operator tests require the private working evidence and are not part of that clean-checkout profile. Fresh Windows reproduction uses Node 24.19.0, Rust 1.93.0 and existing cached locked Cargo dependencies; cold installs and other platforms remain unverified.

Commands and expected results are in [JUDGE_PHASE5.md](JUDGE_PHASE5.md). Local evidence/logs and the isolated candidate manifest are under `artifacts/phase5/`; these audit artifacts are not publication inputs. Previous 343- and 355-file release packages remain unchanged. The Phase 5 candidate is a separate proposed tree, not a pushed commit or repository replacement.

## Changed scope and remaining work

New: `agent/` SDK/CLI, observer, receipts/schema, challenge, 26 tests, 21 selected/derived evidence files plus manifest; `docs/JUDGE_PHASE5.md`; this report. Updated current `README.md`. Existing MIT notices and selected dated public evidence were copied into current repository-relative judge locations without changing their bytes. The corrected fee helper is reused unchanged. Existing demo code and historical operator implementations are not redesigned.

Before a live public demo: independently reconcile R3 after its validity checkpoint; approve a fresh bounded key/mandate/execution plan; verify actual allowance, fees, keys, nonces and remaining cap; obtain finalized payment/rejection/callback/balance evidence. Before submission: review the final staged manifest/history, approve publication, finish video and human metadata, and verify current official rules/deadline. No remote action is authorized by local GO.

Known risks remain stranded reservations after failed callbacks, full-access operator custody, unverified intra-block solvency, trusted RPC/host/evidence integrity and lack of production security audit. No new contract feature or safe recovery mechanism is claimed. No Project 2 work began.
