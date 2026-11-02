import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkReviewedNetwork} from '../network-guard.mjs';
import {fingerprint,approval} from '../plan.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {requireAgentCredentialPath} from '../sdk.mjs';
test('changed protocol, action fees, storage cost or gas ceiling stops deployment before signing',()=>{
 const p={chain_id:'testnet',protocol_version:88,runtime_config:{account_creation_charge:'7000000000000000000000',storage_amount_per_byte:'10000000000000000000',transaction_costs:{test_fixture:1}}};
 const c={networkReview:{protocol_version:88,account_creation_charge:p.runtime_config.account_creation_charge,storage_amount_per_byte:p.runtime_config.storage_amount_per_byte,transaction_costs_sha256:fingerprint(p.runtime_config.transaction_costs),max_gas_price:'100000000'}};
 checkReviewedNetwork(c,p,'100000000');
 assert.throws(()=>checkReviewedNetwork(c,p,'100000001'));
 assert.throws(()=>checkReviewedNetwork(c,{...p,protocol_version:89},'100000000'));
 assert.throws(()=>checkReviewedNetwork(c,{...p,runtime_config:{...p.runtime_config,storage_amount_per_byte:'2'}},'100000000'));
 assert.throws(()=>checkReviewedNetwork(c,{...p,runtime_config:{...p.runtime_config,transaction_costs:{test_fixture:2}}},'100000000'));
});
test('agent path guard refuses operator files before any credential content is read',()=>{
 const root=mkdtempSync(join(tmpdir(),'mandatelock-custody-'));try{
  const agent=join(root,'agent'),operator=join(root,'operator');mkdirSync(agent);mkdirSync(operator);
  const allowed=join(agent,'agent-0.secret.json'),denied=join(operator,'vault.secret.json');writeFileSync(allowed,'not a credential');writeFileSync(denied,'not a credential');
  assert.equal(requireAgentCredentialPath(allowed,agent,0),allowed);assert.throws(()=>requireAgentCredentialPath(denied,agent,0),/before reading/);
 }finally{rmSync(root,{recursive:true});}
});
test('reviewed execution refuses a changed dependency lock before signing',()=>{
 const c=JSON.parse(readFileSync(new URL('../config.reviewed.json',import.meta.url)));
 const p=JSON.parse(readFileSync(new URL('../approval.reviewed.json',import.meta.url)));
 const now=Date.parse(p.expires_at)-1000;
 approval(c,{...p,approved:true},'authorized',now); // In-memory unit fixture only, never persisted or executed.
 assert.throws(()=>approval(c,{...p,approved:true,dependency_lock_sha256:'changed'},'authorized',now),/dependency lock/);
});
