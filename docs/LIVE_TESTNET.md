# Mandate 3 public testnet evidence

The owner delegated a 1 NEAR task budget, restricted the agent to the approved merchant and set a 0.40 ceiling. The existing principal funded the job. On November 2, 2026, the restricted key paid the merchant and the vault rejected a separately submitted request naming the attacker.

| Step | Verified outcome | Explorer |
|---|---|---|
| T1 | Expired mandate 2 retired | [DPcXxEw8JKzkYgq9mj6NoKZ1B6j73ZZzeBu5fY1HtTrF](https://testnet.nearblocks.io/txns/DPcXxEw8JKzkYgq9mj6NoKZ1B6j73ZZzeBu5fY1HtTrF) |
| T2 | Three restricted allowances replaced | [9AbPXmJcDY2R5MJCrhSDU1nqQtU3gguoMDLoq9wcsqrt](https://testnet.nearblocks.io/txns/9AbPXmJcDY2R5MJCrhSDU1nqQtU3gguoMDLoq9wcsqrt) |
| T3 | Mandate 3 created with the existing principal | [81QCQbgYgM1VYJ2i3gbN7JzM9VsPUESdywtbohZTSXBe](https://testnet.nearblocks.io/txns/81QCQbgYgM1VYJ2i3gbN7JzM9VsPUESdywtbohZTSXBe) |
| T4 | Merchant paid and callback settled | [EWywBLBSiwZ5F47GYwwSGyBrbMJPz6v6Svj6ECqXKHuT](https://testnet.nearblocks.io/txns/EWywBLBSiwZ5F47GYwwSGyBrbMJPz6v6Svj6ECqXKHuT) |
| T5 | Vault rejected attacker recipient | [6YEmjM2aaj5YBzg48844XKgLxJqN5EboV7PV1bGjvR3m](https://testnet.nearblocks.io/txns/6YEmjM2aaj5YBzg48844XKgLxJqN5EboV7PV1bGjvR3m) |

The merchant balance rose from **0.10 to 0.20 NEAR**. Transfer receipt `3ruiNf5G8FFuT9BoaXDyWA7dB294UXVv3b9zpDpr3ogE` succeeded. Private callback `DK419poBwS851QphdEBDSWncUB1kFBSGD1unCrsorxE` emitted `payment_succeeded` and used 2,425,695,274,197 gas. Slot 0 is Succeeded. Vault rejection receipt `6NtZDTGovHSxaC4JxtV5Knkw3p1aCjV9E6Enpdn4bzGK` reports `Smart contract panicked: ERR_RECIPIENT`. Slot 1 is Unused and the attacker balance stayed at 0.10 NEAR.

Final common block **275933389**, hash `4D6HoBVZPzzYUL9TS6Zme8Dj5WLkaJGgSzmNCQrR1HPL`. Mandate accounting was **0.90 available / 0 pending / 0.10 spent**. Fees were **0.0014230626171185 NEAR**. The successful payment plus fees brought cumulative outgoing to **6.3335820306082425 testnet NEAR**.

Run `node scripts/verify-final-testnet.mjs` offline to verify source hashes, both providers’ finalized transaction records, payout, callback, rejection and ledger. [Freeze manifest](evidence/final-testnet/manifest.json) · [Per-step states](evidence/final-testnet/step-states.json) · [Before balances](evidence/final-testnet/before-report.json) · [After balances and receipt IDs](evidence/final-testnet/after-report.json).

Public testnet confirms this particular job and rejection. The three independent .40 requests against a 1 NEAR budget are separate recorded sandbox evidence. Diagnostic callback failures can leave reservations stranded after either a payment or refund. Full-access vault and owner keys can bypass policy. The agent account has a separate operator-held full-access administrator key. Finalized and receipt-block observations do not establish continuous intra-block solvency or production custody security. Original transaction 9 and R3 expired without execution, corroborated by finalized nonce and state. Historical documents retain the status known when written.
