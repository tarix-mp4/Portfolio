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
  const pointerFine = matchMedia('(any-hover:hover) and (any-pointer:fine)');
  let manuallyQuiet=false;
  const quiet=()=>systemReduced.matches || manuallyQuiet;
  const cueEase='cubic-bezier(.21,.78,.2,1)', cutEase='cubic-bezier(.22,.65,.16,1)';
  const playing=new Set(), onNode=new WeakMap();
  function playMotion(node,frames,options) {
    onNode.get(node)?.cancel();
    if(quiet()||!node.animate)return null;
    const animation=node.animate(frames,options);
    playing.add(animation);onNode.set(node,animation);
    const forget=()=>{playing.delete(animation);if(onNode.get(node)===animation)onNode.delete(node);};
    animation.finished.then(forget,forget);
    return animation;
  }
  const finished=animation=>animation ? animation.finished.catch(()=>{}) : Promise.resolve();
  function pulse(node,name,ms) {
    if(quiet()||node.classList.contains(name))return;
    node.classList.add(name);
    setTimeout(()=>node.classList.remove(name),ms);
  }
  const motion= $('[data-motion]');
  const chapters=$$('[data-chapter]');
  const nav=$$('.nav-inner nav a');
  const navTrack=$('.nav-inner nav');
  const field=$('[data-orbit-area]'), rig=$('[data-stage-rig]');
  const orbit=$('#orbit'), detail=$('#detail'), renderStatus=$('[data-render-status]');
  const sceneCanvas=$('[data-scene]'), scenePoster=$('.gold-still');
  const viewer=$('#viewer'), geraltDialog=$('.geralt-dialog'), reviewDialog=$('#review-cues');
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
  const lampMix=[1,0,0];
  let travel=0, dirty=true, scrollDirty=true, measureDirty=true, bounds=[], pageHeight=1, currentChapter=null;
  let lastGlFrame=0, lastSceneAt=0, lateRun=0, sceneCount=0, dynamicLevel=null, openingAt=0, pointerAt=0;
  let pendingFrame=null, previewPaint=false;
  const cost=[],pointerWait=[];
  function schedule() {
    if (!job && !document.hidden) job=requestAnimationFrame(tick);
  }
  function readLayout() {
    measureDirty=false;
    const y=scrollY;
    bounds=chapters.map(section=>{const b=section.getBoundingClientRect();return {section,top:b.top+y,height:b.height};});
    pageHeight=Math.max(1,root.scrollHeight-innerHeight);
    aimNav(nav.find(a=>a.hash.slice(1)===currentChapter));
    scrollDirty=true;
  }
  function aimNav(link) {
    if(!link)return;
    navTrack.style.setProperty('--nav-x',link.offsetLeft+'px');
    navTrack.style.setProperty('--nav-w',String(link.offsetWidth));
    navTrack.dataset.tracked='';
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
      aimNav(nav.find(a=>a.hash.slice(1)===active));
    }
    $('.chapter-progress span').style.transform=`scaleX(${clamp(y/pageHeight).toFixed(4)})`;
    if (!quiet() && here) {
      // Include both sides of a cut; atmosphere follows the adjacent chapter
      // before the nav's current chapter changes. No per-element scroll reads.
      for(const {section,top,height} of bounds) {
        if(top>y+h||top+height<y)continue;
        const n=clamp((aim-top)/Math.max(1,height))-.5;
        section.style.setProperty('--halo-shift',(n*54).toFixed(1)+'px');
        if(section.id==='stills')section.style.setProperty('--print-travel',(n*15).toFixed(1)+'px');
        if(section.id==='wrap')section.style.setProperty('--wrap-travel',(n*44).toFixed(1)+'px');
      }
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
      if(stageVisible&&!quiet()&&scrollY<80)openingAt=performance.now();
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
    if (quiet()) {
      travel=0;wantedX=wantedY=0;openingAt=0;
      playing.forEach(a=>a.finish());
      chapters.forEach(c=>['--halo-shift','--print-travel','--wrap-travel'].forEach(p=>c.style.removeProperty(p)));
    }
    dirty=true;scrollDirty=true;schedule();
    refreshPeek();
  }
  motion.addEventListener('click',()=>{manuallyQuiet=!manuallyQuiet;synchronizeMotion();if(quiet())stopTour();});
  systemReduced.addEventListener?.('change',synchronizeMotion);
  let dragging=false, startX=0,startY=0,startAngle=0, fieldRect=null, gesture=null;
  field.addEventListener('pointerenter',e=>{fieldRect=field.getBoundingClientRect();if(e.pointerType==='mouse'||e.pointerType==='pen')field.dataset.focus='';});
  field.addEventListener('pointerdown',e=>{
    if (!stageVisible || e.button!==0 || quiet() || e.target.closest('button') || gesture!==null) return;
    gesture=e.pointerId;startX=e.clientX;startY=e.clientY;startAngle=wantedAngle;
    if(e.pointerType==='mouse')startDrag();
    function startDrag(){dragging=true;field.classList.add('dragging');field.setPointerCapture(e.pointerId);}
  });
  field.addEventListener('pointermove',e=>{
    if (quiet() || !scene || !stageVisible) return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    if (e.pointerId===gesture&&!dragging&&Math.abs(dx)>11&&Math.abs(dx)>Math.abs(dy)*1.3){
      dragging=true;field.classList.add('dragging');field.setPointerCapture(e.pointerId);
    }
    if (dragging&&e.pointerId===gesture) {
      wantedAngle=clamp(startAngle+dx*.006,-95*Math.PI/180,125*Math.PI/180);
      orbit.value=String(Math.round(wantedAngle*180/Math.PI));
    } else if(pointerFine.matches&&e.pointerType==='mouse') {
      fieldRect ||= field.getBoundingClientRect();
      wantedX=clamp((e.clientX-fieldRect.left)/fieldRect.width*2-1,-1,1);
      wantedY=clamp((e.clientY-fieldRect.top)/fieldRect.height*2-1,-1,1);
    }else return;
    if (profiling)pointerAt=performance.now();
    dirty=true;schedule();
  },{passive:true});
  function releaseDrag(e){if(e.pointerId!==gesture)return;gesture=null;dragging=false;field.classList.remove('dragging');}
  ['pointerup','pointercancel','lostpointercapture'].forEach(event=>field.addEventListener(event,releaseDrag));
  field.addEventListener('pointerleave',()=>{delete field.dataset.focus;fieldRect=null;wantedX=wantedY=0;dirty=true;schedule();});
  function setOrbit(deg){orbit.value=String(deg);wantedAngle=Number(orbit.value)*Math.PI/180;dirty=true;rendererReady();schedule();}
  orbit.addEventListener('input',()=>setOrbit(orbit.value));
  function setGel(index){
    gel=index;rig.dataset.gel=String(index);
    $('[data-stage-scope]').textContent=['LENS 01 / TUNGSTEN KEY','LENS 02 / ROSE GEL','LENS 03 / BLUE RIM'][index];
    $$('[data-light]').forEach(btn=>btn.setAttribute('aria-pressed',String(+btn.dataset.light===index)));
    rendererReady();dirty=true;schedule();
  }
  $$('[data-light]').forEach(btn=>btn.addEventListener('click',()=>setGel(+btn.dataset.light)));
  $('[data-practical]').addEventListener('click',()=>{
    if(field.classList.contains('recorded'))return;
    field.classList.add('recorded');
    $('[data-stage-scope]').textContent='LENS / FRAME EXPOSED';
    setTimeout(()=>field.classList.remove('recorded'),610);
    tone('shutter');
  });
  $$('[data-prop]').forEach(prop=>prop.addEventListener('click',()=>{
    const blender=prop.dataset.prop==='blender';
    $('[data-stage-scope]').textContent=blender?'KIT / BLENDER ROLL':'KIT / AFTER EFFECTS FLIP';
    pulse(prop,'kit-cued',760);
    const spin=blender?[{transform:'rotateZ(0deg)'},{transform:'rotateZ(-360deg)'}]:
      [{transform:'rotateY(0deg) rotateX(0deg)'},{transform:'rotateY(184deg) rotateX(11deg)',offset:.49},{transform:'rotateY(360deg) rotateX(0deg)'}];
    playMotion($('.chip-depth',prop),spin,{duration:blender?890:780,easing:cueEase});
    tone('spin');
  }));
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
      else {wantedX=wantedY=0;lastSceneAt=lastGlFrame=0;openingAt=0;}
    },{rootMargin:'0px',threshold:.02}).observe(field);
    const cuts=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('arrived');cuts.unobserve(e.target);}});
    },{threshold:.2});
    $$('.kinetic,.chapter-intro,.edit-case,.exhibition,.wrap-stage,.wrap-story>p,.contact-links').forEach(c=>cuts.observe(c));
  } else {stageVisible=true;rendererReady();}
  addEventListener('resize',()=>{measureDirty=true;schedule();},{passive:true});
  addEventListener('scroll',()=>{scrollDirty=true;filmBounds=fieldRect=null;schedule();},{passive:true});
  document.fonts?.ready.then(()=>{measureDirty=true;schedule();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){if(job)cancelAnimationFrame(job);job=0;lastGlFrame=lastSceneAt=0;stopTour();}
    else {dirty=true;measureDirty=true;schedule();}
    refreshPeek();
  });
  function tick(now) {
    job=0;wakeCount++;
    if(profiling)root.dataset.frameWakeups=String(wakeCount);
    if (measureDirty) readLayout();
    if (scrollDirty) applyScroll();
    if(pendingFrame!==null){const next=pendingFrame;pendingFrame=null;commitFrame(next);}
    if(previewPaint){previewPaint=false;paintFrame();}
    if(!scene||!stageVisible||viewer.open||geraltDialog.open||reviewDialog.open||document.hidden||storedWidth<2||storedHeight<2)return;
    const opening=openingAt?clamp((now-openingAt)/870):1;
    if(opening===1)openingAt=0;
    const remaining=Math.abs(wantedAngle-angle)+Math.abs(wantedX-lightX)+Math.abs(wantedY-lightY)+(1-lampMix[gel]);
    if(!dirty && remaining<.004 && opening===1) return;
    const slower=scene.type==='software';
    if (slower && !quiet() && now-lastSceneAt<31){schedule();return;}
    const moved=lastSceneAt && now-lastSceneAt;
    const delta=clamp(moved||17,14,48);
    const mix=quiet()||remaining<.01?1:1-Math.exp(-delta/81);
    angle+=(wantedAngle-angle)*mix;lightX+=(wantedX-lightX)*mix;lightY+=(wantedY-lightY)*mix;
    for(let i=0;i<3;i++)lampMix[i]+=((i===gel?1:0)-lampMix[i])*mix;
    field.style.setProperty('--key-x',(lightX*24).toFixed(2)+'px');
    field.style.setProperty('--key-y',(lightY*17).toFixed(2)+'px');
    field.style.setProperty('--prop-turn',(lightX*8).toFixed(2)+'deg');
    field.style.setProperty('--focus-x',((lightX*.36+.5)*100).toFixed(1)+'%');
    field.style.setProperty('--focus-y',((lightY*.34+.45)*100).toFixed(1)+'%');
    const auto=(innerWidth<850 || (navigator.deviceMemory||8)<5 || slower) ? 'balanced':'full';
    const quality=detail.value==='auto'?dynamicLevel||auto:detail.value;
    const start=performance.now();
    const entry=Math.pow(1-opening,3);
    const meta=scene.draw({width:storedWidth,height:storedHeight,quality,lampMix,
      yaw:-.28+angle+lightX*.24+travel*.58-entry*.34,pitch:.73-lightY*.18+travel*.32+entry*.12,lightX,lightY});
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
        if(pointerAt){
          pointerWait.push(Math.round((performance.now()-pointerAt)*10)/10);
          if(pointerWait.length>160)pointerWait.shift();
          rig.dataset.pointerWait=JSON.stringify(pointerWait);pointerAt=0;
        }
      }
    }
    if (!slower && detail.value==='auto' && quality==='full' && remaining>.01) {
      const gap=now-lastGlFrame;
      if (lastGlFrame && gap>31 && gap<120) lateRun++; else lateRun=Math.max(0,lateRun-1);
      if(lateRun>=12){dynamicLevel='balanced';lateRun=0;renderStatus.textContent='Live WebGL · adaptive detail';}
    }
    lastGlFrame=now;lastSceneAt=now;dirty=false;
    if (!quiet() && (remaining>.006||opening<1)) schedule();
  }
  schedule();

  // Premiere-inspired playhead. The original full video is never loaded to scrub.
  const choices=$$('[data-choose]'), picture=$('[data-picture]'), sleeve=$('.picture-sleeve',picture);
  const machine=$('[data-machine]'), editMeta=$('.edit-meta');
  const poster=$('img',sleeve), layer=$('.sprite',sleeve);
  const track=$('.timeline-track'), strip=$('.timeline-film'), tiles=$$('span',strip), slider=$('#scrub');
  const timecode=$('[data-timecode]'), frameNote=$('[data-frame-note]');
  const frameCue=$('[data-frame-cue]');
  // Original public V7 delivery. Never requested until a screening is chosen.
  const mediaRoot='https://tarix-portfolio.netlify.app/assets/videos/';
  const nativeFiles={showreel:'showreel.mp4','a-quiet-trail':'a-quiet-trail.mp4',elham:'elham.mp4',
    'deer-scene':'deer-scene.mp4',vfx:'integrating-3d.mp4','vision-types':'vision-types.mp4',
    acuity:'vision-types-2.mp4','social-campaigns':'social-media-educational.mp4'};
  let active='a-quiet-trail',frameIndex=0,frameToken=0,decoded=null,filmBounds=null;
  const time=(s)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${(s%60).toFixed(2).padStart(5,'0')}`;
  function resetFrame(){
    frameToken++;decoded=null;frameIndex=0;previewPaint=false;pendingFrame=null;
    layer.hidden=true;layer.style.backgroundImage='';layer.removeAttribute('data-frame');
    strip.toggleAttribute('data-empty',active!=='a-quiet-trail');
    strip.removeAttribute('data-portrait');
    tiles.forEach(t=>t.removeAttribute('style'));
    strip.style.backgroundImage='';
    slider.value='0';slider.setAttribute('aria-valuetext','Starting still');
    timecode.textContent='00:00.00';
    track.style.setProperty('--frame','0%');track.style.setProperty('--cut-progress','0');
  }
  function frame(n) {pendingFrame=Number(n);schedule();}
  function framePosition(i,m){return `${(i%m.columns)*100/(m.columns-1)}% ${Math.floor(i/m.columns)*100/(m.rows-1)}%`;}
  function paintFrame(){
    const m=films[active].preview;
    if(!m||decoded!=='ready'||layer.dataset.frame===String(frameIndex))return;
    layer.style.backgroundPosition=framePosition(frameIndex,m);
    $('.outgoing-shot',sleeve)?.remove();
    layer.dataset.frame=String(frameIndex);layer.hidden=false;
  }
  function commitFrame(n) {
    const m=films[active].preview;
    if(!m)return;
    frameIndex=clamp(Math.round(n),0,m.frameCount-1);slider.value=String(frameIndex);
    const stamp=time(m.times[frameIndex]);
    timecode.textContent=stamp;
    frameCue.textContent='FRAME / '+String(frameIndex+1).padStart(2,'0');
    slider.setAttribute('aria-valuetext',`Frame ${frameIndex+1} of ${m.frameCount}, ${stamp}`);
    const progress=frameIndex/(m.frameCount-1);
    track.style.setProperty('--frame',(100*progress).toFixed(2)+'%');
    track.style.setProperty('--cut-progress',progress.toFixed(4));
    if (decoded==='ready'){previewPaint=true;return;}
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
          t.style.backgroundImage=imageUrl;t.style.backgroundSize=size;t.style.backgroundPosition=framePosition(Math.round((j+.5)*(m.frameCount-1)/tiles.length),m);
        });
      }
      decoded='ready';previewPaint=true;schedule();
    }).catch(()=>{if(marker===frameToken){decoded='failed';frameNote.textContent='Frame sheet unavailable; the original poster is shown.';}});
  }
  function choose(key){
    const film=films[key];if(!film)return;
    const changed=key!==active;
    $('.outgoing-shot',sleeve)?.remove();
    const outgoing=changed&&!quiet()?poster.cloneNode():null;
    if(outgoing){outgoing.className='outgoing-shot';outgoing.alt='';outgoing.removeAttribute('loading');sleeve.append(outgoing);}
    active=key;resetFrame();
    choices.forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.choose===key)));
    picture.toggleAttribute('data-vertical',film.ratio==='9:16');
    poster.src=film.poster;poster.alt='Still from '+film.title;
    $('[data-monitor-aspect]').textContent=film.ratio+' / '+film.category;
    $('[data-film-role]').textContent=film.role+' / '+film.category;
    $('[data-film-title]').textContent=film.title;$('[data-film-desc]').textContent=film.description;
    const button=$('.edit-meta [data-screen]');
    button.dataset.screen=key;
    $('[data-screen-text]',button).textContent=film.media?'Play excerpt':nativeFiles[key]?'Play film':film.youtube?'Screening notes':'Scene notes';
    frameCue.textContent='SOURCE / '+String(choices.findIndex(c=>c.dataset.choose===key)+1).padStart(2,'0');
    $('[data-timeline]').hidden=!film.preview;
    $('[data-no-timeline]').hidden=!!film.preview;
    if(film.preview){
      slider.max=String(film.preview.frameCount-1);
      frameNote.textContent=`${film.preview.frameCount} authentic frames · preview scrub`;
    }
    if(changed) {
      pulse(machine,'cut-changed',520);
      playMotion(editMeta,[{opacity:.35,transform:'translateX(13px)'},{opacity:1,transform:'none'}],{duration:450,easing:cutEase});
      const cut=outgoing&&playMotion(outgoing,[{opacity:1,clipPath:'inset(0 0 0 0)'},{opacity:.15,clipPath:'inset(0 100% 0 0)'}],{duration:395,easing:cutEase});
      if(outgoing)void finished(cut).then(()=>outgoing.remove());
    }
    filmBounds=null;measureDirty=true;schedule();
  }
  choices.forEach(c=>c.addEventListener('click',()=>{if(c.dataset.choose!==active){choose(c.dataset.choose);tone('interface');}}));
  function stepControls(buttons,onStep) {
    buttons.forEach((button,index)=>button.addEventListener('keydown',event=>{
      const step={ArrowLeft:-1,ArrowRight:1,Home:-index,End:buttons.length-1-index}[event.key];
      if(step===undefined)return;
      event.preventDefault();
      const next=(index+step+buttons.length)%buttons.length;
      buttons[next].focus({preventScroll:true});onStep(buttons[next]);
    }));
  }
  stepControls(choices,b=>choose(b.dataset.choose));
  slider.addEventListener('input',()=>frame(slider.value));
  picture.addEventListener('pointerenter',()=>{
    filmBounds=picture.getBoundingClientRect();
  },{passive:true});
  picture.addEventListener('pointermove',e=>{
    if(!pointerFine.matches||e.pointerType!=='mouse'||!films[active].preview)return;
    machine.dataset.scrubbing='';
    filmBounds ||= picture.getBoundingClientRect();
    frame((e.clientX-filmBounds.left)/filmBounds.width*(films[active].preview.frameCount-1));
  },{passive:true});
  picture.addEventListener('pointerleave',()=>{delete machine.dataset.scrubbing;filmBounds=null;});
  slider.addEventListener('pointerdown',()=>{machine.dataset.scrubbing='';});
  ['pointerup','pointercancel','blur'].forEach(name=>slider.addEventListener(name,()=>delete machine.dataset.scrubbing));

  let exposure=3, exposureToken=0, pendingExposure=3;
  const print = $('[data-print]'), exhibition=$('.exhibition'), stills=$('#stills');
  const exposures=$$('[data-exposure]'), inspector=$('.inspector-face');
  function swapExposure(index){
    const p=photos[index];if(!p||index===pendingExposure)return;
    pendingExposure=index;
    const gate=++exposureToken;
    const candidate=new Image();candidate.src=p.image;
    candidate.decode().then(()=>{
      if(gate!==exposureToken)return;
      exposure=index;
      pulse(exhibition,'exposure-changed',810);
      exposures.forEach((c,i)=>c.setAttribute('aria-pressed',String(i===index)));
      stills.dataset.palette=p.palette;
      $('[data-print-number]').textContent='EXPOSURE '+p.number+' / 09';
      $('[data-print-title]').textContent=p.title;
      $('[data-print-category]').textContent=p.category;
      $('[data-print-caption]').textContent=p.alt;
      $('[data-open-photo]').setAttribute('aria-label','Enlarge '+p.title);
      const prior=print.cloneNode();
      prior.removeAttribute('data-print');prior.removeAttribute('loading');prior.className='print-leaving';prior.alt='';
      print.parentNode.querySelector('.print-leaving')?.remove();
      if(!quiet())print.before(prior);
      print.src=p.image;print.alt=p.alt;
      const incoming=playMotion(print,[{opacity:0,transform:'translateY(7px) scale(1.025)'},{opacity:1,transform:'none'}],{duration:520,easing:cutEase});
      playMotion(prior,[{transform:'none'},{transform:'translateY(-4px) scale(.995)'}],{duration:520,easing:cutEase});
      playMotion(inspector,[{opacity:.62,transform:'translateX(4px)'},{opacity:1,transform:'none'}],{duration:415,easing:cueEase});
      void finished(incoming).then(()=>prior.remove());
    }).catch(()=>{if(gate===exposureToken)pendingExposure=exposure;});
  }
  exposures.forEach(c=>c.addEventListener('click',()=>swapExposure(+c.dataset.exposure)));
  stepControls(exposures,b=>swapExposure(+b.dataset.exposure));
  let returnFocus=null,viewPhotoIndex=-1,closingViewer=false,openingViewer=null;
  const viewBody=$('.viewer-content',viewer);
  function dialogTitle(title){const h=el('h2',title);h.id='view-title';viewBody.append(h);}
  function mountViewer(trigger){
    if(viewer.open)return;
    returnFocus=trigger;viewer.showModal();refreshPeek();$('[data-close]',viewer).focus({preventScroll:true});
    openingViewer=playMotion(viewer,[{opacity:.3,transform:'translateY(13px) scale(.982)'},{opacity:1,transform:'none'}],{duration:340,easing:cutEase});
  }
  function dismissViewer() {
    if(closingViewer||!viewer.open)return;
    closingViewer=true;viewer.dataset.exit='';
    $('video',viewer)?.pause();
    const style=getComputedStyle(viewer);
    const closing=playMotion(viewer,[{opacity:style.opacity,transform:style.transform},{opacity:0,transform:'translateY(8px) scale(.985)'}],{duration:230,easing:'ease-in',fill:'forwards'});
    if(closing)void finished(closing).then(()=>{viewer.close();closing.cancel();});
    else viewer.close();
  }
  $('[data-close]',viewer).addEventListener('click',dismissViewer);
  viewer.addEventListener('cancel',event=>{event.preventDefault();dismissViewer();});
  viewer.addEventListener('click',event=>{
    if(event.target!==viewer)return;
    const box=viewer.getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dismissViewer();
  });
  viewer.addEventListener('close',()=>{
    closingViewer=false;delete viewer.dataset.exit;openingViewer?.cancel();openingViewer=null;
    const node=$('video',viewer);
    if(node){node.pause();node.removeAttribute('src');node.load();}
    viewBody.replaceChildren();
    viewPhotoIndex=-1;returnFocus?.focus({preventScroll:true});returnFocus=null;dirty=true;schedule();refreshPeek();
  });
  function showFilm(key,trigger,full=false){
    const film=films[key];if(!film || !viewer.showModal)return false;
    stopTour();
    viewPhotoIndex=-1;viewBody.replaceChildren();
    $('[data-dialog-label]').textContent=film.ratio+' / '+film.category;
    let playback=null;
    const nativeUrl=nativeFiles[key]?mediaRoot+nativeFiles[key]:null;
    const source=full?nativeUrl:film.media||nativeUrl;
    if(source) {
      playback=el('video');playback.controls=true;playback.playsInline=true;playback.preload='none';
      playback.poster=film.poster;playback.src=source;
      playback.toggleAttribute('data-portrait',film.ratio==='9:16');
      playback.setAttribute('aria-label',film.title);
      const sourceNote=source===film.media?film.mediaNote:'Full film / Original V7 MP4';
      const note=el('p',sourceNote,'cover-note mono');
      viewBody.append(playback,note);
      playback.addEventListener('error',()=>{
        if(playback.isConnected && playback.getAttribute('src')){
          note.textContent='This video could not load. Try the original link below.';
          note.classList.add('video-error');
        }
      });
    } else {
      const img=el('img');img.src=film.poster;img.alt='Still from '+film.title;viewBody.append(img);
    }
    dialogTitle(film.title);
    viewBody.append(el('p',film.role,'mono'),el('p',film.description));
    const actions=el('div','','viewer-screening-actions');
    if(film.media&&nativeUrl&&!full){
      const master=el('button',key==='showreel'?'Play the 1080p original':'Play the full film','outline-button');
      master.type='button';master.dataset.fullFilm=key;
      master.addEventListener('click',()=>{
        playback?.pause();
        if(playback){playback.removeAttribute('src');playback.load();}
        showFilm(key,trigger,true);$('[data-close]',viewer).focus();
      });
      actions.append(master);
    }
    if(film.youtube){
      const a=el('a',source?'Original on YouTube':'Open YouTube original');a.href=film.youtube;a.target='_blank';a.rel='noopener';actions.append(a);
    }else if(nativeUrl){const link=el('a','Open original MP4');link.href=nativeUrl;link.target='_blank';link.rel='noopener';actions.append(link);}
    if(actions.childElementCount)viewBody.append(actions);
    mountViewer(trigger);playback?.play().catch(()=>{});
    return true;
  }
  function showPhoto(index,trigger,keep=''){
    if(!viewer.showModal||closingViewer)return;
    viewPhotoIndex=(index+photos.length)%photos.length;
    const data=photos[viewPhotoIndex];viewBody.replaceChildren();
    $('[data-dialog-label]').textContent='Exposure '+data.number+' / 09';
    const image=el('img','','dialog-photo');image.src=data.detail;image.alt=data.alt;image.width=1367;image.height=2048;
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
  const cues={interface:'../../assets/sounds/interface.wav',clap:'../../assets/sounds/clap.wav',reel:'../../assets/sounds/reel.wav',focus:'../../assets/sounds/focus.wav',shutter:'../../assets/sounds/shutter.wav',spin:'../../assets/sounds/spin.wav'};
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
  let take=1, sceneNumber=1, clapping=false, reelSpin=0;
  const clapper=$('[data-clapper]'), digits=n=>String(n).padStart(2,'0');
  function clap({demo=false}={}){
    if(clapping)return;
    clapping=true;clapper.setAttribute('aria-busy','true');
    const arm=$('.clapper-hinge'), reel=$('.reel-object img'), light=$('.wrap-shutter');
    const impact=()=>{
      if (Math.random()<.25){sceneNumber++;take=1;}else take++;
      $('[data-scene-count]').textContent=digits(sceneNumber);$('[data-take-count]').textContent=digits(take);
      const readout='Scene '+digits(sceneNumber)+' · Take '+digits(take);
      $('[data-clap-status]').textContent=readout;clapper.setAttribute('aria-label','Clap the slate, '+readout);
      $('[data-slate-cue]').textContent='Slate set / '+digits(sceneNumber)+':'+digits(take);
      if(!demo)tone('clap');
      if(!quiet()){
        const before=reelSpin;reelSpin+=118;reel.style.rotate=reelSpin+'deg';
        playMotion(light,[{opacity:0,transform:'translateX(-4%)'},{opacity:.72,offset:.18},{opacity:0,transform:'translateX(5%)'}],{duration:720,easing:cueEase});
        playMotion(reel,[{rotate:before+'deg'},{rotate:reelSpin+'deg'}],{duration:660,easing:cutEase});
        playMotion($('.slate-readout'),[{opacity:.4,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:290,easing:cueEase});
        const finale=$('#wrap');finale.dataset.strike='';setTimeout(()=>delete finale.dataset.strike,980);
      }
    };
    const unlock=()=>{clapping=false;clapper.removeAttribute('aria-busy');};
    if(quiet()){impact();unlock();return;}
    playMotion(arm,[{transform:'rotate(-17deg)'},{transform:'rotate(-28deg)',offset:.23},{transform:'rotate(0deg)',offset:.57},{transform:'rotate(-17deg)'}],{duration:450,easing:'ease-in-out'});
    setTimeout(impact,245);setTimeout(unlock,925);
  }
  clapper.addEventListener('click',()=>clap());

  // Each hiding spot sits behind a real foreground surface. Only one peeks.
  const cats=$$('[data-geralt]'), printCat=$('[data-geralt="print"]'), companion=$('[data-companion]');
  const peekTargets=new Map([
    [$('.print-wall'),printCat],[$('[data-machine]'),$('.geralt-cut')]
  ]);
  const peekVisible=new Set();
  const catArt=$('.found-room img',geraltDialog), boxedCat=$('.box-cat',companion), curtain=$('.geralt-curtain');
  let found=false, finding=false, docking=false, peekTimer=0, peekJob=null, peekObserver=null, activeCat=null, pinnedCat=null, retirePeek=null;
  function clearPeek(){clearTimeout(peekTimer);peekTimer=0;peekJob?.cancel();peekJob=null;retirePeek=null;}
  function refreshPeek(){
    if(finding)return;
    clearPeek();
    const cat=found||document.hidden||viewer.open||geraltDialog.open||reviewDialog.open?null:
      pinnedCat||[printCat,$('.geralt-cut')].find(c=>peekVisible.has(c));
    activeCat=cat;
    cats.forEach(c=>{delete c.dataset.peekVisible;c.hidden=c!==cat;});
    if(!cat)return;
    if(quiet()||document.activeElement===cat){cat.dataset.peekVisible='';return;}
    function retire(){
      if(cat!==activeCat||pinnedCat===cat||document.activeElement===cat||cat.matches(':hover'))return;
      delete cat.dataset.peekVisible;
      peekJob=cat.animate?.([{transform:'translateY(-136%) rotate(-8deg)'},{transform:'translateY(16%) rotate(-8deg)'}],{duration:500,easing:'ease-in-out'});
      peekTimer=setTimeout(reveal,3900);
    }
    retirePeek=retire;
    function reveal(){
      if(found||cat!==activeCat||document.hidden||viewer.open)return;
      const opening=peekJob=cat.animate?.([{transform:'translateY(16%) rotate(-8deg)'},{transform:'translateY(-136%) rotate(-8deg)'}],{duration:490,easing:cueEase,fill:'forwards'});
      void finished(opening).then(()=>{
        if(peekJob!==opening||found||cat.hidden)return;
        cat.dataset.peekVisible='';
        opening?.cancel();peekJob=null;
        if(pinnedCat!==cat)peekTimer=setTimeout(retire,2350);
      });
    }
    peekTimer=setTimeout(reveal,pinnedCat?180:610);
  }
  if('IntersectionObserver' in window){
    peekObserver=new IntersectionObserver(entries=>{
      for(const entry of entries){const spot=peekTargets.get(entry.target);if(entry.intersectionRatio>=.21)peekVisible.add(spot);else peekVisible.delete(spot);}
      if(!pinnedCat)refreshPeek();
    },{threshold:.21});
    peekTargets.forEach((_,node)=>peekObserver.observe(node));
  }else{peekVisible.add(printCat);refreshPeek();}
  async function discover(trigger){
    if(geraltDialog.open||finding||docking||viewer.open||reviewDialog.open||!geraltDialog.showModal)return;
    finding=true;found=true;stopTour();
    peekObserver?.disconnect();
    const fromPeek=trigger!==companion;
    const start=fromPeek?$('img',trigger):boxedCat;
    let lift;
    $$('.box-back,.box-front',companion).forEach(img=>{img.loading='eager';});
    if(fromPeek){
      const transform=getComputedStyle(trigger).transform;
      clearPeek();trigger.dataset.peekVisible='';
      lift=playMotion(trigger,[{transform},{transform:'translateY(-202%) rotate(0)'}],{duration:235,easing:cueEase,fill:'forwards'});
      await finished(lift);
    }
    const from=start.getBoundingClientRect();
    lift?.cancel();
    // Capture the rendered size while the trigger still shares its section's
    // coordinates. Only the dialog and fixed dock take part after this point.
    clearPeek();cats.forEach(c=>{delete c.dataset.peekVisible;c.hidden=true;});pinnedCat=null;companion.hidden=true;
    geraltDialog.showModal();
    finding=false;
    const b=catArt.getBoundingClientRect();
    if(b.width>0 && from.width>0){
      const dx=from.left+from.width/2-b.left-b.width/2,dy=from.top+from.height/2-b.top-b.height/2;
      playMotion(catArt,[{transform:`translate(${dx}px,${dy}px) scale(${from.width/b.width})`},{transform:'none'}],{duration:690,easing:cutEase});
    }
    tone('focus');
  }
  async function dock(){
    if(docking||!geraltDialog.open)return;
    docking=true;geraltDialog.dataset.dismiss='';
    await finished(playMotion($('#found-title'),[{opacity:1},{opacity:0,transform:'translateY(4px)'}],{duration:160,fill:'forwards'}));
    const from=catArt.getBoundingClientRect();
    onNode.get(catArt)?.cancel();
    companion.dataset.incoming='';
    companion.dataset.dockPhase='landing';
    body.dataset.geraltFound='';
    companion.disabled=true;companion.hidden=false;
    const dest=boxedCat.getBoundingClientRect();
    if(!quiet())curtain.hidden=false;
    geraltDialog.close();
    delete geraltDialog.dataset.dismiss;
    $('#found-title').getAnimations?.().forEach(a=>a.cancel());
    const scrim=playMotion(curtain,[{opacity:1},{opacity:0}],{duration:710,easing:'ease-out',fill:'forwards'});
    void finished(scrim).then(()=>{curtain.hidden=true;scrim?.cancel();});
    if(!quiet()&&dest.width>0&&from.width>0){
      const flight=catArt.cloneNode();
      flight.className='geralt-flight';flight.alt='';flight.removeAttribute('loading');flight.setAttribute('aria-hidden','true');
      flight.style.width=from.width+'px';flight.style.height=from.height+'px';
      companion.append(flight);
      const move=(rect,scale)=>`translate3d(${rect.left}px,${rect.top}px,0) scale(${scale})`;
      const target=dest.width/from.width;
      const arc={left:from.left+(dest.left-from.left)*.58,top:from.top+(dest.top-from.top)*.38-41};
      const boxBack=$('.box-back',companion), boxFront=$('.box-front',companion);
      const unwrap=[{opacity:0,transform:'translateY(22px) scale(.64,.54)'},{opacity:0,offset:.17},
        {opacity:1,transform:'translateY(-2px) scale(1.03,1.045)',offset:.7},{opacity:1,transform:'none'}];
      playMotion(boxBack,unwrap,{duration:780,easing:cueEase});
      playMotion(boxFront,unwrap,{duration:820,easing:cueEase});
      const landing=playMotion(flight,[{transform:move(from,1)},{transform:move(arc,1+(target-1)*.63),offset:.53},{transform:move(dest,target)}],{duration:835,easing:'cubic-bezier(.32,.62,.34,1)',fill:'forwards'});
      const viewport=window.visualViewport;
      const settleAtNewEdge=()=>landing?.finish();
      viewport?.addEventListener('resize',settleAtNewEdge,{once:true});
      await finished(landing);
      viewport?.removeEventListener('resize',settleAtNewEdge);
      flight.remove();landing?.cancel();
    }
    delete companion.dataset.incoming;companion.disabled=false;
    companion.dataset.dockPhase='seated';
    $$('.box-back,.box-front,.box-cat',companion).forEach(layer=>playMotion(layer,[
      {translate:'0 0'},{translate:'0 4px',offset:.24},{translate:'0 -2px',offset:.62},{translate:'0 0'}
    ],{duration:458,easing:cueEase}));
    companion.focus({preventScroll:true});
    docking=false;dirty=true;schedule();
  }
  cats.forEach(cat=>{
    cat.addEventListener('focus',()=>{if(!finding){clearPeek();cat.dataset.peekVisible='';}});
    cat.addEventListener('blur',refreshPeek);
    cat.addEventListener('pointerleave',()=>{
      if(activeCat===cat&&retirePeek&&cat.hasAttribute('data-peek-visible')&&!pinnedCat){clearTimeout(peekTimer);peekTimer=setTimeout(retirePeek,950);}
    });
    cat.addEventListener('click',()=>void discover(cat));
  });
  companion.addEventListener('click',()=>void discover(companion));
  $('[data-dock-geralt]').addEventListener('click',()=>void dock());
  geraltDialog.addEventListener('cancel',e=>{e.preventDefault();void dock();});
  geraltDialog.addEventListener('click',e=>{
    if(e.target!==geraltDialog)return;
    const r=geraltDialog.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)void dock();
  });

  // A reviewable sequence through the live interactions, started by the visitor.
  const tourButton=$('[data-tour]'), tourStatus=$('[data-tour-status]');
  let tourRun=null;
  function stopTour(){if(!tourRun)return;tourRun.abort();tourRun=null;tourStatus.hidden=true;tourButton.setAttribute('aria-pressed','false');tourButton.textContent='Play studio tour';$$('[data-channel][data-cue]').forEach(card=>delete card.dataset.cue);}
  function wait(ms,signal){
    return new Promise(resolve=>{
      if(signal.aborted){resolve(false);return;}
      const stop=()=>{clearTimeout(timer);resolve(false);};
      const timer=setTimeout(()=>{signal.removeEventListener('abort',stop);resolve(true);},ms);
      signal.addEventListener('abort',stop,{once:true});
    });
  }
  function tourTo(sel, canAnimate=true){$(sel)?.scrollIntoView({block:'start',behavior:!quiet()&&canAnimate?'smooth':'instant'});}
  const contactCards=$$('[data-channel]'), colorButton=$('[data-color-cue]');
  let colorPass=null;
  contactCards.forEach(card=>{
    card.addEventListener('pointerenter',e=>{
      if(e.pointerType==='mouse'||(e.pointerType==='pen'&&e.buttons===0))card.dataset.pointer='';
    },{passive:true});
    const leave=()=>delete card.dataset.pointer;
    card.addEventListener('pointerleave',leave,{passive:true});
    card.addEventListener('pointercancel',leave,{passive:true});
  });
  function stopColorPass(){
    if(!colorPass)return;
    colorPass.abort();colorPass=null;
    colorButton.setAttribute('aria-pressed','false');colorButton.textContent='Play color pass';
    contactCards.forEach(card=>delete card.dataset.cue);
  }
  async function playColors() {
    if(colorPass){stopColorPass();return;}
    stopTour();
    const run=colorPass=new AbortController();
    colorButton.setAttribute('aria-pressed','true');colorButton.textContent='Stop color pass';
    const ordered=[contactCards[2],contactCards[1],contactCards[0],contactCards[3]];
    for(const card of ordered) {
      card.dataset.cue='';
      if(!await wait(1300,run.signal))return;
      delete card.dataset.cue;
      if(!await wait(730,run.signal))return;
    }
    if(colorPass===run)stopColorPass();
  }
  colorButton.addEventListener('click',()=>void playColors());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopColorPass();});

  const reviewMode=params.get('review');
  const peekReview=$('[data-review-peek]'), cuePeek=$('[data-cue-geralt]');
  function reviewJump(mode,userInitiated=false){
    if(mode==='geralt'){
      peekReview.hidden=false;
      if(userInitiated){tourTo('.exhibition');cuePeek.focus({preventScroll:true});}
    }else if(mode==='contacts'&&userInitiated){tourTo('#contact-cues');colorButton.focus({preventScroll:true});}
  }
  // Query state survives the private sign-in redirect; a URL fragment alone may not.
  if(reviewMode==='geralt'||reviewMode==='contacts'){
    reviewJump(reviewMode);
    if(!location.hash)requestAnimationFrame(()=>tourTo(reviewMode==='geralt'?'[data-review-peek]':'#contact-cues',false));
  }
  $$('[data-review-open]').forEach(link=>link.addEventListener('click',e=>{
    if(!reviewDialog.showModal)return;
    e.preventDefault();stopTour();stopColorPass();reviewDialog.showModal();refreshPeek();
  }));
  reviewDialog.addEventListener('close',()=>{refreshPeek();dirty=true;schedule();});
  $$('[data-review-jump]').forEach(btn=>btn.addEventListener('click',()=>{
    reviewDialog.close();reviewJump(btn.dataset.reviewJump,true);
  }));
  cuePeek.addEventListener('click',()=>{
    if(found&&!companion.hidden){void discover(companion);return;}
    if(found)return;
    pinnedCat=printCat;refreshPeek();
    $('[data-peek-instruction]').textContent='Tap Geralt at the top of the photograph.';
    tourTo('.exhibition');
  });
  geraltDialog.addEventListener('close',()=>{
    if(found){cuePeek.textContent='Replay Geralt’s landing';$('[data-peek-instruction]').textContent='The same companion can be opened again from his box.';}
  });
  fetch('release.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(build=>{
    if(!build||typeof build.commit!=='string'||!/^[a-f0-9]{40}$/.test(build.commit))return;
    $('[data-release]').textContent=build.commit.slice(0,8);
    $('[data-release-long]').textContent='GitHub · '+build.commit;
    root.dataset.release=build.commit;
  }).catch(()=>{});
  async function tour(){
    if(tourRun){stopTour();return;}
    stopColorPass();
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
    if(!await wait(1500,s))return;
    caption('Final grade · contact cards');tourTo('.contact-links');
    if(!await wait(710,s))return;
    const instagram=$('[data-channel="instagram"]'), whatsapp=$('[data-channel="whatsapp"]');
    instagram.dataset.cue='';
    if(!await wait(1280,s))return;
    delete instagram.dataset.cue;whatsapp.dataset.cue='';
    if(!await wait(1390,s))return;
    delete whatsapp.dataset.cue;
    if(!await wait(690,s))return;
    if(tourRun===run)stopTour();
  }
  tourButton.addEventListener('click',()=>{void tour();});
  $('[data-tour-stop]').addEventListener('click',stopTour);
  nav.forEach(a=>a.addEventListener('click',()=>{aimNav(a);stopTour();stopColorPass();}));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!viewer.open&&!geraltDialog.open)stopTour();});
  synchronizeMotion();
})();
