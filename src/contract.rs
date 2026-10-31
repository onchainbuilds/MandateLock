//! NEAR runtime adapter. Only this module reads runtime identities or creates promises.
use crate::model::{Context, PolicyInput, Settlement, TransferOutcome, VaultState};
use near_sdk::json_types::{U64, U128};
use near_sdk::serde_json::{Value, json};
use near_sdk::{AccountId, CurveType, Gas, NearToken, PanicOnDefault, Promise, PromiseError};
use near_sdk::{PublicKey, env, near};

const CALLBACK_GAS: Gas = Gas::from_tgas(15);

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct MandateLock {
    state: VaultState,
}

fn checked<T>(value: crate::model::Result<T>) -> T {
    value.unwrap_or_else(|error| env::panic_str(error))
}

#[near]
impl MandateLock {
    /// owner_id must be the immediate parent of this vault account.
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        let result = Self {
            state: checked(VaultState::new(owner_id.to_string(), &runtime_context(0))),
        };
        result.require_backing();
        result
    }

    /// Deployment balance is reserve only. Explicit owner deposits credit principal.
    #[payable]
    pub fn fund(&mut self) {
        checked(self.state.fund(&self.context()));
        self.emit("funded", None);
    }

    pub fn create_mandate(
        &mut self,
        agent_id: AccountId,
        agent_keys: Vec<PublicKey>,
        allowed_recipients: Vec<AccountId>,
        budget: U128,
        per_transaction_limit: U128,
        expires_at_ns: U64,
    ) -> U64 {
        // Parse PublicKey/AccountId through SDK types, and bound before storing any strings.
        if agent_keys.len() > crate::model::MAX_KEYS
            || allowed_recipients.len() > crate::model::MAX_RECIPIENTS
            || agent_keys
                .iter()
                .any(|key| key.curve_type() != CurveType::ED25519)
        {
            env::panic_str("ERR_CONFIG_BOUNDS");
        }
        let id = checked(self.state.configure(
            &self.context(),
            PolicyInput {
                agent: agent_id.to_string(),
                agent_keys: agent_keys.iter().map(ToString::to_string).collect(),
                recipients: allowed_recipients.iter().map(ToString::to_string).collect(),
                budget: budget.0,
                per_transaction: per_transaction_limit.0,
                expires_at: expires_at_ns.0,
            },
        ));
        // Covers the newly preallocated slots before this receipt can commit.
        self.require_backing();
        self.emit("mandate_created", None);
        U64(id)
    }

    pub fn pause(&mut self) {
        checked(self.state.pause(&self.context()));
        self.emit("mandate_paused", None);
    }

    pub fn resume(&mut self) {
        checked(self.state.resume(&self.context()));
        self.emit("mandate_resumed", None);
    }

    pub fn revoke(&mut self) {
        checked(self.state.revoke(&self.context()));
        self.emit("mandate_revoked", None);
    }

    pub fn retire_mandate(&mut self) {
        let id = self.state.mandate.as_ref().map(|m| m.id);
        checked(self.state.retire(&self.context()));
        log_event(json!({
            "standard": "mandatelock", "version": "1.0.0", "event": "mandate_retired",
            "data": [{"mandate_id": id.map(|v| v.to_string()),
                      "unallocated": self.state.unallocated.to_string()}]
        }));
    }

    /// Nonce is an application request slot 0..63, independent of access-key tx nonces.
    pub fn execute_payment(
        &mut self,
        mandate_id: U64,
        nonce: u8,
        recipient: AccountId,
        amount: U128,
    ) -> Promise {
        checked(self.state.reserve(
            &self.context(),
            mandate_id.0,
            nonce,
            recipient.as_str(),
            amount.0,
        ));
        self.emit("payment_scheduled", Some(nonce));
        // The state reservation and emitted promises commit in the same receipt.
        Promise::new(recipient)
            .transfer(NearToken::from_yoctonear(amount.0))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(CALLBACK_GAS)
                    .with_unused_gas_weight(0)
                    .on_payment_result(mandate_id, nonce),
            )
    }

    #[private]
    pub fn on_payment_result(&mut self, mandate_id: U64, nonce: u8) -> bool {
        // Also explicit in the model, so direct native calls cannot omit this guard.
        if env::predecessor_account_id() != env::current_account_id() {
            env::panic_str("ERR_PRIVATE");
        }
        let count = env::promise_results_count();
        if count != 1 {
            env::panic_str("ERR_RESULT_COUNT");
        }
        // A native Transfer has an empty result. Bound reads; unexpected data fail closed.
        let outcome = match env::promise_result_checked(0, 0) {
            Ok(_) => TransferOutcome::Success,
            Err(PromiseError::Failed) => TransferOutcome::Failure,
            Err(_) => env::panic_str("ERR_TRANSFER_RESULT"),
        };
        match checked(
            self.state
                .settle(&self.context(), mandate_id.0, nonce, count, outcome),
        ) {
            Settlement::Succeeded => {
                self.emit("payment_succeeded", Some(nonce));
                true
            }
            Settlement::Failed => {
                self.emit("payment_failed", Some(nonce));
                false
            }
            Settlement::Duplicate => {
                env::log_str("duplicate_settlement_ignored");
                false
            }
        }
    }

    pub fn get_policy(&self) -> Value {
        self.state.mandate.as_ref().map_or(Value::Null, |m| {
            json!({
                "mandate_id": m.id.to_string(), "owner_id": self.state.owner,
                "agent_id": m.agent, "agent_keys": m.agent_keys,
                "allowed_recipients": m.recipients, "budget": m.budget.to_string(),
                "per_transaction_limit": m.per_transaction.to_string(),
                "expires_at_ns": m.expires_at.to_string(), "paused": m.paused,
                "revoked": m.revoked, "request_capacity": crate::model::MAX_REQUESTS
            })
        })
    }

    pub fn get_accounting(&self) -> Value {
        let m = self.state.mandate.as_ref();
        json!({
            "owner_id": self.state.owner,
            "last_mandate_id": self.state.last_mandate_id.to_string(),
            "unallocated": self.state.unallocated.to_string(),
            "available": m.map_or(0, |m| m.available).to_string(),
            "pending": m.map_or(0, |m| m.pending).to_string(),
            "spent": m.map_or(0, |m| m.spent).to_string(),
            "budget": m.map_or(0, |m| m.budget).to_string(),
            "storage_and_operating_floor": self.floor().to_string(),
            "account_balance": env::account_balance().as_yoctonear().to_string()
        })
    }

    pub fn get_payment(&self, mandate_id: U64, nonce: u8) -> Value {
        let m = self.state.mandate.as_ref().filter(|m| m.id == mandate_id.0);
        m.and_then(|m| m.payments.get(usize::from(nonce)))
            .map_or(Value::Null, |p| {
                json!({
                    "mandate_id": mandate_id.0.to_string(), "nonce": nonce,
                    "status": format!("{:?}", p.status), "amount": p.amount.to_string(),
                    "recipient": p.recipient(), "accepted_at_ns": p.accepted_at.to_string()
                })
            })
    }
}

