//! Opt-in Linux tests. The original twelve Phase 2A scenarios are untouched.
//! Fault variants are explicitly separate from actual production-Wasm cases.
use super::*;

async fn admin(f: &Fixture, label: &str, method: &str) -> Result<ExecutionFinalResult> {
    let r = f
        .owner
        .call(f.vault.id(), method)
        .gas(GAS)
        .transact()
        .await?;
    f.capture(label, &f.owner, &r).await?;
    Ok(r)
}

// RPC exposes end-of-block state, not state after each receipt in that block.
// Capture each distinct receipt block and retain that limitation explicitly.
async fn receipt_blocks(f: &Fixture, label: &str, raw: &Value) -> Result<()> {
    let mut blocks = std::collections::BTreeSet::new();
    for r in raw["receipts_outcome"].as_array().context("receipts")? {
        blocks.insert(
            r["block_hash"]
                .as_str()
                .context("receipt block")?
                .to_owned(),
        );
    }
    for (index, hash) in blocks.iter().enumerate() {
        let account = rpc(
            &f.worker,
            "query",
            json!({"request_type":"view_account",
            "account_id":f.vault.id(),"block_id":hash}),
        )
        .await?;
        let view = rpc(
            &f.worker,
            "query",
            json!({"request_type":"call_function",
            "account_id":f.vault.id(),"method_name":"get_accounting",
            "args_base64":"e30=","block_id":hash}),
        )
        .await?;
        let a: Value =
            serde_json::from_slice(&serde_json::from_value::<Vec<u8>>(view["result"].clone())?)?;
        let floor = number(&a, "storage_and_operating_floor")?;
        let protected = floor
            .checked_add(number(&a, "unallocated")?)
            .context("protected overflow")?;
        let required = protected
            .checked_add(number(&a, "available")?)
            .context("backing overflow")?;
        let physical = number(&account, "amount")?;
        save(
            &format!("{}/{label}-receipt-block-{index}.json", f.case),
            &json!({
            "block_hash":hash,"account":account,"accounting":a,
            "protected_reserve":protected.to_string(),"required_liquid_backing":required.to_string(),
            "physically_backed":physical>=required,"reserve_intact":physical>=protected,
            "coverage":"end-of-receipt-block only; intra-block receipt states UNVERIFIED"}),
        )?;
        ensure!(
            physical >= protected,
            "storage/unallocated reserve breached at observed block"
        );
        ensure!(
            number(&a, "available")?
                .checked_add(number(&a, "pending")?)
                .and_then(|v| v.checked_add(number(&a, "spent").ok()?))
                == Some(number(&a, "budget")?),
            "block ledger"
        );
    }
    Ok(())
}

