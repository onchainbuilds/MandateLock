import assert from 'node:assert/strict';
import {fingerprint} from './plan.mjs';
export function checkReviewedNetwork(config,protocol,gasPrice){
 const r=config.networkReview;assert(r,'Reviewed protocol/funding limits required');
 assert.equal(protocol.chain_id,'testnet');assert.equal(protocol.protocol_version,r.protocol_version,'Protocol changed: refresh approval package');
 assert.equal(protocol.runtime_config.storage_amount_per_byte,r.storage_amount_per_byte,'Storage price changed');
 assert(typeof r.account_creation_charge==='string'&&/^[1-9]\d*$/.test(r.account_creation_charge),'Reviewed account creation charge required');
 assert.equal(protocol.runtime_config.account_creation_charge,r.account_creation_charge,'Account creation charge changed');
 assert.equal(fingerprint(protocol.runtime_config.transaction_costs),r.transaction_costs_sha256,'Action fee schedule changed');
 assert(BigInt(gasPrice)>0n&&BigInt(gasPrice)<=BigInt(r.max_gas_price),'Gas price exceeds reviewed funding ceiling');
}
