const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'Rs. '+Number(v).toLocaleString('en-NP',{minimumFractionDigits:2});
export function mountWebsiteInbox(root,api){
 if(!root)return;
 let busy=false,previous='';
 async function load(){
  if(!root.isConnected||busy)return;
  try{const data=await api('website/orders');if(previous===JSON.stringify(data))return;previous=JSON.stringify(data);
   root.innerHTML='<h2>Website pickup & delivery requests</h2><p class="sub">Chiya ko Charcha website orders. Confirm the request and any delivery fee by phone. These requests are not paid sales; record payment in the POS when collected.</p>'+(data.records.length?data.records.map(o=>`<article class="card"><div class="sale-row"><b>#${esc(o.requestId.slice(0,8))} · ${esc(o.status)}</b><small>${esc(new Date(o.createdAt).toLocaleString('en-GB',{timeZone:'Asia/Kathmandu'}))}</small></div><p><b>${esc(o.name)}</b> · <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a> · ${esc(o.mode)}</p><p>${esc(o.address||'Counter pickup')}</p><p>${esc(o.notes)}</p>${o.items.map(i=>`<div class="sale-row"><span>${i.qty} × ${esc(i.name)}</span><strong>${money(i.qty*i.price)}</strong></div>`).join('')}<p>Total including tax: <strong>${money(o.total)}</strong></p><div class="actions">${(o.status==='pending'?['confirmed','rejected']:o.status==='confirmed'?['ready','rejected']:o.status==='ready'?['completed']:[]).map(status=>`<button class="button ${status==='rejected'?'light':''}" data-website-order="${esc(o.requestId)}" data-status="${status}">${{confirmed:'Confirm',rejected:'Reject',ready:'Mark ready',completed:'Mark completed'}[status]}</button>`).join('')}</div></article>`).join(''):'<p>No website requests yet.</p>');
  }catch(error){root.innerHTML='<h2>Website orders</h2><p role="alert">'+esc(error.message)+'</p><button class="button" data-website-retry>Retry</button>'}
 }
 root.addEventListener('click',async event=>{
  const button=event.target.closest('[data-website-order]');
  if(event.target.closest('[data-website-retry]')){previous='';await load();return}
  if(!button||busy)return;
  busy=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{await api('website/status',{id:button.dataset.websiteOrder,status:button.dataset.status});previous=''}catch(error){alert(error.message)}
  finally{busy=false;await load()}
 });
 void load();const interval=setInterval(()=>{if(!root.isConnected){clearInterval(interval);return}void load()},5000);
}
