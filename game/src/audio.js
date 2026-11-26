// Ember Isles Airmail — sound, synthesized, no audio files.
// One job: an engine hum that follows the throttle, plus the small
// sounds that make a ring, a touchdown and a crash read as what happened.

export function makeAudio() {
  return {
    ctx: null,
    engineOsc: null,
    engineGain: null,
    muted: false,
    started: false,
  };
}

// Must be called from a user gesture (first key press or click).
export function startAudio(audio) {
  if (audio.started) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new Ctx();
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 55;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engineOsc.connect(filter);
    filter.connect(audio.engineGain);
    audio.engineGain.connect(audio.ctx.destination);
    audio.engineOsc.start();
    audio.started = true;
  } catch {
    // No audio on this browser: the game plays silent, nothing breaks.
    audio.started = false;
  }
}

export function setEngine(audio, throttle, flying) {
  if (!audio.started || !audio.ctx) return;
  const target = audio.muted || !flying ? 0 : 0.02 + throttle * 0.05;
  audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
  audio.engineOsc.frequency.setTargetAtTime(48 + throttle * 70, audio.ctx.currentTime, 0.1);
}

function blip(audio, freq, dur, type, vol) {
  if (!audio.started || !audio.ctx || audio.muted) return;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, audio.ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(audio.ctx.destination);
  osc.start();
  osc.stop(audio.ctx.currentTime + dur);
}

export function playRingChime(audio) {
  blip(audio, 880, 0.18, 'sine', 0.16);
  setTimeout(() => blip(audio, 1318, 0.28, 'sine', 0.14), 90);
}

export function playTouchdown(audio) {
  blip(audio, 120, 0.25, 'sine', 0.25);
}

export function playCrash(audio) {
  blip(audio, 70, 0.6, 'sawtooth', 0.3);
  blip(audio, 45, 0.8, 'square', 0.18);
}

export function playWarning(audio) {
  blip(audio, 660, 0.12, 'square', 0.08);
}
