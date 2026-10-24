/* Article share actions (components/blog/ShareArticle.astro).
   - Copy link: clipboard API, with a textarea fallback; the label confirms for two seconds and a
     polite live region announces it to screen readers.
   - Share…: shown on touch devices that have a native share sheet. */
(function(){
var status=document.querySelector('.share-status');
function announce(msg){if(!status)return;status.textContent=msg;setTimeout(function(){status.textContent=''},2200)}

document.querySelectorAll('[data-copy]').forEach(function(btn){
  var label=btn.querySelector('span'),idle=label.textContent,done=btn.getAttribute('data-done'),url=btn.getAttribute('data-copy');
  function ok(){label.textContent=done;btn.classList.add('is-done');announce(done);setTimeout(function(){label.textContent=idle;btn.classList.remove('is-done')},2200)}
  function fallback(){var t=document.createElement('textarea');t.value=url;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{if(document.execCommand('copy'))ok()}catch(e){}t.remove()}
  btn.addEventListener('click',function(){
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(ok,fallback);else fallback();
  });
});

// Touch devices only: on desktop the explicit actions are clearer than a system sheet.
if(navigator.share&&matchMedia('(pointer: coarse)').matches)document.querySelectorAll('[data-share-native]').forEach(function(btn){
  btn.closest('li').hidden=false;
  btn.addEventListener('click',function(){navigator.share({title:btn.getAttribute('data-title'),url:btn.getAttribute('data-url')}).catch(function(){})});
});
})();
