/* Local, original equipment cues. One context; unlocked only by a deliberate gesture. */
(() => {
  'use strict';
  const Context = window.AudioContext || window.webkitAudioContext;
  const names = ['shutter', 'spin', 'interface', 'clap', 'reel', 'ui', 'monitor', 'focus'];
  let enabled = true, context = null, output = null, unlocking = null;
  try { enabled = localStorage.getItem('tarix-sound') !== 'muted'; } catch (_) {}
  const buffers = new Map(), pending = new Map(), voices = new Set(), last = new Map();
  const state = { enabled, unlocked: false, voices: 0, played: {}, failures: [] };
  const changes = new Set();
  async function load(name) {
    if (buffers.has(name)) return buffers.get(name);
    if (!pending.has(name)) pending.set(name, (async () => {
      const response = await fetch(`assets/sounds/${name}.wav`);
      if (!response.ok) throw new Error(`Sound ${name}: ${response.status}`);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      buffers.set(name, buffer); return buffer;
    })().catch(error => { state.failures.push(String(error.message)); return null; }));
    return pending.get(name);
  }
  function notify() { state.enabled = enabled; changes.forEach(listener => listener()); }
  function silence() {
    voices.forEach(voice => { try { voice.stop(); } catch (_) {} });
    voices.clear(); state.voices = 0;
  }
  function unlock(gesture = false) {
    if (!Context || !enabled) return Promise.resolve(false);
    if (!context) {
      context = new Context();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -16; compressor.knee.value = 12;
      compressor.ratio.value = 2.5; compressor.attack.value = .003; compressor.release.value = .12;
      output = context.createGain(); output.gain.value = .65;
      output.connect(compressor); compressor.connect(context.destination);
    }
    // Touch browsers may accept click/touch-up rather than pointerdown. Retry
    // resume inside that trusted activation even if an earlier promise is pending.
    if (gesture && unlocking && context.state === 'suspended') context.resume().catch(() => {});
    if (!unlocking) unlocking = context.resume().then(() => {
      state.unlocked = context.state === 'running';
      if (state.unlocked) names.forEach(name => load(name));
      return state.unlocked;
    }).catch(() => false).finally(() => { unlocking = null; });
    return unlocking;
  }
  async function play(name) {
    if (!enabled || !context || document.hidden || !names.includes(name)) return false;
    if (context.state !== 'running' && !(await unlock())) return false;
    const buffer = await load(name);
    if (!buffer || !enabled || document.hidden || context.state !== 'running') return false;
    const now = performance.now();
    if (now - (last.get(name) || -1000) < (name === 'ui' ? 140 : 110) || voices.size >= 4) return false;
    last.set(name, now);
    const source = context.createBufferSource(); source.buffer = buffer; source.connect(output);
    voices.add(source); state.voices = voices.size;
    source.onended = () => { voices.delete(source); state.voices = voices.size; source.disconnect(); };
    source.start(); state.played[name] = (state.played[name] || 0) + 1;
    return true;
  }
  function setEnabled(value) {
    enabled = !!value;
    try { localStorage.setItem('tarix-sound', enabled ? 'on' : 'muted'); } catch (_) {}
    if (!enabled) silence(); else unlock();
    notify();
  }
  const eligible = '#camera-prop,#blender-prop,#ae-prop,#wrap-clapper,.js-video,.photo-open,.viewer-nav button,.viewer-thumb,[data-gallery-view],[data-filter],.filter-button,.sound-toggle,#view-toggle,#motion-toggle,.menu-toggle,.button,.text-link,.contact-card';
  document.addEventListener('pointerdown', event => {
    if (event.isTrusted && event.button === 0 && event.target.closest(eligible)) unlock(true);
  }, { capture: true, passive: true });
  document.addEventListener('keydown', event => {
    if (event.isTrusted && !event.repeat && ['Enter', ' '].includes(event.key) && event.target.closest(eligible)) unlock(true);
  }, true);
  document.addEventListener('click', event => {
    if (event.isTrusted && event.target.closest(eligible)) unlock(true);
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { silence(); if (context?.state === 'running') context.suspend().catch(() => {}); }
  });
  window.addEventListener('pagehide', silence);
  Object.defineProperty(window, 'tarixSound', { value: Object.freeze({
    supported: !!Context, state, play, setEnabled, unlock,
    onChange: listener => { changes.add(listener); return () => changes.delete(listener); }
  }) });
})();
