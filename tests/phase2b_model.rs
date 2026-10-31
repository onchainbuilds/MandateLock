//! Phase 2B transition evidence, not runtime/receipt-delivery evidence.
use mandatelock::model::*;

const N: u128 = 1_000_000_000_000_000_000_000_000;
const OWNER: &str = "owner.sandbox";
const VAULT: &str = "vault.owner.sandbox";
const AGENT: &str = "agent.sandbox";
const RECIPIENT: &str = "merchant.sandbox";
const KEY: &str = "ed25519:11111111111111111111111111111111";

fn ctx(actor: &str) -> Context {
    Context {
        current: VAULT.into(),
        predecessor: actor.into(),
        signer: actor.into(),
        signer_key: KEY.into(),
        now: 100,
        deposit: 0,
        balance: 100 * N,
        floor: N,
        remaining_gas: MIN_REMAINING_GAS,
    }
}

fn fixture() -> VaultState {
    let mut v = VaultState::new(OWNER.into(), &ctx(OWNER)).unwrap();
    let mut funding = ctx(OWNER);
    funding.deposit = 2 * N;
    v.fund(&funding).unwrap();
    v.configure(
        &ctx(OWNER),
        PolicyInput {
            agent: AGENT.into(),
            agent_keys: vec![KEY.into()],
            recipients: vec![RECIPIENT.into()],
            budget: N,
            per_transaction: N * 4 / 10,
            expires_at: 1000,
        },
    )
    .unwrap();
    v
}

fn ledger(v: &VaultState, a: u128, p: u128, s: u128) {
    let m = v.mandate.as_ref().unwrap();
    m.check_invariants().unwrap();
    assert_eq!((m.available, m.pending, m.spent), (a, p, s));
}

#[test]
fn missing_result_never_releases_budget_even_after_expiry_and_revoke() {
    let mut v = fixture();
    v.reserve(&ctx(AGENT), 1, 0, RECIPIENT, N * 4 / 10).unwrap();
    // Both a paid recipient and a refunded failed transfer are possible. Neither
    // balance observation establishes which promise completed for this slot.
    for physical in [N * 26 / 10, N * 3] {
        let mut unknown = v.clone();
        let mut owner = ctx(OWNER);
        owner.now = u64::MAX;
        owner.balance = physical;
        unknown.revoke(&owner).unwrap();
        let frozen = unknown.clone();
        assert_eq!(unknown.retire(&owner), Err("ERR_NOT_RETIRABLE"));
        assert_eq!(unknown, frozen);
        ledger(&unknown, N * 6 / 10, N * 4 / 10, 0);
        assert_eq!(
            unknown.mandate.as_ref().unwrap().payments[0].status,
            PaymentStatus::Pending
        );
    }
}

#[test]
fn delayed_success_or_failure_still_settles_after_revocation_and_expiry() {
    for outcome in [TransferOutcome::Success, TransferOutcome::Failure] {
        let mut v = fixture();
        v.reserve(&ctx(AGENT), 1, 0, RECIPIENT, N / 10).unwrap();
        v.revoke(&ctx(OWNER)).unwrap();
        let mut callback = ctx(VAULT);
        callback.now = u64::MAX;
        v.settle(&callback, 1, 0, 1, outcome).unwrap();
        let spent = if outcome == TransferOutcome::Success {
            N / 10
        } else {
            0
        };
        ledger(&v, N - spent, 0, spent);
        v.retire(&ctx(OWNER)).unwrap();
        assert_eq!(v.unallocated, 2 * N - spent);
    }
}

#[test]
fn opposite_duplicate_results_cannot_reverse_terminal_settlement() {
    for first in [TransferOutcome::Success, TransferOutcome::Failure] {
        let mut v = fixture();
        v.reserve(&ctx(AGENT), 1, 0, RECIPIENT, N / 10).unwrap();
        v.settle(&ctx(VAULT), 1, 0, 1, first).unwrap();
        v.revoke(&ctx(OWNER)).unwrap();
        let terminal = v.clone();
        for repeated in [TransferOutcome::Failure, TransferOutcome::Success, first] {
            assert_eq!(
                v.settle(&ctx(VAULT), 1, 0, 1, repeated),
                Ok(Settlement::Duplicate)
            );
            assert_eq!(v, terminal);
        }
    }
}