impl MandateLock {
    fn context(&self) -> Context {
        runtime_context(self.floor())
    }

    fn floor(&self) -> u128 {
        let serialized =
            near_sdk::borsh::to_vec(self).unwrap_or_else(|_| env::panic_str("ERR_SERIALIZATION"));
        // STATE is the pinned near-sdk 5.29.1 state key. Include changes that the SDK
        // will persist after the method returns, while retaining code/account usage.
        let persisted_len = env::storage_read(b"STATE").map_or(0, |bytes| bytes.len());
        checked(crate::model::storage_floor(
            u128::from(env::storage_usage()),
            persisted_len as u128,
            serialized.len() as u128,
            env::storage_byte_cost().as_yoctonear(),
        ))
    }

    fn require_backing(&self) {
        let available = self.state.mandate.as_ref().map_or(0, |m| m.available);
        let principal = checked(crate::model::checked_add(self.state.unallocated, available));
        let required = checked(crate::model::checked_add(self.floor(), principal));
        if env::account_balance().as_yoctonear() < required {
            env::panic_str("ERR_LIQUIDITY");
        }
    }

    fn emit(&self, event: &str, nonce: Option<u8>) {
        let m = self.state.mandate.as_ref();
        let payment = nonce.and_then(|n| m.and_then(|m| m.payments.get(usize::from(n))));
        log_event(json!({
            "standard": "mandatelock", "version": "1.0.0", "event": event,
            "data": [{
                "mandate_id": m.map(|m| m.id.to_string()), "nonce": nonce,
                "recipient": payment.map(|p| p.recipient()),
                "amount": payment.map(|p| p.amount.to_string()),
                "available": m.map(|m| m.available.to_string()),
                "pending": m.map(|m| m.pending.to_string()),
                "spent": m.map(|m| m.spent.to_string()),
                "unallocated": self.state.unallocated.to_string()
            }]
        }));
    }
}

fn runtime_context(floor: u128) -> Context {
    Context {
        current: env::current_account_id().to_string(),
        predecessor: env::predecessor_account_id().to_string(),
        signer: env::signer_account_id().to_string(),
        signer_key: env::signer_account_pk().to_string(),
        now: env::block_timestamp(),
        deposit: env::attached_deposit().as_yoctonear(),
        balance: env::account_balance().as_yoctonear(),
        floor,
        remaining_gas: env::prepaid_gas()
            .as_gas()
            .saturating_sub(env::used_gas().as_gas()),
    }
}

fn log_event(event: Value) {
    env::log_str(&format!("EVENT_JSON:{event}"));
}
