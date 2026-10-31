use crate::model::*;

const NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const OWNER: &str = "owner.testnet";
const VAULT: &str = "vault.owner.testnet";
const AGENT: &str = "agent.testnet";
const RECIPIENT: &str = "merchant.testnet";
const KEY: &str = "ed25519:11111111111111111111111111111111";

fn context(actor: &str) -> Context {
    Context {
        current: VAULT.into(),
        predecessor: actor.into(),
        signer: actor.into(),
        signer_key: KEY.into(),
        now: 100,
        deposit: 0,
        balance: 100 * NEAR,
        floor: NEAR,
        remaining_gas: 100_000_000_000_000,
    }
}

fn policy() -> PolicyInput {
    PolicyInput {
        agent: AGENT.into(),
        agent_keys: vec![KEY.into()],
        recipients: vec![RECIPIENT.into()],
        budget: NEAR,
        per_transaction: 4 * NEAR / 10,
        expires_at: 1000,
    }
}

fn funded() -> VaultState {
    let mut vault = VaultState::new(OWNER.into(), &context(OWNER)).unwrap();
    let mut ctx = context(OWNER);
    ctx.deposit = NEAR;
    vault.fund(&ctx).unwrap();
    vault
}

fn fixture() -> VaultState {
    let mut vault = funded();
    assert_eq!(vault.configure(&context(OWNER), policy()), Ok(1));
    vault
}

fn accounting(v: &VaultState) -> (u128, u128, u128) {
    let m = v.mandate.as_ref().unwrap();
    m.check_invariants().unwrap();
    (m.available, m.pending, m.spent)
}

fn reserve(v: &mut VaultState, nonce: u8, amount: u128) -> Result<()> {
    v.reserve(&context(AGENT), 1, nonce, RECIPIENT, amount)
}

fn settle(v: &mut VaultState, nonce: u8, outcome: TransferOutcome) -> Result<Settlement> {
    v.settle(&context(VAULT), 1, nonce, 1, outcome)
}

fn rejects_unchanged<T: std::fmt::Debug>(
    v: &mut VaultState,
    error: &str,
    action: impl FnOnce(&mut VaultState) -> Result<T>,
) {
    let before = v.clone();
    assert_eq!(action(v).unwrap_err(), error);
    assert_eq!(*v, before);
}

#[test]
fn authorized_payment_reserves_before_settlement() {
    let mut v = fixture();
    reserve(&mut v, 0, NEAR / 10).unwrap();
    assert_eq!(accounting(&v), (9 * NEAR / 10, NEAR / 10, 0));
    let p = &v.mandate.as_ref().unwrap().payments[0];
    assert_eq!(p.status, PaymentStatus::Pending);
    assert_eq!(p.recipient(), RECIPIENT);
    assert_eq!(p.amount, NEAR / 10);
    assert_eq!(p.accepted_at, 100);
}

#[test]
fn unauthorized_recipient_is_rejected_directly() {
    rejects_unchanged(&mut fixture(), "ERR_RECIPIENT", |v| {
        v.reserve(&context(AGENT), 1, 0, "attacker.testnet", NEAR / 10)
    });
}

#[test]
fn above_transaction_ceiling_is_rejected() {
    rejects_unchanged(&mut fixture(), "ERR_PER_TX_LIMIT", |v| {
        reserve(v, 0, 4 * NEAR / 10 + 1)
    });
}

#[test]
fn exact_ceiling_and_one_yocto_are_accepted() {
    let mut v = fixture();
    reserve(&mut v, 0, 4 * NEAR / 10).unwrap();
    reserve(&mut v, 1, 1).unwrap();
    assert_eq!(accounting(&v), (6 * NEAR / 10 - 1, 4 * NEAR / 10 + 1, 0));
}

#[test]
fn zero_amount_is_rejected() {
    rejects_unchanged(&mut fixture(), "ERR_AMOUNT_ZERO", |v| reserve(v, 0, 0));
}

#[test]
fn three_point_four_requests_cannot_all_reserve() {
    let mut v = fixture();
    reserve(&mut v, 0, 4 * NEAR / 10).unwrap();
    reserve(&mut v, 1, 4 * NEAR / 10).unwrap();
    rejects_unchanged(&mut v, "ERR_BUDGET", |v| reserve(v, 2, 4 * NEAR / 10));
    assert_eq!(accounting(&v), (NEAR / 5, 4 * NEAR / 5, 0));
    assert_eq!(v.mandate.unwrap().payments[2].status, PaymentStatus::Unused);
}

