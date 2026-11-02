import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
export const UNIT=10n**24n;
export const WASM_SHA='3836647aa9dcee6a461cb7c30b991e919baa9a6fce67065744c97b491f5c0e87';
export const GAS='100000000000000';
export const ALLOWANCE=(UNIT/10n).toString();
export const hash=b=>createHash('sha256').update(b).digest('hex');
export const fingerprint=value=>hash(JSON.stringify(value));
export const ORIGINAL_CONFIG_SHA='52c3bd8d84b806010536c058491064660b6365eec7853336b6d80919921ef655';
export const COMPLETED_HASHES=['5fRzq57MiNqMjkNiAsmTcrofEuUcp4roL1XCNYTpTDtV','4mxWFevbqohTK4RERAsHPHYKu4dB7eARq8JdHuqeMKrk','FbM4BTPborSUWLL6GVbsJ75csqTz3o3bANwmuMmWjyH4'];
export function executionFingerprint(c){validateConfig(c);return c.continuation?ORIGINAL_CONFIG_SHA:fingerprint(c);}
export const keyValid=k=>typeof k==='string'&&/^ed25519:[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(k);
export function validateConfig(c,{ready=false}={}) {
  assert.equal(c.network,'testnet','Only testnet permitted');
  if(c.continuation){
    assert.equal(c.rpc,'https://rpc.testnet.fastnear.com','Continuation RPC is pinned');
    assert.deepEqual(c.continuation,{original_config_sha256:ORIGINAL_CONFIG_SHA,completed_hashes:COMPLETED_HASHES,start_operation:'create-attacker'},'Exact continuation required');
    const original={...c,rpc:'https://rpc.testnet.near.org'};delete original.continuation;
    assert.equal(fingerprint(original),ORIGINAL_CONFIG_SHA,'Continuation changed original accounts, keys or plan');
  }else assert.equal(c.rpc,'https://rpc.testnet.near.org','RPC endpoint is pinned; review changes separately');
  assert.deepEqual(Object.keys(c.accounts).sort(),['agent','attacker','owner','recipient','vault']);
  const ids=Object.values(c.accounts);
  assert.equal(new Set(ids).size,5,'Account roles must be distinct');
  for(const id of ids)assert(id.length<=64&&/^[a-z0-9]+(?:[-_][a-z0-9]+)*(?:\.[a-z0-9]+(?:[-_][a-z0-9]+)*)*\.testnet$/.test(id),'Disposable named testnet accounts only');
  for(const role of ['vault','agent','recipient','attacker'])assert.equal(c.accounts[role].split('.').slice(1).join('.'),c.accounts.owner,'Direct owner subaccounts required');
  if(ready){
    const p=c.publicKeys;
    const keys=[p.owner,p.vault,p.agentAdmin,p.recipient,p.attacker,...p.agents];
    assert.equal(p.agents.length,3,'Exactly three independent agent keys');
    assert(keys.every(keyValid),'Supply actual public keys');assert.equal(new Set(keys).size,8,'Keys must be distinct across roles');
    assert(typeof c.expiresAtNs==='string'&&/^[1-9]\d{15,19}$/.test(c.expiresAtNs),'Exact expiry required');
  }
  return c;
}
export function frozenWasm(c){const b=readFileSync(c.wasm);assert.equal(hash(b),WASM_SHA,'Only proven Linux production Wasm is allowed');return b;}
export const fn=(method,args={},deposit='0')=>({type:'FunctionCall',method,args,gas:GAS,deposit});
export function deploymentPlan(c){
  validateConfig(c);const a=c.accounts,k=c.publicKeys;
  const create=(role,key,amount)=>({id:`create-${role}`,signer:a.owner,receiver:a[role],actions:[{type:'CreateAccount'},{type:'Transfer',deposit:amount},{type:'AddFullAccessKey',publicKey:key}]});
  return [
    create('vault',k.vault,(4n*UNIT).toString()),
    create('agent',k.agentAdmin,UNIT.toString()),
    create('recipient',k.recipient,(UNIT/10n).toString()),
    create('attacker',k.attacker,(UNIT/10n).toString()),
    {id:'deploy-init',signer:a.vault,receiver:a.vault,actions:[{type:'DeployContract',sha256:WASM_SHA},fn('new',{owner_id:a.owner})]},
    {id:'install-agent-keys',signer:a.agent,receiver:a.agent,actions:k.agents.map(publicKey=>({type:'AddFunctionCallKey',publicKey,receiver:a.vault,methods:['execute_payment'],allowance:ALLOWANCE}))},
    {id:'fund',signer:a.owner,receiver:a.vault,actions:[fn('fund',{},UNIT.toString())]},
    {id:'mandate',signer:a.owner,receiver:a.vault,actions:[fn('create_mandate',{agent_id:a.agent,agent_keys:k.agents,allowed_recipients:[a.recipient],budget:UNIT.toString(),per_transaction_limit:(UNIT*4n/10n).toString(),expires_at_ns:c.expiresAtNs})]},
  ];
}
export function approval(c,permit,operation,now=Date.now()){
  validateConfig(c,{ready:true});
  assert(permit?.approved===true,'Explicit owner approval package required');
  assert.equal(permit.network,'testnet');assert.equal(permit.config_sha256,fingerprint(c),'Approval does not match exact configuration');
  if(c.continuation){
    assert.equal(permit.continuation_sha256,fingerprint(c.continuation),'Continuation approval binding missing');
    assert(!['create-vault','create-agent','create-recipient'].includes(operation),'Completed transaction must never be repeated');
    assert(!permit.operations.some(x=>['create-vault','create-agent','create-recipient'].includes(x)),'Completed transactions outside continuation scope');
  }
  assert.equal(permit.wasm_sha256,WASM_SHA);assert(permit.operations?.includes(operation),'Operation outside approved scope');
  assert(Number.isFinite(Date.parse(permit.expires_at))&&Date.parse(permit.expires_at)>now,'Approval expired');
  if(permit.bootstrap_transaction_hash){
    assert.equal(permit.authorized_starting_balance_near,'10');
    assert.equal(permit.max_aggregate_outgoing_near,'8');
    const last=Date.parse(permit.latest_submission_at),start=Date.parse(permit.latest_start_at);
    assert(Number.isFinite(last)&&last<=Date.parse(permit.expires_at)-600000,'Ten-minute finality margin required');
    assert(Number.isFinite(start)&&start<last,'Start cutoff required');
    assert(now<last,'Submission cutoff reached; preserve finality margin');
    if(operation==='create-vault'||(c.continuation&&operation==='create-attacker'))assert(now<start,'Start cutoff reached');
  }else assert.equal(permit.max_external_funding_near,'8');
  if(c.custodyProfile)assert.equal(permit.dependency_lock_sha256,hash(readFileSync(new URL('package-lock.json',import.meta.url))),'Reviewed dependency lock changed');
}
export function scenario(c,name,mandateId='1'){
  validateConfig(c,{ready:true});assert.equal(mandateId,'1','Only first disposable mandate is approved');
  const payment=(nonce,amount,recipient,keyIndex)=>({signer:c.accounts.agent,receiver:c.accounts.vault,publicKey:c.publicKeys.agents[keyIndex],
    actions:[fn('execute_payment',{mandate_id:mandateId,nonce,recipient,amount})]});
  if(name==='authorized')return [payment(0,(UNIT/10n).toString(),c.accounts.recipient,0)];
  if(name==='direct-rejection')return [payment(1,(UNIT/10n).toString(),c.accounts.attacker,0)];
  if(name==='concurrency')return [0,1,2].map(i=>payment(i+2,(UNIT*4n/10n).toString(),c.accounts.recipient,i));
  throw Error('Unknown approved scenario');
}
