// Real installed SDK, offline only. Ephemeral memory keys and invalid zero block hash.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createPublicKey,verify} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {sdk,signCall} from '../sdk.mjs';
import {deploymentPlan,scenario,frozenWasm} from '../plan.mjs';
const api=await sdk(),c=JSON.parse(readFileSync(new URL('../config.example.json',import.meta.url)));
const pairs=Array.from({length:8},()=>api.KeyPair.fromRandom('ed25519'));
const pubs=pairs.map(p=>p.getPublicKey().toString());
c.publicKeys={owner:pubs[0],vault:pubs[1],agentAdmin:pubs[2],recipient:pubs[3],attacker:pubs[4],agents:pubs.slice(5)};
c.expiresAtNs='1793548800000000000';
const wasm=frozenWasm(c),calls=[...deploymentPlan(c),...['authorized','direct-rejection','concurrency'].flatMap(n=>scenario(c,n))];
for(let i=0;i<calls.length;i++)test(`installed SDK signs and verifies exact planned transaction ${i+1} without network`,async()=>{
 const call=calls[i];
 const key=call.publicKey??(call.signer===c.accounts.owner?pubs[0]:call.signer===c.accounts.vault?pubs[1]:pubs[2]);
 const pair=pairs[pubs.indexOf(key)],signer=new api.KeyPairSigner(pair);
 const signed=await signCall(api,signer,call,1n,'11111111111111111111111111111111',wasm);
 const wire=Buffer.from(signed.bytes,'base64'),decoded=api.decodeSignedTransaction(wire),tx=decoded.transaction;
 assert.deepEqual(Buffer.from(api.encodeTransaction(decoded)),wire);
 assert.equal(tx.signerId,call.signer);assert.equal(tx.receiverId,call.receiver);assert.equal(tx.actions.length,call.actions.length);
 const digest=createHash('sha256').update(api.encodeTransaction(tx)).digest();assert.equal(api.baseEncode(digest),signed.hash);
 const publicKey=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(api.baseDecode(key.split(':')[1]))]),format:'der',type:'spki'});
 assert(verify(null,digest,publicKey,Buffer.from(decoded.signature.ed25519Signature.data)),'Independent Node Ed25519 verification');
 call.actions.forEach((a,j)=>{
   const actual=tx.actions[j];
   if(a.type==='FunctionCall'){assert.equal(actual.functionCall.methodName,a.method);assert.deepEqual(JSON.parse(Buffer.from(actual.functionCall.args)),a.args);assert.equal(actual.functionCall.gas,BigInt(a.gas));assert.equal(actual.functionCall.deposit,BigInt(a.deposit));}
   if(a.type==='Transfer')assert.equal(actual.transfer.deposit,BigInt(a.deposit));
   if(a.type==='DeployContract')assert.deepEqual(Buffer.from(actual.deployContract.code),wasm);
   if(a.type==='AddFunctionCallKey'){const p=actual.addKey.accessKey.permission.functionCall;assert.equal(p.receiverId,c.accounts.vault);assert.deepEqual(p.methodNames,['execute_payment']);assert.equal(p.allowance,BigInt(a.allowance));}
 });
});
