import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
export class Journal {
  constructor(directory,operation){
    assert(/^[a-z-]+$/.test(operation));mkdirSync(directory,{recursive:true});this.directory=directory;
    this.path=resolve(directory,operation+'.jsonl');
    // Never overwrite/restart a claimed scenario, even if signing/broadcast was interrupted.
    writeFileSync(this.path,JSON.stringify({stage:'claimed',operation,at:new Date().toISOString()})+'\n',{flag:'wx',flush:true});
  }
  record(value){appendFileSync(this.path,JSON.stringify({...value,at:new Date().toISOString()})+'\n',{flush:true});}
}
export async function broadcastOnce(rpc,signed,call,journal){
  journal.record({stage:'signed-before-broadcast',hash:signed.hash,call});
  try {
    // Exactly one submission attempt. A transport error is not a transaction failure.
    const sent=await rpc.call('send_tx',{signed_tx_base64:signed.bytes,wait_until:'NONE'});
    journal.record({stage:'submitted',hash:signed.hash,response:sent});
  }catch {journal.record({stage:'UNCERTAIN',hash:signed.hash,reason:'Broadcast response unavailable; inspect hash, never resubmit automatically'});}
  return {hash:signed.hash,call};
}
export async function reconcile(rpc,record,journal,{attempts=10,pause=()=>new Promise(r=>setTimeout(r,2000))}={}){
  for(let i=0;i<attempts;i++){
    try{const raw=await rpc.call('EXPERIMENTAL_tx_status',{tx_hash:record.hash,sender_account_id:record.call.signer,wait_until:'FINAL'});
      journal.record({stage:'observation',hash:record.hash,raw});
      if(raw.final_execution_status==='FINAL')return {...record,raw};
    }catch {journal.record({stage:'read-unavailable',hash:record.hash});}
    if(i+1<attempts)await pause();
  }
  return {...record,unverified:'Final outcome unavailable. No resubmission or reservation release permitted.'};
}
export function readSession(path=resolve(import.meta.dirname,'../artifacts/phase4/live/session.json')){
  try{const s=JSON.parse(readFileSync(path));assert.equal(s.network,'testnet');assert.equal(s.mode,'live-testnet');return s;}
  catch(e){return {mode:'testnet-preparation',network:'testnet',broadcast_enabled:false,result:'UNVERIFIED',message:e.code==='ENOENT'?'Awaiting deployment approval. No testnet execution journal exists.':'Execution journal unreadable. Do not infer a transaction outcome or resubmit.'};}
}
export function publishSession(session){
  mkdirSync('artifacts/phase4/live',{recursive:true});
  writeFileSync('artifacts/phase4/live/session.json',JSON.stringify(session,null,2)+'\n');
}
