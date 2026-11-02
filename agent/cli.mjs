#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {loadEvidence} from '../demo/evidence.mjs';
import {RecordedTransport} from '../demo/agent.mjs';
import {inspect,prepare,recordingContext,fixtureProposal,MODES} from './sdk.mjs';
import {loadPack} from './evidence-pack.mjs';
import {receipt} from './receipts.mjs';
import {readOnlyRpc,observe} from './observe.mjs';
try{
 const [command,...args]=process.argv.slice(2);assert(['inspect','request'].includes(command),'Usage: inspect|request --mode offline|sandbox|testnet [--fixture authorized|redirect|review | --input file|-] [--task id]');
 const opts={mode:'offline',fixture:'authorized',task:'judge-service-job'};for(let i=0;i<args.length;i+=2){assert(['--mode','--fixture','--input','--task','--vault','--agent','--public-key'].includes(args[i])&&args[i+1],'Unsupported argument; no execution switch exists');opts[args[i].slice(2)]=args[i+1];}assert(MODES.includes(opts.mode));
 let proposal=opts.input?JSON.parse(readFileSync(opts.input==='-'?0:opts.input,'utf8')):null,context;
 if(opts.mode==='testnet'){assert(opts.vault&&opts.agent&&opts['public-key'],'Testnet reads require explicit vault, agent and public key');context=await observe({rpc:readOnlyRpc(),vault:opts.vault,agent:opts.agent,publicKey:opts['public-key'],nonce:proposal?.nonce??0});}
 else{context=recordingContext(loadPack().files['fee-reference.json']);context.mode=opts.mode;}
 if(command==='inspect')console.log(JSON.stringify(inspect(context),null,2));
 else{
  proposal??=fixtureProposal(context,opts.fixture);const request=prepare(context,proposal,{taskId:opts.task});let result=receipt(request);
  if(opts.mode==='sandbox'&&request.unsigned_intent){const e=loadEvidence();try{const match=new RecordedTransport(e).execute(request.unsigned_intent),c=Object.values(e.cases).find(c=>c.transactions.some(t=>t.raw.transaction.hash===match.transaction_hash)),tx=c.transactions.find(t=>t.raw.transaction.hash===match.transaction_hash);result=receipt(request,{raw:tx.raw,after:c.after,expectedHash:match.transaction_hash,evidence:tx.file});}catch{result.note='No matching verified recording; no execution or success is implied.';}}
  console.log(JSON.stringify({request,receipt:result,transport:opts.mode==='sandbox'?'recorded-sandbox replay, not live sandbox':opts.mode==='testnet'?'read-only testnet; execution disabled':'offline unsigned planning'},null,2));
 }
}catch(e){console.error(JSON.stringify({status:'BLOCKED',message:e instanceof SyntaxError?'Invalid JSON input':e.message,broadcast:false}));process.exitCode=1;}
