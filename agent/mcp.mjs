import {paymentInbox} from './inbox.mjs';
import {createInterface} from 'node:readline';
import assert from 'node:assert/strict';
import {prepare,recordingContext} from './sdk.mjs';
import {loadPack} from './evidence-pack.mjs';
import {receipt} from './receipts.mjs';
import {RecordedTransport} from '../demo/agent.mjs';
import {loadEvidence} from '../demo/evidence.mjs';
import {computeTask,authority} from './task.mjs';
import {currentContext,paymentStatus} from './inspector.mjs';
import {readOnlyRpc} from './observe.mjs';

const versions=['2025-11-25','2025-06-18','2025-03-26','2024-11-05'];
const args=process.argv.slice(2);
let inbox;
const inboxIndex=args.indexOf('--outbox');
if(inboxIndex>=0){
  const [flag,dir]=args.splice(inboxIndex,2);
  assert(dir && !dir.startsWith('--'),'Expected local unsigned request directory');
  inbox=paymentInbox(dir);
}
assert(args.length===0 || (args.length===1 && ['--testnet-read-only','--sandbox-replay'].includes(args[0])), 'Unsupported server mode');
const live=args[0]==='--testnet-read-only';
const replay=args[0]==='--sandbox-replay';
const recorded=recordingContext(loadPack().files['fee-reference.json']);
if(replay)recorded.mode='sandbox';
const requests=new Map();
const text={type:'string'}, nonce={type:'integer',minimum:0,maximum:63};
const proposal={recipient:text,amount:text,nonce,instruction:text};
function tool(name,description,properties={},required=Object.keys(properties)){
  return {name,description,inputSchema:{type:'object',properties,required,additionalProperties:false}};
}
const tools=[
  tool('inspect_authority','Inspect mandate lifecycle, observed clock, spending and restricted authority.'),
  tool('draft_compute_task','Draft owner configuration for a one-hour compute purchasing job; no state change.',{merchant:text,start_utc:text},[]),
  tool('check_payment','Evaluate untrusted payment fields against current authority.',proposal),
  tool('request_payment','Prepare a zero-deposit, restricted-key-bound unsigned payment request. Execution is disabled.',proposal),
  tool('get_payment_status','Look up a session request ID or T4/T5 public transaction hash.',{id:text})
];
function validate(tool,args){
  assert(args && typeof args==='object' && !Array.isArray(args),'Expected arguments object');
  for(const key of Object.keys(args))assert(Object.hasOwn(tool.inputSchema.properties,key),'Unexpected argument');
  for(const key of tool.inputSchema.required)assert(Object.hasOwn(args,key),'Missing required argument');
  for(const key of Object.keys(args)){
    const value=args[key];
    if(key==='nonce')assert(Number.isInteger(value)&&value>=0&&value<64,'Invalid nonce');
    else assert(typeof value==='string'&&value.length>0&&value.length<=2000,'Invalid string argument');
  }
}
async function invoke(name,args){
  if(name==='get_payment_status'){
    return requests.get(args.id) ?? inbox?.get(args.id)?.receipt ?? await paymentStatus(args.id,live?readOnlyRpc():null);
  }
  const context=live?await currentContext(args.nonce??0):recorded;
  if(name==='inspect_authority')return authority(context);
  if(name==='draft_compute_task')return computeTask(context,args.start_utc?new Date(args.start_utc):new Date(),args.merchant);
  const request=prepare(context,args,{taskId:'compute-purchase'});
  if(name==='check_payment')return {decision:request.authorization,fee_purchase:request.fee_purchase,source:context.source};
  let result=receipt(request);
  if(replay && request.unsigned_intent){
    const evidence=loadEvidence();
    let match;
    try {match=new RecordedTransport(evidence).execute(request.unsigned_intent);}
    catch {result.note='No exact historical match. Request remains unsigned and unsubmitted.';}
    if(match){
      const sample=Object.values(evidence.cases).find(c=>c.transactions.some(x=>x.file===match.evidence_file));
      result=receipt(request,{raw:evidence.raw[match.evidence_file],after:sample.after,
        expectedHash:match.transaction_hash,evidence:match.evidence_file});
      result.source='Exact replay of a historical restricted-key payment; no new submission';
    }
  }
  let handoff=null;
  if(inbox && request.unsigned_intent && result.payment_status==='NOT_SUBMITTED'){
    inbox.put(request,result);handoff='STORED_UNSIGNED_OPERATOR_REQUEST';
  }
  if(requests.size>=256&&!requests.has(request.request_id))requests.delete(requests.keys().next().value);
  requests.set(request.request_id,result);
  return {handoff,request_id:request.request_id,decision:request.authorization,unsigned_intent:request.unsigned_intent,
    fee_purchase:request.fee_purchase,receipt:result,broadcast:false,source:context.source};
}
let phase='new';
const send=value=>process.stdout.write(JSON.stringify(value)+'\n');
const error=(id,code,message)=>send({jsonrpc:'2.0',id,error:{code,message}});
for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})){
  let message;
  try{message=JSON.parse(line);}catch{error(null,-32700,'Invalid JSON');continue;}
  if(!message||message.jsonrpc!=='2.0'||typeof message.method!=='string'){
    error(null,-32600,'Invalid JSON-RPC request');continue;
  }
  const {id,method,params={}}=message;
  if(id===undefined){
    if(method==='notifications/initialized'&&phase==='negotiated')phase='ready';
    continue;
  }
  if(typeof id!=='string'&&!Number.isSafeInteger(id)){error(null,-32600,'Invalid request ID');continue;}
  let result;
  if(method==='ping')result={};
  else if(method==='initialize'&&phase==='new'){
    if(!params?.clientInfo?.name||!params.clientInfo.version||typeof params.protocolVersion!=='string'||!params.capabilities){
      error(id,-32602,'Missing initialization parameters');continue;
    }
    phase='negotiated';
    result={protocolVersion:versions.includes(params.protocolVersion)?params.protocolVersion:versions[0],
      capabilities:{tools:{}},serverInfo:{name:'mandatelock',version:'1.0.0'}};
  }else if(phase!=='ready'){error(id,-32002,'Initialization required');continue;}
  else if(method==='tools/list')result={tools};
  else if(method==='tools/call'){
    const selected=tools.find(t=>t.name===params?.name);
    if(!selected){error(id,-32602,'Unknown tool');continue;}
    try{validate(selected,params.arguments??{});}catch(e){error(id,-32602,e.message);continue;}
    try{const value=await invoke(selected.name,params.arguments??{});result={content:[{type:'text',text:JSON.stringify(value)}]};}
    catch{result={isError:true,content:[{type:'text',text:'Verified context unavailable. Request stopped; no payment submitted.'}]};}
  }else{error(id,-32601,'Method unavailable');continue;}
  send({jsonrpc:'2.0',id,result});
}
