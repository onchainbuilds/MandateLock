// Read-only public testnet reconciliation and disabled proposal generation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {frozenWasm,fingerprint,WASM_SHA,hash} from './plan.mjs';
import {repairBudget,repairPlan,verifyRepairHistory,HISTORY_HASHES} from './initialization-repair.mjs';
const dir='artifacts/phase4-initialization-repair';mkdirSync(dir,{recursive:true});
const c=JSON.parse(readFileSync('testnet/config.continuation.json')),previous=JSON.parse(readFileSync('artifacts/phase4-continuation-run/safe-stop-audit.json'));
const out={started_at:new Date().toISOString(),network:'testnet',reads:[]};
const save=()=>writeFileSync(dir+'/review.json',JSON.stringify(out,null,2)+'\n');
async function rpc(method,params){assert(['status','block','tx','query','gas_price','EXPERIMENTAL_protocol_config'].includes(method));const r=await fetch(c.rpc,{method:'POST',headers:{'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(20000),body:JSON.stringify({jsonrpc:'2.0',id:'repair-read-only',method,params})});const raw=await r.json();out.reads.push({method,params,http_status:r.status,raw});save();assert(r.ok&&!raw.error&&raw.result,'Read-only result unavailable');return raw.result;}
try{
 assert.equal((await rpc('status',{})).chain_id,'testnet');const wasm=frozenWasm(c);
 const raws=[];
 for(const[i,id]of ['create-vault','create-agent','create-recipient','create-attacker','deploy-init'].entries()){
  const lines=readFileSync(`artifacts/phase4/live/${c.continuation.original_config_sha256}/${id}.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
  const saved=lines.find(x=>x.stage==='observation'&&x.raw?.final_execution_status==='FINAL').raw;
  const raw=await rpc('tx',{tx_hash:HISTORY_HASHES[i],sender_account_id:saved.transaction.signer_id,wait_until:'FINAL'});
  assert.deepEqual(raw.transaction,saved.transaction);assert.deepEqual(raw.status,saved.status);
  const core=x=>({id:x.id,block_hash:x.block_hash,outcome:x.outcome});assert.deepEqual(raw.receipts_outcome.map(core),saved.receipts_outcome.map(core));assert.deepEqual(core(raw.transaction_outcome),core(saved.transaction_outcome));raws.push(raw);
 }
 out.historical_transactions=raws;out.incurred=verifyRepairHistory(raws,c).toString();
 const block=(await rpc('block',{finality:'final'})).header;out.block=block;assert(Math.abs(Date.now()-Number(BigInt(block.timestamp_nanosec)/1000000n))<60000);
 out.accounts={};out.keys={};
 for(const[role,account_id]of Object.entries(c.accounts)){
  const a=await rpc('query',{request_type:'view_account',account_id,block_id:block.hash});assert.equal(a.block_hash,block.hash);assert.equal(a.amount,previous.accounts[role].amount);assert.equal(a.storage_usage,182);assert.equal(a.locked,'0');assert.equal(a.code_hash,'11111111111111111111111111111111');out.accounts[role]=a;
  const k=await rpc('query',{request_type:'view_access_key_list',account_id,block_id:block.hash});assert.equal(k.block_hash,block.hash);assert.deepEqual(k.keys,previous.keys[role].keys);assert.equal(k.keys.length,1);assert.equal(k.keys[0].public_key,c.publicKeys[role==='agent'?'agentAdmin':role]);assert.equal(k.keys[0].access_key.permission,'FullAccess');out.keys[role]=k;
 }
 const protocol=await rpc('EXPERIMENTAL_protocol_config',{block_id:block.hash}),price=await rpc('gas_price',{block_id:block.hash});out.protocol=protocol;out.gas_price=price;
 out.budget=repairBudget(c,protocol,price.gas_price,wasm.length,out.accounts);
 const prior=JSON.parse(readFileSync('testnet/approval.continuation.json'));assert(Date.now()<Date.parse(prior.latest_start_at),'Original execution start deadline passed');assert(BigInt(c.expiresAtNs)>BigInt(block.timestamp_nanosec)+600000000000n);
 const proposal={approved:false,execution_ready:false,required_gate:'Production-equivalent split-initialization sandbox PASS and separate execution approval',network:'testnet',rpc:c.rpc,config_sha256:fingerprint(c),wasm_sha256:WASM_SHA,dependency_lock_sha256:hash(readFileSync('testnet/package-lock.json')),plan_sha256:out.budget.plan_sha256,historical_hashes:HISTORY_HASHES,incurred_yocto:out.incurred,max_aggregate_outgoing_near:'8',remaining_fee_bound:out.budget.remaining_fees,remaining_outgoing_bound:out.budget.remaining_bound,aggregate_bound:out.budget.aggregate_bound,latest_start_at:prior.latest_start_at,latest_submission_at:prior.latest_submission_at,expires_at:prior.expires_at,mandate_expiry_ns:c.expiresAtNs,operations:repairPlan(c),note:'Planning package only; not accepted by the old deploy/run entry points. Preserve all five original journals. No account recreation, combined deploy-init retry or automatic refund.'};
 writeFileSync('testnet/approval.initialization-repair.json',JSON.stringify(proposal,null,2)+'\n');writeFileSync(dir+'/exact-plan.json',JSON.stringify(proposal,null,2)+'\n');
 out.result='PASS — READ-ONLY RECONCILIATION; SANDBOX GATE PENDING';out.completed_at=new Date().toISOString();save();console.log(JSON.stringify({result:out.result,block:block.height,budget:out.budget},null,2));
}catch(e){out.result='UNVERIFIED / STOP';out.error=e.message;save();throw e;}
