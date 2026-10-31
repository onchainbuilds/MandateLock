// Static artifact validation only: this does not instantiate a NEAR runtime.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve('target/near/mandatelock.wasm');
const bytes = readFileSync(path);
assert.equal(bytes.subarray(0, 8).toString('hex'), '0061736d01000000');
assert.equal(WebAssembly.validate(bytes), true);
const module = new WebAssembly.Module(bytes);
const exports = WebAssembly.Module.exports(module);
const imports = WebAssembly.Module.imports(module);
const methods = [
  'new', 'fund', 'create_mandate', 'pause', 'resume', 'revoke', 'retire_mandate',
  'execute_payment', 'on_payment_result', 'get_policy', 'get_accounting', 'get_payment',
];
for (const method of methods) {
  assert(exports.some(entry => entry.name === method && entry.kind === 'function'), method);
}
for (const entry of exports.filter(entry => entry.kind === 'function')) {
  assert(methods.includes(entry.name) || entry.name === 'contract_source_metadata', entry.name);
}
assert(imports.every(entry => entry.module === 'env'));
const record = {
  path, bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  magic: bytes.subarray(0, 8).toString('hex'),
  validation: 'static only; no sandbox or live-chain execution',
  exports, imports,
};
writeFileSync('docs/phase1b-wasm.json', JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ path, bytes: record.bytes, sha256: record.sha256, methods }, null, 2));
