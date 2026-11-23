/* Portfolio V8 / Concept C. Local art-direction study; no third-party runtime. */
(() => {
  'use strict';
  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => [...r.querySelectorAll(s)];
  const el = (tag,text,cls) => {const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const clamp = (n,a=0,b=1) => Math.min(b,Math.max(a,n));
  const films = JSON.parse($('#films-c').textContent), photos = JSON.parse($('#photos-c').textContent);
  const root = document.documentElement, body = document.body;
  const systemReduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointerFine = matchMedia('(hover:hover) and (pointer:fine)');
  let manuallyQuiet=false;
  const quiet=()=>systemReduced.matches || manuallyQuiet;
  const motion= $('[data-motion]');
  const chapters=$$('[data-chapter]');
  const nav=$$('.nav-inner nav a');
  const field=$('[data-orbit-area]'), rig=$('[data-stage-rig]');
  const orbit=$('#orbit'), detail=$('#detail'), renderStatus=$('[data-render-status]');
  const sceneCanvas=$('[data-scene]'), scenePoster=$('.gold-still');
  const viewer=$('#viewer'), geraltDialog=$('.geralt-dialog');
  const params=new URLSearchParams(location.search);
  const profiling=params.has('profile');
  if (profiling && 'PerformanceObserver' in window) {
    // Review-only counters: collecting them does not schedule animation frames.
    const transferCount=()=>performance.getEntriesByType('resource').filter(r=>/\.webm(?:$|\?)/.test(r.name)).length;
    root.dataset.mediaTransfers=String(transferCount());
    if(PerformanceObserver.supportedEntryTypes?.includes('resource')){
      new PerformanceObserver(()=>{root.dataset.mediaTransfers=String(transferCount());}).observe({type:'resource',buffered:true});
    }
    if(PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame')){
      const slow=[];
      new PerformanceObserver(list=>{
        for(const f of list.getEntries()){
          slow.push({duration:Math.round(f.duration),blocking:Math.round(f.blockingDuration)});
          if(slow.length>16)slow.shift();
        }
        root.dataset.longFrames=JSON.stringify(slow);
      }).observe({type:'long-animation-frame',buffered:true});
    }
  }

  // One frame coordinator for scroll, stage easing, and active-frame painting.
  let job=0, wakeCount=0, stageVisible=false, scene=null, rendererPromise, rendererFailed=false;
  let storedWidth=1,storedHeight=1,wantedAngle=0,angle=0,wantedX=0,wantedY=0,lightX=0,lightY=0,gel=0;
  let travel=0, dirty=true, scrollDirty=true, measureDirty=true, bounds=[], pageHeight=1, currentChapter=null;
  let lastGlFrame=0, lastSceneAt=0, lateRun=0, sceneCount=0, dynamicLevel=null;
  let previewPaint=null;
  const cost=[];
  function schedule() {
    if (!job && !document.hidden) job=requestAnimationFrame(tick);
  }
  function readLayout() {
    measureDirty=false;
    const y=scrollY;
    bounds=chapters.map(section=>{const b=section.getBoundingClientRect();return {section,top:b.top+y,height:b.height};});
    pageHeight=Math.max(1,root.scrollHeight-innerHeight);
    scrollDirty=true;
  }
  function applyScroll() {
    scrollDirty=false;
    const y=scrollY,h=innerHeight, aim=y+h*.44;
    const here=bounds.reduce((chosen,slot)=>slot.top<=aim ? slot : chosen,bounds[0]);
    const active=here?.section.dataset.chapter;
    if (active!==currentChapter) {
      currentChapter=active;
      body.dataset.chapter=active;
      nav.forEach(a=>a.toggleAttribute('aria-current',a.hash.slice(1)===active));
      nav.find(a=>a.hash.slice(1)===active)?.setAttribute('aria-current','location');
    }
    $('.chapter-progress span').style.transform=`scaleX(${clamp(y/pageHeight).toFixed(4)})`;
    if (!quiet() && here) {
      const n=clamp((aim-here.top)/Math.max(1,here.height));
      here.section.style.setProperty('--halo-shift',((n-.5)*54).toFixed(1)+'px');
    }
    if (stageVisible) {
      travel=quiet()?0:clamp(y/Math.max(1,bounds[0]?.height||h));
      const stage=chapters[0];
      stage.style.setProperty('--title-shift',(-travel*24).toFixed(1)+'px');
      stage.style.setProperty('--light-drift',(travel*34).toFixed(1)+'px');
      stage.style.setProperty('--prop-shift',(-travel*26).toFixed(1)+'px');
      dirty=true;
    }
  }
  function rendererReady() {
    if (rendererPromise || rendererFailed) return;
    renderStatus.textContent='Opening the lighting rig';
    rendererPromise=new Promise((resolve,reject)=>{
      const s=el('script');
      s.src='ribbon.js';s.onload=resolve;s.onerror=reject;document.head.append(s);
    }).then(()=>{
      scene=window.installUniverseRibbon(sceneCanvas,switchToSoftware,params.get('renderer')==='software');
      if (!scene) throw Error('No renderer');
      rig.dataset.renderer=scene.type;
      field.dataset.live='true';
      renderStatus.textContent=scene.type==='webgl'?'Live WebGL · drag to orbit':'Live mesh · software';
      field.setAttribute('aria-describedby','orbit-hint');
      dirty=true;schedule();
    }).catch(()=>{
      rendererFailed=true;
      renderStatus.textContent='Still view · renderer unavailable';
      rig.dataset.renderer='still';orbit.disabled=true;detail.disabled=true;
    });
  }
  function switchToSoftware() {
    const old=scene;
    old?.dispose();sceneCanvas.hidden=true;scenePoster.hidden=false;
    scene=window.installUniverseRibbon(sceneCanvas,()=>{},true);
    rig.dataset.renderer=scene?.type||'still';
    renderStatus.textContent=scene?'Live mesh · software':'Still view · context lost';
    dynamicLevel=null;dirty=true;schedule();
  }
  function synchronizeMotion() {
    motion.setAttribute('aria-pressed',String(quiet()));
    motion.disabled=systemReduced.matches;
    motion.setAttribute('aria-label',systemReduced.matches?'Using system reduced motion':quiet()?'Resume optional motion':'Pause motion');
    $('span',motion).textContent=quiet()?'▶':'Ⅱ';
    root.classList.toggle('motion-off',quiet());
    // User-selected orbit, lighting and scrubbing remain usable at reduced motion.
    if (quiet()) {travel=0;wantedX=wantedY=0;chapters.forEach(c=>c.style.setProperty('--halo-shift','0px'));}
    dirty=true;scrollDirty=true;schedule();
    refreshPeek();
  }
  motion.addEventListener('click',()=>{manuallyQuiet=!manuallyQuiet;synchronizeMotion();if(quiet())stopTour();});
  systemReduced.addEventListener?.('change',synchronizeMotion);
  let dragging=false, startX=0,startAngle=0, fieldRect=null;
  field.addEventListener('pointerenter',()=>{fieldRect=field.getBoundingClientRect();});
  field.addEventListener('pointerdown',e=>{
    if (!stageVisible || e.pointerType!=='mouse'||e.button!==0||quiet()) return;
    dragging=true;startX=e.clientX;startAngle=wantedAngle;field.classList.add('dragging');
    field.setPointerCapture(e.pointerId);
  });
  field.addEventListener('pointermove',e=>{
    if (quiet() || !scene || !pointerFine.matches || e.pointerType!=='mouse' || !stageVisible) return;
    if (dragging) {
      wantedAngle=clamp(startAngle+(e.clientX-startX)*.006,-95*Math.PI/180,125*Math.PI/180);
      orbit.value=String(Math.round(wantedAngle*180/Math.PI));
    } else {
      fieldRect ||= field.getBoundingClientRect();
      wantedX=clamp((e.clientX-fieldRect.left)/fieldRect.width)*2-1;
      wantedY=clamp((e.clientY-fieldRect.top)/fieldRect.height)*2-1;
    }
    dirty=true;schedule();
  },{passive:true});
  function releaseDrag(){dragging=false;field.classList.remove('dragging');}
  ['pointerup','pointercancel','lostpointercapture'].forEach(event=>field.addEventListener(event,releaseDrag));
  field.addEventListener('pointerleave',()=>{fieldRect=null;wantedX=wantedY=0;dirty=true;schedule();});
  function setOrbit(deg){orbit.value=String(deg);wantedAngle=Number(orbit.value)*Math.PI/180;dirty=true;rendererReady();schedule();}
  orbit.addEventListener('input',()=>setOrbit(orbit.value));
  function setGel(index){
    gel=index;rig.dataset.gel=String(index);
    $$('[data-light]').forEach(btn=>btn.setAttribute('aria-pressed',String(+btn.dataset.light===index)));
    rendererReady();dirty=true;schedule();
  }
  $$('[data-light]').forEach(btn=>btn.addEventListener('click',()=>setGel(+btn.dataset.light)));
  detail.addEventListener('change',()=>{dynamicLevel=null;lateRun=0;dirty=true;schedule();});
  function resizeField(width,height){
    storedWidth=width;storedHeight=height;fieldRect=null;measureDirty=true;dirty=true;schedule();
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(([n])=>resizeField(n.contentRect.width,n.contentRect.height)).observe(field);
    const layout=new ResizeObserver(()=>{measureDirty=true;schedule();});
    chapters.forEach(c=>layout.observe(c));
  } else {
    const resize=()=>resizeField(field.clientWidth,field.clientHeight);
    addEventListener('resize',resize,{passive:true});resize();
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e])=>{
      stageVisible=e.isIntersecting;
      if (stageVisible){rendererReady();dirty=true;scrollDirty=true;schedule();}
      else {wantedX=wantedY=0;lastSceneAt=lastGlFrame=0;}
    },{rootMargin:'0px',threshold:.02}).observe(field);
    const cuts=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('arrived');cuts.unobserve(e.target);}});
    },{threshold:.2});
    $$('.kinetic').forEach(c=>cuts.observe(c));
  } else {stageVisible=true;rendererReady();}
  addEventListener('resize',()=>{measureDirty=true;schedule();},{passive:true});
  addEventListener('scroll',()=>{scrollDirty=true;schedule();},{passive:true});
  document.fonts?.ready.then(()=>{measureDirty=true;schedule();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){if(job)cancelAnimationFrame(job);job=0;lastGlFrame=lastSceneAt=0;stopTour();}
    else {dirty=true;measureDirty=true;schedule();}
    refreshPeek();
  });
  function tick(now) {
    job=0;wakeCount++;
    if (measureDirty) readLayout();
    if (scrollDirty) applyScroll();
    if (previewPaint){const p=previewPaint;previewPaint=null;p();}
    if(!scene||!stageVisible||viewer.open||geraltDialog.open||document.hidden||storedWidth<2||storedHeight<2)return;
    const remaining=Math.abs(wantedAngle-angle)+Math.abs(wantedX-lightX)+Math.abs(wantedY-lightY);
    if(!dirty && remaining<.004) return;
    const slower=scene.type==='software';
    if (slower && !quiet() && now-lastSceneAt<31){schedule();return;}
    const moved=lastSceneAt && now-lastSceneAt;
    const delta=clamp(moved||17,14,48);
    const mix=quiet()||remaining<.01?1:1-Math.exp(-delta/87);
    angle+=(wantedAngle-angle)*mix;lightX+=(wantedX-lightX)*mix;lightY+=(wantedY-lightY)*mix;
    const auto=(innerWidth<850 || (navigator.deviceMemory||8)<5 || slower) ? 'balanced':'full';
    const quality=detail.value==='auto'?dynamicLevel||auto:detail.value;
    const start=performance.now();
    const meta=scene.draw({width:storedWidth,height:storedHeight,quality,gel,
      yaw:-.28+angle+lightX*.2+travel*.58,pitch:.73-lightY*.16+travel*.32,lightX,lightY});
    const cpu=performance.now()-start;
    if (meta) {
      if (scene.canvas.hidden){scene.canvas.hidden=false;scenePoster.hidden=true;}
      sceneCount++;
      rig.dataset.draws=String(sceneCount);
      rig.dataset.yaw=(angle+lightX*.2+travel*.58).toFixed(3);
      rig.dataset.buffer=`${meta.width}×${meta.height}`;
      rig.dataset.triangles=String(meta.triangles);
      rig.dataset.quality=quality;
      if (profiling){
        cost.push(Math.round(cpu*100)/100);if(cost.length>300)cost.shift();
        rig.dataset.drawCosts=JSON.stringify(cost);
        rig.dataset.requests=String(wakeCount);
      }
    }
    if (!slower && detail.value==='auto' && quality==='full' && remaining>.01) {
      const gap=now-lastGlFrame;
      if (lastGlFrame && gap>31 && gap<120) lateRun++; else lateRun=Math.max(0,lateRun-1);
      if(lateRun>=12){dynamicLevel='balanced';lateRun=0;renderStatus.textContent='Live WebGL · adaptive detail';}
    }
    lastGlFrame=now;lastSceneAt=now;dirty=false;
    if (!quiet() && remaining>.006) schedule();
  }
  schedule();

  // Premiere-inspired playhead. The original full video is never loaded to scrub.
  const choices=$$('[data-choose]'), picture=$('[data-picture]'), sleeve=$('.picture-sleeve',picture);
  const poster=$('img',sleeve), layer=$('.sprite',sleeve);
  const track=$('.timeline-track'), strip=$('.timeline-film'), tiles=$$('span',strip), slider=$('#scrub');
  const timecode=$('[data-timecode]'), frameNote=$('[data-frame-note]');
  let active='a-quiet-trail',frameIndex=0,frameToken=0,decoded=null,filmBounds=null;
  let useTouch=true, scrubTarget=0;
  const time=(s)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${(s%60).toFixed(2).padStart(5,'0')}`;
  function resetFrame(){
    frameToken++;decoded=null;frameIndex=0;previewPaint=null;
    layer.hidden=true;layer.style.backgroundImage='';layer.removeAttribute('data-frame');
    strip.toggleAttribute('data-empty',active!=='a-quiet-trail');
    strip.removeAttribute('data-portrait');
    tiles.forEach(t=>t.removeAttribute('style'));
    strip.style.backgroundImage='';
    slider.value='0';slider.setAttribute('aria-valuetext','Starting still');
    timecode.textContent='00:00.00';track.style.setProperty('--frame','0%');
  }
  function frame(n) {
    const m=films[active].preview;
    if(!m)return;
    frameIndex=clamp(Math.round(n),0,m.frameCount-1);slider.value=String(frameIndex);
    const stamp=time(m.times[frameIndex]);
    timecode.textContent=stamp;
    slider.setAttribute('aria-valuetext',`Frame ${frameIndex+1} of ${m.frameCount}, ${stamp}`);
    track.style.setProperty('--frame',(100*frameIndex/(m.frameCount-1)).toFixed(2)+'%');
    function pos(i){return `${(i%m.columns)*100/(m.columns-1)}% ${Math.floor(i/m.columns)*100/(m.rows-1)}%`;}
    function draw(){
      layer.style.backgroundPosition=pos(frameIndex);
      layer.dataset.frame=String(frameIndex);layer.hidden=false;
    }
    if (decoded==='ready'){previewPaint=draw;schedule();return;}
    if (decoded) return;
    const marker=frameToken,image=new Image();
    image.src=m.sheet;decoded=image.decode().then(()=>{
      if(marker!==frameToken) return;
      if (image.naturalWidth!==m.columns*m.frameWidth || image.naturalHeight!==m.rows*m.frameHeight) throw Error('Frame sheet dimensions');
      const imageUrl=`url("${m.sheet}")`, size=`${100*m.columns}% ${100*m.rows}%`;
      layer.style.backgroundImage=imageUrl;layer.style.backgroundSize=size;
      if (active!=='a-quiet-trail') {
        strip.toggleAttribute('data-portrait',films[active].ratio==='9:16');
        tiles.forEach((t,j)=>{
          t.style.backgroundImage=imageUrl;t.style.backgroundSize=size;t.style.backgroundPosition=pos(Math.round((j+.5)*(m.frameCount-1)/tiles.length));
        });
      }
      decoded='ready';previewPaint=draw;schedule();
    }).catch(()=>{if(marker===frameToken){decoded='failed';frameNote.textContent='Frame sheet unavailable; the original poster is shown.';}});
  }
  function choose(key){
    const film=films[key];if(!film)return;
    active=key;resetFrame();
    choices.forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.choose===key)));
    picture.toggleAttribute('data-vertical',film.ratio==='9:16');
    poster.src=film.poster;poster.alt='Still from '+film.title;
    $('[data-monitor-aspect]').textContent=film.ratio+' / '+film.category;
    $('[data-film-role]').textContent=film.role+' / '+film.category;
    $('[data-film-title]').textContent=film.title;$('[data-film-desc]').textContent=film.description;
    const button=$('.edit-meta [data-screen]');
    button.dataset.screen=key;
    $('[data-screen-text]',button).textContent=film.media?'Play excerpt':film.youtube?'Screening notes':'Scene notes';
    $('[data-timeline]').hidden=!film.preview;
    $('[data-no-timeline]').hidden=!!film.preview;
    if(film.preview){
      slider.max=String(film.preview.frameCount-1);
      frameNote.textContent=`${film.preview.frameCount} authentic frames · preview scrub`;
    }
    filmBounds=null;measureDirty=true;schedule();
  }
  choices.forEach(c=>c.addEventListener('click',()=>choose(c.dataset.choose)));
  slider.addEventListener('input',()=>frame(slider.value));
  picture.addEventListener('pointerenter',e=>{
    useTouch=e.pointerType!=='mouse';
    filmBounds=picture.getBoundingClientRect();
  },{passive:true});
  picture.addEventListener('pointermove',e=>{
    if(!pointerFine.matches||useTouch||!films[active].preview||quiet())return;
    filmBounds ||= picture.getBoundingClientRect();
    scrubTarget=(e.clientX-filmBounds.left)/filmBounds.width*(films[active].preview.frameCount-1);
    previewPaint=()=>frame(scrubTarget);schedule();
  },{passive:true});
  addEventListener('scroll',()=>{filmBounds=null;fieldRect=null;},{passive:true});

  let exposure=3, exposureToken=0;
  const print = $('[data-print]'), exhibition=$('.exhibition'), stills=$('#stills');
  function swapExposure(index){
    const p=photos[index];if(!p)return;
    exposure=index;
    const gate=++exposureToken;
    $$('[data-exposure]').forEach((c,i)=>c.setAttribute('aria-pressed',String(i===index)));
    stills.dataset.palette=p.palette;
    $('[data-print-number]').textContent='EXPOSURE '+p.number+' / 09';
    $('[data-print-title]').textContent=p.title;
    $('[data-print-category]').textContent=p.category;
    $('[data-print-caption]').textContent=p.alt;
    $('[data-open-photo]').setAttribute('aria-label','Enlarge '+p.title);
    const candidate=new Image();candidate.src=p.image;
    candidate.decode().catch(()=>{}).then(()=>{
      if(gate!==exposureToken)return;
      print.src=p.image;print.alt=p.alt;
      print.getAnimations?.().forEach(a=>a.cancel());
      if(!quiet())print.animate?.([{opacity:.15,transform:'translateY(10px) scale(1.045)'},{opacity:1,transform:'none'}],{duration:460,easing:'cubic-bezier(.2,.7,.25,1)'});
    });
  }
  $$('[data-exposure]').forEach(c=>c.addEventListener('click',()=>swapExposure(+c.dataset.exposure)));
  let returnFocus=null,viewPhotoIndex=-1;
  const viewBody=$('.viewer-content',viewer);
  function dialogTitle(title){const h=el('h2',title);h.id='view-title';viewBody.append(h);}
  function mountViewer(trigger){
    if(viewer.open)return;
    returnFocus=trigger;viewer.showModal();refreshPeek();$('[data-close]',viewer).focus();
  }
  $('[data-close]',viewer).addEventListener('click',()=>viewer.close());
  viewer.addEventListener('close',()=>{
    const node=$('video',viewer);
    if(node){node.pause();node.removeAttribute('src');node.load();}
    viewBody.replaceChildren();
    viewPhotoIndex=-1;returnFocus?.focus({preventScroll:true});returnFocus=null;dirty=true;schedule();refreshPeek();
  });
  function showFilm(key,trigger){
    const film=films[key];if(!film || !viewer.showModal)return false;
    stopTour();
    viewPhotoIndex=-1;viewBody.replaceChildren();
    $('[data-dialog-label]').textContent=film.ratio+' / '+film.category;
    let playback=null;
    if(film.media) {
      playback=el('video');playback.controls=true;playback.playsInline=true;playback.preload='none';
      playback.poster=film.poster;playback.src=film.media;
      playback.toggleAttribute('data-portrait',film.ratio==='9:16');
      playback.setAttribute('aria-label',film.title);
      viewBody.append(playback,el('p',film.mediaNote,'cover-note mono'));
    } else {
      const img=el('img');img.src=film.poster;img.alt='Still from '+film.title;viewBody.append(img);
    }
    dialogTitle(film.title);
    viewBody.append(el('p',film.role,'mono'),el('p',film.description));
    if(film.youtube){
      const a=el('a',film.media?'Original YouTube link':'Open YouTube original');a.href=film.youtube;a.target='_blank';a.rel='noopener';viewBody.append(a);
    } else if(!film.media)viewBody.append(el('p','This prototype shows authentic frames. Native delivery for this title is a separate release step.','cover-note'));
    mountViewer(trigger);playback?.play().catch(()=>{});
    return true;
  }
  function showPhoto(index,trigger,keep=''){
    if(!viewer.showModal)return;
    viewPhotoIndex=(index+photos.length)%photos.length;
    const data=photos[viewPhotoIndex];viewBody.replaceChildren();
    $('[data-dialog-label]').textContent='Exposure '+data.number+' / 09';
    const image=el('img');image.src=data.detail;image.alt=data.alt;image.width=1367;image.height=2048;
    viewBody.append(image);dialogTitle(data.title);viewBody.append(el('p',data.alt));
    const controls=el('div','','photo-dialog-nav');
    for (const [d,label] of [[-1,'Previous'],[1,'Next']]){
      const button=el('button',label,'outline-button');button.type='button';button.dataset.photoStep=String(d);
      button.addEventListener('click',()=>showPhoto(viewPhotoIndex+d,null,String(d)));
      controls.append(button);
    }
    viewBody.append(controls);mountViewer(trigger);
    if(keep)$('[data-photo-step="'+keep+'"]',controls)?.focus({preventScroll:true});
  }
  $('[data-open-photo]').addEventListener('click',e=>showPhoto(exposure,e.currentTarget));
  viewer.addEventListener('keydown',e=>{
    if (viewPhotoIndex<0||!['ArrowLeft','ArrowRight'].includes(e.key))return;
    e.preventDefault();showPhoto(viewPhotoIndex+(e.key==='ArrowLeft'?-1:1),null,document.activeElement?.dataset.photoStep);
  });
  document.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.altKey||e.shiftKey)return;
    const trigger=e.target.closest('[data-screen]');
    if (trigger && showFilm(trigger.dataset.screen,trigger)) e.preventDefault();
  });

  // The original cues are fetched only when the listener opts in and uses them.
  const sound=$('[data-sound]');
  let soundOn=false;
  const cues={interface:'../../assets/sounds/interface.wav',clap:'../../assets/sounds/clap.wav',reel:'../../assets/sounds/reel.wav',focus:'../../assets/sounds/focus.wav'};
  const audio={};
  function tone(name) {
    if (!soundOn || document.hidden) return;
    const cue=audio[name]??=new Audio(cues[name]);
    cue.volume=name==='clap'?.5:.36;
    try {cue.currentTime=0;void cue.play().catch(()=>{});} catch (_) {}
  }
  function soundLabel(){
    sound.setAttribute('aria-pressed',String(soundOn));sound.setAttribute('aria-label',soundOn?'Turn interaction sounds off':'Turn interaction sounds on');
    $('span',sound).textContent=soundOn?'Sound on':'Sound off';
  }
  sound.addEventListener('click',()=>{soundOn=!soundOn;soundLabel();if(soundOn)tone('interface');else Object.values(audio).forEach(a=>a.pause());});
  soundLabel();
  let take=1, sceneNumber=1, clapping=false;
  const clapper=$('[data-clapper]'), digits=n=>String(n).padStart(2,'0');
  function clap({demo=false}={}){
    if(clapping)return;
    clapping=true;clapper.setAttribute('aria-busy','true');
    const arm=$('.clapper-hinge'), reel=$('.reel-object'), light=$('.wrap-light');
    const impact=()=>{
      if (Math.random()<.25){sceneNumber++;take=1;}else take++;
      $('[data-scene-count]').textContent=digits(sceneNumber);$('[data-take-count]').textContent=digits(take);
      const readout='Scene '+digits(sceneNumber)+' · Take '+digits(take);
      $('[data-clap-status]').textContent=readout;clapper.setAttribute('aria-label','Clap the slate, '+readout);
      if(!demo)tone('clap');
      if(!quiet()){
        light.animate?.([{opacity:1},{opacity:.48},{opacity:1}],{duration:440,easing:'ease-out'});
        reel.animate?.([{transform:'rotate(19deg)'},{transform:'rotate(78deg)',offset:.37},{transform:'rotate(105deg)'}],{duration:630,easing:'cubic-bezier(.15,.58,.3,1)'});
        $('.slate-readout').animate?.([{opacity:.48,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:260});
      }
    };
    const unlock=()=>{clapping=false;clapper.removeAttribute('aria-busy');};
    if(quiet()){impact();unlock();return;}
    arm.animate?.([{transform:'rotate(-17deg)'},{transform:'rotate(-28deg)',offset:.23},{transform:'rotate(0deg)',offset:.57},{transform:'rotate(-17deg)'}],{duration:450,easing:'ease-in-out'});
    setTimeout(impact,245);setTimeout(unlock,670);
  }
  clapper.addEventListener('click',()=>clap());

  // The print frame actually occludes the lower part of the same original SVG.
  const cat=$('[data-geralt]'), companion=$('[data-companion]');
  let found=false, printInView=false, peekTimer=0, peekJob=null;
  function clearPeek(){clearTimeout(peekTimer);peekTimer=0;peekJob?.cancel();peekJob=null;}
  function refreshPeek(){
    clearPeek();
    if(found || !printInView || document.hidden || viewer.open || geraltDialog.open){cat.hidden=true;return;}
    if(quiet()||document.activeElement===cat){cat.hidden=false;return;}
    cat.hidden=true;
    function reveal(){
      if(found||!printInView||document.hidden||viewer.open)return;
      cat.hidden=false;
      peekJob=cat.animate?.([{transform:'translateY(6%) rotate(-8deg)'},{transform:'translateY(-78%) rotate(-8deg)'}],{duration:420,easing:'cubic-bezier(.2,.65,.23,1)',fill:'forwards'});
      peekTimer=setTimeout(()=>{
        if(document.activeElement===cat)return;
        peekJob?.cancel();peekJob=cat.animate?.([{transform:'translateY(-78%) rotate(-8deg)'},{transform:'translateY(6%) rotate(-8deg)'}],{duration:420,fill:'forwards'});
        peekTimer=setTimeout(()=>{cat.hidden=true;peekJob?.cancel();peekJob=null;peekTimer=setTimeout(reveal,2800);},425);
      },1690);
    }
    peekTimer=setTimeout(reveal,680);
  }
  if('IntersectionObserver' in window){
    new IntersectionObserver(([e])=>{printInView=e.isIntersecting;refreshPeek();},{threshold:.26}).observe($('.print-wall'));
  }else{printInView=true;refreshPeek();}
  cat.addEventListener('focus',()=>{clearPeek();cat.hidden=false;});
  cat.addEventListener('blur',refreshPeek);
  function discover(trigger){
    if(geraltDialog.open||!geraltDialog.showModal)return;
    const from=trigger.getBoundingClientRect();
    found=true;clearPeek();cat.hidden=true;companion.hidden=true;stopTour();
    geraltDialog.showModal();
    const art=$('.found-room img',geraltDialog), b=art.getBoundingClientRect();
    if(!quiet() && b.width>0 && from.width>0){
      const dx=from.left+from.width/2-b.left-b.width/2,dy=from.top+from.height/2-b.top-b.height/2;
      art.animate?.([{transform:`translate(${dx}px,${dy}px) scale(${from.width/b.width})`},{transform:'none'}],{duration:530,easing:'cubic-bezier(.18,.7,.18,1)'});
    }
    tone('focus');
  }
  cat.addEventListener('click',()=>discover(cat));companion.addEventListener('click',()=>discover(companion));
  $('[data-dock-geralt]').addEventListener('click',()=>geraltDialog.close());
  geraltDialog.addEventListener('close',()=>{companion.hidden=false;companion.focus({preventScroll:true});dirty=true;schedule();});

  // A reviewable sequence through the live interactions, started by the visitor.
  const tourButton=$('[data-tour]'), tourStatus=$('[data-tour-status]');
  let tourRun=null;
  function stopTour(){if(!tourRun)return;tourRun.abort();tourRun=null;tourStatus.hidden=true;tourButton.setAttribute('aria-pressed','false');tourButton.textContent='Play studio tour';}
  function wait(ms,signal){
    return new Promise(resolve=>{
      if(signal.aborted){resolve(false);return;}
      const stop=()=>{clearTimeout(timer);resolve(false);};
      const timer=setTimeout(()=>{signal.removeEventListener('abort',stop);resolve(true);},ms);
      signal.addEventListener('abort',stop,{once:true});
    });
  }
  function tourTo(sel, canAnimate=true){$(sel)?.scrollIntoView({block:'start',behavior:!quiet()&&canAnimate?'smooth':'instant'});}
  async function tour(){
    if(tourRun){stopTour();return;}
    const run=tourRun=new AbortController(),s=run.signal;
    tourStatus.hidden=false;tourButton.setAttribute('aria-pressed','true');tourButton.textContent='Stop studio tour';
    const caption=text=>{$('[data-tour-step]').textContent=text;};
    caption('Stage · orbit and relight');tourTo(innerWidth<761?'[data-stage-rig]':'#stage');
    setGel(0);setOrbit(-32);
    if(!await wait(1300,s))return;
    setGel(1);setOrbit(27);
    if(!await wait(1600,s))return;
    setGel(2);setOrbit(78);
    if(!await wait(1300,s))return;
    caption('Cut room · real source frames');tourTo('[data-machine]');choose('a-quiet-trail');
    if(!await wait(850,s))return;
    for(const n of [1,4,8,13,17,21,25,30,32]){frame(n);if(!await wait(230,s))return;}
    if(!await wait(750,s))return;
    caption('Darkroom · an exposure changes the light');tourTo('.exhibition');swapExposure(3);
    if(!await wait(1550,s))return;
    swapExposure(7);if(!await wait(1700,s))return;
    caption('End slate · that’s a wrap');tourTo('#wrap');
    if(!await wait(950,s))return;
    clap({demo:true});
    if(!await wait(2500,s))return;
    if(tourRun===run)stopTour();
  }
  tourButton.addEventListener('click',()=>{void tour();});
  $('[data-tour-stop]').addEventListener('click',stopTour);
  nav.forEach(a=>a.addEventListener('click',stopTour));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!viewer.open&&!geraltDialog.open)stopTour();});
  synchronizeMotion();
})();
