/* Phase 1 only. Shared film and photo behavior; no app framework or idle loop. */
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const films = JSON.parse($('#films').textContent);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const time = s => [Math.floor(s/60), Math.floor(s)%60].map(n=>String(n).padStart(2,'0')).join(':');
  const dialog = $('#review-dialog');
  const body = $('#dialog-body', dialog);
  const photoLinks = $$('[data-photo]');
  let previousTrigger = null;
  let viewerIndex = -1;

  function element(tag, text, classname) {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (classname) el.className = classname;
    return el;
  }
  function addTitle(title) {
    const h2 = element('h2', title);
    h2.id = 'dialog-title';
    body.append(h2);
  }
  function showDialog(trigger) {
    if (dialog.open) return;
    previousTrigger = trigger;
    dialog.showModal();
    $('[data-close]', dialog).focus();
  }
  $('[data-close]', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    body.replaceChildren();
    viewerIndex = -1;
    previousTrigger?.focus({preventScroll: true});
    previousTrigger = null;
  });

  function filmPreview(key, trigger) {
    const film = films[key];
    if (!film || typeof dialog.showModal !== 'function') return false;
    body.replaceChildren();
    viewerIndex = -1;
    $('#dialog-kicker').textContent = film.ratio + ' · Screening notes';
    const img = element('img', '', 'dialog-media');
    img.alt = 'Still from ' + film.title;
    img.src = film.poster;
    const [w,h] = film.ratio === '9:16' ? [405,720] : [640,360];
    img.width = w;
    img.height = h;
    body.append(img);
    addTitle(film.title);
    body.append(element('p', film.role, 'mono'), element('p', film.description));
    body.append(element('p',
      key === 'playthings' ? 'Playthings uses YouTube in V7 and in this review.' :
      film.watch ? 'Phase 1 uses the original YouTube link. The native MP4 is kept outside this prototype.' :
        'Phase 1 uses original frames. The native MP4 is kept outside this prototype.',
      'scan-note'));
    if (film.watch) {
      const a = element('a', 'Watch on YouTube', 'button primary');
      a.href = film.watch;
      a.target = '_blank';
      a.rel = 'noopener';
      body.append(a);
    }
    showDialog(trigger);
    return true;
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('[data-screen]');
    if (link && filmPreview(link.dataset.screen, link)) event.preventDefault();
  });
  function viewPhoto(index, trigger, focus = '') {
    const tile = photoLinks[index];
    if (!tile || typeof dialog.showModal !== 'function') return false;
    viewerIndex = index;
    body.replaceChildren();
    $('#dialog-kicker').textContent = 'Photograph ' + tile.dataset.number + ' / ' + photoLinks.length;
    const img = element('img', '', 'dialog-media');
    img.alt = tile.dataset.caption;
    img.src = tile.href;
    body.append(img);
    addTitle(tile.dataset.title);
    const caption = element('p', tile.dataset.caption);
    caption.setAttribute('aria-live', 'polite');
    body.append(caption);
    const actions = element('div', '', 'photo-controls');
    for (const [direction, label] of [[-1,'Previous frame'],[1,'Next frame']]) {
      const btn = element('button', label, 'button');
      btn.type = 'button';
      btn.dataset.direction = String(direction);
      btn.addEventListener('click', () => stepPhoto(direction, String(direction)));
      actions.append(btn);
    }
    body.append(actions);
    showDialog(trigger);
    if (focus) $(`[data-direction="${focus}"]`, actions)?.focus({preventScroll:true});
    return true;
  }
  function stepPhoto(step, focus) {
    viewPhoto((viewerIndex + step + photoLinks.length) % photoLinks.length, null, focus);
  }
  photoLinks.forEach((a, i) => a.addEventListener('click', event => {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && viewPhoto(i, a)) event.preventDefault();
  }));
  dialog.addEventListener('keydown', event => {
    if (viewerIndex < 0 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    stepPhoto(event.key === 'ArrowLeft' ? -1 : 1, document.activeElement?.dataset.direction);
  });

  // One decoded preview sheet at a time in this review. The original poster
  // stays underneath so there is no empty flash during image decode.
  let activeScan = null;
  const bound = new Map();
  function resetScan(scan) {
    if (!scan) return;
    scan.job++;
    scan.layer.hidden = true;
    scan.layer.style.backgroundImage = '';
    scan.layer.removeAttribute('data-frame');
    scan.ready = false;
    scan.pending = false;
    scan.input.value = '0';
    scan.output.textContent = '00:00';
    scan.input.setAttribute('aria-valuetext', 'Frame 1 of ' + scan.meta.frameCount);
    if (activeScan === scan) activeScan = null;
  }
  function drawFrame(scan) {
    const i = Number(scan.input.value);
    const x = i % scan.meta.columns;
    const y = Math.floor(i / scan.meta.columns);
    scan.layer.style.backgroundPosition = `${x/(scan.meta.columns-1)*100}% ${y/(scan.meta.rows-1)*100}%`;
    scan.layer.dataset.frame = String(i);
    scan.layer.hidden = false;
    const elapsed = time(scan.meta.times[i]);
    scan.output.textContent = elapsed;
    scan.input.setAttribute('aria-valuetext', `Frame ${i+1} of ${scan.meta.frameCount}, ${elapsed}`);
  }
  async function scanFrame(scan) {
    if (activeScan !== scan) {
      resetScan(activeScan);
      activeScan = scan;
    }
    if (scan.ready) {
      drawFrame(scan);
      return;
    }
    if (scan.pending) return;
    scan.pending = true;
    const job = ++scan.job;
    const image = new Image();
    image.src = scan.meta.sheet;
    try {
      await image.decode();
      if (scan.job !== job || activeScan !== scan) return;
      if (image.naturalWidth !== scan.meta.columns * scan.meta.frameWidth || image.naturalHeight !== scan.meta.rows * scan.meta.frameHeight) throw new Error('Incorrect frame sheet dimensions');
      scan.layer.style.backgroundImage = `url("${scan.meta.sheet}")`;
      scan.layer.style.backgroundSize = `${scan.meta.columns*100}% ${scan.meta.rows*100}%`;
      scan.ready = true;
      drawFrame(scan);
    } catch (_) {
      if (scan.job === job && activeScan === scan) {
        resetScan(scan);
        scan.output.textContent = 'Unavailable';
      }
    } finally {
      if (scan.job === job) scan.pending = false;
    }
  }
  function bindScan(controls, screen, key) {
    if (bound.has(controls)) {
      const {input, update, layer} = bound.get(controls);
      input.removeEventListener('input', update);
      layer.remove();
      bound.delete(controls);
    }
    const meta = films[key]?.preview;
    controls.hidden = !meta;
    if (!meta) return;
    const layer = element('div', '', 'frame-surface');
    layer.hidden = true;
    layer.setAttribute('aria-hidden', 'true');
    screen.append(layer);
    const input = $('input',controls), output = $('output',controls);
    const scan = {meta, input, output, layer, job:0, ready:false, pending:false};
    resetScan(scan);
    input.max = String(meta.frameCount - 1);
    scan.update = () => { void scanFrame(scan); };
    input.addEventListener('input', scan.update);
    bound.set(controls, scan);
  }
  $$('[data-scan]').forEach(el => bindScan(el,$('[data-film-visual]',el.closest('[data-film],[data-monitor]')),el.dataset.scan));

  const monitor = $('[data-monitor]');
  const choices = $$('.project-option');
  if (monitor) {
    const screen = $('[data-film-visual]',monitor);
    $('[data-monitor-title]',monitor).setAttribute('aria-live','polite');
    choices.forEach(choice => choice.addEventListener('click', () => {
      const key = choice.dataset.project;
      const film = films[key];
      resetScan(activeScan);
      choices.forEach(c => c.setAttribute('aria-pressed', String(c === choice)));
      $('[data-monitor-format]',monitor).textContent = film.ratio + ' / ' + film.category;
      $('[data-well]',monitor).toggleAttribute('data-vertical',film.ratio === '9:16');
      const poster = $('img',screen);
      poster.src = film.poster;
      poster.alt = 'Still from ' + film.title;
      $('[data-monitor-role]',monitor).textContent = film.role;
      $('[data-monitor-title]',monitor).textContent = film.title;
      $('[data-monitor-summary]',monitor).textContent = film.description;
      $('[data-screen]',monitor).dataset.screen = key;
      bindScan($('.scan-controls',monitor),screen,key);
    }));
  }
  $$('.film-row').forEach(row => row.addEventListener('toggle', () => {
    if (row.open) return;
    const state = bound.get($('.scan-controls',row));
    if (activeScan && state === activeScan) resetScan(state);
  }));
  function revealHash() {
    const row = document.getElementById(location.hash.slice(1));
    if (row?.matches('.film-row')) row.open = true;
  }
  addEventListener('hashchange',revealHash);
  revealHash();

  const stage = $('.stage');
  if (stage) {
    const gold = '../../assets/motion-sculpture.webp', wire = '../../assets/motion-wireframe.webp';
    const statue = $('[data-sculpture]', stage), canvas = $('[data-mesh]',stage);
    const slider = $('[data-orbit]',stage), live = $('[data-live]',stage), status = $('.stage-status',stage);
    let material = 'gold', scene = null, running = false;
    let lazy;
    function still(note = 'Still view · live orbit is optional') {
      running = false;
      scene?.pause();
      canvas.hidden = true;
      statue.hidden = false;
      live.textContent = 'Enable live 3D';
      live.setAttribute('aria-pressed','false');
      slider.closest('label').hidden = true;
      status.textContent = note;
    }
    function switchTo(next) {
      material = next;
      $$('[data-material]',stage).filter(btn=>btn.matches('button')).forEach(btn => btn.setAttribute('aria-pressed',String(btn.dataset.material===next)));
      statue.src = next === 'wire' ? wire : gold;
      statue.dataset.material = next;
      statue.alt = next === 'wire' ? 'Wireframe view of the original gold ribbon' : 'The original gold ribbon sculpture from V7';
      if (running) scene.setMaterial(next);
    }
    $$('button[data-material]',stage).forEach(btn=>btn.addEventListener('click',()=>switchTo(btn.dataset.material)));
    live.addEventListener('click', async () => {
      if (running) { still(); return; }
      live.disabled = true;
      try {
        lazy ??= new Promise((resolve,reject) => {
          const src = document.createElement('script');
          src.src = 'sculpture.js';
          src.onload = resolve;
          src.onerror = reject;
          document.head.append(src);
        });
        await lazy;
        scene ??= window.mountStudioRibbon(canvas, () => {
          still('The 3D context was lost. The original still is available.');
          scene?.dispose();
          scene = null;
        });
        if (!scene) {
          still('Hardware 3D unavailable · still view retained');
          return;
        }
        running = true;
        canvas.hidden = false;
        statue.hidden = true;
        live.textContent = 'Use still view';
        live.setAttribute('aria-pressed','true');
        slider.closest('label').hidden = false;
        status.textContent = 'Live 3D · move Orbit to change the view';
        scene.start();
        scene.setMaterial(material);
        scene.setAngle(Number(slider.value));
      } catch (_) {
        still('Live 3D unavailable · still view retained');
      } finally {
        live.disabled = false;
      }
    });
    slider.addEventListener('input', () => {
      if (running) scene.setAngle(Number(slider.value));
    });
  }
  let take = 1;
  const clapper = $('[data-clapper]');
  clapper?.addEventListener('click', () => {
    const next = String(++take).padStart(2,'0');
    $('[data-take]',clapper).textContent = 'TAKE ' + next;
    $('[data-clap-status]').textContent = 'Demo take ' + take;
    const strip = $('.clapper-strip',clapper);
    if (!reduced.matches && strip.animate && !strip.getAnimations?.().length) {
      strip.animate([{transform:'rotate(-13deg)'},{transform:'rotate(0deg)',offset:.47},{transform:'rotate(-13deg)'}],{duration:330,easing:'ease-out'});
    }
  });
})();
