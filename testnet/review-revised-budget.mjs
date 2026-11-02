// Offline forecast from the current captured finalized protocol/state. No RPC or signer.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {budgetForecast,checkBudgetPermit,checkDeploymentFunding} from './budget.mjs';
import {frozenWasm,UNIT} from './plan.mjs';
const [dir='artifacts/phase4-fee-correction',config='testnet/config.fee-reviewed.json',permit='testnet/approval.fee-reviewed.json']=process.argv.slice(2);
const c=JSON.parse(readFileSync(config)),p=JSON.parse(readFileSync(permit));
const observed=JSON.parse(readFileSync(dir+'/preflight.json')),protocol=JSON.parse(readFileSync(dir+'/protocol.json')).result;
const b=budgetForecast(c,protocol,observed.gas_price,frozenWasm(c).length);checkBudgetPermit(c,p,b);
checkDeploymentFunding(c,'create-vault',b,observed.owner,observed.owner,protocol.runtime_config.storage_amount_per_byte);
const bySigner={};for(const r of b.rows)bySigner[r.call.signer]=(BigInt(bySigner[r.call.signer]??0)+BigInt(r.fee)).toString();
const ordinary=4096n*BigInt(protocol.runtime_config.storage_amount_per_byte),vaultFloor=256000n*BigInt(protocol.runtime_config.storage_amount_per_byte)+UNIT/100n;
const reserve={owner:10n*UNIT-62n*UNIT/10n-BigInt(bySigner[c.accounts.owner])-ordinary,
 vault_reserve_excluding_remaining_principal:4n*UNIT-BigInt(bySigner[c.accounts.vault])-vaultFloor,
 agent:UNIT-BigInt(bySigner[c.accounts.agent])-ordinary,
 recipient_after_expected_payouts:UNIT-ordinary,attacker:UNIT/10n-ordinary};
assert(Object.values(reserve).every(n=>n>0n));
const report={forecast_only:true,network:'testnet',observed_at:observed.observed_at,block_hash:observed.block_hash,starting_owner_balance:observed.owner.amount,
 budget:b,fees_by_signer:bySigner,storage_bound_per_ordinary_account:ordinary.toString(),storage_and_operating_vault_bound:vaultFloor.toString(),
 expected_successful_payouts:(9n*UNIT/10n).toString(),expected_transfers_deposits_and_fee_bound:(71n*UNIT/10n+BigInt(b.fees)).toString(),
 expected_owner_balance_after_fees:(38n*UNIT/10n-BigInt(bySigner[c.accounts.owner])).toString(),
 expected_aggregate_accounts_balance_after_fee_bound:(10n*UNIT-BigInt(b.fees)).toString(),remaining_after_storage_and_obligations:Object.fromEntries(Object.entries(reserve).map(([k,v])=>[k,v.toString()])),
 storage_note:'Storage is an encumbrance inside funded balances, not an additional transfer. Gross outgoing counts setup funding and downstream payouts separately; do not subtract gross internal transfers from aggregate owned account balances.',
 limitations:['Fee/storage figures are conservative bounds, not runtime observations','No extra funding, transactions, automatic retry, or pending restoration permitted','Fee schedule, gas ceiling and measured funding must match again before signing']};
writeFileSync(dir+'/revised-funding-review.json',JSON.stringify(report,null,2)+'\n');writeFileSync(dir+'/exact-transactions.json',JSON.stringify(b.rows,null,2)+'\n');
console.log(JSON.stringify({...report,budget:{...b,rows:b.rows.length}},null,2));
