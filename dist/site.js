const storageKey='charcha-basket';
function readBag(){try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{return []}}
function updateBag(){const e=document.getElementById('bagCount');if(e)e.textContent=readBag().reduce((n,i)=>n+i.qty,0)}
function notify(message){document.getElementById('siteToast')?.remove();const e=document.createElement('div');e.id='siteToast';e.role='status';e.textContent=message;document.body.append(e);setTimeout(()=>e.remove(),3000)}
function addBag(name,price,note=''){let bag=readBag(),item=bag.find(x=>x.name===name&&x.note===note);if(item)item.qty++;else bag.push({id:'c_'+Date.now(),name,price,qty:1,note});localStorage.setItem(storageKey,JSON.stringify(bag));updateBag();notify(name+' added to your bag')}
window.handleAddToCart=(button,name,price)=>addBag(name,price);
const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function customPrice(){return currentCustomItem.basePrice+[currentCustomItem.selectedA,currentCustomItem.selectedB].reduce((n,s)=>n+Number((s.match(/\(\+(\d+)\)/)||[])[1]||0),0)}
document.addEventListener('change',e=>{if(e.target.name==='optA'||e.target.name==='optB'){const el=document.getElementById('modalCalculatedTotal');if(el)el.textContent='NPR '+customPrice()}});
const navToggle=document.querySelector('.nav-toggle'),siteNav=document.querySelector('.site-nav');
function closeNavigation(restoreFocus=false){siteNav?.classList.remove('open');navToggle?.setAttribute('aria-expanded','false');navToggle?.setAttribute('aria-label','Open navigation');if(restoreFocus)navToggle?.focus()}
navToggle?.setAttribute('aria-label','Open navigation');
navToggle?.addEventListener('click',()=>{const open=siteNav.classList.toggle('open');navToggle.setAttribute('aria-expanded',String(open));navToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation')});
siteNav?.addEventListener('click',e=>{if(e.target.closest('a'))closeNavigation()});
document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))closeNavigation()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&siteNav?.classList.contains('open'))closeNavigation(true)});
matchMedia('(min-width:1200px)').addEventListener('change',()=>closeNavigation());
const page=location.pathname.split('/').pop()||'index.html';document.querySelectorAll('.site-nav a').forEach(a=>{if(a.getAttribute('href')===page){a.classList.add('active');a.setAttribute('aria-current','page')}});
document.querySelectorAll('a[href="#"]').forEach(a=>{let text=a.textContent.toLowerCase();a.href=text.includes('privacy')?'privacy.html':text.includes('terms')?'terms.html':text.includes('staff')?'staff.html':text.includes('gallery')?'gallery.html':text.includes('story')?'about.html':'menu.html'});
// Keep photo submission honest: a local preview cannot send photos to the café.
window.handlePhotoSubmit=function(e){e.preventDefault();const status=document.getElementById('uploadStatusMsg');status.textContent='Photo preview only. Please contact the café to share your photo.';status.classList.remove('hidden')};
window.openPrintModal=()=>window.print();window.openWalkinModal=()=>location.assign('menu.html');
document.querySelectorAll('img').forEach(i=>{i.loading='lazy';i.decoding='async';i.addEventListener('error',()=>{i.classList.add('image-fallback');i.alt=i.alt||'Chiya ko Charcha café';i.style.minHeight='100px'},{once:true})});document.querySelector('main img')?.setAttribute('loading','eager');
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('[id$="Modal"]').forEach(m=>m.classList.add('hidden'));document.body.style.overflow=''}});
updateBag();
// Keep keyboard focus inside an open overlay and return it to its trigger.
document.querySelectorAll('[id$="Modal"]').forEach(modal=>{
 let trigger;
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 if(modal.id==='customizeModal'){
  modal.setAttribute('aria-labelledby','modalItemTitle');
  modal.querySelector('button')?.setAttribute('aria-label','Close customization');
 }
 const focusable=()=>[...modal.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(e=>!e.disabled&&e.getClientRects().length);
 new MutationObserver(()=>{
  if(!modal.classList.contains('hidden')){
   if(!trigger){trigger=document.activeElement;requestAnimationFrame(()=>focusable()[0]?.focus())}
  }else if(trigger){const previous=trigger;trigger=null;previous?.focus()}
 }).observe(modal,{attributes:true,attributeFilter:['class']});
 modal.addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;
  const items=focusable(),first=items[0],last=items.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
 });
});
const app=document.getElementById('checkoutApp');
if(app){
 const bag=readBag();
 app.innerHTML=`<p class="eyebrow">A little warmth, on its way</p><h1>Your chiya break starts here.</h1><p class="checkout-intro">Review your favourites and send an order request to our Tokha adda.</p><div id="checkoutContent"></div>`;
 let details={name:'',phone:'',address:'',notes:'',mode:'pickup'};
 function renderCheckout(){
  const bag=readBag(),content=document.getElementById('checkoutContent');
  if(!bag.length){content.innerHTML='<div class="checkout-card empty-bag"><span style="font-size:50px">☕</span><h2>Your bag is waiting for a little warmth.</h2><p>Find your favourite chiya, momo or something sweet.</p><a class="primary-btn" href="menu.html">Explore the menu →</a></div>';return}
  const subtotal=bag.reduce((n,i)=>n+i.price*i.qty,0);
  content.innerHTML=`<div class="checkout-grid"><form id="orderForm" class="checkout-card"><h2>Make it yours</h2><label for="mode">How would you like your order?</label><select id="mode" name="mode"><option value="pickup">Pick up at the café</option><option value="delivery">Request local delivery · fee to be confirmed</option></select><label for="customerName">Your name</label><input id="customerName" name="name" required autocomplete="name" maxlength="80"><label for="customerPhone">Mobile number</label><input id="customerPhone" name="phone" type="tel" required pattern="[+0-9 ()-]{7,20}" autocomplete="tel" placeholder="+977 98XXXXXXXX"><div id="addressField"><label for="customerAddress">Delivery address & landmark</label><input id="customerAddress" name="address" maxlength="250" autocomplete="street-address"></div><label for="orderNotes">Anything we should know?</label><textarea id="orderNotes" name="notes" rows="3" maxlength="500" placeholder="Less sugar, a little extra achar…"></textarea><button class="primary-btn" type="submit">Review order request →</button><p class="fine-print">An order request opens in WhatsApp for you to send. The café confirms availability, delivery fees and payment directly. Online payment and live tracking are not connected.</p></form><aside class="checkout-card checkout-summary"><h2>Your little favourites</h2>${bag.map(i=>`<div class="order-row"><div><strong>${escapeText(i.name)}</strong><p>${escapeText(i.note||'Freshly prepared')}</p><div class="qty"><button type="button" aria-label="Remove one ${escapeText(i.name)}" data-id="${i.id}" data-delta="-1">−</button><span>${i.qty}</span><button type="button" aria-label="Add one ${escapeText(i.name)}" data-id="${i.id}" data-delta="1">+</button></div></div><strong>Rs. ${i.price*i.qty}</strong></div>`).join('')}<div class="total-row"><span>Subtotal</span><strong>Rs. ${subtotal}</strong></div><p class="fine-print">Delivery, if requested, is quoted by the café.</p><a href="menu.html" style="color:#8f4d2c;font-size:14px">← Add something more</a></aside></div>`;
  const form=document.getElementById('orderForm');for(const [key,val] of Object.entries(details))if(form.elements[key])form.elements[key].value=val;
  function address(){let d=form.elements.mode.value==='delivery';document.getElementById('addressField').hidden=!d;form.elements.address.required=d}address();form.elements.mode.addEventListener('change',address);
  form.addEventListener('input',()=>{for(let key of Object.keys(details))details[key]=form.elements[key].value});
  content.querySelectorAll('[data-delta]').forEach(b=>b.addEventListener('click',()=>{const items=readBag(),item=items.find(i=>i.id===b.dataset.id);item.qty+=Number(b.dataset.delta);localStorage.setItem(storageKey,JSON.stringify(items.filter(i=>i.qty>0)));updateBag();renderCheckout()}));
  form.addEventListener('submit',e=>{e.preventDefault();let text=`Namaste Chiya ko Charcha! I would like to request:\n${bag.map(i=>`${i.qty} × ${i.name} — Rs. ${i.qty*i.price}${i.note?' ('+i.note+')':''}`).join('\n')}\nSubtotal: Rs. ${subtotal}\nMethod: ${details.mode}\nName: ${details.name}\nPhone: ${details.phone}${details.mode==='delivery'?'\nAddress: '+details.address:''}\nNotes: ${details.notes}\nPlease confirm availability and final total.`;const link='https://wa.me/9779808836939?text='+encodeURIComponent(text);const box=document.createElement('dialog');box.style.cssText='border:1px solid #d8be9a;border-radius:20px;padding:32px;max-width:500px;width:90%;background:#fff8ef;color:#38251f';box.innerHTML=`<h2 style="font:700 25px Georgia">Ready to send?</h2><p style="margin:18px 0;line-height:1.7">Your ${details.mode==='pickup'?'pickup':'delivery'} request includes ${bag.reduce((n,i)=>n+i.qty,0)} items with a subtotal of Rs. ${subtotal}. The café will confirm your order after you send it.</p><a class="primary-btn" href="${link}" target="_blank" rel="noopener">Open WhatsApp to send ↗</a><button style="display:block;margin:18px auto 0" id="closeReview">Keep editing</button>`;document.body.append(box);box.showModal();box.querySelector('#closeReview').onclick=()=>box.remove()});
 }
 renderCheckout();
}
function sendInquiry(event){event.preventDefault();const value=id=>document.getElementById(id).value;const text=`Namaste! ${value('type')}\nName: ${value('name')}\nPhone: ${value('phone')}\nDate/time: ${value('date')}\n${value('message')}\nPlease confirm availability.`;window.open('https://wa.me/9779808836939?text='+encodeURIComponent(text),'_blank','noopener')}
