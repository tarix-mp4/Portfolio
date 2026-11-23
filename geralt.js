/* One original SVG. Local, occluded peeks; a separate viewport-owned discovery/rest mode. */
(() => {
  'use strict';
  if (document.getElementById('geralt-system')) return;
  const $ = s => document.querySelector(s), root = document.documentElement;
  const motion = window.tarixV6Motion, reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const schedule = motion?.scheduleFrame || requestAnimationFrame.bind(window);
  const cancel = motion?.cancelFrame || cancelAnimationFrame.bind(window);
  const quiet = () => reduced.matches || !!(motion && !motion.motionAllowed());
  const lettering = document.createElement('canvas').getContext('2d');
  const system = document.createElement('div'); system.id = 'geralt-system';
  system.dataset.phase = 'hidden'; system.dataset.found = 'false';
  const cat = document.createElement('button'); cat.id = 'geralt-cat'; cat.className = 'geralt-cat is-peeking';
  cat.type = 'button'; cat.disabled = true; cat.hidden = true;
  cat.setAttribute('aria-label','A cat is peeking. Discover Geralt');
  cat.innerHTML = '<span class="geralt-art"><img src="assets/geralt.svg" alt="Geralt, a white cat with one blue eye and one golden eye" width="1254" height="1254" decoding="async" draggable="false"></span><span class="geralt-pocket" aria-hidden="true"></span>';
  system.append(cat); document.body.append(system);
  const art = cat.firstElementChild, pocket = cat.lastElementChild;
  // Both viewport surfaces are direct body children, outside every animated section.
  const dock = document.createElement('div'); dock.id = 'geralt-dock'; dock.hidden = true; document.body.append(dock);
  const dialog = document.createElement('dialog'); dialog.id = 'geralt-dialog';
  dialog.setAttribute('aria-labelledby','geralt-message'); dialog.setAttribute('aria-describedby','geralt-help');
  dialog.innerHTML = '<div class="geralt-halo" aria-hidden="true"></div><div class="geralt-celebration"><h2 id="geralt-message">YOU FOUND GERALT!</h2><p id="geralt-help">Click anywhere or press Escape to let him settle.</p></div>';
  document.body.append(dialog);
  const stage = $('.geralt-celebration'), message = $('#geralt-message');
  const definitions = [
    {id:'hero',selector:'#hero-title .name-first',x:.74,tilt:-6,size:108,small:92,drift:-12},
    {id:'project',selector:'.project-card--a-quiet-trail .project-visual',x:.78,tilt:7,size:112,small:88,drift:10},
    {id:'photograph',selector:'.photo-item--3 .photo-tilt',x:.72,side:90,tilt:-5,size:108,small:90,drift:-8},
    {id:'portrait',selector:'#about .portrait-image',x:.68,side:-90,tilt:6,size:104,small:90,drift:12},
    {id:'education',selector:'.education-item',x:.83,tilt:-8,size:100,small:88,drift:-10},
    {id:'contact',selector:'.contact-card--email',x:.65,tilt:5,size:104,small:88,drift:8}
  ].map(d=>({...d,host:$(d.selector),visible:false})).filter(d=>d.host);
  let found=false,mode='peeking',current=null,timer=0,frame=0,epoch=0,peek=null,entered=false,focusHold=false;
  let flightEpoch=0,flights=[],revealPending=false;
  const mirrors=[],parents=new Set();
  const phase = value => { system.dataset.phase=value; };
  const blocked = () => document.hidden || !!$('dialog[open]') || !!($('#mobile-nav')&&!$('#mobile-nav').hidden);
  const clearTimer = () => { clearTimeout(timer); timer=0; };
  function later(ms,fn){clearTimer();timer=setTimeout(()=>{timer=0;fn();},ms);}
  function wake(){if(!frame)frame=schedule(reconcile);}
  function mirror(place){
    if(found)return;
    const style=getComputedStyle(place.host),mount=place.mount;
    for(const name of place.copiedVars||[])mount.style.removeProperty(name);
    place.copiedVars=[];
    for(const name of Array.from(place.host.style)){if(name.startsWith('--')){mount.style.setProperty(name,place.host.style.getPropertyValue(name));place.copiedVars.push(name);}}
    const transform=place.host.style.transform || (place.id==='photograph'?'perspective(1000px) rotateX(var(--photo-rx,0deg)) rotateY(var(--photo-ry,0deg)) translateY(var(--photo-lift,0px))':place.id==='contact'?'perspective(950px) rotateX(var(--tilt-x,0deg)) rotateY(var(--tilt-y,0deg))':'none');
    mount.style.transform=transform;mount.style.transformOrigin=style.transformOrigin;
    mount.style.transitionProperty='transform';mount.style.transitionDuration=style.transitionDuration;mount.style.transitionTimingFunction=style.transitionTimingFunction;
  }
  function layout(place){
    if(found)return;
    const host=place.host,m=place.mount,r=host.getBoundingClientRect(),small=innerWidth<768;
    m.style.left=host.offsetLeft+'px';m.style.top=host.offsetTop+'px';m.style.width=host.offsetWidth+'px';m.style.height=host.offsetHeight+'px';
    let size=small?place.small:place.size,turn=place.side||0,x=host.offsetWidth*place.x,y=0;
    if(turn===90&&r.right+size*.535>innerWidth-8)turn=0;
    if(turn===-90&&r.left-size*.535<8)turn=0;
    if(turn){x=turn===90?host.offsetWidth:0;y=host.offsetHeight*.38;}
    if(place.id==='hero'){
      const line=getComputedStyle(host),glyph=getComputedStyle(host.firstElementChild);
      lettering.font=glyph.font||`${glyph.fontWeight} ${glyph.fontSize} ${glyph.fontFamily}`;
      const metric=lettering.measureText(host.textContent),e=lettering.measureText('E'),prefix=lettering.measureText('TAR');
      const spacing=parseFloat(glyph.letterSpacing)||0,fontSize=parseFloat(glyph.fontSize),ascent=metric.fontBoundingBoxAscent??fontSize,descent=metric.fontBoundingBoxDescent??fontSize*.2;
      size=Math.min(size,Math.max(56,e.width/.78));
      x=parseFloat(line.paddingLeft)+prefix.width+3*spacing+e.width/2;
      y=parseFloat(line.paddingTop)+(parseFloat(glyph.lineHeight)-ascent-descent)/2+ascent-metric.actualBoundingBoxAscent+1;
    }
    const depth=size*.535;
    place.sizeNow=size;place.depth=depth;place.turn=turn;
    place.pose.style.left=x+'px';place.pose.style.top=y+'px';place.pose.style.transform=`rotate(${turn}deg)`;
    place.window.style.cssText=`left:${-size/2}px;top:${-depth}px;width:${size}px;height:${place.id==='hero'?depth+1:size}px;`;
    if(current===place){cat.style.width=size+'px';cat.style.height=size+'px';}
    mirror(place);
  }
  for(const place of definitions){
    const parent=place.host.parentElement;place.parent=parent;
    if(getComputedStyle(parent).position==='static')parent.classList.add('geralt-anchor-parent');
    parent.classList.add('geralt-layer-parent');parents.add(parent);
    place.host.classList.add('geralt-foreground');
    if(place.id==='education')place.host.classList.add('geralt-paper-surface');
    const mount=document.createElement('span');mount.className='geralt-hideout';mount.dataset.location=place.id;
    mount.innerHTML='<span class="geralt-pose"><span class="geralt-window"></span></span>';
    parent.insertBefore(mount,place.host);place.mount=mount;place.pose=mount.firstElementChild;place.window=place.pose.firstElementChild;
    const observer=new MutationObserver(()=>mirror(place));observer.observe(place.host,{attributes:true,attributeFilter:['style']});mirrors.push(observer);
    layout(place);
  }
  function visible(place){
    if(!place.visible||place.host.closest('[hidden]')||!place.host.getClientRects().length)return false;
    const point=place.pose.getBoundingClientRect(),s=place.sizeNow,h=place.depth;
    const box=place.turn===90?{left:point.left,right:point.left+h,top:point.top-s/2,bottom:point.top+s/2}:place.turn===-90?{left:point.left-h,right:point.left,top:point.top-s/2,bottom:point.top+s/2}:{left:point.left-s/2,right:point.left+s/2,top:point.top-h,bottom:point.top};
    const header=$('.site-header').getBoundingClientRect();
    if(box.left<4||box.right>innerWidth-4||box.top<header.bottom+8||box.bottom>innerHeight-8)return false;
    for(const obstacle of document.querySelectorAll('.work-toolbar,.studio-prop')){
      const r=obstacle.getBoundingClientRect();if(r.width&&r.height&&box.left<r.right&&box.right>r.left&&box.top<r.bottom&&box.bottom>r.top)return false;
    }
    if(place.id==='hero'&&place.host.firstElementChild.getAnimations().some(a=>a.playState==='running'&&a.effect?.getComputedTiming().activeDuration!==Infinity)){revealPending=true;return false;}
    // Do not inherit an unfinished section reveal or its temporarily reduced opacity.
    for(let e=place.host;e&&e!==document.body;e=e.parentElement){
      if(+getComputedStyle(e).opacity<.995){revealPending=true;return false;}
    }
    return true;
  }
  function stop(){epoch++;clearTimer();peek?.cancel();peek=null;cat.hidden=true;cat.disabled=true;focusHold=false;current=null;phase('hidden');}
  function choose(){
    revealPending=false;
    return definitions.filter(visible).sort((a,b)=>Math.abs(a.pose.getBoundingClientRect().top-innerHeight*.46)-Math.abs(b.pose.getBoundingClientRect().top-innerHeight*.46))[0];
  }
  async function emerge(token){
    if(token!==epoch||found)return;
    if(blocked()||!current||!visible(current)){stop();wake();return;}
    const from=`translate(${current.drift}px,${current.depth+6}px)`;
    cat.hidden=false;cat.disabled=false;cat.style.transform=from;phase('emerging');
    if(!quiet()){peek=cat.animate([{transform:from},{transform:'translate(0,0)'}],{duration:460,easing:'cubic-bezier(.22,.85,.3,1)',fill:'forwards'});await peek.finished.catch(()=>{});}
    if(token!==epoch||found)return;
    cat.style.transform='translate(0,0)';peek?.cancel();peek=null;phase('visible');
    if(!quiet()&&!focusHold)later(1000,()=>retreat(token));
  }
  async function retreat(token){
    if(token!==epoch||found||!current)return;
    cat.disabled=true;phase('retreating');const to=`translate(${current.drift}px,${current.depth+6}px)`;
    peek=cat.animate([{transform:'translate(0,0)'},{transform:to}],{duration:360,easing:'cubic-bezier(.5,.03,.6,1)',fill:'forwards'});await peek.finished.catch(()=>{});
    if(token!==epoch||found)return;
    cat.style.transform=to;peek?.cancel();peek=null;cat.hidden=true;phase('hidden');
    later(3000,()=>{if(!current||!visible(current)){stop();wake();return;}emerge(token);});
  }
  function start(place){
    stop();current=place;layout(place);place.window.append(cat);cat.className='geralt-cat is-peeking';
    cat.style.cssText=`width:${place.sizeNow}px;height:${place.sizeNow}px;--geralt-tilt:${place.tilt}deg;`;
    system.dataset.location=place.id;phase('waiting');const token=epoch;later(780+definitions.indexOf(place)*65,()=>emerge(token));
  }
  function reconcile(){
    frame=0;
    if(found){if(mode==='resting'){dock.hidden=blocked();cat.disabled=dock.hidden;}return;}
    if(blocked()){if(current)stop();return;}
    if(current&&visible(current))return;
    if(current)stop();
    const next=choose();if(next)start(next);else if(revealPending)later(180,wake);
  }
  function cancelFlights(){flights.forEach(a=>a.cancel());flights=[];}
  function restoreSite(){if(!$('dialog[open]')){root.classList.remove('screening');document.body.classList.remove('dialog-open');motion?.notify();}}
  function releaseHidingSystem(){
    visibility.disconnect();resizing?.disconnect();mirrors.forEach(o=>o.disconnect());
    for(const place of definitions){place.mount.remove();place.host.classList.remove('geralt-foreground','geralt-paper-surface');}
    parents.forEach(p=>p.classList.remove('geralt-anchor-parent','geralt-layer-parent'));
  }
  async function discover(){
    const fromPeek=mode==='peeking';
    if(mode!=='resting'&&!(fromPeek&&['visible','emerging'].includes(system.dataset.phase)))return;
    const old=cat.getBoundingClientRect(),turn=fromPeek?current.turn:0,tilt=fromPeek?current.tilt:0;
    const visibleFraction=fromPeek?current.depth/current.sizeNow:.76;
    found=true;system.dataset.found='true';clearTimer();epoch++;peek?.cancel();peek=null;if(frame)cancel(frame);frame=0;
    mode='celebration';phase('discovering');entered=false;const token=++flightEpoch;cancelFlights();
    cat.hidden=false;cat.disabled=false;cat.className='geralt-cat is-full';cat.style.cssText='';
    cat.setAttribute('aria-label','Geralt. Click or press Escape to let him settle.');stage.prepend(cat);
    if(fromPeek)releaseHidingSystem();current=null;dock.hidden=true;
    dialog.classList.remove('is-closing');dialog.showModal();root.classList.add('screening');document.body.classList.add('dialog-open');motion?.notify();cat.focus({preventScroll:true});
    const target=cat.getBoundingClientRect(),duration=quiet()?0:780;
    if(duration){
      const dx=old.left+old.width/2-target.left-target.width/2,dy=old.top+old.height/2-target.top-target.height/2;
      flights.push(cat.animate([{transform:`translate(${dx}px,${dy}px) rotate(${turn}deg) scale(${old.width/target.width})`},{transform:'translate(0,0) rotate(0deg) scale(1)'}],{duration,easing:'cubic-bezier(.22,1.04,.36,1)',fill:'both'}));
      // Unfold the actual hiding plane only during lift-off; normal peeks use the real foreground.
      flights.push(art.animate([{clipPath:`inset(0 0 ${(1-visibleFraction)*100}% 0)`,transform:`rotate(${tilt}deg)`},{clipPath:'inset(0)',transform:'rotate(0deg)'}],{duration:660,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}));
      flights.push(message.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:300,delay:480,easing:'ease-out',fill:'both'}));
      await Promise.all(flights.map(a=>a.finished.catch(()=>{})));
    }
    if(token!==flightEpoch||mode!=='celebration')return;cancelFlights();entered=true;phase('celebrating');
  }
  async function dismiss(){
    if(mode!=='celebration')return;
    const old=cat.getBoundingClientRect(),token=++flightEpoch;cancelFlights();mode='docking';phase('docking');entered=false;
    dock.hidden=false;dock.style.visibility='hidden';const target=dock.getBoundingClientRect();dock.style.visibility='';dock.hidden=true;
    cat.className='geralt-cat is-full is-docking';cat.disabled=true;dialog.classList.add('is-closing');
    const current=cat.getBoundingClientRect();
    if(!quiet()){
      flights.push(cat.animate([{transform:`translate(${old.left-current.left}px,${old.top-current.top}px) scale(${old.width/current.width})`},{transform:`translate(${target.left-current.left}px,${target.top-current.top}px) scale(${target.width/current.width})`}],{duration:560,easing:'cubic-bezier(.3,.75,.2,1)',fill:'both'}));
      flights.push(pocket.animate([{opacity:0},{opacity:1}],{duration:240,delay:320,fill:'both'}));
      flights.push(art.animate([{clipPath:'inset(0)'},{clipPath:'inset(0 0 24% 0)'}],{duration:120,delay:440,easing:'ease-in',fill:'both'}));
      flights.push(message.animate([{opacity:1},{opacity:0,transform:'translateY(6px)'}],{duration:180,fill:'both'}));
      await Promise.all(flights.map(a=>a.finished.catch(()=>{})));
    }
    if(token!==flightEpoch)return;
    dock.append(cat);cat.className='geralt-cat is-resting';cat.style.cssText='';cancelFlights();dialog.close();mode='resting';phase('resting');cat.setAttribute('aria-label','Geralt. Replay the discovery');cat.title='Geralt';restoreSite();dock.hidden=blocked();cat.disabled=dock.hidden;cat.focus({preventScroll:true});
  }
  cat.addEventListener('click',event=>{if(mode==='resting'||mode==='peeking'){event.preventDefault();event.stopPropagation();discover();}});
  cat.addEventListener('focus',()=>{if(mode==='peeking'&&system.dataset.phase==='visible'){focusHold=true;clearTimer();}});
  cat.addEventListener('blur',()=>{if(!found&&focusHold&&current&&!quiet()){focusHold=false;later(1000,()=>retreat(epoch));}});
  dialog.addEventListener('click',event=>{event.stopPropagation();if(entered){event.preventDefault();dismiss();}});
  dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss();});
  // The small fixed companion never captures a video/contact control underneath it.
  // Background clicks can still replay it, and the button remains keyboard accessible.
  document.addEventListener('click',event=>{
    if(mode!=='resting'||dock.hidden||event.target.closest('a,button,input,select,textarea,[role="button"],[contenteditable]'))return;
    const r=dock.getBoundingClientRect();if(event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom)discover();
  });
  const visibility=new IntersectionObserver(entries=>{for(const entry of entries){const p=definitions.find(d=>d.host===entry.target);if(p)p.visible=entry.isIntersecting;}if(!found)wake();});
  definitions.forEach(d=>visibility.observe(d.host));
  const resizing='ResizeObserver'in window?new ResizeObserver(()=>{if(!found){if(current&&(current.host.offsetWidth!==parseFloat(current.mount.style.width)||current.host.offsetHeight!==parseFloat(current.mount.style.height)))stop();definitions.forEach(layout);wake();}}):null;
  definitions.forEach(d=>resizing?.observe(d.host));
  function resized(){if(!found){stop();definitions.forEach(layout);wake();}}
  document.fonts?.ready.then(resized);document.addEventListener('portfolio:layout',resized);document.addEventListener('toggle',resized,true);
  const menu=$('#mobile-nav');if(menu)new MutationObserver(wake).observe(menu,{attributes:true,attributeFilter:['hidden']});
  motion?.onChange(()=>{if(!found)stop();wake();});reduced.addEventListener('change',()=>{if(!found)stop();wake();});
  addEventListener('scroll',()=>{if(!found)wake();},{passive:true});addEventListener('resize',resized,{passive:true});
  addEventListener('pageshow',wake);addEventListener('pagehide',()=>{clearTimer();if(frame)cancel(frame);frame=0;if(!found)stop();});document.addEventListener('visibilitychange',wake);
  // Only open/closed UI state matters after discovery. Never read project coordinates for the dock.
  new MutationObserver(()=>{if(found&&mode==='resting')wake();}).observe(root,{attributes:true,attributeFilter:['class']});
  document.addEventListener('close',wake,true);wake();
})();
