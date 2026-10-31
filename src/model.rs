//! Deterministic state transitions; no network, clock, or runtime mocks live here.
use borsh::{BorshDeserialize, BorshSerialize};

pub const MAX_REQUESTS: usize = 64;
pub const MAX_RECIPIENTS: usize = 8;
pub const MAX_KEYS: usize = 3;
pub const MIN_REMAINING_GAS: u64 = 35_000_000_000_000;
pub const STORAGE_HEADROOM_BYTES: u128 = 4096;
pub const OPERATING_MARGIN: u128 = 10_000_000_000_000_000_000_000;
pub type Result<T> = std::result::Result<T, &'static str>;

/// Values supplied exclusively by the NEAR adapter in production.
#[derive(Clone, Debug)]
pub struct Context {
    pub current: String,
    pub predecessor: String,
    pub signer: String,
    pub signer_key: String,
    pub now: u64,
    pub deposit: u128,
    pub balance: u128,
    pub floor: u128,
    pub remaining_gas: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum PaymentStatus {
    Unused,
    Pending,
    Succeeded,
    Failed,
}

/// Fixed-size slots prevent storage growth during execution or settlement.
#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, PartialEq, Eq)]
pub struct Payment {
    pub status: PaymentStatus,
    pub amount: u128,
    pub accepted_at: u64,
    recipient_bytes: [u8; 64],
    recipient_len: u8,
}

impl Default for Payment {
    fn default() -> Self {
        Self {
            status: PaymentStatus::Unused,
            amount: 0,
            accepted_at: 0,
            recipient_bytes: [0; 64],
            recipient_len: 0,
        }
    }
}

impl Payment {
    pub fn recipient(&self) -> &str {
        // Only validated ASCII AccountIds are written into these private fields.
        std::str::from_utf8(&self.recipient_bytes[..usize::from(self.recipient_len)])
            .expect("ERR_STATE_RECIPIENT")
    }

    fn pending(recipient: &str, amount: u128, now: u64) -> Result<Self> {
        if recipient.len() > 64 {
            return Err("ERR_RECIPIENT");
        }
        let mut payment = Self {
            status: PaymentStatus::Pending,
            amount,
            accepted_at: now,
            recipient_len: recipient.len() as u8,
            ..Self::default()
        };
        payment.recipient_bytes[..recipient.len()].copy_from_slice(recipient.as_bytes());
        Ok(payment)
    }
}

#[derive(Clone, Debug)]
pub struct PolicyInput {
    pub agent: String,
    pub agent_keys: Vec<String>,
    pub recipients: Vec<String>,
    pub budget: u128,
    pub per_transaction: u128,
    pub expires_at: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, PartialEq, Eq)]
pub struct Mandate {
    pub id: u64,
    pub agent: String,
    pub agent_keys: Vec<String>,
    pub recipients: Vec<String>,
    pub budget: u128,
    pub per_transaction: u128,
    pub expires_at: u64,
    pub paused: bool,
    pub revoked: bool,
    pub available: u128,
    pub pending: u128,
    pub spent: u128,
    pub payments: Vec<Payment>,
}

