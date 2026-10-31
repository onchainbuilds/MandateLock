//! Real-node tests only. An unavailable sandbox is an error, never a simulated pass.
use anyhow::{Context, Result, bail, ensure};
use base64::{Engine, engine::general_purpose::STANDARD};
use mandatelock::model::{PaymentStatus, VaultState};
use near_workspaces::network::Sandbox;
use near_workspaces::operations::Function;
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::{AccessKey, AccountId, Gas, KeyType, NearToken, SecretKey};
use near_workspaces::{Account, Contract, Worker};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Barrier;

const N: u128 = 1_000_000_000_000_000_000_000_000;
const GAS: Gas = Gas::from_tgas(100);

#[derive(Debug)]
struct Unverified(&'static str);
impl std::fmt::Display for Unverified {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.0)
    }
}
impl std::error::Error for Unverified {}

fn evidence_dir() -> PathBuf {
    std::env::var_os("MANDATELOCK_EVIDENCE_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../artifacts/phase2a"))
}

fn save(name: &str, value: &Value) -> Result<()> {
    let path = evidence_dir().join(name);
    std::fs::create_dir_all(path.parent().context("evidence parent")?)?;
    std::fs::write(path, serde_json::to_vec_pretty(value)?)?;
    Ok(())
}

async fn rpc(worker: &Worker<Sandbox>, method: &str, params: Value) -> Result<Value> {
    let url = worker.rpc_addr();
    ensure!(
        url.starts_with("http://127.0.0.1:") || url.starts_with("http://localhost:"),
        "nonlocal RPC refused: {url}"
    );
    let response: Value = reqwest::Client::new()
        .post(url)
        .timeout(Duration::from_secs(120))
        .json(&json!({"jsonrpc":"2.0","id":"mandatelock-phase2a","method":method,"params":params}))
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    if response.get("error").is_some() {
        bail!("RPC {method}: {}", response["error"]);
    }
    Ok(response["result"].clone())
}

fn number(value: &Value, field: &str) -> Result<u128> {
    value[field]
        .as_str()
        .with_context(|| format!("missing decimal {field}"))?
        .parse()
        .map_err(Into::into)
}

fn events(raw: &Value, event: &str) -> Vec<Value> {
    raw["receipts_outcome"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|r| r["outcome"]["status"].get("Failure").is_none())
        .flat_map(|r| r["outcome"]["logs"].as_array().into_iter().flatten())
        .filter_map(|v| v.as_str()?.strip_prefix("EVENT_JSON:"))
        .filter_map(|s| serde_json::from_str::<Value>(s).ok())
        .filter(|v| v["event"] == event)
        .collect()
}

fn fees(raw: &Value) -> Result<u128> {
    let mut total = number(&raw["transaction_outcome"]["outcome"], "tokens_burnt")?;
    for r in raw["receipts_outcome"]
        .as_array()
        .context("receipts missing")?
    {
        total = total
            .checked_add(number(&r["outcome"], "tokens_burnt")?)
            .context("fee overflow")?;
    }
    Ok(total)
}

struct Fixture {
    worker: Worker<Sandbox>,
    owner: Account,
    vault: Contract,
    agent: Account,
    merchant: Account,
    attacker: Account,
    restricted: Vec<Account>,
    absent: AccountId,
    case: String,
}

