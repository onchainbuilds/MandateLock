// Offline, allowlisted export from the successful run. Never fetches or executes anything.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const source=resolve(root,'artifacts/phase2b-closure-run/evidence');
const output=resolve(import.meta.dirname,'evidence');
const digest=b=>createHash('sha256').update(b).digest('hex');
const original=JSON.parse(readFileSync(resolve(root,'artifacts/phase2b-closure-run/downloaded-file-manifest.json')));
const selected=[];
for (const [name,before,after,labels] of [
  ['authorized','authorized-before','authorized-after',['authorized']],
  ['recipient','rejected-before','rejected-after',['rejected']],
  ['concurrency','before','after',['competing-0','competing-1','competing-2']],
]) {
  for(const file of [before+'.json',after+'.json','setup-configure-transaction.json',
    ...[0,1,2].map(i=>`setup-key-${i}-transaction.json`),...labels.map(s=>s+'-transaction.json'),
    ...(name==='concurrency'?['summary.json','broadcast-0.json','broadcast-1.json','broadcast-2.json']:[])])
    selected.push(`phase2a/${name}/${file}`);
}
const files={};
for (const file of selected) {
  const bytes=readFileSync(resolve(source,file));
  assert.equal(digest(bytes),original.find(f=>f.path===file)?.sha256,`Archive provenance mismatch ${file}`);
  assert(!/PRIVATE KEY|"(?:secret_key|private_key|seed_phrase)"\s*:/i.test(bytes.toString()),`Secret field in ${file}`);
  const dest=resolve(output,file); mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,bytes);
  files[file]={sha256:digest(bytes),bytes:bytes.length};
}
const production={};
for (const file of ['src/lib.rs','src/contract.rs','src/model.rs','src/tests.rs','tests/phase2b_model.rs','Cargo.toml','Cargo.lock','rust-toolchain.toml','integration-tests/Cargo.toml','integration-tests/Cargo.lock']) {
  const bytes=readFileSync(resolve(root,file));
  const committed=execFileSync('git',['show',`75051c2fc7ecff6390c49fa67274d70d275d07c8:${file}`],{cwd:resolve(root,'.migration/checkout')});
  assert(bytes.equals(committed),`Frozen source drift: ${file}`);production[file]=digest(bytes);
}
writeFileSync(resolve(import.meta.dirname,'production-lock.json'),JSON.stringify({source_commit:'75051c2fc7ecff6390c49fa67274d70d275d07c8',files:production,
  linux_wasm_sha256:'3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87',
  windows_wasm_sha256:'eeded7009d4e56c460744ba7bdf17a52cc04a3d41fa1997903bf7622fb102bb3'},null,2)+'\n');
writeFileSync(resolve(output,'manifest.json'),JSON.stringify({mode:'recorded-sandbox',run_id:'41205116391',
  workflow_url:'https://github.com/onchainbuilds/MandateLock/actions/runs/41205116391',
  commit:'75051c2fc7ecff6390c49fa67274d70d275d07c8',recorded_date:'2026-10-31',
  artifact_sha256:'fa6f6470af9e214cbfd43dd1b19632816b59667fc3e0bcd8691b3cbf7903b6ef',
  provenance:'Unmodified selected files from the downloaded private GitHub Actions artifact. Local hashes detect changes; this is not a cryptographic chain-proof verifier.',files},null,2)+'\n');
console.log(`Exported ${selected.length} unmodified evidence files; frozen production inputs verified.`);
