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
  var s=e.target.closest&&e.target.closest('[data-scroll]');
  if(s){var el=document.getElementById(s.getAttribute('data-scroll'));if(el)el.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})}
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
$$('form[data-form]').forEach(function(f){
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var ok=true;
    $$('input[required],textarea[required]',f).forEach(function(i){
      var bad=i.type==='checkbox'?!i.checked:!i.value.trim()||(i.type==='email'&&i.value.indexOf('@')<1);
      i.setAttribute('aria-invalid',bad?'true':'false');
      if(bad&&ok){ok=false;i.focus()}
    });
    if(!ok)return;
    var kind=f.getAttribute('data-form'),cfg=(window.SW_FORMS||{}),url=cfg[kind];
    if(!url){f.classList.add('done');return}
    var data={form:kind,lang:document.documentElement.lang,page:location.href,sent:new Date().toISOString()};
    $$('input,select,textarea',f).forEach(function(i){if(!i.id)return;data[i.id]=i.type==='checkbox'?i.checked:i.value});
    var btn=$('button[type=submit]',f);if(btn)btn.disabled=true;
    var err=$('.ferr',f.parentNode);if(err)err.hidden=true;
    fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)})
      .then(function(r){if(!r.ok)throw 0;f.classList.add('done')})
      .catch(function(){if(err)err.hidden=false})
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
})();
