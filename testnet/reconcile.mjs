// Read-only recovery tool: never signs, resubmits, retires or restores a reservation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TestnetRpc} from './adapter.mjs';
import {validateConfig} from './plan.mjs';
const [configFile,hash,signer]=process.argv.slice(2),c=JSON.parse(readFileSync(configFile));validateConfig(c,{ready:true});
assert(/^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(hash));assert(Object.values(c.accounts).includes(signer));
const rpc=new TestnetRpc(c);assert.equal((await rpc.call('status',{})).chain_id,'testnet');
console.log(JSON.stringify(await rpc.call('EXPERIMENTAL_tx_status',{tx_hash:hash,sender_account_id:signer,wait_until:'FINAL'}),null,2));
