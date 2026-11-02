import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {budgetForecast,checkBudgetPermit,checkDeploymentFunding} from '../budget.mjs';
import {checkReviewedNetwork} from '../network-guard.mjs';
import {fingerprint,UNIT} from '../plan.mjs';
const capture=JSON.parse(readFileSync(new URL('./fixtures/protocol-fees-88.json',import.meta.url)));
const c=JSON.parse(readFileSync(new URL('../config.fee-reviewed.json',import.meta.url)));
const permit=JSON.parse(readFileSync(new URL('../approval.fee-reviewed.json',import.meta.url)));
const forecast=(config=c,protocol=capture.protocol)=>budgetForecast(config,protocol,capture.gas_price,159542);

test('captured protocol creation charge is included for all four creations and covers real bootstrap fees',()=>{
 const b=forecast(),charge=BigInt(capture.protocol.runtime_config.account_creation_charge);
 assert.equal(charge,7n*UNIT/1000n);assert.equal(b.creation_charges,(4n*charge).toString());
 for(const r of b.rows.slice(0,4)){
  assert.equal(r.creation_count,1);assert.equal(r.creation_charge_total,charge.toString());assert.equal(r.fee,'8700000000000000000000');
  assert(BigInt(r.fee)>BigInt(capture.bootstrap_reference.total_tokens_burnt));
  assert(BigInt(r.gas_fee_bound)<BigInt(capture.bootstrap_reference.total_tokens_burnt),'Old gas-only bound must expose regression');
 }
 for(const r of b.rows.slice(4)){assert.equal(r.creation_count,0);assert.equal(r.creation_charge_total,'0');assert.equal(r.fee,r.gas_fee_bound);}
 assert.equal(b.gas_fees,'173000000000000000000000');assert.equal(b.fees,'201000000000000000000000');
 assert.equal(b.outgoing_bound,'7801000000000000000000000');assert.equal(b.headroom,'199000000000000000000000');
});
test('observed bootstrap-sized fee passes next-step owner check while the old .0017 bound fails',()=>{
 const b=forecast(),owner={amount:(6n*UNIT-BigInt(capture.bootstrap_reference.total_tokens_burnt)).toString(),locked:'0',code_hash:'11111111111111111111111111111111',storage_usage:182};
 checkDeploymentFunding(c,'create-agent',b,owner,owner,capture.protocol.runtime_config.storage_amount_per_byte);
 const old=structuredClone(b);old.rows[0].fee='1700000000000000000000';assert.throws(()=>checkDeploymentFunding(c,'create-agent',old,owner,owner,capture.protocol.runtime_config.storage_amount_per_byte),/Unexpected owner balance/);
});
test('creation charge changes fail despite an unchanged action-fee digest',()=>{
 const p=structuredClone(capture.protocol);p.runtime_config.account_creation_charge='8000000000000000000000';
 assert.equal(fingerprint(p.runtime_config.transaction_costs),c.networkReview.transaction_costs_sha256);
 assert.throws(()=>checkReviewedNetwork(c,p,capture.gas_price),/creation charge changed/);
});
test('missing or zero creation charge cannot silently fall back to gas-only pricing',()=>{
 for(const value of [undefined,'0']){
  const config=structuredClone(c),p=structuredClone(capture.protocol);config.networkReview.account_creation_charge=value;p.runtime_config.account_creation_charge=value;
  assert.throws(()=>forecast(config,p),/creation charge required/);
 }
});
test('higher reviewed creation charges alone can exceed and reject the 8 NEAR aggregate cap',()=>{
 const config=structuredClone(c),p=structuredClone(capture.protocol);config.networkReview.account_creation_charge=(6n*UNIT/100n).toString();p.runtime_config.account_creation_charge=config.networkReview.account_creation_charge;
 assert.throws(()=>forecast(config,p),/exceed 8 NEAR/);
});
test('old fee permit is rejected and corrected permit binds model, charge, exact plan and cap',()=>{
 const b=forecast();checkBudgetPermit(c,permit,b);assert.equal(permit.approved,false);
 assert.throws(()=>checkBudgetPermit(c,{...permit,max_fees_yocto:'173000000000000000000000'},b),/Fee envelope/);
 assert.throws(()=>checkBudgetPermit(c,{...permit,fee_model_version:1},b),/fee-model/);
 assert.throws(()=>checkBudgetPermit(c,{...permit,account_creation_charge:'0'},b),/Creation charge/);
});
