// Offline audit of the actual deploy.mjs source. VM linker has no network or real credentials.
// Synthetic approvals exist only in memory; no executable permit is written.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import * as plan from '../../plan.mjs';
import * as budget from '../../budget.mjs';
import * as continuation from '../../continuation.mjs';
import * as journal from '../../journal.mjs';
import * as network from '../../network-guard.mjs';

const mode=process.argv[2],now=Date.parse('2026-11-01T02:00:00Z');
const c=JSON.parse(readFileSync(new URL('../../config.continuation.json',import.meta.url)));
const permit=JSON.parse(readFileSync(new URL('../../approval.continuation.json',import.meta.url)));
const protocol=JSON.parse(readFileSync(new URL('../fixtures/protocol-fees-88.json',import.meta.url)));
permit.approved=mode!=='disabled';
const step=mode==='split-deploy'?'deploy-only':mode==='split-init'?'initialize-owner':mode==='existing-fourth'?'create-attacker':mode==='fund-after-split'?'fund':'deploy-init';
if(mode.startsWith('split-'))permit.operations.push(step);
if(mode==='expired')permit.expires_at='2026-11-01T01:00:00Z';
const dir=mkdtempSync(join(tmpdir(),'mandatelock-adapter-audit-'));
const methods=[],signed=[],out={mode,network:'NONE — offline mocked transport',real_keys_read:false};
const old=plan.deploymentPlan(c);
for(let i=0;i<4;i++){
 const call=old[i],hash=plan.COMPLETED_HASHES[i]??'synthetic-fourth';
 const raw={final_execution_status:'FINAL',status:{SuccessValue:''},transaction:{hash,signer_id:call.signer,receiver_id:call.receiver},transaction_outcome:{outcome:{tokens_burnt:'82494768750000000000'}},receipts_outcome:[{outcome:{tokens_burnt:'7032494768750000000000',status:{SuccessValue:''}}}]};
 const lines=[{stage:'signed-before-broadcast',hash},{stage:'observation',hash,raw},{stage:'verified-deployment-step',step:call.id,hash}];
 writeFileSync(join(dir,call.id+'.jsonl'),lines.map(JSON.stringify).join('\n')+'\n');
}
if(['existing-failed','fund-after-split'].includes(mode))writeFileSync(join(dir,'deploy-init.jsonl'),JSON.stringify({stage:'observation',raw:{status:{Failure:'ERR_INITIAL_OWNER'}}})+'\n');
if(mode==='fund-after-split'){
 for(const step of ['deploy-only','initialize-owner','install-agent-keys'])writeFileSync(join(dir,step+'.jsonl'),JSON.stringify({stage:'verified-deployment-step',step,hash:'synthetic-'+step})+'\n');
}
const initial=Object.fromEntries(readdirSync(dir).map(n=>[n,readFileSync(join(dir,n),'utf8')]));
class FixedDate extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
const accounts={
 [c.accounts.owner]:{amount:'4771540041850000000000000'},
 [c.accounts.vault]:{amount:'3998670503567516400000000'},
 [c.accounts.agent]:{amount:'1000000000000000000000000'}
};
class MockRpc {
 async call(method,params){
  methods.push({method,params});
  if(method==='status')return {chain_id:'testnet'};
  if(method==='block')return {header:{hash:'synthetic-final-block',timestamp_nanosec:String(BigInt(now)*1000000n)}};
  if(method==='EXPERIMENTAL_protocol_config')return protocol.protocol;
  if(method==='gas_price')return {gas_price:protocol.gas_price};
  if(method==='query'){
   if(params.request_type==='view_access_key')return {permission:'FullAccess',nonce:1};
   if(params.request_type==='view_access_key_list')return {keys:[{public_key:c.publicKeys.owner,access_key:{permission:'FullAccess',nonce:1}}]};
   if(params.request_type==='view_account')return {...accounts[params.account_id],locked:'0',code_hash:'11111111111111111111111111111111',storage_usage:182};
   throw Error('Unmocked read: '+params.request_type);
  }
  if(method==='send_tx'){
   assert.equal(params.signed_tx_base64,'INVALID-NON-BROADCASTABLE-FIXTURE');
   if(mode==='uncertain')throw Error('synthetic transport interruption');
   return {};
  }
  if(method==='EXPERIMENTAL_tx_status'){
   if(mode==='uncertain')throw Error('synthetic status unavailable');
   const call=signed[0],fail={Failure:{ActionError:{kind:{FunctionCallError:{ExecutionError:'Smart contract panicked: ERR_INITIAL_OWNER'}}}}};
   const raw={final_execution_status:mode==='nonfinal'?'EXECUTED_OPTIMISTIC':'FINAL',transaction:{hash:'synthetic-hash',signer_id:call.signer,receiver_id:call.receiver,public_key:call.publicKey,actions:call.actions},status:mode==='wrong-initializer'?fail:{SuccessValue:''},receipts_outcome:[{id:'synthetic-action-receipt',outcome:{status:mode==='receipt-failure'?fail:{SuccessValue:''}}}]};
   if(mode==='wrong-hash')raw.transaction.hash='mismatch';
   if(mode==='wrong-key')raw.transaction.public_key=c.publicKeys.attacker;
   if(mode==='wrong-actions')raw.transaction.actions=[];
   if(mode==='empty-receipts')raw.receipts_outcome=[];
   return raw;
  }
  throw Error('Unexpected mock method: '+method);
 }
}
const modules={
 'node:assert/strict':{default:assert},
 'node:fs':{readFileSync:(file,...args)=>file==='mock-config'?JSON.stringify(c):file==='mock-permit'?JSON.stringify(permit):readFileSync(file,...args)},
 'node:path':{resolve:(...args)=>args[0]==='artifacts/phase4/live'?dir:resolve(...args)},
 './plan.mjs':{...plan,approval:(c,p,op)=>plan.approval(c,p,op,now)},
 './continuation.mjs':continuation,
 './adapter.mjs':{TestnetRpc:MockRpc},
 './journal.mjs':{...journal,reconcile:(rpc,r,j)=>journal.reconcile(rpc,r,j,{attempts:2,pause:async()=>{}})},
 './sdk.mjs':{signerFromFile:async(file,account,key)=>({api:{},signer:{account,key}}),signCall:async(api,signer,call)=>{assert.equal(signer.account,call.signer);assert.equal(signer.key,call.publicKey);signed.push(structuredClone(call));return {hash:'synthetic-hash',bytes:'INVALID-NON-BROADCASTABLE-FIXTURE'};}},
 './network-guard.mjs':network,'./budget.mjs':budget
};
// Keep JSON-decoded fixtures in the real modules' realm so deepStrictEqual compares data,
// not the VM's different Object prototypes. This does not bypass any production check.
const context=vm.createContext({JSON,Date:FixedDate,process:{argv:['node','deploy.mjs',step,'mock-config','mock-permit','mock-nonexistent-key']},console:{log:()=>{}}});
try{
 const source=readFileSync(new URL('../../deploy.mjs',import.meta.url),'utf8');
 const mod=new vm.SourceTextModule(source,{context});
 await mod.link(spec=>{assert(modules[spec],'Unexpected import must not escape VM: '+spec);const exports=Object.keys(modules[spec]);return new vm.SyntheticModule(exports,function(){for(const k of exports)this.setExport(k,modules[spec][k]);},{context});});
 try{await mod.evaluate();out.completion='accepted';}catch(e){out.completion='stopped';out.error=e.message;}
 out.signed_calls=signed;out.methods=methods;
 out.sends=methods.filter(m=>m.method==='send_tx').length;
 out.history_preserved=Object.entries(initial).every(([name,data])=>readFileSync(join(dir,name),'utf8')===data);
 out.journals=Object.fromEntries(readdirSync(dir).map(n=>[n,readFileSync(join(dir,n),'utf8').trim().split('\n').map(JSON.parse)]));
 console.log(JSON.stringify(out));
}finally{
 // This single freshly created test directory is the only recursive removal target.
 assert(resolve(dir).startsWith(resolve(tmpdir())+ '\\')||resolve(dir).startsWith(resolve(tmpdir())+'/'));
 rmSync(dir,{recursive:true});
}
