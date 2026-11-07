/* Letter invitation card (src/components/chrome/LetterInvite.astro), team request, November 2026.
   It never shows at the same time as the cookie banner: it waits for the cookie choice, then for
   a sign of interest, 40% of the page read or 20 seconds on it. It does not take focus, and it
   waits while the menu or a dialog is open. Closing it or following its link keeps it away for
   30 days. A Letter signup on any page (the "sw-form-sent" event from site.js), from the Letter
   form or the Letter box of the waitlist, keeps it away for good. The choice is kept in localStorage "sw-letter", listed in the cookie policy. */
(function(){
var card=document.getElementById('letter-invite');
var KEY='sw-letter',QUIET=30*86400000,WAIT=20000,READ=0.4;
var shown=false,timer=null;
function get(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(x){return null}}
function put(s){try{localStorage.setItem(KEY,JSON.stringify({s:s,t:Date.now()}))}catch(x){}}
function quiet(){var v=get();return !!v&&(v.s==='sub'||Date.now()-v.t<QUIET)}
function hide(){if(card&&!card.hidden){card.hidden=true;document.removeEventListener('keydown',onKey)}}
function busy(){var m=document.getElementById('menu');return (m&&!m.hidden)||!!document.querySelector('dialog[open]')}
function onKey(e){if(e.key==='Escape'&&!busy()){put('closed');hide()}}
function show(){
  if(shown||quiet())return;
  clearTimeout(timer);
  if(busy()){timer=setTimeout(show,5000);return}
  shown=true;card.hidden=false;
  window.removeEventListener('scroll',onScroll);
  document.addEventListener('keydown',onKey);
}
function onScroll(){
  var max=document.documentElement.scrollHeight-window.innerHeight;
  if(max>0&&window.scrollY/max>=READ)show();
}
function arm(){
  if(quiet())return;
  timer=setTimeout(show,WAIT);
  window.addEventListener('scroll',onScroll,{passive:true});
}
document.addEventListener('sw-form-sent',function(e){var d=e.detail||{};if(d.form==='letter'||(d.data&&d.data['w-letter']===true)){put('sub');hide()}});
if(!card)return;
card.addEventListener('click',function(e){
  if(e.target.closest('[data-invite-close]')){put('closed');hide()}
  else if(e.target.closest('[data-invite-go]'))put('go');
});
if(window.swConsent)arm();else document.addEventListener('sw-consent',arm,{once:true});
})();
