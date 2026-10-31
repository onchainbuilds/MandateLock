//! Linux-only integration harness; the production contract is loaded from its Wasm file.
//! No testnet or mainnet constructor is used in this crate.

use anyhow::{Context, Result, ensure};
use base64::{Engine, engine::general_purpose::STANDARD};
use serde_json::Value;

/// Optimistic execution must never be used as a final-state setup barrier.
pub fn require_final_transaction(raw: &Value, hash: &str, signer: &str) -> Result<()> {
    ensure!(
        raw["final_execution_status"] == "FINAL",
        "transaction/receipts not FINAL"
    );
    ensure!(
        raw["transaction"]["hash"] == hash,
        "transaction hash mismatch"
    );
    ensure!(
        raw["transaction"]["signer_id"] == signer,
        "transaction signer mismatch"
    );
    ensure!(
        raw["receipts_outcome"].is_array(),
        "missing receipt outcomes"
    );
    Ok(())
}

/// Strictly greater is deliberate: the expiry test must prove its precondition.
pub fn require_expired(timestamp_ns: u128, expires_at_ns: u128) -> Result<()> {
    ensure!(
        timestamp_ns > expires_at_ns,
        "expiry precondition not established: timestamp={timestamp_ns}, expiry={expires_at_ns}"
    );
    Ok(())
}

/// A protocol-level nonce conflict with no vault execution is never budget proof.
pub fn require_competing_call(
    raw: &Value,
    signer: &str,
    vault: &str,
    key: &str,
    expected_args: &Value,
) -> Result<()> {
    ensure!(
        raw["transaction"]["signer_id"] == signer,
        "wrong signer account"
    );
    ensure!(raw["transaction"]["receiver_id"] == vault, "wrong receiver");
    ensure!(
        raw["transaction"]["public_key"] == key,
        "wrong independent signing key"
    );
    let actions = raw["transaction"]["actions"]
        .as_array()
        .context("transaction actions")?;
    ensure!(actions.len() == 1, "unexpected action count");
    let call = &actions[0]["FunctionCall"];
    ensure!(
        call["method_name"] == "execute_payment" && call["deposit"] == "0",
        "invalid payment action"
    );
    let args: Value = serde_json::from_slice(
        &STANDARD.decode(call["args"].as_str().context("call arguments")?)?,
    )?;
    ensure!(args == *expected_args, "competing payment arguments differ");
    ensure!(
        !raw.to_string().contains("InvalidNonce"),
        "nonce conflict is not budget enforcement"
    );
    ensure!(
        raw["receipts_outcome"]
            .as_array()
            .context("receipt outcomes")?
            .iter()
            .any(|receipt| receipt["outcome"]["executor_id"] == vault),
        "transaction never reached vault"
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn transaction() -> Value {
        json!({"final_execution_status":"FINAL", "transaction":{"hash":"tx", "signer_id":"agent.sandbox",
            "receiver_id":"vault.sandbox", "public_key":"test-public-key", "actions":[{"FunctionCall":{
                "method_name":"execute_payment", "deposit":"0", "args":STANDARD.encode(br#"{"nonce":0}"#)}}]},
            "receipts_outcome":[{"outcome":{"executor_id":"vault.sandbox"}}]})
    }

    #[test]
    fn optimistic_execution_is_not_a_setup_barrier() {
        for status in ["EXECUTED_OPTIMISTIC", "EXECUTED", "INCLUDED_FINAL"] {
            let mut raw = transaction();
            raw["final_execution_status"] = json!(status);
            assert!(require_final_transaction(&raw, "tx", "agent.sandbox").is_err());
        }
        assert!(require_final_transaction(&transaction(), "tx", "agent.sandbox").is_ok());
    }

    #[test]
    fn unrelated_final_transaction_cannot_unlock_setup() {
        assert!(require_final_transaction(&transaction(), "other-tx", "agent.sandbox").is_err());
        assert!(require_final_transaction(&transaction(), "tx", "attacker.sandbox").is_err());
    }

    #[test]
    fn expiry_requires_observed_time_strictly_beyond_deadline() {
        assert!(require_expired(599, 600).is_err());
        assert!(require_expired(600, 600).is_err());
        assert!(require_expired(601, 600).is_ok());
    }

    #[test]
    fn nonce_conflicts_and_missing_vault_receipts_are_not_competition() {
        let args = json!({"nonce":0});
        let check = |raw: &Value| {
            require_competing_call(
                raw,
                "agent.sandbox",
                "vault.sandbox",
                "test-public-key",
                &args,
            )
        };
        assert!(check(&transaction()).is_ok());
        let mut raw = transaction();
        raw["status"] = json!({"Failure":{"InvalidNonce":{}}});
        assert!(check(&raw).is_err());
        raw = transaction();
        raw["receipts_outcome"] = json!([]);
        assert!(check(&raw).is_err());
        raw = transaction();
        raw["transaction"]["public_key"] = json!("reused-key");
        assert!(check(&raw).is_err());
        raw = transaction();
        raw["transaction"]["actions"][0]["FunctionCall"]["args"] =
            json!(STANDARD.encode(br#"{"nonce":1}"#));
        assert!(check(&raw).is_err());
    }
}
