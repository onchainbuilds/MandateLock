import assert from 'node:assert/strict';
import {evaluatePayment} from '../demo/agent.mjs';
import {validateConfig,WASM_SHA,hash,UNIT,ALLOWANCE,GAS,scenario} from './plan.mjs';

export class TestnetRpc {
  constructor(config,{fetchImpl=fetch}={}){validateConfig(config);this.url=config.rpc;this.fetch=fetchImpl;}
  async call(method,params){
    assert(['status','block','query','gas_price','EXPERIMENTAL_protocol_config','send_tx','tx','EXPERIMENTAL_tx_status'].includes(method));
    const r=await this.fetch(this.url,{method:'POST',headers:{'Content-Type':'application/json'},redirect:'error',
      body:JSON.stringify({jsonrpc:'2.0',id:'mandatelock-phase4',method,params}),signal:AbortSignal.timeout(15000)});
    const body=await r.json();
    if(body.error?.code===-429||/deprecated/i.test(body.error?.message??''))throw Error('RPC endpoint deprecated; stop and review replacement; no retry');
    assert(r.ok,'RPC HTTP failure; outcome must be reconciled');
    // Do not echo provider errors: they may include request payloads or sensitive credentials.
    assert(!body.error&&body.result!==undefined,'RPC response unavailable; outcome must be reconciled');return body.result;
  }
}
export function restrictedKey(raw,c,publicKey){
  const k=raw.permission?.FunctionCall;
  assert(k,'Full-access or unsupported agent permission rejected');
  assert.equal(k.receiver_id,c.accounts.vault);assert.deepEqual(k.method_names,['execute_payment']);
  assert(typeof k.allowance==='string'&&BigInt(k.allowance)>0n&&BigInt(k.allowance)<=BigInt(ALLOWANCE),'Finite bounded gas allowance required');
  assert(c.publicKeys.agents.includes(publicKey));
  assert(Number.isSafeInteger(raw.nonce)&&raw.nonce>=0,'Unsafe RPC nonce');
  return {account_id:c.accounts.agent,public_key:publicKey,...k,nonce:raw.nonce};
}
export function checkLedger(s){
  const a=s.accounting;const available=BigInt(a.available),pending=BigInt(a.pending),spent=BigInt(a.spent);
  assert([available,pending,spent,BigInt(a.unallocated)].every(n=>n>=0n));
  assert.equal(available+pending+spent,BigInt(a.budget));
  const physical=BigInt(s.accounts[s.vault].amount);
  assert.equal(physical,BigInt(a.account_balance),'Pinned view and account balances disagree');
  const liquid=BigInt(a.storage_and_operating_floor)+BigInt(a.unallocated)+available;
  // Pending transfers can already have left the vault. Do not double-count them as liquid liabilities.
  assert(physical>=liquid,'Insufficient measured liquid backing');
  return {physical:physical.toString(),required_liquid:liquid.toString(),pending_obligation:pending.toString(),
    block_end_backing:'PASS',intra_block_solvency:'UNVERIFIED'};
}
export async function snapshot(rpc,c,{now=Date.now()}={}){
  validateConfig(c,{ready:true});assert.equal((await rpc.call('status',{})).chain_id,'testnet','Wrong chain');
  const block=await rpc.call('block',{finality:'final'}),id=block.header.hash;
  assert(typeof block.header.timestamp_nanosec==='string','Exact chain timestamp required');
  const age=BigInt(now)*1000000n-BigInt(block.header.timestamp_nanosec);
  assert(age>=-10000000000n&&age<=60000000000n,'Final block clock stale or local clock wrong');
  const query=async params=>{const r=await rpc.call('query',{...params,block_id:id});assert.equal(r.block_hash,id,'Unpinned query');return r;};
  const view=async(method,args={})=>JSON.parse(Buffer.from((await query({request_type:'call_function',account_id:c.accounts.vault,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64')})).result));
  const code=await query({request_type:'view_code',account_id:c.accounts.vault});
  assert.equal(hash(Buffer.from(code.code_base64,'base64')),WASM_SHA,'Deployed Wasm differs from proven contract');
  const [policy,accounting,accounts,keyViews]=await Promise.all([
    view('get_policy'),view('get_accounting'),
    Promise.all(Object.values(c.accounts).map(async account=>[account,await query({request_type:'view_account',account_id:account})])),
    Promise.all(c.publicKeys.agents.map(public_key=>query({request_type:'view_access_key',account_id:c.accounts.agent,public_key})))
  ]);
  assert(policy,'No mandate');assert.equal(policy.mandate_id,'1');assert.equal(policy.owner_id,c.accounts.owner);assert.equal(policy.agent_id,c.accounts.agent);
  assert.deepEqual(policy.agent_keys,c.publicKeys.agents);assert.deepEqual(policy.allowed_recipients,[c.accounts.recipient]);
  assert.equal(policy.budget,UNIT.toString());assert.equal(policy.per_transaction_limit,(UNIT*4n/10n).toString());assert.equal(policy.expires_at_ns,c.expiresAtNs);
  const payments=await Promise.all([0,1,2,3,4].map(nonce=>view('get_payment',{mandate_id:policy.mandate_id,nonce})));
  const s={mode:'live-testnet',vault:c.accounts.vault,block_hash:id,block_height:block.header.height,block_timestamp_ns:block.header.timestamp_nanosec,
    observed_at:new Date(now).toISOString(),policy,accounting,payments,accounts:Object.fromEntries(accounts),keys:keyViews.map((k,i)=>restrictedKey(k,c,c.publicKeys.agents[i])),production_sha256:WASM_SHA};
  s.solvency=checkLedger(s);return s;
}
export function liveDecision(s,proposal){
  const d=evaluatePayment({policy:s.policy,accounting:s.accounting,payments:s.payments,key:s.keys[0],vault:s.vault,nowNs:s.block_timestamp_ns},proposal);
  return {...d,clock:'final public testnet block',reason:d.reason.replace('recorded mandate','observed mandate')};
}
export function preflightScenario(c,name,s){
  const calls=scenario(c,name);checkLedger(s);
  assert(!s.policy.paused&&!s.policy.revoked);assert(BigInt(s.policy.expires_at_ns)>BigInt(s.block_timestamp_ns)+120000000000n,'At least two minutes of mandate lifetime required');
  assert.equal(s.accounting.pending,'0','Uncertain pending: stop, never release');
  assert.equal(s.accounting.spent,name==='authorized'?'0':(UNIT/10n).toString(),'Run exact ordered demo on a fresh mandate');
  assert.equal(s.accounting.available,name==='authorized'?UNIT.toString():(UNIT*9n/10n).toString());
  for(const call of calls){const args=call.actions[0].args;assert.equal(s.payments[args.nonce].status,'Unused');assert(s.keys.some(k=>k.public_key===call.publicKey));}
  if(name==='authorized')assert.equal(liveDecision(s,{recipient:c.accounts.recipient,amount:'0.10',nonce:0,instruction:'Pay the agreed merchant.'}).decision,'ALLOW');
  // Only these exact owner-approved security fixtures bypass the offchain gate. No arbitrary bypass endpoint.
  return calls;
}
export function checkAgentFunding(c,s,calls,gasPrice,storageByteCost){
  const account=s.accounts[c.accounts.agent];assert(Number.isSafeInteger(account.storage_usage)&&account.storage_usage>=0);
  const gas=BigInt(gasPrice),storage=BigInt(storageByteCost);assert(gas>0n&&storage>0n);
  let fees=0n;for(const call of calls){const estimate=gas*BigInt(call.actions[0].gas)*2n;fees+=estimate;
    assert(BigInt(s.keys.find(k=>k.public_key===call.publicKey).allowance)>=estimate,'Insufficient conservative key gas allowance');}
  assert(BigInt(account.amount)>=BigInt(account.storage_usage)*storage+fees,'Agent cannot cover storage plus conservative gas reserve');
  return {gas_price:gas.toString(),storage_byte_cost:storage.toString(),conservative_fees:fees.toString()};
}
export function inspectTransaction(raw,call,expectedHash){
  assert.equal(raw.final_execution_status,'FINAL','Uncertain finality');const t=raw.transaction;
  assert.equal(t.hash,expectedHash);assert.equal(t.signer_id,call.signer);assert.equal(t.receiver_id,call.receiver);assert.equal(t.public_key,call.publicKey);
  assert.equal(t.actions.length,1);const f=t.actions[0].FunctionCall,want=call.actions[0];
  assert.equal(f.method_name,want.method);assert.equal(f.deposit,'0');assert.equal(String(f.gas),GAS);assert.deepEqual(JSON.parse(Buffer.from(f.args,'base64')),want.args);
  assert(raw.receipts_outcome?.some(r=>r.outcome.executor_id===call.receiver),'No vault execution; not contract enforcement');
  assert(!JSON.stringify(raw.status).includes('InvalidNonce'),'Nonce conflict is not budget enforcement');
  const events=[];
  for(const receipt of raw.receipts_outcome)for(const line of receipt.outcome.logs??[]){
    if(receipt.outcome.executor_id!==call.receiver||!line.startsWith('EVENT_JSON:'))continue;
    const e=JSON.parse(line.slice(11));if(e.standard==='mandatelock'&&e.data?.[0]?.mandate_id===want.args.mandate_id&&e.data[0].nonce===want.args.nonce)
      events.push({event:e.event,data:e.data[0],receipt_id:receipt.id,gas_burnt:String(receipt.outcome.gas_burnt),status:receipt.outcome.status});
  }
  const callback=events.find(e=>['payment_succeeded','payment_failed'].includes(e.event));
  return {hash:t.hash,explorer:`https://testnet.nearblocks.io/txns/${t.hash}`,status:raw.status,events,
    callback:callback??{status:'UNVERIFIED — no terminal callback event; reservation must not be released'},receipts:raw.receipts_outcome};
}
export function verifyScenario(c,name,before,after,transactions){
  checkLedger(before);checkLedger(after);const entries=transactions.map(t=>inspectTransaction(t.raw,t.call,t.hash));
  const success=entries.filter(e=>e.callback.event==='payment_succeeded'&&e.status.SuccessValue==='dHJ1ZQ==');
  const expected=name==='authorized'?1:name==='concurrency'?2:0;
  assert.equal(success.length,expected,'Terminal success count differs');
  if(name==='direct-rejection')assert(JSON.stringify(entries[0].status).includes('ERR_RECIPIENT'));
  if(name==='concurrency'){
    assert.equal(entries.length,3);assert.equal(new Set(entries.map(e=>e.hash)).size,3);assert.equal(new Set(transactions.map(t=>t.call.publicKey)).size,3);
    assert.equal(entries.filter(e=>JSON.stringify(e.status).includes('ERR_BUDGET')).length,1);
  }
  const delta=name==='authorized'?UNIT/10n:name==='concurrency'?UNIT*8n/10n:0n;
  assert.equal(BigInt(after.accounting.spent)-BigInt(before.accounting.spent),delta);assert.equal(BigInt(before.accounting.available)-BigInt(after.accounting.available),delta);
  assert.equal(after.accounting.pending,'0');
  assert.equal(BigInt(after.accounts[c.accounts.recipient].amount)-BigInt(before.accounts[c.accounts.recipient].amount),delta);
  assert.equal(after.accounts[c.accounts.attacker].amount,before.accounts[c.accounts.attacker].amount,'Attacker balance changed');
  for(const t of transactions){const n=t.call.actions[0].args.nonce;assert.equal(after.payments[n].status,t.raw.status.Failure?'Unused':'Succeeded');}
  return {result:'PASS',entries,intermediate_solvency:'UNVERIFIED — block-end samples are not intra-block proof'};
}
