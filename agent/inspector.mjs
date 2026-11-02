import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedCapture} from '../scripts/verify-final-testnet.mjs';
import {observe, readOnlyRpc} from './observe.mjs';
import {authority} from './task.mjs';
import {receipt} from './receipts.mjs';
import {recordedRequest} from './challenge.mjs';

const config = JSON.parse(readFileSync(new URL('../testnet/config.continuation.json', import.meta.url)));
let archive;
function capture() { return archive ??= verifiedCapture(); }

export async function currentContext(nonce = 0, rpc = readOnlyRpc()) {
  const context = await observe({rpc, vault: config.accounts.vault, agent: config.accounts.agent,
    publicKey: config.publicKeys.agents[0], nonce});
  const age = BigInt(Date.now()) * 1000000n - BigInt(context.nowNs);
  assert(age >= -10000000000n && age <= 60000000000n, 'Stale final block');
  return context;
}

export function capturedPayments() {
  return capture().steps.slice(3).map(step => {
    const proof = step.providers[0], settled = step.label === 'T4';
    return {step: step.label, hash: step.hash, finality: proof.finality,
      outcome: settled ? 'SUCCEEDED' : 'REJECTED', requested_near: '0.10',
      recipient: settled ? config.accounts.recipient : config.accounts.attacker,
      fee_yocto: proof.fee, receipts: proof.receipts, explorer: 'https://testnet.nearblocks.io/txns/' + step.hash};
  });
}

export async function paymentStatus(hash, rpc) {
  const known = capturedPayments().find(p => p.hash === hash);
  const unknown = {hash,finality:'UNKNOWN',outcome:'UNKNOWN'};
  if (!rpc) return known ? {...known,source:'Captured public testnet observations'} :
    {...unknown,source:'No matching captured transaction'};
  if (!/^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(hash)) return {...unknown,source:'No recognized transaction hash'};
  try {
    const tx = await rpc.call('EXPERIMENTAL_tx_status', {tx_hash:hash,sender_account_id:config.accounts.agent,wait_until:'NONE'});
    const reference = capture().records.find(r => r.method === 'EXPERIMENTAL_tx_status' && r.params.tx_hash === hash)?.body.result;
    assert.equal(tx.final_execution_status,'FINAL');
    if (!known) {
      const t=tx.transaction, f=t.actions[0]?.FunctionCall;
      assert.equal(t.hash,hash);assert.equal(t.signer_id,config.accounts.agent);
      assert.equal(t.receiver_id,config.accounts.vault);assert(config.publicKeys.agents.includes(t.public_key));
      assert.equal(t.actions.length,1);assert.equal(f.method_name,'execute_payment');assert.equal(f.deposit,'0');
      assert.equal(String(f.gas),'100000000000000');
      const request=recordedRequest(tx), args=request.unsigned_intent.args;
      const context=await observe({rpc,vault:t.receiver_id,agent:t.signer_id,publicKey:t.public_key,nonce:args.nonce});
      for(const id of new Set(tx.receipts_outcome.map(r=>r.block_hash))){
        assert((await rpc.call('block',{block_id:id})).header.height<=context.block.height);
      }
      const after=context.policy?.mandate_id===args.mandate_id ?
        {accounting:context.accounting,payments:context.payments.filter(Boolean)} : null;
      const result=receipt(request,{raw:tx,expectedHash:hash,after});
      return {hash,finality:result.finality,outcome:result.payment_status,settlement:result.settlement,
        callbacks:result.callbacks,source:'Live testnet payment and finalized state',explorer:'https://testnet.nearblocks.io/txns/'+hash};
    }
    assert.deepEqual(tx.transaction,reference.transaction);
    assert.deepEqual(tx.status,reference.status);
    assert.deepEqual(tx.receipts,reference.receipts);
    assert.deepEqual(tx.receipts_outcome.map(r=>[r.id,r.outcome]),reference.receipts_outcome.map(r=>[r.id,r.outcome]));
    return {...known,source:'Live testnet RPC matched frozen transaction and receipt evidence'};
  } catch {
    return {...unknown, source:'Live RPC evidence unavailable or inconsistent',explorer:'https://testnet.nearblocks.io/txns/'+hash};
  }
}

export async function inspector(live = false, rpc = live ? readOnlyRpc() : null) {
  const a=capture().after;
  const common={network:'testnet',broadcast_enabled:false,
    limitations:['Failed or missing callbacks can strand a paid or refunded reservation.','Owner and vault full-access keys can bypass policy. A separate operator holds the agent administrator key.','Finalized balances do not prove intra-block solvency.']};
  if (!live) return {...common,source:'Captured finalized public testnet evidence',height:a.height,block:a.block,
    policy:a.policy,accounting:a.accounting,slots:a.slots,payments:capturedPayments()};
  const context=await currentContext(0,rpc);
  const payments=await Promise.all(capturedPayments().map(p=>paymentStatus(p.hash,rpc)));
  return {...common,source:'Live read-only finalized testnet state',height:context.block.height,block:context.block.hash,
    ...authority(context),source_label:'Live read-only finalized testnet state',policy:context.policy,payments};
}