#[test]
fn completed_plus_pending_consumes_budget() {
    let mut v = fixture();
    reserve(&mut v, 0, 4 * NEAR / 10).unwrap();
    settle(&mut v, 0, TransferOutcome::Success).unwrap();
    reserve(&mut v, 1, 4 * NEAR / 10).unwrap();
    rejects_unchanged(&mut v, "ERR_BUDGET", |v| reserve(v, 2, NEAR / 5 + 1));
    assert_eq!(accounting(&v), (NEAR / 5, 2 * NEAR / 5, 2 * NEAR / 5));
}

#[test]
fn exact_budget_then_one_yocto_exhaustion() {
    let mut v = fixture();
    for (nonce, amount) in [(0, 4 * NEAR / 10), (1, 4 * NEAR / 10), (2, NEAR / 5)] {
        reserve(&mut v, nonce, amount).unwrap();
        settle(&mut v, nonce, TransferOutcome::Success).unwrap();
    }
    assert_eq!(accounting(&v), (0, 0, NEAR));
    rejects_unchanged(&mut v, "ERR_BUDGET", |v| reserve(v, 3, 1));
}

#[test]
fn expiry_checks_chain_time_at_acceptance_boundary() {
    for (now, allowed) in [(999, true), (1000, false), (1001, false)] {
        let mut v = fixture();
        let mut ctx = context(AGENT);
        ctx.now = now;
        if allowed {
            v.reserve(&ctx, 1, 0, RECIPIENT, 1).unwrap();
        } else {
            rejects_unchanged(&mut v, "ERR_EXPIRED", |v| {
                v.reserve(&ctx, 1, 0, RECIPIENT, 1)
            });
        }
    }
}

#[test]
fn replay_rejected_pending_success_and_failure() {
    for outcome in [
        None,
        Some(TransferOutcome::Success),
        Some(TransferOutcome::Failure),
    ] {
        let mut v = fixture();
        reserve(&mut v, 0, NEAR / 10).unwrap();
        if let Some(outcome) = outcome {
            settle(&mut v, 0, outcome).unwrap();
        }
        rejects_unchanged(&mut v, "ERR_NONCE_USED", |v| reserve(v, 0, NEAR / 5));
    }
}

#[test]
fn wrong_agent_and_forwarded_signer_are_rejected() {
    for (predecessor, signer) in [
        ("attacker.testnet", "attacker.testnet"),
        ("proxy.testnet", AGENT),
        (AGENT, "attacker.testnet"),
    ] {
        let mut ctx = context(predecessor);
        ctx.signer = signer.into();
        rejects_unchanged(&mut fixture(), "ERR_AGENT", |v| {
            v.reserve(&ctx, 1, 0, RECIPIENT, 1)
        });
    }
}

#[test]
fn unapproved_agent_key_is_rejected() {
    let mut ctx = context(AGENT);
    ctx.signer_key = "ed25519:other".into();
    rejects_unchanged(&mut fixture(), "ERR_AGENT_KEY", |v| {
        v.reserve(&ctx, 1, 0, RECIPIENT, 1)
    });
}

#[test]
fn all_administrative_methods_require_owner() {
    let ctx = context(AGENT);
    rejects_unchanged(&mut fixture(), "ERR_OWNER", |v| v.fund(&ctx));
    rejects_unchanged(&mut fixture(), "ERR_OWNER", |v| v.configure(&ctx, policy()));
    rejects_unchanged(&mut fixture(), "ERR_OWNER", |v| v.pause(&ctx));
    rejects_unchanged(&mut fixture(), "ERR_OWNER", |v| v.resume(&ctx));
    rejects_unchanged(&mut fixture(), "ERR_OWNER", |v| v.revoke(&ctx));
    rejects_unchanged(&mut fixture(), "ERR_OWNER", |v| v.retire(&ctx));
}

#[test]
fn owner_proxy_is_not_administrative_authority() {
    let mut ctx = context("proxy.testnet");
    ctx.signer = OWNER.into();
    rejects_unchanged(&mut fixture(), "ERR_OWNER", |v| v.revoke(&ctx));
}

