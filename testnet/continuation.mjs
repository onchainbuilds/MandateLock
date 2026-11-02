// Read-only continuation checks. No signing, broadcast or journal rewriting.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {validateConfig,deploymentPlan,COMPLETED_HASHES,UNIT} from './plan.mjs';
export function verifyCompletedJournals(c,dir){
 validateConfig(c,{ready:true});assert(c.continuation);
 return deploymentPlan(c).slice(0,3).map((call,i)=>{
  const lines=readFileSync(resolve(dir,call.id+'.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const signed=lines.filter(x=>x.stage==='signed-before-broadcast');assert.equal(signed.length,1,'Exactly one original submission claim required');
  assert.equal(signed[0].hash,COMPLETED_HASHES[i],'Completed hash changed');
  assert(lines.some(x=>x.stage==='verified-deployment-step'&&x.step===call.id&&x.hash===COMPLETED_HASHES[i]),'Completed transaction not verified');
  const raw=lines.find(x=>x.stage==='observation'&&x.raw?.final_execution_status==='FINAL'&&x.hash===COMPLETED_HASHES[i])?.raw;
  assert(raw&&Object.hasOwn(raw.status,'SuccessValue'),'Completed outcome uncertain');
  assert.equal(raw.transaction.hash,COMPLETED_HASHES[i]);assert.equal(raw.transaction.signer_id,call.signer);assert.equal(raw.transaction.receiver_id,call.receiver);
  assert(raw.receipts_outcome.length>0&&raw.receipts_outcome.every(x=>!x.outcome.status.Failure),'Completed receipt failure');
  return raw;
 });
}
export function continuationBudget(b,completed){
 assert.equal(completed.length,3);
 let actual=0n;
 for(let i=0;i<3;i++){
  const raw=completed[i];assert.equal(raw.final_execution_status,'FINAL');assert.equal(raw.transaction.hash,COMPLETED_HASHES[i]);assert(Object.hasOwn(raw.status,'SuccessValue'));
  const fee=[raw.transaction_outcome,...raw.receipts_outcome].reduce((n,x)=>n+BigInt(x.outcome.tokens_burnt),0n);
  assert(fee<=BigInt(b.rows[i].fee),'Completed fee exceeds reviewed bound');actual+=BigInt(b.rows[i].attached)+fee;
 }
 assert.equal(actual,5121344968612500000000000n,'Completed outgoing changed');
 const fees=b.rows.slice(3).reduce((n,r)=>n+BigInt(r.fee),0n),deposits=b.rows.slice(3).reduce((n,r)=>n+BigInt(r.attached),0n);
 const remaining=fees+deposits+BigInt(b.all_requested_payouts),total=actual+remaining;
 assert(total<=8n*UNIT,'Continuation exceeds 8 NEAR cap');
 return {actual_outgoing:actual.toString(),remaining_deposits:deposits.toString(),remaining_requested_payments:b.all_requested_payouts,remaining_fee_bound:fees.toString(),remaining_bound:remaining.toString(),aggregate_bound:total.toString(),headroom:(8n*UNIT-total).toString()};
}
