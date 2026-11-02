# Phase 4 approved execution — safe stop before bootstrap

**Subsequent update:** The user separately approved one helper-controlled bootstrap grant. That request finalized successfully with 10 testnet NEAR; no setup/agent transactions followed. See [PHASE4_BOOTSTRAP.md](PHASE4_BOOTSTRAP.md). The remainder of this file preserves the earlier safe-stop record.

Date: 2026-10-31. Official repository: `onchainbuilds/MandateLock`.

**NO-GO for continued execution under the current bootstrap path.** The user approved the exact plan in `PHASE4_APPROVAL.md`, including an aggregate 8 faucet NEAR cap. Execution stopped before any faucet request, account creation, signing or transaction submission because that cap could not be verified for the named-account bootstrap service. This is an unresolved infrastructure/funding prerequisite, not a confirmed contract defect or an onchain transaction failure.

## Verified preflight

- Exact reviewed configuration SHA-256: `a900b86f3eca441451a63e55e81c7cd17c29b58a16007d935b5904f5ca25059a`.
- Lockfile matched the approval package; the permit was checked in memory against the user's authorization. No executable `approved:true` permit was persisted.
- Frozen Linux Wasm passed the approved hash check: `3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87`.
- Pinned RPC `https://rpc.testnet.near.org` identified itself as testnet. Protocol 88, storage price and action-fee digest matched; gas price was `100000000` yoctoNEAR/gas.
- At **2026-10-31 14:52:37 UTC (10:52:37 a.m. EDT)**, finalized block **275613879**, hash `2sDS6kXks7L9e931Ra67AftpmPSUhSNcY2R82W7UE8hY`, all five IDs returned structured `UNKNOWN_ACCOUNT`: owner `ml-demo-20261031.testnet` and its `vault`, `agent`, `merchant`, `attacker` subaccounts. This is absence, not a zero-balance account.
- No existing execution journal for this configuration was found.
- The execution deadline, November 1, 2026 at 15:00 UTC (10:00 a.m. EST), had not been reached.

Raw finalized account responses, protocol, gas price and block header are preserved in `artifacts/phase4-execution/preflight.json`. The prior pre-deployment evidence was not overwritten.

## Bootstrap blocker and exact read-only failures

The [official NEAR CLI documentation](https://docs.near.org/tools/cli) describes sponsor-by-faucet account creation. The [helper's account-creation implementation](https://raw.githubusercontent.com/near/near-contract-helper/master/src/middleware/createAccount.js), lines 12, 29, 50–54 and 59–62, selects the transfer from server-side `NEW_ACCOUNT_AMOUNT`. Its request fields are the new account ID and public key; a caller-supplied amount is not used by this implementation. The [sample server configuration](https://github.com/near/near-contract-helper/blob/master/.env.sample) sets that amount to 10 NEAR, above the approved cap.

**The sample is not evidence of the live server's actual grant.** The live grant remains UNVERIFIED. No arbitrary `amount:8` field was sent, and no account was created to discover the amount after the fact. That would risk exceeding the authorization before verification.

The separate [near-faucet.io form](https://near-faucet.io/) displayed wallet address and amount fields, but no public-key/account-creation control in the retrieved page. This does not establish an approved bootstrap path for the currently absent named owner account.

Read-only access evidence:

- Two Chrome navigation attempts to `https://near-faucet.io/` timed out: `Timed out after 10000ms waiting for CDP command Page.navigate.` The tab remained blank; no form was filled or submitted.
- HTTP GET of the faucet landing page returned 200; saved as `artifacts/phase4-execution/faucet-page.txt`.
- GET of the page's referenced JavaScript bundle failed with `TypeError: fetch failed`; cause `ECONNRESET`, `Client network socket disconnected before secure TLS connection was established`, host `near-faucet.io`, port 443. The script was neither downloaded successfully nor executed.
- GET of `https://helper.testnet.near.org/` returned HTTP 404, body `Not Found`; saved as `helper-get.txt`. A root-route 404 does **not** establish that the account-creation API is unavailable.
- Official public source documentation was read through the web tool; no GitHub account, repository, push or workflow action was performed.

## Individual transaction results

UNVERIFIED below means **not submitted**, not a failed or uncertain broadcast. There is no transaction hash or receipt to reconcile.

| Step | Approved operation | Result | Hash / callback / balances |
| --- | --- | --- | --- |
| Bootstrap | Create/fund `ml-demo-20261031.testnet` with approved owner key, aggregate credit ≤8 | UNVERIFIED — safe stop | No request; owner absent at checked block |
| 1 | Create vault; transfer 4; install vault key | UNVERIFIED | Not submitted |
| 2 | Create agent; transfer 1; install operator-held agent administrator key | UNVERIFIED | Not submitted |
| 3 | Create merchant; transfer .1; install merchant key | UNVERIFIED | Not submitted |
| 4 | Create attacker; transfer .1; install attacker key | UNVERIFIED | Not submitted |
| 5 | Deploy frozen Wasm and initialize owner | UNVERIFIED | Not submitted |
| 6 | Install three restricted agent function-call keys | UNVERIFIED | Not submitted; permissions not installed |
| 7 | Fund vault principal with 1 | UNVERIFIED | Not submitted |
| 8 | Create mandate, budget 1, ceiling .4 | UNVERIFIED | Not submitted |
| 9 | Authorized .10 payment | UNVERIFIED | No payment/callback/decision execution |
| 10 | Direct malicious-recipient call, expected contract rejection | UNVERIFIED | No vault receipt; no rejection claimed |
| 11 | Independent K0 .40 competitor | UNVERIFIED | Not submitted |
| 12 | Independent K1 .40 competitor | UNVERIFIED | Not submitted |
| 13 | Independent K2 .40 competitor | UNVERIFIED | Not submitted |

Summary: preflight PASS; bootstrap funding-control gate FAIL/blocked; **0 submitted transactions, 0 transaction PASS, 0 transaction FAIL, 13 transaction UNVERIFIED**, plus bootstrap UNVERIFIED. Aggregate faucet funds requested/received by this execution: **0 NEAR**. No transaction explorer links, callback gas or payment balance deltas exist. Account view amounts are unavailable because the accounts do not exist at the checked block.

## Preservation and next gate

Production code, SDK/adapter source, reviewed configuration, keys and approved transaction shapes were not changed. No private keys were loaded into the browser, printed or added to the repository. No retries, compensation, pending release, additional funding, mainnet activity, push, publication or CI occurred. The localhost demo remains in its prior preparation/recorded-evidence modes. The prior 115 local passing tests remain historical preparation evidence; no new runtime pass is inferred.

Missing/failed callbacks can strand reservations, retained full-access keys bypass policy, same-user Windows custody is not hostile-process isolation, and intra-block solvency remains unverified. No production custody sign-off.

To resume Phase 4, first establish a verifiable bootstrap route that creates the exact owner ID with its reviewed public key and credits no more than 8 aggregate faucet NEAR, with enough liquid funding for the approved sequence. The current approval is not permission to accept an unknown grant, increase the cap, use another sponsor's funds, substitute accounts or add transactions. Any revised bootstrap/funding plan requires explicit approval; expired deadlines/configuration also require review and reapproval. Do not begin another phase.