impl Fixture {
    async fn new(worker: &Worker<Sandbox>, wasm: &[u8], case: &str) -> Result<Self> {
        let root = worker.root_account()?;
        let owner = root
            .create_subaccount(case)
            .initial_balance(NearToken::from_near(100))
            .transact()
            .await?
            .into_result()?;
        let vault_id: AccountId = format!("vault.{}", owner.id()).parse()?;
        let vault_key = SecretKey::from_random(KeyType::ED25519);
        // Create, fund, add trusted fixture key, deploy and initialize in one receipt.
        owner
            .batch(&vault_id)
            .create_account()
            .transfer(NearToken::from_near(10))
            .add_key(vault_key.public_key(), AccessKey::full_access())
            .deploy(wasm)
            .call(
                Function::new("new")
                    .args_json(json!({"owner_id":owner.id()}))
                    .gas(GAS),
            )
            .transact()
            .await?
            .into_result()?;
        let vault = Contract::from_secret_key(vault_id, vault_key, worker);
        ensure!(
            vault.view_code().await? == wasm,
            "deployed code differs from actual artifact"
        );
        let agent = owner
            .create_subaccount("agent")
            .initial_balance(NearToken::from_near(5))
            .transact()
            .await?
            .into_result()?;
        let merchant = owner
            .create_subaccount("merchant")
            .initial_balance(NearToken::from_near(1))
            .transact()
            .await?
            .into_result()?;
        let attacker = owner
            .create_subaccount("attacker")
            .initial_balance(NearToken::from_near(1))
            .transact()
            .await?
            .into_result()?;
        let mut restricted = Vec::new();
        for _ in 0..3 {
            let sk = SecretKey::from_random(KeyType::ED25519);
            agent
                .batch(agent.id())
                .add_key(
                    sk.public_key(),
                    AccessKey::function_call_access(
                        vault.id(),
                        &["execute_payment"],
                        Some(NearToken::from_near(1)),
                    ),
                )
                .transact()
                .await?
                .into_result()?;
            restricted.push(Account::from_secret_key(agent.id().clone(), sk, worker));
        }
        let absent = format!("absent.{}", owner.id()).parse()?;
        let f = Self {
            worker: worker.clone(),
            owner,
            vault,
            agent,
            merchant,
            attacker,
            restricted,
            absent,
            case: case.into(),
        };
        f.owner
            .call(f.vault.id(), "fund")
            .deposit(NearToken::from_near(1))
            .gas(GAS)
            .transact()
            .await?
            .into_result()?;
        let block = rpc(worker, "block", json!({"finality":"final"})).await?;
        let now: u64 = block["header"]["timestamp_nanosec"]
            .as_str()
            .context("timestamp")?
            .parse()?;
        f.owner.call(f.vault.id(), "create_mandate").args_json(json!({
            "agent_id":f.agent.id(),
            "agent_keys":f.restricted.iter().map(|a|a.secret_key().public_key().to_string()).collect::<Vec<_>>(),
            "allowed_recipients":[f.merchant.id(), &f.absent],
            "budget":N.to_string(), "per_transaction_limit":(N*4/10).to_string(),
            "expires_at_ns":(now+600_000_000_000).to_string()
        })).gas(GAS).transact().await?.into_result()?;
        save(
            &format!("{case}/keys.json"),
            &json!({
                "agent":f.agent.id(),"vault":f.vault.id(),"owner":f.owner.id(),
                "agent_keys":format!("{:?}",f.agent.view_access_keys().await?),
                "vault_keys":format!("{:?}",f.vault.view_access_keys().await?),
                "trusted_full_access_vault_key_retained":true
            }),
        )?;
        Ok(f)
    }

