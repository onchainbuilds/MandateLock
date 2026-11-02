// Offline synthetic regression fixtures; never sign or contact a network.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {approval,validateConfig,fingerprint,executionFingerprint,ORIGINAL_CONFIG_SHA,COMPLETED_HASHES,deploymentPlan} from '../plan.mjs';
import {TestnetRpc} from '../adapter.mjs';
import {Journal,broadcastOnce,reconcile} from '../journal.mjs';
import {verifyCompletedJournals,continuationBudget} from '../continuation.mjs';
import {budgetForecast} from '../budget.mjs';
const c=JSON.parse(readFileSync(new URL('../config.continuation.json',import.meta.url))),p=JSON.parse(readFileSync(new URL('../approval.continuation.json',import.meta.url)));
const captured=JSON.parse(readFileSync(new URL('./fixtures/protocol-fees-88.json',import.meta.url)));
const budget=()=>budgetForecast(c,captured.protocol,captured.gas_price,159542);
const fixture=()=>deploymentPlan(c).slice(0,3).map((call,i)=>({final_execution_status:'FINAL',status:{SuccessValue:''},transaction:{hash:COMPLETED_HASHES[i],signer_id:call.signer,receiver_id:call.receiver},transaction_outcome:{outcome:{tokens_burnt:'82494768750000000000'}},receipts_outcome:[{outcome:{tokens_burnt:'7032494768750000000000',status:{SuccessValue:''}}}]}));
test('RPC change preserves original journal namespace and exact completed transactions',()=>{
 assert.notEqual(fingerprint(c),ORIGINAL_CONFIG_SHA);assert.equal(executionFingerprint(c),ORIGINAL_CONFIG_SHA);
 for(const change of [x=>x.rpc='https://rpc.mainnet.fastnear.com',x=>x.publicKeys.owner=x.publicKeys.vault,x=>x.expiresAtNs='1793548800000000001',x=>x.continuation.completed_hashes.reverse()]){const x=structuredClone(c);change(x);assert.throws(()=>validateConfig(x));}
});
test('continuation cannot approve completed steps, changed binding or late start',()=>{
 const a={...p,approved:true},now=Date.parse('2026-10-31T17:00:00Z');approval(c,a,'create-attacker',now);
 assert.equal(p.approved,false);assert.throws(()=>approval(c,p,'create-attacker',now));
 for(const step of ['create-vault','create-agent','create-recipient'])assert.throws(()=>approval(c,{...a,operations:[...a.operations,step]},step,now),/Completed/);
 assert.throws(()=>approval(c,{...a,continuation_sha256:'changed'},'create-attacker',now));
 assert.throws(()=>approval(c,a,'create-attacker',Date.parse(p.latest_start_at)),/Start cutoff/);
 assert.throws(()=>approval(c,a,'authorized',Date.parse(p.latest_submission_at)),/Submission cutoff/);
});
test('deprecated RPC responses fail without retry or leaking provider content',async()=>{
 for(const ok of [true,false]){let calls=0;const rpc=new TestnetRpc(c,{fetchImpl:async()=>{calls++;return {ok,json:async()=>({error:{code:-429,message:'DEPRECATED secret-payload'}})};}});
 await assert.rejects(rpc.call('status',{}),e=>/deprecated/.test(e.message)&&!e.message.includes('secret-payload'));assert.equal(calls,1);}
});
test('uncertain submission remains one send and read-only reconciliation never recreates it',async()=>{
 const events=[],j={record:x=>events.push(x)},methods=[];
 const rpc={call:async method=>{methods.push(method);throw Error('transport unavailable');}};
 const record=await broadcastOnce(rpc,{hash:'synthetic',bytes:'not-a-transaction'},{signer:c.accounts.agent},j);
 const result=await reconcile(rpc,record,j,{attempts:2,pause:async()=>{}});
 assert(result.unverified);assert.deepEqual(methods,['send_tx','EXPERIMENTAL_tx_status','EXPERIMENTAL_tx_status']);assert(events.some(x=>x.stage==='UNCERTAIN'));
});
test('completed journals are preserved byte-for-byte and reject missing/uncertain/substituted evidence',()=>{
 const dir=mkdtempSync(join(tmpdir(),'mandatelock-continuation-'));
 try{
  const raws=fixture(),paths=deploymentPlan(c).slice(0,3).map((call,i)=>{const path=join(dir,call.id+'.jsonl');writeFileSync(path,[{stage:'signed-before-broadcast',hash:COMPLETED_HASHES[i]},{stage:'observation',hash:COMPLETED_HASHES[i],raw:raws[i]},{stage:'verified-deployment-step',step:call.id,hash:COMPLETED_HASHES[i]}].map(JSON.stringify).join('\n')+'\n');return path;});
  const before=paths.map(x=>readFileSync(x,'utf8'));assert.equal(verifyCompletedJournals(c,dir).length,3);assert.deepEqual(paths.map(x=>readFileSync(x,'utf8')),before);
  assert.throws(()=>new Journal(dir,'create-vault'),/EEXIST/);
  writeFileSync(paths[2],before[2].replaceAll('FINAL','EXECUTED_OPTIMISTIC'));assert.throws(()=>verifyCompletedJournals(c,dir),/uncertain/);
  writeFileSync(paths[2],before[2].replaceAll(COMPLETED_HASHES[2],'changed'));assert.throws(()=>verifyCompletedJournals(c,dir),/hash changed/);
  rmSync(paths[2]);assert.throws(()=>verifyCompletedJournals(c,dir),/ENOENT/);
 }finally{rmSync(dir,{recursive:true});}
});
test('continuation uses actual prior costs, retains all requested payments and rejects cap breach',()=>{
 const b=budget(),raw=fixture(),r=continuationBudget(b,raw);
 assert.equal(r.actual_outgoing,'5121344968612500000000000');assert.equal(r.aggregate_bound,'7796244968612500000000000');assert.equal(r.remaining_fee_bound,'174900000000000000000000');
 assert.equal(r.remaining_requested_payments,'1400000000000000000000000');
 const changed=structuredClone(b);changed.rows[3].fee='1000000000000000000000000';assert.throws(()=>continuationBudget(changed,raw),/8 NEAR/);
 raw[2].final_execution_status='EXECUTED_OPTIMISTIC';assert.throws(()=>continuationBudget(b,raw));
});
