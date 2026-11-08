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
/* Every form checks its required fields the same way and says under each one what is missing
   (team request, November 2026). The email check is the same pattern as api/form.ts. A field can
   carry its own words in data-err-en / data-err-es; the others get the words for their type. */
var MAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var SAY={
  empty:['Fill in this field.','Rellena este campo.'],
  mail:['Enter your email.','Escribe tu email.'],
  badmail:['Enter a valid email, like name@example.com.','Escribe un email válido, como nombre@ejemplo.com.'],
  box:['Tick the box to continue.','Marca la casilla para continuar.']
};
/* What is wrong with a field: '' when it is fine, otherwise a key of SAY. */
function problem(i,f){
  if(i.type==='checkbox')return i.checked?'':'box';
  if(i.type==='radio')return f.querySelector('input[name="'+i.name+'"]:checked')?'':'empty';
  var v=i.value.trim();
  if(i.type==='email')return !v?'mail':MAIL.test(v)?'':'badmail';
  return v?'':'empty';
}
/* Marks a field and shows or hides its line. The line goes inside the field's .fld, or right after
   its .chk. In a band's .inline-form it goes under the email: inside the row when the button has
   wrapped below the field (phones), after the row when both share a line. The field points to the
   line with aria-describedby. */
function mark(i,p){
  var id=(i.id||i.name)+'-err',m=document.getElementById(id);
  i.setAttribute('aria-invalid',p?'true':'false');
  if(!p){if(m)m.hidden=true;i.removeAttribute('aria-describedby');return}
  if(!m){m=document.createElement('p');m.className='fmsg';m.id=id}
  var host=i.closest('.fld,.inline-form,.chk')||i,b=host.classList.contains('inline-form')&&$('button',host);
  if(host.classList.contains('fld'))host.appendChild(m);
  else if(b&&b.offsetTop>i.offsetTop)host.insertBefore(m,b);
  else host.parentNode.insertBefore(m,host.nextSibling);
  var own=p!=='badmail',w=[(own&&i.getAttribute('data-err-en'))||SAY[p][0],(own&&i.getAttribute('data-err-es'))||SAY[p][1]];
  m.textContent='';
  ['en','es'].forEach(function(l,k){var s=document.createElement('span');s.className=l;s.textContent=w[k];m.appendChild(s)});
  m.hidden=false;i.setAttribute('aria-describedby',id);
}
/* The endpoint turns away an email whose domain takes no mail (a typo such as gmail.con), so the
   person gets a message of its own instead of the general error. */
var BADMAIL='<span class="en">That email address does not seem to exist. Please check it.</span><span class="es">Esa dirección de email no parece existir. Revísala, por favor.</span>';
$$('form[data-form]').forEach(function(f){
  var ask=$('dialog.ask',f),sentOk=false;
  var em=$('input[type=email]',f),box=ask&&$('.ask-mail',ask),mi=box&&$('input',box);
  function own(sel){return f.parentNode.querySelector(':scope > '+sel)}
  /* The error line under the form, and its general text, kept before badMail() replaces it. */
  var fe=own('.ferr'),general=fe?fe.innerHTML:'';
  /* A marked field is checked again as the person fixes it, so its line goes as soon as it is right. */
  $$('input,textarea',f).forEach(function(i){
    i.addEventListener(i.type==='checkbox'?'change':'input',function(){if(i.getAttribute('aria-invalid')==='true')mark(i,problem(i,f))});
  });
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
       subscribed, from the Letter form or from the waitlist, whose consent covers the Letter. */
    try{document.dispatchEvent(new CustomEvent('sw-form-sent',{detail:{form:f.getAttribute('data-form'),data:data||{}}}))}catch(x){}
    if(!ask){f.classList.add('done');return}
    sentOk=true;
    var s=own('.sent'),box=$('.ask-done',ask);
    if(s&&box){var c=s.cloneNode(true);c.removeAttribute('role');box.appendChild(c)}
    $('.ask-q',ask).hidden=true;
    var end=$('.ask-end',ask);end.hidden=false;$('button',end).focus();
  }
  /* The email to fix, marked and focused next to its message. The waitlist dialog has an email
     field of its own; the Letter dialog does not, so it closes and the field in the band is fixed. */
  function badMail(){
    var line=ask?$('.ferr',ask):fe,i=em;
    if(ask&&box){box.hidden=false;mi.required=true;mi.value=em?em.value:'';var to=$('.ask-to',ask);if(to)to.hidden=true;i=mi}
    else if(ask){ask.close();line=fe}
    if(line){line.innerHTML=BADMAIL;line.hidden=false}
    if(i){i.setAttribute('aria-invalid','true');i.focus()}
  }
  f.addEventListener('submit',function(e){
    e.preventDefault();
    /* A new try clears the line under the form (the email message, or a past error). */
    if(fe)fe.hidden=true;
    var ok=true;
    $$('input[required],textarea[required]',f).forEach(function(i){
      var d=i.closest('dialog');if(d&&!d.open)return;
      /* Opened from a button, the dialog asks for the email itself and copies it here. */
      if(i===em&&mi&&mi.required)return;
      var p=problem(i,f);mark(i,p);
      if(p&&ok){ok=false;i.focus()}
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
      .then(function(r){if(r.ok){done(data);return}return r.json().then(function(j){throw j},function(){throw 0})})
      .catch(function(x){if(x&&x.invalid==='email'){badMail();return}if(!err)return;err.innerHTML=general;err.hidden=false})
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