    async fn snapshot(&self, label: &str) -> Result<Value> {
        let block = rpc(&self.worker, "block", json!({"finality":"final"})).await?;
        let hash = block["header"]["hash"].clone();
        let mut balances = serde_json::Map::new();
        for a in [
            &self.owner,
            self.vault.as_account(),
            &self.agent,
            &self.merchant,
            &self.attacker,
        ] {
            let view = rpc(
                &self.worker,
                "query",
                json!({"request_type":"view_account","account_id":a.id(),"block_id":hash}),
            )
            .await?;
            balances.insert(a.id().to_string(), view);
        }
        let view = rpc(
            &self.worker,
            "query",
            json!({"request_type":"call_function","account_id":self.vault.id(),
            "method_name":"get_accounting","args_base64":"e30=","block_id":hash}),
        )
        .await?;
        let bytes: Vec<u8> = serde_json::from_value(view["result"].clone())?;
        let accounting: Value = serde_json::from_slice(&bytes)?;
        let raw = rpc(
            &self.worker,
            "query",
            json!({"request_type":"view_state","account_id":self.vault.id(),
            "prefix_base64":"","block_id":hash}),
        )
        .await?;
        let state_value = raw["values"]
            .as_array()
            .context("state values")?
            .iter()
            .find(|e| e["key"] == "U1RBVEU=")
            .context("STATE entry")?;
        let state: VaultState = borsh::from_slice(
            &STANDARD.decode(state_value["value"].as_str().context("state bytes")?)?,
        )?;
        let m = state.mandate.as_ref().context("mandate")?;
        ensure!(
            m.available
                .checked_add(m.pending)
                .and_then(|n| n.checked_add(m.spent))
                == Some(m.budget),
            "budget identity"
        );
        ensure!(
            m.pending.checked_add(m.spent).context("sum overflow")? <= m.budget,
            "overcommit"
        );
        let pending: u128 = m
            .payments
            .iter()
            .filter(|p| p.status == PaymentStatus::Pending)
            .map(|p| p.amount)
            .sum();
        let spent: u128 = m
            .payments
            .iter()
            .filter(|p| p.status == PaymentStatus::Succeeded)
            .map(|p| p.amount)
            .sum();
        ensure!(
            pending == m.pending && spent == m.spent,
            "stored-record sums"
        );
        ensure!(
            number(&accounting, "available")? == m.available
                && number(&accounting, "pending")? == pending
                && number(&accounting, "spent")? == spent,
            "view/state disagree"
        );
        let required = number(&accounting, "storage_and_operating_floor")?
            .checked_add(state.unallocated)
            .and_then(|v| v.checked_add(m.available))
            .context("backing overflow")?;
        let physical = number(&balances[self.vault.id().as_str()], "amount")?;
        ensure!(
            number(&accounting, "account_balance")? == physical,
            "view/raw vault balance mismatch"
        );
        let result = json!({"block_hash":hash,"block_height":block["header"]["height"],"accounting":accounting,
            "accounts":balances,"required_liquid_backing":required.to_string(),"physically_backed":physical>=required,
            "payments":m.payments.iter().enumerate().map(|(nonce,p)|json!({"nonce":nonce,"status":format!("{:?}",p.status),
                "amount":p.amount.to_string(),"recipient":p.recipient()})).collect::<Vec<_>>()});
        save(&format!("{}/{label}.json", self.case), &result)?;
        Ok(result)
    }

    async fn capture(
        &self,
        label: &str,
        actor: &Account,
        result: &ExecutionFinalResult,
    ) -> Result<Value> {
        let raw = rpc(
            &self.worker,
            "tx",
            json!({"tx_hash":result.outcome().transaction_hash.to_string(),
            "sender_account_id":actor.id(),"wait_until":"FINAL"}),
        )
        .await?;
        ensure!(
            raw["final_execution_status"] == "FINAL",
            "not all receipts final"
        );
        let callback_receipts:Vec<Value> = raw["receipts_outcome"].as_array().context("receipts")?.iter()
            .filter(|r|r["outcome"]["logs"].as_array().into_iter().flatten().any(|l|l.as_str().is_some_and(|s|s.contains("payment_succeeded")||s.contains("payment_failed"))))
            .map(|r|json!({"receipt_id":r["id"],"executor":r["outcome"]["executor_id"],"gas_burnt":r["outcome"]["gas_burnt"],"status":r["outcome"]["status"]})).collect();
        for receipt in &callback_receipts {
            let burnt = receipt["gas_burnt"].as_u64().context("callback gas")?;
            ensure!(
                burnt > 0 && burnt <= 15_000_000_000_000,
                "callback exceeds allocation"
            );
        }
        save(&format!("{}/{label}-transaction.json", self.case), &raw)?;
        save(
            &format!("{}/{label}-callback-gas.json", self.case),
            &json!(callback_receipts),
        )?;
        Ok(raw)
    }

    async fn pay(
        &self,
        label: &str,
        nonce: u8,
        recipient: &AccountId,
        amount: u128,
    ) -> Result<(ExecutionFinalResult, Value, Value, Value)> {
        let before = self.snapshot(&format!("{label}-before")).await?;
        let actor = &self.restricted[0];
        let result = actor
            .call(self.vault.id(), "execute_payment")
            .args_json(payment_args(nonce, recipient, amount))
            .gas(GAS)
            .transact()
            .await?;
        let raw = self.capture(label, actor, &result).await?;
        let after = self.snapshot(&format!("{label}-after")).await?;
        ensure!(
            after["physically_backed"] == true,
            "unbacked after all refunds finalized"
        );
        Ok((result, raw, before, after))
    }
}

fn payment_args(nonce: u8, recipient: &AccountId, amount: u128) -> Value {
    json!({"mandate_id":"1","nonce":nonce,"recipient":recipient,"amount":amount.to_string()})
}

