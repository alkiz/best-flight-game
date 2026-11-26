// audio.js — every sound is synthesized with WebAudio. No audio files,
// no network. The engine hum follows the throttle; rings, landings and
// crashes are short synth stingers. Audio starts only after a gesture.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.windGain = null;
    this.windSource = null;
    this.started = false;
  }

  ensure() {
    if (this.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.started = true;
      this.buildEngineLoop();
    } catch {
      this.started = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  buildEngineLoop() {
    const ctx = this.ctx;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 62;
    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 124;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.4;
    this.engineOsc.connect(filter);
    this.engineOsc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(ctx.destination);
    this.engineOsc.start();
    this.engineOsc2.start();

    // Wind: looped filtered noise whose level follows airspeed.
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.windSource = ctx.createBufferSource();
    this.windSource.buffer = buffer;
    this.windSource.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 900;
    windFilter.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.windSource.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(ctx.destination);
    this.windSource.start();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.ctx) this.ctx.destination.gain?.valueOf;
    if (this.engineGain) this.engineGain.gain.value = 0;
    if (this.windGain) this.windGain.gain.value = 0;
  }

  // Called every frame while flying: throttle 0..1, speedRatio 0..1.
  setFlight(throttle, speedRatio, flying) {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const level = flying ? 0.05 + throttle * 0.075 : 0;
    this.engineGain.gain.setTargetAtTime(level, t, 0.08);
    this.engineOsc.frequency.setTargetAtTime(58 + throttle * 66, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(116 + throttle * 132, t, 0.08);
    this.windGain.gain.setTargetAtTime(flying ? speedRatio * 0.05 : 0, t, 0.12);
  }

  blip(freq, dur, type, vol, when = 0) {
    if (!this.started || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  noiseBurst(dur, vol, freq = 800) {
    if (!this.started || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
  }

  ring(perfection) {
    this.blip(880, 0.14, 'sine', 0.22);
    this.blip(1318, 0.22, 'sine', 0.18, 0.07);
    if (perfection) this.blip(1760, 0.3, 'sine', 0.16, 0.14);
  }

  thud() {
    this.noiseBurst(0.35, 0.5, 300);
    this.blip(70, 0.3, 'sine', 0.4);
  }

  scrape() {
    this.noiseBurst(0.18, 0.25, 2400);
  }

  landJingle() {
    [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.22, 'triangle', 0.2, i * 0.09));
  }

  missionComplete() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.blip(f, 0.3, 'triangle', 0.2, i * 0.11));
  }

  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => this.blip(f, 0.35, 'sawtooth', 0.12, i * 0.16));
  }

  click() {
    this.blip(660, 0.06, 'square', 0.08);
  }
}
