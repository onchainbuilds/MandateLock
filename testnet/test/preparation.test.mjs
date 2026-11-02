// Synthetic unit fixtures only. These tests never contact a network or claim testnet execution.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateConfig,deploymentPlan,scenario,approval,fingerprint,WASM_SHA,UNIT,ALLOWANCE} from '../plan.mjs';
import {TestnetRpc,restrictedKey,checkLedger,liveDecision,preflightScenario,inspectTransaction,verifyScenario,snapshot,checkAgentFunding} from '../adapter.mjs';
import {Journal,broadcastOnce,reconcile,readSession} from '../journal.mjs';
import {loadEvidence} from '../../demo/evidence.mjs';
const e=loadEvidence(),keys=Object.values(e.cases).flatMap(c=>c.keys.map(k=>k.public_key));
const now=Date.now(),c=JSON.parse(readFileSync(new URL('../config.example.json',import.meta.url)));
c.publicKeys={owner:keys[0],vault:keys[1],agentAdmin:keys[2],recipient:keys[3],attacker:keys[4],agents:keys.slice(5,8)};c.expiresAtNs=(BigInt(now)*1000000n+3600000000000n).toString();
const clone=structuredClone;
function state(){
 const s={mode:'unit-test-fixture',vault:c.accounts.vault,block_hash:'test-block',block_height:1,block_timestamp_ns:(BigInt(now)*1000000n).toString(),
 policy:{mandate_id:'1',owner_id:c.accounts.owner,agent_id:c.accounts.agent,agent_keys:c.publicKeys.agents,allowed_recipients:[c.accounts.recipient],budget:UNIT.toString(),per_transaction_limit:(UNIT*4n/10n).toString(),expires_at_ns:c.expiresAtNs,paused:false,revoked:false},
 accounting:{available:UNIT.toString(),pending:'0',spent:'0',unallocated:'0',budget:UNIT.toString(),account_balance:(5n*UNIT).toString(),storage_and_operating_floor:(2n*UNIT).toString()},
 accounts:Object.fromEntries(Object.values(c.accounts).map(id=>[id,{amount:(id===c.accounts.vault?5n*UNIT:UNIT).toString()}])),payments:Array.from({length:5},()=>({status:'Unused'})),
 keys:c.publicKeys.agents.map(public_key=>({account_id:c.accounts.agent,public_key,receiver_id:c.accounts.vault,method_names:['execute_payment'],allowance:ALLOWANCE,nonce:100}))};return s;
}
function raw(call,failed=false){
 const r=clone(e.cases.authorized.transactions[0].raw),a=call.actions[0];
 r.transaction={...r.transaction,signer_id:call.signer,receiver_id:call.receiver,public_key:call.publicKey,actions:[{FunctionCall:{method_name:a.method,args:Buffer.from(JSON.stringify(a.args)).toString('base64'),gas:Number(a.gas),deposit:'0'}}]};
 for(const x of r.receipts_outcome){if(x.outcome.executor_id===e.cases.authorized.keys[0].receiver_id)x.outcome.executor_id=call.receiver;
 x.outcome.logs=(x.outcome.logs??[]).map(line=>{if(!line.startsWith('EVENT_JSON:'))return line;const v=JSON.parse(line.slice(11));v.data[0].nonce=a.args.nonce;return 'EVENT_JSON:'+JSON.stringify(v);});}
 if(failed){r.status={Failure:{error:'ERR_RECIPIENT'}};for(const x of r.receipts_outcome)x.outcome.logs=[];}
 return r;
}
test('configuration isolates five disposable roles and pins testnet',()=>{
 validateConfig(c,{ready:true});for(const changed of [{...c,network:'mainnet'},{...c,rpc:'https://attacker.example'},{...c,accounts:{...c.accounts,agent:c.accounts.vault}}])assert.throws(()=>validateConfig(changed,{ready:true}));
 assert.throws(()=>validateConfig({...c,accounts:{...c.accounts,vault:'other.testnet'}},{ready:true}));
});
test('keys must be separate and actual public inputs supplied before execution',()=>{
 const d=clone(c);d.publicKeys.agents[1]=d.publicKeys.agents[0];assert.throws(()=>validateConfig(d,{ready:true}));
 assert.throws(()=>validateConfig(JSON.parse(readFileSync(new URL('../config.example.json',import.meta.url))),{ready:true}));
});
test('deployment cannot exceed 6.2 NEAR distribution and agent grants stay restricted',()=>{
 const p=deploymentPlan(c);const funds=p.flatMap(s=>s.actions).reduce((n,a)=>n+BigInt(a.deposit??0),0n);assert.equal(funds,62n*UNIT/10n);
 const grants=p.find(s=>s.id==='install-agent-keys').actions;assert.equal(grants.length,3);
 for(const a of grants){assert.equal(a.type,'AddFunctionCallKey');assert.equal(a.receiver,c.accounts.vault);assert.deepEqual(a.methods,['execute_payment']);assert.equal(a.allowance,ALLOWANCE);}
 assert.equal(p.find(s=>s.id==='deploy-init').actions[0].sha256,WASM_SHA);
});
test('approval binds exact configuration, operation, hash, expiry and cap',()=>{
 const a={approved:true,network:'testnet',config_sha256:fingerprint(c),wasm_sha256:WASM_SHA,expires_at:new Date(now+60000).toISOString(),max_external_funding_near:'8',operations:['authorized']};
 approval(c,a,'authorized',now);
 for(const bad of [null,{...a,approved:false},{...a,config_sha256:'changed'},{...a,wasm_sha256:'changed'},{...a,expires_at:'2000-01-01'},{...a,max_external_funding_near:'100'}])assert.throws(()=>approval(c,bad,'authorized',now));
 assert.throws(()=>approval(c,a,'concurrency',now));
});
test('runtime refuses full-access, unlimited or broad agent keys',()=>{
 const valid={nonce:5,permission:{FunctionCall:{receiver_id:c.accounts.vault,method_names:['execute_payment'],allowance:ALLOWANCE}}};restrictedKey(valid,c,c.publicKeys.agents[0]);
 for(const bad of [{nonce:5,permission:'FullAccess'},{...valid,nonce:2**54},{nonce:5,permission:{FunctionCall:{...valid.permission.FunctionCall,method_names:[]}}},{nonce:5,permission:{FunctionCall:{...valid.permission.FunctionCall,allowance:null}}}])assert.throws(()=>restrictedKey(bad,c,c.publicKeys.agents[0]));
});
test('live deterministic policy labels chain time and blocks redirect; review remains held',()=>{
 const s=state(),p={recipient:c.accounts.recipient,amount:'0.10',nonce:0,instruction:'SCRIPTED'};
 assert.equal(liveDecision(s,p).decision,'ALLOW');assert.match(liveDecision(s,p).clock,/testnet/);
 assert.equal(liveDecision(s,{...p,recipient:c.accounts.attacker}).decision,'BLOCK');assert.equal(liveDecision(s,{...p,amount:'0.40'}).decision,'REVIEW');
});
test('one mandate demo uses distinct nonces/keys and cumulative .90 total spent',()=>{
 const s=state();preflightScenario(c,'authorized',s);s.accounting.available=(UNIT*9n/10n).toString();s.accounting.spent=(UNIT/10n).toString();
 const calls=preflightScenario(c,'concurrency',s);assert.equal(new Set(calls.map(x=>x.publicKey)).size,3);assert.deepEqual(calls.map(x=>x.actions[0].args.nonce),[2,3,4]);
 assert.equal(scenario(c,'direct-rejection')[0].actions[0].args.recipient,c.accounts.attacker);assert.throws(()=>scenario(c,'anything'));
});
test('uncertain pending and reused application nonces stop new scenarios',()=>{
 const s=state();s.accounting.available=(UNIT*9n/10n).toString();s.accounting.pending=(UNIT/10n).toString();assert.throws(()=>preflightScenario(c,'authorized',s),/pending/);
 const t=state();t.payments[0].status='Succeeded';assert.throws(()=>preflightScenario(c,'authorized',t));
});
test('solvency checks enforce ledger identity and physical backing without double-counting in-flight transfers',()=>{
 const s=state();assert.equal(checkLedger(s).intra_block_solvency,'UNVERIFIED');
 s.accounting.pending=(UNIT/10n).toString();assert.throws(()=>checkLedger(s));s.accounting.available=(UNIT*9n/10n).toString();checkLedger(s);
 s.accounting.account_balance=UNIT.toString();s.accounts[s.vault].amount=UNIT.toString();assert.throws(()=>checkLedger(s),/backing/);
});
test('receipt verifier rejects wrong transaction, non-final outcome, missing vault and nonce conflict',()=>{
 const call=scenario(c,'authorized')[0],r=raw(call);const valid=inspectTransaction(r,call,r.transaction.hash);assert.equal(valid.callback.event,'payment_succeeded');
 for(const mutate of [x=>x.final_execution_status='EXECUTED_OPTIMISTIC',x=>x.transaction.public_key=keys[0],x=>x.receipts_outcome=[],x=>x.status={Failure:'InvalidNonce'}]){const x=clone(r);mutate(x);assert.throws(()=>inspectTransaction(x,call,r.transaction.hash));}
});
test('missing callback remains unverified even with a successful top-level response',()=>{
 const call=scenario(c,'authorized')[0],r=raw(call);r.receipts_outcome.forEach(x=>x.outcome.logs=[]);
 assert.match(inspectTransaction(r,call,r.transaction.hash).callback.status,/UNVERIFIED/);
});
test('successful scenario requires actual accounting, recipient and terminal slot transitions',()=>{
 const b=state(),a=state();a.accounting.available=(UNIT*9n/10n).toString();a.accounting.spent=(UNIT/10n).toString();a.accounts[c.accounts.recipient].amount=(UNIT*11n/10n).toString();a.payments[0].status='Succeeded';
 const call=scenario(c,'authorized')[0],r=raw(call),tx=[{call,raw:r,hash:r.transaction.hash}];assert.equal(verifyScenario(c,'authorized',b,a,tx).result,'PASS');
 a.accounts[c.accounts.recipient].amount=UNIT.toString();assert.throws(()=>verifyScenario(c,'authorized',b,a,tx));
});
test('independent rejection must reach the vault and leave recipient and budget unchanged',()=>{
 const b=state(),call=scenario(c,'direct-rejection')[0],r=raw(call,true);assert.equal(verifyScenario(c,'direct-rejection',b,clone(b),[{call,raw:r,hash:r.transaction.hash}]).result,'PASS');
});
test('RPC uses pinned HTTPS endpoint, rejects redirects and never retries errors',async()=>{
 let calls=0;const rpc=new TestnetRpc(c,{fetchImpl:async(url,options)=>{calls++;assert.equal(url,c.rpc);assert.equal(options.redirect,'error');return {ok:true,json:async()=>({error:{message:'sensitive response'}})};}});
 await assert.rejects(rpc.call('status',{}),/unavailable/);assert.equal(calls,1);await assert.rejects(rpc.call('arbitrary',{}));
});
test('snapshot rejects a mainnet responder before querying contract state',async()=>{
 const methods=[];await assert.rejects(snapshot({call:async(method)=>{methods.push(method);return {chain_id:'mainnet'};}},c),/Wrong chain/);assert.deepEqual(methods,['status']);
});
test('snapshot rejects stale final block time before trusting policy',async()=>{
 await assert.rejects(snapshot({call:async method=>method==='status'?{chain_id:'testnet'}:{header:{hash:'x',timestamp_nanosec:'1'}}},c,{now}),/stale/);
});
test('snapshot rejects changed deployed Wasm',async()=>{
 const rpc={call:async method=>method==='status'?{chain_id:'testnet'}:method==='block'?{header:{hash:'x',timestamp_nanosec:(BigInt(now)*1000000n).toString()}}:{block_hash:'x',code_base64:Buffer.from('not production').toString('base64')}};
 await assert.rejects(snapshot(rpc,c,{now}),/Wasm differs/);
});
test('durable operation claims prevent duplicate submission after restart',()=>{
 const d=mkdtempSync(join(tmpdir(),'mandatelock-phase4-'));try{const j=new Journal(d,'authorized');j.record({stage:'signed-before-broadcast',hash:'example'});assert.throws(()=>new Journal(d,'authorized'),/EEXIST/);}finally{rmSync(d,{recursive:true});}
});
test('lost broadcast response records known hash once and never resubmits',async()=>{
 let sends=0;const events=[],journal={record:x=>events.push(x)};
 const r=await broadcastOnce({call:async()=>{sends++;assert.equal(events[0].stage,'signed-before-broadcast');throw Error('timeout');}},{hash:'known',bytes:'synthetic'},scenario(c,'authorized')[0],journal);
 assert.equal(sends,1);assert.equal(r.hash,'known');assert.equal(events[1].stage,'UNCERTAIN');
});
test('reconciliation only reads receipts; unresolved outcomes do not restore budget',async()=>{
 const methods=[];const r=await reconcile({call:async method=>{methods.push(method);throw Error('unavailable');}},{hash:'known',call:scenario(c,'authorized')[0]},{record:()=>{}},{attempts:2,pause:async()=>{}});
 assert.match(r.unverified,/No resubmission/);assert.deepEqual(methods,['EXPERIMENTAL_tx_status','EXPERIMENTAL_tx_status']);
});
test('absent or corrupt live journal cannot produce a live PASS',()=>{
 const d=mkdtempSync(join(tmpdir(),'mandatelock-phase4-'));try{const p=join(d,'session.json');assert.equal(readSession(p).mode,'testnet-preparation');writeFileSync(p,'{');assert.match(readSession(p).message,/unreadable/);}finally{rmSync(d,{recursive:true});}
});
test('agent funding must cover storage and every independent transaction gas reserve',()=>{
 const s=state();s.accounts[c.accounts.agent].storage_usage=1000;const calls=scenario(c,'concurrency');
 checkAgentFunding(c,s,calls,'100000000','10000000000000000000');
 s.accounts[c.accounts.agent].amount='1';assert.throws(()=>checkAgentFunding(c,s,calls,'100000000','10000000000000000000'),/Agent cannot/);
});
