import assert from 'node:assert/strict';
// Protocol 88 Ed25519, single ordinary FunctionCall. No signing or network access.
export function functionCallCost(call,protocol,blockPrice){
 const r=protocol.runtime_config;assert.equal(protocol.protocol_version,88,'Review fee model for changed protocol');
 assert(r.min_gas_purchase_price!==undefined,'Missing protocol minimum purchase price');
 assert(call.publicKey.startsWith('ed25519:'));assert.equal(call.actions.length,1);
 const a=call.actions[0];assert.equal(a.type,'FunctionCall');
 const f=r.transaction_costs,x=f.action_creation_config,n=BigInt(Buffer.byteLength(a.method+JSON.stringify(a.args)));
 const send=call.signer===call.receiver?'send_sir':'send_not_sir';
 const sent=BigInt(f.action_receipt_creation_config[send])+BigInt(x.function_call_cost[send])+n*BigInt(x.function_call_cost_per_byte[send]);
 const remaining=BigInt(a.gas)+BigInt(f.action_receipt_creation_config.execution)+BigInt(x.function_call_cost.execution)+n*BigInt(x.function_call_cost_per_byte.execution);
 const price=BigInt(blockPrice),minimum=BigInt(r.min_gas_purchase_price),purchase=price>minimum?price:minimum;
 return {send_gas:sent.toString(),receipt_gas:remaining.toString(),purchase_price:purchase.toString(),required:(sent*price+remaining*purchase+BigInt(a.deposit)).toString()};
}
export function checkFunctionCallAllowance(call,key,protocol,price){
 const cost=functionCallCost(call,protocol,price);
 assert(BigInt(key.allowance)>=BigInt(cost.required),'Insufficient function-call allowance at protocol gas purchase price');return cost;
}