#[test]
fn revoked_mandate_blocks_new_but_settles_pending() {
    let mut v = fixture();
    reserve(&mut v, 0, NEAR / 10).unwrap();
    v.revoke(&context(OWNER)).unwrap();
    rejects_unchanged(&mut v, "ERR_REVOKED", |v| reserve(v, 1, NEAR / 10));
    rejects_unchanged(&mut v, "ERR_REVOKED", |v| v.resume(&context(OWNER)));
    settle(&mut v, 0, TransferOutcome::Success).unwrap();
    assert_eq!(accounting(&v), (9 * NEAR / 10, 0, NEAR / 10));
}

#[test]
fn pause_and_resume_preserve_original_budget() {
    let mut v = fixture();
    reserve(&mut v, 0, 1).unwrap();
    v.pause(&context(OWNER)).unwrap();
    rejects_unchanged(&mut v, "ERR_PAUSED", |v| reserve(v, 1, 1));
    v.resume(&context(OWNER)).unwrap();
    reserve(&mut v, 1, 1).unwrap();
    assert_eq!(accounting(&v), (NEAR - 2, 2, 0));
}

#[test]
fn confirmed_success_moves_reservation_to_spent() {
    let mut v = fixture();
    reserve(&mut v, 0, NEAR / 10).unwrap();
    assert_eq!(
        settle(&mut v, 0, TransferOutcome::Success),
        Ok(Settlement::Succeeded)
    );
    assert_eq!(accounting(&v), (9 * NEAR / 10, 0, NEAR / 10));
    assert_eq!(
        v.mandate.unwrap().payments[0].status,
        PaymentStatus::Succeeded
    );
}

#[test]
fn confirmed_failure_restores_budget_but_consumes_nonce() {
    let mut v = fixture();
    reserve(&mut v, 0, NEAR / 10).unwrap();
    assert_eq!(
        settle(&mut v, 0, TransferOutcome::Failure),
        Ok(Settlement::Failed)
    );
    assert_eq!(accounting(&v), (NEAR, 0, 0));
    assert_eq!(
        v.mandate.as_ref().unwrap().payments[0].status,
        PaymentStatus::Failed
    );
    rejects_unchanged(&mut v, "ERR_NONCE_USED", |v| reserve(v, 0, 1));
    reserve(&mut v, 1, NEAR / 10).unwrap();
}

#[test]
fn duplicate_callbacks_cannot_credit_or_debit_again() {
    for first in [TransferOutcome::Success, TransferOutcome::Failure] {
        let mut v = fixture();
        reserve(&mut v, 0, NEAR / 10).unwrap();
        settle(&mut v, 0, first).unwrap();
        let before = v.clone();
        for forged_repeat in [TransferOutcome::Success, TransferOutcome::Failure] {
            assert_eq!(settle(&mut v, 0, forged_repeat), Ok(Settlement::Duplicate));
            assert_eq!(v, before);
        }
    }
}

#[test]
fn unauthorized_callback_cannot_change_pending_state() {
    let mut v = fixture();
    reserve(&mut v, 0, NEAR / 10).unwrap();
    for actor in [AGENT, OWNER, "malicious-contract.testnet"] {
        rejects_unchanged(&mut v, "ERR_PRIVATE", |v| {
            v.settle(&context(actor), 1, 0, 1, TransferOutcome::Failure)
        });
    }
}

#[test]
fn callbacks_require_exactly_one_result_and_pending_record() {
    let mut v = fixture();
    reserve(&mut v, 0, NEAR / 10).unwrap();
    for count in [0, 2, u64::MAX] {
        rejects_unchanged(&mut v, "ERR_RESULT_COUNT", |v| {
            v.settle(&context(VAULT), 1, 0, count, TransferOutcome::Failure)
        });
    }
    rejects_unchanged(&mut v, "ERR_NOT_PENDING", |v| {
        settle(v, 1, TransferOutcome::Failure)
    });
}

#[test]
fn delayed_or_missing_callback_never_releases_on_expiry() {
    let mut v = fixture();
    reserve(&mut v, 0, NEAR / 10).unwrap();
    let mut owner = context(OWNER);
    owner.now = u64::MAX;
    v.revoke(&owner).unwrap();
    rejects_unchanged(&mut v, "ERR_NOT_RETIRABLE", |v| v.retire(&owner));
    assert_eq!(accounting(&v), (9 * NEAR / 10, NEAR / 10, 0));
    let mut callback = context(VAULT);
    callback.now = u64::MAX;
    v.settle(&callback, 1, 0, 1, TransferOutcome::Success)
        .unwrap();
    assert_eq!(accounting(&v), (9 * NEAR / 10, 0, NEAR / 10));
}

