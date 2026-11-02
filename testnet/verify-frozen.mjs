import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {loadEvidence} from '../demo/evidence.mjs';
import {hash,frozenWasm} from './plan.mjs';
const e=loadEvidence(),commit=e.lock.source_commit;
const paths=execFileSync('git',['ls-tree','-r','--name-only',commit],{cwd:'.migration/checkout',encoding:'utf8'}).trim().split('\n')
 .filter(p=>/^(src\/|tests\/|integration-tests\/|\.github\/workflows\/)|(^Cargo\.(toml|lock)$)|(^rust-toolchain\.toml$)/.test(p));
for(const path of paths)assert(readFileSync(path).equals(execFileSync('git',['show',`${commit}:${path}`],{cwd:'.migration/checkout'})),`Frozen baseline drift: ${path}`);
const windows=hash(readFileSync('target/near/mandatelock.wasm'));assert.equal(windows,e.lock.windows_wasm_sha256);
const linux=hash(frozenWasm(JSON.parse(readFileSync('testnet/config.example.json'))));
const report={result:'PASS',source_commit:commit,baseline_files:paths.length,linux_wasm_sha256:linux,windows_wasm_sha256:windows,production_modified:false};
mkdirSync('artifacts/phase4',{recursive:true});writeFileSync('artifacts/phase4/frozen-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
