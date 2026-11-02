// Explicitly approved, one-operation CLI; no execution on module import.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {frozenWasm,executionFingerprint} from './plan.mjs';
import {TestnetRpc} from './adapter.mjs';
import {executeOperation,ORDER} from './execution.mjs';
import {signerFromFile,agentSignerFromFile,signCall} from './sdk.mjs';
export async function cli(allowed,args=process.argv.slice(2)){
 const [operation,configFile,permitFile,...files]=args;assert(allowed.includes(operation),'Historical/unknown operation forbidden');
 const c=JSON.parse(readFileSync(configFile)),p=JSON.parse(readFileSync(permitFile));
 assert.equal(files.length,operation==='concurrency'?3:1,'Exact credential count required');
 let index=0;
 const result=await executeOperation({c,p,operation,dir:resolve('artifacts/phase4/live',executionFingerprint(c)),wasm:frozenWasm(c),rpc:new TestnetRpc(c),
 sign:async(call,nonce,block,wasm)=>{const file=files[index++];const {api,signer}=ORDER.indexOf(operation)>=5?await agentSignerFromFile(file,c,call.publicKey):await signerFromFile(file,call.signer,call.publicKey);return signCall(api,signer,call,nonce,block,wasm);}});
 console.log(JSON.stringify(result,null,2));
}