#[test]
fn refund_not_liquid_yet_cannot_bypass_physical_balance_floor() {
    let mut v = fixture();
    reserve(&mut v, 0, 4 * NEAR / 10).unwrap();
    reserve(&mut v, 1, 4 * NEAR / 10).unwrap();
    reserve(&mut v, 2, NEAR / 5).unwrap();
    settle(&mut v, 0, TransferOutcome::Failure).unwrap();
    let mut ctx = context(AGENT);
    ctx.balance = ctx.floor; // Refund deliberately not yet liquid in this context.
    rejects_unchanged(&mut v, "ERR_LIQUIDITY", |v| {
        v.reserve(&ctx, 1, 3, RECIPIENT, 4 * NEAR / 10)
    });
    assert_eq!(accounting(&v), (4 * NEAR / 10, 6 * NEAR / 10, 0));
}

#[test]
fn liquidity_and_remaining_gas_exact_boundaries() {
    for allowed in [true, false] {
        let mut v = fixture();
        let mut ctx = context(AGENT);
        ctx.balance = ctx.floor + 1 - u128::from(!allowed);
        if allowed {
            v.reserve(&ctx, 1, 0, RECIPIENT, 1).unwrap();
        } else {
            rejects_unchanged(&mut v, "ERR_LIQUIDITY", |v| {
                v.reserve(&ctx, 1, 0, RECIPIENT, 1)
            });
        }
        let mut v = fixture();
        ctx = context(AGENT);
        ctx.remaining_gas = MIN_REMAINING_GAS - u64::from(!allowed);
        if allowed {
            v.reserve(&ctx, 1, 0, RECIPIENT, 1).unwrap();
        } else {
            rejects_unchanged(&mut v, "ERR_GAS", |v| v.reserve(&ctx, 1, 0, RECIPIENT, 1));
        }
    }
}

#[test]
fn extra_physical_funds_do_not_raise_mandate_budget() {
    let mut v = fixture();
    let mut ctx = context(AGENT);
    ctx.balance = 1000 * NEAR;
    for nonce in 0..2 {
        v.reserve(&ctx, 1, nonce, RECIPIENT, 4 * NEAR / 10).unwrap();
    }
    rejects_unchanged(&mut v, "ERR_BUDGET", |v| {
        v.reserve(&ctx, 1, 2, RECIPIENT, 4 * NEAR / 10)
    });
    assert_eq!(v.mandate.as_ref().unwrap().budget, NEAR);
}

#[test]
fn nonce_bound_and_failed_slot_capacity_are_bounded() {
    let mut v = fixture();
    for nonce in 0..64 {
        reserve(&mut v, nonce, 1).unwrap();
        settle(&mut v, nonce, TransferOutcome::Failure).unwrap();
    }
    assert_eq!(accounting(&v), (NEAR, 0, 0));
    for nonce in [64, 255] {
        rejects_unchanged(&mut v, "ERR_NONCE", |v| reserve(v, nonce, 1));
    }
    rejects_unchanged(&mut v, "ERR_NONCE_USED", |v| reserve(v, 0, 1));
}

#[test]
fn fixed_slot_serialization_does_not_grow_after_acceptance_or_settlement() {
    let mut v = fixture();
    let initial = borsh::to_vec(&v).unwrap().len();
    reserve(&mut v, 0, NEAR / 10).unwrap();
    assert_eq!(borsh::to_vec(&v).unwrap().len(), initial);
    settle(&mut v, 0, TransferOutcome::Failure).unwrap();
    assert_eq!(borsh::to_vec(&v).unwrap().len(), initial);
    let roundtrip: VaultState = borsh::from_slice(&borsh::to_vec(&v).unwrap()).unwrap();
    assert_eq!(v, roundtrip);
}