fn ledger(snapshot: &Value, a: u128, p: u128, s: u128) -> Result<()> {
    for (field, expected) in [("available", a), ("pending", p), ("spent", s)] {
        ensure!(
            number(&snapshot["accounting"], field)? == expected,
            "unexpected {field}"
        );
    }
    Ok(())
}

fn balance(snapshot: &Value, account: &AccountId) -> Result<u128> {
    number(&snapshot["accounts"][account.as_str()], "amount")
}

fn vault_delta(
    f: &Fixture,
    before: &Value,
    after: &Value,
    outgoing: u128,
    raw: &Value,
) -> Result<()> {
    let residual = balance(after, f.vault.id())?
        .checked_add(outgoing)
        .context("balance overflow")?
        .checked_sub(balance(before, f.vault.id())?)
        .context("unexplained vault loss")?;
    // Execution rewards may increase the vault balance. Do not assert an exact round
    // principal-only balance or label the entire residual as a measured gas reward.
    ensure!(
        residual <= fees(raw)?,
        "unexplained gain exceeds all transaction fees"
    );
    save(
        &format!(
            "{}/balance-reconciliation-{}.json",
            f.case,
            raw["transaction"]["hash"].as_str().unwrap_or("unknown")
        ),
        &json!({"outgoing_principal":outgoing.to_string(),"positive_fee_reward_residual":residual.to_string(),
            "total_tokens_burnt_upper_bound":fees(raw)?.to_string(),"exact_reward_breakdown_verified":false}),
    )
}

async fn success(worker: &Worker<Sandbox>, wasm: &[u8], case: &str) -> Result<()> {
    let f = Fixture::new(worker, wasm, case).await?;
    let (result, raw, before, after) = f.pay("authorized", 0, f.merchant.id(), N / 10).await?;
    ensure!(
        result.is_success() && result.clone().json::<bool>()?,
        "payment did not settle success"
    );
    ensure!(
        events(&raw, "payment_scheduled").len() == 1
            && events(&raw, "payment_succeeded").len() == 1,
        "missing lifecycle"
    );
    ensure!(
        balance(&after, f.merchant.id())? == balance(&before, f.merchant.id())? + N / 10,
        "recipient delta"
    );
    ledger(&after, N * 9 / 10, 0, N / 10)?;
    ensure!(after["payments"][0]["status"] == "Succeeded", "slot state");
    vault_delta(&f, &before, &after, N / 10, &raw)
}

async fn rejection(worker: &Worker<Sandbox>, wasm: &[u8], case: &str, kind: &str) -> Result<()> {
    let f = Fixture::new(worker, wasm, case).await?;
    if kind == "expiry" {
        worker.fast_forward(1200).await?;
    }
    let recipient = if kind == "recipient" {
        f.attacker.id()
    } else {
        f.merchant.id()
    };
    let amount = if kind == "ceiling" {
        N * 4 / 10 + 1
    } else {
        N / 10
    };
    let expected = match kind {
        "recipient" => "ERR_RECIPIENT",
        "ceiling" => "ERR_PER_TX_LIMIT",
        _ => "ERR_EXPIRED",
    };
    let (result, raw, before, after) = f.pay("rejected", 0, recipient, amount).await?;
    ensure!(
        result.is_failure() && format!("{result:?}").contains(expected),
        "not the intended contract rejection"
    );
    ensure!(
        events(&raw, "payment_scheduled").is_empty(),
        "rejection scheduled payment"
    );
    ledger(&after, N, 0, 0)?;
    ensure!(
        after["payments"][0]["status"] == "Unused",
        "rejected slot consumed"
    );
    ensure!(
        balance(&after, recipient)? == balance(&before, recipient)?,
        "rejected recipient received funds"
    );
    vault_delta(&f, &before, &after, 0, &raw)
}

