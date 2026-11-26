// shots.js — deterministic screenshot poses for ?shot=start|play|land|end.
// Each pose places the plane, the score and the fuel exactly, then freezes
// the physics so the capture shows the same frame every time.

import { SEA_Y, PLANE_X } from './config.js';
import { runwayAt } from './terrain.js';

export function applyShot(game, shot) {
  const p = game.plane;
  const dest = runwayAt(game.terrain, 'dest');
  const rings = game.obs.rings;

  if (shot === 'start') {
    game.phase = 'title';
    p.throttle = 0.55;
    p.fuel = 100;
    game.frozen = true;
    return;
  }

  if (shot === 'play') {
    // Mid-flight, nose at the third ring, two rings already banked.
    const ring = rings[2] || rings[rings.length - 1];
    rings[0].passed = true;
    rings[1].passed = true;
    game.score = 350;
    game.totalRings = 2;
    game.combo = 2;
    p.x = ring.x - 240;
    p.y = ring.y + 6;
    p.vy = 0;
    p.speed = 285;
    p.throttle = 0.78;
    p.pitch = -0.06;
    p.onGround = false;
    p.gearDown = false;
    p.fuel = 72;
    game.legTime = 34;
    game.phase = 'flying';
    game.prevX = p.x;
    game.frozen = true;
    return;
  }

  if (shot === 'land') {
    // Final approach: gear down, runway ahead, every ring flown.
    for (const r of rings) r.passed = true;
    game.score = 890;
    game.totalRings = rings.length;
    game.combo = rings.length;
    p.x = dest.x0 - 560;
    p.y = dest.y - 150;
    p.vy = 26;
    p.speed = 195;
    p.throttle = 0.42;
    p.pitch = 0.1;
    p.onGround = false;
    p.gearDown = true;
    p.fuel = 41;
    game.legTime = 61;
    game.phase = 'flying';
    game.prevX = p.x;
    game.frozen = true;
    return;
  }

  if (shot === 'end') {
    // Mission complete overlay over the landed scene.
    for (const r of rings) r.passed = true;
    game.score = 1420;
    game.totalRings = rings.length;
    game.landings = 1;
    p.x = dest.x0 + 260;
    p.y = dest.y - 14;
    p.speed = 0;
    p.throttle = 0;
    p.onGround = true;
    p.gearDown = true;
    p.fuel = 54;
    game.legTime = 68;
    game.legStats = {
      deliveryBonus: 500 + 84,
      fuelBonus: 216,
      legScore: 800,
      timeText: '1:08',
      parText: '1:15',
    };
    game.phase = 'landed';
    game.prevX = p.x;
    game.frozen = true;
    return;
  }
}

export function shotFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    return { shot: q.get('shot'), seed: q.get('seed') || '1' };
  } catch {
    return { shot: null, seed: '1' };
  }
}

export { SEA_Y, PLANE_X };
