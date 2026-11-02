# Give a compute buyer a bounded spending mandate

Run `node agent/judge.mjs` from the checkout root. Node 22.22.2 or newer is the only prerequisite for this walkthrough. A deterministic client starts a separate MCP process, negotiates the protocol, discovers tools and sends actual JSON-RPC requests. Its final PASS requires the captured public receipts and the recorded sandbox competition to verify. The complete walkthrough uses local files and a temporary unsigned-request inbox.

| Command | Result |
|---|---|
| `node agent/judge.mjs authority` | Observed clock, lifecycle, agent key, recipient allowlist, budget, pending and spent amounts |
| `node agent/judge.mjs task` | Validated owner-call draft for one hour from invocation, one compute merchant, 1 NEAR principal and .40 ceiling |
| `node agent/judge.mjs payment` | ALLOW, exact zero-deposit unsigned intent, stable request ID and local operator handoff |
| `node agent/judge.mjs attack` | Direct MCP request naming the attacker's recipient returns BLOCK and a null intent |
| `node agent/judge.mjs receipts` | Captured public T4 settlement and T5 vault rejection with receipts, gas and explorer URLs |
| `node agent/judge.mjs concurrency` | Three independent sandbox requests for .40 each. Two settle, one reaches the vault and fails ERR_BUDGET |
| `node demo/server.mjs` | Open http://localhost:3000/testnet for the inspector. Its first view works offline. Select **Read finalized testnet state** to make fresh read-only RPC queries. |

### Connect an agent

Configure a local MCP stdio server with command `node` and one argument, the absolute path to `agent/mcp.mjs`. The client can discover each tool's JSON Schema using `tools/list`. The implementation supports JSON-RPC initialization, version negotiation, initialized notifications, ping, tool discovery and calls over newline-delimited UTF-8 stdio. Tool results contain JSON text. The demonstrated protocol version is 2025-11-25. [MCP lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle) · [stdio transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

- Default mode uses the captured sandbox policy and its observation clock for preflight. Its labeled historical protocol-88 fee projection is advisory. Sandbox mode (`--sandbox-replay`) can associate an exact matching intent with a real prior restricted-key transaction and callback.
- Set `--testnet-read-only` at server startup to inspect the configured deployed vault and existing agent K0 using finalized RPC views. This mode checks deployed Wasm, observation freshness, actual key permission, account/storage funding, gas purchase allowance, mandate, ceiling, recipient, nonce slot and available budget through the existing Phase 5 SDK. Only the operator selects the mode and public account bindings.
- Optionally add `--outbox DIRECTORY` to keep unsigned, allowed requests in an operator-managed local directory. A complete file is linked into place exclusively under its request ID. Repeating an identical request does not overwrite the original. A later MCP session can look it up. A handoff reserves neither onchain funds nor an access-key nonce. A future authorized executor must revalidate state immediately before signing. The judge creates and removes its own temporary inbox.
- `get_payment_status` accepts a session/inbox request ID or a testnet transaction hash. For a live lookup, known T4/T5 outcomes must match the frozen receipts. Other supported payment hashes must match the configured agent, restricted public key, vault and zero-deposit 100 Tgas method. Missing records or inconsistent observations produce UNKNOWN. Each lookup is a single attempt.
- Signing and broadcasting are deliberately omitted from MCP. The existing separately authorized operator path holds credentials. An agent may request payment and hand off its unsigned intent. It cannot self-authorize expenditure, change keys or reinterpret a fresh request as settled.

### What the one-hour task means

The owner-call draft names the actual `create_mandate` arguments and owner signer. A developer can supply a named `merchant` and UTC `start_utc` to `draft_compute_task`. The draft validates named-account restrictions, agent and owner separation, approved restricted public key, recipient, amounts and expiration. Its funding prerequisites are an absent active mandate and sufficient unallocated principal. A draft neither creates the mandate nor changes the authority displayed by inspection. The example's planned start is used to calculate expiry. The contract has no scheduled activation field.

The agent can call `execute_payment` on the specified vault with zero attached deposit. The owner controls configuration. Contract checks limit payout to configured merchants, payment ceiling, remaining budget, expiry, authorized agent/key and unused application slot. At expiry, pause or revocation, new payments stop. Fully reserved and exhausted budgets are distinguished. Outstanding reservations can remain after a paid or refunded transfer if the callback fails. There is no automatic recovery or timeout refund.

The task name and supplier's instruction text are offchain descriptions. The local .25 NEAR REVIEW threshold is an advisory hold with no onchain approval mechanism. The scripted malicious supplier explicitly proposes changing the recipient. The integration rejects the unauthorized destination even if the caller skips the check tool and invokes the request tool directly. This demonstrates bounded payment authority. It makes no general claim about detecting malicious language.

### Evidence and limits

T4 paid the merchant .10 testnet NEAR, and its private callback settled slot 0. A separate public T5 call bypassed the local gate and reached the vault. The vault returned ERR_RECIPIENT, and the attacker received zero. The final observation showed .90 available, zero pending and .10 spent. The retained history records cumulative outgoing of 6.3335820306082425 testnet NEAR under the original 8 cap. The concurrency example comes from a separate 1 NEAR Linux sandbox mandate. [T4, T5 and receipt IDs](LIVE_TESTNET.md) · [Evidence manifest](evidence/final-testnet/manifest.json)

The inspector defaults to hash-verified captured public evidence. A deliberate refresh reads deployed code and authority at one finalized block and checks both historical receipts. A live observation failure is displayed as UNKNOWN. The captured evidence remains independently selectable. Operator full-access vault/owner keys can bypass policy. A separate full-access agent administrator is operator-held. Receipt-block balances do not prove continuous intra-block solvency. No production custody sign-off is claimed.

### Reproduce on a clean checkout

1. `node agent/judge.mjs` — full offline MCP transcript, eight-case evidence verifier and PASS.
2. `node scripts/verify-final-testnet.mjs` — five finalized public transactions at height 275933389, independently captured from two RPC providers.
3. `node --test agent/test/*.test.mjs demo/test/*.test.mjs testnet/test/ui.test.mjs` — MCP, workflow, receipt, guard and loopback tests.
4. `cargo test --locked` and `cargo test --locked --manifest-path integration-tests/Cargo.toml --lib` — 56 native tests and 7 harness tests. Rust 1.93.0 is pinned. Windows needs MSVC Build Tools/SDK. Add `--offline` when the locked dependencies are cached.

### Gap audit and differentiation

Phase 5 already supplied deterministic policy, fee calculation, signed-key binding in the unsigned intent, receipt classification, a read-only deployed-state observer and the recorded challenge. The 397-file candidate also supplied the final public proof. Phase 6 reuses those implementations for a discoverable agent protocol, validated task draft, durable optional handoff, request/status lookup and a current-state inspector. The verifier is callable as a library so the inspector and CLI share the same proof checks.

Relative to a feature-list comparison with AgentGuard, MandateLock's demonstrable product value is that a tool-using agent can inspect narrow financial authority, request a payment under it and independently verify a terminal outcome. The local refusal, public vault rejection and recorded budget race test different boundaries. No comparative security ranking or claim about a competitor's unverified capabilities is needed. Actual model behavior, arbitrary prompt-injection detection, automatic disbursement from MCP, and safe stranded-reservation recovery are outside the demonstrated scope.

