// main.js — bootstrap: canvas, game, input, sound and the frame loop.
// Exposes window.SkyCourier so a playtest script can drive the game.

import { VIEW } from './config.js';
import { createGame, update, draw } from './game.js';
import { createInput } from './input.js';
import { SoundEngine } from './audio.js';
import { applyShot, shotFromUrl } from './shots.js';
import { terrainHeightAt } from './terrain.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const { shot, seed } = shotFromUrl();
const game = createGame(seed);
const input = createInput(canvas);
const sound = new SoundEngine();

// First gesture wakes the audio (browsers block sound before one).
const wake = () => {
  sound.ensure();
  sound.resume();
};
window.addEventListener('keydown', wake);
window.addEventListener('pointerdown', wake);

if (shot) applyShot(game, shot);

window.SkyCourier = {
  game,
  sound,
  input,
  version: '1.0.0',
  // Playtest helper: ground height at a world x (for autopilots).
  terrainAt(x) {
    return terrainHeightAt(game.terrain, x);
  },
  // Playtest helper: a small read-only snapshot of the live state.
  snapshot() {
    const p = game.plane;
    return {
      phase: game.phase,
      mission: game.missionIndex + 1,
      x: Math.round(p.x),
      y: Math.round(p.y),
      speed: Math.round(p.speed),
      throttle: +p.throttle.toFixed(2),
      fuel: Math.round(p.fuel),
      hearts: game.hearts,
      lives: game.lives,
      score: game.score,
      rings: game.obs.rings.filter((r) => r.passed).length,
      onGround: p.onGround,
      lastCrash: game.lastCrash || null,
    };
  },
};

let last = performance.now();
const frozenTime = 20000; // screenshot poses render at one fixed moment

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const keys = input.read();
  update(game, keys, dt, sound);
  const t = game.frozen ? frozenTime : game.time;
  draw(game, ctx, t);
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.phase === 'flying') {
    game.phase = 'paused';
    sound.setFlight(0, 0, false);
  }
});

requestAnimationFrame(frame);
