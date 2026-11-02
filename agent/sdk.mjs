// Agent-facing planning API. No keys, signatures, broadcast client or recovery API.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {evaluatePayment,buildPaymentCall,contextFor,fixture} from '../demo/agent.mjs';
import {loadEvidence} from '../demo/evidence.mjs';
import {functionCallCost} from '../testnet/access-key-cost.mjs';
export const MODES=['offline','sandbox','testnet'];
export function inspect(context){const p=context.policy,a=context.accounting;return {mode:context.mode,source:context.source,observed_timestamp_ns:context.nowNs,mandate:p,accounting:a,lifecycle:!p?'NO_MANDATE':p.revoked?'REVOKED':p.paused?'PAUSED':BigInt(context.nowNs)>=BigInt(p.expires_at_ns)?'EXPIRED':'ACTIVE',pending_recovery:'UNAVAILABLE: never automatically release uncertain reservations',key:context.key,vault_full_access:context.vaultFullAccess,task_scope:'Owner mandate is enforced onchain. Human task labels are local metadata only.',execution_enabled:false};}
export function recordingContext(protocolReference){const e=loadEvidence(),base=contextFor(e),before=e.cases.authorized.before;return {...base,mode:'offline',source:'recorded policy plus explicitly projected protocol-88 fee check; not current chain state',snapshot:before,accounts:before.accounts,protocol:structuredClone(protocolReference.protocol),gasPrice:protocolReference.gas_price,vaultFullAccess:null};}
export function requestIdentity(taskId,proposal,context){assert(typeof taskId==='string'&&/^[A-Za-z0-9._-]{1,80}$/.test(taskId),'Invalid task identifier');return createHash('sha256').update(JSON.stringify({task_id:taskId,mandate:context.policy?.mandate_id,vault:context.vault,public_key:context.key?.public_key,recipient:proposal?.recipient,amount:proposal?.amount,nonce:proposal?.nonce,instruction:proposal?.instruction})).digest('hex');}
export function prepare(context,proposal,{taskId='judge-service-job',mode=context.mode,now=Date.now()}={}){
 assert(MODES.includes(mode),'Explicit supported mode required');assert.equal(context.mode,mode,'Context/mode mismatch');
 const request_id=requestIdentity(taskId,proposal,context),warnings=['Offchain advice only; contract checks are authoritative.','No signing or broadcasting is available in this interface.','Task label is not stored or cryptographically enforced onchain.'];
 if(context.vaultFullAccess===true)warnings.push('Vault full-access key retained: operator can bypass policy or replace code.');
 if(context.vaultFullAccess===null)warnings.push('Vault key custody is unverified in this recorded context.');
 let decision=evaluatePayment(context,proposal),cost=null,intent=null;
 decision={...decision,clock:mode==='testnet'?'finalized testnet observation':'recorded snapshot',reason:decision.reason.replace('recorded mandate','observed mandate')};
 try{
  if(mode==='testnet'){assert.equal(context.chainId,'testnet','Wrong chain');const age=BigInt(now)*1000000n-BigInt(context.nowNs);assert(age>=-10000000000n&&age<60000000000n,'Stale finalized observation');assert(context.productionVerified===true,'Frozen Wasm not verified');assert(context.vaultFullAccess!==null,'Vault permissions unavailable');}
  const a=context.accounting;assert(BigInt(a.available)+BigInt(a.pending)+BigInt(a.spent)===BigInt(a.budget),'Accounting identity mismatch');
  if(context.policy){assert.equal(a.owner_id,context.policy.owner_id,'Owner/state mismatch');assert.equal(a.budget,context.policy.budget,'Policy/accounting budget mismatch');assert.equal(a.last_mandate_id,context.policy.mandate_id,'Mandate/state mismatch');}
  const vault=context.accounts[context.vault];assert(BigInt(vault.amount)===BigInt(a.account_balance),'Account/view mismatch');assert(BigInt(vault.amount)>=BigInt(a.storage_and_operating_floor)+BigInt(a.unallocated)+BigInt(a.available),'Insufficient vault backing');
  if(decision.decision!=='BLOCK'){
   // Price even a REVIEW request without turning it into an executable call.
   const p=context.policy,call={signer:p.agent_id,publicKey:context.key.public_key,receiver:context.vault,actions:[{type:'FunctionCall',method:'execute_payment',args:{mandate_id:p.mandate_id,nonce:proposal.nonce,recipient:proposal.recipient,amount:decision.amount_yocto},deposit:'0',gas:'100000000000000'}]};
   assert(typeof context.key.allowance==='string'&&/^[0-9]+$/.test(context.key.allowance)&&BigInt(context.key.allowance)<2n**128n,'Invalid finite allowance');
   cost=functionCallCost(call,context.protocol,context.gasPrice);assert(BigInt(context.key.allowance)>=BigInt(cost.required),'Insufficient restricted-key allowance at protocol purchase price');
   const account=context.accounts[p.agent_id];assert(account.locked==='0','Agent has locked balance');assert(BigInt(account.amount)>=BigInt(account.storage_usage)*BigInt(context.protocol.runtime_config.storage_amount_per_byte)+BigInt(cost.required),'Agent cannot cover storage and prepaid gas');
   if(BigInt(a.pending)>0n)decision={...decision,decision:'REVIEW',reason:'Outstanding pending reservation requires evidence review; no automatic recovery.'};
   if(decision.decision==='ALLOW')intent=buildPaymentCall(context,proposal);
  }
 }catch(e){decision={...decision,decision:'BLOCK',reason:e.message};intent=null;}
 return {schema:'mandatelock.request.v1',request_id,task_id:taskId,mode,source:context.source,state_reference:{timestamp_ns:context.nowNs,block_hash:context.block?.hash??context.snapshot?.block_hash??null,observed_access_key_nonce:context.key?.nonce??null,nonce_policy:'Application slot is distinct from access-key nonce; refresh before separately approved signing. No nonce is reserved here.'},proposal,authorization:{...decision,scope:'advisory offchain'},fee_purchase:cost,unsigned_intent:intent,broadcast:false,signing_enabled:false,execution_enabled:false,execution_hold:mode==='testnet'?'Separate approval and R3 reconciliation required; existing execution permits disabled':'Offline/recorded evidence only',warnings};
}
export function fixtureProposal(context,name){return fixture(context,name);}