async fn maximum_state(worker: &Worker<Sandbox>, wasm: &[u8]) -> Result<()> {
    let f = Fixture::new(worker, wasm, "b-maxstate").await?;
    admin(&f, "replace-revoke", "revoke").await?.into_result()?;
    admin(&f, "replace-retire", "retire_mandate")
        .await?
        .into_result()?;
    // Eight maximum-length named recipients, three approved keys, all 64 slots used.
    // Only recipient 0 exists. No implicit account can accidentally turn failure into success.
    let prefix_len = 64 - f.owner.id().as_str().len() - 1;
    let mut recipients = Vec::new();
    for index in 0..8 {
        let name = format!("r{index}{}", "x".repeat(prefix_len - 2));
        let id: AccountId = format!("{name}.{}", f.owner.id()).parse()?;
        ensure!(id.as_str().len() == 64, "maximum recipient length");
        if index == 0 {
            create_account(worker, &f.owner, &name, 1, &f.case).await?;
        }
        recipients.push(id);
    }
    let block = rpc(worker, "block", json!({"finality":"final"})).await?;
    let expiry = number(&block["header"], "timestamp_nanosec")? + 600_000_000_000;
    let configured = f.owner.call(f.vault.id(), "create_mandate").args_json(json!({
        "agent_id":f.agent.id(),"agent_keys":f.restricted.iter().map(|a|a.secret_key().public_key().to_string()).collect::<Vec<_>>(),
        "allowed_recipients":recipients,"budget":N.to_string(),"per_transaction_limit":(N*4/10).to_string(),
        "expires_at_ns":expiry.to_string()})).gas(GAS).transact().await?;
    f.capture("maximum-config", &f.owner, &configured).await?;
    configured.into_result()?;
    let ready = f.snapshot("maximum-ready").await?;
    let storage = ready["accounts"][f.vault.id().as_str()]["storage_usage"].clone();
    let mut maximum_gas = 0_u64;
    for nonce in 0..64_u8 {
        let succeeds = nonce % 2 == 0;
        let recipient = &recipients[if succeeds { 0 } else { 7 }];
        let before = rpc(
            worker,
            "query",
            json!({"request_type":"view_account","account_id":recipients[0],"finality":"final"}),
        )
        .await?;
        let result = f.restricted[0].call(f.vault.id(),"execute_payment")
            .args_json(json!({"mandate_id":"2","nonce":nonce,"recipient":recipient,"amount":(N/100).to_string()}))
            .gas(GAS).transact().await?;
        let label = format!("slot-{nonce:02}");
        let raw = f.capture(&label, &f.restricted[0], &result).await?;
        let after = f.snapshot(&format!("{label}-after")).await?;
        let recipient_after = rpc(worker,"query",json!({"request_type":"view_account","account_id":recipients[0],"block_id":after["block_hash"]})).await?;
        save(
            &format!("{}/{label}-recipient.json", f.case),
            &json!({"before":before,"after":recipient_after}),
        )?;
        ensure!(
            result.is_success() && result.json::<bool>()? == succeeds,
            "wrong callback result"
        );
        let event = if succeeds {
            "payment_succeeded"
        } else {
            "payment_failed"
        };
        ensure!(events(&raw, event).len() == 1, "missing terminal event");
        if !succeeds {
            ensure!(
                raw.to_string().contains("AccountDoesNotExist"),
                "genuine native failure required"
            );
        }
        ensure!(
            number(&recipient_after, "amount")?
                == number(&before, "amount")? + if succeeds { N / 100 } else { 0 },
            "recipient balance"
        );
        let spent = u128::from(nonce / 2 + 1) * (N / 100);
        ledger(&after, N - spent, 0, spent)?;
        ensure!(
            after["physically_backed"] == true
                && after["accounts"][f.vault.id().as_str()]["storage_usage"] == storage,
            "backing/storage growth"
        );
        for r in raw["receipts_outcome"].as_array().context("receipts")? {
            if r["outcome"]["logs"]
                .as_array()
                .into_iter()
                .flatten()
                .any(|l| l.as_str().is_some_and(|s| s.contains(event)))
            {
                maximum_gas =
                    maximum_gas.max(r["outcome"]["gas_burnt"].as_u64().context("callback gas")?);
            }
        }
        receipt_blocks(&f, &label, &raw).await?;
    }
    save(
        "b-maxstate/gas-summary.json",
        &json!({"maximum_observed_callback_gas":maximum_gas,
        "allocation":15_000_000_000_000_u64,"test_headroom_threshold":10_000_000_000_000_u64,
        "scope":"64 populated slots, 8 max-length recipients, 3 keys, both outcomes; not a universal runtime bound"}),
    )?;
    ensure!(
        maximum_gas > 0 && maximum_gas < 10_000_000_000_000,
        "callback margin below five Tgas"
    );
    Ok(())
}

async fn custody(worker: &Worker<Sandbox>, wasm: &[u8]) -> Result<()> {
    let f = Fixture::new(worker, wasm, "b-custody").await?;
    let before = f.snapshot("before-protocol-transfer").await?;
    let result = f
        .vault
        .as_account()
        .transfer_near(f.attacker.id(), NearToken::from_yoctonear(N / 10))
        .await?;
    let raw = f
        .capture("full-access-transfer", f.vault.as_account(), &result)
        .await?;
    let after = f.snapshot("after-protocol-transfer").await?;
    result.into_result()?;
    ensure!(
        balance(&after, f.attacker.id())? == balance(&before, f.attacker.id())? + N / 10,
        "protocol transfer not observed"
    );
    ensure!(
        after["payments"] == before["payments"],
        "unexpected payment record"
    );
    ledger(&after, N, 0, 0)?;
    ensure!(
        raw["transaction"]["actions"][0]["Transfer"].is_object(),
        "must bypass contract with protocol Transfer"
    );
    save(
        "b-custody/finding.json",
        &json!({"status":"CONFIRMED CUSTODY LIMITATION","transaction_hash":raw["transaction"]["hash"],
        "meaning":"Retained full-access vault key bypasses policy; this PASS demonstrates a limitation, not safety against that key."}),
    )
}

