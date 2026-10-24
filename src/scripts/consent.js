/* Cookie banner, unchanged from the original pages (html/*.html): the choice is stored in
   localStorage "sw-consent" for 12 months, exposed as window.swConsent and announced with the
   "sw-consent" event, so analytics can be loaded only after consent (see html/README.md §6). */
(function(){
var cb=document.getElementById('cb');if(!cb)return;
var KEY='sw-consent';
function get(){try{var v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&Date.now()-v.t<31536000000)return v}catch(x){}return null}
function put(an,mk){try{localStorage.setItem(KEY,JSON.stringify({an:an,mk:mk,t:Date.now()}))}catch(x){};cb.hidden=true;window.swConsent={analytics:an,marketing:mk};try{document.dispatchEvent(new CustomEvent('sw-consent',{detail:window.swConsent}))}catch(x){}}
function open(){var v=get();document.getElementById('cb-an').checked=!!(v&&v.an);document.getElementById('cb-mk').checked=!!(v&&v.mk);cb.hidden=false}
var set=cb.querySelector('.cb-set'),save=cb.querySelector('[data-cb=save]'),cfg=cb.querySelector('[data-cb=cfg]');
cb.addEventListener('click',function(e){var b=e.target.closest('[data-cb]');if(!b)return;var a=b.getAttribute('data-cb');
 if(a==='all')put(true,true);else if(a==='none')put(false,false);
 else if(a==='cfg'){set.hidden=false;save.hidden=false;cfg.hidden=true}
 else if(a==='save')put(document.getElementById('cb-an').checked,document.getElementById('cb-mk').checked)});
document.addEventListener('click',function(e){var o=e.target.closest('[data-cookie-open]');if(o){e.preventDefault();set.hidden=true;save.hidden=true;cfg.hidden=false;open()}});
var v=get();if(v){window.swConsent={analytics:v.an,marketing:v.mk}}else{cb.hidden=false}
})();
