// Offline only: no SDK, key loading, RPC, signing or account creation.
import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {deploymentPlan,validateConfig,frozenWasm,fingerprint,WASM_SHA} from './plan.mjs';
const c=JSON.parse(readFileSync(process.argv[2]??'testnet/config.example.json'));
validateConfig(c);const wasm=frozenWasm(c);
let publicConfigReady=false;try{validateConfig(c,{ready:true});publicConfigReady=true;}catch{}
const output={mode:'PREPARATION ONLY — NOT APPROVED',config_sha256:fingerprint(c),wasm_sha256:WASM_SHA,wasm_bytes:wasm.length,
  accounts:c.accounts,external_faucet_cap_near:'8',owner_distributions_near:'6.2',vault_reserve_near:'4',mandate_principal_near:'1',
  checks:{public_config_ready:publicConfigReady,sdk_installed:existsSync('testnet/node_modules/near-api-js'),public_transactions_executed:false},
  blockers:[...(!publicConfigReady?['Actual public keys and expiry required']:[]),'Explicit public-chain approval required','Refresh account availability/protocol checks immediately before approved execution'],
  deployment:deploymentPlan(c),demo:['authorized .10: A=.90 P=0 S=.10','scripted redirect BLOCK: no transaction','independent direct-rejection: ERR_RECIPIENT','three .40 requests: two success, one ERR_BUDGET; A=.10 P=0 S=.90'],
  approval_template:{approved:false,network:'testnet',config_sha256:fingerprint(c),wasm_sha256:WASM_SHA,max_external_funding_near:'8',expires_at:null,
    operations:[...deploymentPlan(c).map(x=>x.id),'authorized','direct-rejection','concurrency']}};
mkdirSync('artifacts/phase4',{recursive:true});writeFileSync('artifacts/phase4/deployment-plan.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
