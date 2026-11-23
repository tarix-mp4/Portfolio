/* Vanilla JavaScript. The portfolio remains navigable without it. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let manuallyPaused = false;
  try { manuallyPaused = sessionStorage.getItem('tarix-motion-paused') === '1'; } catch (_) {}
  let motionEnabled = !motionPreference.matches && !manuallyPaused;
  const root = document.documentElement;
  const motionListeners = new Set();
  const canMove = () => motionEnabled && !document.hidden && !root.classList.contains('screening');
  function broadcastMotion() { motionListeners.forEach(listener => listener()); }
  // One native RAF dispatches the existing independent controllers. Each
  // controller still owns its pause/offscreen lifecycle and original timing.
  const frameJobs = new Map();
  let nativeFrame = 0, frameId = 0;
  const frameDebug = { frames: 0, pending: 0 };
  Object.defineProperty(window, '__tarixScheduler', { value: frameDebug });
  function scheduleFrame(callback) {
    const id = ++frameId;
    frameJobs.set(id, callback);
    frameDebug.pending = frameJobs.size;
    if (!nativeFrame) nativeFrame = window.requestAnimationFrame(flushFrames);
    return id;
  }
  function cancelFrame(id) {
    frameJobs.delete(id);
    frameDebug.pending = frameJobs.size;
    if (!frameJobs.size && nativeFrame) {
      window.cancelAnimationFrame(nativeFrame); nativeFrame = 0;
    }
  }
  function flushFrames(now) {
    nativeFrame = 0;
    const jobs = Array.from(frameJobs);
    jobs.forEach(([id]) => frameJobs.delete(id));
    frameDebug.frames++;
    jobs.forEach(([, callback]) => {
      try { callback(now); } catch (error) { setTimeout(() => { throw error; }); }
    });
    frameDebug.pending = frameJobs.size;
  }
  const projectData = JSON.parse($('#project-data').textContent);
  const projectOrder = Object.keys(projectData);

  // Mobile navigation is a disclosure, not a modal: no hidden focus traps.
  const menuButton = $('.menu-toggle');
  const mobileNav = $('#mobile-nav');
  function closeMenu(restoreFocus = false) {
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    if (restoreFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => {
    const opening = mobileNav.hidden;
    mobileNav.hidden = !opening;
    menuButton.setAttribute('aria-expanded', String(opening));
    menuButton.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
    if (opening && motionEnabled) mobileNav.animate([
      { opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }
    ], { duration: 350, easing: 'cubic-bezier(.22,1,.36,1)' });
  });
  $$('a', mobileNav).forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('click', event => {
    if (!mobileNav.hidden && !$('#site-header').contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) closeMenu(true);
  });
  window.matchMedia('(min-width: 1001px)').addEventListener('change', event => {
    if (event.matches) closeMenu();
  });

  // Batched FLIP transitions; no perpetual layout reads and no animation library.
  const filters = $$('.filter');
  const cards = $$('.project-card');
  const projectGrid = $('#project-grid');
  filters.forEach(button => button.addEventListener('click', () => {
    if (button.classList.contains('is-active')) return;
    const before = new Map();
    cards.forEach(card => {
      card.getAnimations().forEach(animation => animation.cancel());
      if (!card.hidden) before.set(card, card.getBoundingClientRect());
    });
    const category = button.dataset.filter;
    let count = 0;
    cards.forEach(card => {
      card.hidden = category !== 'all' && card.dataset.category !== category;
      if (!card.hidden) { count += 1; card.classList.add('is-revealed'); }
    });
    filters.forEach(filter => {
      const active = filter === button;
      filter.classList.toggle('is-active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    $('#work-count').textContent = String(count).padStart(2, '0') + ' projects';
    // Read every new position together, then issue transform-only animations.
    const after = cards.filter(card => !card.hidden).map(card => [card, card.getBoundingClientRect()]);
    if (motionEnabled) after.forEach(([card, rect], index) => {
      const old = before.get(card);
      const x = old ? old.left - rect.left : 0;
      const y = old ? old.top - rect.top : 20;
      card.animate([
        { transform: `translate3d(${x}px,${y}px,0)`, opacity: old ? 1 : 0 },
        { transform: 'translate3d(0,0,0)', opacity: 1 }
      ], { duration: 580, delay: Math.min(index * 35, 140), easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    });
    document.dispatchEvent(new Event('portfolio:layout'));
  }));

  // Thumbnails belong to the exact YouTube videos in the supplied portfolio.
  // Editorial title cards remain visible if a thumbnail is unavailable.
  function loadThumbnail(image) {
    if (image.dataset.requested) return;
    image.dataset.requested = 'true';
    const id = image.dataset.thumbnail;
    const sources = [
      image.dataset.localThumbnail,
      `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    ].filter(Boolean);
    let index = 0;
    function next() {
      if (index < sources.length) image.src = sources[index++];
      else {
        image.onload = image.onerror = null;
        image.removeAttribute('src');
        image.hidden = true;
      }
    }
    image.onload = () => {
      // YouTube sometimes returns a 120px placeholder with HTTP 200.
      if (image.naturalWidth < 300) { next(); return; }
      image.classList.add('is-loaded');
      image.closest('.project-visual').classList.add('has-thumbnail');
      image.onload = image.onerror = null;
    };
    image.onerror = next;
    next();
  }
  if ('IntersectionObserver' in window) {
    const thumbnailObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadThumbnail(entry.target);
          thumbnailObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '400px 0px' });
    $$('[data-thumbnail]').forEach(image => thumbnailObserver.observe(image));
  } else $$('[data-thumbnail]').forEach(loadThumbnail);

  // A click-to-load screening room; closing it removes the player and its audio.
  const dialog = $('#project-dialog');
  const videoMount = $('#video-mount');
  let currentProject = 'showreel';
  let returnFocus = null;
  function stopCurrentVideo() {
    const video = videoMount.querySelector("video");
    if (!video) return;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
  function showProject(key, trigger) {
    const project = projectData[key];
    if (!project || typeof dialog.showModal !== 'function') return false;
    currentProject = key;
    if (trigger) returnFocus = trigger;
    const vertical = project.ratio === '9:16';
    dialog.classList.toggle('is-vertical', vertical);
    $('#dialog-format').textContent = project.format || 'Showreel / 2026';
    $('#dialog-role').textContent = project.role;
    $('#dialog-title').textContent = project.title;
    $('#dialog-description').textContent = project.description;
    $('#dialog-details').textContent = project.details;
    $('#dialog-details').hidden = !project.details;
    $('#dialog-position').textContent = `${String(projectOrder.indexOf(key) + 1).padStart(2, '0')} / ${String(projectOrder.length).padStart(2, '0')}`;
    const tags = $('#dialog-tags');
    tags.replaceChildren(...project.tags.map(tag => {
      const span = document.createElement('span');
      span.textContent = tag;
      return span;
    }));
    stopCurrentVideo();
    const fallback = $('#video-fallback');
    let nativeVideo = null;
    if (project.nativeSrc) {
      nativeVideo = document.createElement('video');
      nativeVideo.controls = true;
      nativeVideo.playsInline = true;
      nativeVideo.setAttribute('playsinline', '');
      nativeVideo.preload = 'none';
      nativeVideo.poster = project.poster || '';
      nativeVideo.setAttribute('aria-label', `${project.title} - video player`);
      nativeVideo.tabIndex = 0;
      nativeVideo.src = project.nativeSrc;
      videoMount.replaceChildren(nativeVideo);
      fallback.href = project.nativeSrc;
      fallback.firstChild.textContent = 'Video not loading? Open MP4 ';
    } else {
      const watchUrl = `https://www.youtube.com/watch?v=${project.id}`;
      $('#video-fallback').href = watchUrl;
      const iframe = document.createElement('iframe');
      const params = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0' });
      // An HTTPS origin is available on deployment, but not for file:// previews.
      if (/^https?:$/.test(location.protocol)) params.set('origin', location.origin);
      const embedHost = key === 'showreel' ? 'https://www.youtube.com' : 'https://www.youtube-nocookie.com';
      iframe.src = `${embedHost}/embed/${project.id}?${params}`;
      iframe.title = `${project.title} - video player`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      videoMount.replaceChildren(iframe);
      fallback.firstChild.textContent = 'Video not loading? Watch on YouTube ';
    }
    if (!dialog.open) {
      closeMenu();
      dialog.showModal();
      root.classList.add('screening');
      broadcastMotion();
      if (motionEnabled) dialog.animate([
        { opacity: 0, transform: 'translateY(20px) scale(.98)' },
        { opacity: 1, transform: 'none' }
      ], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
      document.body.classList.add('dialog-open');
      $('#dialog-close').focus({ preventScroll: true });
    }
    dialog.scrollTop = 0;
    // Playback follows this intentional click; controls remain usable if blocked.
    if (nativeVideo) nativeVideo.play().catch(() => {});
    return true;
  }
  $$('.js-video').forEach(link => link.addEventListener('click', event => {
    // Preserve open-in-new-tab and modified-link behavior.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (showProject(link.dataset.project, link)) event.preventDefault();
  }));
  $('#dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    stopCurrentVideo();
    videoMount.replaceChildren();
    document.body.classList.remove('dialog-open');
    root.classList.remove('screening');
    broadcastMotion();
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  function stepProject(direction) {
    const index = (projectOrder.indexOf(currentProject) + direction + projectOrder.length) % projectOrder.length;
    showProject(projectOrder[index]);
  }
  $('#prev-project').addEventListener('click', () => stepProject(-1));
  $('#next-project').addEventListener('click', () => stepProject(1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const stops = $$('button:not([disabled]), a[href], iframe, video[controls], [tabindex]:not([tabindex="-1"])', dialog)
        .filter(element => element.getClientRects().length > 0);
      const first = stops[0], last = stops[stops.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
    // Preserve native seeking, volume, and fullscreen keyboard controls.
    if (event.target.closest('iframe, video, input, select, textarea')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); stepProject(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); stepProject(1); }
  });

  // Explicit touch/pen feedback; native link activation and scrolling stay intact.
  $$('.contact-card--whatsapp, .contact-card--instagram').forEach(card => {
    const clearPress = () => card.classList.remove('is-pressed');
    card.addEventListener('pointerdown', event => {
      if (event.button === 0 && (event.pointerType === 'touch' || event.pointerType === 'pen')) card.classList.add('is-pressed');
    });
    ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach(type => card.addEventListener(type, clearPress));
    window.addEventListener('pagehide', clearPress);
  });

  // No pretend form submission: direct contact links and a working copy action.
  const email = 'tariqbarqawi71@gmail.com';
  let copyTimeout;
  $('#copy-email').addEventListener('click', async () => {
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(email);
        copied = true;
      }
    } catch (_) { /* Continue to the local-file-compatible fallback. */ }
    if (!copied) {
      const area = document.createElement('textarea');
      area.value = email;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
      document.body.appendChild(area);
      area.select();
      try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
      area.remove();
      $('#copy-email').focus({ preventScroll: true });
    }
    $('#copy-status').textContent = copied ? 'Email address copied.' : 'Select the email address above to copy it.';
    clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => { $('#copy-status').textContent = ''; }, 5000);
  });
  $('#year').textContent = String(new Date().getFullYear());

  // Scroll work is scheduled only in response to input or an actual layout change.
  // Document height is cached: no full-document measurement inside a running loop.
  const header = $('#site-header');
  const progress = $('#reading-progress');
  let scrollFrame = 0, scrollRange = 1, wasScrolled = false;
  function updateScroll() {
    scrollFrame = 0;
    const y = window.scrollY;
    progress.style.transform = `scaleX(${Math.min(1, Math.max(0, y / scrollRange))})`;
    const scrolled = y > 36;
    if (scrolled !== wasScrolled) { header.classList.toggle('is-scrolled', scrolled); wasScrolled = scrolled; }
  }
  function queueScroll() { if (!scrollFrame) scrollFrame = scheduleFrame(updateScroll); }
  function measureDocument() {
    scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    queueScroll();
  }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', measureDocument, { passive: true });
  document.addEventListener('portfolio:layout', measureDocument);
  if ('ResizeObserver' in window) new ResizeObserver(measureDocument).observe(document.body);
  measureDocument();

  // Add the enhancement class only after the observer has been constructed.
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        reveals.unobserve(entry.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -5% 0px' });
    $$('[data-reveal]').forEach(element => reveals.observe(element));
    if (motionEnabled) root.classList.add('motion-ready');
    const band = $('.discipline-band');
    new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('in-view', entry.isIntersecting));
    }).observe(band);
    const links = $$('.desktop-nav a');
    const navigationObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-24% 0px -60% 0px', threshold: 0 });
    [$('#top'), $('#work'), $('#photography'), $('#about'), $('#experience'), $('#contact')].filter(Boolean).forEach(section => navigationObserver.observe(section));
  }

  // One motion switch controls the scene, type ribbon and decorative interactions.
  const motionButton = $('#motion-toggle');
  motionButton.hidden = false;
  function syncMotionPreference() {
    motionEnabled = !motionPreference.matches && !manuallyPaused;
    root.classList.toggle('motion-paused', !motionEnabled);
    motionButton.setAttribute('aria-pressed', String(!motionEnabled));
    motionButton.disabled = motionPreference.matches;
    const label = motionPreference.matches ? 'Animations off: reduced motion is enabled in your system' :
      motionEnabled ? 'Pause animations' : 'Resume animations';
    motionButton.setAttribute('aria-label', label);
    motionButton.title = label;
    broadcastMotion();
  }
  motionButton.addEventListener('click', () => {
    manuallyPaused = !manuallyPaused;
    try { sessionStorage.setItem('tarix-motion-paused', manuallyPaused ? '1' : '0'); } catch (_) {}
    syncMotionPreference();
  });
  motionPreference.addEventListener('change', syncMotionPreference);
  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('page-hidden', document.hidden);
    broadcastMotion();
  });
  syncMotionPreference();
  root.classList.toggle('page-hidden', document.hidden);

  // Magnetic details are bounded to 5px, only on fine pointers. The separate focus cursor is event-driven.
  // Rectangles are cached at pointer entry; animation stops when it settles.
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  (() => {
    let raf = 0, last = 0;
    const active = new Set();
    const magnets = [];
    function tick(now) {
      raf = 0;
      const dt = Math.min(34, now - last || 16.7); last = now;
      const ease = 1 - Math.exp(-dt * .017);
      active.forEach(state => {
        state.x += (state.tx - state.x) * ease;
        state.y += (state.ty - state.y) * ease;
        state.element.style.transform = `translate3d(${state.x.toFixed(2)}px,${state.y.toFixed(2)}px,0)`;
        if (Math.abs(state.tx - state.x) + Math.abs(state.ty - state.y) < .06) {
          if (state.tx === 0 && state.ty === 0) {
            state.element.style.transform = '';
            state.element.classList.remove('pointer-active');
          }
          active.delete(state);
        }
      });
      if (active.size && canMove()) raf = scheduleFrame(tick);
    }
    function wake(state) {
      active.add(state);
      state.element.classList.add('pointer-active');
      if (!raf && canMove()) { last = performance.now(); raf = scheduleFrame(tick); }
    }
    $$('[data-magnetic]').forEach(element => {
      const state = { element, rect: null, x: 0, y: 0, tx: 0, ty: 0 };
      const target = element.closest('a') || element;
      magnets.push(state);
      target.addEventListener('pointerenter', () => { state.rect = target.getBoundingClientRect(); });
      target.addEventListener('pointermove', event => {
        if (!canMove() || !finePointer.matches || event.pointerType !== 'mouse') return;
        if (!state.rect) state.rect = target.getBoundingClientRect();
        state.tx = Math.max(-5, Math.min(5, (event.clientX - state.rect.left - state.rect.width / 2) * .09));
        state.ty = Math.max(-5, Math.min(5, (event.clientY - state.rect.top - state.rect.height / 2) * .12));
        wake(state);
      }, { passive: true });
      target.addEventListener('pointerleave', () => { state.tx = state.ty = 0; wake(state); });
    });
    function reset() {
      if (raf) cancelFrame(raf);
      raf = 0; active.clear();
      magnets.forEach(state => {
        state.x = state.y = state.tx = state.ty = 0; state.rect = null;
        state.element.style.transform = ''; state.element.classList.remove('pointer-active');
      });
    }
    motionListeners.add(() => { if (!canMove()) reset(); });
    finePointer.addEventListener('change', reset);
    document.addEventListener('portfolio:layout', reset);
    window.addEventListener('resize', reset, { passive: true });
  })();


  // RECORDING UI / local elapsed time, not a recording or analytics feature.
  // Count foreground time using a monotonic clock, not interval increments.
  // Pausing the decorative effects never pauses this timer.
  (() => {
    const clock = $('#session-clock');
    if (!clock) return;
    let accumulated = 0, visibleSince = document.hidden ? null : performance.now();
    let timeout = 0, suspended = false;
    const pad = value => String(value).padStart(2, '0');
    function elapsed() { return accumulated + (visibleSince === null ? 0 : performance.now() - visibleSince); }
    function paint() {
      clearTimeout(timeout); timeout = 0;
      const ms = elapsed();
      const seconds = Math.floor(ms / 1000);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor(seconds / 60) % 60;
      clock.textContent = (hours ? pad(hours) + ':' : '') + pad(minutes) + ':' + pad(seconds % 60);
      clock.dateTime = 'PT' + seconds + 'S';
      if (visibleSince !== null) timeout = setTimeout(paint, 1000 - ms % 1000 + 6);
    }
    function syncClock() {
      const visible = !document.hidden && !suspended;
      if (!visible && visibleSince !== null) {
        accumulated += performance.now() - visibleSince;
        visibleSince = null;
      } else if (visible && visibleSince === null) visibleSince = performance.now();
      paint();
    }
    document.addEventListener('visibilitychange', syncClock);
    window.addEventListener('pagehide', () => { suspended = true; syncClock(); });
    window.addEventListener('pageshow', () => { suspended = false; syncClock(); });
    paint();
  })();

  // Shared scroll choreography. Three small CSS-3D props augment, rather than
  // replace, the gold model. Rotation and translation are explicit functions
  // of actual native scroll position; there is no virtual scroll engine.
  const stageMotion = { orbit: 0 };
  (() => {
    const scene = $('#hero-art');
    const hero = $('#top');
    const fallback = $('#sculpture-fallback');
    const flashButton = $('#flash-toggle');
    const camera = $('#camera-prop');
    const cameraRig = $('.camera-rig');
    const indicator = $('#scene-scrub-indicator');
    const readout = $('#scene-orbit-readout');
    const props = [
      { element: $('#blender-prop'), x: 14, y: -18, rz: -12, ry: -22, phase: 0, spin: 0, targetSpin: 0, spinAxis: 'z' },
      { element: $('#ae-prop'), x: -12, y: 16, rz: 12, ry: -24, phase: 2.1, spin: 0, targetSpin: 0 },
      { element: camera, x: -10, y: -12, rz: -9, ry: -22, phase: 4.3, spin: 0, targetSpin: 0 }
    ];
    props.forEach(prop => { prop.rig = $('.prop-rig', prop.element); });
    let autoFlash = true;
    try { autoFlash = sessionStorage.getItem('tarix-flash-off') !== '1'; } catch (_) {}
    let visible = true, suspended = false, frame = 0, last = 0, lastPaint = 0;
    let activeTime = 0, nextFlash = 2900, lastFlash = -10000, flashTimeout = 0;
    let targetOrbit = 0, heroSpan = 1, compact = false, lastDegree = -1;
    let targetPointerX = 0, targetPointerY = 0, pointerX = 0, pointerY = 0;
    const debug = { active: false, frames: 0, flashes: 0, orbit: 0, visible: true, autoFlash: true };
    Object.defineProperty(window, '__tarixStudio', { value: debug, configurable: true });
    function running() { return visible && !suspended && canMove(); }
    function measure() {
      heroSpan = Math.max(1, hero.offsetHeight);
      compact = window.innerWidth < 650;
      readScroll();
    }
    function readScroll() { targetOrbit = Math.max(0, Math.min(1.4, window.scrollY / heroSpan)); }
    function clearFlash() {
      clearTimeout(flashTimeout); flashTimeout = 0;
      cameraRig.classList.remove('is-flashing');
    }
    function flash(manual = false) {
      const now = performance.now();
      // No full-screen or rapid repeated flash, even on repeated clicks.
      if (!running() || !autoFlash || now - lastFlash < 1500) return;
      lastFlash = now; debug.flashes++;
      document.dispatchEvent(new CustomEvent('portfolio:flash', { detail: { manual } }));
      cameraRig.classList.add('is-flashing');
      clearTimeout(flashTimeout);
      flashTimeout = setTimeout(clearFlash, 480);
      nextFlash = activeTime + 4200;
    }
    function syncControls() {
      const allowed = autoFlash && motionEnabled;
      flashButton.setAttribute('aria-pressed', String(allowed));
      $('span', flashButton).textContent = allowed ? 'Flash on' : 'Flash off';
      flashButton.disabled = !motionEnabled;
      const label = !motionEnabled ? 'Flashes disabled while motion is off' : allowed ? 'Disable camera flashes' : 'Enable camera flashes';
      flashButton.setAttribute('aria-label', label);
      flashButton.title = label;
      camera.disabled = !allowed;
      props.slice(0, 2).forEach(prop => { prop.element.disabled = !motionEnabled; });
      debug.autoFlash = allowed;
      if (!allowed) clearFlash();
    }
    flashButton.addEventListener('click', () => {
      autoFlash = !autoFlash;
      try { sessionStorage.setItem('tarix-flash-off', autoFlash ? '0' : '1'); } catch (_) {}
      nextFlash = activeTime + 2300;
      syncControls();
    });
    camera.addEventListener('click', () => flash(true));
    props.slice(0, 2).forEach(prop => prop.element.addEventListener('click', () => {
      if (running()) prop.targetSpin += 360;
    }));
    function pose(dt) {
      const ease = 1 - Math.exp(-dt * .011);
      stageMotion.orbit += (targetOrbit - stageMotion.orbit) * ease;
      pointerX += (targetPointerX - pointerX) * ease;
      pointerY += (targetPointerY - pointerY) * ease;
      const orbit = stageMotion.orbit, t = activeTime * .001;
      const amp = compact ? .56 : 1;
      props.forEach((prop, index) => {
        prop.spin += (prop.targetSpin - prop.spin) * (1 - Math.exp(-dt * .0048));
        if (Math.abs(prop.targetSpin - prop.spin) < .01) prop.spin = prop.targetSpin;
        const x = (Math.sin(t * .51 + prop.phase) * 6 + pointerX * (9 + index * 2) + orbit * prop.x * 2) * amp;
        const y = (Math.cos(t * .43 + prop.phase) * 8 + pointerY * 7 + orbit * prop.y * 2.2) * amp;
        const rx = 10 + Math.sin(t * .38 + prop.phase) * 6 - pointerY * 7 + orbit * (index === 1 ? -20 : 28);
        // Roll Blender around its face: preserve the SVG depth rig and floating
        // tilt without exposing the incomplete edge/back during a click turn.
        const ry = prop.ry + Math.sin(t * .34 + prop.phase) * 14 + pointerX * 14 + orbit * (index === 1 ? -54 : 62) + (prop.spinAxis === 'z' ? 0 : prop.spin);
        const rz = prop.rz + Math.sin(t * .29 + prop.phase) * 5 + orbit * (index === 2 ? 30 : -18) + (prop.spinAxis === 'z' ? prop.spin : 0);
        prop.element.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px),calc(-50% + ${y.toFixed(2)}px),0)`;
        prop.rig.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
      });
      // Same lightweight movement for the pre-rendered no-WebGL model.
      if (!fallback.hidden) {
        fallback.style.transform = `translate3d(${(orbit * -22).toFixed(2)}px,${(orbit * -30 + Math.sin(t * .42) * 4).toFixed(2)}px,0) rotate(${(orbit * 43).toFixed(2)}deg) scale(${(.79 - orbit * .08).toFixed(3)})`;
      }
      const degree = Math.round(orbit * 120);
      if (degree !== lastDegree) {
        lastDegree = degree;
        readout.textContent = String(degree).padStart(3, '0') + '\u00b0';
        indicator.style.transform = `scaleX(${Math.max(.04, Math.min(1, orbit)).toFixed(3)})`;
      }
      debug.orbit = orbit;
    }
    function tick(now) {
      frame = 0;
      if (!running()) { debug.active = false; return; }
      if (now - lastPaint >= 15.5) {
        const dt = Math.min(42, now - last || 16.7);
        last = lastPaint = now;
        activeTime += dt;
        pose(dt);
        if (autoFlash && activeTime >= nextFlash) flash();
        debug.frames++;
      }
      debug.active = true;
      frame = scheduleFrame(tick);
    }
    function sync() {
      if (frame) cancelFrame(frame);
      frame = 0; debug.active = false;
      syncControls();
      if (running()) {
        last = lastPaint = performance.now();
        frame = scheduleFrame(tick); debug.active = true;
      } else clearFlash();
    }
    window.addEventListener('scroll', readScroll, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    document.addEventListener('portfolio:layout', measure);
    window.addEventListener('pointermove', event => {
      if (!running() || event.pointerType !== 'mouse') return;
      targetPointerX = (event.clientX / window.innerWidth - .5) * 2;
      targetPointerY = (event.clientY / window.innerHeight - .5) * 2;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { targetPointerX = targetPointerY = 0; });
    window.addEventListener('pagehide', () => { suspended = true; sync(); });
    window.addEventListener('pageshow', () => { suspended = false; sync(); });
    motionListeners.add(sync);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting; debug.visible = visible;
      sync();
    }).observe(scene);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(hero);
    measure(); pose(0); sync();
  })();

  // A precise point + eased focus ring. Its animation loop sleeps at rest.
  // Native cursor is automatically restored for video dialogs, text fields,
  // reduced motion, touch input, hidden tabs and the master pause switch.
  (() => {
    const cursor = $('#studio-cursor'), point = $('#cursor-point'), label = $('#cursor-label');
    const mouseAvailable = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
    let active = false, raf = 0, last = 0, x = 0, y = 0, tx = 0, ty = 0;
    const debug = { active: false, running: false, frames: 0 };
    Object.defineProperty(window, '__tarixCursor', { value: debug, configurable: true });
    function hide() {
      active = false; debug.active = debug.running = false;
      root.classList.remove('cursor-active');
      cursor.classList.remove('is-down');
      if (raf) cancelFrame(raf);
      raf = 0;
    }
    function paint() {
      cursor.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
    }
    function tick(now) {
      raf = 0;
      if (!active || !canMove()) { hide(); return; }
      const dt = Math.min(42, now - last || 16.7); last = now;
      const ease = 1 - Math.exp(-dt * .024);
      x += (tx - x) * ease; y += (ty - y) * ease;
      paint(); debug.frames++;
      if (Math.abs(tx - x) + Math.abs(ty - y) > .1) {
        raf = scheduleFrame(tick); debug.running = true;
      } else { x = tx; y = ty; paint(); debug.running = false; }
    }
    function context(target) {
      if (!(target instanceof Element)) return;
      root.classList.toggle('cursor-dark', !!target.closest('.hero, .contact, .discipline-band, .showreel-banner, .project-visual, .site-header:not(.is-scrolled)'));
      const item = target.closest('a, button, [data-cursor]');
      const valid = item && !item.disabled;
      const text = valid ? (item.dataset.cursor || '') : '';
      cursor.classList.toggle('is-hot', !!valid);
      cursor.classList.toggle('has-label', !!text);
      label.textContent = text;
    }
    document.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !mouseAvailable.matches || !canMove()) { hide(); return; }
      const target = event.target;
      if (target instanceof Element && target.closest('iframe, dialog, input, textarea, select, [contenteditable="true"]')) { hide(); return; }
      tx = event.clientX; ty = event.clientY;
      point.style.transform = `translate3d(${tx}px,${ty}px,0)`;
      if (!active) {
        x = tx; y = ty; paint();
        active = true; debug.active = true;
        root.classList.add('cursor-active');
      }
      context(target);
      if (!raf) { last = performance.now(); raf = scheduleFrame(tick); debug.running = true; }
    }, { passive: true });
    document.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse') { hide(); return; }
      if (active) cursor.classList.add('is-down');
    }, { passive: true });
    document.addEventListener('pointerup', () => cursor.classList.remove('is-down'), { passive: true });
    document.addEventListener('pointercancel', hide);
    document.documentElement.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    window.addEventListener('pagehide', hide);
    document.addEventListener('keydown', event => { if (event.key === 'Tab') hide(); });
    window.addEventListener('scroll', () => { if (active) context(document.elementFromPoint(tx, ty)); }, { passive: true });
    mouseAvailable.addEventListener('change', hide);
    motionListeners.add(() => { if (!canMove()) hide(); });
  })();

  // CINEMATIC CHOREOGRAPHY / native scrolling, cached bounds, shared RAF.
  // Below-fold CSS 3D objects use finite depth layers; no second GPU renderer.
  (() => {
    const reel = $('.portrait-reel');
    const archive = $('#work'), wrap = $('#wrap-scene');
    const strips = $$('.archive-filmstrip');
    const aperture = $('.archive-aperture');
    const titleLines = $$('.wrap-title-line > span');
    const timecode = $('.archive-timecode');
    const cinemaProps = [
      { element: $('.archive-reel'), rx: 22, ry: -25, rz: -14, scroll: 110, phase: 0, zone: 'archive' },
      { element: $('.archive-lens'), rx: 16, ry: -28, rz: -12, scroll: -58, phase: 1, zone: 'archive' },
      { element: $('.wrap-lens'), rx: 20, ry: -34, rz: -18, scroll: 48, phase: 1.4, zone: 'wrap' },
      { element: $('.wrap-clapper'), rx: -8, ry: -22, rz: 13, scroll: -32, phase: 2.8, zone: 'wrap' },
      { element: $('.wrap-reel'), rx: 23, ry: -24, rz: -25, scroll: 145, phase: 4, zone: 'wrap' }
    ];
    cinemaProps.forEach(prop => { prop.rig = $('.film-object-rig',prop.element); });
    const clapperBar = $('.wrap-clapper .clapper-bar');
    const visibility = { reel: false, archive: false, wrap: false };
    const bounds = { archiveTop: 0, archiveHeight: 1, wrapTop: 0, wrapHeight: 1, vh: 1 };
    let frame = 0, last = 0, activeTime = 0, pointerX = 0, pointerY = 0;
    let reelX = 0, reelY = 0, targetReelX = 0, targetReelY = 0, reelBounds = null;
    let scrollY = window.scrollY, suspended = false, lastCounter = -1;
    const tiltStates = $$('[data-tilt]').map(element => ({ element, rect: null, x: 0, y: 0, tx: 0, ty: 0 }));
    const debug = { active: false, frames: 0, archiveProgress: 0, wrapProgress: 0, titleReveal: 1 };
    Object.defineProperty(window,'__tarixCinematic',{value:debug});
    const clamp = value => Math.max(0,Math.min(1,value));
    function measure() {
      const a = archive.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      bounds.archiveTop = a.top + window.scrollY; bounds.archiveHeight = a.height;
      bounds.wrapTop = w.top + window.scrollY; bounds.wrapHeight = w.height;
      bounds.vh = window.innerHeight;
      reelBounds = null;
      tiltStates.forEach(state => { state.rect = null; });
      scrollY = window.scrollY;
      if (!canMove()) pose(0,true);
    }
    function settling() {
      return tiltStates.some(state => Math.abs(state.tx-state.x)+Math.abs(state.ty-state.y)>.04);
    }
    function running() { return canMove() && !suspended && (visibility.reel || visibility.archive || visibility.wrap || settling()); }
    function pose(dt,still=false) {
      const ease = still ? 1 : 1-Math.exp(-dt*.013);
      const t = still ? 0 : activeTime*.001;
      const archiveProgress = clamp((scrollY + bounds.vh*.7 - bounds.archiveTop) / (bounds.archiveHeight + bounds.vh*.7));
      const wrapProgress = clamp((scrollY + bounds.vh*.7 - bounds.wrapTop) / (bounds.wrapHeight + bounds.vh*.35));
      const reveal = still ? 1 : clamp((scrollY + bounds.vh*.78 - bounds.wrapTop) / (bounds.vh*.72));
      if (visibility.reel || still) {
        reelX += (targetReelX-reelX)*ease; reelY += (targetReelY-reelY)*ease;
        reel.style.setProperty('--reel-rx',`${still ? 0 : reelX.toFixed(2)}deg`);
        reel.style.setProperty('--reel-ry',`${still ? 0 : reelY.toFixed(2)}deg`);
        reel.style.setProperty('--reel-float',`${still ? 0 : (Math.sin(t*.8)*5).toFixed(2)}px`);
      }
      if (visibility.archive || still) {
        strips[0].style.transform = `translate3d(0,${(archiveProgress*-180).toFixed(1)}px,0) rotate(${(-19+archiveProgress*7).toFixed(2)}deg)`;
        strips[1].style.transform = `translate3d(0,${(archiveProgress*220).toFixed(1)}px,0) rotate(${(14-archiveProgress*6).toFixed(2)}deg)`;
        aperture.style.transform = `rotate(${(archiveProgress*105).toFixed(1)}deg)`;
        const counter = Math.floor(archiveProgress*1680);
        if (counter !== lastCounter) {
          const seconds = Math.floor(counter/24), frames = counter%24;
          timecode.textContent = `00:${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}:${String(frames).padStart(2,'0')}`;
          lastCounter = counter;
        }
      }
      cinemaProps.forEach(prop => {
        if (!visibility[prop.zone] && !still) return;
        const p = prop.zone === 'archive' ? archiveProgress : wrapProgress;
        const small = window.innerWidth<601;
        const float = still ? 0 : Math.sin(t*.58+prop.phase)*(small ? 4 : 8);
        const drift = still ? 0 : pointerX*(small ? 0 : 5);
        prop.element.style.transform = `translate3d(calc(-50% + ${drift.toFixed(2)}px),calc(-50% + ${float.toFixed(2)}px),0)`;
        // Keep faces readable throughout. Reel spins around Z, while its
        // physical layers and both correctly oriented faces provide depth.
        const rx = prop.rx + (still ? 0 : Math.sin(t*.35+prop.phase)*4 + pointerY*3);
        const ry = prop.ry + (still ? 0 : Math.sin(t*.28+prop.phase)*7 + pointerX*5 + p*18);
        prop.rig.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${(prop.rz+p*prop.scroll).toFixed(2)}deg)`;
      });
      if (visibility.wrap || still) {
        titleLines.forEach((line,i) => {
          const r = clamp((reveal-i*.15)/.65);
          line.style.transform = `translate3d(0,${((1-r)*104).toFixed(2)}%,0)`;
          line.style.opacity = (.25+.75*r).toFixed(3);
        });
        clapperBar.style.transform = `translateZ(9px) rotateZ(${(-22+wrapProgress*18).toFixed(2)}deg)`;
      }
      tiltStates.forEach(state => {
        if (still) { state.tx = state.ty = 0; }
        state.x += (state.tx-state.x)*ease; state.y += (state.ty-state.y)*ease;
        if (Math.abs(state.x)+Math.abs(state.y)+Math.abs(state.tx)+Math.abs(state.ty)<.015) state.x=state.y=0;
        state.element.style.setProperty('--tilt-x',`${state.x.toFixed(2)}deg`);
        state.element.style.setProperty('--tilt-y',`${state.y.toFixed(2)}deg`);
      });
      debug.archiveProgress=archiveProgress;debug.wrapProgress=wrapProgress;debug.titleReveal=reveal;
    }
    function tick(now) {
      frame=0;
      if (!running()) { debug.active=false;return; }
      const dt=Math.min(42,now-last||16.7);last=now;activeTime+=dt;
      pose(dt);debug.frames++;debug.active=true;frame=scheduleFrame(tick);
    }
    function wake() { if (!frame && running()) { last=performance.now();frame=scheduleFrame(tick);debug.active=true; } }
    function sync() {
      if (frame) cancelFrame(frame);frame=0;debug.active=false;
      if (!canMove()) {
        targetReelX=targetReelY=0;tiltStates.forEach(state=>{state.tx=state.ty=0;});
        pose(0,true);
      }
      wake();
    }
    reel.addEventListener('pointerenter',()=>{reelBounds=reel.getBoundingClientRect();});
    reel.addEventListener('pointermove',event=>{
      if (!canMove() || !finePointer.matches || event.pointerType!=='mouse') return;
      if (!reelBounds) reelBounds=reel.getBoundingClientRect();
      targetReelY=((event.clientX-reelBounds.left)/reelBounds.width-.5)*12;
      targetReelX=-((event.clientY-reelBounds.top)/reelBounds.height-.5)*10;wake();
    },{passive:true});
    reel.addEventListener('pointerleave',()=>{targetReelX=targetReelY=0;wake();});
    tiltStates.forEach(state=>{
      state.element.addEventListener('pointerenter',()=>{state.rect=state.element.getBoundingClientRect();});
      state.element.addEventListener('pointermove',event=>{
        if (!canMove() || !finePointer.matches || event.pointerType!=='mouse') return;
        if (!state.rect) state.rect=state.element.getBoundingClientRect();
        const x=(event.clientX-state.rect.left)/state.rect.width,y=(event.clientY-state.rect.top)/state.rect.height;
        state.tx=(.5-y)*6;state.ty=(x-.5)*7;
        state.element.style.setProperty('--light-x',`${(x*100).toFixed(1)}%`);
        state.element.style.setProperty('--light-y',`${(y*100).toFixed(1)}%`);wake();
      },{passive:true});
      state.element.addEventListener('pointerleave',()=>{state.tx=state.ty=0;wake();});
    });
    window.addEventListener('scroll',()=>{scrollY=window.scrollY;reelBounds=null;tiltStates.forEach(s=>{s.rect=null;});wake();},{passive:true});
    window.addEventListener('pointermove',event=>{
      if (event.pointerType!=='mouse' || !finePointer.matches) return;
      pointerX=(event.clientX/window.innerWidth-.5)*2;pointerY=(event.clientY/window.innerHeight-.5)*2;
    },{passive:true});
    window.addEventListener('resize',measure,{passive:true});
    document.addEventListener('portfolio:layout',measure);
    window.addEventListener('pagehide',()=>{suspended=true;sync();});
    window.addEventListener('pageshow',()=>{suspended=false;sync();});
    motionListeners.add(sync);
    if ('IntersectionObserver' in window) {
      const elements=new Map([[$('#hero-reel'),'reel'],[archive,'archive'],[wrap,'wrap']]);
      new IntersectionObserver(entries=>{entries.forEach(entry=>{visibility[elements.get(entry.target)]=entry.isIntersecting;});wake();if(!running())sync();}).observe($('#hero-reel'));
      const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{visibility[elements.get(entry.target)]=entry.isIntersecting;});sync();});
      observer.observe(archive);observer.observe(wrap);
    } else { visibility.reel=visibility.archive=visibility.wrap=true; }
    if ('ResizeObserver' in window) { const observer=new ResizeObserver(measure);observer.observe(archive);observer.observe(wrap); }
    document.fonts.ready.then(()=>{measure();document.dispatchEvent(new Event('portfolio:layout'));});
    measure();pose(0,!canMove());sync();
  })();

  // Realtime metallic ribbon: one static mesh uploaded once, one GPU draw per
  // solid frame, no per-frame polygon sorting or object/array allocations.
  // The fallback remains in the HTML when WebGL is unavailable or disabled.
  (() => {
    const canvas = $('#motion-sculpture');
    const scene = $('#hero-art');
    const fallback = $('#sculpture-fallback');
    const viewButton = $('#view-toggle');
    const hint = $('#drag-hint');
    function loadWirePoster() {
      const image = $('.wire-poster', fallback);
      if (image && !image.getAttribute('src')) image.src = image.dataset.poster;
    }
    const debug = { orbit: 0, renderer: 'fallback', active: false, frames: 0, dpr: 1, cpuMs: 0, triangles: 0, drawCalls: 0 };
    Object.defineProperty(window, '__tarixMotion', { value: debug, configurable: true });
    let gl;
    try {
      gl = canvas.getContext('webgl', {
        alpha: true, antialias: true, depth: true, stencil: false,
        premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power'
      });
    } catch (_) {}
    if (!gl) {
      debug.reason = 'WebGL context is unavailable in this browser';
      canvas.hidden = true;
      viewButton.hidden = false;
      let posterVisible = true;
      function posterSync() { scene.classList.toggle('in-view', posterVisible && canMove()); }
      viewButton.addEventListener('click', () => {
        const wire = fallback.classList.toggle('is-wire');
        if (wire) loadWirePoster();
        viewButton.setAttribute('aria-pressed', String(wire));
        viewButton.setAttribute('aria-label', wire ? 'Show solid sculpture' : 'Show wireframe sculpture');
      });
      if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
        posterVisible = entries[0].isIntersecting; posterSync();
      }).observe(scene);
      motionListeners.add(posterSync); posterSync();
      return;
    }
    let resources = null, frame = 0, lastTime = 0, lastPaint = 0, phase = 0;
    let inView = true, contextLost = false, pageSuspended = false;
    let width = 1, height = 1, quality = 1, slowFrames = 0;
    let targetWire = 0, wire = 0;
    let dragging = false, pointerId = null, px = 0, py = 0;
    let targetX = 0, targetY = 0, dragX = 0, dragY = 0;
    let hoverX = 0, hoverY = 0, smoothHoverX = 0, smoothHoverY = 0;
    let studioTargetX = 0, studioTargetY = 0, studioX = 0, studioY = 0, studioBounds = null;
    const model = new Float32Array(9);
    const limited = (navigator.deviceMemory && navigator.deviceMemory <= 4) || window.innerWidth < 650;
    const maxDpr = limited ? 2.5 : 2;
    const pixelBudget = limited ? 1200000 : 2200000;
    const tau = Math.PI * 2;
    const rings = limited ? 128 : 192;
    const strips = limited ? 24 : 36;
    const positions = [], normals = [], uvs = [], triangles = [], wires = [];
    // Three half-twists retain the original sculptural character, now smoothly shaded.
    function surface(u, v) {
      const twist = u * 1.5;
      const radius = 1.18 + v * Math.cos(twist);
      return [radius * Math.cos(u), radius * Math.sin(u), v * Math.sin(twist)];
    }
    for (let i = 0; i <= rings; i++) {
      const u = i / rings * tau;
      for (let j = 0; j <= strips; j++) {
        const v = (j / strips - .5) * 1.14;
        const p = surface(u, v), a = surface(u + .0001, v), b = surface(u, v + .0001);
        const ax = a[0] - p[0], ay = a[1] - p[1], az = a[2] - p[2];
        const bx = b[0] - p[0], by = b[1] - p[1], bz = b[2] - p[2];
        const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        const length = Math.hypot(nx, ny, nz) || 1;
        positions.push(p[0], p[1], p[2]); normals.push(nx / length, ny / length, nz / length);
        uvs.push(i / rings, j / strips);
      }
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < strips; j++) {
        const a = i * (strips + 1) + j, b = a + strips + 1;
        triangles.push(a, b + 1, a + 1, a, b, b + 1);
        if (i % 6 === 0) wires.push(a, a + 1);
        if (j % 3 === 0 || j === strips - 1) wires.push(a, b);
      }
      const rim = i * (strips + 1) + strips;
      wires.push(rim, rim + strips + 1);
    }
    const vertexSource = `
      precision highp float;
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec2 aUV;
      uniform mat3 uModel;
      uniform float uAspect;
      uniform float uScale;
      uniform float uFloat;
      uniform vec2 uShift;
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec2 vUV;
      void main() {
        vec3 p = uModel * aPosition;
        p.y += uFloat;
        p.xy += uShift;
        vPosition = p;
        vNormal = uModel * aNormal;
        vUV = aUV;
        float w = 4.7 - p.z;
        float near = 0.1;
        float far = 20.0;
        float z = (far + near) / (far - near) * w - 2.0 * far * near / (far - near);
        gl_Position = vec4(p.x * 2.35 * uScale / uAspect, p.y * 2.35 * uScale, z, w);
      }
    `;
    const fragmentSource = `
      precision mediump float;
      uniform float uWire;
      uniform float uMode;
      uniform vec2 uStudioLight;
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec2 vUV;
      void main() {
        if (uMode > 0.5) {
          gl_FragColor = vec4(0.85, 0.72, 0.48, uWire * 0.7);
          return;
        }
        vec3 N = normalize(vNormal);
        if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(vec3(0.0, 0.0, 4.7) - vPosition);
        vec3 L = normalize(vec3(-0.8 + uStudioLight.x * 1.55, 1.0 - uStudioLight.y * 0.85, 1.4));
        vec3 L2 = normalize(vec3(1.1 - uStudioLight.x * 0.5, -0.35 + uStudioLight.y * 0.25, 0.7));
        vec3 rimLight = normalize(vec3(1.7 - uStudioLight.x * 0.6, 0.55 + uStudioLight.y * 0.4, -0.15));
        vec3 R = reflect(-V, N);
        float diffuse = max(dot(N, L), 0.0);
        float fill = max(dot(N, L2), 0.0);
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        float broad = pow(max(dot(N, normalize(L + V)), 0.0), 22.0);
        float sharp = pow(max(dot(N, normalize(L2 + V)), 0.0), 85.0);
        float softbox = smoothstep(0.45, 0.92, dot(R, normalize(vec3(-0.4 + uStudioLight.x * 0.9, 0.8 - uStudioLight.y * 0.55, 0.9))));
        float band = smoothstep(0.89, 1.0, cos(R.x * 3.8 + R.z * 2.4 + uStudioLight.x * 0.45));
        float rim = pow(max(dot(N, rimLight), 0.0), 1.8) * fresnel;
        float rib = 0.985 + 0.015 * cos(vUV.y * 360.0);
        vec3 darkGold = vec3(0.12, 0.075, 0.032);
        vec3 gold = vec3(0.77, 0.56, 0.25);
        vec3 bright = vec3(1.0, 0.91, 0.66);
        vec3 color = darkGold + gold * (diffuse * 0.88 + fill * 0.2);
        color += bright * (broad * 0.50 + sharp * 0.40 + softbox * 0.72 + band * 0.08);
        color += vec3(0.65, 0.51, 0.28) * fresnel * 0.24;
        color += vec3(0.08, 0.24, 0.38) * rim * 0.85;
        color *= rib;
        color = (color * (2.51 * color + vec3(0.03))) / (color * (2.43 * color + vec3(0.59)) + vec3(0.14));
        color = pow(clamp(color, 0.0, 1.0), vec3(0.96));
        float edge = smoothstep(0.47, 0.5, abs(vUV.y - 0.5));
        color += bright * edge * 0.04;
        gl_FragColor = vec4(color, 1.0 - uWire);
      }
    `;
    function shader(type, source) {
      const result = gl.createShader(type);
      gl.shaderSource(result, source); gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(result); gl.deleteShader(result); throw new Error(message);
      }
      return result;
    }
    function createResources() {
      const vertex = shader(gl.VERTEX_SHADER, vertexSource);
      const fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
      const program = gl.createProgram();
      gl.attachShader(program, vertex); gl.attachShader(program, fragment);
      gl.bindAttribLocation(program, 0, 'aPosition');
      gl.linkProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffers = [];
      function attribute(name, values, size) {
        const buffer = gl.createBuffer(); buffers.push(buffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
        const location = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      }
      attribute('aPosition', positions, 3);
      attribute('aNormal', normals, 3);
      attribute('aUV', uvs, 2);
      function indexBuffer(values) {
        const buffer = gl.createBuffer(); buffers.push(buffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(values), gl.STATIC_DRAW);
        return buffer;
      }
      const indices = indexBuffer(triangles), lineIndices = indexBuffer(wires);
      const uniforms = {};
      ['uModel', 'uAspect', 'uScale', 'uFloat', 'uShift', 'uWire', 'uMode', 'uStudioLight'].forEach(name => { uniforms[name] = gl.getUniformLocation(program, name); });
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      debug.renderer = 'webgl'; debug.triangles = triangles.length / 3;
      return { program, uniforms, indices, lineIndices, buffers };
    }
    function orient(x, y, z) {
      const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
      model[0] = cz * cy; model[1] = sz * cy; model[2] = -sy;
      model[3] = cz * sy * sx - sz * cx; model[4] = sz * sy * sx + cz * cx; model[5] = cy * sx;
      model[6] = cz * sy * cx + sz * sx; model[7] = sz * sy * cx - cz * sx; model[8] = cy * cx;
    }
    function draw() {
      if (!resources || contextLost || width < 2 || height < 2) return;
      const started = performance.now();
      const { uniforms } = resources;
      const orbit = stageMotion.orbit;
      orient(.76 + Math.sin(phase * .56) * .12 + dragY + smoothHoverY + orbit * .72,
        -.32 + Math.sin(phase * .44) * .29 + dragX + smoothHoverX + orbit * 1.25,
        -.43 + phase * .19 + orbit * .48);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix3fv(uniforms.uModel, false, model);
      gl.uniform1f(uniforms.uAspect, width / height);
      gl.uniform1f(uniforms.uScale, Math.min(1, width / height) * (.75 - Math.min(orbit, 1) * .07));
      gl.uniform2f(uniforms.uShift, -orbit * .22, orbit * .28);
      gl.uniform1f(uniforms.uFloat, Math.sin(phase * .7) * .025);
      gl.uniform1f(uniforms.uWire, wire);
      const lightX = !canMove() ? 0 : studioX;
      const lightY = !canMove() ? 0 : studioY;
      gl.uniform2f(uniforms.uStudioLight, lightX, lightY);
      debug.studioLight = [lightX, lightY];
      scene.style.setProperty('--studio-x', `${(40 + lightX * 18).toFixed(2)}%`);
      scene.style.setProperty('--studio-y', `${(35 + lightY * 16).toFixed(2)}%`);
      scene.style.setProperty('--rim-x', `${(77 - lightX * 10).toFixed(2)}%`);
      let calls = 0;
      if (wire < .999) {
        gl.enable(gl.DEPTH_TEST);
        gl.uniform1f(uniforms.uMode, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, resources.indices);
        gl.drawElements(gl.TRIANGLES, triangles.length, gl.UNSIGNED_SHORT, 0); calls++;
      }
      if (wire > .001) {
        gl.disable(gl.DEPTH_TEST);
        gl.uniform1f(uniforms.uMode, 1);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, resources.lineIndices);
        gl.drawElements(gl.LINES, wires.length, gl.UNSIGNED_SHORT, 0); calls++;
      }
      debug.orbit = orbit; debug.frames++; debug.drawCalls = calls; debug.cpuMs = performance.now() - started;
    }
    function running() { return canMove() && inView && !contextLost && !pageSuspended && resources; }
    function stop() {
      if (frame) cancelFrame(frame);
      frame = 0; debug.active = false;
    }
    function tick(now) {
      frame = 0;
      if (!running()) { debug.active = false; return; }
      // 60fps ceiling for this decorative scene; page scrolling remains native
      // and uses the display's refresh rate. Never catch up after suspension.
      const paintDelta = now - lastPaint;
      if (paintDelta >= 15.5) {
        const dt = Math.min(42, now - lastTime || 16.7);
        lastTime = now; lastPaint = now;
        const easing = 1 - Math.exp(-dt * .009);
        phase += dt * .00030;
        dragX += (targetX - dragX) * easing;
        dragY += (targetY - dragY) * easing;
        smoothHoverX += (hoverX - smoothHoverX) * easing;
        smoothHoverY += (hoverY - smoothHoverY) * easing;
        if (!finePointer.matches) {
          studioTargetX = Math.sin(stageMotion.orbit * 2.4) * .72;
          studioTargetY = Math.sin(stageMotion.orbit * 1.6) * .38;
        }
        studioX += (studioTargetX - studioX) * easing;
        studioY += (studioTargetY - studioY) * easing;
        wire += (targetWire - wire) * (1 - Math.exp(-dt * .007));
        if (Math.abs(targetWire - wire) < .001) wire = targetWire;
        draw();
        // Sustained slow frames reduce resolution, never increase loop workload.
        if (paintDelta > 28) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
        // Preserve a sharp mobile drawing buffer. Only sustained < 20fps
        // warrants a small reduction, and never below 2x on high-DPI phones.
        if (slowFrames > 90 && paintDelta > 50 && quality > .8) {
          quality = Math.max(.8, quality * .9); slowFrames = 0; resize();
        }
      }
      debug.active = true;
      frame = scheduleFrame(tick);
    }
    function sync() {
      stop();
      scene.classList.toggle('in-view', !!running());
      if (running()) { lastTime = lastPaint = performance.now(); frame = scheduleFrame(tick); debug.active = true; }
    }
    function resize() {
      // ResizeObserver calls this only for actual size changes, not pointer moves.
      const rect = scene.getBoundingClientRect();
      studioBounds = rect;
      width = rect.width; height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr,
        Math.sqrt(pixelBudget / Math.max(1, width * height))) * quality;
      const w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
      }
      debug.dpr = dpr;
      if (!document.hidden && inView) draw();
    }
    function fallbackMode() {
      stop(); canvas.hidden = true; fallback.hidden = false;
      viewButton.hidden = false; hint.hidden = true;
      if (targetWire) loadWirePoster();
      debug.renderer = 'fallback';
    }
    viewButton.addEventListener('click', () => {
      targetWire = targetWire ? 0 : 1;
      fallback.classList.toggle('is-wire', !!targetWire);
      if (targetWire && !fallback.hidden) loadWirePoster();
      viewButton.setAttribute('aria-pressed', String(!!targetWire));
      viewButton.setAttribute('aria-label', targetWire ? 'Show solid sculpture' : 'Show wireframe sculpture');
      if (!running()) { wire = targetWire; draw(); }
    });
    // Intentional mouse drag; touch is never captured, so vertical scrolling works.
    canvas.addEventListener('pointerdown', event => {
      if (!motionEnabled || event.pointerType !== 'mouse' || event.button !== 0) return;
      dragging = true; pointerId = event.pointerId; px = event.clientX; py = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!motionEnabled || event.pointerType !== 'mouse') return;
      if (dragging) {
        targetX += (event.clientX - px) * .005;
        targetY = Math.max(-1.2, Math.min(1.2, targetY + (event.clientY - py) * .005));
        px = event.clientX; py = event.clientY;
      } else {
        hoverX = ((event.offsetX / width) - .5) * .15;
        hoverY = ((event.offsetY / height) - .5) * .1;
      }
    }, { passive: true });
    function release() {
      dragging = false;
      if (pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      pointerId = null;
    }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', () => { dragging = false; });
    canvas.addEventListener('pointerleave', () => { if (!dragging) hoverX = hoverY = 0; });
    // Material lights respond across the whole studio, independently of drag/mesh orientation.
    scene.addEventListener('pointermove', event => {
      if (!canMove() || !finePointer.matches || event.pointerType !== 'mouse') return;
      studioBounds ||= scene.getBoundingClientRect();
      studioTargetX = Math.max(-1, Math.min(1, (event.clientX - studioBounds.left) / studioBounds.width * 2 - 1));
      studioTargetY = Math.max(-1, Math.min(1, (event.clientY - studioBounds.top) / studioBounds.height * 2 - 1));
    }, { passive: true });
    scene.addEventListener('pointerleave', () => { studioTargetX = studioTargetY = 0; });
    window.addEventListener('scroll', () => { studioBounds = null; }, { passive: true });
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); contextLost = true; release(); fallbackMode();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      try {
        contextLost = false; resources = createResources();
        canvas.hidden = false; fallback.hidden = true; viewButton.hidden = false; hint.hidden = false;
        resize(); sync();
      } catch (_) { fallbackMode(); }
    });
    motionListeners.add(sync);
    window.addEventListener('pagehide', () => { pageSuspended = true; stop(); });
    window.addEventListener('pageshow', () => { pageSuspended = false; sync(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting; sync();
    }, { threshold: 0 }).observe(scene);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(scene);
    else window.addEventListener('resize', resize, { passive: true });
    try {
      resources = createResources();
      canvas.hidden = false; fallback.hidden = true; viewButton.hidden = false; hint.hidden = false;
      resize(); sync();
    } catch (error) { debug.reason = String(error.message || error); fallbackMode(); }
  })();
  // V6 shares the existing dispatcher and motion lifecycle; no second RAF loop.
  Object.defineProperty(window, 'tarixV6Motion', { value: Object.freeze({
    scheduleFrame, cancelFrame, canMove,
    motionAllowed: () => motionEnabled && !document.hidden,
    onChange: listener => { motionListeners.add(listener); return () => motionListeners.delete(listener); },
    notify: broadcastMotion,
    layout: () => document.dispatchEvent(new Event('portfolio:layout'))
  }) });
})();
