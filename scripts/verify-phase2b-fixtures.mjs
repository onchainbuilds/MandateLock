// Static provenance gate, not runtime evidence. Both diagnostics must use cargo-near.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [production, lowgas, duplicate, output] = process.argv.slice(2);
assert(output, 'usage: node verify-phase2b-fixtures.mjs production.wasm lowgas.wasm duplicate.wasm output.json');
const root = resolve(import.meta.dirname, '..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync(resolve(root, 'target/phase2b-fixtures/manifest.json')));
const records = {};
for (const [name, path] of Object.entries({ production, lowgas, duplicate })) {
  const bytes = readFileSync(path);
  assert(WebAssembly.validate(bytes), `${name}: invalid Wasm`);
  const module = new WebAssembly.Module(bytes);
  const imports = WebAssembly.Module.imports(module);
  const exports = WebAssembly.Module.exports(module).filter(e => e.kind === 'function').map(e => e.name).sort();
  assert(imports.every(e => e.module === 'env'), `${name}: unexpected host namespace`);
  for (const host of ['panic_utf8', 'promise_results_count', 'promise_result', 'storage_write', 'promise_batch_action_transfer']) {
    assert(imports.some(e => e.module === 'env' && e.name === host), `${name}: missing onchain host ${host}`);
  }
  if (name !== 'production') {
    assert.deepEqual(exports, [...records.production.exports, ...(name === 'duplicate' ? ['phase2b_repeat'] : [])].sort(), `${name}: unexpected methods`);
    for (const [file, hashes] of Object.entries(manifest.variants[name].files)) {
      assert.equal(digest(readFileSync(resolve(root, file))), hashes.production_sha256, `production drift: ${file}`);
      assert.equal(digest(readFileSync(resolve(root, 'target/phase2b-fixtures', name, file))), hashes.fixture_sha256, `fixture drift: ${name}/${file}`);
      if (file !== 'src/contract.rs') assert.equal(hashes.production_sha256, hashes.fixture_sha256);
    }
  }
  records[name] = { bytes: bytes.length, sha256: digest(bytes), imports, exports };
}
assert.equal(new Set(Object.values(records).map(r => r.sha256)).size, 3, 'artifacts must be distinct');
writeFileSync(output, JSON.stringify({
  status: 'PASS',
  scope: 'Static imports/exports and source provenance only. Runtime equivalence requires sandbox execution; diagnostic mutations remain test-only.',
  build_command: 'cargo near build non-reproducible-wasm --no-abi --locked',
  records,
}, null, 2) + '\n');
console.log('PASS: onchain host imports, expected exports, unchanged shared sources and distinct artifact hashes.');
