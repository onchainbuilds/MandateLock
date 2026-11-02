# Public testnet status — dated evidence, not a live feed

**No successful public testnet agent payment is claimed.** The browser demo uses deterministic fixtures and genuine recorded sandbox transactions. It does not sign or broadcast. This release preparation made no chain queries.

| Scope | Result | Evidence |
|---|---|---|
| Historical Linux sandbox validation | 75 PASS / 0 FAIL | [Bundled summary](evidence/phase2b-75-summary.json), [raw demo recordings](../demo/README.md) |
| Public deployment, direct parent-owner initialization, restricted-key installation, funding, mandate 1 | FINAL success | [Raw setup bundle](evidence/phase4-public-testnet.json) |
| Original transaction 9 | **Expired; finalized state corroborates non-execution** | [Final resolution](evidence/tx9-final-resolution.json), [independent RPC observations](evidence/tx9-final-independent.json), [balance comparison](evidence/tx9-final-balances.json) |
| Owner retires mandate 1 and creates mandate 2 | FINAL success | [Retirement receipts](evidence/owner-retirement.json), [mandate 2 receipts](evidence/owner-mandate2.json) |
| Later payment R3 | **UNRESOLVED** | [Status error and state](evidence/r3-safe-stop.json), [finalized snapshot](evidence/r3-final-snapshot.json), [last height check](evidence/r3-latest-height.json) |

Original 9 hash: `7T63WVcMJFyBhgqQsJxqV3EWFitYSe3uq5azaU7WSfMp`. Its reference height 275681049 plus validity period 86400 gives checkpoint 275767449. Finalized height 275790037 exceeded it; independently observed unchanged signer nonce, unused payment slot, unchanged recipient and accounting support non-execution. This is an RPC-backed operational conclusion, not an independent cryptographic proof of the entire chain. There is no captured contract-failure receipt or successful payment for transaction 9.

R3 hash: `3NqHgN3VM7xqo7GMssuDj5HuCrMsM5UNECT9HGKTyrTM`. Submitted once on 2026-11-01 at 19:31:10 UTC. Its NONE acknowledgement did not prove validation or inclusion. Later status reads were UNKNOWN_TRANSACTION. The last authorized height-only check at approximately 19:53 UTC observed **275795163**, below R3's required expiry checkpoint **275879290**. R3 remains UNRESOLVED; neither expiry nor non-execution has been established for it. Later calls R4–R7 were never submitted.

At the recorded full post-attempt snapshot, mandate 2 accounting was **available 1 / pending 0 / spent 0 NEAR**, slot 0 Unused, merchant .1 NEAR unchanged. Mandate 2 expiry is **2026-11-01 22:00 UTC**; no claim is made here that it is currently active. Owner retirement hash: [FXJpvnHbyG9SUTLca3f26EEuTwA4q5MkkZ7Zwh8wDF9k](https://testnet.nearblocks.io/txns/FXJpvnHbyG9SUTLca3f26EEuTwA4q5MkkZ7Zwh8wDF9k). Mandate 2 creation: [4pKWEEsYSxZVJruAG6WL2xGqC5zxr6B4HV2tV8pqaXYK](https://testnet.nearblocks.io/txns/4pKWEEsYSxZVJruAG6WL2xGqC5zxr6B4HV2tV8pqaXYK).

A subsequent local diagnosis found the 100 Tgas calls require an upfront gas purchase of **.1009197549967985 NEAR**, above installed restricted-key allowance **.1 NEAR**. The minimum receipt purchase price was omitted from the old adapter check. This is a confirmed local compatibility defect, not a captured historical rejection and not resolution of R3. Restricted allowance authorizes gas expenditure; it is not a transferred payment or additional account balance. Operational remediation remains suspended and excluded from this source-demo release. Historical testnet scripts are not an approved execution plan.

[Selected evidence manifest](evidence/final-status-manifest.json) gives hashes and workspace-relative origins for the byte-identical new records. Historical reports retain their earlier observations and are explicitly superseded by this dated status page. Public keys, account IDs and finalized public-chain signatures in evidence are public data; private keys and usable unresolved signed payloads are not included.

Security limitations remain: stranded reservations after uncertain callbacks, operator full-access key custody, unverified intra-block solvency, and no production custody security sign-off. Publication of an honest recorded demonstration does not authorize recovery, new mandates, key replacement or further public-chain execution.
