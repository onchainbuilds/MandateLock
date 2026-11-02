// Future offline SDK compatibility gate: ephemeral in-memory key, no RPC/account/network.
import assert from 'node:assert/strict';
import {sdk,signCall} from './sdk.mjs';
import {GAS} from './plan.mjs';
const api=await sdk(),pair=api.KeyPair.fromRandom('ed25519'),signer=new api.KeyPairSigner(pair);
const publicKey=(await signer.getPublicKey()).toString();
const call={signer:'unit-only.testnet',receiver:'vault.unit-only.testnet',publicKey,
  actions:[{type:'FunctionCall',method:'execute_payment',args:{mandate_id:'1',nonce:0,recipient:'merchant.unit-only.testnet',amount:'100000000000000000000000'},deposit:'0',gas:GAS}]};
const result=await signCall(api,signer,call,1n,'11111111111111111111111111111111');
const bytes=Buffer.from(result.bytes,'base64');const decoded=api.decodeSignedTransaction(bytes);
assert.deepEqual(Buffer.from(api.encodeTransaction(decoded)),bytes);
assert.equal(decoded.transaction.signerId,call.signer);assert.equal(decoded.transaction.receiverId,call.receiver);
assert.equal(decoded.transaction.publicKey.toString(),publicKey);assert.equal(decoded.transaction.actions.length,1);
assert.equal(decoded.transaction.actions[0].functionCall.methodName,'execute_payment');
assert.equal(BigInt(decoded.transaction.actions[0].functionCall.deposit),0n);
assert.match(result.hash,/^[1-9A-HJ-NP-Za-km-z]{43,44}$/);
console.log('PASS: near-api-js 7.4.0 offline sign/encode/decode round-trip. No account or broadcast. Not runtime evidence.');
