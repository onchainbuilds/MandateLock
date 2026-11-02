# Transaction 9 approved recheck — threshold not reached

The single approved finalized-height query completed November 1, 2026 at approximately 12:24 UTC through https://rpc.testnet.fastnear.com.

- Required: finalized height strictly greater than **275767449**.
- Observed finalized height: **275748209**.
- Gap to threshold: **19240** heights; the first height satisfying the condition is **275767450**.
- Finalized block hash: **AkuXzvSXokJNPv2eEk8Aui9hnMfJrE8aUWs6FSZdoME8**.
- Block timestamp: **1793535862773169435 ns**.

**Stopped as instructed.** No repeated polling, transaction lookup, account-state query, signing, broadcast, replacement or continuation occurred. No contract, keys, mandate, funding or remote repository changed.

Transaction **7T63WVcMJFyBhgqQsJxqV3EWFitYSe3uq5azaU7WSfMp** retains its prior **UNRESOLVED** classification. Its expiry and non-execution were not established by this check. Prior balances, spending calculations and deadline observations were not refreshed and must not be represented as current verification. No continuation proposal or execution approval is justified by this result.

Raw request, source, UTC timestamps, HTTP status and full response: `artifacts/phase4-tx9-approved-recheck/height-check.json`. The check made exactly one network request for finalized block height. Earlier evidence remains preserved.

Any later recheck requires a separately chosen action; nothing is scheduled or polling automatically. Public execution remains suspended.
