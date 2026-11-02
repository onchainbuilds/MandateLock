import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {repairPlan,repairBudget,verifyRepairHistory,requireRepairRuntimeEvidence,HISTORY_HASHES} from '../initialization-repair.mjs';
import {deploymentPlan,scenario,WASM_SHA,UNIT} from '../plan.mjs';
const c=JSON.parse(readFileSync(new URL('../config.continuation.json',import.meta.url)));
const captured=JSON.parse(readFileSync(new URL('./fixtures/protocol-fees-88.json',import.meta.url)));
const accounts={owner:{amount:'4771540041850000000000000'},vault:{amount:'3998670503567516400000000'},agent:{amount:UNIT.toString()}};
test('repair splits existing vault deployment from immediate-parent direct initialization',()=>{
 const p=repairPlan(c);assert.equal(p.length,10);assert.equal(p[0].label,'5A');assert.equal(p[0].signer,c.accounts.vault);assert.deepEqual(p[0].actions,[{type:'DeployContract',sha256:WASM_SHA}]);
 assert.equal(p[1].label,'5B');assert.equal(p[1].signer,c.accounts.owner);assert.equal(p[1].receiver,c.accounts.vault);assert.deepEqual(p[1].actions,[{type:'FunctionCall',method:'new',args:{owner_id:c.accounts.owner},gas:'100000000000000',deposit:'0'}]);
 assert(!p.some(x=>x.actions.some(a=>a.type==='CreateAccount'||a.type==='Transfer')));
});
test('all remaining key grants, principal, mandate and five agent calls are unchanged',()=>{
 const p=repairPlan(c);const unlabel=x=>{const y={...x};delete y.label;return y;};
 assert.deepEqual(p.slice(2,5).map(unlabel),deploymentPlan(c).slice(5));
 assert.deepEqual(p.slice(5).map(unlabel),['authorized','direct-rejection','concurrency'].flatMap(n=>scenario(c,n)));
});
test('current creation-free repair retains failed fees and fits cap with separate signer reserves',()=>{
 const b=repairBudget(c,captured.protocol,captured.gas_price,159542,accounts);
 assert.equal(b.incurred,'5229789454582483600000000');assert.equal(b.remaining_fees,'166300000000000000000000');assert.equal(b.aggregate_bound,'7796089454582483600000000');
 assert(b.rows.every(r=>r.creation_count===0));assert.equal(b.rows[0].fee,'3700000000000000000000');assert.equal(b.rows[1].fee,'20300000000000000000000');
 assert.equal(b.owner_end_bound,'3710640041850000000000000');assert.equal(b.vault_before_fund_bound,'3994970503567516400000000');
});
test('repair rejects increased fees beyond cap and depleted owner or vault reserves',()=>{
 assert.throws(()=>repairBudget(c,captured.protocol,'1000000000',159542,accounts),/Gas price/);
 assert.throws(()=>repairBudget(c,captured.protocol,captured.gas_price,1595420000,accounts),/8 NEAR/);
 for(const role of ['owner','vault','agent']){const a=structuredClone(accounts);a[role].amount='1';assert.throws(()=>repairBudget(c,captured.protocol,captured.gas_price,159542,a),/reserve|storage/i);}
});
test('history cannot erase, reclassify or substitute failed deployment expenditure',()=>{
 // Synthetic fee fixtures; actual public-chain history is independently reconciled by the read-only script.
 const raws=HISTORY_HASHES.map((hash,i)=>({final_execution_status:'FINAL',transaction:{hash,signer_id:i===4?c.accounts.vault:c.accounts.owner,actions:i<4?[{Transfer:{deposit:[4n*UNIT,UNIT,UNIT/10n,UNIT/10n][i].toString()}}]:[]},status:i<4?{SuccessValue:''}:{Failure:{ActionError:{kind:{FunctionCallError:{ExecutionError:'Smart contract panicked: ERR_INITIAL_OWNER'}}}}},transaction_outcome:{outcome:{tokens_burnt:i<4?'7114989537500000000000':'1329496432483600000000'}},receipts_outcome:[{outcome:{tokens_burnt:'0'}}]}));
 verifyRepairHistory(raws,c);assert.throws(()=>verifyRepairHistory(raws.slice(0,4),c));
 const changed=structuredClone(raws);changed[4].status={SuccessValue:''};assert.throws(()=>verifyRepairHistory(changed,c));
 raws[4].transaction_outcome.outcome.tokens_burnt='0';assert.throws(()=>verifyRepairHistory(raws,c),/spending changed/);
});
test('unverified, partial, wrong-Wasm or nonfinal runtime evidence cannot unlock repair',()=>{
 const dir=mkdtempSync(join(tmpdir(),'mandatelock-init-evidence-')),file=join(dir,'result.json');
 try{for(const e of [{network:'local-sandbox',wasm_sha256:WASM_SHA,cases:[]},{network:'public-testnet',wasm_sha256:WASM_SHA,cases:[]},{network:'local-sandbox',wasm_sha256:'other',cases:[]},{network:'local-sandbox',wasm_sha256:WASM_SHA,cases:['vault-deploy-only','attacker-claims-parent','attacker-claims-self','vault-self-init','parent-init','repeat-parent-init'].map(id=>({id,status:'PASS',hash:'synthetic',finality:'EXECUTED_OPTIMISTIC'}))}]){writeFileSync(file,JSON.stringify(e));assert.throws(()=>requireRepairRuntimeEvidence(file));}}finally{rmSync(dir,{recursive:true});}
});
