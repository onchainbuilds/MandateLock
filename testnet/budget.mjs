import assert from 'node:assert/strict';
import {deploymentPlan,scenario,fingerprint,UNIT} from './plan.mjs';
import {checkReviewedNetwork} from './network-guard.mjs';
export const BOOTSTRAP_HASH='HhF51drrwKbaauC1MQLqpPjFUcHXHzvCvX9qzAvvoAjQ';
export const STARTING_BALANCE=10n*UNIT,OUTGOING_CAP=8n*UNIT;
export const callsFor=c=>[...deploymentPlan(c),...['authorized','direct-rejection','concurrency'].flatMap(n=>scenario(c,n))];
export const attached=tx=>tx.actions.reduce((n,a)=>n+BigInt(a.deposit??0),0n);
export function priceCalls(c,calls,protocol,gasPrice,wasmBytes){
 checkReviewedNetwork(c,protocol,gasPrice);
 const creationCharge=BigInt(protocol.runtime_config.account_creation_charge);
 const f=protocol.runtime_config.transaction_costs,a=f.action_creation_config;
 const cost=(e,bytes=1)=>(BigInt(e.send_sir)>BigInt(e.send_not_sir)?BigInt(e.send_sir):BigInt(e.send_not_sir))*BigInt(bytes)+BigInt(e.execution)*BigInt(bytes);
 const rows=calls.map((tx,i)=>{
  let gas=cost(f.action_receipt_creation_config),creations=0;
  for(const x of tx.actions)switch(x.type){
   case 'CreateAccount':gas+=cost(a.create_account_cost);creations++;break;
   case 'Transfer':gas+=cost(a.transfer_cost);break;
   case 'AddFullAccessKey':gas+=cost(a.add_key_cost.full_access_cost);break;
   case 'AddFunctionCallKey':gas+=cost(a.add_key_cost.function_call_cost)+cost(a.add_key_cost.function_call_cost_per_byte,Buffer.byteLength(x.receiver+x.methods.join(''))+256);break;
   case 'DeployContract':gas+=cost(a.deploy_contract_cost)+cost(a.deploy_contract_cost_per_byte,wasmBytes);break;
   case 'FunctionCall':gas+=BigInt(x.gas)+cost(a.function_call_cost)+cost(a.function_call_cost_per_byte,Buffer.byteLength(x.method+JSON.stringify(x.args)));break;
   default:throw Error('Unpriced action');
  }
  const gasFee=((gas*2n+10n**12n-1n)/10n**12n)*10n**12n*BigInt(gasPrice);
  // The fixed creation charge is denominated in yoctoNEAR, not ordinary gas-price units.
  // Retain the full doubled gas allowance as conservative headroom: this is a bound,
  // not an exact reproduction of how the runtime collects the charge through gas.
  const creationFees=BigInt(creations)*creationCharge,fee=gasFee+creationFees;
  return {number:i+1,call:tx,attached:attached(tx).toString(),gas_fee_bound:gasFee.toString(),creation_count:creations,creation_charge_total:creationFees.toString(),fee:fee.toString()};
 });
 return rows;
}
export function budgetForecast(c,protocol,gasPrice,wasmBytes){
 const calls=callsFor(c),rows=priceCalls(c,calls,protocol,gasPrice,wasmBytes);
 const creationCharge=BigInt(protocol.runtime_config.account_creation_charge);
 const deposits=rows.reduce((n,r)=>n+BigInt(r.attached),0n);
 // Count every requested payment, including the two expected rejections, conservatively.
 const payments=calls.flatMap(t=>t.actions).filter(x=>x.type==='FunctionCall'&&x.method==='execute_payment').reduce((n,x)=>n+BigInt(x.args.amount),0n);
 const fees=rows.reduce((n,r)=>n+BigInt(r.fee),0n),bound=deposits+payments+fees;
 assert(bound<=OUTGOING_CAP,'Aggregate outgoing transfers/deposits plus fees exceed 8 NEAR');
 return {fee_model_version:2,account_creation_charge:creationCharge.toString(),plan_sha256:fingerprint(calls),rows,setup_transfers_deposits:deposits.toString(),all_requested_payouts:payments.toString(),gas_fees:rows.reduce((n,r)=>n+BigInt(r.gas_fee_bound),0n).toString(),creation_charges:rows.reduce((n,r)=>n+BigInt(r.creation_charge_total),0n).toString(),fees:fees.toString(),outgoing_bound:bound.toString(),cap:OUTGOING_CAP.toString(),headroom:(OUTGOING_CAP-bound).toString()};
}
export function checkBudgetPermit(c,p,b){
 assert.equal(p.fee_model_version,2,'Corrected fee-model approval required');
 assert.equal(p.account_creation_charge,b.account_creation_charge,'Creation charge not bound to approval');
 assert.equal(b.plan_sha256,fingerprint(callsFor(c)),'Budget does not match configured calls');
 assert.equal(p.bootstrap_transaction_hash,BOOTSTRAP_HASH,'Verified bootstrap binding required');
 assert.equal(p.authorized_starting_balance_near,'10');assert.equal(p.max_aggregate_outgoing_near,'8');
 assert.equal(p.plan_sha256,b.plan_sha256,'Exact 13-transaction plan changed');
 assert(BigInt(b.fees)<=BigInt(p.max_fees_yocto),'Fee envelope exceeds approval');
 assert(BigInt(b.outgoing_bound)<=OUTGOING_CAP);
}
export function checkDeploymentFunding(c,step,b,owner,signer,byteCost){
 const index=b.rows.findIndex(r=>r.call.id===step);assert(index>=0&&index<8);
 const before=b.rows.slice(0,index),remaining=b.rows.slice(index);
 const owned=rs=>rs.filter(r=>r.call.signer===c.accounts.owner);
 const sum=(rs,field)=>rs.reduce((n,r)=>n+BigInt(r[field]),0n);
 const expected=STARTING_BALANCE-sum(owned(before),'attached');
 const ownerAmount=BigInt(owner.amount);
 assert(ownerAmount<=expected&&ownerAmount>=expected-sum(owned(before),'fee'),'Unexpected owner balance relative to authorized grant and ordered spending');
 assert.equal(owner.locked,'0');assert.equal(owner.code_hash,'11111111111111111111111111111111','Owner must remain undeployed');
 assert(owner.storage_usage<=4096,'Owner storage exceeds reviewed bound');
 const ordinary=4096n*BigInt(byteCost),vault=256000n*BigInt(byteCost)+UNIT/100n;
 // Keep the excess 2 NEAR at the owner, as well as all remaining setup obligations and storage.
 assert(ownerAmount>=2n*UNIT+ordinary+sum(owned(remaining),'attached')+sum(owned(remaining),'fee'),'Owner reserve/remaining obligations underfunded');
 const id=b.rows[index].call.signer,ownRemaining=remaining.filter(r=>r.call.signer===id);
 const limit=id===c.accounts.vault?256000:4096;
 assert(Number.isSafeInteger(signer.storage_usage)&&signer.storage_usage>=0&&signer.storage_usage<=limit,'Signer storage outside reviewed bound');
 assert.equal(signer.locked,'0');
 assert(BigInt(signer.amount)>=(id===c.accounts.vault?vault:ordinary)+sum(ownRemaining,'attached')+sum(ownRemaining,'fee'),'Signer cannot cover storage and remaining transfers/fees');
 return {owner_expected_max:expected.toString(),owner_amount:owner.amount,excess_owner_reserve:(2n*UNIT).toString(),outgoing_bound:b.outgoing_bound};
}
