// obstacles.js — everything the pilot flies through, around or into:
// golden target rings, hot-air balloons, bird flocks, storm clouds and
// radio towers. Built from the mission seed; animated by updateObstacles.

import { SEA_Y, PALETTE } from './config.js';
import { makeRng } from './random.js';
import { terrainHeightAt } from './terrain.js';

// Every airborne thing is placed with clear sky above the ground at its
// x: a ring, balloon, bird or storm half-buried in a hill would be unfair.
function skyRoom(terrain, x, clearance) {
  return Math.max(150, terrainHeightAt(terrain, x) - clearance);
}

export function buildObstacles(seedText, mission, terrain) {
  const rng = makeRng(`obstacles:${seedText}:${mission.id}`);
  const legEnd = mission.distance;

  // Rings lead the pilot along the leg, one after another.
  const rings = [];
  const step = legEnd / (mission.rings + 1);
  for (let i = 0; i < mission.rings; i++) {
    const x = step * (i + 1) + rng.range(-120, 120);
    const y = Math.min(rng.range(200, 520), skyRoom(terrain, x, 120));
    rings.push({ x, y, r: 46, passed: false, perfect: false, phase: rng.range(0, 6) });
  }

  const balloons = [];
  for (let i = 0; i < mission.balloons; i++) {
    const x = rng.range(1400, legEnd - 800);
    balloons.push({
      x,
      yBase: Math.min(rng.range(240, 480), skyRoom(terrain, x, 110)),
      amp: rng.range(18, 46),
      phase: rng.range(0, 6),
      r: 30,
      hue: rng.pick(['#e85d3d', '#f4a259', '#7fb3d9', '#90be6d', '#e07a5f']),
    });
  }

  const birds = [];
  for (let i = 0; i < mission.birds; i++) {
    const x = rng.range(1200, legEnd - 600);
    birds.push({
      x,
      y: Math.min(rng.range(220, 460), skyRoom(terrain, x, 80)),
      speed: rng.range(28, 55),
      phase: rng.range(0, 6),
      size: rng.range(0.8, 1.3),
    });
  }

  const storms = [];
  for (let i = 0; i < mission.storms; i++) {
    const x = rng.range(1800, legEnd - 1200);
    const h = rng.range(90, 140);
    storms.push({
      x,
      y: Math.min(rng.range(180, 380), skyRoom(terrain, x, h / 2 + 40)),
      w: rng.range(190, 280),
      h,
      drift: rng.range(-8, 8),
      flash: rng.range(0, 4),
    });
  }

  // Towers stand on wild islands, never on a runway.
  const towers = [];
  const wild = terrain.islands.filter((is) => is.kind === 'wild');
  for (let i = 0; i < mission.towers && i < wild.length; i++) {
    const is = wild[(i * 2 + 1) % wild.length];
    const tx = (is.x0 + is.x1) / 2;
    towers.push({ x: tx, baseY: is.peakY + 30, height: 150, blink: rng.range(0, 2) });
  }

  return { rings, balloons, birds, storms, towers };
}

export function updateObstacles(obs, dt, time) {
  for (const b of obs.balloons) b.y = b.yBase + Math.sin(time * 0.0006 + b.phase) * b.amp;
  for (const f of obs.birds) {
    f.x -= f.speed * dt;
    if (f.x < -100) f.x += 14000;
  }
  for (const s of obs.storms) {
    s.x += s.drift * dt;
    s.flash -= dt;
    if (s.flash < -3.2) s.flash = Math.random() * 2;
  }
}

export function nextRing(obs) {
  return obs.rings.find((r) => !r.passed && !r.missed) || null;
}

// True when the plane's nose crosses the ring's plane inside its hoop.
export function ringCrossed(plane, ring) {
  const dx = plane.x - ring.x;
  if (Math.abs(dx) > 14) return false;
  const dy = plane.y - ring.y;
  const d = Math.hypot(dx, dy);
  if (d > ring.r) return false;
  return { perfect: d < ring.r * 0.45 };
}

// First obstacle the plane touches, or null. r is the plane's hit radius.
export function hitTest(plane, obs, r) {
  for (const b of obs.balloons) {
    const by = b.y ?? b.yBase;
    if (Math.hypot(plane.x - b.x, plane.y - by) < r + b.r * 0.9) return 'balloon';
  }
  for (const f of obs.birds) {
    if (Math.hypot(plane.x - f.x, plane.y - f.y) < r + 16) return 'bird';
  }
  for (const s of obs.storms) {
    if (Math.abs(plane.x - s.x) < s.w / 2 && Math.abs(plane.y - s.y) < s.h / 2) return 'storm';
  }
  for (const t of obs.towers) {
    if (Math.abs(plane.x - t.x) < 16 && plane.y > t.baseY - t.height && plane.y < t.baseY) return 'tower';
  }
  return null;
}

// A near miss: close enough to feel, far enough to live. Worth points.
export function nearMiss(plane, obs) {
  for (const b of obs.balloons) {
    const by = b.y ?? b.yBase;
    const d = Math.hypot(plane.x - b.x, plane.y - by);
    if (d > 46 + b.r * 0.9 && d < 110) return true;
  }
  for (const t of obs.towers) {
    if (Math.abs(plane.x - t.x) < 70 && Math.abs(plane.x - t.x) > 16 && plane.y > t.baseY - t.height - 30 && plane.y < t.baseY) return true;
  }
  return false;
}