async fn exhausted(worker: &Worker<Sandbox>, wasm: &[u8]) -> Result<()> {
    let f = Fixture::new(worker, wasm, "budget").await?;
    for (nonce, amount) in [(0, N * 4 / 10), (1, N * 4 / 10), (2, N / 5)] {
        let (r, raw, before, after) = f
            .pay(&format!("accepted-{nonce}"), nonce, f.merchant.id(), amount)
            .await?;
        ensure!(
            r.is_success() && r.clone().json::<bool>()?,
            "valid payment failed"
        );
        ensure!(
            balance(&after, f.merchant.id())? == balance(&before, f.merchant.id())? + amount,
            "recipient delta"
        );
        vault_delta(&f, &before, &after, amount, &raw)?;
    }
    let (r, raw, before, after) = f.pay("over-budget", 3, f.merchant.id(), 1).await?;
    ensure!(
        r.is_failure() && format!("{r:?}").contains("ERR_BUDGET"),
        "not budget rejection"
    );
    ledger(&after, 0, 0, N)?;
    ensure!(
        balance(&after, f.merchant.id())? == balance(&before, f.merchant.id())?,
        "excess paid"
    );
    vault_delta(&f, &before, &after, 0, &raw)
}

async fn replay(worker: &Worker<Sandbox>, wasm: &[u8]) -> Result<()> {
    let f = Fixture::new(worker, wasm, "replay").await?;
    let (r, _, _, _) = f.pay("first", 0, f.merchant.id(), N / 10).await?;
    ensure!(r.is_success(), "first payment");
    let (r, raw, before, after) = f.pay("replayed", 0, f.merchant.id(), N / 10).await?;
    ensure!(
        r.is_failure() && format!("{r:?}").contains("ERR_NONCE_USED"),
        "logical replay accepted"
    );
    ledger(&after, N * 9 / 10, 0, N / 10)?;
    ensure!(
        balance(&after, f.merchant.id())? == balance(&before, f.merchant.id())?,
        "double receipt"
    );
    vault_delta(&f, &before, &after, 0, &raw)
}

async fn authority(worker: &Worker<Sandbox>, wasm: &[u8], case: &str, method: &str) -> Result<()> {
    let f = Fixture::new(worker, wasm, case).await?;
    let before = f.snapshot("before").await?;
    let args = if method == "on_payment_result" {
        json!({"mandate_id":"1","nonce":0})
    } else {
        json!({})
    };
    let r = f
        .attacker
        .call(f.vault.id(), method)
        .args_json(args)
        .gas(GAS)
        .transact()
        .await?;
    let raw = f.capture("forgery", &f.attacker, &r).await?;
    ensure!(r.is_failure(), "unauthorized call succeeded");
    let text = format!("{r:?}");
    ensure!(
        text.contains("ERR_OWNER") || text.contains("private") || text.contains("ERR_PRIVATE"),
        "unrelated failure: {text}"
    );
    let after = f.snapshot("after").await?;
    ledger(&after, N, 0, 0)?;
    vault_delta(&f, &before, &after, 0, &raw)
}

async fn restricted_key(worker: &Worker<Sandbox>, wasm: &[u8]) -> Result<()> {
    let f = Fixture::new(worker, wasm, "restricted").await?;
    let before = f.snapshot("before").await?;
    let result = f.restricted[0]
        .call(f.vault.id(), "revoke")
        .gas(GAS)
        .transact()
        .await;
    let diagnostic = match result {
        Err(e) => format!("{e:?}"),
        Ok(r) => {
            ensure!(r.is_failure(), "restricted method succeeded");
            format!("{r:?}")
        }
    };
    ensure!(
        diagnostic.contains("MethodNameMismatch")
            || diagnostic.contains("AccessKey")
            || diagnostic.contains("access key"),
        "not key-permission rejection: {diagnostic}"
    );
    save(
        "restricted/protocol-rejection.json",
        &json!({"diagnostic":diagnostic,"receipt_expected":false}),
    )?;
    let after = f.snapshot("after").await?;
    ledger(&after, N, 0, 0)?;
    ensure!(
        balance(&after, f.vault.id())? == balance(&before, f.vault.id())?,
        "prohibited call touched vault"
    );
    Ok(())
}

