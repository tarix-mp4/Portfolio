/* THE DIRECTOR'S CUT. V5 remains the renderer and lifecycle owner. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const motion = window.tarixV6Motion;
  if (!motion) return;
  const root = document.documentElement;
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const dataSaver = !!navigator.connection?.saveData;
  const photos = JSON.parse($('#photo-data').textContent);
  const gallery = $('#photography');
  const photoDialog = $('#photo-dialog');
  const viewerImage = $('#viewer-image');
  const debug = { photos: photos.length, viewerIndex: -1, soundEnabled: false, sounds: 0, takes: 0, queuedTakes: 0, previewProjects: 0, atmosphere: 'amber' };
  Object.defineProperty(window, '__tarixV6', { value: debug });

  // The local equipment library is ON by default, but creates no context at startup.
  const sound = window.tarixSound;
  const soundToggles = $$('.sound-toggle');
  function soundState() {
    const enabled = !!sound?.state.enabled;
    soundToggles.forEach(toggle => {
      toggle.hidden = !sound?.supported;
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.setAttribute('aria-label', enabled ? 'Mute interaction sounds' : 'Unmute interaction sounds');
      $('span', toggle).textContent = enabled ? (matchMedia('(max-width:650px)').matches ? 'Sound' : 'Sound on') : 'Muted';
    });
    debug.soundEnabled = enabled;
    debug.soundCues = sound?.state.played || {};
  }
  async function playSound(kind) {
    if (await sound?.play(kind)) debug.sounds++;
  }
  soundToggles.forEach(toggle => toggle.addEventListener('click', () => sound?.setEnabled(!sound.state.enabled)));
  sound?.onChange(soundState); soundState();
  matchMedia('(max-width:650px)').addEventListener('change', soundState);
  document.addEventListener('portfolio:flash', event => { if (event.detail?.manual) playSound('shutter'); });

  // One native dialog, one sharp uncropped photograph. Original links still
  // open source images when JS/dialog support is absent or a modifier is used.
  let requestedIndex = 0, loadToken = 0, returnFocus = null, swipe = null;
  const thumbnailButtons = photos.map((photo, i) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'viewer-thumb';
    button.setAttribute('aria-label', `View photograph ${photo.number}: ${photo.title}`);
    const image = document.createElement('img'); image.src = photo.variants[0].src; image.alt = ''; image.loading = 'lazy';
    image.width = 1367; image.height = 2048; button.append(image);
    button.addEventListener('click', () => { displayPhoto(i); playSound('focus'); });
    return button;
  });
  $('.viewer-thumbnails').append(...thumbnailButtons);
  async function displayPhoto(index) {
    requestedIndex = (index + photos.length) % photos.length;
    const photo = photos[requestedIndex], token = ++loadToken;
    const source = photo.variants[dataSaver ? 1 : 2].src;
    const preload = new Image(); preload.src = source;
    try { await preload.decode(); } catch (_) { /* All local originals are included as fallback. */ }
    if (token !== loadToken || !photoDialog.open) return;
    viewerImage.src = preload.naturalWidth ? source : photo.original;
    viewerImage.alt = photo.alt;
    $('#viewer-title').textContent = photo.title;
    $('#viewer-caption').textContent = photo.category;
    $('#viewer-number').textContent = `${photo.number} / 09`;
    photoDialog.style.setProperty('--viewer-glow', { amber: '#95714116', fire: '#b4513820', indigo: '#47489020' }[photo.palette]);
    thumbnailButtons.forEach((button, i) => {
      if (i === requestedIndex) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
    });
    debug.viewerIndex = requestedIndex;
    viewerImage.getAnimations().forEach(animation => animation.cancel());
    if (motion.motionAllowed()) viewerImage.animate([{ opacity: .4, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' });
    if (!dataSaver) {
      // Adjacent small frames warm the cache only after deliberate viewing.
      [-1, 1].forEach(delta => { const image = new Image(); image.src = photos[(requestedIndex + delta + photos.length) % photos.length].variants[1].src; });
    }
  }
  function stepPhoto(delta) { displayPhoto(requestedIndex + delta); playSound('focus'); }
  $$('.photo-open').forEach(link => {
    if (dataSaver) { const image = $('img', link); image.removeAttribute('srcset'); image.src = photos[Number(link.dataset.photo)].variants[0].src; }
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || typeof photoDialog.showModal !== 'function') return;
      event.preventDefault(); returnFocus = link;
      if (!photoDialog.open) {
        photoDialog.showModal(); root.classList.add('screening'); document.body.classList.add('dialog-open'); motion.notify();
        $('#photo-close').focus({ preventScroll: true });
      }
      displayPhoto(Number(link.dataset.photo)); playSound('focus');
    });
  });
  $('#photo-close').addEventListener('click', () => photoDialog.close());
  $('#photo-prev').addEventListener('click', () => stepPhoto(-1));
  $('#photo-next').addEventListener('click', () => stepPhoto(1));
  photoDialog.addEventListener('close', () => {
    loadToken++; swipe = null; viewerImage.getAnimations().forEach(a => a.cancel());
    if (!$('#project-dialog').open) { root.classList.remove('screening'); document.body.classList.remove('dialog-open'); }
    motion.notify();
    returnFocus?.focus({ preventScroll: true });
  });
  photoDialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); stepPhoto(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); stepPhoto(-1); }
    if (event.key === 'Home') { event.preventDefault(); displayPhoto(0); }
    if (event.key === 'End') { event.preventDefault(); displayPhoto(photos.length - 1); }
    if (event.key === 'Tab') {
      const stops = $$('button:not([disabled])', photoDialog).filter(b => b.getClientRects().length);
      if (!event.shiftKey && document.activeElement === stops.at(-1)) { event.preventDefault(); stops[0].focus(); }
      if (event.shiftKey && document.activeElement === stops[0]) { event.preventDefault(); stops.at(-1).focus(); }
    }
  });
  const viewerStage = $('#viewer-stage');
  viewerStage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !event.isPrimary) return;
    swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
    viewerStage.setPointerCapture(event.pointerId);
  });
  viewerStage.addEventListener('pointerup', event => {
    if (!swipe || swipe.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) stepPhoto(dx < 0 ? 1 : -1);
    swipe = null;
  });
  viewerStage.addEventListener('pointercancel', () => { swipe = null; });

  // Exhibition/contact-sheet are two presentations of the same nine anchors.
  $('.photo-view-controls').hidden = false;
  $$('[data-gallery-view]').forEach(button => button.addEventListener('click', () => {
    const compact = button.dataset.galleryView === 'contact';
    gallery.classList.toggle('is-contact-sheet', compact);
    $$('[data-gallery-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $$('.photo-item').forEach(item => {
      item.classList.add('is-shown'); $('.photo-open', item).getAnimations().forEach(a => a.cancel());
      const image = $('img', item);
      if (!dataSaver) image.sizes = compact ? '(max-width:650px) 30vw, 30vw' : '(max-width:650px) calc(100vw - 46px), 60vw';
    });
    $('#gallery-status').textContent = `${compact ? 'Contact sheet' : 'Exhibition'} view, nine photographs.`;
    motion.layout(); playSound('ui');
  }));

  // Cinematic chapter and photograph choreography is coordinated by cinematic.js.
  const revealAnimations = new Set();
  const photoItems = $$('.photo-item');

  // Cursor response is on the frame, never a color/filter change to the image.
  $$('.photo-open').forEach(link => {
    const frame = $('.photo-tilt', link); let bounds = null;
    link.addEventListener('pointerenter', () => { bounds = link.getBoundingClientRect(); });
    link.addEventListener('pointermove', event => {
      if (!motion.canMove() || !fine.matches || event.pointerType !== 'mouse') return;
      bounds ||= link.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
      frame.style.setProperty('--photo-rx', `${((.5-y)*2.8).toFixed(2)}deg`);
      frame.style.setProperty('--photo-ry', `${((x-.5)*3.2).toFixed(2)}deg`);
      frame.style.setProperty('--photo-lift', '-3px');
      frame.style.setProperty('--photo-x', `${(x*100).toFixed(1)}%`); frame.style.setProperty('--photo-y', `${(y*100).toFixed(1)}%`);
    }, { passive: true });
    const reset = () => { bounds = null; frame.style.setProperty('--photo-rx','0deg'); frame.style.setProperty('--photo-ry','0deg'); frame.style.setProperty('--photo-lift','0px'); };
    link.addEventListener('pointerleave', reset); motion.onChange(() => { if (!motion.canMove()) reset(); });
    window.addEventListener('scroll', () => { bounds = null; }, { passive: true });
  });

  // A real local hinge motion on the ORIGINAL clapper bar, plus an independent
  // small reel roll. Repeated clicks queue complete takes instead of restarting.
  const clapper=$('#wrap-clapper'),bar=$('.clapper-bar',clapper),bonus=$('.reel-bonus-spin');
  const [sceneNumber,takeNumber]=$$('.clapper-face b',clapper),cutLabel=$('#cut-label');
  let scene=1,take=1,queue=[],activeDecision=null,clapActive=false,clapTimer=0,labelTimer=0,clapToken=0,bonusAngle=0;
  let hingeAnimation=null,reelAnimation=null;
  const numberAnimations=new Set();
  const formatNumber=value=>String(value).padStart(2,'0');
  function syncClapper(){
    debug.scene=scene;debug.take=take;debug.queuedTakes=queue.length;
    clapper.disabled=queue.length>=4;
    clapper.setAttribute('aria-busy',String(clapActive));
    clapper.setAttribute('aria-label',`Snap the clapperboard. Scene ${formatNumber(scene)}, take ${formatNumber(take)}.${clapper.disabled?' Queued cuts are playing; ready shortly.':''}`);
  }
  function displayNumber(element,value,animate){
    const text=formatNumber(value);
    if(element.textContent===text)return;
    element.textContent=text;
    // Keep three and longer values inside the original slate, without clipping.
    element.style.fontSize=text.length>4?`calc(var(--object-size) * ${.07*4/text.length})`:'';
    if(!animate)return;
    const color=getComputedStyle(element).color;
    const animation=element.animate([
      {transform:'translateY(.42em)',opacity:0,color:'#a57425'},
      {transform:'translateY(-.035em)',opacity:1,color:'#a57425',offset:.6},
      {transform:'translateY(0)',opacity:1,color}
    ],{duration:260,easing:'cubic-bezier(.22,1,.36,1)'});
    numberAnimations.add(animation);
    animation.finished.catch(()=>{}).finally(()=>numberAnimations.delete(animation));
  }
  function labelTake(advanceScene,animate=motion.canMove(),announce=true){
    if(advanceScene){scene++;take=1;}else{take++;}
    displayNumber(sceneNumber,scene,animate);displayNumber(takeNumber,take,animate);
    debug.takes++;syncClapper();
    cutLabel.textContent=`CUT / SCENE ${formatNumber(scene)} / TAKE ${formatNumber(take)}`;
    if(announce){
      document.dispatchEvent(new CustomEvent('portfolio:cut',{detail:{scene,take}}));
      cutLabel.classList.add('is-visible');clearTimeout(labelTimer);
      labelTimer=setTimeout(()=>cutLabel.classList.remove('is-visible'),2200);
    }
  }
  syncClapper();
  async function runTake(){
    if(clapActive || !queue.length)return;
    activeDecision=queue.shift();clapActive=true;syncClapper();const token=++clapToken;
    if(!motion.canMove()) {labelTake(activeDecision,false);activeDecision=null;playSound('clap');clapActive=false;syncClapper();if(queue.length)runTake();return;}
    const rest=bar.style.transform || 'translateZ(9px) rotateZ(-8deg)';
    hingeAnimation=bar.animate([{transform:rest,offset:0,easing:'ease-out'},{transform:'translateZ(9px) rotateZ(-30deg)',offset:.18,easing:'cubic-bezier(.6,0,1,.5)'},{transform:'translateZ(9px) rotateZ(0deg)',offset:.38,easing:'ease-out'},{transform:'translateZ(9px) rotateZ(-3deg)',offset:.46},{transform:'translateZ(9px) rotateZ(0deg)',offset:.55,easing:'ease-out'},{transform:rest,offset:1}],{duration:620,easing:'linear'});
    clapTimer=setTimeout(()=>{
      if(token!==clapToken)return;
      labelTake(activeDecision);activeDecision=null;playSound('clap');setTimeout(()=>{if(token===clapToken)playSound('reel');},120);clapper.classList.add('is-cutting');
      const next=bonusAngle+48;
      reelAnimation=bonus.animate([{transform:`rotateZ(${bonusAngle}deg)`},{transform:`rotateZ(${next}deg)`}],{duration:620,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
      const spin = reelAnimation;
      spin.finished.then(()=>{if(token===clapToken){bonusAngle=next;bonus.style.transform=`rotateZ(${bonusAngle}deg)`;spin.cancel();}}).catch(()=>{});
    },235);
    await hingeAnimation.finished.catch(()=>{});
    if(token!==clapToken)return;
    await reelAnimation?.finished.catch(()=>{});
    await new Promise(resolve=>setTimeout(resolve,90));
    if(token!==clapToken)return;
    clapper.classList.remove('is-cutting');clapActive=false;hingeAnimation=null;syncClapper();if(queue.length)runTake();
  }
  clapper.addEventListener('click',()=>{
    if(clapper.disabled)return;
    // Exactly one independent roll per accepted activation, including queued cuts.
    queue.push(Math.random()<.25);syncClapper();runTake();
  });
  function cancelTake(){
    clapToken++;clearTimeout(clapTimer);hingeAnimation?.cancel();reelAnimation?.cancel();
    numberAnimations.forEach(animation=>animation.cancel());numberAnimations.clear();
    clapper.classList.remove('is-cutting');clapActive=false;
    // Scrolling away or changing motion settings must not discard accepted clicks.
    if(activeDecision!==null){labelTake(activeDecision,false,false);activeDecision=null;}
    const pending=queue;queue=[];pending.forEach(decision=>labelTake(decision,false,false));syncClapper();
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) cancelTake();
  }).observe($('#wrap-scene'));

  // Authentic preview support: activated only by verified local multi-frame
  // data for the exact existing video ID. With no footage/strips supplied, V5's
  // real still and click-to-play behavior remain intact; there is no fake scrub.
  const previews=JSON.parse($('#preview-data').textContent);
  const projects=JSON.parse($('#project-data').textContent);
  Object.entries(previews).forEach(([key,preview])=>{
    if(preview.videoId!==projects[key]?.id || !Array.isArray(preview.frames) || preview.frames.length<2 || dataSaver)return;
    const card=$(`.project-card[data-project="${key}"]`) || $(`.project-card:has([data-project="${key}"])`);
    if(!card)return;
    const link=$('.project-visual',card),image=$('.project-thumbnail',link);if(!image)return;
    const original=image.getAttribute('src');let rect=null,last=-1;
    const control=document.createElement('div');control.className='preview-scrub';
    const label=document.createElement('label');label.textContent='SCRUB';const input=document.createElement('input');input.type='range';input.min='0';input.max=String(preview.frames.length-1);input.value='0';input.setAttribute('aria-label',`Preview frames from ${projects[key].title}`);label.htmlFor=`scrub-${key}`;input.id=label.htmlFor;control.append(label,input);link.append(control);
    function paint(index){if(!motion.motionAllowed())return;index=Math.max(0,Math.min(preview.frames.length-1,index));if(index!==last){last=index;image.src=preview.frames[index].src;input.value=String(index);}}
    link.addEventListener('pointerenter',()=>{rect=link.getBoundingClientRect();});
    link.addEventListener('pointermove',event=>{if(!fine.matches||event.pointerType!=='mouse')return;rect ||= link.getBoundingClientRect();paint(Math.floor((event.clientX-rect.left)/rect.width*preview.frames.length));},{passive:true});
    link.addEventListener('pointerleave',()=>{image.src=original;last=-1;rect=null;});
    input.addEventListener('input',()=>paint(Number(input.value)));control.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();});
    control.addEventListener('pointerdown',event=>event.stopPropagation());
    motion.onChange(()=>{if(!motion.motionAllowed()){image.src=original;last=-1;}});debug.previewProjects++;
  });
  function syncMotion(){
    root.classList.toggle('v6-motion',motion.motionAllowed());
    if(!motion.motionAllowed()) revealAnimations.forEach(a=>a.cancel());
    if(!motion.canMove())cancelTake();
  }
  motion.onChange(syncMotion);syncMotion();
})();
