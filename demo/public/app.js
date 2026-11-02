const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const near=value=>{const n=BigInt(value);return `${n/10n**24n}.${(n%10n**24n).toString().padStart(24,'0')}`.replace(/\.?0+$/,'');};
const pair=(dl,name,value)=>{dl.append(el('dt',name),el('dd',value));};
const rawLink=(file,label)=>{const a=el('a',label);a.href='/evidence/'+file;a.target='_blank';a.rel='noreferrer';return a;};
function receiptText(outcome){
 let text=JSON.stringify(outcome.status);
 if(outcome.status.SuccessValue!==undefined){try{text='Success · '+(atob(outcome.status.SuccessValue)||'empty result');}catch{}}
 for(const log of outcome.logs??[]){
   if(!log.startsWith('EVENT_JSON:'))continue;
   try{const event=JSON.parse(log.slice(11)),d=event.data?.[0];text+='\n'+event.event;
     if(d?.available!==undefined)text+=` · available ${near(d.available)} / pending ${near(d.pending)} / spent ${near(d.spent)}`;
   }catch{}
 }
 return text;
}
let evidence,currentStep=1;
function snapshot(c,after=false){
 const s=after?c.after:c.before,p=s.policy,a=s.accounting;
 $('context').textContent=`${c.id} fixture · ${after?'after final execution':'before payment'} · recorded block ${s.block_height}`;
 $('identities').replaceChildren();pair($('identities'),'Owner',p.owner_id);pair($('identities'),'Agent',p.agent_id);pair($('identities'),'Approved merchant',p.allowed_recipients[0]);
 $('budget').textContent=near(p.budget)+' NEAR';$('ceiling').textContent=near(p.per_transaction_limit)+' NEAR';
 for(const k of ['available','pending','spent'])$(k).textContent=near(a[k]);
 $('physical').replaceChildren();pair($('physical'),'Physical vault',near(a.account_balance)+' NEAR');pair($('physical'),'Required liquid backing',near(s.required_liquid_backing)+' NEAR');
 $('authority').replaceChildren();const dl=el('dl');pair(dl,'Receiver',c.keys[0].receiver_id);pair(dl,'Only method','execute_payment · attached deposit 0');pair(dl,'Gas allowance per recorded key',near(c.keys[0].allowance)+' NEAR (gas, not spending budget)');pair(dl,'All allowlisted recipients',p.allowed_recipients.join(', '));pair(dl,'Expiry (chain nanoseconds)',p.expires_at_ns);pair(dl,'Evaluation clock',s.block_timestamp_ns+' ns — historical snapshot, not current time');$('authority').append(dl,rawLink(c.keys[0].file,'Inspect recorded key grant ↗'));
}
function showTransactions(c,entries,note){
 $('transactions').replaceChildren();$('evidence-note').textContent=note;
 for(const entry of entries){const tx=entry.raw.transaction,r=entry.raw,failed=!!r.status.Failure;
   const box=el('article',undefined,'transaction'),title=el('div',undefined,'tx-title');
   const method=tx.actions[0].FunctionCall?.method_name??'protocol action';title.append(el('span',method),el('span',failed?'REJECTED / FINAL':'SUCCEEDED / FINAL','status'+(failed?' failed':'')));
   box.append(title,el('code',tx.hash,'hash'),el('p',`Signer: ${tx.signer_id} · Public key: ${tx.public_key}`,'small'));
   if(failed)box.append(el('pre',JSON.stringify(r.status.Failure,null,2)));
   box.append(rawLink(entry.file,'Open complete transaction JSON ↗'));
   const details=el('details'),table=el('table',undefined,'receipts'),head=el('tr');
   for(const h of ['Receipt / executor','Outcome','Tgas'])head.append(el('th',h));table.append(head);
   for(const receipt of r.receipts_outcome){const row=el('tr'),cell=el('td');cell.append(el('code',receipt.id),el('p',receipt.outcome.executor_id));
     row.append(cell,el('td',receiptText(receipt.outcome)),el('td',(receipt.outcome.gas_burnt/1e12).toFixed(6)));table.append(row);}
   details.append(el('summary',`${r.receipts_outcome.length} actual receipt outcomes & gas`),table);box.append(details);$('transactions').append(box);
 }
 $('sources').replaceChildren(rawLink(c.before_file,'Before snapshot ↗'),rawLink(c.after_file,'After snapshot ↗'),rawLink(c.configuration.file,'Owner create_mandate transaction ↗'));
}
async function evaluate(proposal){
 const stepAtRequest=currentStep;
 const response=await fetch('/api/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(proposal)});
 const result=await response.json();if(!response.ok)throw Error(result.error);
 if(currentStep!==stepAtRequest)return result;
 const box=el('div',undefined,'decision-box '+result.decision.decision.toLowerCase());
 box.append(el('strong',result.decision.decision+' · LOCAL DETERMINISTIC POLICY'),el('p',result.decision.reason),el('p','No network submission. No LLM was invoked.'),el('p',`Policy clock: ${result.decision.timestamp_ns} ns (recorded pre-payment snapshot).`));
 if(result.replay)box.append(el('p',result.replay.transaction_hash?`Exact recorded match: ${result.replay.transaction_hash}`:result.replay.reason));
 $('decision').replaceChildren(box);return result;
}
function action(label,fn,secondary=false){const b=el('button',label,secondary?'secondary':'primary');b.addEventListener('click',async()=>{b.disabled=true;try{await fn();}catch(e){$('error').hidden=false;$('error').textContent=e.message;}finally{b.disabled=false;}});return b;}
function render(step){
 currentStep=step;$('error').hidden=true;$('decision').replaceChildren();$('scene-body').replaceChildren();
 document.querySelectorAll('[data-step]').forEach(b=>{if(Number(b.dataset.step)===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 const c=evidence.cases[step===4?'recipient':step===5?'concurrency':'authorized'];snapshot(c,step===4||step===5);
 $('step-label').textContent=`STEP 0${step} / RECORDED SANDBOX`;
 const titles=['Create a bounded mandate','Pay the approved merchant','An instruction is not authority','The contract rejects the redirect','Three requests. One hard budget.'];
 const descriptions=[
 'Replay the owner’s actual create_mandate receipt. This creates no account or mandate on your machine.',
 'The fixture proposes 0.10 NEAR to the approved merchant. ALLOW prepares only execute_payment with zero attached deposit and an approved restricted key.',
 'A scripted adversarial message proposes a recipient substitution. The structured proposal is deterministic; no LLM interpreted this text.',
 'A separate sandbox transaction bypassed the local policy gate and reached the vault using a restricted agent key. The contract itself rejected the unapproved recipient.',
 'In a separate 1.00 NEAR sandbox mandate, three independently signed 0.40 NEAR requests reached the vault. Only two could reserve budget.'];
 $('scene-title').textContent=titles[step-1];$('scene-description').textContent=descriptions[step-1];
 if(step===1){$('scene-body').append(el('div','Owner sets 1.00 NEAR total, 0.40 NEAR per payment, recipient allowlist and expiry. The agent can request payments; it cannot edit the mandate.','callout'),action('Replay mandate creation',()=>showTransactions(c,[c.configuration],'Actual owner-signed setup transaction from the source run. No new transaction.')));showTransactions(c,[c.configuration],'Recorded owner setup, followed by the pre-payment balance snapshot.');}
 if(step===2){$('scene-body').append(el('div',evidence.fixtures.authorized.instruction,'callout'),action('Run policy + replay payment',async()=>{const r=await evaluate(evidence.fixtures.authorized);if(currentStep===2&&r.replay?.transaction_hash){snapshot(c,true);showTransactions(c,c.transactions,'Recorded successful transfer and callback. Recipient balance increased by exactly 0.10 NEAR.');}}));
   showTransactions(c,[],'Press the button to run the local policy check and inspect the exact matching historical payment.');}
 if(step===3){$('scene-body').append(el('div',evidence.fixtures.redirect.instruction,'callout attack'));
   const form=el('div',undefined,'form-grid'),recipientLabel=el('label','Proposed recipient'),recipient=el('input');recipient.value=evidence.fixtures.redirect.recipient;recipient.id='proposal-recipient';recipientLabel.htmlFor=recipient.id;recipientLabel.append(recipient);
   const amountLabel=el('label','Amount (NEAR)'),amount=el('input');amount.value='0.10';amount.id='proposal-amount';amountLabel.htmlFor=amount.id;amountLabel.append(amount);form.append(recipientLabel,amountLabel);$('scene-body').append(form,
     action('Evaluate proposal',()=>evaluate({...evidence.fixtures.redirect,recipient:recipient.value,amount:amount.value})),
     action('Show REVIEW example',()=>{recipient.value=evidence.fixtures.review.recipient;amount.value=evidence.fixtures.review.amount;return evaluate(evidence.fixtures.review);},true),
     el('p','REVIEW holds amounts ≥0.25 NEAR for human review. It does not grant permission or send a transaction. These checks use the recorded pre-payment policy clock.','small'));
   showTransactions(c,[],'A local BLOCK has no transaction hash. Step 04 separately proves the contract boundary when the gate is bypassed.');}
 if(step===4){$('scene-body').append(el('div','ERR_RECIPIENT · The vault rejected the call. Available = 1.00, pending = 0, spent = 0. The attacker received no payment.','callout attack'),el('p','Independent recipient fixture: different account IDs from steps 01–03. This is recorded onchain rejection, not a newly submitted attack.','small'));showTransactions(c,c.transactions,'Actual FINAL failed transaction, independent of the local policy fixture. Expected rejection is a passing security test.');}
 if(step===5){$('scene-body').append(el('div','Requested 1.20 NEAR against a 1.00 NEAR budget. Accepted 0.80 NEAR. Remaining 0.20 NEAR.','callout'));
   c.transactions.forEach((entry,i)=>{const tx=entry.raw.transaction;const row=el('div',undefined,'row-result');row.append(el('strong',`Request ${i+1} · 0.40 NEAR · ${entry.raw.status.Failure?'ERR_BUDGET':'SETTLED'}`),el('code',tx.public_key,'hash'));$('scene-body').append(row);});
   $('scene-body').append(el('p','Three distinct signing keys and transaction hashes; all reached the vault; pending overlap observed. These direct calls bypass the local REVIEW threshold. No nonce conflict counted as budget enforcement.','small'));
   showTransactions(c,c.transactions,'Final accounting is from the concurrency fixture. Reservation events in receipts show pending budget; final callbacks show settlement.');}
}
try{
 const response=await fetch('/api/evidence');if(!response.ok)throw Error('Evidence verification failed. See server log.');evidence=await response.json();
 $('run-link').href=evidence.manifest.workflow_url;$('verification').textContent='27 FILE HASHES VERIFIED';
 $('provenance').textContent=JSON.stringify({mode:evidence.mode,live_enabled:false,model:'deterministic fixture — no LLM',source:evidence.manifest,production:evidence.lock},null,2);
 document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>render(Number(b.dataset.step))));render(1);
}catch(e){$('error').hidden=false;$('error').textContent=e.message;$('verification').textContent='UNVERIFIED';}