async fn failed_transfer(worker: &Worker<Sandbox>, wasm: &[u8]) -> Result<()> {
    let f = Fixture::new(worker, wasm, "failure").await?;
    let query = rpc(
        worker,
        "query",
        json!({"request_type":"view_account","account_id":f.absent,"finality":"final"}),
    )
    .await;
    if query.is_ok() || !format!("{:?}", query.unwrap_err()).contains("UNKNOWN_ACCOUNT") {
        return Err(Unverified("Could not establish an absent named receiver").into());
    }
    let (r, raw, before, after) = f.pay("native-failure", 0, &f.absent, N / 10).await?;
    if !raw.to_string().contains("AccountDoesNotExist") {
        return Err(Unverified("No genuine native transfer failure was observed").into());
    }
    ensure!(
        r.is_success() && !r.clone().json::<bool>()?,
        "callback must return false normally"
    );
    ensure!(
        events(&raw, "payment_failed").len() == 1,
        "missing failed settlement"
    );
    ledger(&after, N, 0, 0)?;
    ensure!(
        after["payments"][0]["status"] == "Failed",
        "failed nonce not consumed"
    );
    vault_delta(&f, &before, &after, 0, &raw)?;
    let (retry, _, _, after_retry) = f.pay("failed-nonce-replay", 0, &f.absent, N / 10).await?;
    ensure!(
        retry.is_failure() && format!("{retry:?}").contains("ERR_NONCE_USED"),
        "failed nonce replay"
    );
    ledger(&after_retry, N, 0, 0)
}