#[test]
fn callback_before_refund_cannot_spend_storage_or_unallocated_principal() {
    let mut v = fixture();
    let mut agent = ctx(AGENT);
    agent.balance = agent.floor + v.unallocated + N;
    for nonce in 0..3 {
        let amount = if nonce == 2 { N / 5 } else { N * 4 / 10 };
        v.reserve(&agent, 1, nonce, RECIPIENT, amount).unwrap();
        agent.balance -= amount; // Outgoing principal debited, refund still in flight.
    }
    v.settle(&ctx(VAULT), 1, 0, 1, TransferOutcome::Failure)
        .unwrap();
    ledger(&v, N * 4 / 10, N * 6 / 10, 0);
    let before = v.clone();
    assert_eq!(v.reserve(&agent, 1, 3, RECIPIENT, 1), Err("ERR_LIQUIDITY"));
    assert_eq!(v, before);
    agent.balance += N * 4 / 10; // Now the principal refund actually arrives.
    v.reserve(&agent, 1, 3, RECIPIENT, N * 4 / 10).unwrap();
    agent.balance -= N * 4 / 10;
    assert_eq!(agent.balance, agent.floor + v.unallocated);
    ledger(&v, 0, N, 0);
}

#[test]
fn refund_before_callback_does_not_create_available_budget() {
    let mut v = fixture();
    for (nonce, amount) in [(0, N * 4 / 10), (1, N * 4 / 10), (2, N / 5)] {
        v.reserve(&ctx(AGENT), 1, nonce, RECIPIENT, amount).unwrap();
    }
    let before = v.clone();
    // Physical balance is ample but all budget remains committed.
    assert_eq!(
        v.reserve(&ctx(AGENT), 1, 3, RECIPIENT, 1),
        Err("ERR_BUDGET")
    );
    assert_eq!(v, before);
    v.settle(&ctx(VAULT), 1, 0, 1, TransferOutcome::Failure)
        .unwrap();
    v.reserve(&ctx(AGENT), 1, 3, RECIPIENT, N * 4 / 10).unwrap();
    ledger(&v, 0, N, 0);
}

#[test]
fn all_sixty_four_slots_settle_in_reverse_order_without_storage_growth() {
    let mut v = fixture();
    let initial_bytes = borsh::to_vec(&v).unwrap().len();
    for nonce in 0..64 {
        v.reserve(&ctx(AGENT), 1, nonce, RECIPIENT, N / 100)
            .unwrap();
    }
    for nonce in (0..64).rev() {
        let outcome = if nonce % 2 == 0 {
            TransferOutcome::Success
        } else {
            TransferOutcome::Failure
        };
        v.settle(&ctx(VAULT), 1, nonce, 1, outcome).unwrap();
        v.mandate.as_ref().unwrap().check_invariants().unwrap();
        assert_eq!(borsh::to_vec(&v).unwrap().len(), initial_bytes);
    }
    ledger(&v, N * 68 / 100, 0, N * 32 / 100);
}

#[test]
fn stale_callback_cannot_target_reused_nonce_in_new_mandate() {
    let mut v = fixture();
    v.reserve(&ctx(AGENT), 1, 0, RECIPIENT, N / 10).unwrap();
    v.settle(&ctx(VAULT), 1, 0, 1, TransferOutcome::Failure)
        .unwrap();
    let old = v.mandate.as_ref().unwrap().clone();
    v.revoke(&ctx(OWNER)).unwrap();
    v.retire(&ctx(OWNER)).unwrap();
    assert_eq!(
        v.configure(
            &ctx(OWNER),
            PolicyInput {
                agent: old.agent,
                agent_keys: old.agent_keys,
                recipients: old.recipients,
                budget: N,
                per_transaction: N * 4 / 10,
                expires_at: 1000,
            }
        ),
        Ok(2)
    );
    v.reserve(&ctx(AGENT), 2, 0, RECIPIENT, N / 10).unwrap();
    let before = v.clone();
    assert_eq!(
        v.settle(&ctx(VAULT), 1, 0, 1, TransferOutcome::Success),
        Err("ERR_MANDATE_ID")
    );
    assert_eq!(v, before);
}

#[test]
fn invalid_result_count_cannot_release_a_pending_reservation() {
    let mut v = fixture();
    v.reserve(&ctx(AGENT), 1, 0, RECIPIENT, N / 10).unwrap();
    let before = v.clone();
    for count in [0, 2, u64::MAX] {
        assert_eq!(
            v.settle(&ctx(VAULT), 1, 0, count, TransferOutcome::Failure),
            Err("ERR_RESULT_COUNT")
        );
        assert_eq!(v, before);
    }
}
