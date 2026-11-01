//! Native authority matrix. SDK state-existence behavior needs real Wasm tests.
use mandatelock::model::{Context, VaultState};
const OWNER: &str = "ml-demo-20261031.testnet";
const VAULT: &str = "vault.ml-demo-20261031.testnet";
fn ctx(predecessor: &str, signer: &str) -> Context {
    Context {
        current: VAULT.into(),
        predecessor: predecessor.into(),
        signer: signer.into(),
        signer_key: "fixture".into(),
        now: 0,
        deposit: 0,
        balance: 4 * 10u128.pow(24),
        floor: 0,
        remaining_gas: 100_000_000_000_000,
    }
}
#[test]
fn both_runtime_identities_must_be_parent_even_when_argument_claims_parent() {
    for predecessor in [OWNER, VAULT, "attacker.testnet"] {
        for signer in [OWNER, VAULT, "attacker.testnet"] {
            let result = VaultState::new(OWNER.into(), &ctx(predecessor, signer));
            assert_eq!(result.is_ok(), predecessor == OWNER && signer == OWNER);
        }
    }
}
#[test]
fn claimed_owner_cannot_be_attacker_vault_or_higher_ancestor() {
    for claim in ["attacker.testnet", VAULT, "testnet"] {
        assert_eq!(
            VaultState::new(claim.into(), &ctx(claim, claim)),
            Err("ERR_INITIAL_OWNER")
        );
    }
}
#[test]
fn parent_initialization_starts_without_spendable_principal_or_mandate() {
    let state = VaultState::new(OWNER.into(), &ctx(OWNER, OWNER)).unwrap();
    assert_eq!(state.owner, OWNER);
    assert_eq!(state.unallocated, 0);
    assert!(state.mandate.is_none());
}
#[test]
fn parent_initialization_rejects_attached_deposit() {
    let mut context = ctx(OWNER, OWNER);
    context.deposit = 1;
    assert!(VaultState::new(OWNER.into(), &context).is_err());
}
