// Explicitly approved local key generation only. No RPC or external account creation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {sdk} from './sdk.mjs';
const destination=realpathSync(process.argv[2]);
const root=realpathSync(resolve(import.meta.dirname,'..')),rel=relative(root,destination);
assert(rel.startsWith('..')||isAbsolute(rel),'Keys must be outside project');
assert(existsSync(resolve(destination,'operator'))&&existsSync(resolve(destination,'agent')),'Create and protect both directories first');
const c=JSON.parse(readFileSync('testnet/config.example.json'));
assert(!existsSync('testnet/config.reviewed.json'),'Never overwrite a reviewed key manifest');
const api=await sdk();
const roles=[['owner','owner','operator'],['vault','vault','operator'],['agentAdmin','agent','operator'],['recipient','recipient','operator'],['attacker','attacker','operator'],
 ['agent-0','agent','agent'],['agent-1','agent','agent'],['agent-2','agent','agent']];
for(const [role] of roles)assert(!existsSync(resolve(destination,role.startsWith('agent-')?'agent':'operator',role+'.secret.json')),'Credential already exists');
for(const [role,accountRole,folder] of roles){
  const pair=api.KeyPair.fromRandom('ed25519'),publicKey=pair.getPublicKey().toString();
  writeFileSync(resolve(destination,folder,role+'.secret.json'),JSON.stringify({account_id:c.accounts[accountRole],public_key:publicKey,private_key:pair.toString()})+'\n',{flag:'wx',mode:0o600,flush:true});
  if(role.startsWith('agent-'))c.publicKeys.agents.push(publicKey);else c.publicKeys[role]=publicKey;
}
c.expiresAtNs=(BigInt(Date.parse('2026-11-01T16:00:00Z'))*1000000n).toString();
writeFileSync('testnet/config.reviewed.json',JSON.stringify(c,null,2)+'\n',{flag:'wx'});
console.log('Created 8 separate local credentials. Only public keys were written to config.reviewed.json. No accounts or transactions.');
