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
    let mut violations = Vec::new();
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
        let block = rpc(&f.worker, "block", json!({"block_id":hash})).await?;
        let stored = rpc(
            &f.worker,
            "query",
            json!({"request_type":"view_state",
            "account_id":f.vault.id(),"prefix_base64":"","block_id":hash}),
        )
        .await?;
        let state_entry = stored["values"]
            .as_array()
            .context("state values")?
            .iter()
            .find(|e| e["key"] == "U1RBVEU=")
            .context("STATE")?;
        let state: VaultState = borsh::from_slice(
            &STANDARD.decode(state_entry["value"].as_str().context("state bytes")?)?,
        )?;
        let journal_valid = state.mandate.as_ref().map_or_else(
            || {
                ["available", "pending", "spent", "budget"]
                    .iter()
                    .all(|field| number(&a, field).ok() == Some(0))
            },
            |m| {
                m.check_invariants().is_ok()
                    && number(&a, "available").ok() == Some(m.available)
                    && number(&a, "pending").ok() == Some(m.pending)
                    && number(&a, "spent").ok() == Some(m.spent)
                    && number(&a, "budget").ok() == Some(m.budget)
            },
        );
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
            "block_hash":hash,"block_height":block["header"]["height"],
            "block_timestamp_ns":block["header"]["timestamp_nanosec"],
            "transaction_hash":raw["transaction"]["hash"],
            "receipt_ids":raw["receipts_outcome"].as_array().context("receipts")?.iter()
                .filter(|r|r["block_hash"] == hash.as_str()).map(|r|r["id"].clone()).collect::<Vec<_>>(),
            "account":account,"accounting":a,"raw_state":stored,"journal_valid":journal_valid,
            "protected_reserve":protected.to_string(),"required_liquid_backing":required.to_string(),
            "physically_backed":physical>=required,"reserve_intact":physical>=protected,
            "coverage":"end-of-receipt-block only; intra-block receipt states UNVERIFIED"}),
        )?;
        if physical < protected
            || !journal_valid
            || number(&a, "unallocated")? != state.unallocated
            || number(&a, "account_balance")? != physical
        {
            violations.push(hash.clone());
        }
    }
    ensure!(
        violations.is_empty(),
        "receipt-block reserve/journal mismatch: {violations:?}"
    );
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
    retire_settled(&f).await?;
    Ok(())
}

