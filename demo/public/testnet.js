const byId = id => document.getElementById(id);
function node(tag,text) {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}
function near(value) {
  const n=BigInt(value), unit=10n**24n;
  const fraction=String(n%unit).padStart(24,'0').replace(/0+$/,'');
  return String(n/unit)+(fraction?'.'+fraction:'')+' NEAR';
}
async function refresh(live) {
  byId('live').disabled=byId('captured').disabled=true;
  byId('authority').replaceChildren();
  byId('payments').replaceChildren();
  byId('status').textContent=live?'Reading finalized testnet RPC…':'Checking captured evidence…';
  try {
    const res=await fetch(live?'/api/inspector/refresh':'/api/inspector',{method:live?'POST':'GET'});
    if(!res.ok)throw Error();
    const s=await res.json(), p=s.policy, a=s.accounting;
    byId('status').textContent=(s.source_label??s.source)+' • block '+s.height+' • '+s.block;
    if(p){
      const expiry=new Date(Number(BigInt(p.expires_at_ns)/1000000n)).toISOString();
      byId('authority').append(node('p','Mandate '+p.mandate_id+' • merchant '+p.allowed_recipients.join(', ')),
        node('p','Agent '+p.agent_id+' • ceiling '+near(p.per_transaction_limit)+' • budget '+near(p.budget)),
        node('p','Expires '+expiry+' • '+(s.lifecycle??'captured at run completion')));
    }else byId('authority').append(node('p','No active mandate'));
    byId('authority').append(node('p','Available '+near(a.available)+' · Pending '+near(a.pending)+' · Spent '+near(a.spent)));
    for(const t of s.payments){
      const card=node('article','');
      card.append(node('h3',(t.step??'Payment')+' • '+t.finality+' / '+t.outcome),node('p',t.source??s.source));
      if(t.step==='T4' && t.outcome==='SUCCEEDED')card.append(node('p','Verifier matched the private payment_succeeded callback. Merchant gained 0.10 NEAR in the captured run.'));
      if(t.step==='T5' && t.outcome==='REJECTED')card.append(node('p','Vault execution returned ERR_RECIPIENT. The attacker gained zero.'));
      if(t.recipient)card.append(node('p','Requested '+t.requested_near+' NEAR to '+t.recipient));
      const link=node('a','Open transaction in testnet explorer');link.href=t.explorer;link.rel='noreferrer';link.target='_blank';card.append(link);
      const detail=node('details','');detail.append(node('summary','Receipt IDs, settlement events and errors'),node('pre',JSON.stringify(t.receipts??[],null,2)));card.append(detail);
      byId('payments').append(card);
    }
    byId('limits').replaceChildren(...s.limitations.map(x=>node('li',x)));
  } catch {
    byId('status').textContent='UNKNOWN • observation unavailable. No retry or reservation release. Use Show captured evidence for the dated run.';
  } finally {byId('live').disabled=byId('captured').disabled=false;}
}
byId('live').onclick=()=>refresh(true);
byId('captured').onclick=()=>refresh(false);
await refresh(false);
