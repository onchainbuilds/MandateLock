// Fail-closed split execution primitives. Transport and signing are injected by the operator CLI.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {repairPlan,verifyRepairHistory,HISTORY_HASHES,INCURRED} from './initialization-repair.mjs';
import {hash,WASM_SHA,UNIT,fingerprint} from './plan.mjs';

export function historicalJournal(c,directory){
 const ids=['create-vault','create-agent','create-recipient','create-attacker','deploy-init'];
 const raws=ids.map((id,i)=>{
  const lines=readFileSync(join(directory,id+'.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const signed=lines.filter(x=>x.stage==='signed-before-broadcast');
  assert.equal(signed.length,1);assert.equal(signed[0].hash,HISTORY_HASHES[i]);
  const raw=lines.find(x=>x.stage==='observation'&&x.raw?.final_execution_status==='FINAL')?.raw;
  assert(raw,'Missing historical FINAL outcome');return raw;
 });
 verifyRepairHistory(raws,c);return raws;
}
export function splitApproval(c,p,step,now=Date.now()){
 assert(p.approved===true&&p.execution_ready===true,'Split execution approval disabled');
 assert.equal(p.network,'testnet');assert.equal(p.config_sha256,fingerprint(c));
 assert.equal(p.plan_sha256,fingerprint(repairPlan(c)));assert.equal(p.wasm_sha256,WASM_SHA);
 assert.deepEqual(p.historical_hashes,HISTORY_HASHES);assert.equal(p.incurred_yocto,INCURRED.toString());
 assert.equal(p.max_aggregate_outgoing_near,'8');
 assert(repairPlan(c).some(x=>x.id===step),'Historical/unknown operation forbidden');
 assert(now<Date.parse(p.latest_submission_at)&&now<Date.parse(p.expires_at),'Deadline reached');
 if(step==='deploy-only')assert(now<Date.parse(p.latest_start_at),'Start deadline reached');
}
export function validateSplitReceipt(raw,call,expectedHash,wasm){
 assert.equal(raw?.final_execution_status,'FINAL');
 const t=raw.transaction;assert.equal(t.hash,expectedHash);assert.equal(t.signer_id,call.signer);
 assert.equal(t.receiver_id,call.receiver);assert.equal(t.public_key,call.publicKey);
 assert.equal(t.actions.length,call.actions.length);assert(raw.status.SuccessValue!==undefined);
 for(let i=0;i<call.actions.length;i++){
  const want=call.actions[i],got=t.actions[i];
  if(want.type==='DeployContract'){assert.equal(hash(wasm),WASM_SHA);const code=Buffer.from(got.DeployContract.code,'base64');assert.equal(code.length===32?code.toString('hex'):hash(code),WASM_SHA);}
  else if(want.type==='FunctionCall'){
   const f=got.FunctionCall;assert.equal(f.method_name,want.method);assert.equal(String(f.gas),want.gas);assert.equal(f.deposit,want.deposit);
   assert.deepEqual(JSON.parse(Buffer.from(f.args,'base64')),want.args);
  }else if(want.type==='AddFunctionCallKey'){
   const key=got.AddKey;assert.equal(key.public_key,want.publicKey);assert.deepEqual(key.access_key.permission,{FunctionCall:{allowance:want.allowance,receiver_id:want.receiver,method_names:want.methods}});
  }else throw Error('Unsupported split action');
 }
 assert(raw.receipts_outcome?.length>0,'Missing receipts');
 completeReceipts(raw);
 assert(raw.receipts_outcome.every(r=>r.outcome.status.SuccessValue!==undefined||r.outcome.status.SuccessReceiptId!==undefined),'Failed or unknown receipt');
 const receipt=raw.receipts?.find(r=>r.receiver_id===call.receiver&&r.predecessor_id===call.signer&&r.receipt?.Action?.signer_id===call.signer);
 if(call.signer===call.receiver){assert.equal(raw.transaction_outcome.outcome.executor_id,call.receiver);assert(raw.transaction_outcome.outcome.status.SuccessValue!==undefined||raw.transaction_outcome.outcome.status.SuccessReceiptId!==undefined);}
 else {assert(receipt,'Missing direct signer/predecessor receipt');assert.deepEqual(receipt.receipt.Action.actions,t.actions);assert.equal(receipt.receipt.Action.signer_public_key,call.publicKey);assert(raw.receipts_outcome.some(r=>r.id===receipt.receipt_id&&r.outcome.executor_id===call.receiver),'Receipt outcome missing');}
}
export function completeReceipts(raw){
 assert.equal(raw?.final_execution_status,'FINAL');assert(raw.receipts_outcome?.length>0,'Missing receipts');
 const ids=new Set(raw.receipts_outcome.map(x=>x.id));assert.equal(ids.size,raw.receipts_outcome.length);
 for(const item of [raw.transaction_outcome,...raw.receipts_outcome]){
  assert(Array.isArray(item.outcome.receipt_ids),'Missing receipt links');
  for(const id of item.outcome.receipt_ids)assert(ids.has(id),'Incomplete receipt graph');
 }
}
export function validateSplitState(c,step,state){
 assert.equal(state.wasm_sha256,WASM_SHA);assert(state.pinned_after_receipts===true);
 if(step==='deploy-only')assert.deepEqual(state.values,[],'Unexpected initialized state');
 else {
  assert.equal(step,'initialize-owner');assert.equal(state.owner_id,c.accounts.owner);
  for(const k of ['budget','available','pending','spent','unallocated','last_mandate_id'])assert.equal(state.accounting[k],'0');
  assert(BigInt(state.accounting.account_balance)>=BigInt(state.accounting.storage_and_operating_floor));
 }
}
export function cumulativeLimit(actualNew,remaining){
 assert(BigInt(actualNew)>=0n&&BigInt(remaining)>=0n);
 const total=INCURRED+BigInt(actualNew)+BigInt(remaining);assert(total<=8n*UNIT,'8 NEAR cap exceeded');return total;
}
