// Shared, ordered public-testnet runner. No invocation on import; all I/O is injectable for tests.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {repairPlan,INCURRED,requireRepairRuntimeEvidence} from './initialization-repair.mjs';
import {historicalJournal,splitApproval,validateSplitReceipt,cumulativeLimit,completeReceipts} from './split-execution.mjs';
import {priceCalls} from './budget.mjs';
import {hash,WASM_SHA,UNIT,ALLOWANCE,fingerprint} from './plan.mjs';
import {Journal,broadcastOnce,reconcile} from './journal.mjs';
import {restrictedKey,snapshot,checkLedger,preflightScenario,verifyScenario,checkAgentFunding} from './adapter.mjs';
export const ORDER=['deploy-only','initialize-owner','install-agent-keys','fund','mandate','authorized','direct-rejection','concurrency'];
const parse=p=>JSON.parse(readFileSync(p));
const lines=p=>readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
const fee=r=>[r.transaction_outcome,...r.receipts_outcome].reduce((n,x)=>n+BigInt(x.outcome.tokens_burnt),0n);
const amount=call=>call.actions.reduce((n,a)=>n+BigInt(a.deposit??0)+BigInt(a.method==='execute_payment'?a.args.amount:0),0n);
export function callsFor(c,operation){const i=ORDER.indexOf(operation);assert(i>=0,'Historical or unknown operation forbidden');return i<5?[repairPlan(c)[i]]:repairPlan(c).slice(i===5?5:i===6?6:7,i===5?6:i===6?7:10);}
export function permitCheck(c,p,operation,now){
 callsFor(c,operation);splitApproval(c,p,ORDER.indexOf(operation)<5?operation:'mandate',now);
 assert.deepEqual(p.operations,repairPlan(c));assert.equal(p.dependency_lock_sha256,hash(readFileSync(new URL('package-lock.json',import.meta.url))));
 assert.equal(p.latest_start_at,'2026-11-01T14:30:00Z');assert.equal(p.latest_submission_at,'2026-11-01T14:50:00Z');assert.equal(p.expires_at,'2026-11-01T15:00:00Z');assert.equal(p.mandate_expiry_ns,c.expiresAtNs);
 assert.equal(p.runtime_evidence_sha256,hash(readFileSync(p.runtime_evidence_path)));requireRepairRuntimeEvidence(p.runtime_evidence_path);
 assert.equal(p.initial_state_sha256,hash(readFileSync(p.initial_state_path)));
}
export async function readState(rpc,c,initialized,raws=[],now=Date.now()){
 assert.equal((await rpc.call('status',{})).chain_id,'testnet');const block=(await rpc.call('block',{finality:'final'})).header;
 const age=BigInt(now)*1000000n-BigInt(block.timestamp_nanosec);assert(age>=-10000000000n&&age<60000000000n,'Stale block');
 for(const raw of raws)for(const x of [raw.transaction_outcome,...raw.receipts_outcome])assert(block.height>=(await rpc.call('block',{block_id:x.block_hash})).header.height,'Snapshot predates receipt');
 const query=async p=>{const r=await rpc.call('query',{...p,block_id:block.hash});assert.equal(r.block_hash,block.hash);return r;};
 const accounts={},keys={};for(const [role,id]of Object.entries(c.accounts)){
  accounts[role]=await query({request_type:'view_account',account_id:id});keys[role]=(await query({request_type:'view_access_key_list',account_id:id})).keys;
  assert.equal(accounts[role].locked,'0');const op=c.publicKeys[role==='agent'?'agentAdmin':role];assert.equal(keys[role].filter(k=>k.access_key.permission==='FullAccess').length,1);assert(keys[role].some(k=>k.public_key===op&&k.access_key.permission==='FullAccess'));
  if(role!=='agent')assert.equal(keys[role].length,1);if(role!=='vault')assert.equal(accounts[role].code_hash,'11111111111111111111111111111111');
 }
 const state=await query({request_type:'view_state',account_id:c.accounts.vault,prefix_base64:''});
 let wasm_sha256=null;if(accounts.vault.code_hash!=='11111111111111111111111111111111'){
  const code=await query({request_type:'view_code',account_id:c.accounts.vault});wasm_sha256=hash(Buffer.from(code.code_base64,'base64'));assert.equal(wasm_sha256,WASM_SHA);
 }
 const view=async method=>JSON.parse(Buffer.from((await query({request_type:'call_function',account_id:c.accounts.vault,method_name:method,args_base64:'e30='})).result));
 const s={block,accounts,keys,values:state.values,wasm_sha256};
 if(initialized){assert.equal(wasm_sha256,WASM_SHA);s.accounting=await view('get_accounting');s.policy=await view('get_policy');assert.equal(s.accounting.owner_id,c.accounts.owner);checkLedger({accounting:s.accounting,vault:c.accounts.vault,accounts:{[c.accounts.vault]:accounts.vault}});}
 return s;
}
export function expectedState(c,s,completed){
 if(completed===0){assert.equal(s.wasm_sha256,null);assert.deepEqual(s.values,[]);}
 else assert.equal(s.wasm_sha256,WASM_SHA);
 if(completed===1)assert.deepEqual(s.values,[]);
 const agent=s.keys.agent;assert.equal(agent.length,completed>=3?4:1);
 if(completed>=3)for(const key of c.publicKeys.agents){const found=agent.find(k=>k.public_key===key);assert(found);restrictedKey(found.access_key,c,key);if(completed<=5)assert.equal(found.access_key.permission.FunctionCall.allowance,ALLOWANCE);}
 if(completed>=2&&completed<=5){const a=s.accounting;assert.equal(a.pending,'0');assert.equal(a.spent,'0');assert.equal(a.last_mandate_id,completed===5?'1':'0');assert.equal(a.unallocated,completed===4?UNIT.toString():'0');assert.equal(a.available,completed===5?UNIT.toString():'0');assert.equal(a.budget,completed===5?UNIT.toString():'0');
  if(completed<5)assert.equal(s.policy,null);else {const p=s.policy;assert.equal(p.owner_id,c.accounts.owner);assert.equal(p.agent_id,c.accounts.agent);assert.deepEqual(p.agent_keys,c.publicKeys.agents);assert.deepEqual(p.allowed_recipients,[c.accounts.recipient]);assert.equal(p.expires_at_ns,c.expiresAtNs);assert.equal(p.per_transaction_limit,(UNIT*4n/10n).toString());assert.equal(p.budget,UNIT.toString());assert.equal(p.mandate_id,'1');assert.equal(p.paused,false);assert.equal(p.revoked,false);}
 }
}
export async function verifiedHistory(c,dir,rpc,operation){
 const historical=historicalJournal(c,dir);const all=[];
 for(const saved of historical){const fresh=await rpc.call('EXPERIMENTAL_tx_status',{tx_hash:saved.transaction.hash,sender_account_id:saved.transaction.signer_id,wait_until:'FINAL'});assert.equal(fresh.final_execution_status,'FINAL');assert.deepEqual(fresh.transaction,saved.transaction);assert.deepEqual(fresh.status,saved.status);assert.deepEqual(fresh.receipts_outcome.map(x=>x.outcome),saved.receipts_outcome.map(x=>x.outcome));}
 for(const prior of ORDER.slice(0,ORDER.indexOf(operation))){const entries=lines(join(dir,prior+'.jsonl'));const verified=entries.filter(x=>x.stage==='verified-repair-operation');assert.equal(verified.length,1,'Dependency missing or uncertain');assert.equal(verified[0].plan_sha256,fingerprint(repairPlan(c)));assert.equal(entries.filter(x=>x.stage==='signed-before-broadcast').length,callsFor(c,prior).length);
  assert.equal(verified[0].transactions.length,callsFor(c,prior).length);
  for(const [i,t]of verified[0].transactions.entries()){const expected={...callsFor(c,prior)[i]};const call={...t.call};delete call.publicKey;delete expected.publicKey;assert.deepEqual(call,expected);const raw=await rpc.call('EXPERIMENTAL_tx_status',{tx_hash:t.hash,sender_account_id:t.call.signer,wait_until:'FINAL'});assert.equal(raw.final_execution_status,'FINAL');assert.deepEqual(raw.transaction,t.raw.transaction);assert.deepEqual(raw.status,t.raw.status);assert.deepEqual(raw.receipts_outcome.map(x=>x.outcome),t.raw.receipts_outcome.map(x=>x.outcome));all.push({...t,raw});}
 }
 return all;
}
export function budgetCheck(c,p,protocol,gasPrice,wasm,prior,operation,s){
 const rows=priceCalls(c,repairPlan(c),protocol,gasPrice,wasm.length);assert(rows.reduce((n,r)=>n+BigInt(r.fee),0n)<=BigInt(p.remaining_fee_bound));
 const consumed=prior.length;const remaining=rows.slice(consumed);const actual=prior.reduce((n,t)=>n+fee(t.raw)+amount(t.call),0n);
 const bound=cumulativeLimit(actual,remaining.reduce((n,r)=>n+BigInt(r.fee)+amount(r.call),0n));
 const bytes=BigInt(protocol.runtime_config.storage_amount_per_byte);
 for(const role of ['owner','vault','agent']){const acc=s.accounts[role],own=remaining.filter(r=>r.call.signer===c.accounts[role]);const reserve=role==='owner'?2n*UNIT+4096n*bytes:role==='vault'?256000n*bytes+UNIT/100n:4096n*bytes;assert(BigInt(acc.amount)>=reserve+own.reduce((n,r)=>n+BigInt(r.fee)+r.call.actions.reduce((m,a)=>m+BigInt(a.deposit??0),0n),0n),'Insufficient reserve');}
 assert(BigInt(c.expiresAtNs)>BigInt(s.block.timestamp_nanosec)+600000000000n,'Expiry too close');return {incurred:INCURRED.toString(),actual_new:actual.toString(),aggregate_bound:bound.toString(),rows};
}
export async function executeOperation({c,p,operation,dir,wasm,rpc,sign,now=Date.now,makeJournal=(d,o)=>new Journal(d,o),reconcileOptions}){
 permitCheck(c,p,operation,now());assert.equal(hash(wasm),WASM_SHA);assert(!existsSync(join(dir,operation+'.jsonl')),'Operation already claimed; never retry');
 const index=ORDER.indexOf(operation),prior=await verifiedHistory(c,dir,rpc,operation);
 const before=await readState(rpc,c,index>=2,prior.map(x=>x.raw),now());expectedState(c,before,index);
 const baseline=index===0?parse(p.initial_state_path):lines(join(dir,ORDER[index-1]+'.jsonl')).find(x=>x.stage==='verified-repair-operation').after;
 for(const role of Object.keys(c.accounts)){
  for(const field of ['amount','locked','storage_usage','code_hash'])assert.equal(before.accounts[role][field],baseline.accounts[role][field],'Unexpected account state');
  assert.deepEqual(before.keys[role],Array.isArray(baseline.keys[role])?baseline.keys[role]:baseline.keys[role].keys,'Unexpected key state');
 }
 const protocol=await rpc.call('EXPERIMENTAL_protocol_config',{block_id:before.block.hash}),price=await rpc.call('gas_price',{block_id:before.block.hash});
 const budget=budgetCheck(c,p,protocol,price.gas_price,wasm,prior,operation,before);
 const calls=callsFor(c,operation).map(x=>({...x,publicKey:x.publicKey??c.publicKeys[x.signer===c.accounts.vault?'vault':x.signer===c.accounts.owner?'owner':'agentAdmin']}));
 let agentBefore;if(index>=5){agentBefore=await snapshot(rpc,c,{now:now()});preflightScenario(c,operation,agentBefore);checkAgentFunding(c,agentBefore,calls,price.gas_price,protocol.runtime_config.storage_amount_per_byte);}
 const journal=makeJournal(dir,operation);journal.record({stage:'preflight',before,budget});
 const signed=[];for(const call of calls){const role=index>=5?'agent':call.signer===c.accounts.vault?'vault':call.signer===c.accounts.owner?'owner':'agent';const key=before.keys[role].find(k=>k.public_key===call.publicKey);assert(key&&Number.isSafeInteger(key.access_key.nonce));if(index<5)assert.equal(key.access_key.permission,'FullAccess');else restrictedKey(key.access_key,c,call.publicKey);signed.push(await sign(call,BigInt(key.access_key.nonce)+1n,before.block.hash,wasm));}
 permitCheck(c,p,operation,now());assert(now()-Number(BigInt(before.block.timestamp_nanosec)/1000000n)<30000,'Stale signing observation');assert.equal(new Set(signed.map(x=>x.hash)).size,signed.length);
 const records=await Promise.all(signed.map((x,i)=>broadcastOnce(rpc,x,calls[i],journal)));
 const results=await Promise.all(records.map(x=>reconcile(rpc,x,journal,reconcileOptions)));
 assert(results.every(x=>x.raw?.final_execution_status==='FINAL'),'Uncertain outcome: stop without resubmission');assert(now()<Date.parse(p.expires_at),'Finality deadline reached');
 for(const result of results)completeReceipts(result.raw);
 for(const result of results){const role=Object.keys(c.accounts).find(k=>c.accounts[k]===result.call.signer);const key=before.keys[role].find(k=>k.public_key===result.call.publicKey);assert.equal(BigInt(result.raw.transaction.nonce),BigInt(key.access_key.nonce)+1n,'Returned nonce differs');}
 if(index<5)validateSplitReceipt(results[0].raw,calls[0],results[0].hash,wasm);
 const after=await readState(rpc,c,index>=1,results.map(x=>x.raw),now());expectedState(c,after,index+1);
 if(index<5)for(const role of ['recipient','attacker'])assert.equal(after.accounts[role].amount,before.accounts[role].amount,'Unrelated balance changed');
 if(index>=5){const agentAfter=await snapshot(rpc,c,{now:now()});assert(agentAfter.block_height>=after.block.height);verifyScenario(c,operation,agentBefore,agentAfter,results);}
 for(let i=0;i<results.length;i++){const row=budget.rows[prior.length+i];assert(fee(results[i].raw)<=BigInt(row.fee),'Actual fee exceeds allowance');}
 cumulativeLimit([...prior,...results].reduce((n,t)=>n+fee(t.raw)+amount(t.call),0n),budget.rows.slice(prior.length+results.length).reduce((n,r)=>n+BigInt(r.fee)+amount(r.call),0n));
 journal.record({stage:'verified-repair-operation',operation,plan_sha256:fingerprint(repairPlan(c)),transactions:results,after});return {result:'PASS',operation,transactions:results,after};
}