async fn duplicate(worker: &Worker<Sandbox>, wasm: &[u8]) -> Result<()> {
    let f = Fixture::new(worker, wasm, "b-duplicate").await?;
    for nonce in 0..2_u8 {
        let first_target = if nonce == 0 {
            f.merchant.id()
        } else {
            &f.absent
        };
        let (result, _, _, original) = f
            .pay(&format!("original-{nonce}"), nonce, first_target, N / 10)
            .await?;
        ensure!(
            result.is_success() && result.json::<bool>()? == (nonce == 0),
            "original settlement"
        );
        for (index, target) in [f.merchant.id(), &f.absent].into_iter().enumerate() {
            let before_repeat = f
                .snapshot(&format!("repeat-{nonce}-{index}-before"))
                .await?;
            let result = f
                .vault
                .call("phase2b_repeat")
                .args_json(json!({"mandate_id":"1","nonce":nonce,"target":target}))
                .gas(GAS)
                .transact()
                .await?;
            let label = format!("repeat-{nonce}-{index}");
            let raw = f.capture(&label, f.vault.as_account(), &result).await?;
            let after = f.snapshot(&format!("{label}-after")).await?;
            ensure!(
                result.is_success() && !result.json::<bool>()?,
                "duplicate must return false normally"
            );
            ensure!(
                raw.to_string().contains("duplicate_settlement_ignored"),
                "duplicate callback did not execute"
            );
            ensure!(
                events(&raw, "payment_succeeded").is_empty()
                    && events(&raw, "payment_failed").is_empty(),
                "second settlement event"
            );
            ensure!(
                after["payments"] == original["payments"],
                "duplicate changed journal"
            );
            ensure!(after["physically_backed"] == true, "duplicate backing");
            ensure!(
                balance(&after, f.merchant.id())?
                    == balance(&before_repeat, f.merchant.id())? + if index == 0 { 1 } else { 0 },
                "duplicate sent principal again; only the diagnostic one-yocto probe is expected"
            );
            let callback = raw["receipts_outcome"]
                .as_array()
                .context("receipts")?
                .iter()
                .find(|r| {
                    r["outcome"]["logs"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .any(|l| l == "duplicate_settlement_ignored")
                })
                .context("duplicate callback receipt")?;
            save(
                &format!("{}/{label}-duplicate-callback.json", f.case),
                callback,
            )?;
            let gas = callback["outcome"]["gas_burnt"]
                .as_u64()
                .context("duplicate gas")?;
            ensure!(
                gas > 0 && gas <= 15_000_000_000_000,
                "duplicate callback gas"
            );
            for field in ["available", "pending", "spent", "unallocated"] {
                ensure!(
                    after["accounting"][field] == original["accounting"][field],
                    "duplicate changed accounting"
                );
            }
        }
    }
    Ok(())
}

async fn missing(worker: &Worker<Sandbox>, wasm: &[u8]) -> Result<()> {
    // This fresh worker's case name supplies a short expiry without changing production.
    let f = Fixture::new(worker, wasm, "expired").await?;
    let before = f.snapshot("before-fault").await?;
    ensure!(
        number(&before, "block_timestamp_ns")? < u128::from(f.expires_at_ns),
        "fault setup already expired"
    );
    let result = f.restricted[0]
        .call(f.vault.id(), "execute_payment")
        .args_json(payment_args(0, f.merchant.id(), N / 10))
        .gas(GAS)
        .transact()
        .await?;
    let raw = f
        .capture("callback-out-of-gas", &f.restricted[0], &result)
        .await?;
    let after = f.snapshot("after-failed-callback").await?;
    let is_gas_failure = |status: &Value| {
        let error = status["Failure"].to_string();
        error.contains("GasExceeded") || error.contains("Exceeded the prepaid gas")
    };
    ensure!(result.is_failure(), "callback did not fail");
    let failed_callback = raw["receipts_outcome"]
        .as_array()
        .context("receipts")?
        .iter()
        .find(|r| {
            r["outcome"]["executor_id"] == f.vault.id().as_str()
                && is_gas_failure(&r["outcome"]["status"])
        })
        .context("vault callback gas failure receipt")?;
    save("expired/failed-callback-receipt.json", failed_callback)?;
    ensure!(
        events(&raw, "payment_scheduled").len() == 1
            && events(&raw, "payment_succeeded").is_empty(),
        "wrong lifecycle"
    );
    ensure!(
        balance(&after, f.merchant.id())? == balance(&before, f.merchant.id())? + N / 10,
        "recipient was not paid"
    );
    ledger(&after, N * 9 / 10, N / 10, 0)?;
    f.wait_past_expiry().await?;
    admin(&f, "revoke-after-fault", "revoke")
        .await?
        .into_result()?;
    let retired = admin(&f, "retire-after-fault", "retire_mandate").await?;
    ensure!(
        retired.is_failure() && format!("{retired:?}").contains("ERR_NOT_RETIRABLE"),
        "stranded pending was retired"
    );
    let frozen = f.snapshot("after-expiry-revoke-retire").await?;
    ledger(&frozen, N * 9 / 10, N / 10, 0)?;
    ensure!(
        frozen["payments"][0]["status"] == "Pending",
        "missing callback released nonce"
    );
    receipt_blocks(&f, "fault", &raw).await?;

    // The opposite physical outcome: transfer fails and principal is refunded,
    // but failed settlement must still keep P. A balance increase is not authority.
    let refunded = Fixture::new(worker, wasm, "b-refundfault").await?;
    let before = refunded.snapshot("before-refund-fault").await?;
    let result = refunded.restricted[0]
        .call(refunded.vault.id(), "execute_payment")
        .args_json(payment_args(0, &refunded.absent, N / 10))
        .gas(GAS)
        .transact()
        .await?;
    let raw = refunded
        .capture("refunded-but-unsettled", &refunded.restricted[0], &result)
        .await?;
    let after = refunded.snapshot("after-refund-fault").await?;
    ensure!(
        result.is_failure() && raw.to_string().contains("AccountDoesNotExist"),
        "native failure not reproduced"
    );
    let failed_callback = raw["receipts_outcome"]
        .as_array()
        .context("receipts")?
        .iter()
        .find(|r| {
            r["outcome"]["executor_id"] == refunded.vault.id().as_str()
                && is_gas_failure(&r["outcome"]["status"])
        })
        .context("refunded transfer callback did not fail for gas")?;
    save(
        "b-refundfault/failed-callback-receipt.json",
        failed_callback,
    )?;
    ledger(&after, N * 9 / 10, N / 10, 0)?;
    vault_delta(&refunded, &before, &after, 0, &raw)?;
    admin(&refunded, "revoke-refund-fault", "revoke")
        .await?
        .into_result()?;
    let retired = admin(&refunded, "retire-refund-fault", "retire_mandate").await?;
    ensure!(
        retired.is_failure() && format!("{retired:?}").contains("ERR_NOT_RETIRABLE"),
        "refund restored budget without callback"
    );
    ledger(
        &refunded.snapshot("refund-remains-pending").await?,
        N * 9 / 10,
        N / 10,
        0,
    )?;
    receipt_blocks(&refunded, "refund-fault", &raw).await
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
#[ignore = "Requires Linux sandbox and explicitly built, labeled fault artifacts"]
async fn phase2b_security_gaps() -> Result<()> {
    let names = [
        "production maximum-state gas and receipt-block balances",
        "production full-access custody limitation",
        "diagnostic duplicate callback idempotency",
        "diagnostic out-of-gas callback leaves pending",
    ];
    let mut rows: Vec<Value> = names
        .iter()
        .map(|name| json!({"test":name,"status":"UNVERIFIED","reason":"not executed"}))
        .collect();
    save("phase2b/results.json", &json!({"tests":rows}))?;
    ensure!(
        cfg!(target_os = "linux"),
        "Linux sandbox required; compilation is not execution"
    );
    let production =
        std::fs::read(std::env::var("MANDATELOCK_WASM").context("production Wasm path required")?)?;
    let lowgas = std::fs::read(
        std::env::var("MANDATELOCK_LOWGAS_WASM").context("labeled lowgas path required")?,
    )?;
    let duplicates = std::fs::read(
        std::env::var("MANDATELOCK_DUPLICATE_WASM").context("labeled duplicate path required")?,
    )?;
    ensure!(
        production != lowgas && production != duplicates && lowgas != duplicates,
        "diagnostic/production artifacts must differ"
    );
    save(
        "phase2b/artifacts.json",
        &json!({"production_sha256":format!("{:x}",Sha256::digest(&production)),
        "diagnostic_lowgas_sha256":format!("{:x}",Sha256::digest(&lowgas)),"diagnostic_duplicate_sha256":format!("{:x}",Sha256::digest(&duplicates)),
        "intra_block_solvency":"UNVERIFIED: RPC queries do not expose individual intra-block receipt states"}),
    )?;
    for index in 0..names.len() {
        // Independent node per case also isolates short-expiry/fault state and account names.
        let result = async {
            let worker = near_workspaces::sandbox_with_version("2.13.4").await?;
            save(
                &format!("phase2b/runtime-{index}.json"),
                &rpc(&worker, "status", json!([])).await?,
            )?;
            match index {
                0 => maximum_state(&worker, &production).await,
                1 => custody(&worker, &production).await,
                2 => duplicate(&worker, &duplicates).await,
                _ => missing(&worker, &lowgas).await,
            }
        }
        .await;
        rows[index] = match result {
            Ok(()) => json!({"test":names[index],"status":"PASS"}),
            Err(e) => json!({"test":names[index],"status":"FAIL","error":format!("{e:#}")}),
        };
        println!("{}", rows[index]);
        save("phase2b/results.json", &json!({"tests":rows}))?;
    }
    ensure!(
        rows.iter().all(|row| row["status"] == "PASS"),
        "Phase 2B runtime case failures; inspect captured evidence"
    );
    Ok(())
}
