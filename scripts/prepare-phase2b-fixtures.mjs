// LOCAL TEST ARTIFACTS ONLY. Never deploy these variants to a public network.
// Production sources are read, never changed. Fail if the expected source drifts.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'src/contract.rs'), 'utf8');
const gas = 'const CALLBACK_GAS: Gas = Gas::from_tgas(15);';
const entry = '    /// owner_id must be the immediate parent of this vault account.';
assert.equal(source.split(gas).length, 2);
assert.equal(source.split(entry).length, 2);
const helper = `    // TEST-ONLY: schedule a second real promise result for an already settled slot.
    // This artifact is not the production MandateLock contract.
    #[private]
    pub fn phase2b_repeat(&mut self, mandate_id: U64, nonce: u8, target: AccountId) -> Promise {
        Promise::new(target).transfer(NearToken::from_yoctonear(1)).then(
            Self::ext(env::current_account_id()).with_static_gas(CALLBACK_GAS)
                .with_unused_gas_weight(0).on_payment_result(mandate_id, nonce)
        )
    }

`;
const variants = {
  lowgas: { source: source.replace(gas, gas.replace('(15)', '(1)')), mutation: 'callback allocation only: 15 Tgas -> 1 Tgas' },
  duplicate: { source: source.replace(entry, helper + entry), mutation: 'one private TEST-ONLY phase2b_repeat method; existing callback unchanged' },
};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = { purpose: 'Fault-injection evidence; NEVER production deployment artifacts', variants: {} };
for (const [name, variant] of Object.entries(variants)) {
  const dest = resolve(root, 'target/phase2b-fixtures', name);
  mkdirSync(resolve(dest, 'src'), { recursive: true });
  const files = {};
  for (const file of ['Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'src/lib.rs', 'src/model.rs', 'src/tests.rs', 'src/contract.rs']) {
    const original = readFileSync(resolve(root, file));
    const content = file === 'src/contract.rs' ? Buffer.from(variant.source) : original;
    writeFileSync(resolve(dest, file), content);
    files[file] = { production_sha256: digest(original), fixture_sha256: digest(content) };
  }
  manifest.variants[name] = { mutation: variant.mutation, files };
}
writeFileSync(resolve(root, 'target/phase2b-fixtures/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Prepared lowgas and duplicate TEST-ONLY source copies under target/phase2b-fixtures. Production unchanged.');