#[test]
fn retired_mandate_ids_cannot_be_replayed_or_reset() {
    let mut v = fixture();
    reserve(&mut v, 0, NEAR / 10).unwrap();
    settle(&mut v, 0, TransferOutcome::Success).unwrap();
    v.revoke(&context(OWNER)).unwrap();
    v.retire(&context(OWNER)).unwrap();
    assert_eq!(v.unallocated, 9 * NEAR / 10);
    let mut p = policy();
    p.budget = 9 * NEAR / 10;
    assert_eq!(v.configure(&context(OWNER), p), Ok(2));
    rejects_unchanged(&mut v, "ERR_MANDATE_ID", |v| reserve(v, 1, 1));
    rejects_unchanged(&mut v, "ERR_MANDATE_ID", |v| {
        settle(v, 0, TransferOutcome::Failure)
    });
    assert_eq!(accounting(&v), (9 * NEAR / 10, 0, 0));
}

#[test]
fn active_or_pending_mandate_cannot_be_replaced() {
    let mut v = fixture();
    rejects_unchanged(&mut v, "ERR_ACTIVE_MANDATE", |v| {
        v.configure(&context(OWNER), policy())
    });
    rejects_unchanged(&mut v, "ERR_NOT_RETIRABLE", |v| v.retire(&context(OWNER)));
    reserve(&mut v, 0, 1).unwrap();
    v.revoke(&context(OWNER)).unwrap();
    rejects_unchanged(&mut v, "ERR_NOT_RETIRABLE", |v| v.retire(&context(OWNER)));
}

#[test]
fn configuration_rejects_invalid_limits_and_unfunded_budget() {
    for (budget, limit, error) in [
        (0, 1, "ERR_LIMIT_CONFIG"),
        (NEAR, 0, "ERR_LIMIT_CONFIG"),
        (NEAR, NEAR + 1, "ERR_LIMIT_CONFIG"),
        (NEAR + 1, 1, "ERR_UNFUNDED_BUDGET"),
    ] {
        let mut p = policy();
        p.budget = budget;
        p.per_transaction = limit;
        rejects_unchanged(&mut funded(), error, |v| v.configure(&context(OWNER), p));
    }
}

#[test]
fn configuration_rejects_recipient_bounds_aliases_and_duplicates() {
    for recipients in [
        vec![],
        vec![RECIPIENT.into(); 2],
        vec![RECIPIENT.into(); 9],
        vec![AGENT.into()],
        vec![VAULT.into()],
        vec!["a".repeat(64)],
        vec!["0x1234567890123456789012345678901234567890".into()],
        vec!["INVALID!".into()],
    ] {
        let mut p = policy();
        p.recipients = recipients;
        rejects_unchanged(&mut funded(), "ERR_RECIPIENT_CONFIG", |v| {
            v.configure(&context(OWNER), p)
        });
    }
}

#[test]
fn configuration_rejects_agent_keys_expiry_and_equal_identities() {
    for agent in [OWNER, VAULT, "INVALID!"] {
        let mut p = policy();
        p.agent = agent.into();
        rejects_unchanged(&mut funded(), "ERR_AGENT_CONFIG", |v| {
            v.configure(&context(OWNER), p)
        });
    }
    for keys in [
        vec![],
        vec![KEY.into(); 2],
        vec![KEY.into(); 4],
        vec!["secp256k1:key".into()],
    ] {
        let mut p = policy();
        p.agent_keys = keys;
        rejects_unchanged(&mut funded(), "ERR_KEY_CONFIG", |v| {
            v.configure(&context(OWNER), p)
        });
    }
    for expiry in [0, 100] {
        let mut p = policy();
        p.expires_at = expiry;
        rejects_unchanged(&mut funded(), "ERR_EXPIRY_CONFIG", |v| {
            v.configure(&context(OWNER), p)
        });
    }
}

#[test]
fn initialization_rejects_stranger_claims_and_wrong_parent() {
    assert!(VaultState::new(OWNER.into(), &context(OWNER)).is_ok());
    for (owner, actor) in [
        ("attacker.testnet", "attacker.testnet"),
        (OWNER, "attacker.testnet"),
        (VAULT, VAULT),
    ] {
        assert_eq!(
            VaultState::new(owner.into(), &context(actor)),
            Err("ERR_INITIAL_OWNER")
        );
    }
}

#[test]
fn deposits_are_rejected_except_explicit_owner_funding() {
    let mut agent = context(AGENT);
    agent.deposit = 1;
    rejects_unchanged(&mut fixture(), "ERR_DEPOSIT", |v| {
        v.reserve(&agent, 1, 0, RECIPIENT, 1)
    });
    let mut owner = context(OWNER);
    owner.deposit = 1;
    rejects_unchanged(&mut fixture(), "ERR_DEPOSIT", |v| v.pause(&owner));
    rejects_unchanged(&mut funded(), "ERR_DEPOSIT", |v| {
        v.configure(&owner, policy())
    });
    let mut callback = context(VAULT);
    callback.deposit = 1;
    rejects_unchanged(&mut fixture(), "ERR_DEPOSIT", |v| {
        v.settle(&callback, 1, 0, 1, TransferOutcome::Failure)
    });
}

