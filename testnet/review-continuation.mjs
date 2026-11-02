// Explicitly read-only RPC capability and continuation audit. No credential loading.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fingerprint,executionFingerprint,frozenWasm,deploymentPlan,COMPLETED_HASHES,UNIT} from './plan.mjs';
import {budgetForecast,checkBudgetPermit,checkDeploymentFunding} from './budget.mjs';
import {verifyCompletedJournals,continuationBudget} from './continuation.mjs';
const c=JSON.parse(readFileSync('testnet/config.continuation.json')),p=JSON.parse(readFileSync('testnet/approval.continuation.json'));
assert.equal(p.approved,false,'Review must not enable execution');
const dir='artifacts/phase4-continuation';mkdirSync(dir,{recursive:true});
const out={started_at:new Date().toISOString(),rpc:c.rpc,config_sha256:fingerprint(c),reads:[]};
const save=()=>writeFileSync(`${dir}/review.json`,JSON.stringify(out,null,2)+'\n',{flush:true});
async function rpc(method,params){
 assert(['status','block','query','EXPERIMENTAL_protocol_config','gas_price','tx','EXPERIMENTAL_tx_status'].includes(method),'Read-only methods only');
 const response=await fetch(c.rpc,{method:'POST',headers:{'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(20000),body:JSON.stringify({jsonrpc:'2.0',id:'continuation-read-only',method,params})});
 const raw=await response.json();out.reads.push({method,params,http_status:response.status,raw});save();assert(response.ok,'HTTP error');return raw;
}
async function result(method,params){const raw=await rpc(method,params);assert(!raw.error&&raw.result,'RPC result unavailable');return raw.result;}
try{
 const wasm=frozenWasm(c);out.wasm_bytes=wasm.length;
 const historical=verifyCompletedJournals(c,`artifacts/phase4/live/${executionFingerprint(c)}`);
 assert.equal((await result('status',{})).chain_id,'testnet');
 const block=(await result('block',{finality:'final'})).header;out.block=block;
 assert(Math.abs(Date.now()-Number(BigInt(block.timestamp_nanosec)/1000000n))<60000,'Stale finalized block');
 const protocol=await result('EXPERIMENTAL_protocol_config',{block_id:block.hash}),price=await result('gas_price',{block_id:block.hash});
 const b=budgetForecast(c,protocol,price.gas_price,wasm.length);checkBudgetPermit(c,p,b);out.budget=b;
 out.transactions=[];
 for(let i=0;i<3;i++){
  const params={tx_hash:COMPLETED_HASHES[i],sender_account_id:c.accounts.owner,wait_until:'FINAL'};
  const raw=await result('tx',params);assert.equal(raw.final_execution_status,'FINAL');
  assert.deepEqual(raw.transaction,historical[i].transaction);assert.deepEqual(raw.status,historical[i].status);
  const core=x=>({id:x.id,block_hash:x.block_hash,outcome:x.outcome});
  assert.deepEqual(core(raw.transaction_outcome),core(historical[i].transaction_outcome));
  assert.deepEqual(raw.receipts_outcome.map(core),historical[i].receipts_outcome.map(core));
  out.transactions.push(raw);
 }
 // The installed adapter polls this alias; verify it separately without sending.
 const alias=await result('EXPERIMENTAL_tx_status',{tx_hash:COMPLETED_HASHES[2],sender_account_id:c.accounts.owner,wait_until:'FINAL'});
 assert.equal(alias.final_execution_status,'FINAL');assert.equal(alias.transaction.hash,COMPLETED_HASHES[2]);
 out.accounts={};out.keys={};out.access_keys={};
 for(const [role,account_id]of Object.entries(c.accounts)){
  const raw=await rpc('query',{request_type:'view_account',account_id,block_id:block.hash});
  if(role==='attacker'){assert.equal(raw.error?.cause?.name,'UNKNOWN_ACCOUNT','Attacker unexpectedly exists');continue;}
  assert(raw.result);const a=raw.result;out.accounts[role]=a;
  assert.equal(a.block_hash,block.hash);assert.equal(a.code_hash,'11111111111111111111111111111111','Unexpected deployed contract');assert.equal(a.locked,'0');assert.equal(a.storage_usage,182);
  const key=c.publicKeys[role==='agent'?'agentAdmin':role];
  const list=await result('query',{request_type:'view_access_key_list',account_id,block_id:block.hash});out.keys[role]=list;
  assert.equal(list.block_hash,block.hash);assert.equal(list.keys.length,1);assert.equal(list.keys[0].public_key,key);assert.equal(list.keys[0].access_key.permission,'FullAccess');
  const access=await result('query',{request_type:'view_access_key',account_id,public_key:key,block_id:block.hash});out.access_keys[role]=access;
  assert.equal(access.block_hash,block.hash);assert.deepEqual(list.keys[0].access_key,{nonce:access.nonce,permission:access.permission});
 }
 const previous=JSON.parse(readFileSync('artifacts/phase4-live-run/result.json'));
 for(const[role,a]of Object.entries(out.accounts))assert.equal(a.amount,previous.accounts[c.accounts[role]].amount,'Unexpected balance change');
 const last=historical[2].transaction.nonce;assert.equal(out.access_keys.owner.nonce,last,'Unexpected owner key use');
 out.continuation_budget=continuationBudget(b,out.transactions);
 out.funding=checkDeploymentFunding(c,'create-attacker',b,out.accounts.owner,out.accounts.owner,protocol.runtime_config.storage_amount_per_byte);
 const floor=4096n*BigInt(protocol.runtime_config.storage_amount_per_byte);
 const feeFor=role=>b.rows.slice(3).filter(r=>r.call.signer===c.accounts[role]).reduce((n,r)=>n+BigInt(r.fee),0n);
 assert(BigInt(out.accounts.vault.amount)>=256000n*BigInt(protocol.runtime_config.storage_amount_per_byte)+UNIT/100n+feeFor('vault'));
 assert(BigInt(out.accounts.agent.amount)>=floor+feeFor('agent'));
 out.reserves={ordinary_storage_bound:floor.toString(),vault_storage_and_operating_bound:(256000n*BigInt(protocol.runtime_config.storage_amount_per_byte)+UNIT/100n).toString(),owner_fee_bound:feeFor('owner').toString(),vault_fee_bound:feeFor('vault').toString(),agent_fee_bound:feeFor('agent').toString()};
 assert(Date.now()<Date.parse(p.latest_start_at),'Start deadline reached');assert(BigInt(c.expiresAtNs)>BigInt(block.timestamp_nanosec)+600000000000n);
 out.deadlines={start:p.latest_start_at,submission:p.latest_submission_at,final:p.expires_at,mandate_expiry_ns:c.expiresAtNs};
 out.result='PASS';out.completed_at=new Date().toISOString();save();
 console.log(JSON.stringify({result:out.result,block:block.height,balances:Object.fromEntries(Object.entries(out.accounts).map(([r,a])=>[r,a.amount])),budget:out.continuation_budget,reserves:out.reserves},null,2));
}catch(e){out.result='UNVERIFIED / STOP';out.error=e.message;save();throw e;}
