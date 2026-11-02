// Read-only RPC audit: no signer, send_tx, faucet or account-creation capability.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {validateConfig} from './plan.mjs';
const c=JSON.parse(readFileSync(process.argv[2]??'testnet/config.example.json'));validateConfig(c);
const output='artifacts/phase4-final';mkdirSync(output,{recursive:true});
async function query(method,params,label){
  assert(['status','block','query','gas_price','EXPERIMENTAL_protocol_config'].includes(method));
  const response=await fetch(c.rpc,{method:'POST',headers:{'Content-Type':'application/json'},redirect:'error',
    body:JSON.stringify({jsonrpc:'2.0',id:label,method,params}),signal:AbortSignal.timeout(20000)});
  assert(response.ok,`Read-only RPC HTTP ${response.status}`);const raw=await response.json();
  writeFileSync(`${output}/rpc-${label}.json`,JSON.stringify(raw,null,2)+'\n');return raw;
}
const status=await query('status',{},'status');assert.equal(status.result?.chain_id,'testnet');
const block=await query('block',{finality:'final'},'block');assert(block.result?.header?.hash);const blockId=block.result.header.hash;
const accounts=await Promise.all(Object.entries(c.accounts).map(async([role,account_id])=>{
  const raw=await query('query',{request_type:'view_account',account_id,block_id:blockId},role);
  const missing=raw.error?.cause?.name==='UNKNOWN_ACCOUNT';
  return {role,account_id,result:raw.result?'EXISTS':missing?'MUST CREATE (absent at finalized block)':'UNVERIFIED',
    ...(raw.result?{account:raw.result}:{rpc_error:raw.error})};
}));
const [gas,protocol]=await Promise.all([query('gas_price',{block_id:blockId},'gas'),query('EXPERIMENTAL_protocol_config',{block_id:blockId},'protocol')]);
const summary={mode:'READ ONLY — NO TRANSACTIONS',observed_at:new Date().toISOString(),endpoint:c.rpc,chain_id:status.result.chain_id,
  protocol_version:protocol.result?.protocol_version,block_hash:blockId,block_height:block.result.header.height,block_timestamp_ns:block.result.header.timestamp_nanosec,
  accounts,gas_price:gas.result?.gas_price,storage_amount_per_byte:protocol.result?.runtime_config?.storage_amount_per_byte};
writeFileSync(`${output}/readonly-summary.json`,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