#[test]
fn funding_preserves_allocated_budget_and_protects_backing() {
    let mut v = fixture();
    let mut ctx = context(OWNER);
    rejects_unchanged(&mut v, "ERR_AMOUNT_ZERO", |v| v.fund(&ctx));
    ctx.deposit = NEAR;
    ctx.balance = ctx.floor + NEAR;
    rejects_unchanged(&mut v, "ERR_LIQUIDITY", |v| v.fund(&ctx));
    ctx.balance += NEAR;
    v.fund(&ctx).unwrap();
    assert_eq!(v.unallocated, NEAR);
    assert_eq!(accounting(&v), (NEAR, 0, 0));
    let mut agent = context(AGENT);
    agent.balance = agent.floor + NEAR; // Must also protect unallocated principal.
    rejects_unchanged(&mut v, "ERR_LIQUIDITY", |v| {
        v.reserve(&agent, 1, 0, RECIPIENT, 1)
    });
}

#[test]
fn checked_arithmetic_never_wraps() {
    assert_eq!(checked_add(u128::MAX, 1), Err("ERR_ARITHMETIC"));
    assert_eq!(checked_sub(0, 1), Err("ERR_ARITHMETIC"));
    assert_eq!(checked_add(u128::MAX - 1, 1), Ok(u128::MAX));
    assert_eq!(checked_sub(u128::MAX, u128::MAX), Ok(0));
    let mut v = funded();
    v.unallocated = u128::MAX;
    let mut ctx = context(OWNER);
    ctx.deposit = 1;
    rejects_unchanged(&mut v, "ERR_ARITHMETIC", |v| v.fund(&ctx));
    let mut v = funded();
    v.last_mandate_id = u64::MAX;
    rejects_unchanged(&mut v, "ERR_ARITHMETIC", |v| {
        v.configure(&context(OWNER), policy())
    });
}

#[test]
fn corrupted_accounting_fails_closed_before_transfer_or_release() {
    let mut v = fixture();
    reserve(&mut v, 0, 1).unwrap();
    v.mandate.as_mut().unwrap().pending = 0;
    rejects_unchanged(&mut v, "ERR_ACCOUNTING", |v| reserve(v, 1, 1));
    rejects_unchanged(&mut v, "ERR_ACCOUNTING", |v| {
        settle(v, 0, TransferOutcome::Failure)
    });
    v.mandate.as_mut().unwrap().available = u128::MAX;
    v.mandate.as_mut().unwrap().pending = 1;
    rejects_unchanged(&mut v, "ERR_ARITHMETIC", |v| reserve(v, 1, 1));
}

#[test]
fn all_competing_request_orders_and_settlement_orders_preserve_invariants() {
    let permutations = [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
    ];
    for order in permutations {
        for reverse in [false, true] {
            for outcomes in 0..4 {
                let mut v = fixture();
                for nonce in order[..2].iter().copied() {
                    reserve(&mut v, nonce, 4 * NEAR / 10).unwrap();
                    accounting(&v);
                }
                assert_eq!(reserve(&mut v, order[2], 4 * NEAR / 10), Err("ERR_BUDGET"));
                let mut accepted = [order[0], order[1]];
                if reverse {
                    accepted.reverse();
                }
                let mut successful = 0;
                for (i, nonce) in accepted.into_iter().enumerate() {
                    let outcome = if outcomes & (1 << i) == 0 {
                        TransferOutcome::Failure
                    } else {
                        successful += 4 * NEAR / 10;
                        TransferOutcome::Success
                    };
                    settle(&mut v, nonce, outcome).unwrap();
                    accounting(&v);
                }
                assert_eq!(accounting(&v), (NEAR - successful, 0, successful));
            }
        }
    }
}

