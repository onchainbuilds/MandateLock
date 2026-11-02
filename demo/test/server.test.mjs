import {test,after,before} from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'node:http';
import {startServer} from '../server.mjs';
let server,url,proposal;
before(async()=>{server=await startServer({port:0});url=`http://127.0.0.1:${server.address().port}`;const data=await(await fetch(url+'/api/evidence')).json();proposal=data.fixtures.authorized;});
after(async()=>{await new Promise(resolve=>server.close(resolve));});
const post=(body,headers={})=>fetch(url+'/api/evaluate',{method:'POST',headers:{Origin:url,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('localhost page declares recorded/no-LLM mode and sends strict CSP',async()=>{
 const r=await fetch(url);assert.equal(r.status,200);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 const html=await r.text();assert.match(html,/No live transactions. No LLM./);assert.match(html,/Recorded|RECORDED/);
});
test('local evaluation returns a recorded match but never broadcasts',async()=>{
 const r=await post(proposal),data=await r.json();assert.equal(data.decision.decision,'ALLOW');assert.equal(data.broadcast,false);
 assert.equal(data.replay.mode,'recorded-sandbox');assert.equal(data.replay.transaction_hash,'GEWrxsiERLQPMDU27oMtprXta3b4YS2Z3L44rWrWgvQs');
 const unknown=await(await post({...proposal,amount:'0.11'})).json();assert.equal(unknown.replay.status,'UNVERIFIED');
});
test('cross-origin proposals and hostile Host values are rejected',async()=>{
 assert.equal((await post(proposal,{Origin:'https://attacker.example'})).status,403);
 const status=await new Promise((resolve,reject)=>{
   get(url+'/api/evidence',{headers:{Host:'attacker.example'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));}).on('error',reject);
 });
 assert.equal(status,403);
});
test('server has no signer/deployment endpoint or arbitrary file access',async()=>{
 for(const path of ['/api/submit','/api/deploy','/evidence/production-lock.json','/evidence/%2e%2e/src/contract.rs','/.env'])
 assert.equal((await fetch(url+path)).status,404,path);
});
test('evidence response has byte-identical content and malformed requests fail closed',async()=>{
 const data=await(await fetch(url+'/api/evidence')).json();const file=data.cases.authorized.transactions[0].file;
 const r=await fetch(url+'/evidence/'+file);assert.equal(r.status,200);assert.equal((await r.text()).length,data.manifest.files[file].bytes);
 assert.equal((await post(proposal,{'Content-Type':'text/plain'})).status,415);
 assert.equal((await post({...proposal,instruction:'x'.repeat(9000)})).status,413);
 const malformed=await fetch(url+'/api/evaluate',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:'{'});assert.equal(malformed.status,400);
});
