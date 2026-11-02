import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {executeOperation,ORDER,callsFor,permitCheck} from '../execution.mjs';
import {validateSplitReceipt} from '../split-execution.mjs';
import {repairPlan,HISTORY_HASHES} from '../initialization-repair.mjs';
import {frozenWasm,WASM_SHA,UNIT,hash} from '../plan.mjs';
const c=JSON.parse(readFileSync(new URL('../config.continuation.json',import.meta.url))),p=JSON.parse(readFileSync(new URL('../approval.split.json',import.meta.url)));
const protocol=JSON.parse(readFileSync(new URL('./fixtures/protocol-fees-88.json',import.meta.url))),wasm=frozenWasm(c),now=Date.parse('2026-11-01T02:00:00Z');
function fixture(fault){
 const dir=mkdtempSync(join(tmpdir(),'mandatelock-fixed-')),raws=new Map(),originals={};
 for(const id of ['create-vault','create-agent','create-recipient','create-attacker','deploy-init']){
  const data=readFileSync(`artifacts/phase4/live/${c.continuation.original_config_sha256}/${id}.jsonl`,'utf8');writeFileSync(join(dir,id+'.jsonl'),data);originals[id]=data;
  const raw=data.trim().split('\n').map(JSON.parse).find(x=>x.raw?.final_execution_status==='FINAL').raw;raws.set(raw.transaction.hash,raw);
 }
 let stage=0,sends=0,signs=0,next,seq=0,paid=0n;const payments=new Map();
 const balances={owner:4771540041850000000000000n,vault:3998670503567516400000000n,agent:UNIT,recipient:UNIT/10n,attacker:UNIT/10n};
 const keys=role=>[{public_key:c.publicKeys[role==='agent'?'agentAdmin':role],access_key:{nonce:10,permission:'FullAccess'}},...(role==='agent'&&stage>=3?c.publicKeys.agents.map(public_key=>({public_key,access_key:{nonce:10,permission:{FunctionCall:{receiver_id:c.accounts.vault,method_names:['execute_payment'],allowance:(UNIT/10n).toString()}}}})):[])];
 const accounting=()=>({owner_id:c.accounts.owner,last_mandate_id:stage>=5?'1':'0',budget:stage>=5?UNIT.toString():'0',available:stage>=5?(UNIT-paid).toString():'0',spent:paid.toString(),pending:'0',unallocated:stage===4?UNIT.toString():'0',account_balance:balances.vault.toString(),storage_and_operating_floor:'2570000000000000000000000'});
 const policy=()=>stage>=5?{mandate_id:'1',owner_id:c.accounts.owner,agent_id:c.accounts.agent,agent_keys:c.publicKeys.agents,allowed_recipients:[c.accounts.recipient],budget:UNIT.toString(),per_transaction_limit:(UNIT*4n/10n).toString(),expires_at_ns:c.expiresAtNs,paused:false,revoked:false}:null;
 const rpc={call:async(method,params)=>{
  if(method==='status')return {chain_id:'testnet'};
  if(method==='block')return {header:{height:500,hash:'block',timestamp_nanosec:String(BigInt(now)*1000000n)}};
  if(method==='EXPERIMENTAL_protocol_config')return protocol.protocol;
  if(method==='gas_price')return {gas_price:protocol.gas_price};
  if(method==='query'){
   const role=Object.keys(c.accounts).find(k=>c.accounts[k]===params.account_id),base={block_hash:'block'};
   if(params.request_type==='view_account')return {...base,amount:balances[role].toString(),locked:'0',storage_usage:182,code_hash:role==='vault'&&stage>0?'deployed':'11111111111111111111111111111111'};
   if(params.request_type==='view_access_key_list')return {...base,keys:keys(role)};
   if(params.request_type==='view_access_key')return {...base,...keys(role).find(k=>k.public_key===params.public_key).access_key};
   if(params.request_type==='view_state')return {...base,values:stage>=2?[{key:'U1RBVEU=',value:'state'}]:[]};
   if(params.request_type==='view_code')return {...base,code_base64:wasm.toString('base64')};
   const args=JSON.parse(Buffer.from(params.args_base64,'base64'));let value=params.method_name==='get_accounting'?accounting():params.method_name==='get_policy'?policy():payments.get(args.nonce)??{status:'Unused'};
   return {...base,result:[...Buffer.from(JSON.stringify(value))]};
  }
  if(method==='send_tx'){
   sends++;if(fault==='uncertain')throw Error('mock transport');
   const {call,hash:txHash}=JSON.parse(Buffer.from(params.signed_tx_base64,'base64'));
   let error=null,events=[];const action=call.actions[0];
   if(action.method==='execute_payment'){
    const a=action.args,n=BigInt(a.amount);error=a.recipient===c.accounts.attacker?'ERR_RECIPIENT':paid+n>UNIT?'ERR_BUDGET':null;
    if(!error){paid+=n;balances.vault-=n;balances.recipient+=n;payments.set(a.nonce,{status:'Succeeded'});events=[`EVENT_JSON:${JSON.stringify({standard:'mandatelock',event:'payment_succeeded',data:[{mandate_id:'1',nonce:a.nonce}]})}`];}
   }else {stage++;if(stage===4){balances.owner-=UNIT;balances.vault+=UNIT;}}
   const actions=call.actions.map(a=>a.type==='DeployContract'?{DeployContract:{code:Buffer.from(WASM_SHA,'hex').toString('base64')}}:a.type==='AddFunctionCallKey'?{AddKey:{public_key:a.publicKey,access_key:{nonce:0,permission:{FunctionCall:{receiver_id:a.receiver,method_names:a.methods,allowance:a.allowance}}}}}:{FunctionCall:{method_name:a.method,args:Buffer.from(JSON.stringify(a.args)).toString('base64'),gas:Number(a.gas),deposit:a.deposit}});
   const status=error?{Failure:{ActionError:{kind:{FunctionCallError:{ExecutionError:error}}}}}:{SuccessValue:action.method==='execute_payment'?'dHJ1ZQ==':''};
   const outcome={executor_id:call.receiver,gas_burnt:1,tokens_burnt:'100',logs:events,status,receipt_ids:[]};
   const raw={final_execution_status:'FINAL',transaction:{hash:txHash,signer_id:call.signer,receiver_id:call.receiver,public_key:call.publicKey,actions},transaction_outcome:{id:txHash,block_hash:'block',outcome:{...outcome,logs:[]}},receipts_outcome:[{id:txHash+'r',block_hash:'block',outcome}],receipts:[{receipt_id:txHash+'r',receiver_id:call.receiver,predecessor_id:call.signer,receipt:{Action:{signer_id:call.signer,signer_public_key:call.publicKey,actions}}}],status};
   raw.transaction.nonce=11;
   if(fault==='wrong-key')raw.transaction.public_key=c.publicKeys.attacker;
   if(fault==='missing-receipts')raw.receipts_outcome=[];
   if(fault==='wrong-actions')raw.transaction.actions=[];
   raws.set(txHash,raw);return {};
  }
  if(method==='EXPERIMENTAL_tx_status'){if(!raws.has(params.tx_hash))throw Error('unknown');return raws.get(params.tx_hash);}
  throw Error('Unmocked RPC '+method);
 }};
 const baseline={accounts:{},keys:{}};for(const role of Object.keys(c.accounts)){baseline.accounts[role]={amount:balances[role].toString(),locked:'0',storage_usage:182,code_hash:'11111111111111111111111111111111'};baseline.keys[role]=keys(role);}const initial=join(dir,'initial.json');writeFileSync(initial,JSON.stringify(baseline));
 return {dir,rpc,run:operation=>executeOperation({c,p:{...p,initial_state_path:initial,initial_state_sha256:hash(readFileSync(initial)),approved:true,execution_ready:true},operation,dir,wasm,rpc,now:()=>now,reconcileOptions:{attempts:1,pause:async()=>{}},sign:async call=>{signs++;const value={call,hash:'mock-'+(++seq)};return {hash:value.hash,bytes:Buffer.from(JSON.stringify(value)).toString('base64')};}}),counts:()=>({signs,sends}),cleanup:()=>{for(const [id,data]of Object.entries(originals))assert.equal(readFileSync(join(dir,id+'.jsonl'),'utf8'),data);assert(resolve(dir).startsWith(resolve(tmpdir())));rmSync(dir,{recursive:true});}};
}
test('full corrected CLI engine executes five setup steps and five agent calls in exact order',async()=>{const f=fixture();try{for(const op of ORDER)assert.equal((await f.run(op)).result,'PASS');assert.deepEqual(f.counts(),{signs:10,sends:10});await assert.rejects(f.run('deploy-only'),/claimed/);}finally{f.cleanup();}});
for(const fault of ['uncertain','wrong-key','missing-receipts','wrong-actions'])test(`corrected runner stops ${fault}, never sends twice`,async()=>{const f=fixture(fault);try{await assert.rejects(f.run('deploy-only'));assert.equal(f.counts().sends,1);await assert.rejects(f.run('deploy-only'),/claimed/);assert.equal(f.counts().sends,1);}finally{f.cleanup();}});
test('cannot skip setup or required rejection dependency',async()=>{const f=fixture();try{await assert.rejects(f.run('initialize-owner'));assert.equal(f.counts().sends,0);for(const op of ORDER.slice(0,6))await f.run(op);await assert.rejects(f.run('concurrency'));assert.equal(f.counts().sends,6);}finally{f.cleanup();}});
test('historical creation and combined initialization cannot be selected',()=>{for(const s of ['create-vault','create-agent','create-recipient','create-attacker','deploy-init'])assert.throws(()=>callsFor(c,s));});
test('frozen sandbox deploy and owner-init receipts accepted without diagnostic substitution',()=>{
 for(const [id,index]of [['vault-deploy-only',0],['parent-init',1]]){const raw=JSON.parse(readFileSync(`artifacts/phase4-initialization-ci/evidence/phase4-initialization/${id}-final.json`));const call={...repairPlan(c)[index],signer:raw.transaction.signer_id,receiver:raw.transaction.receiver_id,publicKey:raw.transaction.public_key};if(index===1)call.actions=[{...call.actions[0],args:{owner_id:raw.transaction.signer_id}}];validateSplitReceipt(raw,call,raw.transaction.hash,wasm);}
});
test('disabled, stale or changed approvals cannot execute',()=>{assert.throws(()=>permitCheck(c,p,'deploy-only',now));for(const mutate of [x=>x.plan_sha256='wrong',x=>x.latest_start_at='2026-11-02T14:30:00Z',x=>x.runtime_evidence_sha256='wrong']){const q={...p,approved:true,execution_ready:true};mutate(q);assert.throws(()=>permitCheck(c,q,'deploy-only',now));}});
