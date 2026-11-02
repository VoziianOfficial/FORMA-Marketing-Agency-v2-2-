'use strict';
const qs=(s,r=document)=>r.querySelector(s),qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const safeURL=s=>{try{const u=new URL(s,location.href);return ['http:','https:'].includes(u.protocol)?u.href:'#'}catch{return '#'}};
function configValue(root,path){return path.split('.').reduce((value,key)=>value?.[key],root)}
function applyPageConfig(config){
 qsa('[data-config]').forEach(element=>{
  const entry=configValue(config,element.dataset.config);if(!entry)return;
  if(typeof entry.html==='string')element.innerHTML=entry.html;
  for(const key of ['src','alt','href','placeholder','aria-label','width','height']){
   if(entry[key]!==undefined)element.setAttribute(key,String(entry[key]));
  }
 });
}
function applyServiceConfig(services){
 qsa('[data-service-field]').forEach(element=>{
  const service=services.find(item=>item.slug===element.dataset.service);
  const value=configValue(service,element.dataset.serviceField);
  if(value!==undefined)element.textContent=value;
 });
}

async function init(){
 const c=window.SITE_CONFIG;
 if(!c||!Array.isArray(c.services))throw Error('Settings unavailable');
 const services=c.services;
 applyPageConfig(c);
 const description=c.pageMeta?.[document.body.dataset.page]?.description;
 if(description!==undefined)qs('meta[name=description]')?.setAttribute('content',description);
 qsa('[data-config-counter]').forEach(element=>{
  const value=c.pages[document.body.dataset.page]?.counters?.[element.dataset.configCounter]?.value;
  if(value!==undefined){element.dataset.count=String(value);element.textContent=String(value).padStart(+element.dataset.pad||0,'0')}
 });
 applyServiceConfig(services);
 qsa('[data-service-price]').forEach(e=>{const values=c.servicePricing?.[document.body.dataset.page];if(values)e.textContent=c.pricing.currency+Number(values[+e.dataset.servicePrice]).toLocaleString('en-US')});
 const page=document.body.dataset.page,labels={home:'',privacy:'Privacy Policy',terms:'Terms of Use',cookies:'Cookie Policy'};
 const pageLabel=labels[page]??services.find(s=>s.slug===page)?.short??'';
 document.title=pageLabel?`${pageLabel} | ${c.siteTitle}`:c.siteTitle;
 qsa('[data-company]').forEach(e=>e.textContent=c.companyName);qsa('[data-logo]').forEach(e=>{e.src=safeURL(c.logo);e.alt=c.companyName+' logo'});qs('link[rel=icon]').href=safeURL(c.favicon);
 qsa('[data-email]').forEach(e=>{e.textContent=c.email;e.href='mailto:'+encodeURIComponent(c.email)});
 for(const [sel,value] of Object.entries({'[data-footer-tagline]':c.footerTagline,'[data-disclaimer]':c.disclaimer,'[data-address]':c.address,'[data-copyright]':c.copyright,'[data-year]':new Date().getFullYear(),'[data-advertise-title]':c.advertise.title,'[data-advertise-text]':c.advertise.text}))qsa(sel).forEach(e=>e.textContent=value);
 qsa('[data-nav]').forEach(e=>e.innerHTML=c.navigation.map(n=>`<a href="${esc(n.href)}">${esc(n.label)}</a>`).join(''));
 qsa('[data-social]').forEach(e=>e.innerHTML=Object.entries(c.links).filter(([k,v])=>v).map(([k,v])=>`<a href="${esc(safeURL(v))}" target="_blank" rel="noopener">${esc(k)}</a>`).join(''));
 if(qs('#service-cards'))qs('#service-cards').innerHTML=services.map((s,i)=>`<article class="swiper-slide service-card"><div class="service-content"><img class="service-icon" src="assets/icon-${i+1}.png" alt=""><h3>${esc(s.short)}</h3><p>${esc(s.intro)}</p><ul>${s.points.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><a class="button" href="${s.slug}.html">Explore the service <span class="vector-arrow" aria-hidden="true"></span></a></div><img src="assets/${s.image}.webp" alt="${esc(s.short)} creative work" loading="lazy"></article>`).join('');
 const team=c.team;
 if(qs('#team-cards'))qs('#team-cards').innerHTML=team.map(({name,description:desc,image,alt})=>`<article class="swiper-slide team-card"><div class="portrait"><img src="assets/${image}" alt="${esc(alt)}" loading="lazy"></div><h3>${esc(name)}</h3><p>${esc(desc)}</p></article>`).join('');
 function renderPricing(period='monthly'){
  const yearly=period==='yearly',discount=c.pricing.annualDiscount;
  qs('[data-discount]')?.replaceChildren(document.createTextNode(`−${discount}%`));
  if(!qs('#pricing-cards'))return;
  qs('#pricing-cards').innerHTML=c.pricing.plans.map((p,i)=>{const m=yearly?Math.round(p.monthly*(1-discount/100)):p.monthly;return `<article class="plan ${i===1?'featured':''}"><div class="plan-top"><h3>${esc(p.name)}</h3><div class="price">${esc(c.pricing.currency)}${m.toLocaleString('en-US')}<small> / month</small></div><div class="annual">${yearly?`${esc(c.pricing.currency)}${(m*12).toLocaleString('en-US')} billed annually`:'Billed monthly'}</div><p>${esc(p.description)}</p></div><a class="button" href="#contact" data-plan="${esc(p.name)}">Get started <span class="vector-arrow" aria-hidden="true"></span></a><div class="plan-body"><p>What you get</p><ul>${p.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div></article>`}).join('');
 }
 renderPricing();qsa('[data-period]').forEach(b=>b.addEventListener('click',()=>{qsa('[data-period]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});renderPricing(b.dataset.period)}));
 document.addEventListener('click',e=>{const a=e.target.closest('[data-plan]');if(a){const m=qs('textarea[name=message]');if(m&&!m.value)m.value=`I’m interested in the ${a.dataset.plan} plan. My goals are: `}});
 const autoplay=reduced?false:{delay:4500,disableOnInteraction:false,pauseOnMouseEnter:true};
 if(window.Swiper){
  const deck=qs('.work-swiper .swiper-wrapper');if(deck)deck.innerHTML=deck.innerHTML.repeat(3);
  new Swiper('.service-swiper',{loop:true,grabCursor:true,speed:950,autoplay,effect:'creative',creativeEffect:{prev:{translate:['-12%',0,-150],rotate:[0,0,-3],opacity:0},next:{translate:['105%',0,0],rotate:[0,0,3]}},navigation:{nextEl:'.service-next',prevEl:'.service-prev'},pagination:{el:'.service-pagination',clickable:true}});
  new Swiper('.work-swiper',{loop:true,grabCursor:true,speed:800,effect:'cards',cardsEffect:{perSlideOffset:9,perSlideRotate:3,slideShadows:false},navigation:{nextEl:'.work-next',prevEl:'.work-prev'},pagination:{el:'.work-pagination',clickable:true}});
  new Swiper('.team-swiper',{loop:true,grabCursor:true,speed:650,autoplay,spaceBetween:22,slidesPerView:1,breakpoints:{521:{slidesPerView:2},1000:{slidesPerView:3}},navigation:{nextEl:'.team-next',prevEl:'.team-prev'},pagination:{el:'.team-pagination',clickable:true}});
  const portrait=new Swiper('.review-photo-swiper',{loop:true,speed:750,effect:'fade',fadeEffect:{crossFade:true},allowTouchMove:false});
  const review=new Swiper('.review-swiper',{loop:true,grabCursor:true,speed:750,autoplay,effect:'fade',fadeEffect:{crossFade:true},navigation:{nextEl:'.review-next',prevEl:'.review-prev'},on:{slideChange(){const n=this.realIndex;portrait.slideToLoop(n);qsa('[data-review]').forEach(b=>{b.classList.toggle('active',+b.dataset.review===n);b.setAttribute('aria-pressed',String(+b.dataset.review===n))})}}});
  qsa('[data-review]').forEach(b=>b.addEventListener('click',()=>review.slideToLoop(+b.dataset.review)));
  new Swiper('.support-swiper',{loop:true,speed:700,grabCursor:true,autoplay,spaceBetween:24,slidesPerView:1,breakpoints:{700:{slidesPerView:2},1100:{slidesPerView:3}},navigation:{nextEl:'.support-next',prevEl:'.support-prev'}});
 }
 const motionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{entry.target.classList.toggle('motion-paused',!entry.isIntersecting);const slider=entry.target.swiper;if(slider?.params.autoplay?.enabled&&slider.autoplay){if(entry.isIntersecting&&!document.hidden)slider.autoplay.start();else slider.autoplay.stop()}}),{rootMargin:'100px'});qsa('.swiper,.ticker-track,.photo-column').forEach(e=>motionObserver.observe(e));
 enhanceDesign(c,services);
 if(location.hash)document.fonts.ready.then(()=>requestAnimationFrame(()=>{const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));target?.scrollIntoView({behavior:'instant',block:'start'})}));
 if(window.AOS)AOS.init({duration:650,once:true,offset:45,disable:reduced});
 qsa('.contact-form').forEach(form=>{
  form.action=c.form.endpoint;const select=qs('select[name=service]',form);[...services.map(service=>service.short),...c.form.additionalServices].forEach(s=>select.add(new Option(s,s)));
  const service=services.find(s=>s.slug===page);if(service)select.value=service.short;
  const message=qs('[name=message]',form);message.maxLength=c.form.maxMessageLength;message.minLength=c.form.minMessageLength;
  const status=qs('.form-status',form),submit=qs('[type=submit]',form);if(!c.form.enabled){submit.disabled=true;status.textContent='Please contact us by email.';return}
  let token='';const endpoint=new URL(c.form.endpoint,location.href);
  const tokenURL=new URL(endpoint);tokenURL.searchParams.set('action','token');
  if(endpoint.origin===location.origin)fetch(tokenURL.href,{credentials:'same-origin',headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():null).then(d=>{if(d?.token)token=d.token}).catch(()=>{});
  form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;submit.disabled=true;status.classList.remove('error');status.textContent='Sending your request…';
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
   try{const data=new FormData(form);data.set('csrf',token);const r=await fetch(endpoint.href,{method:'POST',body:data,credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal});const type=r.headers.get('content-type')||'';if(!type.includes('application/json'))throw Error('invalid response');const result=await r.json();if(!r.ok||result.success!==true)throw Error('not accepted');status.textContent=c.form.successMessage;form.reset();if(result.token)token=result.token}
   catch{status.textContent=c.form.errorMessage;status.classList.add('error')}
   finally{clearTimeout(timer);submit.disabled=false}
  });
 });
}
const menu=qs('#site-menu'),menuButton=qs('.menu-toggle');let menuTimer;
function closeMenu(){clearTimeout(menuTimer);menu.classList.remove('is-visible');menu.classList.add('is-closing');menuButton.setAttribute('aria-expanded','false');menuTimer=setTimeout(()=>{menu.close();menu.classList.remove('is-closing');document.body.classList.remove('menu-open');menuButton.focus({preventScroll:true})},reduced?0:450)}
menuButton.addEventListener('click',()=>{if(menu.open)closeMenu();else{clearTimeout(menuTimer);menu.classList.remove('is-closing');menu.showModal();requestAnimationFrame(()=>menu.classList.add('is-visible'));menuButton.setAttribute('aria-expanded','true');document.body.classList.add('menu-open')}});
qs('.menu-close').addEventListener('click',closeMenu);
menu.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});menu.addEventListener('cancel',e=>{e.preventDefault();closeMenu()});
const accordionToggles=new WeakMap();qsa('.accordions details').forEach(d=>{let animation,expanded=d.open;const summary=qs('summary',d);function toggle(open){expanded=open;const from=d.getBoundingClientRect().height;animation?.cancel();if(open)d.open=true;const to=open?d.scrollHeight:summary.getBoundingClientRect().height;if(reduced){d.open=open;return}d.style.overflow='hidden';animation=d.animate({height:[from+'px',to+'px']},{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});animation.onfinish=()=>{d.open=open;d.style.overflow='';animation=null}}
accordionToggles.set(d,toggle);summary.addEventListener('click',e=>{e.preventDefault();if(!expanded)qsa('details',d.closest('.accordions')).filter(x=>x!==d&&x.open).forEach(x=>accordionToggles.get(x)?.(false));toggle(!expanded)});
});
const banner=qs('.cookie-card');let privacy=false;try{privacy=localStorage.getItem('forma-privacy')==='acknowledged'}catch{}banner.hidden=privacy;
qs('[data-cookie-accept]').addEventListener('click',()=>{banner.hidden=true;try{localStorage.setItem('forma-privacy','acknowledged')}catch{}});qsa('[data-cookie-settings]').forEach(b=>b.addEventListener('click',()=>{try{localStorage.removeItem('forma-privacy')}catch{}banner.hidden=false;qs('[data-cookie-accept]').focus()}));
document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank'||a.hasAttribute('download'))return;const u=new URL(a.href,location.href);if(u.origin!==location.origin||!['http:','https:'].includes(u.protocol))return;if(u.pathname===location.pathname&&u.hash)return;if(u.pathname!==location.pathname&&!reduced){e.preventDefault();qs('.page-transition').classList.add('active');setTimeout(()=>location.assign(u.href),550)}});window.addEventListener('pageshow',()=>qs('.page-transition').classList.remove('active'));
if(!reduced){const photo=qs('[data-parallax]');let ticking=false;if(photo)window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(()=>{if(scrollY<900)photo.style.transform=`translateY(${scrollY*.12}px)`;ticking=false});ticking=true}},{passive:true});const rotating=qs('#rotating-text');if(rotating){let i=0;const titles=window.SITE_CONFIG.rotatingTitles;setInterval(()=>{if(document.hidden)return;rotating.textContent=titles[++i%titles.length];rotating.parentElement.classList.remove('flash');requestAnimationFrame(()=>rotating.parentElement.classList.add('flash'))},3500)}}
init().catch(err=>{console.error(err);qsa('[data-aos]').forEach(e=>e.removeAttribute('data-aos'));qsa('.form-status').forEach(e=>{e.textContent='Site settings could not load. Please refresh the page.';e.classList.add('error')});qsa('.contact-form button').forEach(e=>e.disabled=true)}).finally(()=>setTimeout(()=>document.documentElement.classList.remove('is-loading'),300));
function enhanceDesign(c,services){
 qsa('[data-founder-name]').forEach(e=>e.textContent=c.creativeLead?.name||'Alex Morgan');qsa('[data-founder-role]').forEach(e=>e.textContent=c.creativeLead?.role||'Creative lead');qsa('.founder-photo>img').forEach(e=>e.src=safeURL(c.creativeLead?.photo||'assets/founder.webp'));
 const counters=qsa('[data-count]');const countObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const e=entry.target,target=+e.dataset.count,pad=+e.dataset.pad||0;countObserver.unobserve(e);if(reduced)return;let start;function frame(t){start??=t;const progress=Math.min(1,(t-start)/1400);e.textContent=String(Math.round(target*(1-Math.pow(1-progress,3)))).padStart(pad,'0');if(progress<1)requestAnimationFrame(frame)}requestAnimationFrame(frame)}),{threshold:.6});counters.forEach(e=>countObserver.observe(e));
 qsa('.editorial-slideshow').forEach(box=>{const frames=qsa('.cover-frame',box),dots=qsa('[data-cover-slide]',box);let index=0,visible=true,paused=false;const select=i=>{index=i;frames.forEach((f,n)=>f.classList.toggle('active',n===i));dots.forEach((d,n)=>d.setAttribute('aria-pressed',String(n===i)))};dots.forEach((d,i)=>d.addEventListener('click',()=>select(i)));let swipeStart;box.addEventListener('pointerdown',e=>{swipeStart={x:e.clientX,y:e.clientY}});box.addEventListener('pointerup',e=>{if(!swipeStart)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))select((index+(dx<0?1:-1)+frames.length)%frames.length);swipeStart=null});box.addEventListener('pointercancel',()=>swipeStart=null);box.addEventListener('mouseenter',()=>paused=true);box.addEventListener('mouseleave',()=>paused=false);box.addEventListener('focusin',()=>paused=true);box.addEventListener('focusout',()=>paused=false);new IntersectionObserver(entries=>visible=entries[0].isIntersecting).observe(box);if(!reduced)setInterval(()=>{if(visible&&!paused&&!document.hidden)select((index+1)%frames.length)},4500)});
 qsa('[data-type-title]').forEach(title=>{if(reduced)return;const text=title.textContent;title.setAttribute('aria-label',text);title.innerHTML=Array.from(text).map(ch=>'<span class="type-character" aria-hidden="true">'+(ch===' '?' ':esc(ch))+'</span>').join('')+'<span class="typing-caret" aria-hidden="true"></span>';const characters=qsa('.type-character',title);const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)return;observer.disconnect();let start;function reveal(time){start??=time;const count=Math.min(characters.length,Math.floor((time-start)/45));characters.forEach((ch,i)=>ch.classList.toggle('visible',i<count));if(count<characters.length)requestAnimationFrame(reveal);else title.classList.add('typing-complete')}requestAnimationFrame(reveal)},{threshold:.3});observer.observe(title)});

 const search=qs('#site-search'),input=qs('#search-input'),results=qs('#search-results');
 if(search){const pages=[...c.navigation,...services.map(s=>({label:s.short,href:s.slug+'.html',keywords:s.searchTerms||''})),{label:'Privacy Policy',href:'privacy.html'},{label:'Terms of Use',href:'terms.html'},{label:'Cookie Policy',href:'cookies.html'}];const find=()=>{const term=input.value.trim().toLowerCase();results.hidden=!term;if(!term)return;const found=pages.filter(p=>(p.label+' '+(p.keywords||'')).toLowerCase().includes(term));results.innerHTML=found.length?found.map(p=>`<a href="${esc(p.href)}">${esc(p.label)} <span>›</span></a>`).join(''):'<p>No matches. Try “Google Ads”, “Meta Ads” or “content”.</p>'};input.addEventListener('input',find);search.addEventListener('submit',e=>{e.preventDefault();find();qs('a',results)?.focus()});input.addEventListener('keydown',e=>{if(e.key==='Escape')results.hidden=true;if(e.key==='ArrowDown'){e.preventDefault();qs('a',results)?.focus()}});document.addEventListener('click',e=>{if(!e.target.closest('.hero-search'))results.hidden=true})}
 const mini=qsa('.mini-frame');let mi=0;if(mini.length&&!reduced)setInterval(()=>{if(document.hidden)return;mini[mi].classList.remove('active');mi=(mi+1)%mini.length;mini[mi].classList.add('active')},4200);
 const galleryCopy=c.galleryCopy;
 if(qs('#gallery-title')){qs('#gallery-title').textContent=galleryCopy.all[0];qs('#gallery-description').textContent=galleryCopy.all[1]}
 qsa('[data-gallery]').forEach(button=>{if(c.galleryLabels[button.dataset.gallery])button.textContent=c.galleryLabels[button.dataset.gallery]});
 qsa('[data-gallery]').forEach(b=>b.addEventListener('click',()=>{qsa('[data-gallery]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));x.tabIndex=x===b?0:-1});const key=b.dataset.gallery;qs('#gallery-panel').setAttribute('aria-labelledby',b.id);qs('#gallery-title').textContent=galleryCopy[key][0];qs('#gallery-description').textContent=galleryCopy[key][1];qsa('[data-gallery-category]').forEach(f=>f.classList.toggle('dimmed',key!=='all'&&f.dataset.galleryCategory!==key))}));
 function journey(key){qsa('.journey-panel').forEach(x=>{const active=x.dataset.journey===key;x.classList.toggle('active',active);x.setAttribute('aria-expanded',String(active))});qsa('.journey-nav button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.journey===key)))}
 qsa('[data-journey]').forEach(b=>b.addEventListener('click',()=>journey(b.dataset.journey)));
 qsa('[data-value]').forEach(b=>b.addEventListener('click',()=>qsa('[data-value]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-expanded',String(x===b))})));
 const principles=c.principles;
 const panel=qs('#principle-panel');
 if(panel){
  const render=(root,i)=>{const item=principles[i];qs('[id="principle-title"]',root).textContent=item.title;qs('[id="principle-copy"]',root).textContent=item.text;qs('[id="principle-list"]',root).innerHTML=item.points.map(t=>`<li>${esc(t)}</li>`).join('');const img=qs('.principle-detail img',root);img.src=item.image;img.alt=item.alt};
  render(panel,0);
  qsa('[data-principle]').forEach((button,i)=>{const label=[...button.childNodes].find(node=>node.nodeType===3);if(label)label.textContent=principles[i].tab});
  let chosen=0,turn=0;
  const sizePanel=()=>{const clone=panel.cloneNode(true);clone.style.cssText=`position:fixed;left:-9999px;top:0;visibility:hidden;width:${panel.getBoundingClientRect().width}px;height:auto;min-height:0;pointer-events:none`;panel.parentElement.append(clone);let height=0;for(let i=0;i<principles.length;i++){render(clone,i);height=Math.max(height,clone.getBoundingClientRect().height)}clone.remove();panel.style.minHeight=Math.ceil(height)+'px'};
  document.fonts.ready.then(sizePanel);let width=0;new ResizeObserver(entries=>{const w=entries[0].contentRect.width;if(Math.abs(w-width)>1){width=w;sizePanel()}}).observe(panel);
  qsa('[data-principle]').forEach((button,i)=>button.addEventListener('click',async()=>{if(chosen===i)return;chosen=i;const current=++turn;qsa('[data-principle]').forEach(x=>{x.classList.toggle('active',x===button);x.setAttribute('aria-selected',String(x===button));x.tabIndex=x===button?0:-1});panel.setAttribute('aria-labelledby',button.id);if(!reduced)await panel.animate({opacity:[1,0],transform:['translateY(0)','translateY(4px)']},{duration:160,fill:'forwards'}).finished.catch(()=>{});if(current!==turn)return;render(panel,i);panel.getAnimations().forEach(a=>a.cancel());if(!reduced)panel.animate({opacity:[0,1],transform:['translateY(4px)','translateY(0)']},{duration:350,easing:'ease-out'})}));
 }
 qsa('[role=tablist]').forEach(list=>list.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(e.key))return;const bs=qsa('[role=tab]',list);let i=bs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();i=e.key==='Home'?0:e.key==='End'?bs.length-1:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+bs.length)%bs.length;bs[i].focus();bs[i].click()}));
 if(!reduced){let queued=false;const photos=qsa('.parallax-media');window.addEventListener('scroll',()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{photos.forEach(p=>{const r=p.parentElement.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)p.style.transform=`translateY(${(r.top-innerHeight/2)*.09}px) scale(1.13)`});queued=false})},{passive:true})}
}
