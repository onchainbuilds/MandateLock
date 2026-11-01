//! Exact frozen Wasm, separate vault deployment and owner initialization.
//! Never connects to public networks; missing local runtime is UNVERIFIED.
use anyhow::{Context, Result, ensure};
use base64::{Engine, engine::general_purpose::STANDARD};
use mandatelock_sandbox_tests::require_final_transaction;
use near_workspaces::types::Gas;
use near_workspaces::{Account, Worker, network::Sandbox, result::ExecutionFinalResult};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{path::PathBuf, time::Duration};
const SHA: &str = "3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87";
const CASES: [&str; 6] = [
    "vault-deploy-only",
    "attacker-claims-parent",
    "attacker-claims-self",
    "vault-self-init",
    "parent-init",
    "repeat-parent-init",
];
fn dir() -> PathBuf {
    std::env::var_os("MANDATELOCK_INIT_EVIDENCE_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../artifacts/phase4-initialization-repair/sandbox")
        })
}
fn save(name: &str, value: &Value) -> Result<()> {
    std::fs::create_dir_all(dir())?;
    std::fs::write(dir().join(name), serde_json::to_vec_pretty(value)?)?;
    Ok(())
}
async fn rpc(w: &Worker<Sandbox>, method: &str, params: Value) -> Result<Value> {
    ensure!(
        w.rpc_addr().starts_with("http://127.0.0.1:")
            || w.rpc_addr().starts_with("http://localhost:"),
        "Only local sandbox permitted"
    );
    ensure!(
        ["EXPERIMENTAL_tx_status", "block", "query"].contains(&method),
        "Read-only method"
    );
    let raw: Value = reqwest::Client::new()
        .post(w.rpc_addr())
        .timeout(Duration::from_secs(30))
        .json(
            &json!({"jsonrpc":"2.0","id":"initialization-repair","method":method,"params":params}),
        )
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    ensure!(raw.get("error").is_none(), "RPC failure: {raw}");
    Ok(raw["result"].clone())
}
async fn final_tx(
    w: &Worker<Sandbox>,
    name: &str,
    actor: &Account,
    result: &ExecutionFinalResult,
) -> Result<Value> {
    let hash = result.outcome().transaction_hash.to_string();
    save(
        &format!("{name}-observed.json"),
        &json!({"hash":hash,"sender":actor.id(),"outcome":format!("{result:?}")}),
    )?;
    let raw = rpc(
        w,
        "EXPERIMENTAL_tx_status",
        json!({"tx_hash":hash,"sender_account_id":actor.id(),"wait_until":"FINAL"}),
    )
    .await?;
    save(&format!("{name}-final.json"), &raw)?;
    require_final_transaction(&raw, &hash, actor.id().as_str())?;
    Ok(raw)
}
async fn snapshot(
    w: &Worker<Sandbox>,
    name: &str,
    accounts: &[&Account],
    vault: &Account,
    tx: &Value,
) -> Result<Value> {
    let block = rpc(w, "block", json!({"finality":"final"})).await?;
    for outcome in std::iter::once(&tx["transaction_outcome"]).chain(
        tx["receipts_outcome"]
            .as_array()
            .context("receipts")?
            .iter(),
    ) {
        let b = rpc(w, "block", json!({"block_id":outcome["block_hash"]})).await?;
        ensure!(
            block["header"]["height"].as_u64() >= b["header"]["height"].as_u64(),
            "Snapshot predates receipt"
        );
    }
    let hash = &block["header"]["hash"];
    let mut balances = serde_json::Map::new();
    for a in accounts {
        balances.insert(
            a.id().to_string(),
            rpc(
                w,
                "query",
                json!({"request_type":"view_account","account_id":a.id(),"block_id":hash}),
            )
            .await?,
        );
    }
    let state = rpc(w,"query",json!({"request_type":"view_state","account_id":vault.id(),"prefix_base64":"","block_id":hash})).await?;
    let code = rpc(
        w,
        "query",
        json!({"request_type":"view_code","account_id":vault.id(),"block_id":hash}),
    )
    .await?;
    let bytes = STANDARD.decode(code["code_base64"].as_str().context("code")?)?;
    ensure!(
        format!("{:x}", Sha256::digest(&bytes)) == SHA,
        "Frozen Wasm mismatch"
    );
    let result = json!({"block":block,"balances":balances,"state":state,"wasm_sha256":SHA});
    save(&format!("{name}-snapshot.json"), &result)?;
    Ok(result)
}
fn mark(rows: &mut [Value], id: &str, tx: &Value) -> Result<()> {
    let row = rows.iter_mut().find(|r| r["id"] == id).context("case")?;
    *row = json!({"id":id,"status":"PASS","hash":tx["transaction"]["hash"],"finality":tx["final_execution_status"],"receipts":tx["receipts_outcome"]});
    save(
        "results.json",
        &json!({"network":"local-sandbox","wasm_sha256":SHA,"cases":rows}),
    )
}
async fn execute(rows: &mut [Value]) -> Result<()> {
    ensure!(
        cfg!(target_os = "linux") || cfg!(target_os = "macos"),
        "UNVERIFIED: native Windows sandbox unsupported; no download or startup attempted"
    );
    let wasm_path = std::env::var_os("MANDATELOCK_WASM")
        .map(PathBuf::from)
        .context("Set MANDATELOCK_WASM to frozen tested Linux artifact")?;
    let wasm = std::fs::read(wasm_path)?;
    ensure!(
        format!("{:x}", Sha256::digest(&wasm)) == SHA,
        "Refusing diagnostic/rebuilt/mismatched Wasm"
    );
    let worker = near_workspaces::sandbox_with_version("2.13.4").await?;
    let root = worker.root_account()?;
    let created = root
        .create_subaccount("repair-owner")
        .initial_balance(near_workspaces::types::NearToken::from_near(20))
        .transact()
        .await?;
    final_tx(&worker, "setup-owner", &root, &created.details).await?;
    let owner = created.into_result()?;
    let created = owner
        .create_subaccount("vault")
        .initial_balance(near_workspaces::types::NearToken::from_yoctonear(
            3_998_670_503_567_516_400_000_000,
        ))
        .transact()
        .await?;
    final_tx(&worker, "setup-vault", &owner, &created.details).await?;
    let vault = created.into_result()?;
    let created = root
        .create_subaccount("repair-attacker")
        .initial_balance(near_workspaces::types::NearToken::from_near(2))
        .transact()
        .await?;
    final_tx(&worker, "setup-attacker", &root, &created.details).await?;
    let attacker = created.into_result()?;
    let accounts = [&owner, &vault, &attacker];
    // 5A: existing vault's own key authorizes deployment, with no initialization call.
    let deployed = vault.batch(vault.id()).deploy(&wasm).transact().await?;
    let raw = final_tx(&worker, CASES[0], &vault, &deployed).await?;
    ensure!(deployed.is_success(), "Deploy-only failed");
    ensure!(
        raw["transaction"]["actions"]
            .as_array()
            .context("actions")?
            .len()
            == 1,
        "Combined deployment slipped in"
    );
    let initial = snapshot(&worker, CASES[0], &accounts, &vault, &raw).await?;
    ensure!(
        initial["state"]["values"]
            .as_array()
            .context("state")?
            .is_empty(),
        "Already initialized"
    );
    mark(rows, CASES[0], &raw)?;
    for (id, actor, claim) in [
        (CASES[1], &attacker, owner.id()),
        (CASES[2], &attacker, attacker.id()),
        (CASES[3], &vault, owner.id()),
    ] {
        let result = actor
            .call(vault.id(), "new")
            .args_json(json!({"owner_id":claim}))
            .gas(Gas::from_tgas(100))
            .transact()
            .await?;
        let raw = final_tx(&worker, id, actor, &result).await?;
        let after = snapshot(&worker, id, &accounts, &vault, &raw).await?;
        ensure!(
            result.is_failure() && raw["status"].to_string().contains("ERR_INITIAL_OWNER"),
            "Unauthorized initialization unexpectedly accepted or wrong failure"
        );
        ensure!(
            after["state"]["values"] == initial["state"]["values"],
            "Unauthorized init mutated state"
        );
        mark(rows, id, &raw)?;
    }
    // 5B: separate transaction signed by immediate parent; direct call makes predecessor the parent too.
    let initialized = owner
        .call(vault.id(), "new")
        .args_json(json!({"owner_id":owner.id()}))
        .gas(Gas::from_tgas(100))
        .transact()
        .await?;
    let raw = final_tx(&worker, CASES[4], &owner, &initialized).await?;
    ensure!(initialized.is_success(), "Parent initialization failed");
    let init_receipt = raw["receipts"]
        .as_array()
        .context("Actual initialization receipts required")?
        .iter()
        .find(|r| {
            r["receiver_id"] == vault.id().as_str()
                && r["receipt"]["Action"]["actions"]
                    .as_array()
                    .is_some_and(|actions| {
                        actions
                            .iter()
                            .any(|a| a["FunctionCall"]["method_name"] == "new")
                    })
        })
        .context("Initialization action receipt missing")?;
    ensure!(
        init_receipt["predecessor_id"] == owner.id().as_str(),
        "Initializer predecessor is not owner"
    );
    ensure!(
        init_receipt["receipt"]["Action"]["signer_id"] == owner.id().as_str(),
        "Initializer signer is not owner"
    );
    ensure!(
        raw["receipts_outcome"]
            .as_array()
            .context("Outcomes")?
            .iter()
            .any(|r| r["id"] == init_receipt["receipt_id"]
                && r["outcome"]["status"].get("SuccessValue").is_some()),
        "Owner initialization receipt has no successful outcome"
    );
    save(
        "parent-identities.json",
        &json!({"signer":raw["transaction"]["signer_id"],
        "predecessor":init_receipt["predecessor_id"],"receipt_signer":init_receipt["receipt"]["Action"]["signer_id"],
        "receipt_id":init_receipt["receipt_id"],"hash":raw["transaction"]["hash"]}),
    )?;
    let ready = snapshot(&worker, CASES[4], &accounts, &vault, &raw).await?;
    let view=rpc(&worker,"query",json!({"request_type":"call_function","account_id":vault.id(),"method_name":"get_accounting","args_base64":"e30=","block_id":ready["block"]["header"]["hash"]})).await?;
    let accounting: Value =
        serde_json::from_slice(&serde_json::from_value::<Vec<u8>>(view["result"].clone())?)?;
    save("initialized-accounting.json", &accounting)?;
    ensure!(
        accounting["owner_id"] == owner.id().as_str(),
        "Wrong initialized owner"
    );
    for field in ["available", "pending", "spent", "unallocated", "budget"] {
        ensure!(
            accounting[field] == "0",
            "Nonzero initial accounting: {field}"
        );
    }
    let amount = ready["balances"][vault.id().as_str()]["amount"]
        .as_str()
        .context("balance")?
        .parse::<u128>()?;
    ensure!(
        amount
            >= accounting["storage_and_operating_floor"]
                .as_str()
                .context("reserve")?
                .parse::<u128>()?,
        "Vault reserve insufficient"
    );
    mark(rows, CASES[4], &raw)?;
    let repeated = owner
        .call(vault.id(), "new")
        .args_json(json!({"owner_id":owner.id()}))
        .gas(Gas::from_tgas(100))
        .transact()
        .await?;
    let raw = final_tx(&worker, CASES[5], &owner, &repeated).await?;
    let after = snapshot(&worker, CASES[5], &accounts, &vault, &raw).await?;
    ensure!(repeated.is_failure(), "Repeated initialization accepted");
    ensure!(
        raw["status"]
            .to_string()
            .contains("already been initialized"),
        "Repeated call failed for an unrelated reason"
    );
    ensure!(
        after["state"]["values"] == ready["state"]["values"],
        "Repeated initialization changed state"
    );
    mark(rows, CASES[5], &raw)?;
    Ok(())
}
#[tokio::test]
async fn frozen_split_initialization_security() -> Result<()> {
    let mut rows: Vec<Value> = CASES
        .iter()
        .map(|id| json!({"id":id,"status":"UNVERIFIED"}))
        .collect();
    let result = execute(&mut rows).await;
    save(
        "results.json",
        &json!({"network":"local-sandbox","wasm_sha256":SHA,"cases":rows,"error":result.as_ref().err().map(|e|format!("{e:#}"))}),
    )?;
    result
}