#[test]
fn projected_storage_floor_is_stable_across_state_commit() {
    // The code/account baseline remains 10,000 bytes; STATE grows 100 -> 8,000.
    let before_commit = storage_floor(10_100, 100, 8_000, 10).unwrap();
    let after_commit = storage_floor(18_000, 8_000, 8_000, 10).unwrap();
    assert_eq!(before_commit, after_commit);
    assert_eq!(
        before_commit,
        (18_000 + STORAGE_HEADROOM_BYTES) * 10 + OPERATING_MARGIN
    );
    assert_eq!(storage_floor(0, 1, 0, 1), Err("ERR_ARITHMETIC"));
    assert_eq!(storage_floor(u128::MAX, 0, 1, 1), Err("ERR_ARITHMETIC"));
    assert_eq!(storage_floor(100, 0, 0, u128::MAX), Err("ERR_ARITHMETIC"));
}

#[test]
fn maximum_u128_budget_transitions_without_wrapping() {
    for outcome in [TransferOutcome::Success, TransferOutcome::Failure] {
        let mut owner = context(OWNER);
        owner.floor = 0;
        owner.balance = u128::MAX;
        owner.deposit = u128::MAX;
        let mut v = VaultState::new(OWNER.into(), &context(OWNER)).unwrap();
        v.fund(&owner).unwrap();
        owner.deposit = 0;
        let mut p = policy();
        p.budget = u128::MAX;
        p.per_transaction = u128::MAX;
        v.configure(&owner, p).unwrap();
        let mut agent = context(AGENT);
        agent.floor = 0;
        agent.balance = u128::MAX;
        v.reserve(&agent, 1, 0, RECIPIENT, u128::MAX).unwrap();
        assert_eq!(accounting(&v), (0, u128::MAX, 0));
        settle(&mut v, 0, outcome).unwrap();
        let expected = if outcome == TransferOutcome::Success {
            (0, 0, u128::MAX)
        } else {
            (u128::MAX, 0, 0)
        };
        assert_eq!(accounting(&v), expected);
    }
}

#[test]
fn maximum_named_recipient_fits_preallocated_slot() {
    let recipient = "z".repeat(64);
    let mut p = policy();
    p.recipients = vec![recipient.clone()];
    let mut v = funded();
    v.configure(&context(OWNER), p).unwrap();
    let initial = borsh::to_vec(&v).unwrap().len();
    v.reserve(&context(AGENT), 1, 63, &recipient, 1).unwrap();
    assert_eq!(
        v.mandate.as_ref().unwrap().payments[63].recipient(),
        recipient
    );
    assert_eq!(borsh::to_vec(&v).unwrap().len(), initial);
    settle(&mut v, 63, TransferOutcome::Success).unwrap();
    accounting(&v);
}

#[test]
fn callback_authorizes_predecessor_not_original_signer() {
    let mut v = fixture();
    reserve(&mut v, 0, 1).unwrap();
    let mut ctx = context(VAULT);
    ctx.signer = AGENT.into();
    assert_eq!(
        v.settle(&ctx, 1, 0, 1, TransferOutcome::Success),
        Ok(Settlement::Succeeded)
    );
    assert_eq!(accounting(&v), (NEAR - 1, 0, 1));
}

#[test]
fn expiry_allows_retirement_only_without_pending_and_cannot_resume() {
    let mut v = fixture();
    v.pause(&context(OWNER)).unwrap();
    let mut expired = context(OWNER);
    expired.now = 1000;
    rejects_unchanged(&mut v, "ERR_EXPIRED", |v| v.resume(&expired));
    v.retire(&expired).unwrap();
    assert!(v.mandate.is_none());
    assert_eq!(v.unallocated, NEAR);
    assert_eq!(v.last_mandate_id, 1);
}

#[test]
fn multiple_approved_keys_share_one_pending_budget() {
    let keys = [
        KEY,
        "ed25519:11111111111111111111111111111112",
        "ed25519:11111111111111111111111111111113",
    ];
    let mut p = policy();
    p.agent_keys = keys.iter().map(|key| (*key).to_owned()).collect();
    let mut v = funded();
    v.configure(&context(OWNER), p).unwrap();
    for (nonce, key) in keys.iter().enumerate() {
        let mut ctx = context(AGENT);
        ctx.signer_key = (*key).into();
        let result = v.reserve(&ctx, 1, nonce as u8, RECIPIENT, 4 * NEAR / 10);
        assert_eq!(result, if nonce < 2 { Ok(()) } else { Err("ERR_BUDGET") });
    }
    assert_eq!(accounting(&v), (NEAR / 5, 4 * NEAR / 5, 0));
}
