import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cumulativeLimit,splitApproval,validateSplitState,historicalJournal} from '../split-execution.mjs';
import {WASM_SHA} from '../plan.mjs';
const c=JSON.parse(readFileSync(new URL('../config.continuation.json',import.meta.url)));
test('split cumulative limit retains failed historical fees',()=>{
 assert.equal(cumulativeLimit(0n,2566300000000000000000000n),7796089454582483600000000n);
 assert.throws(()=>cumulativeLimit(0n,3000000000000000000000000n),/cap/);
});
test('disabled split proposal cannot authorize signing',()=>{
 const p=JSON.parse(readFileSync(new URL('../approval.initialization-repair.json',import.meta.url)));
 assert.throws(()=>splitApproval(c,p,'deploy-only'),/disabled/);
});
test('deploy state requires frozen code, pinned snapshots and absent initialization',()=>{
 const s={wasm_sha256:WASM_SHA,pinned_after_receipts:true,values:[]};validateSplitState(c,'deploy-only',s);
 assert.throws(()=>validateSplitState(c,'deploy-only',{...s,values:[{}]}));
 assert.throws(()=>validateSplitState(c,'deploy-only',{...s,pinned_after_receipts:false}));
 assert.throws(()=>validateSplitState(c,'deploy-only',{...s,wasm_sha256:'other'}));
});
test('initializer state requires actual owner and zero accounting',()=>{
 const s={wasm_sha256:WASM_SHA,pinned_after_receipts:true,owner_id:c.accounts.owner,accounting:{budget:'0',available:'0',pending:'0',spent:'0',unallocated:'0',last_mandate_id:'0',account_balance:'10',storage_and_operating_floor:'1'}};
 validateSplitState(c,'initialize-owner',s);
 assert.throws(()=>validateSplitState(c,'initialize-owner',{...s,owner_id:c.accounts.vault}));
 assert.throws(()=>validateSplitState(c,'initialize-owner',{...s,accounting:{...s.accounting,pending:'1'}}));
});
