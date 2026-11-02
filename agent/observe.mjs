import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {WASM_SHA} from '../testnet/plan.mjs';
export function readOnlyRpc({url='https://rpc.testnet.fastnear.com',fetchImpl=fetch}={}){
 assert(['https://rpc.testnet.fastnear.com','https://near-testnet.drpc.org'].includes(url),'Unreviewed RPC');
 return {async call(method,params){assert(['status','block','query','EXPERIMENTAL_protocol_config','EXPERIMENTAL_tx_status'].includes(method),'Read-only methods only');const response=await fetchImpl(url,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'mandatelock-agent-read-only',method,params}),signal:AbortSignal.timeout(15000)});const body=await response.json();assert(response.ok&&body.result&&!body.error,'Observation unavailable; no execution implied');return body.result;}};
}
export async function observe({rpc,vault,agent,publicKey,nonce=0}){
 assert(vault.endsWith('.testnet')&&agent.endsWith('.testnet'));assert(Number.isInteger(nonce)&&nonce>=0&&nonce<64);assert.equal((await rpc.call('status',{})).chain_id,'testnet');
 const block=(await rpc.call('block',{finality:'final'})).header;
 const query=async p=>{const r=await rpc.call('query',{...p,block_id:block.hash});assert.equal(r.block_hash,block.hash,'Unpinned read');return r;};
 const view=async(method,args={})=>JSON.parse(Buffer.from((await query({request_type:'call_function',account_id:vault,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64')})).result));
 const policy=await view('get_policy'),accounting=await view('get_accounting');
 const accounts={};for(const id of [vault,agent])accounts[id]=await query({request_type:'view_account',account_id:id});
 const key=await query({request_type:'view_access_key',account_id:agent,public_key:publicKey}),vaultKeys=await query({request_type:'view_access_key_list',account_id:vault});
 const code=await query({request_type:'view_code',account_id:vault}),codeHash=createHash('sha256').update(Buffer.from(code.code_base64,'base64')).digest('hex');assert.equal(codeHash,WASM_SHA);
 const payments=[];if(policy)payments[nonce]=await view('get_payment',{mandate_id:policy.mandate_id,nonce});
 const protocol=await rpc.call('EXPERIMENTAL_protocol_config',{block_id:block.hash});
 return {mode:'testnet',source:'fresh finalized read-only RPC observation; no execution',chainId:'testnet',vault,policy,accounting,accounts,payments,key:{account_id:agent,public_key:publicKey,nonce:key.nonce,...key.permission?.FunctionCall},nowNs:block.timestamp_nanosec,block,protocol,gasPrice:block.gas_price,vaultFullAccess:vaultKeys.keys.some(k=>k.access_key.permission==='FullAccess'),productionVerified:true};
}