async fn concurrency(worker: &Worker<Sandbox>, wasm: &[u8]) -> Result<()> {
    let f = Fixture::new(worker, wasm, "concurrency").await?;
    let before = f.snapshot("before").await?;
    let barrier = Arc::new(Barrier::new(3));
    let mut tasks = Vec::new();
    for (nonce, actor) in f.restricted.iter().cloned().enumerate() {
        let barrier = barrier.clone();
        let vault = f.vault.id().clone();
        let recipient = f.merchant.id().clone();
        tasks.push(tokio::spawn(async move {
            barrier.wait().await;
            let pending = actor
                .call(&vault, "execute_payment")
                .args_json(payment_args(nonce as u8, &recipient, N * 4 / 10))
                .gas(GAS)
                .transact_async()
                .await?;
            Ok::<_, anyhow::Error>((actor, pending))
        }));
    }
    // Join all broadcast tasks BEFORE awaiting any transaction's completion.
    let mut pending = Vec::new();
    for task in tasks {
        pending.push(task.await??);
    }
    let mut accepted = 0;
    let mut rejected = 0;
    let mut pending_overlap = false;
    let mut total_fees = 0u128;
    let mut keys = std::collections::BTreeSet::new();
    for (index, (actor, status)) in pending.into_iter().enumerate() {
        let result = status.await?;
        let raw = f
            .capture(&format!("competing-{index}"), &actor, &result)
            .await?;
        ensure!(
            raw["transaction"]["signer_id"] == f.agent.id().as_str(),
            "wrong signer account"
        );
        keys.insert(
            raw["transaction"]["public_key"]
                .as_str()
                .context("signing key")?
                .to_owned(),
        );
        let receipts = raw["receipts_outcome"]
            .as_array()
            .context("receipt outcomes")?;
        ensure!(
            receipts
                .iter()
                .any(|r| r["outcome"]["executor_id"] == f.vault.id().as_str()),
            "transaction never reached executor"
        );
        let scheduled = events(&raw, "payment_scheduled");
        if result.is_success() {
            ensure!(
                result.clone().json::<bool>()?,
                "unexpected transfer failure"
            );
            ensure!(
                scheduled.len() == 1 && events(&raw, "payment_succeeded").len() == 1,
                "missing accepted lifecycle"
            );
            accepted += 1;
        } else {
            ensure!(
                format!("{result:?}").contains("ERR_BUDGET"),
                "nonce/transport/other failure is NOT budget enforcement"
            );
            rejected += 1;
        }
        for event in scheduled {
            let data = &event["data"][0];
            ensure!(
                number(data, "pending")? + number(data, "spent")? <= N,
                "event overcommit"
            );
            pending_overlap |= number(data, "pending")? >= N * 8 / 10;
        }
        total_fees = total_fees
            .checked_add(fees(&raw)?)
            .context("fees overflow")?;
    }
    ensure!(
        keys.len() == 3 && accepted == 2 && rejected == 1,
        "invalid competition evidence"
    );
    let after = f.snapshot("after").await?;
    ledger(&after, N / 5, 0, N * 8 / 10)?;
    ensure!(
        balance(&after, f.merchant.id())? == balance(&before, f.merchant.id())? + N * 8 / 10,
        "aggregate recipient delta"
    );
    let residual = balance(&after, f.vault.id())?
        .checked_add(N * 8 / 10)
        .and_then(|amount| amount.checked_sub(balance(&before, f.vault.id()).ok()?))
        .context("unexplained competition vault loss")?;
    ensure!(
        residual <= total_fees && after["physically_backed"] == true,
        "competition backing"
    );
    save(
        "concurrency/summary.json",
        &json!({"independent_keys":keys,"accepted":accepted,"budget_rejections":rejected,
        "pending_overlap":if pending_overlap {"PASS"} else {"UNVERIFIED"},
        "residual":residual.to_string(),"fee_upper_bound":total_fees.to_string()}),
    )
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn real_sandbox_security_suite() -> Result<()> {
    ensure!(
        cfg!(target_os = "linux"),
        "Run on supported Linux; Windows is not sandbox evidence"
    );
    let wasm_path = std::env::var_os("MANDATELOCK_WASM")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../target/near/mandatelock.wasm")
        });
    let wasm = std::fs::read(&wasm_path).context("build actual contract Wasm first")?;
    let hash = format!("{:x}", Sha256::digest(&wasm));
    let worker = near_workspaces::sandbox_with_version("2.13.4")
        .await
        .context("real sandbox startup required")?;
    save(
        "environment.json",
        &json!({"wasm_sha256":hash,"wasm_bytes":wasm.len(),"framework":"near-workspaces 0.23.0",
        "network":"disposable local sandbox only","status":rpc(&worker,"status",json!([])).await?}),
    )?;
    let mut rows = Vec::new();
    let mut failures = 0;
    let mut unverified = 0;
    macro_rules! case {
        ($name:expr,$future:expr)=>{{
            match $future.await {
                Ok(())=>{println!("PASS {}",$name);rows.push(json!({"test":$name,"status":"PASS"}));}
                Err(e) if e.downcast_ref::<Unverified>().is_some()=>{eprintln!("UNVERIFIED {}: {e:#}",$name);unverified+=1;rows.push(json!({"test":$name,"status":"UNVERIFIED","error":format!("{e:#}")}));}
                Err(e)=>{eprintln!("FAIL {}: {e:#}",$name);failures+=1;rows.push(json!({"test":$name,"status":"FAIL","error":format!("{e:#}")}));}
            }
            save("results.json",&json!({"tests":rows,"failures":failures,"unverified":unverified}))?;
        }};
    }
    case!(
        "01 authorized payment",
        success(&worker, &wasm, "authorized")
    );
    case!(
        "02 unauthorized recipient",
        rejection(&worker, &wasm, "recipient", "recipient")
    );
    case!(
        "03 transaction ceiling",
        rejection(&worker, &wasm, "ceiling", "ceiling")
    );
    case!("04 total budget", exhausted(&worker, &wasm));
    case!(
        "05 expired authorization",
        rejection(&worker, &wasm, "expired", "expiry")
    );
    case!("06 replay", replay(&worker, &wasm));
    case!(
        "07 unauthorized administration",
        authority(&worker, &wasm, "admin", "revoke")
    );
    case!("08 restricted key", restricted_key(&worker, &wasm));
    case!(
        "09 forged callback",
        authority(&worker, &wasm, "callback", "on_payment_result")
    );
    case!(
        "10 async successful settlement",
        success(&worker, &wasm, "settlement")
    );
    case!("11 genuine native failure", failed_transfer(&worker, &wasm));
    case!(
        "12 independent competing requests",
        concurrency(&worker, &wasm)
    );
    save(
        "additional-unverified.json",
        &json!({
            "missing_callback_fault":"UNVERIFIED: requires separately labeled receipt/fault control",
            "duplicate_genuine_private_callback":"UNVERIFIED: native-model idempotency is not real duplicate delivery",
            "solvency_every_intermediate_receipt":"UNVERIFIED: snapshots are pinned before/after finality, not every receipt",
            "exact_gas_reward_breakdown":"UNVERIFIED: residual bounded by actual fee totals, not exact reward decomposition"
        }),
    )?;
    ensure!(
        failures == 0 && unverified == 0,
        "{failures} scenarios failed and {unverified} unverified; inspect artifacts"
    );
    Ok(())
}