// Positive control: retirement is possible once every actual transfer has settled.
// Fixture::snapshot intentionally requires an active mandate, so capture the empty
// post-retirement state explicitly instead of weakening Phase 2A's setup barrier.
async fn retire_settled(f: &Fixture) -> Result<()> {
    admin(f, "settled-revoke", "revoke").await?.into_result()?;
    let before = f.snapshot("before-settled-retirement").await?;
    let result = f
        .owner
        .call(f.vault.id(), "retire_mandate")
        .gas(GAS)
        .transact()
        .await?;
    let captured = f.capture("settled-retirement", &f.owner, &result).await;
    let block = rpc(&f.worker, "block", json!({"finality":"final"})).await?;
    let hash = &block["header"]["hash"];
    let state_response = rpc(
        &f.worker,
        "query",
        json!({"request_type":"view_state",
        "account_id":f.vault.id(),"prefix_base64":"","block_id":hash}),
    )
    .await?;
    let account = rpc(
        &f.worker,
        "query",
        json!({"request_type":"view_account",
        "account_id":f.vault.id(),"block_id":hash}),
    )
    .await?;
    let mut views = serde_json::Map::new();
    for method in ["get_policy", "get_accounting"] {
        let response = rpc(
            &f.worker,
            "query",
            json!({"request_type":"call_function",
            "account_id":f.vault.id(),"method_name":method,"args_base64":"e30=","block_id":hash}),
        )
        .await?;
        views.insert(method.to_owned(), response);
    }
    save(
        &format!("{}/after-settled-retirement.json", f.case),
        &json!({
        "block":block,"account":account,"state":state_response,"views":views}),
    )?;
    let raw = captured?;
    let blocks = receipt_blocks(f, "settled-retirement", &raw).await;
    result.into_result()?;
    let entry = state_response["values"]
        .as_array()
        .context("state")?
        .iter()
        .find(|e| e["key"] == "U1RBVEU=")
        .context("STATE")?;
    let state: VaultState =
        borsh::from_slice(&STANDARD.decode(entry["value"].as_str().context("state bytes")?)?)?;
    let accounting: Value = serde_json::from_slice(&serde_json::from_value::<Vec<u8>>(
        views["get_accounting"]["result"].clone(),
    )?)?;
    let policy: Value = serde_json::from_slice(&serde_json::from_value::<Vec<u8>>(
        views["get_policy"]["result"].clone(),
    )?)?;
    ensure!(
        state.mandate.is_none() && policy.is_null(),
        "settled mandate not retired"
    );
    ensure!(
        events(&raw, "mandate_retired").len() == 1,
        "missing retirement event"
    );
    let expected = number(&before["accounting"], "unallocated")?
        .checked_add(number(&before["accounting"], "available")?)
        .context("unallocated overflow")?;
    ensure!(
        state.unallocated == expected && number(&accounting, "unallocated")? == expected,
        "retirement did not preserve remaining principal"
    );
    ensure!(
        number(&accounting, "last_mandate_id")?
            == number(&before["accounting"], "last_mandate_id")?,
        "retirement reset mandate counter"
    );
    for field in ["available", "pending", "spent", "budget"] {
        ensure!(number(&accounting, field)? == 0, "retired ledger not empty");
    }
    let physical = number(&account, "amount")?;
    ensure!(
        physical == number(&accounting, "account_balance")?
            && physical
                >= number(&accounting, "storage_and_operating_floor")?
                    .checked_add(expected)
                    .context("reserve overflow")?,
        "retired vault reserve/backing"
    );
    let residual = physical
        .checked_sub(balance(&before, f.vault.id())?)
        .context("retirement lost principal")?;
    ensure!(
        residual <= fees(&raw)?,
        "retirement unexplained balance increase"
    );
    blocks
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
            let after = f.snapshot(&format!("{label}-after")).await;
            let blocks = receipt_blocks(&f, &label, &raw).await;
            let after = after?;
            blocks?;
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

// Save state and receipt-block evidence before making rejection assertions.
async fn rejected_probe(
    f: &Fixture,
    label: &str,
    actor: &Account,
    method: &str,
    args: Value,
) -> Result<()> {
    let before = f.snapshot(&format!("{label}-before")).await?;
    let result = actor
        .call(f.vault.id(), method)
        .args_json(args)
        .gas(GAS)
        .transact()
        .await?;
    let captured = f.capture(label, actor, &result).await;
    let after = f.snapshot(&format!("{label}-after")).await;
    let raw = captured?;
    let blocks = receipt_blocks(f, label, &raw).await;
    let after = after?;
    mandatelock_sandbox_tests::phase2b::require_rejected_without_state_change(
        &raw,
        f.vault.id().as_str(),
        &before,
        &after,
    )?;
    ensure!(result.is_failure(), "rejected operation succeeded");
    ensure!(
        events(&raw, "mandate_retired").is_empty()
            && events(&raw, "payment_scheduled").is_empty()
            && events(&raw, "payment_succeeded").is_empty()
            && events(&raw, "payment_failed").is_empty(),
        "rejected operation emitted a committed transition"
    );
    for account in [f.merchant.id(), f.attacker.id()] {
        ensure!(
            balance(&before, account)? == balance(&after, account)?,
            "rejected operation paid recipient"
        );
    }
    // Self-signed probes pay gas from the vault; owner probes can credit execution rewards.
    let delta = balance(&before, f.vault.id())?.abs_diff(balance(&after, f.vault.id())?);
    save(
        &format!("{}/{label}-balance-check.json", f.case),
        &json!({
        "absolute_vault_delta":delta.to_string(),"fee_bound":fees(&raw)?.to_string(),
        "principal_transfer_expected":"0","post_state_unchanged":true}),
    )?;
    ensure!(
        delta <= fees(&raw)?,
        "unexplained principal movement on rejection"
    );
    ensure!(after["physically_backed"] == true, "post-rejection backing");
    blocks
}

async fn callback_fault(worker: &Worker<Sandbox>, wasm: &[u8], paid: bool) -> Result<()> {
    let case = if paid { "b-paidfault" } else { "b-refundfault" };
    let f = Fixture::new(worker, wasm, case).await?;
    let before = f.snapshot("before-fault").await?;
    ensure!(
        number(&before, "block_timestamp_ns")? < u128::from(f.expires_at_ns),
        "fault setup already expired"
    );
    let target = if paid { f.merchant.id() } else { &f.absent };
    let result = f.restricted[0]
        .call(f.vault.id(), "execute_payment")
        .args_json(payment_args(0, target, N / 10))
        .gas(GAS)
        .transact()
        .await?;
    let captured = f
        .capture("callback-out-of-gas", &f.restricted[0], &result)
        .await;
    let after = f.snapshot("after-failed-callback").await;
    let raw = captured?;
    // Attempt all intermediate reads even if the later lifecycle assertion fails.
    let blocks = receipt_blocks(&f, "fault", &raw).await;
    let after = after?;
    let receipts = raw["receipts_outcome"].as_array().context("receipts")?;
    let failed_callback = receipts
        .iter()
        .find(|r| {
            let error = r["outcome"]["status"]["Failure"].to_string();
            r["outcome"]["executor_id"] == f.vault.id().as_str()
                && (error.contains("GasExceeded") || error.contains("Exceeded the prepaid gas"))
        })
        .context("vault callback gas failure receipt")?;
    let transfer = receipts
        .iter()
        .find(|r| r["outcome"]["executor_id"] == target.as_str())
        .context("native transfer receipt")?;
    save(
        &format!("{case}/fault-receipts.json"),
        &json!({
        "transaction_hash":raw["transaction"]["hash"],"transfer":transfer,"callback":failed_callback,
        "callback_static_gas":1_000_000_000_000_u64,
        "whole_receipt_gas_includes_overhead":true}),
    )?;
    ensure!(result.is_failure(), "callback did not fail");
    ensure!(
        events(&raw, "payment_scheduled").len() == 1
            && events(&raw, "payment_succeeded").is_empty()
            && events(&raw, "payment_failed").is_empty(),
        "wrong lifecycle"
    );
    if paid {
        ensure!(
            transfer["outcome"]["status"]["SuccessValue"] == "",
            "native transfer did not succeed"
        );
    } else {
        ensure!(
            transfer["outcome"]["status"]["Failure"]
                .to_string()
                .contains("AccountDoesNotExist"),
            "genuine native failure not reproduced"
        );
    }
    let outgoing = if paid { N / 10 } else { 0 };
    ensure!(
        balance(&after, f.merchant.id())? == balance(&before, f.merchant.id())? + outgoing,
        "recipient physical balance"
    );
    vault_delta(&f, &before, &after, outgoing, &raw)?;
    ledger(&after, N * 9 / 10, N / 10, 0)?;
    ensure!(
        after["payments"][0]["status"] == "Pending" && after["physically_backed"] == true,
        "failed callback released slot or left insufficient liquid backing"
    );
    blocks?;
    f.wait_past_expiry().await?;
    let revoked = admin(&f, "revoke-after-fault", "revoke").await;
    let frozen = f.snapshot("after-expiry-revoke").await;
    revoked?.into_result()?;
    let frozen = frozen?;
    ledger(&frozen, N * 9 / 10, N / 10, 0)?;
    ensure!(
        frozen["policy"]["revoked"] == true && frozen["payments"] == after["payments"],
        "revocation changed pending journal"
    );
    require_expired(
        number(&frozen, "block_timestamp_ns")?,
        u128::from(f.expires_at_ns),
    )?;
    rejected_probe(
        &f,
        "retire-after-fault",
        &f.owner,
        "retire_mandate",
        json!({}),
    )
    .await?;
    // Neither owner authority nor a direct self-call supplies the original promise result.
    for (label, actor) in [
        ("owner-cannot-recover", &f.owner),
        ("self-call-no-result", f.vault.as_account()),
    ] {
        rejected_probe(
            &f,
            label,
            actor,
            "on_payment_result",
            json!({"mandate_id":"1","nonce":0}),
        )
        .await?;
    }
    rejected_probe(
        &f,
        "no-second-payment",
        &f.restricted[0],
        "execute_payment",
        payment_args(0, target, N / 10),
    )
    .await?;
    Ok(())
}

async fn missing(wasm: &[u8]) -> Result<()> {
    // Both physical outcomes run independently, even if one branch fails setup/assertions.
    let mut rows = vec![
        json!({"test":"paid transfer + failed callback","status":"UNVERIFIED"}),
        json!({"test":"refunded transfer + failed callback","status":"UNVERIFIED"}),
    ];
    save("phase2b/fault-branches.json", &json!({"tests":rows}))?;
    for (index, paid) in [true, false].into_iter().enumerate() {
        let result = async {
            let worker = near_workspaces::sandbox_with_version("2.13.4").await?;
            save(
                &format!("phase2b/fault-runtime-{index}.json"),
                &rpc(&worker, "status", json!([])).await?,
            )?;
            callback_fault(&worker, wasm, paid).await
        }
        .await;
        rows[index]["status"] = json!(if result.is_ok() { "PASS" } else { "FAIL" });
        if let Err(e) = result {
            rows[index]["error"] = json!(format!("{e:#}"));
        }
        println!("{}", rows[index]);
        save("phase2b/fault-branches.json", &json!({"tests":rows}))?;
    }
    ensure!(
        rows.iter().all(|r| r["status"] == "PASS"),
        "fault branch failures; inspect independent branch evidence"
    );
    Ok(())
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
                _ => missing(&lowgas).await,
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
