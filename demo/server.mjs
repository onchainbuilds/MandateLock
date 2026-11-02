import {inspector} from '../agent/inspector.mjs';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEvidence } from './evidence.mjs';
import { contextFor,evaluatePayment,buildPaymentCall,RecordedTransport,fixture } from './agent.mjs';
import {readSession} from '../testnet/journal.mjs';
export async function startServer({port=3000}={}){
  const evidence=loadEvidence();const transport=new RecordedTransport(evidence);
  const assets=new Map(['/','/app.js','/style.css','/testnet','/testnet.js'].map(url=>[url,readFileSync(resolve(import.meta.dirname,'public',url==='/'?'index.html':url==='/testnet'?'testnet.html':url.slice(1)))]));
  const server=createServer(async(req,res)=>{
    const hosts=[`localhost:${server.address().port}`,`127.0.0.1:${server.address().port}`];
    const headers={'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store'};
    const send=(status,body,type='application/json')=>{res.writeHead(status,{...headers,'Content-Type':type+'; charset=utf-8'});res.end(type==='application/json'?JSON.stringify(body):body);};
    try {
      if(!hosts.includes(req.headers.host))return send(403,{error:'Loopback host only'});
      const url=new URL(req.url,`http://${req.headers.host}`);
      if(req.method==='GET'&&assets.has(url.pathname))return send(200,assets.get(url.pathname),url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':'text/html');
      if(req.method==='GET'&&url.pathname==='/api/inspector')return send(200,await inspector());
      if(req.method==='POST'&&url.pathname==='/api/inspector/refresh'){
        if(req.headers.origin!==`http://${req.headers.host}`)return send(403,{error:'Same-origin read required'});
        return send(200,await inspector(true));
      }
      if(req.method==='GET'&&url.pathname==='/api/testnet')return send(200,readSession());
      if(req.method==='GET'&&url.pathname==='/api/evidence')return send(200,{manifest:evidence.manifest,lock:evidence.lock,cases:evidence.cases,
        mode:'recorded-sandbox',live_enabled:false,fixtures:Object.fromEntries(['authorized','redirect','review'].map(n=>[n,fixture(contextFor(evidence),n)]))});
      if(req.method==='GET'&&url.pathname.startsWith('/evidence/')){
        const file=url.pathname.slice('/evidence/'.length);
        if(!Object.hasOwn(evidence.raw,file))return send(404,{error:'Evidence file not allowlisted'});
        // Return the exact verified bytes, not reserialized JSON, so the displayed hash is reproducible.
        return send(200,evidence.rawBytes[file],'text/plain');
      }
      if(req.method==='POST'&&url.pathname==='/api/evaluate'){
        if(req.headers.origin!==`http://${req.headers.host}`)return send(403,{error:'Same-origin request required'});
        if(req.headers['content-type']!=='application/json')return send(415,{error:'JSON only'});
        let body='';for await(const chunk of req){body+=chunk.toString();if(Buffer.byteLength(body)>8192)return send(413,{error:'Proposal too large'});}
        const input=JSON.parse(body);const context=contextFor(evidence,'authorized');
        const decision=evaluatePayment(context,input);let replay=null;
        if(decision.decision==='ALLOW'){
          const call=buildPaymentCall(context,input);
          try {replay=transport.execute(call);}catch{replay={mode:'recorded-sandbox',broadcast:false,status:'UNVERIFIED',reason:'No exact matching recorded call. This local ALLOW does not create a transaction.'};}
        }
        return send(200,{decision,replay,broadcast:false});
      }
      return send(404,{error:'Not found; no live execution endpoint exists'});
    }catch {return send(400,{error:'Invalid request; no transaction submitted'});}
  });
  server.requestTimeout=5000;server.headersTimeout=5000;
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);});
  return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  startServer().then(()=>console.log('MandateLock: http://localhost:3000 — RECORDED SANDBOX / deterministic fixture / no broadcast'))
    .catch(e=>{console.error('Demo did not start:',e.message);process.exitCode=1;});
}