#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, PartialEq, Eq)]
pub struct VaultState {
    pub owner: String,
    pub unallocated: u128,
    pub last_mandate_id: u64,
    pub mandate: Option<Mandate>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TransferOutcome {
    Success,
    Failure,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Settlement {
    Succeeded,
    Failed,
    Duplicate,
}

pub fn checked_add(a: u128, b: u128) -> Result<u128> {
    a.checked_add(b).ok_or("ERR_ARITHMETIC")
}

pub fn checked_sub(a: u128, b: u128) -> Result<u128> {
    a.checked_sub(b).ok_or("ERR_ARITHMETIC")
}

fn zero_deposit(ctx: &Context) -> Result<()> {
    if ctx.deposit != 0 {
        return Err("ERR_DEPOSIT");
    }
    Ok(())
}

fn valid_account(account: &str) -> bool {
    account.parse::<near_account_id::AccountId>().is_ok()
}

fn named_recipient(account: &str) -> bool {
    let implicit = account.len() == 64 && account.bytes().all(|b| b.is_ascii_hexdigit());
    let special = ["0x", "0s", "0u"]
        .iter()
        .any(|prefix| account.starts_with(prefix));
    valid_account(account) && !implicit && !special
}

/// Replace the persisted STATE value length with its prospective serialized length.
/// Headroom additionally covers the STATE key/record on initialization and overhead.
pub fn storage_floor(
    usage: u128,
    persisted: u128,
    prospective: u128,
    byte_cost: u128,
) -> Result<u128> {
    let base = checked_sub(usage, persisted)?;
    let bytes = checked_add(checked_add(base, prospective)?, STORAGE_HEADROOM_BYTES)?;
    let storage = bytes.checked_mul(byte_cost).ok_or("ERR_ARITHMETIC")?;
    checked_add(storage, OPERATING_MARGIN)
}

impl VaultState {
    /// The immutable owner must be the vault's immediate parent, not a caller-chosen stranger.
    pub fn new(owner: String, ctx: &Context) -> Result<Self> {
        zero_deposit(ctx)?;
        if !valid_account(&owner)
            || ctx.current.split_once('.').map(|(_, parent)| parent) != Some(owner.as_str())
            || ctx.predecessor != owner
            || ctx.signer != owner
        {
            return Err("ERR_INITIAL_OWNER");
        }
        Ok(Self {
            owner,
            unallocated: 0,
            last_mandate_id: 0,
            mandate: None,
        })
    }

    fn owner_only(&self, ctx: &Context) -> Result<()> {
        if ctx.predecessor != self.owner || ctx.signer != self.owner {
            return Err("ERR_OWNER");
        }
        Ok(())
    }

    pub fn fund(&mut self, ctx: &Context) -> Result<()> {
        self.owner_only(ctx)?;
        if ctx.deposit == 0 {
            return Err("ERR_AMOUNT_ZERO");
        }
        let unallocated = checked_add(self.unallocated, ctx.deposit)?;
        let available = self.mandate.as_ref().map_or(0, |m| m.available);
        let required = checked_add(ctx.floor, checked_add(unallocated, available)?)?;
        if ctx.balance < required {
            return Err("ERR_LIQUIDITY");
        }
        self.unallocated = unallocated;
        Ok(())
    }

    pub fn configure(&mut self, ctx: &Context, input: PolicyInput) -> Result<u64> {
        self.owner_only(ctx)?;
        zero_deposit(ctx)?;
        if self.mandate.is_some() {
            return Err("ERR_ACTIVE_MANDATE");
        }
        if !valid_account(&input.agent) || input.agent == self.owner || input.agent == ctx.current {
            return Err("ERR_AGENT_CONFIG");
        }
        if input.agent_keys.is_empty()
            || input.agent_keys.len() > MAX_KEYS
            || input.agent_keys.iter().enumerate().any(|(i, key)| {
                !key.starts_with("ed25519:")
                    || key.len() > 52
                    || input.agent_keys[..i].contains(key)
            })
        {
            return Err("ERR_KEY_CONFIG");
        }
        if input.recipients.is_empty()
            || input.recipients.len() > MAX_RECIPIENTS
            || input.recipients.iter().enumerate().any(|(i, recipient)| {
                !named_recipient(recipient)
                    || recipient == &ctx.current
                    || recipient == &input.agent
                    || input.recipients[..i].contains(recipient)
            })
        {
            return Err("ERR_RECIPIENT_CONFIG");
        }
        if input.budget == 0 || input.per_transaction == 0 || input.per_transaction > input.budget {
            return Err("ERR_LIMIT_CONFIG");
        }
        if input.expires_at <= ctx.now {
            return Err("ERR_EXPIRY_CONFIG");
        }
        let unallocated = self
            .unallocated
            .checked_sub(input.budget)
            .ok_or("ERR_UNFUNDED_BUDGET")?;
        let id = self
            .last_mandate_id
            .checked_add(1)
            .ok_or("ERR_ARITHMETIC")?;
        let mandate = Mandate {
            id,
            agent: input.agent,
            agent_keys: input.agent_keys,
            recipients: input.recipients,
            budget: input.budget,
            per_transaction: input.per_transaction,
            expires_at: input.expires_at,
            paused: false,
            revoked: false,
            available: input.budget,
            pending: 0,
            spent: 0,
            payments: vec![Payment::default(); MAX_REQUESTS],
        };
        self.unallocated = unallocated;
        self.last_mandate_id = id;
        self.mandate = Some(mandate);
        Ok(id)
    }

    pub fn pause(&mut self, ctx: &Context) -> Result<()> {
        self.owner_only(ctx)?;
        zero_deposit(ctx)?;
        self.mandate.as_mut().ok_or("ERR_NO_MANDATE")?.paused = true;
        Ok(())
    }

    pub fn resume(&mut self, ctx: &Context) -> Result<()> {
        self.owner_only(ctx)?;
        zero_deposit(ctx)?;
        let m = self.mandate.as_mut().ok_or("ERR_NO_MANDATE")?;
        if m.revoked {
            return Err("ERR_REVOKED");
        }
        if ctx.now >= m.expires_at {
            return Err("ERR_EXPIRED");
        }
        m.paused = false;
        Ok(())
    }

    pub fn revoke(&mut self, ctx: &Context) -> Result<()> {
        self.owner_only(ctx)?;
        zero_deposit(ctx)?;
        self.mandate.as_mut().ok_or("ERR_NO_MANDATE")?.revoked = true;
        Ok(())
    }

    pub fn retire(&mut self, ctx: &Context) -> Result<()> {
        self.owner_only(ctx)?;
        zero_deposit(ctx)?;
        let m = self.mandate.as_ref().ok_or("ERR_NO_MANDATE")?;
        m.check_invariants()?;
        if m.pending != 0 || !(m.revoked || ctx.now >= m.expires_at) {
            return Err("ERR_NOT_RETIRABLE");
        }
        let unallocated = checked_add(self.unallocated, m.available)?;
        self.unallocated = unallocated;
        self.mandate = None;
        Ok(())
    }

    pub fn reserve(
        &mut self,
        ctx: &Context,
        mandate_id: u64,
        nonce: u8,
        recipient: &str,
        amount: u128,
    ) -> Result<()> {
        zero_deposit(ctx)?;
        let m = self.mandate.as_mut().ok_or("ERR_NO_MANDATE")?;
        m.check_invariants()?;
        if m.id != mandate_id {
            return Err("ERR_MANDATE_ID");
        }
        if ctx.predecessor != m.agent || ctx.signer != m.agent {
            return Err("ERR_AGENT");
        }
        if !m.agent_keys.contains(&ctx.signer_key) {
            return Err("ERR_AGENT_KEY");
        }
        if m.revoked {
            return Err("ERR_REVOKED");
        }
        if m.paused {
            return Err("ERR_PAUSED");
        }
        if ctx.now >= m.expires_at {
            return Err("ERR_EXPIRED");
        }
        let payment = m.payments.get(usize::from(nonce)).ok_or("ERR_NONCE")?;
        if payment.status != PaymentStatus::Unused {
            return Err("ERR_NONCE_USED");
        }
        if !m.recipients.iter().any(|r| r == recipient) {
            return Err("ERR_RECIPIENT");
        }
        if amount == 0 {
            return Err("ERR_AMOUNT_ZERO");
        }
        if amount > m.per_transaction {
            return Err("ERR_PER_TX_LIMIT");
        }
        let available = m.available.checked_sub(amount).ok_or("ERR_BUDGET")?;
        let pending = checked_add(m.pending, amount)?;
        if checked_add(m.spent, pending)? > m.budget {
            return Err("ERR_BUDGET");
        }
        if ctx.remaining_gas < MIN_REMAINING_GAS {
            return Err("ERR_GAS");
        }
        // Prior outgoing amounts are already debited by the runtime. Do not subtract P twice.
        let required = checked_add(ctx.floor, checked_add(self.unallocated, amount)?)?;
        if ctx.balance < required {
            return Err("ERR_LIQUIDITY");
        }
        let payment = Payment::pending(recipient, amount, ctx.now)?;
        m.available = available;
        m.pending = pending;
        m.payments[usize::from(nonce)] = payment;
        Ok(())
    }

    pub fn settle(
        &mut self,
        ctx: &Context,
        mandate_id: u64,
        nonce: u8,
        result_count: u64,
        outcome: TransferOutcome,
    ) -> Result<Settlement> {
        zero_deposit(ctx)?;
        if ctx.predecessor != ctx.current {
            return Err("ERR_PRIVATE");
        }
        if result_count != 1 {
            return Err("ERR_RESULT_COUNT");
        }
        let m = self.mandate.as_mut().ok_or("ERR_NO_MANDATE")?;
        m.check_invariants()?;
        if m.id != mandate_id {
            return Err("ERR_MANDATE_ID");
        }
        let payment = m.payments.get(usize::from(nonce)).ok_or("ERR_NONCE")?;
        match payment.status {
            PaymentStatus::Unused => return Err("ERR_NOT_PENDING"),
            PaymentStatus::Succeeded | PaymentStatus::Failed => return Ok(Settlement::Duplicate),
            PaymentStatus::Pending => {}
        }
        let amount = payment.amount;
        let pending = checked_sub(m.pending, amount)?;
        let (available, spent, status, settled) = match outcome {
            TransferOutcome::Success => (
                m.available,
                checked_add(m.spent, amount)?,
                PaymentStatus::Succeeded,
                Settlement::Succeeded,
            ),
            TransferOutcome::Failure => (
                checked_add(m.available, amount)?,
                m.spent,
                PaymentStatus::Failed,
                Settlement::Failed,
            ),
        };
        if checked_add(checked_add(available, pending)?, spent)? != m.budget {
            return Err("ERR_ACCOUNTING");
        }
        m.available = available;
        m.pending = pending;
        m.spent = spent;
        m.payments[usize::from(nonce)].status = status;
        Ok(settled)
    }
}

impl Mandate {
    pub fn check_invariants(&self) -> Result<()> {
        if self.payments.len() != MAX_REQUESTS
            || checked_add(checked_add(self.available, self.pending)?, self.spent)? != self.budget
            || checked_add(self.pending, self.spent)? > self.budget
        {
            return Err("ERR_ACCOUNTING");
        }
        let mut pending = 0;
        let mut spent = 0;
        for payment in &self.payments {
            match payment.status {
                PaymentStatus::Pending => pending = checked_add(pending, payment.amount)?,
                PaymentStatus::Succeeded => spent = checked_add(spent, payment.amount)?,
                PaymentStatus::Unused | PaymentStatus::Failed => {}
            }
        }
        if pending != self.pending || spent != self.spent {
            return Err("ERR_ACCOUNTING");
        }
        Ok(())
    }
}
