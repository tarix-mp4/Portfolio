/* V6 cinematic completion: event-driven choreography on the retained motion dispatcher. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const motion = window.tarixV6Motion;
  if (!motion) return;
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const small = matchMedia('(max-width:768px)');
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const debug = { edition:'V6 cinematic completion', photoReveals:{}, headings:{}, transitions:{},
    focus:[0,0], paletteWeights:[1,0,0], monitorTimecode:'', activeAnimations:0, scrollFrames:0 };
  Object.defineProperty(window, '__tarixCinema', { value:debug });
  // The original alpha poster remains the fallback. A silhouette mask confines
  // the simulated reflections to it when real material lighting is unavailable.
  const hero=$('#hero-art');let posterJob=0,posterRect=null,posterX=0,posterY=0,posterTX=0,posterTY=0,posterLast=0;
  function posterLighting(now){
    posterJob=0;
    const fallback=window.__tarixMotion?.renderer==='fallback';hero.classList.toggle('is-poster-lighting',fallback);
    if(!fallback||!motion.canMove())return;
    const ease=1-Math.exp(-Math.min(42,now-posterLast||16.7)*.01);posterLast=now;
    posterX+=(posterTX-posterX)*ease;posterY+=(posterTY-posterY)*ease;
    hero.style.setProperty('--studio-x',`${(40+posterX*18).toFixed(2)}%`);
    hero.style.setProperty('--studio-y',`${(35+posterY*16).toFixed(2)}%`);
    hero.style.setProperty('--rim-x',`${(77-posterX*10).toFixed(2)}%`);
    debug.posterLight=[posterX,posterY];
    if(Math.hypot(posterTX-posterX,posterTY-posterY)>.002)posterJob=motion.scheduleFrame(posterLighting);
  }
  function wakePoster(){if(window.__tarixMotion?.renderer==='fallback'&&motion.canMove()&&!posterJob){posterLast=performance.now();posterJob=motion.scheduleFrame(posterLighting);}}
  hero.classList.toggle('is-poster-lighting',window.__tarixMotion?.renderer==='fallback');
  hero.addEventListener('pointermove',event=>{
    if(!fine.matches||event.pointerType!=='mouse'||!motion.canMove()||window.__tarixMotion?.renderer!=='fallback')return;
    posterRect ||= hero.getBoundingClientRect();
    posterTX=clamp((event.clientX-posterRect.left)/posterRect.width*2-1,-1,1);
    posterTY=clamp((event.clientY-posterRect.top)/posterRect.height*2-1,-1,1);wakePoster();
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{posterTX=posterTY=0;wakePoster();});
  const animations = new Set();
  function track(animation) {
    animations.add(animation); debug.activeAnimations = animations.size;
    animation.finished.catch(() => {}).finally(() => {
      animations.delete(animation); debug.activeAnimations = animations.size;
    });
    return animation;
  }

  // Authentic typography. Keep the existing font/wrapping and leave the name untouched.
  const titles = $$('[data-kinetic]');
  titles.forEach((title, chapter) => {
    const label = title.innerText.replace(/\s+/g,' ').trim();
    title.setAttribute('aria-label', label); title.classList.add('is-kinetic');
    title.dataset.kineticState = motion.canMove() ? 'waiting' : 'shown';
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT), texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    let letterIndex = 0, wordIndex = 0;
    texts.forEach(text => {
      const fragment = document.createDocumentFragment();
      text.textContent.split(/(\s+)/).forEach(textWord => {
        if (!textWord.trim()) { fragment.append(document.createTextNode(textWord)); return; }
        const word = document.createElement('span'); word.className = 'kinetic-word';
        word.setAttribute('aria-hidden','true'); word.dataset.wordIndex = String(wordIndex++);
        for (const character of textWord) {
          const letter = document.createElement('span'); letter.className = 'kinetic-letter';
          letter.textContent = character; letter.dataset.char = character;
          letter.dataset.letterIndex = String(letterIndex++); word.append(letter);
        }
        fragment.append(word);
      });
      text.replaceWith(fragment);
    });
    const readout = document.createElement('span'); readout.className = 'chapter-readout';
    readout.setAttribute('aria-hidden','true');
    readout.textContent = `SCENE ${String(chapter + 1).padStart(2,'0')} / ROLLING · 24 FPS`;
    title.append(readout);
  });
  function revealTitle(title) {
    if (title.dataset.kineticState !== 'waiting') return;
    title.dataset.kineticState = 'shown';
    debug.headings[title.id] = { letters:$$('.kinetic-letter',title).length, reveals:1 };
    if (!motion.canMove()) return;
    $$('.kinetic-word',title).forEach((word, index) => {
      track(word.animate([{transform:`translateX(${index % 2 ? 10 : -10}px)`}, {transform:'translateX(0)'}],
        {duration:1100,easing:'cubic-bezier(.22,1,.36,1)'}));
    });
    $$('.kinetic-letter',title).forEach((letter,index) => {
      const a = track(letter.animate([
        { transform:'translate3d(0,.64em,0) rotateX(28deg)', opacity:0 },
        { transform:'translate3d(0,-.018em,0) rotateX(0deg)', opacity:1, offset:.85 },
        { transform:'translate3d(0,0,0)', opacity:1 }
      ], {duration:920,delay:Math.min(index*(small.matches?17:23),480),
          easing:'cubic-bezier(.22,.68,.2,1)',fill:'backwards'}));
      a.finished.catch(() => {});
    });
  }
  const titleObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { revealTitle(entry.target); titleObserver.unobserve(entry.target); } });
  },{threshold:.12,rootMargin:'0px 0px -9% 0px'}) : null;
  titles.forEach(title => titleObserver ? titleObserver.observe(title) : revealTitle(title));

  // Slow, once-only photographic entrances after decode. No crop/blur on touch devices.
  const photoItems = $$('.photo-item');
  photoItems.forEach(item => {
    item.dataset.photoState = motion.canMove() ? 'waiting' : 'shown';
    if (!motion.canMove()) item.classList.add('is-shown');
  });
  async function revealPhoto(item) {
    if (item.dataset.photoState !== 'waiting') return;
    item.dataset.photoState = 'decoding';
    const image = $('img',item), link = $('.photo-open',item);
    try { await image.decode(); } catch (_) {}
    // An explicit view change or motion pause may have already exposed the frame.
    if(item.dataset.photoState!=='decoding')return;
    item.dataset.photoState = 'shown';
    item.classList.add('is-shown');
    const index = Number(item.dataset.photoIndex), mobile = !fine.matches || small.matches;
    debug.photoReveals[index] = { duration:mobile?980:1050, once:true, mobile, crop:false, blur:false };
    if (!motion.canMove()) return;
    const bounds=link.getBoundingClientRect();
    if(bounds.bottom<=0||bounds.top>=innerHeight)return;
    const a = track(link.animate([
      {transform:`translate3d(0,${mobile?18:26}px,0) scale(.994)`,opacity:.08},
      {transform:'translate3d(0,0,0) scale(1)',opacity:1}
    ],{duration:mobile?980:1050,delay:(index%3)*(mobile?55:45),easing:mobile?'cubic-bezier(.32,.08,.28,1)':'cubic-bezier(.22,.68,.2,1)',fill:'backwards'}));
    a.finished.catch(() => {});
  }
  const photoObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => { if(entry.isIntersecting) { revealPhoto(entry.target); photoObserver.unobserve(entry.target); } });
  },{threshold:.1,rootMargin:'0px 0px -6% 0px'}) : null;
  photoItems.forEach(item => photoObserver ? photoObserver.observe(item) : revealPhoto(item));
  $$('[data-gallery-view]').forEach(button=>button.addEventListener('click',()=>{
    photoItems.forEach(item=>{item.dataset.photoState='shown';item.classList.add('is-shown');photoObserver?.unobserve(item);});
  }));

  // Measured once per layout change; scrolling uses cached bounds, not repeated layout reads.
  let sections = [], titleBounds = [], photoBounds = [], scrollJob = 0, previousScroll = scrollY;
  const gallery = $('#photography'), photos = JSON.parse($('#photo-data').textContent);
  const paletteLayers = ['amber','fire','indigo'].map(key => $('.palette-layer--'+key,gallery));
  ['work','about','experience','contact'].forEach(id => {
    const section = $('#'+id); if (!section) return;
    section.classList.add('has-atmosphere');
    const atmosphere = document.createElement('div'); atmosphere.className = 'chapter-atmosphere';
    atmosphere.setAttribute('aria-hidden','true'); section.prepend(atmosphere);
  });
  const scan = document.createElement('span'); scan.className = 'archive-tech-scan'; scan.setAttribute('aria-hidden','true');
  $('.archive-atmosphere')?.append(scan);
  const seenTransitions = new Set();
  function measure() {
    sections = ['work','photography','about','contact'].map(id => {
      const element = $('#'+id), r = element.getBoundingClientRect();
      return { element, id, top:r.top+scrollY, height:r.height };
    });
    titleBounds = titles.map(title => ({title,top:title.getBoundingClientRect().top+scrollY}));
    photoBounds = photoItems.map(item => {
      const r = item.getBoundingClientRect(); return {item,top:r.top+scrollY,center:r.top+scrollY+r.height/2,height:r.height,width:r.width};
    });
    queueScroll();
  }
  function updateScroll() {
    scrollJob = 0; debug.scrollFrames++;
    const y = scrollY, center = y + innerHeight*.52;
    posterRect=null;
    if(!fine.matches&&window.__tarixMotion?.renderer==='fallback') {
      const progress=clamp(y/Math.max(1,$('#top').offsetHeight),0,1.4);
      posterTX=Math.sin(progress*2.4)*.72;posterTY=Math.sin(progress*1.6)*.38;wakePoster();
    }
    titleBounds.forEach(({title,top}) => title.style.setProperty('--type-fill',
      `${motion.canMove()? (clamp((y+innerHeight*.87-top)/(innerHeight*.52))*100).toFixed(2):100}%`));
    let weights = [0,0,0], total = 0, nearest = null, score = -1;
    photoBounds.forEach(p => {
      const visible = Math.max(0,Math.min(p.top+p.height,y+innerHeight)-Math.max(p.top,y));
      const strength = visible*p.width/(1+Math.abs(p.center-center)/innerHeight);
      if(strength>score) { score=strength; nearest=p; }
      if(strength>0) { weights[['amber','fire','indigo'].indexOf(photos[Number(p.item.dataset.photoIndex)].palette)]+=strength; total+=strength; }
    });
    if(total>0) {
      weights = weights.map(w=>w/total); debug.paletteWeights = weights;
      paletteLayers.forEach((layer,i)=>{layer.style.opacity=weights[i].toFixed(4);});
      const photo = photos[Number(nearest.item.dataset.photoIndex)];
      gallery.dataset.palette=photo.palette; window.__tarixV6.atmosphere=photo.palette;
      $('#exhibition-frame').textContent=photo.number;
    }
    sections.forEach(section => {
      const power = clamp(1-Math.abs(section.top+section.height*.25-center)/(innerHeight*2),.25,1);
      section.element.style.setProperty('--chapter-power',power.toFixed(3));
    });
    $('#work').style.setProperty('--work-atmosphere',clamp((center-sections[0].top)/innerHeight,.2,1).toFixed(3));
    scan.style.setProperty('--scan-y',`${clamp((y-sections[0].top)*.16,-120,380).toFixed(1)}px`);
    if(y>previousScroll && motion.canMove()) {
      const crossed = sections.filter(s=>!seenTransitions.has(s.id) && s.top>previousScroll+innerHeight*.72 && s.top<=y+innerHeight*.72 && s.top>=y-innerHeight*.2);
      if(crossed.length) { const next=crossed.at(-1); seenTransitions.add(next.id); playTransition(next.id); }
    }
    // Chapters passed in a navigation jump won't flash later on a tiny reverse scroll.
    sections.forEach(s=>{if(s.top<y+innerHeight*.35)seenTransitions.add(s.id);});
    previousScroll=y;
  }
  function queueScroll() { if(!scrollJob&&!document.hidden)scrollJob=motion.scheduleFrame(updateScroll); }
  window.addEventListener('scroll',queueScroll,{passive:true});
  window.addEventListener('resize',measure,{passive:true});
  document.addEventListener('portfolio:layout',measure);
  if('ResizeObserver' in window) { const ro=new ResizeObserver(measure);ro.observe(gallery); }

  // Four actual film/shutter/exposure transitions, played at most once per chapter visit.
  const transition=document.createElement('div'); transition.className='cinematic-transition';
  transition.setAttribute('aria-hidden','true'); transition.innerHTML=
    '<div class="transition-burn"><span class="burn-field"></span><span class="burn-edge"></span></div>'+
    '<div class="transition-shutter"><span class="shutter-leaf shutter-leaf--top"></span><span class="shutter-leaf shutter-leaf--bottom"></span><span class="shutter-frame"></span></div>'+
    '<div class="transition-exposure"></div><div class="transition-sweep"></div>';
  document.body.append(transition);
  let effectToken=0, effectAnimations=[];
  function stopTransition() {
    effectToken++;effectAnimations.forEach(a=>a.cancel());effectAnimations=[];
    transition.classList.remove('is-playing');delete transition.dataset.effect;
  }
  function playTransition(chapter) {
    if(!motion.canMove())return;
    stopTransition();const token=effectToken;
    const effect={work:'burn',photography:'shutter',about:'exposure',contact:'sweep'}[chapter];
    transition.dataset.effect=effect;transition.classList.add('is-playing');
    debug.transitions[chapter]=(debug.transitions[chapter]||0)+1;
    const animate=(element,keys,duration,easing='cubic-bezier(.22,.68,.2,1)')=>{
      const a=track(element.animate(keys,{duration,easing}));effectAnimations.push(a);return a;
    };
    if(effect==='burn') {
      animate($('.transition-burn',transition),[
        {opacity:0,transform:'translateX(-65%)'},
        {opacity:.92,transform:'translateX(-12%)',offset:.38},
        {opacity:.48,transform:'translateX(23%)',offset:.68},
        {opacity:0,transform:'translateX(72%)'}],1050);
    } else if(effect==='shutter') {
      ['top','bottom'].forEach((side,i)=>animate($('.shutter-leaf--'+side,transition),[
        {transform:`translateY(${i?102:-102}%)`},
        {transform:`translateY(${i?9:-9}%)`,offset:.25},
        {transform:`translateY(${i?102:-102}%)`}],920));
      animate($('.shutter-frame',transition),[{opacity:0,transform:'scale(1.035)'},{opacity:.65,transform:'scale(1)',offset:.45},{opacity:0,transform:'scale(1.015)'}],920);
    } else if(effect==='exposure') {
      animate($('.transition-exposure',transition),[{opacity:0,transform:'scale(1.04)'},{opacity:.72,transform:'scale(1.01)',offset:.38},{opacity:0,transform:'scale(1)'}],1050);
    } else {
      animate($('.transition-sweep',transition),[{opacity:0,transform:'translateX(-70%)'},{opacity:.75,transform:'translateX(-5%)',offset:.48},{opacity:0,transform:'translateX(70%)'}],1150);
    }
    Promise.all(effectAnimations.map(a=>a.finished.catch(()=>{}))).then(()=>{if(token===effectToken)stopTransition();});
  }

  // Damped AF brackets, focus ring, exposure indicator and visit-derived monitor timecode.
  const monitor=$('.portrait-reel'), guides=$('.director-guides',monitor), reticle=$('.director-reticle',guides);
  reticle.innerHTML='<i class="director-focus-ring"></i>';
  const surface=document.createElement('span');surface.className='monitor-surface';surface.setAttribute('aria-hidden','true');monitor.append(surface);
  const hud=document.createElement('span');hud.className='monitor-hud';hud.setAttribute('aria-hidden','true');
  hud.innerHTML='<span class="monitor-frame-guide"></span><span class="monitor-focus-state">AF-C / LOCKED</span><span class="monitor-level"></span><span class="monitor-settings"><span>ISO 400 · T2.8</span><span>180° · 4300K</span></span>';
  monitor.append(hud);
  let monitorBounds=null,targetX=0,targetY=0,focusX=0,focusY=0,monitorJob=0,lastFrame=0,monitorVisible=false,clockTimer=0;
  function paintMonitor(now) {
    monitorJob=0;
    const factor=1-Math.exp(-Math.min(42,now-lastFrame||16.7)*.012);lastFrame=now;
    focusX+=(targetX-focusX)*factor;focusY+=(targetY-focusY)*factor;
    monitor.style.setProperty('--focus-x',focusX.toFixed(2)+'px');monitor.style.setProperty('--focus-y',focusY.toFixed(2)+'px');
    monitor.style.setProperty('--monitor-light-x',`${(50+focusX*.85).toFixed(2)}%`);
    monitor.style.setProperty('--monitor-light-y',`${(34+focusY*.25).toFixed(2)}%`);
    monitor.style.setProperty('--monitor-shadow-x',(-focusX*.16).toFixed(2)+'px');
    monitor.style.setProperty('--monitor-shadow-y',(-focusY*.04).toFixed(2)+'px');
    monitor.style.setProperty('--monitor-ev',(focusX*.2).toFixed(2)+'%');
    debug.focus=[focusX,focusY];
    $('.monitor-focus-state',hud).textContent = Math.hypot(targetX-focusX,targetY-focusY)>.4 ? 'AF-C / TRACKING' : 'AF-C / LOCKED';
    if(motion.canMove()&&(Math.abs(targetX-focusX)>.06||Math.abs(targetY-focusY)>.06))monitorJob=motion.scheduleFrame(paintMonitor);
  }
  function wakeMonitor(){if(motion.canMove()&&!monitorJob){lastFrame=performance.now();monitorJob=motion.scheduleFrame(paintMonitor);}}
  function focusMonitor(){monitorBounds=monitor.getBoundingClientRect();monitor.classList.remove('is-focusing');
    requestAnimationFrame(()=>{if(motion.canMove())monitor.classList.add('is-focusing');});}
  monitor.addEventListener('pointerenter',focusMonitor);
  monitor.addEventListener('focus',focusMonitor);
  monitor.addEventListener('pointermove',event=>{
    if(!fine.matches||event.pointerType!=='mouse'||!motion.canMove())return;
    monitorBounds ||= monitor.getBoundingClientRect();
    targetX=(clamp((event.clientX-monitorBounds.left)/monitorBounds.width)-.5)*monitorBounds.width*.55;
    targetY=(clamp((event.clientY-monitorBounds.top)/monitorBounds.height)-.5)*monitorBounds.height*.58;
    wakeMonitor();
  },{passive:true});
  function resetMonitor(){monitorBounds=null;targetX=targetY=0;monitor.classList.remove('is-focusing');wakeMonitor();}
  monitor.addEventListener('pointerleave',resetMonitor);monitor.addEventListener('blur',resetMonitor);
  const origin=performance.now();
  function timecode(){
    if(document.hidden||!monitorVisible||$('#project-dialog').open||$('#photo-dialog').open)return;
    const frame=motion.canMove()?Math.floor((performance.now()-origin)%1000/1000*24):0;
    const value=$('#session-clock').textContent+':'+String(frame).padStart(2,'0');
    $('#monitor-timecode').textContent=value;debug.monitorTimecode=value;
  }
  function syncClock(){clearInterval(clockTimer);clockTimer=0;if(monitorVisible&&!document.hidden&&motion.canMove())clockTimer=setInterval(timecode,125);timecode();}
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{monitorVisible=entries[0].isIntersecting;syncClock();}).observe(monitor);
  else {monitorVisible=true;syncClock();}
  new MutationObserver(timecode).observe($('#session-clock'),{childList:true,characterData:true,subtree:true});

  // Existing finale hinge/reel timings are retained; the surrounding gold spill follows impact.
  const finaleGlow=document.createElement('span');finaleGlow.className='wrap-cut-glow';finaleGlow.setAttribute('aria-hidden','true');$('#wrap-scene').prepend(finaleGlow);
  document.addEventListener('portfolio:cut',()=>{
    if(!motion.canMove())return;
    finaleGlow.getAnimations().forEach(a=>a.cancel());
    track(finaleGlow.animate([{opacity:0,transform:'scale(.97)'},{opacity:.9,transform:'scale(1)',offset:.24},{opacity:0,transform:'scale(1.04)'}],{duration:1250,easing:'ease-out'}));
  });

  // Small production details; no preview progress bar is exposed without real multi-frame data.
  $$('.project-visual').forEach(link=>{
    const focus=document.createElement('span');focus.className='project-focus';focus.setAttribute('aria-hidden','true');link.append(focus);
    let bounds=null;
    link.addEventListener('pointerenter',()=>{bounds=link.getBoundingClientRect();});
    link.addEventListener('pointermove',event=>{
      if(!fine.matches||!motion.canMove()||event.pointerType!=='mouse')return;
      bounds ||= link.getBoundingClientRect();
      link.style.setProperty('--project-fx',`${((clamp((event.clientX-bounds.left)/bounds.width)-.5)*bounds.width*.6).toFixed(1)}px`);
      link.style.setProperty('--project-fy',`${((clamp((event.clientY-bounds.top)/bounds.height)-.5)*bounds.height*.5).toFixed(1)}px`);
    },{passive:true});
    link.addEventListener('pointerleave',()=>{bounds=null;link.style.setProperty('--project-fx','0px');link.style.setProperty('--project-fy','0px');});
  });
  document.addEventListener('click',event=>{
    const target=event.target.closest('button,a');if(!target||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    let cue=null;
    if(target.id==='blender-prop')cue='spin';else if(target.id==='ae-prop')cue='interface';
    else if(target.classList.contains('js-video'))cue=target.dataset.project==='showreel'?'monitor':'ui';
    else if(target.matches('[data-filter],#view-toggle,#motion-toggle,.menu-toggle,.button,.text-link'))cue='ui';
    if(cue)window.tarixSound?.play(cue);
  });
  function sync(){
    if(!motion.canMove()) {
      animations.forEach(a=>a.cancel());stopTransition();
      // A temporary screening/hidden tab must not consume unseen chapter reveals.
      if(!motion.motionAllowed()&&!document.hidden) {
        titles.forEach(title=>{title.dataset.kineticState='shown';title.style.setProperty('--type-fill','100%');});
        photoItems.forEach(item=>{item.dataset.photoState='shown';item.classList.add('is-shown');});
      }
      if(monitorJob)motion.cancelFrame(monitorJob);monitorJob=0;
      if(posterJob)motion.cancelFrame(posterJob);posterJob=0;
      targetX=targetY=focusX=focusY=0;monitor.style.setProperty('--focus-x','0px');monitor.style.setProperty('--focus-y','0px');
    }
    syncClock();queueScroll();
  }
  motion.onChange(sync);
  window.addEventListener('scroll',()=>{monitorBounds=null;},{passive:true});
  window.addEventListener('pagehide',()=>{
    stopTransition();clearInterval(clockTimer);animations.forEach(a=>a.cancel());
    [scrollJob,monitorJob,posterJob].forEach(job=>{if(job)motion.cancelFrame(job);});
    scrollJob=monitorJob=posterJob=0;
  });
  window.addEventListener('pageshow',()=>{measure();sync();});
  document.fonts.ready.then(measure);measure();sync();
})();
