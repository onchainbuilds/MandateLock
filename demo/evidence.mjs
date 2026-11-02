import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export const directory=resolve(import.meta.dirname,'evidence');
const digest=b=>createHash('sha256').update(b).digest('hex');
export function loadEvidence() {
  const manifest=JSON.parse(readFileSync(resolve(directory,'manifest.json')));
  const lock=JSON.parse(readFileSync(resolve(import.meta.dirname,'production-lock.json')));
  assert.equal(manifest.mode,'recorded-sandbox'); assert.equal(manifest.commit,lock.source_commit);
  const raw={},rawBytes={};
  for(const [file,meta] of Object.entries(manifest.files)) {
    assert(/^phase2a\/(authorized|recipient|concurrency)\/[a-z0-9-]+\.json$/.test(file));
    const bytes=readFileSync(resolve(directory,file));
    assert.equal(bytes.length,meta.bytes,file);assert.equal(digest(bytes),meta.sha256,file);
    raw[file]=JSON.parse(bytes);rawBytes[file]=bytes;
  }
  for(const [file,sha] of Object.entries(lock.files)) assert.equal(digest(readFileSync(resolve(import.meta.dirname,'..',file))),sha,`Frozen production changed: ${file}`);
  const cases={};
  for(const [id,before,after,labels] of [['authorized','authorized-before','authorized-after',['authorized']],
    ['recipient','rejected-before','rejected-after',['rejected']],['concurrency','before','after',['competing-0','competing-1','competing-2']]]) {
    const prefix=`phase2a/${id}/`,read=file=>raw[prefix+file];
    const prior=read(before+'.json'),post=read(after+'.json');
    const transactions=labels.map(label=>({file:prefix+label+'-transaction.json',raw:read(label+'-transaction.json')}));
    const keys=[0,1,2].map(i=>{
      const r=read(`setup-key-${i}-transaction.json`);assert.equal(r.final_execution_status,'FINAL');
      assert(r.status.SuccessValue!==undefined,'Key setup failed');
      const add=r.transaction.actions[0].AddKey;
      return {file:prefix+`setup-key-${i}-transaction.json`,public_key:add.public_key,
        account_id:r.transaction.receiver_id,...add.access_key.permission.FunctionCall};
    });
    for(const {raw:r} of transactions) {
      assert.equal(r.final_execution_status,'FINAL');
      assert.equal(r.transaction.signer_id,prior.policy.agent_id);
      const key=keys.find(k=>k.public_key===r.transaction.public_key);assert(key,'Unknown signing key');
      assert.equal(key.receiver_id,r.transaction.receiver_id);
      assert.deepEqual(key.method_names,['execute_payment']);
      const call=r.transaction.actions[0].FunctionCall;
      assert.equal(call.deposit,'0');assert.equal(call.method_name,'execute_payment');
      assert(r.receipts_outcome.some(x=>x.outcome.executor_id===key.receiver_id),'No vault receipt');
    }
    for(const snapshot of [prior,post]) {
      const a=snapshot.accounting;
      assert.equal(BigInt(a.available)+BigInt(a.pending)+BigInt(a.spent),BigInt(a.budget));
      assert(BigInt(a.account_balance)>=BigInt(snapshot.required_liquid_backing));
    }
    const configuration=read('setup-configure-transaction.json');
    assert.equal(configuration.final_execution_status,'FINAL');
    cases[id]={id,before:prior,after:post,transactions,keys,configuration:{file:prefix+'setup-configure-transaction.json',raw:configuration},
      before_file:prefix+before+'.json',after_file:prefix+after+'.json',
      ...(id==='concurrency'?{competition:read('summary.json'),broadcasts:[0,1,2].map(i=>read(`broadcast-${i}.json`))}:{})};
  }
  const concurrent=cases.concurrency;
  assert.equal(new Set(concurrent.transactions.map(t=>t.raw.transaction.public_key)).size,3);
  assert.equal(new Set(concurrent.transactions.map(t=>t.raw.transaction.hash)).size,3);
  assert.equal(concurrent.competition.accepted,2); assert.equal(concurrent.competition.budget_rejections,1);
  assert(!JSON.stringify(concurrent.transactions).includes('InvalidNonce'));
  assert(JSON.stringify(cases.recipient.transactions[0].raw.status).includes('ERR_RECIPIENT'));
  return {manifest,lock,cases,raw,rawBytes};
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const e=loadEvidence();console.log(`PASS: ${Object.keys(e.raw).length} evidence hashes, frozen sources, restricted signing keys, finality, ledger identities and independent competition.`);
}
