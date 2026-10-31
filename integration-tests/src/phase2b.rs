//! Evidence predicates for the Phase 2B fault harness, independent of panic wording.
use anyhow::{Context, Result, ensure};
use serde_json::Value;

pub fn require_rejected_without_state_change(
    raw: &Value,
    vault: &str,
    before: &Value,
    after: &Value,
) -> Result<()> {
    ensure!(raw["final_execution_status"] == "FINAL", "not FINAL");
    ensure!(
        raw["status"]["Failure"].is_object(),
        "transaction did not fail"
    );
    ensure!(
        raw["receipts_outcome"]
            .as_array()
            .context("receipts")?
            .iter()
            .any(|r| r["outcome"]["executor_id"] == vault
                && r["outcome"]["status"]["Failure"].is_object()),
        "no failed vault receipt"
    );
    ensure!(
        before["policy"].is_object() && before["payments"].is_array(),
        "missing before state"
    );
    ensure!(
        before["policy"] == after["policy"],
        "policy removed or changed"
    );
    ensure!(
        before["payments"] == after["payments"],
        "payment journal changed"
    );
    for field in [
        "owner_id",
        "last_mandate_id",
        "budget",
        "available",
        "pending",
        "spent",
        "unallocated",
    ] {
        let original = before["accounting"][field]
            .as_str()
            .context("missing accounting field")?;
        ensure!(
            after["accounting"][field] == original,
            "accounting changed: {field}"
        );
    }
    ensure!(
        before["accounting"]["pending"]
            .as_str()
            .context("pending")?
            .parse::<u128>()?
            > 0,
        "no pending obligation under test"
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn state() -> Value {
        json!({"policy":{"mandate_id":"1","revoked":true},"payments":[{"status":"Pending","amount":"1"}],
            "accounting":{"owner_id":"owner","last_mandate_id":"1","budget":"10","available":"9",
                "pending":"1","spent":"0","unallocated":"0"}})
    }
    fn rejected() -> Value {
        json!({"final_execution_status":"FINAL","status":{"Failure":{"error":"generic trap"}},
            "receipts_outcome":[{"outcome":{"executor_id":"vault","status":{"Failure":{"error":"generic trap"}}}}]})
    }
    #[test]
    fn rejected_retirement_is_behavioral_not_an_error_string_match() {
        for error in [
            "ERR_NOT_RETIRABLE",
            "WebAssembly trap: unreachable",
            "different runtime wording",
        ] {
            let mut raw = rejected();
            raw["status"]["Failure"]["error"] = json!(error);
            assert!(
                require_rejected_without_state_change(&raw, "vault", &state(), &state()).is_ok()
            );
        }
    }
    #[test]
    fn retirement_or_budget_release_cannot_hide_behind_failed_status() {
        for field in [
            "budget",
            "available",
            "pending",
            "spent",
            "unallocated",
            "last_mandate_id",
        ] {
            let mut after = state();
            after["accounting"][field] = json!("999");
            assert!(
                require_rejected_without_state_change(&rejected(), "vault", &state(), &after)
                    .is_err()
            );
        }
        for field in ["policy", "payments"] {
            let mut after = state();
            after[field] = Value::Null;
            assert!(
                require_rejected_without_state_change(&rejected(), "vault", &state(), &after)
                    .is_err()
            );
        }
    }
    #[test]
    fn successful_or_unexecuted_retirement_is_not_rejection_evidence() {
        for (field, value) in [
            ("status", json!({"SuccessValue":""})),
            ("final_execution_status", json!("EXECUTED_OPTIMISTIC")),
            ("receipts_outcome", json!([])),
        ] {
            let mut raw = rejected();
            raw[field] = value;
            assert!(
                require_rejected_without_state_change(&raw, "vault", &state(), &state()).is_err()
            );
        }
        assert!(
            require_rejected_without_state_change(&rejected(), "other-vault", &state(), &state())
                .is_err()
        );
    }
}
