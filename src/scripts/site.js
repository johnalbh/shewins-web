/* Site behaviour, ported from the inline script of the original pages (html/*.html).
   Removed: the hash router left over from the one-page prototype (every page is a real URL now).
   Kept as it was: menu, language buttons, name tag, form validation and sending, event status,
   sticky membership CTA. */
(function(){
var cur=document.body.getAttribute('data-route')||'home';
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}

document.addEventListener('click',function(e){
  var s=e.target.closest&&e.target.closest('[data-scroll],a[href$="#waitlist"]');
  if(!s)return;
  var id=s.getAttribute('data-scroll')||'waitlist',el=document.getElementById(id);
  if(!el)return;
  /* A section that holds a signup dialog (the waitlist) opens it straight away: the button says
     "Join the waitlist", so the form comes to her instead of sending her to the end of the page. */
  var fm=$('form[data-form]',el);
  if(fm&&fm.openAsk){e.preventDefault();fm.openAsk(true);return}
  if(s.hasAttribute('data-scroll'))el.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})
});
var menu=$('#menu'),burger=$('.burger');
function openMenu(){menu.hidden=false;burger.setAttribute('aria-expanded','true');document.body.style.overflow='hidden';var x=$('.x',menu);if(x)x.focus()}
function closeMenu(){if(menu.hidden)return;menu.hidden=true;burger.setAttribute('aria-expanded','false');document.body.style.overflow='';burger.focus()}
burger.addEventListener('click',openMenu);
$('.x',menu).addEventListener('click',closeMenu);
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu()});
/* name: typed once on the name tag, carried to the waitlist form and the member card */
var lang='en';
function setName(v,src){
  $$('.nm-in').forEach(function(i){if(i!==src)i.value=v});
  var has=v.trim().length>0;
  $$('.nm-out').forEach(function(o){
    if(o.closest('.hello')){o.textContent=v.trim()+'.'}
    else o.textContent=has?v.trim():o.getAttribute('data-fallback-'+lang)||'';
  });
  var h=$('.hello');if(h)h.hidden=!has;
}
$$('.nm-in').forEach(function(i){i.addEventListener('input',function(){setName(i.value,i)})});
function setLang(l){
  lang=l;
  $$('[data-ph-en]').forEach(function(i){i.placeholder=i.getAttribute('data-ph-'+l)});
  $$('option[data-en]').forEach(function(o){o.textContent=o.getAttribute('data-'+l)});
  var n=$('#hello-in');setName(n?n.value:'',null);
}
$$('.lang button').forEach(function(b){b.addEventListener('click',function(){var h=b.getAttribute('data-href');try{localStorage.setItem('sw-lang',b.getAttribute('data-lang'))}catch(x){}if(h&&b.getAttribute('data-lang')!==document.documentElement.lang)location.href=h})});
setLang(document.documentElement.lang==='es'?'es':'en');
/* Forms. The signup forms (newsletter, waitlist) start with the email only: their first button
   opens the dialog (.ask) with the other questions, the form is sent from the dialog and the
   confirmation shows there. When the dialog closes after a successful send, the form switches to
   its thank-you state. The contact form sends straight away. */
