// Official near-api-js 7.4.0 flat exports; no implicit account/key-store discovery.
import assert from 'node:assert/strict';
import {readFileSync,realpathSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute,dirname,join} from 'node:path';
import {createRequire} from 'node:module';
export async function sdk(){
  const require=createRequire(import.meta.url);
  let dir=dirname(require.resolve('near-api-js')),metadata;
  while(dirname(dir)!==dir){const p=resolve(dir,'package.json');if(existsSync(p)){const m=JSON.parse(readFileSync(p));if(m.name==='near-api-js'){metadata=m;break;}}dir=dirname(dir);}
  assert.equal(metadata?.version,'7.4.0','Reviewed SDK version required');
  return import('near-api-js');
}
export async function signerFromFile(file,expectedAccount,expectedKey){
  // Separate operator-managed credential directory outside this project; no generic key-store search.
  const root=realpathSync(resolve(import.meta.dirname,'..')),actual=realpathSync(file),rel=relative(root,actual);
  assert(rel.startsWith('..')||isAbsolute(rel),'Credentials must be outside project');
  const data=JSON.parse(readFileSync(actual));assert.equal(data.account_id,expectedAccount);assert.equal(data.public_key,expectedKey);
  assert(typeof data.private_key==='string'&&data.private_key.startsWith('ed25519:'));
  const api=await sdk(),signer=api.KeyPairSigner.fromSecretKey(data.private_key);
  assert.equal((await signer.getPublicKey()).toString(),expectedKey,'Credential does not match approved public key');
  return {api,signer};
}
export function requireAgentCredentialPath(file,directory,index){
  assert(Number.isInteger(index)&&index>=0&&index<3);
  const actual=realpathSync(file),expected=join(realpathSync(directory),`agent-${index}.secret.json`);
  assert.equal(actual.toLowerCase(),expected.toLowerCase(),'Agent credential must be its dedicated file; operator paths refused before reading');
  return actual;
}
export async function agentSignerFromFile(file,config,publicKey){
  assert.equal(config.custodyProfile,'phase4-20261031','Reviewed custody profile required');
  assert(process.env.LOCALAPPDATA,'Windows protected credential root required');
  const directory=join(process.env.LOCALAPPDATA,'MandateLock',config.custodyProfile,'agent');
  const actual=requireAgentCredentialPath(file,directory,config.publicKeys.agents.indexOf(publicKey));
  return signerFromFile(actual,config.accounts.agent,publicKey);
}
export async function signCall(api,signer,call,nonce,blockHash,wasm){
  const action=api.actions,pk=api.PublicKey;
  const actions=call.actions.map(a=>{
    switch(a.type){
      case 'FunctionCall':return action.functionCall(a.method,a.args,BigInt(a.gas),BigInt(a.deposit));
      case 'CreateAccount':return action.createAccount();
      case 'Transfer':return action.transfer(BigInt(a.deposit));
      case 'AddFullAccessKey':return action.addFullAccessKey(pk.fromString(a.publicKey));
      case 'AddFunctionCallKey':return action.addFunctionCallAccessKey(pk.fromString(a.publicKey),a.receiver,a.methods,BigInt(a.allowance));
      case 'DeployContract':assert(wasm);return action.deployContract(wasm);
      default:throw Error('Unsupported action');
    }
  });
  const publicKey=await signer.getPublicKey();if(call.publicKey)assert.equal(publicKey.toString(),call.publicKey);
  const tx=api.createTransaction(call.signer,publicKey,call.receiver,nonce,actions,api.baseDecode(blockHash));
  const {signedTransaction,txHash}=await signer.signTransaction(tx);
  return {hash:api.baseEncode(txHash),bytes:Buffer.from(api.encodeTransaction(signedTransaction)).toString('base64')};
}
