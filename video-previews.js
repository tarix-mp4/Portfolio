/* Genuine, on-demand frame previews. Full MP4 playback remains owned by app.js. */
(() => {
  'use strict';
  const data = document.querySelector('#scrub-preview-data');
  if (!data) return;
  const previews = JSON.parse(data.textContent);
  const projects = JSON.parse(document.querySelector('#project-data').textContent);
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const controllers = [];
  const retained = new Map();
  let active = null;
  const time = seconds => {
    const whole = Math.floor(seconds);
    return String(Math.floor(whole / 60)).padStart(2, '0') + ':' + String(whole % 60).padStart(2, '0');
  };
  const canPreview = () => !document.hidden && !document.documentElement.classList.contains('screening');

  function hide(state) {
    if (!state) return;
    if (state.frame) cancelAnimationFrame(state.frame);
    state.frame = 0;
    state.link.classList.remove('is-scrubbing');
    state.surface.hidden = true;
    if (state.oldTime) state.oldTime.textContent = state.oldTimeText;
    if (active === state) active = null;
  }
  function retain(state) {
    retained.delete(state);
    retained.set(state, true);
    // Keep at most two decoded-sheet references; never preload six videos.
    while (retained.size > 2) {
      const old = [...retained.keys()].find(item => item !== active);
      if (!old) break;
      hide(old);
      old.ready = false;
      old.surface.style.backgroundImage = '';
      retained.delete(old);
    }
  }
  function paint(state) {
    state.frame = 0;
    if (active !== state || !state.ready || !canPreview()) return;
    const meta = state.meta;
    const index = Math.round(state.fraction * (meta.frameCount - 1));
    const column = index % meta.columns;
    const row = Math.floor(index / meta.columns);
    if (index !== state.index) {
      state.surface.style.backgroundPosition = `${column * 100 / (meta.columns - 1)}% ${row * 100 / (meta.rows - 1)}%`;
      state.surface.dataset.previewFrame = String(index);
      state.index = index;
    }
    state.input.value = String(index);
    const stamp = time(meta.times[index]);
    state.output.textContent = stamp;
    state.input.setAttribute('aria-valuetext', `${stamp} of ${time(meta.duration)}`);
    if (state.oldTime) state.oldTime.textContent = `${stamp} / ${time(meta.duration)}`;
    state.progress.style.transform = `scaleX(${state.fraction})`;
    state.surface.hidden = false;
    state.link.classList.add('is-scrubbing');
  }
  function schedule(state) {
    if (!state.frame) state.frame = requestAnimationFrame(() => paint(state));
  }
  async function load(state) {
    if (state.ready) { retain(state); schedule(state); return; }
    if (state.loading || state.failed) return;
    state.loading = true;
    try {
      const image = new Image();
      image.decoding = 'async';
      image.src = state.meta.sheet;
      await image.decode();
      if (image.naturalWidth !== state.meta.columns * state.meta.frameWidth || image.naturalHeight !== state.meta.rows * state.meta.frameHeight) throw Error('Preview dimensions do not match source manifest');
      state.surface.style.backgroundImage = `url("${state.meta.sheet}")`;
      state.ready = true;
      retain(state);
      schedule(state);
    } catch (_) {
      // Keep the authentic Stage 1 still and working Play link on load failure.
      state.failed = true;
      hide(state);
    } finally {
      state.loading = false;
    }
  }
  function activate(state, fraction) {
    if (!canPreview()) return;
    if (active !== state) hide(active);
    active = state;
    state.fraction = Math.max(0, Math.min(1, fraction));
    load(state);
    schedule(state);
  }

  for (const [key, meta] of Object.entries(previews)) {
    const project = projects[key];
    const link = document.querySelector(`.project-card .project-visual[data-project="${key}"]`);
    if (!link || project?.nativeSrc !== meta.source || project.id !== meta.videoId || meta.frameCount !== meta.times.length) continue;
    const card = link.closest('.project-card');
    const surface = document.createElement('span');
    surface.className = 'scrub-surface';
    surface.hidden = true;
    surface.setAttribute('aria-hidden', 'true');
    surface.style.backgroundSize = `${meta.columns * 100}% ${meta.rows * 100}%`;
    link.querySelector('.project-media').append(surface);
    const track = document.createElement('span');
    track.className = 'scrub-progress';
    track.setAttribute('aria-hidden', 'true');
    const progress = document.createElement('i');
    track.append(progress);
    link.append(track);

    // This native input is a sibling of the link, not an interactive link child.
    const control = document.createElement('label');
    control.className = 'scrub-control';
    const caption = document.createElement('span');
    caption.className = 'scrub-label';
    caption.textContent = 'PREVIEW';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = String(meta.frameCount - 1);
    input.step = '1';
    input.value = '0';
    input.setAttribute('aria-label', `Preview frames from ${project.title}`);
    input.setAttribute('aria-valuetext', `00:00 of ${time(meta.duration)}`);
    const output = document.createElement('span');
    output.className = 'scrub-time';
    output.textContent = '00:00';
    output.setAttribute('aria-hidden', 'true');
    control.append(caption, input, output);
    card.append(control);
    card.dataset.scrubPreview = key;
    const oldTime = link.querySelector('.project-timecode > span');
    const state = { key, card, link, surface, meta, input, output, progress, oldTime, oldTimeText: oldTime?.textContent, fraction: 0, index: -1, frame: 0, ready: false, loading: false };
    controllers.push(state);
    function measure() {
      if (!link.clientWidth || !link.clientHeight) return;
      card.style.setProperty('--preview-width', link.offsetWidth + 'px');
      card.style.setProperty('--preview-height', link.offsetHeight + 'px');
    }
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(link);
    else window.addEventListener('resize', measure, { passive: true });
    measure();
    const point = event => {
      if (!fine.matches || event.pointerType !== 'mouse') return;
      const box = link.getBoundingClientRect();
      activate(state, (event.clientX - box.left) / box.width);
    };
    link.addEventListener('pointerenter', point, { passive: true });
    link.addEventListener('pointermove', point, { passive: true });
    link.addEventListener('pointerleave', () => {
      if (document.activeElement !== input) hide(state);
    });
    link.addEventListener('click', () => hide(state));
    input.addEventListener('focus', () => activate(state, Number(input.value) / (meta.frameCount - 1)));
    input.addEventListener('input', () => activate(state, Number(input.value) / (meta.frameCount - 1)));
    input.addEventListener('blur', () => hide(state));
    // No pointer capture or preventDefault: the browser keeps vertical touch panning.
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) hide(state);
    }).observe(link);
  }
  document.addEventListener('portfolio:layout', () => {
    if (active?.card.hidden) hide(active);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hide(active);
  });
  window.addEventListener('pagehide', () => hide(active));
})();
