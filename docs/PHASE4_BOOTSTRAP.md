# Phase 4 revised bootstrap-only execution

**PASS — one faucet-sponsored creation request, independently confirmed FINAL.** No deployment/setup or agent payment transaction was submitted.

The user explicitly revised the bootstrap authorization to allow the helper-controlled initial grant to exceed the former 8 testnet NEAR incoming cap. This revision did not authorize the eight setup or five agent transactions. Production code, reviewed config and Wasm remain unchanged.

## Preflight and single request

On 2026-10-31, immediately before submission, the execution checked:

- Exact reviewed config and dependency-lock hashes; frozen production Wasm hash.
- Owner `ml-demo-20261031.testnet` and all four proposed subaccounts absent at a finalized testnet block.
- Reviewed owner public key matched the locally held private key by public-key derivation; no signing was needed. The secret remained outside the repository and browser and was not printed.
- RPC chain `testnet`, pinned endpoint, protocol 88, storage/action fee schedule and reviewed gas ceiling matched.
- Both local and finalized block clocks were before the execution deadline of November 1, 2026, 15:00 UTC (10:00 a.m. EST).
- No earlier bootstrap request claim existed. A durable exclusive claim was written before the request; rerunning the script refuses that claim.

Exactly one POST to `https://helper.testnet.near.org/account` was made at **2026-10-31 14:58:25 UTC (10:58:25 a.m. EDT)**, with only:

```json
{
  "newAccountId": "ml-demo-20261031.testnet",
  "newAccountPublicKey": "ed25519:uuukiCHdpBwSHGzoxGTQBZLJt4mLo8xaQZWW2uM1no4"
}
```

The response was HTTP 200 at 14:58:28 UTC, initially `EXECUTED_OPTIMISTIC`. That response alone was not treated as final. Independent read-only RPC reconciliation subsequently returned `FINAL`; account and key state were queried at a finalized block at or after every transaction/receipt block. Confirmation completed **2026-10-31 14:59:16 UTC**, before the approved deadline. No request was retried.

## Finalized transaction and actual account state

| Item | Verified value |
| --- | --- |
| Result | PASS, `FINAL`, successful transaction and both receipts |
| Transaction | `HhF51drrwKbaauC1MQLqpPjFUcHXHzvCvX9qzAvvoAjQ` |
| Explorer | [Testnet transaction](https://testnet.nearblocks.io/txns/HhF51drrwKbaauC1MQLqpPjFUcHXHzvCvX9qzAvvoAjQ) |
| Sponsor signer | `testnet` |
| Receiver | `ml-demo-20261031.testnet` |
| Exact actions | CreateAccount; Transfer `10000000000000000000000000` yoctoNEAR; AddKey reviewed owner key with FullAccess |
| Received and observed balance | **10 testnet NEAR**, `10000000000000000000000000` yoctoNEAR |
| Locked balance | 0 |
| Storage usage | 182 bytes |
| Code hash | `11111111111111111111111111111111` — no deployed contract |
| Installed keys | Exactly one, the reviewed owner public key, FullAccess |
| Observed key nonce | `275614533000000` |
| Finalized account-view block | 275614600, `2WbN2pzyiRN5WYbMX42PymLkp5KoGEvoRdkHcL5ok4ov` |
| Contract callback | Not applicable: no contract or function call in bootstrap |

| Receipt | Executor | Outcome | Gas burnt | Tokens burnt (yoctoNEAR) |
| --- | --- | --- | ---: | ---: |
| `9WsJSZ2zioK86iVfvvNXVAzWm18NiznyFoD6oQEAmasV` | `ml-demo-20261031.testnet` | SuccessValue, empty logs | 7,524,947,687,500 | 7,032,494,768,750,000,000,000 |
| `C3tDtS2AshGrY3fAB4wHv2TgZAdCG1Ct91ifN9a5nvjD` | `testnet` | SuccessValue, empty logs | 223,182,562,500 | 0 |

Transaction inclusion block 275614533 led to owner execution block 275614534 and sponsor-side receipt block 275614535. Transaction plus receipt gas burnt: **8,573,077,937,500 gas (8.5730779375 Tgas)**. Reported total tokens burnt: **0.0071149895375 NEAR**, paid through the sponsor execution; the owner's observed balance is the full 10 NEAR. Bootstrap native actions have no caller-selected FunctionCall gas/deposit fields or settlement callback.

## Evidence and scope

Preserved under `artifacts/phase4-execution/`:

- `bootstrap-preflight.json`: finalized absence, network, protocol and fee checks.
- `bootstrap-request.jsonl`: exclusive pre-request claim and HTTP response metadata.
- `bootstrap-helper-response.txt`: original optimistic helper response.
- `bootstrap-final-transaction.json`: independent FINAL transaction and receipt outcomes.
- `bootstrap-receipt-block-0.json` through `bootstrap-receipt-block-2.json`: inclusion and receipt block evidence.
- `bootstrap-after-block.json`, `bootstrap-owner-state.json`, `bootstrap-owner-keys.json`: consistent finalized account/key snapshot.
- `bootstrap-result.json`: machine-readable summary with exact hash, explorer link, balance and permissions.
- `bootstrap-once.mjs` and `verify-bootstrap-readonly.mjs`: exact local execution/reconciliation scripts. **Do not rerun the creation script.** Its existing claim intentionally blocks another request. The reconciliation script is read-only.

**Counts:** 1 bootstrap PASS; 0 failed or uncertain bootstrap requests; 0 retries; 0 additional faucet requests; 0 setup transactions; 0 agent transactions. All eight setup and five agent scenarios remain UNVERIFIED/unexecuted. No vault exists from this execution, no agent key permissions have been installed, and no payment, contract callback or mandate accounting result is claimed.

The existing 115 local passing tests and Phase 2B runtime results are prior evidence, not rerun or relabelled as testnet execution. Production source and both Wasm artifacts were rechecked unchanged. No commit, push, workflow, publication or mainnet action occurred. The localhost interface remains in its prior preparation/recorded modes; bootstrap is documented here rather than presented as a live payment demo.

## Stop and subsequent approval boundary

Bootstrap is complete. **NO-GO for further execution without separate approval.** The previous incoming-funding cap exception applies only to this one helper request. Subsequent total transfers and attached deposits must remain within the previously proposed **8 testnet NEAR** budget.

The currently proposed setup transfers/deposits total **6.2 NEAR**. Expected successful agent payouts total **.9 NEAR**, giving **7.1 NEAR** when counting both the setup funding transfers and downstream payouts. The three budget competitors' requested amounts are not all expected to transfer. Excess bootstrap funds do not authorize larger deposits, further accounts, extra transactions, withdrawals or additional faucet requests.

Before a future approval/execution package, distinguish the now-authorized 10 NEAR incoming grant from the outgoing 8 NEAR budget: the existing deployment script still rejects an owner balance above 8 NEAR. That guard has **not** been weakened or edited. A separately reviewed correction would be required to recognize this verified grant while preserving the outgoing cap. Fresh state, expiry, signer, key, deposit/gas and frozen artifact checks remain mandatory.

Retained full-access keys bypass policy; same-user Windows processes are not isolated; missing/failed callbacks may strand future pending reservations; intra-block solvency remains unverified. Bootstrap success is not a contract or custody security sign-off. No other phase is authorized.
