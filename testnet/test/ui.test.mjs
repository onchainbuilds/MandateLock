import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startServer} from '../../demo/server.mjs';
test('testnet page is an isolated read-only inspector with recorded fallback and no broadcast endpoint',async()=>{
 const server=await startServer({port:0});try{
   const base=`http://127.0.0.1:${server.address().port}`;
   const html=await(await fetch(base+'/testnet')).text();assert.match(html,/READ-ONLY INSPECTOR/);assert.match(html,/recorded sandbox fallback/);assert.match(html,/cannot sign/);
   const data=await(await fetch(base+'/api/testnet')).json();assert.equal(data.network,'testnet');assert.equal(data.broadcast_enabled,false);
   assert.equal((await fetch(base+'/api/testnet',{method:'POST'})).status,404);
   assert.equal((await fetch(base+'/api/testnet/execute',{method:'POST'})).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
