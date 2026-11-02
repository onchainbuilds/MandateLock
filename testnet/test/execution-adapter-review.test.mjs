// Supersedes historical negative audit with corrected runner regressions.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sdk,signCall} from '../sdk.mjs';
import {repairPlan} from '../initialization-repair.mjs';
import {frozenWasm,hash,WASM_SHA} from '../plan.mjs';
for(const index of [0,1])test(`installed SDK can encode split ${index===0?'5A':'5B'} plan with ephemeral keys (not CLI readiness)`,async()=>{
 const api=await sdk(),c=JSON.parse(readFileSync(new URL('../config.example.json',import.meta.url)));
 const pairs=Array.from({length:8},()=>api.KeyPair.fromRandom('ed25519')),pubs=pairs.map(p=>p.getPublicKey().toString());
 c.publicKeys={owner:pubs[0],vault:pubs[1],agentAdmin:pubs[2],recipient:pubs[3],attacker:pubs[4],agents:pubs.slice(5)};c.expiresAtNs='1793548800000000000';
 const call=repairPlan(c)[index],signer=new api.KeyPairSigner(pairs[index===0?1:0]);
 const signed=await signCall(api,signer,call,1n,'11111111111111111111111111111111',frozenWasm(c));
 const tx=api.decodeSignedTransaction(Buffer.from(signed.bytes,'base64')).transaction;
 assert.equal(tx.signerId,index===0?c.accounts.vault:c.accounts.owner);assert.equal(tx.receiverId,c.accounts.vault);assert.equal(tx.actions.length,1);
 if(index===0)assert.equal(hash(Buffer.from(tx.actions[0].deployContract.code)),WASM_SHA);
 else {const action=tx.actions[0].functionCall;assert.equal(action.methodName,'new');assert.equal(action.deposit,0n);assert.equal(action.gas,100000000000000n);assert.deepEqual(JSON.parse(Buffer.from(action.args)),{owner_id:c.accounts.owner});}
 // Synthetic signatures stay in memory. Invalid block hash, no transport and no credential files.
});