export function drawObstacles(ctx, obs, camX, viewW, time) {
  const ring = nextRing(obs);
  // Rings: passed ones are dim; the next one glows and pulses.
  for (const g of obs.rings) {
    const sx = g.x - camX;
    if (sx < -120 || sx > viewW + 120) continue;
    const isNext = ring === g;
    const pulse = isNext ? 1 + Math.sin(time * 0.005) * 0.1 : 1;
    const rr = g.r * pulse;
    ctx.save();
    ctx.globalAlpha = g.passed ? 0.35 : 1;
    ctx.strokeStyle = PALETTE.ring;
    ctx.lineWidth = 7;
    ctx.shadowColor = PALETTE.ringGlow;
    ctx.shadowBlur = isNext ? 22 : 8;
    ctx.beginPath();
    ctx.arc(sx, g.y, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, g.y, rr - 5, 0, Math.PI * 2);
    ctx.stroke();
    if (isNext) {
      // A chevron above the next ring so the pilot never hunts for it.
      const bob = Math.sin(time * 0.005) * 6;
      ctx.fillStyle = PALETTE.ring;
      ctx.beginPath();
      ctx.moveTo(sx, g.y - rr - 34 + bob);
      ctx.lineTo(sx - 12, g.y - rr - 52 + bob);
      ctx.lineTo(sx + 12, g.y - rr - 52 + bob);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  for (const b of obs.balloons) {
    const sx = b.x - camX;
    if (sx < -120 || sx > viewW + 120) continue;
    const by = b.y ?? b.yBase;
    drawBalloon(ctx, sx, by, b);
  }
  for (const f of obs.birds) {
    const sx = f.x - camX;
    if (sx < -80 || sx > viewW + 80) continue;
    drawBird(ctx, sx, f.y + Math.sin(time * 0.006 + f.phase) * 10, f.size, time + f.phase * 1000);
  }
  for (const s of obs.storms) {
    const sx = s.x - camX;
    if (sx < -320 || sx > viewW + 320) continue;
    drawStorm(ctx, sx, s, time);
  }
  for (const t of obs.towers) {
    const sx = t.x - camX;
    if (sx < -60 || sx > viewW + 60) continue;
    drawTower(ctx, sx, t, time);
  }
}

function drawBalloon(ctx, x, y, b) {
  ctx.fillStyle = b.hue;
  ctx.beginPath();
  ctx.ellipse(x, y - 26, 26, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(x - 8, y - 34, 8, 18, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5b4636';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 2);
  ctx.lineTo(x - 8, y + 12);
  ctx.moveTo(x + 14, y - 2);
  ctx.lineTo(x + 8, y + 12);
  ctx.stroke();
  ctx.fillStyle = '#8b5e34';
  ctx.fillRect(x - 10, y + 12, 20, 14);
}

function drawBird(ctx, x, y, s, time) {
  const flap = Math.sin(time * 0.02) * 7 * s;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y - flap);
  ctx.quadraticCurveTo(x - 4 * s, y + 2, x, y);
  ctx.quadraticCurveTo(x + 4 * s, y + 2, x + 12 * s, y - flap);
  ctx.stroke();
}

function drawStorm(ctx, x, s, time) {
  ctx.fillStyle = PALETTE.storm;
  ctx.beginPath();
  ctx.ellipse(x, s.y, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
  ctx.ellipse(x - s.w * 0.28, s.y + s.h * 0.14, s.w * 0.32, s.h * 0.32, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s.w * 0.3, s.y + s.h * 0.12, s.w * 0.3, s.h * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.stormBelly;
  ctx.beginPath();
  ctx.ellipse(x, s.y + s.h * 0.2, s.w * 0.42, s.h * 0.26, 0, 0, Math.PI);
  ctx.fill();
  // Lightning flicker.
  if (s.flash > 0 && s.flash < 0.35) {
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let lx = x + (s.flash * 97) % 60 - 30;
    let ly = s.y + s.h * 0.3;
    ctx.moveTo(lx, ly);
    for (let i = 0; i < 4; i++) {
      lx += (i % 2 === 0 ? 9 : -9);
      ly += 14;
      ctx.lineTo(lx, ly);
    }
    ctx.stroke();
  }
  // Rain streaks under the cloud.
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 10; i++) {
    const rx = x - s.w / 2 + ((i * 37 + Math.floor(time / 40) * 3) % s.w);
    const ry = s.y + s.h * 0.32 + ((i * 53 + Math.floor(time / 16)) % 46);
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 4, ry + 12);
    ctx.stroke();
  }
}

function drawTower(ctx, x, t, time) {
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 12, t.baseY);
  ctx.lineTo(x, t.baseY - t.height);
  ctx.lineTo(x + 12, t.baseY);
  ctx.stroke();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 8, t.baseY - t.height * 0.45);
  ctx.lineTo(x + 8, t.baseY - t.height * 0.45);
  ctx.moveTo(x - 5, t.baseY - t.height * 0.78);
  ctx.lineTo(x + 5, t.baseY - t.height * 0.78);
  ctx.stroke();
  const blink = Math.floor(time / 500 + t.blink) % 2 === 0;
  ctx.fillStyle = blink ? '#ef4444' : '#7f1d1d';
  ctx.beginPath();
  ctx.arc(x, t.baseY - t.height - 4, 5, 0, Math.PI * 2);
  ctx.fill();
}
