// Planning and read-only verification only. Deliberately no execution entry point.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deploymentPlan,scenario,fn,WASM_SHA,fingerprint,UNIT} from './plan.mjs';
import {priceCalls} from './budget.mjs';
export const INCURRED=5229789454582483600000000n;
export const HISTORY_HASHES=['5fRzq57MiNqMjkNiAsmTcrofEuUcp4roL1XCNYTpTDtV','4mxWFevbqohTK4RERAsHPHYKu4dB7eARq8JdHuqeMKrk','FbM4BTPborSUWLL6GVbsJ75csqTz3o3bANwmuMmWjyH4','J6sMAMgiGzuf6ZkGxZYtDe9813fvp6mWBPsqw8yqyzqM','7drvA54gJDQcBBMbY7qfygwbzNTJZSRcBTgNmktP7e3b'];
export function repairPlan(c){
 const old=deploymentPlan(c);
 return [
  {id:'deploy-only',label:'5A',signer:c.accounts.vault,receiver:c.accounts.vault,actions:[{type:'DeployContract',sha256:WASM_SHA}]},
  {id:'initialize-owner',label:'5B',signer:c.accounts.owner,receiver:c.accounts.vault,actions:[fn('new',{owner_id:c.accounts.owner})]},
  ...old.slice(5).map((x,i)=>({...x,label:String(i+6)})),
  ...['authorized','direct-rejection','concurrency'].flatMap(n=>scenario(c,n)).map((x,i)=>({...x,label:String(i+9)}))
 ];
}
export function verifyRepairHistory(raws,c){
 assert.equal(raws.length,5);let incurred=0n;
 for(const[r,i]of raws.map((r,i)=>[r,i])){
  assert.equal(r.final_execution_status,'FINAL');assert.equal(r.transaction.hash,HISTORY_HASHES[i]);
  assert.equal(r.transaction.signer_id,i===4?c.accounts.vault:c.accounts.owner);
  if(i<4)assert(Object.hasOwn(r.status,'SuccessValue'));else assert.equal(r.status.Failure?.ActionError?.kind?.FunctionCallError?.ExecutionError,'Smart contract panicked: ERR_INITIAL_OWNER');
  assert(r.receipts_outcome.length>0);
  incurred+=[r.transaction_outcome,...r.receipts_outcome].reduce((n,x)=>n+BigInt(x.outcome.tokens_burnt),0n);
  incurred+=r.transaction.actions.reduce((n,a)=>n+BigInt(a.Transfer?.deposit??a.FunctionCall?.deposit??0),0n);
 }
 assert.equal(incurred,INCURRED,'Historical spending changed');return incurred;
}
export function repairBudget(c,protocol,gasPrice,wasmBytes,accounts){
 const calls=repairPlan(c),rows=priceCalls(c,calls,protocol,gasPrice,wasmBytes);
 const deposits=rows.reduce((n,r)=>n+BigInt(r.attached),0n),fees=rows.reduce((n,r)=>n+BigInt(r.fee),0n);
 const payouts=calls.flatMap(t=>t.actions).filter(a=>a.method==='execute_payment').reduce((n,a)=>n+BigInt(a.args.amount),0n);
 const bound=INCURRED+deposits+payouts+fees;assert(bound<=8n*UNIT,'Repair exceeds 8 NEAR outgoing cap');
 const sumFees=role=>rows.filter(r=>r.call.signer===c.accounts[role]).reduce((n,r)=>n+BigInt(r.fee),0n);
 const byteCost=BigInt(protocol.runtime_config.storage_amount_per_byte),ordinary=4096n*byteCost,vaultFloor=256000n*byteCost+UNIT/100n;
 const ownerEnd=BigInt(accounts.owner.amount)-deposits-sumFees('owner');assert(ownerEnd>=2n*UNIT+ordinary,'Owner reserves insufficient');
 const vaultPreFund=BigInt(accounts.vault.amount)-sumFees('vault');assert(vaultPreFund>=vaultFloor,'Vault storage/operating reserve insufficient');
 const agentEnd=BigInt(accounts.agent.amount)-sumFees('agent');assert(agentEnd>=ordinary,'Agent storage/fees insufficient');
 return {plan_sha256:fingerprint(calls),rows,incurred:INCURRED.toString(),remaining_deposits:deposits.toString(),remaining_requested_payouts:payouts.toString(),remaining_fees:fees.toString(),remaining_bound:(deposits+payouts+fees).toString(),aggregate_bound:bound.toString(),headroom:(8n*UNIT-bound).toString(),owner_end_bound:ownerEnd.toString(),owner_fee_bound:sumFees('owner').toString(),vault_fee_bound:sumFees('vault').toString(),agent_fee_bound:sumFees('agent').toString(),vault_before_fund_bound:vaultPreFund.toString(),vault_expected_end_bound:(vaultPreFund+UNIT-9n*UNIT/10n).toString(),vault_storage_operating_bound:vaultFloor.toString(),agent_end_bound:agentEnd.toString(),ordinary_storage_bound:ordinary.toString()};
}
export function requireRepairRuntimeEvidence(path){
 const e=JSON.parse(readFileSync(path));assert.equal(e.wasm_sha256,WASM_SHA);assert.equal(e.network,'local-sandbox');
 for(const id of ['vault-deploy-only','attacker-claims-parent','attacker-claims-self','vault-self-init','parent-init','repeat-parent-init'])assert.equal(e.cases?.find(x=>x.id===id)?.status,'PASS','Missing successful production-Wasm runtime evidence: '+id);
 assert(e.cases.every(x=>x.hash&&x.finality==='FINAL'),'Actual finalized sandbox hashes required');
}
