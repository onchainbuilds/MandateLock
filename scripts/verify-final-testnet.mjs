// Offline verification of captured public RPC responses. No RPC or signer imports.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const base = new URL('../docs/evidence/final-testnet/', import.meta.url);
const bytes = name => readFileSync(new URL(name, base));
const read = name => JSON.parse(bytes(name));
export function verifiedCapture() {
  for (const [name, digest] of Object.entries(read('manifest.json').files)) {
    assert.equal(createHash('sha256').update(bytes(name)).digest('hex'), digest, name);
  }
  const before = read('before-report.json').common;
  const after = read('after-report.json').common;
  const states = read('step-states.json');
  const records = read('after-raw.json');
  const owner = 'ml-demo-20261031.testnet';
  const agent = 'agent.' + owner, vault = 'vault.' + owner;
  const merchant = 'merchant.' + owner, attacker = 'attacker.' + owner;
  const unit = 10n ** 24n, payment = unit / 10n;
  const hashes = [
    'DPcXxEw8JKzkYgq9mj6NoKZ1B6j73ZZzeBu5fY1HtTrF',
    '9AbPXmJcDY2R5MJCrhSDU1nqQtU3gguoMDLoq9wcsqrt',
    '81QCQbgYgM1VYJ2i3gbN7JzM9VsPUESdywtbohZTSXBe',
    'EWywBLBSiwZ5F47GYwwSGyBrbMJPz6v6Svj6ECqXKHuT',
    '6YEmjM2aaj5YBzg48844XKgLxJqN5EboV7PV1bGjvR3m'
  ];
  const callbackId = 'DK419poBwS851QphdEBDSWncUB1kFBSGD1unCrsorxE';
  const rejectionId = '6NtZDTGovHSxaC4JxtV5Knkw3p1aCjV9E6Enpdn4bzGK';
  assert.equal(after.height, 275933389);
  assert.equal(after.block, '4D6HoBVZPzzYUL9TS6Zme8Dj5WLkaJGgSzmNCQrR1HPL');
  for (const source of ['https://rpc.testnet.fastnear.com', 'https://near-testnet.drpc.org']) {
    const rows = records.filter(r => r.source === source);
    const pinned = rows.filter(r => r.method === 'query' && r.body.result.block_hash === after.block);
    for (const [role,id] of [['recipient',merchant],['attacker',attacker],['vault',vault]]) {
      assert.equal(pinned.find(r => r.params.request_type === 'view_account' && r.params.account_id === id).body.result.amount, after.balances[role]);
    }
    const view = name => JSON.parse(Buffer.from(pinned.find(r => r.params.method_name === name).body.result.result));
    assert.deepEqual(view('get_accounting'),after.accounting);
    assert.deepEqual(view('get_policy'),after.policy);
    assert.deepEqual(pinned.filter(r=>r.params.method_name==='get_payment').map(r=>JSON.parse(Buffer.from(r.body.result.result))).sort((a,b)=>a.nonce-b.nonce),after.slots);
    let fees = 0n;
    for (const [i, hash] of hashes.entries()) {
      const tx = rows.find(r => r.method === 'EXPERIMENTAL_tx_status' && r.params.tx_hash === hash).body.result;
      assert.equal(tx.final_execution_status,'FINAL');
      assert.equal(tx.transaction.hash,hash);
      assert.equal(tx.transaction.signer_id,[owner,agent,owner,agent,agent][i]);
      assert.equal(states[i].hash,hash);
      const fee = [tx.transaction_outcome,...tx.receipts_outcome].reduce((n,r)=>n+BigInt(r.outcome.tokens_burnt),0n);
      assert.equal(String(fee),states[i].fee);
      fees += fee;
      if (i < 4) assert(Object.hasOwn(tx.status,'SuccessValue'));
      if (i === 3 || i === 4) {
        assert.equal(tx.transaction.receiver_id,vault);
        const action=tx.transaction.actions[0].FunctionCall;
        assert.equal(action.method_name,'execute_payment');assert.equal(action.deposit,'0');
        assert.deepEqual(JSON.parse(Buffer.from(action.args,'base64')),{mandate_id:'3',nonce:i-3,recipient:i===3?merchant:attacker,amount:String(payment)});
      }
      if (i === 3) {
        const transfer=tx.receipts.find(r=>r.predecessor_id===vault && r.receiver_id===merchant && r.receipt?.Action?.actions?.[0]?.Transfer?.deposit===String(payment));
        assert(tx.receipts_outcome.some(r=>r.id===transfer.receipt_id && Object.hasOwn(r.outcome.status,'SuccessValue')));
        const cb=tx.receipts_outcome.find(r=>r.id===callbackId).outcome;
        assert.equal(cb.executor_id,vault);assert.equal(cb.status.SuccessValue,'dHJ1ZQ==');
        assert(cb.logs.filter(l=>l.startsWith('EVENT_JSON:')).map(l=>JSON.parse(l.slice(11))).some(e=>e.event==='payment_succeeded'&&e.data[0].mandate_id==='3'&&e.data[0].nonce===0&&e.data[0].amount===String(payment)));
        assert.equal(states[i].ledger.pending,'0');
      }
      if (i === 4) {
        const failed=tx.receipts_outcome.find(r=>r.id===rejectionId).outcome;
        assert.equal(failed.executor_id,vault);assert.deepEqual(failed.status,tx.status);
        assert.equal(failed.status.Failure.ActionError.kind.FunctionCallError.ExecutionError,'Smart contract panicked: ERR_RECIPIENT');
        assert.equal(states[4].balances.attacker,states[3].balances.attacker);
        assert.equal(states[4].balances.recipient,states[3].balances.recipient);
      }
    }
    assert.equal(fees,1423062617118500000000n);
    assert.equal(6232158967991124000000000n+fees+payment,6333582030608242500000000n);
  }
  assert.equal(BigInt(after.balances.recipient)-BigInt(before.balances.recipient),payment);
  assert.equal(after.balances.attacker,before.balances.attacker);
  assert.deepEqual([after.accounting.available,after.accounting.pending,after.accounting.spent],[String(9n*payment),'0',String(payment)]);
  assert.deepEqual(after.slots.map(s=>s.status),['Succeeded','Unused']);
  return {before,after,steps:read('after-report.json').steps,records};
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  verifiedCapture();
  console.log('PASS: five finalized public testnet transactions on two captured RPCs at height 275933389.');
  console.log('T4: merchant +0.10 NEAR, callback settled. T5: vault ERR_RECIPIENT, attacker +0.');
  console.log('Mandate 3: 0.90 available / 0 pending / 0.10 spent. Cumulative outgoing: 6.3335820306082425 testnet NEAR.');
}
