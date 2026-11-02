import assert from 'node:assert/strict';
import {existsSync,linkSync,mkdirSync,readFileSync,unlinkSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

// Store unsigned operator handoffs. Link a complete temporary file into place once.
export function paymentInbox(directory) {
  mkdirSync(directory,{recursive:true,mode:0o700});
  const file=id=>join(directory,id+'.json');
  function get(id){
    if(!/^[0-9a-f]{64}$/.test(id)||!existsSync(file(id)))return null;
    const item=JSON.parse(readFileSync(file(id),'utf8'));
    assert.equal(item.receipt.request_id,id);
    assert.equal(item.receipt.payment_status,'NOT_SUBMITTED');
    assert.equal(item.receipt.transaction_hash,null);
    return item;
  }
  function put(request,result){
    assert(request.authorization.decision==='ALLOW' && request.unsigned_intent);
    assert.equal(request.unsigned_intent.deposit,'0');assert.equal(result.payment_status,'NOT_SUBMITTED');
    const id=request.request_id;
    assert(/^[0-9a-f]{64}$/.test(id));
    const item={type:'UNSIGNED_OPERATOR_REQUEST',mode:request.mode,request_id:id,
      state_reference:request.state_reference,intent:request.unsigned_intent,receipt:result,
      operator_action:'Recheck finalized state, nonce and separate authorization before any signing.'};
    const tmp=join(directory,randomUUID()+'.tmp');
    writeFileSync(tmp,JSON.stringify(item)+'\n',{flag:'wx',flush:true,mode:0o600});
    try{linkSync(tmp,file(id));}catch(e){if(e.code!=='EEXIST')throw e;}
    finally{unlinkSync(tmp);}
    const stored=get(id);assert.deepEqual(stored.intent,item.intent);assert.equal(stored.mode,item.mode);
    return stored;
  }
  return {get,put};
}