$$('form[data-form]').forEach(function(f){
  var ask=$('dialog.ask',f),sentOk=false;
  var em=$('input[type=email]',f),box=ask&&$('.ask-mail',ask),mi=box&&$('input',box);
  function own(sel){return f.parentNode.querySelector(':scope > '+sel)}
  if(ask){
    $$('[data-close]',ask).forEach(function(b){b.addEventListener('click',function(){ask.close()})});
    ask.addEventListener('close',function(){if(sentOk)f.classList.add('done')});
    if(mi&&em)mi.addEventListener('input',function(){em.value=mi.value});
    f.openAsk=function(direct){
      if(sentOk||ask.open)return;
      var has=em&&em.value.indexOf('@')>0,need=!!(direct&&box&&!has);
      if(box){box.hidden=!need;mi.required=need;if(need)mi.value=em?em.value:''}
      var to=$('.ask-to',ask);if(to)to.hidden=need;
      var m=$('[data-mail]',ask);if(m&&em)m.textContent=em.value.trim();
      ask.showModal();
      var first=need?mi:$('.ask-q input[type=text],.ask-q select',ask);if(first)first.focus();
    };
  }
  function done(data){
    /* Announce the send with what was sent: letter-invite.js stops inviting someone who has just
       subscribed, from the Letter form or from the Letter box of the waitlist. */
    try{document.dispatchEvent(new CustomEvent('sw-form-sent',{detail:{form:f.getAttribute('data-form'),data:data||{}}}))}catch(x){}
    if(!ask){f.classList.add('done');return}
    sentOk=true;
    var s=own('.sent'),box=$('.ask-done',ask);
    if(s&&box){var c=s.cloneNode(true);c.removeAttribute('role');box.appendChild(c)}
    $('.ask-q',ask).hidden=true;
    var end=$('.ask-end',ask);end.hidden=false;$('button',end).focus();
  }
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var ok=true;
    $$('input[required],textarea[required]',f).forEach(function(i){
      var d=i.closest('dialog');if(d&&!d.open)return;
      /* Opened from a button, the dialog asks for the email itself and copies it here. */
      if(i===em&&mi&&mi.required)return;
      var bad=i.type==='checkbox'?!i.checked:i.type==='radio'?!f.querySelector('input[name="'+i.name+'"]:checked'):!i.value.trim()||(i.type==='email'&&i.value.indexOf('@')<1);
      i.setAttribute('aria-invalid',bad?'true':'false');
      if(bad&&ok){ok=false;i.focus()}
    });
    if(!ok)return;
    if(ask&&!ask.open){f.openAsk(false);return}
    if(sentOk)return;
    var kind=f.getAttribute('data-form'),cfg=(window.SW_FORMS||{}),url=cfg[kind];
    if(!url){done();return}
    var data={form:kind,lang:document.documentElement.lang,page:location.href,sent:new Date().toISOString()};
    $$('input,select,textarea',f).forEach(function(i){if(i.type==='radio'){if(i.checked)data[i.name]=i.value;return}if(!i.id)return;data[i.id]=i.type==='checkbox'?i.checked:i.value});
    var btn=ask?$('.ask-q button[type=submit]',ask):$('button[type=submit]',f);if(btn)btn.disabled=true;
    var err=ask?$('.ferr',ask):$('.ferr',f.parentNode);if(err)err.hidden=true;
    fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)})
      .then(function(r){if(!r.ok)throw 0;done(data)})
      .catch(function(){if(!err)return;var src=own('.ferr');if(ask&&src&&!err.innerHTML)err.innerHTML=src.innerHTML;err.hidden=false})
      .then(function(){if(btn)btn.disabled=false});
  });
});
var now=new Date();now.setHours(0,0,0,0);
$$('.show').forEach(function(s){
  var d=new Date(s.getAttribute('data-date')+'T00:00:00');
  var st=$('.status',s);st.hidden=false;
  if(d<now){s.classList.add('past');st.innerHTML='<span class="en">Past</span><span class="es">Pasado</span>'}
  else if(d.getTime()===now.getTime()){st.innerHTML='<span class="en">Today</span><span class="es">Hoy</span>';st.className='pill f status'}
  else{st.innerHTML='<span class="en">Upcoming</span><span class="es">Próximo</span>';st.className='pill f status'}
});
function stick(){
  var st=$('#sticky');if(!st)return;if(cur!=='membership'){st.classList.remove('show-it');return}
  var w=document.getElementById('waitlist');var r=w?w.getBoundingClientRect():null;
  var inForm=r&&r.top<window.innerHeight&&r.bottom>0;
  st.classList.toggle('show-it',window.scrollY>520&&!inForm);
}
window.addEventListener('scroll',stick,{passive:true});
stick();

if(location.hash==='#waitlist'){
  var wf=$('#waitlist form[data-form]');
  if(wf&&wf.openAsk){try{history.replaceState(null,'',location.pathname+location.search)}catch(x){}window.scrollTo(0,0);wf.openAsk(true)}
}

/* Closing form blocks: the drawn arrow by the email field (FieldArrow.astro) stays unwritten
   ("arm") until the field is half on screen, then writes itself in and nudges toward it
   (motion.css). Without this script, or with reduced motion, it simply shows. */
if(!reduce&&'IntersectionObserver' in window){
  $$('.formband .nudge').forEach(function(n){
    var band=n.closest('.formband'),field=n.parentNode;
    band.classList.add('arm');
    var io=new IntersectionObserver(function(es){
      if(es[0].isIntersecting){band.classList.add('seen');io.disconnect()}
    },{threshold:0.5});
    io.observe(field);
  });
}
})();
