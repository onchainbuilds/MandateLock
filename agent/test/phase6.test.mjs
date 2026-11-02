import {mkdtempSync,readdirSync,rmdirSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {recordingContext,fixtureProposal} from '../sdk.mjs';
import {loadPack} from '../evidence-pack.mjs';
import {authority,computeTask} from '../task.mjs';
import {capturedPayments,inspector,paymentStatus} from '../inspector.mjs';
import {startServer} from '../../demo/server.mjs';

const context=()=>recordingContext(loadPack().files['fee-reference.json']);
const server=fileURLToPath(new URL('../mcp.mjs',import.meta.url));
const handshake=[
  {id:'init',method:'initialize',params:{protocolVersion:'2025-11-25',clientInfo:{name:'fixture',version:'1'},capabilities:{}}},
  {method:'notifications/initialized'}
];
function run(messages,options=[]){
  const input=messages.map(m=>JSON.stringify({jsonrpc:'2.0',...m})).join('\n')+'\n';
  const child=spawnSync(process.execPath,[server,...options],{input,encoding:'utf8',timeout:10000});
  assert.equal(child.status,0,child.stderr);
  return child.stdout.trim().split('\n').map(line=>JSON.parse(line));
}
const call=(name,args)=>({id:4,method:'tools/call',params:{name,arguments:args}});
const value=r=>JSON.parse(r.result.content[0].text);

test('stdio negotiates tools and emits no notification reply',()=>{
  const replies=run([{id:0,method:'tools/list'},...handshake,{id:3,method:'tools/list'}]);
  assert.equal(replies.length,3);assert.equal(replies[0].error.code,-32002);
  assert.equal(replies[1].result.protocolVersion,'2025-11-25');assert.equal(replies[2].result.tools.length,5);
});
test('authority injection and unknown tools fail before invocation',()=>{
  const p=fixtureProposal(context(),'authorized');
  const replies=run([...handshake,call('request_payment',{...p,private_key:'forbidden'}),call('broadcast',{})]);
  assert.equal(replies[1].error.code,-32602);assert.equal(replies[2].error.code,-32602);
});
test('sandbox MCP request returns exact recorded settlement and blocks the attacker',()=>{
  const c=context();const replies=run([...handshake,call('request_payment',fixtureProposal(c,'authorized')),
    call('request_payment',fixtureProposal(c,'redirect'))],['--sandbox-replay']);
  assert.equal(value(replies[1]).receipt.settlement,'SUCCEEDED');assert.equal(value(replies[1]).broadcast,false);
  assert.equal(value(replies[2]).decision.decision,'BLOCK');assert.equal(value(replies[2]).unsigned_intent,null);
});
test('one-hour draft encodes owner method, principal, merchant, key and expiry',()=>{
  const c=context(),start=new Date('2026-11-02T12:00:00Z'),d=computeTask(c,start);
  assert.equal(d.expires_utc,'2026-11-02T13:00:00.000Z');assert.equal(d.owner_call.deposit,'0');
  assert.equal(d.owner_call.signer,c.policy.owner_id);assert.deepEqual(d.owner_call.args.allowed_recipients,[c.policy.allowed_recipients[0]]);
  assert.equal(d.owner_call.args.per_transaction_limit,'400000000000000000000000');
  assert.equal(d.owner_call.args.expires_at_ns,String(BigInt(Date.parse(d.expires_utc))*1000000n));
});
test('draft rejects invalid merchant, implicit account, self-recipient and unscoped key',()=>{
  const c=context();for(const bad of ['BAD/name','a'.repeat(64),c.vault,c.policy.agent_id])assert.throws(()=>computeTask(c,new Date(),bad));
  c.key.method_names=[];assert.throws(()=>computeTask(c));
});
test('lifecycle distinguishes exhausted and pending-locked authority, expiry and revocation',()=>{
  const c=context();c.accounting.available='0';c.accounting.spent=c.accounting.budget;assert.equal(authority(c).lifecycle,'EXHAUSTED');
  c.accounting.spent='0';c.accounting.pending=c.accounting.budget;assert.equal(authority(c).lifecycle,'FULLY_RESERVED');
  c.nowNs=c.policy.expires_at_ns;assert.equal(authority(c).lifecycle,'EXPIRED');c.policy.revoked=true;assert.equal(authority(c).lifecycle,'REVOKED');
});
test('testnet inspector labels captured evidence and handles lost or contradictory live results',async()=>{
  const s=await inspector();assert.equal(s.height,275933389);assert.equal(s.accounting.pending,'0');assert.equal(s.payments[0].outcome,'SUCCEEDED');assert.equal(s.payments[1].outcome,'REJECTED');
  const known=capturedPayments()[0].hash;
  for(const call of [async()=>{throw Error('timeout');},async()=>({final_execution_status:'FINAL',transaction:{hash:'wrong'}})]){
    let reads=0;const result=await paymentStatus(known,{call:async()=>{reads++;return call();}});
    assert.equal(result.outcome,'UNKNOWN');assert.equal(reads,1);
  }
});
test('browser loads captured inspector offline and gates explicit live read by origin',async()=>{
  const s=await startServer({port:0}),url='http://127.0.0.1:'+s.address().port;
  try{
    const page=await(await fetch(url+'/testnet')).text();assert(page.includes('Read finalized testnet state'));
    const data=await(await fetch(url+'/api/inspector')).json();assert.equal(data.broadcast_enabled,false);assert.equal(data.payments.length,2);
    assert.equal((await fetch(url+'/api/inspector/refresh',{method:'POST',headers:{Origin:'http://outside.invalid'}})).status,403);
  }finally{await new Promise(resolve=>s.close(resolve));}
});

test('unsigned outbox survives MCP sessions, coalesces duplicates and never stores a redirect',()=>{
  const dir=mkdtempSync(join(tmpdir(),'mandatelock-inbox-'));
  try{
    const args=['--outbox',dir], ctx=context(), p=fixtureProposal(ctx,'authorized');
    const replies=run([...handshake,call('request_payment',p),call('request_payment',p),
      call('request_payment',fixtureProposal(ctx,'redirect'))],args);
    const first=value(replies[1]);
    assert.equal(first.handoff,'STORED_UNSIGNED_OPERATOR_REQUEST');assert.equal(value(replies[2]).request_id,first.request_id);
    assert.equal(value(replies[3]).handoff,null);assert.deepEqual(readdirSync(dir),[first.request_id+'.json']);
    assert.equal(value(run([...handshake,call('get_payment_status',{id:first.request_id})],args)[1]).payment_status,'NOT_SUBMITTED');
  }finally{for(const f of readdirSync(dir))unlinkSync(join(dir,f));rmdirSync(dir);}
});
