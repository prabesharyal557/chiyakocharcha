/* Public menu/order API only. No staff credentials are used by this site. */
(() => {
  const base='https://sajilo-restaurant.aryalprabesh300.workers.dev/api/public';
  const storage='charcha-basket';
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'NPR '+Number(n).toLocaleString('en-NP',{minimumFractionDigits:2,maximumFractionDigits:2});
  let menu;
  function bag(){try{const value=JSON.parse(localStorage.getItem(storage)||'[]');return Array.isArray(value)?value.filter(i=>typeof i.menuId==='string'&&Number.isInteger(i.qty)&&i.qty>0&&i.qty<=20):[]}catch{return []}}
  function save(items){localStorage.setItem(storage,JSON.stringify(items));window.updateBag?.()}
  async function api(path,payload){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(base+path,{credentials:'omit',signal:controller.signal,cache:'no-store',method:payload?'POST':'GET',headers:{'X-Sajilo-Restaurant':'101',...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'The café could not accept this request. Please try again.');
      return result;
    }catch(error){if(error.name==='AbortError')throw Error('The connection timed out. Your bag is saved. Retry to check the same request.');throw error}finally{clearTimeout(timeout)}
  }
  function calculate(items){
    const subtotal=Math.round(items.reduce((n,i)=>n+i.price*i.qty,0)*100)/100;
    const tax=Math.round(subtotal*menu.taxRate)/100;
    return {subtotal,tax,total:Math.round((subtotal+tax)*100)/100};
  }
  function reconcile(){
    const existing=bag(),valid=existing.flatMap(line=>{const item=menu.items.find(i=>i.id===line.menuId&&i.available);return item?[{id:item.id,menuId:item.id,name:item.name,price:item.price,qty:line.qty}]:[]});
    save(valid);return existing.length!==valid.length;
  }
  function add(id){
    if(!menu.open){notify('The café is closed for online orders. Please call us.');return}
    const item=menu.items.find(i=>i.id===id&&i.available);if(!item)return;
    const items=bag(),line=items.find(i=>i.menuId===id);
    if(line&&line.qty>=20){notify('Maximum 20 of each item per request.');return}
    if(!line&&items.length>=30){notify('Maximum 30 different items per request.');return}
    if(line)line.qty++;else items.push({id,menuId:id,name:item.name,price:item.price,qty:1});
    save(items);renderMiniBag();notify(item.name+' added to your bag');
  }
  function renderMiniBag(){const element=document.getElementById('posBag');if(!element)return;const items=bag(),totals=calculate(items);element.innerHTML=`<h2>Your bag</h2>${items.length?items.map(i=>`<p>${i.qty} × ${esc(i.name)} <strong>${money(i.price*i.qty)}</strong></p>`).join(''):'<p>Choose something from the menu.</p>'}<p>Subtotal <strong>${money(totals.subtotal)}</strong></p><p>Tax (${menu.taxRate}%) <strong>${money(totals.tax)}</strong></p><p>Total <strong>${money(totals.total)}</strong></p><a class="primary-btn" href="checkout.html">Review your bag →</a><p class="fine-print">Delivery fees, if any, are confirmed separately by the café.</p>`}
  function renderMenu(){
    const search=document.getElementById('posSearch'),category=document.getElementById('posCategory'),list=document.getElementById('posItems');
    if(!list)return;
    const categories=[...new Set(menu.items.map(i=>i.category))];
    category.innerHTML='<option value="">All categories</option>'+categories.map(c=>`<option>${esc(c)}</option>`).join('');
    function filter(){const q=search.value.trim().toLowerCase(),items=menu.items.filter(i=>(!category.value||i.category===category.value)&&(!q||(i.name+' '+i.category).toLowerCase().includes(q)));
      list.innerHTML=items.length?items.map(i=>`<article class="pos-item"><span class="eyebrow">${esc(i.category)}</span><h2>${esc(i.name)}</h2><div><strong>${money(i.price)}</strong><button type="button" data-pos-add="${esc(i.id)}" ${!i.available||!menu.open?'disabled':''}>${!i.available?'Unavailable':!menu.open?'Closed':'Add to bag'}</button></div></article>`).join(''):'<p role="status">No matching items. Try another category or search.</p>';
      document.getElementById('posCount').textContent=items.length+' items';
    }
    search.addEventListener('input',filter);category.addEventListener('change',filter);filter();renderMiniBag();
    document.getElementById('posStatus').textContent=(menu.open?'The café is accepting order requests.':'The café is closed for online orders.')+' Prices and availability from SajiloPOS. Tax is shown in your bag.';
  }
  function renderCheckout(){
    const root=document.getElementById('posCheckout');if(!root)return;
    const removed=reconcile(),items=bag(),totals=calculate(items);
    root.innerHTML=`<p class="eyebrow">Your next chiya break</p><h1>Review your order request.</h1>${removed?'<p role="status">Unavailable items were removed. Please review your bag.</p>':''}<p id="posCheckoutStatus" role="status"></p>${items.length?`<div class="checkout-grid"><form id="posOrder" class="checkout-card"><h2>Your details</h2><label for="posMode">Order method</label><select id="posMode" name="mode"><option value="pickup">Pickup at the café</option><option value="delivery">Request local delivery</option></select><label for="posName">Your name</label><input id="posName" name="name" required maxlength="80" autocomplete="name"><label for="posPhone">Phone number</label><input id="posPhone" name="phone" type="tel" pattern="[+0-9 ()-]{7,20}" required autocomplete="tel" maxlength="20"><div id="posAddressWrap" hidden><label for="posAddress">Delivery address and landmark</label><input id="posAddress" name="address" maxlength="250" autocomplete="street-address"></div><label for="posNotes">Order notes</label><textarea id="posNotes" name="notes" rows="3" maxlength="500"></textarea><button class="primary-btn" type="submit" ${menu.open?'':'disabled'}>${menu.open?'Send order request →':'Café closed for online orders'}</button><p class="fine-print">Staff will call to confirm availability and timing. Delivery fees are agreed separately. No payment is collected here.</p></form><aside class="checkout-card"><h2>Your favourites</h2>${items.map(i=>`<div class="order-row"><div><strong>${esc(i.name)}</strong><p>${money(i.price)} each</p><div class="qty"><button type="button" data-pos-qty="${esc(i.menuId)}" data-delta="-1" aria-label="Remove one ${esc(i.name)}">−</button><span>${i.qty}</span><button type="button" data-pos-qty="${esc(i.menuId)}" data-delta="1" aria-label="Add one ${esc(i.name)}" ${i.qty>=20?'disabled':''}>+</button></div></div><strong>${money(i.price*i.qty)}</strong></div>`).join('')}<div class="total-row"><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div><div class="total-row"><span>Tax (${menu.taxRate}%)</span><strong>${money(totals.tax)}</strong></div><div class="total-row"><span>Total</span><strong>${money(totals.total)}</strong></div><a href="menu.html">Add something more →</a></aside></div>`:'<div class="checkout-card empty-bag"><h2>Your bag is empty.</h2><p>Choose your favourites from the café’s current menu.</p><a class="primary-btn" href="menu.html">Explore the menu →</a></div>'}`;
    const form=document.getElementById('posOrder');if(!form)return;
    // Keep details while quantities change. Customer details are not saved to local storage.
    form.elements.mode.addEventListener('change',()=>{const delivery=form.elements.mode.value==='delivery';document.getElementById('posAddressWrap').hidden=!delivery;form.elements.address.required=delivery});
    root.querySelectorAll('[data-pos-qty]').forEach(button=>button.addEventListener('click',()=>{const details=Object.fromEntries(new FormData(form)),current=bag(),line=current.find(i=>i.menuId===button.dataset.posQty);line.qty+=Number(button.dataset.delta);save(current.filter(i=>i.qty>0));renderCheckout();const next=document.getElementById('posOrder');if(next){for(const key of Object.keys(details))next.elements[key].value=details[key];next.elements.mode.dispatchEvent(new Event('change'))}}));
    form.addEventListener('submit',async event=>{
      event.preventDefault();const button=form.querySelector('[type=submit]'),status=document.getElementById('posCheckoutStatus');
      button.disabled=true;button.textContent='Sending…';
      const payload={...Object.fromEntries(new FormData(form)),items:bag().map(i=>({id:i.menuId,qty:i.qty})),expectedTotal:calculate(bag()).total};
      root.querySelectorAll('button,input,select,textarea').forEach(control=>control.disabled=true);
      const fingerprint=JSON.stringify(payload);let pending;
      try{pending=JSON.parse(sessionStorage.getItem('sajilo-pending-request')||'null')}catch{}
      const requestId=pending?.fingerprint===fingerprint?pending.id:crypto.randomUUID().replaceAll('-','');
      sessionStorage.setItem('sajilo-pending-request',JSON.stringify({fingerprint,id:requestId}));
      try{
        const receipt=await api('/orders',{requestId,...payload});save([]);sessionStorage.removeItem('sajilo-pending-request');
        root.innerHTML=`<div class="checkout-card"><p class="eyebrow">Request received</p><h1>Thank you, ${esc(payload.name)}.</h1><p>Your request <strong>#${esc(receipt.id.slice(0,8))}</strong> has reached the café.</p><p>Total including tax: <strong>${money(receipt.total)}</strong>. The team will call ${esc(payload.phone)} to confirm your order${payload.mode==='delivery'?' and any delivery fee':''}.</p><p class="fine-print">This is a request, awaiting staff confirmation. No payment has been collected.</p><a class="primary-btn" href="menu.html">Back to the menu</a></div>`;
        root.scrollIntoView({behavior:'smooth'});
      }catch(error){status.textContent=error.message;root.querySelectorAll('button,input,select,textarea').forEach(control=>control.disabled=false);button.textContent='Retry order request →'}
    });
  }
  document.addEventListener('click',event=>{const button=event.target.closest('[data-pos-add]');if(button)add(button.dataset.posAdd)});
  window.handleAddToCart=()=>location.assign('menu.html');
  async function start(){
    const root=document.getElementById('posMenu')||document.getElementById('posCheckout');if(!root)return;
    try{menu=await api('/menu');reconcile();renderMenu();renderCheckout()}
    catch(error){root.innerHTML=`<div class="checkout-card"><h1>The menu is temporarily unavailable.</h1><p>${esc(error.message)}</p><button class="primary-btn" id="posRetry">Try again</button><a class="extra-link" href="tel:+9779808836939">Call the café</a></div>`;document.getElementById('posRetry').onclick=start}
  }
  start();
})();
