import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {budgetForecast,checkBudgetPermit,checkDeploymentFunding,BOOTSTRAP_HASH} from '../budget.mjs';
import {fingerprint,UNIT,approval} from '../plan.mjs';
const base=JSON.parse(readFileSync(new URL('../config.fee-reviewed.json',import.meta.url)));
function fixture(){
 const c=structuredClone(base),e={send_sir:1,send_not_sir:1,execution:1};
 const costs={action_receipt_creation_config:e,action_creation_config:{create_account_cost:e,transfer_cost:e,deploy_contract_cost:e,deploy_contract_cost_per_byte:e,function_call_cost:e,function_call_cost_per_byte:e,add_key_cost:{full_access_cost:e,function_call_cost:e,function_call_cost_per_byte:e}}};
 c.networkReview.transaction_costs_sha256=fingerprint(costs);
 const protocol={chain_id:'testnet',protocol_version:88,runtime_config:{account_creation_charge:c.networkReview.account_creation_charge,storage_amount_per_byte:c.networkReview.storage_amount_per_byte,transaction_costs:costs}};
 const b=budgetForecast(c,protocol,'100000000',159542);
 const p={fee_model_version:2,account_creation_charge:c.networkReview.account_creation_charge,bootstrap_transaction_hash:BOOTSTRAP_HASH,authorized_starting_balance_near:'10',max_aggregate_outgoing_near:'8',plan_sha256:b.plan_sha256,max_fees_yocto:(UNIT/5n).toString()};
 const owner={amount:(10n*UNIT).toString(),locked:'0',code_hash:'11111111111111111111111111111111',storage_usage:182};
 return{c,protocol,b,p,owner};
}
test('authorized 10 NEAR grant passes with excess 2 NEAR owner reserve and all obligations',()=>{
 const{c,b,owner}=fixture();assert.equal(checkDeploymentFunding(c,'create-vault',b,owner,owner,10n**19n).excess_owner_reserve,(2n*UNIT).toString());
});
test('unexpected top-up or depletion is rejected despite the 10 NEAR grant',()=>{
 const{c,b,owner}=fixture();for(const delta of [-1n,1n]){const o={...owner,amount:(10n*UNIT+delta).toString()};assert.throws(()=>checkDeploymentFunding(c,'create-vault',b,o,o,10n**19n),/Unexpected owner balance/);}
});
test('ordered owner spending envelope subtracts prior transfers and permits only bounded gas loss',()=>{
 const{c,b,owner}=fixture();const o={...owner,amount:(6n*UNIT-BigInt(b.rows[0].fee)).toString()};checkDeploymentFunding(c,'create-agent',b,o,o,10n**19n);
 assert.throws(()=>checkDeploymentFunding(c,'create-agent',b,owner,owner,10n**19n),/Unexpected owner balance/);
});
test('signer storage, deployed owner code and locked balances retain fail-closed checks',()=>{
 const{c,b,owner}=fixture();for(const patch of [{storage_usage:4097},{code_hash:'unexpected'},{locked:'1'}]){const o={...owner,...patch};assert.throws(()=>checkDeploymentFunding(c,'create-vault',b,o,o,10n**19n));}
 const o={...owner,amount:(38n*UNIT/10n).toString()};const vault={amount:UNIT.toString(),locked:'0',storage_usage:182};
 // At deploy-init only 5.2 was transferred, leaving 4.8; use the exact prefix.
 o.amount=(48n*UNIT/10n).toString();assert.throws(()=>checkDeploymentFunding(c,'deploy-init',b,o,vault,10n**19n),/Signer cannot cover/);
});
test('outgoing envelope counts every requested payout, including expected rejected calls',()=>{
 const{b}=fixture();assert.equal(b.setup_transfers_deposits,(62n*UNIT/10n).toString());assert.equal(b.all_requested_payouts,(14n*UNIT/10n).toString());assert.equal(BigInt(b.outgoing_bound),76n*UNIT/10n+BigInt(b.fees));assert(BigInt(b.outgoing_bound)<8n*UNIT);
});
test('fee growth beyond aggregate outgoing cap is rejected before signing',()=>{
 const{c,protocol}=fixture();protocol.runtime_config.transaction_costs.action_receipt_creation_config={send_sir:10**15,send_not_sir:10**15,execution:10**15};c.networkReview.transaction_costs_sha256=fingerprint(protocol.runtime_config.transaction_costs);
 assert.throws(()=>budgetForecast(c,protocol,'100000000',159542),/outgoing/);
});
test('bootstrap, plan, fee and outgoing-cap approval bindings cannot be substituted',()=>{
 const{c,b,p}=fixture();checkBudgetPermit(c,p,b);
 for(const patch of [{bootstrap_transaction_hash:'wrong'},{authorized_starting_balance_near:'11'},{max_aggregate_outgoing_near:'10'},{plan_sha256:'changed'},{max_fees_yocto:'0'}])assert.throws(()=>checkBudgetPermit(c,{...p,...patch},b));
});
test('revised permit remains disabled and deadline is still enforced',()=>{
 const p=JSON.parse(readFileSync(new URL('../approval.fee-reviewed.json',import.meta.url)));const before=Date.parse(p.latest_submission_at)-1;
 assert.equal(p.approved,false);assert.throws(()=>approval(base,p,'authorized',before),/approval/);approval(base,{...p,approved:true},'authorized',before);
 assert.throws(()=>approval(base,{...p,approved:true},'authorized',Date.parse(p.expires_at)),/expired/);
 assert.throws(()=>approval(base,{...p,approved:true},'authorized',Date.parse(p.latest_submission_at)),/cutoff/);
 assert.throws(()=>approval(base,{...p,approved:true},'create-vault',Date.parse(p.latest_start_at)),/cutoff/);
});
