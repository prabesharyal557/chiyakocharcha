(() => {
 document.querySelectorAll('.cafe-page-photo').forEach(image=>image.parentElement.classList.add('cafe-native-frame'));
 document.querySelectorAll('.cafe-visit-photo').forEach(image=>image.parentElement.classList.add('cafe-visit-frame'));
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 document.addEventListener('click',event=>{
  const filter=event.target.closest('[data-cafe-filter]');
  if(filter){document.querySelectorAll('[data-cafe-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button===filter)));document.querySelectorAll('[data-photo-category]').forEach(card=>card.hidden=filter.dataset.cafeFilter!=='all'&&card.dataset.photoCategory!==filter.dataset.cafeFilter);return}
  const trigger=event.target.closest('.cafe-photo-open');if(!trigger)return;
  const image=trigger.querySelector('img'),caption=trigger.closest('figure').querySelector('figcaption').textContent,dialog=document.createElement('dialog');
  dialog.className='cafe-photo-dialog';dialog.setAttribute('aria-label',caption);
  dialog.innerHTML=`<header><p>${escape(caption)}</p><button type="button" aria-label="Close photo">×</button></header><img src="${escape(image.getAttribute('src'))}" alt="${escape(image.alt)}">`;
  document.body.append(dialog);dialog.showModal();dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close()};dialog.addEventListener('close',()=>{dialog.remove();trigger.focus()},{once:true});
 });
})();
