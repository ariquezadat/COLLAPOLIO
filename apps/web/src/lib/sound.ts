'use client';

/**
 * Sonidos sintetizados con WebAudio: nada de samples de terceros, así que no
 * hay dudas de licencia y el bundle no pesa un byte extra.
 */
type Voice = 'roll' | 'buy' | 'rent' | 'turn' | 'bankrupt' | 'bid' | 'build' | 'error';

let ctx: AudioContext | null = null;
let enabled = true;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
  try {
    localStorage.setItem('collapolio.sound', v ? '1' : '0');
  } catch {
    /* ignorar */
  }
}

export function isSoundEnabled() {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem('collapolio.sound') !== '0';
  } catch {
    return true;
  }
}

function tone(
  freq: number,
  duration: number,
  opts: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {},
) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const start = ac.currentTime + (opts.delay ?? 0);
  osc.type = opts.type ?? 'triangle';
  osc.frequency.setValueAtTime(freq, start);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(opts.gain ?? 0.09, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function noise(duration: number, gainValue = 0.05, delay = 0) {
  const ac = audio();
  if (!ac) return;
  const frames = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
  }
  const src = ac.createBufferSource();
  const gain = ac.createGain();
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  gain.gain.value = gainValue;
  src.buffer = buffer;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(ac.currentTime + delay);
}

export function play(voice: Voice) {
  if (!enabled || !isSoundEnabled()) return;
  switch (voice) {
    case 'roll':
      // Dados rebotando sobre la mesa
      noise(0.09, 0.06);
      noise(0.07, 0.05, 0.11);
      noise(0.05, 0.04, 0.2);
      break;
    case 'buy':
      tone(523, 0.1, { type: 'sine' });
      tone(784, 0.16, { type: 'sine', delay: 0.08 });
      break;
    case 'rent':
      tone(392, 0.09, { type: 'square', gain: 0.05 });
      tone(311, 0.18, { type: 'square', gain: 0.05, delay: 0.08 });
      break;
    case 'turn':
      tone(660, 0.09, { type: 'sine', gain: 0.07 });
      tone(880, 0.13, { type: 'sine', gain: 0.07, delay: 0.07 });
      break;
    case 'bid':
      tone(700, 0.07, { type: 'triangle', gain: 0.06 });
      break;
    case 'build':
      tone(240, 0.07, { type: 'square', gain: 0.05 });
      noise(0.06, 0.03, 0.03);
      break;
    case 'bankrupt':
      tone(330, 0.5, { type: 'sawtooth', gain: 0.06, slideTo: 90 });
      break;
    case 'error':
      tone(180, 0.14, { type: 'square', gain: 0.05 });
      break;
  }
}
