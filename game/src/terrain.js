// terrain.js — the island chain the courier flies over. Islands, sea,
// runways, palms, houses, clouds and distant mountains are all built
// from one seed, so the same mission always looks the same.

import { SEA_Y, PALETTE } from './config.js';
import { makeRng } from './random.js';

const RUNWAY_Y = 600; // the flat strip every runway sits on

export function buildTerrain(seedText, mission) {
  const rng = makeRng(`terrain:${seedText}:${mission.id}`);
  const islands = [];
  const legEnd = mission.distance;

  // Start island: a wide flat home base with the departure runway.
  islands.push(makeIsland(rng, -500, 1100, RUNWAY_Y, true, 'home'));
  // Destination island: the delivery runway at the end of the leg.
  islands.push(makeIsland(rng, legEnd - 200, legEnd + 1100, RUNWAY_Y, true, 'dest'));

  // Middle islands: places to admire, towers to avoid, ground to fear.
  let x = 1500;
  while (x < legEnd - 1600) {
    const w = rng.range(700, 1500);
    const peak = rng.range(470, 560);
    islands.push(makeIsland(rng, x, x + w, peak, false, 'wild'));
    x += w + rng.range(900, 1900);
  }
  islands.sort((a, b) => a.x0 - b.x0);

  // Clouds drift slowly across the whole leg.
  const clouds = [];
  for (let i = 0; i < 46; i++) {
    clouds.push({
      x: rng.range(-800, legEnd + 1400),
      y: rng.range(60, 380),
      s: rng.range(0.6, 1.9),
      speed: rng.range(4, 14),
      puff: rng.range(0, 10),
    });
  }
  // Far mountain ridge (parallax backdrop, never collidable).
  const ridge = [];
  for (let i = 0; i < 26; i++) {
    ridge.push({ x: i * 700 - 400, h: rng.range(120, 300), w: rng.range(500, 900) });
  }
  return { islands, clouds, ridge, legEnd, seedText };
}

function makeIsland(rng, x0, x1, peakY, runway, kind) {
  const palms = [];
  const houses = [];
  const n = Math.floor((x1 - x0) / 160);
  for (let i = 0; i < n; i++) {
    const px = rng.range(x0 + 60, x1 - 60);
    if (runway && px > x0 + 120 && px < x1 - 120) continue; // keep the strip clear
    if (rng.chance(0.55)) palms.push({ x: px, h: rng.range(26, 44), lean: rng.range(-0.25, 0.25) });
    else if (rng.chance(0.5)) houses.push({ x: px, w: rng.range(26, 44), h: rng.range(18, 30), c: rng.pick(['#f4a259', '#e07a5f', '#90be6d', '#f2cc8f']) });
  }
  // A runway is a flat table on the island: the strip the plane lands on.
  const strip = runway
    ? { x0: x0 + 120, x1: x1 - 120, y: peakY }
    : null;
  return { x0, x1, peakY, kind, palms, houses, strip };
}

// Screen y of the ground at world x (SEA_Y over open water).
export function terrainHeightAt(terrain, x) {
  for (const is of terrain.islands) {
    if (x < is.x0 || x > is.x1) continue;
    if (is.strip && x >= is.strip.x0 && x <= is.strip.x1) return is.strip.y;
    // Smooth hill: cosine bump from the sea up to the peak.
    const t = (x - is.x0) / (is.x1 - is.x0);
    const bump = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
    return SEA_Y - (SEA_Y - is.peakY) * (0.25 + 0.75 * bump);
  }
  return SEA_Y;
}

export function runwayAt(terrain, kind) {
  const is = terrain.islands.find((i) => i.kind === kind);
  return is ? is.strip : null;
}

export function drawTerrain(ctx, terrain, camX, viewW, viewH, time) {
  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, viewH);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(0.82, PALETTE.skyHorizon);
  sky.addColorStop(1, '#ffe9c4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewW, viewH);

  // Sun with a soft glow, high on the right.
  const sunX = viewW - 210;
  const sunY = 118;
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 150);
  glow.addColorStop(0, 'rgba(255, 243, 196, 0.95)');
  glow.addColorStop(0.35, 'rgba(255, 226, 122, 0.5)');
  glow.addColorStop(1, 'rgba(255, 226, 122, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 160, sunY - 160, 320, 320);
  ctx.fillStyle = PALETTE.sunCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
  ctx.fill();

  // Far ridge (parallax 0.18) and near ridge (0.4): low and hazy, so the
  // sky and the runway ahead stay the focus of the frame.
  drawRidge(ctx, terrain.ridge, camX * 0.18, viewW, PALETTE.mountainFar, 0.5);
  drawRidge(ctx, terrain.ridge, camX * 0.4, viewW, PALETTE.mountainNear, 0.62);

  // Clouds.
  for (const c of terrain.clouds) {
    const sx = c.x - camX * 0.55 + Math.sin(time * 0.00002 + c.puff) * 12;
    if (sx < -260 || sx > viewW + 260) continue;
    drawCloud(ctx, sx, c.y, c.s);
  }

  // Sea.
  const sea = ctx.createLinearGradient(0, SEA_Y - 40, 0, viewH);
  sea.addColorStop(0, PALETTE.seaShallow);
  sea.addColorStop(1, PALETTE.seaDeep);
  ctx.fillStyle = sea;
  ctx.fillRect(0, SEA_Y, viewW, viewH - SEA_Y);
  // Sun glitter on the water.
  ctx.fillStyle = 'rgba(255, 233, 168, 0.5)';
  for (let i = 0; i < 26; i++) {
    const gx = ((i * 173 + 60) % viewW) + Math.sin(time * 0.001 + i) * 8;
    const gy = SEA_Y + 14 + ((i * 47) % 120);
    const gw = 26 + ((i * 31) % 40);
    ctx.fillRect(gx, gy, gw, 2.5);
  }
  // Wave lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  for (let r = 0; r < 4; r++) {
    ctx.beginPath();
    const wy = SEA_Y + 26 + r * 34;
    for (let x = 0; x <= viewW; x += 32) {
      const y = wy + Math.sin(x * 0.02 + time * 0.0016 + r * 2.1) * 3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Islands: green hills with a sand rim, palms, houses, runways.
  const x0 = camX - 100;
  const x1 = camX + viewW + 100;
  for (const is of terrain.islands) {
    if (is.x1 < x0 || is.x0 > x1) continue;
    drawIsland(ctx, is, camX, time);
  }
}

function drawRidge(ctx, ridge, camX, viewW, color, squash) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-50, 660);
  for (const p of ridge) {
    const sx = p.x - camX;
    if (sx < -1000 || sx > viewW + 1000) continue;
    ctx.lineTo(sx, 660 - p.h * squash);
    ctx.lineTo(sx + p.w / 2, 660 - p.h * squash * 0.4);
    ctx.lineTo(sx + p.w, 660);
  }
  ctx.lineTo(viewW + 50, 660);
  ctx.closePath();
  ctx.fill();
}

function drawCloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.ellipse(x, y, 62 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 34 * s, y + 6 * s, 38 * s, 15 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 36 * s, y + 5 * s, 42 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 6 * s, y - 12 * s, 40 * s, 17 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawIsland(ctx, is, camX, time) {
  const top = is.peakY;
  ctx.beginPath();
  ctx.moveTo(is.x0 - camX, SEA_Y + 46);
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const wx = is.x0 + ((is.x1 - is.x0) * i) / steps;
    ctx.lineTo(wx - camX, terrainHeightAt({ islands: [is] }, wx));
  }
  ctx.lineTo(is.x1 - camX, SEA_Y + 46);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, top, 0, SEA_Y + 46);
  g.addColorStop(0, PALETTE.grass);
  g.addColorStop(0.7, PALETTE.grassDark);
  g.addColorStop(1, '#2c6e35');
  ctx.fillStyle = g;
  ctx.fill();
  // Sand rim where the hill meets the sea.
  ctx.strokeStyle = PALETTE.sand;
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const wx = is.x0 + ((is.x1 - is.x0) * i) / steps;
    const y = terrainHeightAt({ islands: [is] }, wx);
    if (i === 0) ctx.moveTo(wx - camX, y + 4);
    else ctx.lineTo(wx - camX, y + 4);
  }
  ctx.stroke();

  // Houses.
  for (const h of is.houses) {
    const hx = h.x - camX;
    const hy = terrainHeightAt({ islands: [is] }, h.x);
    ctx.fillStyle = h.c;
    ctx.fillRect(hx - h.w / 2, hy - h.h, h.w, h.h);
    ctx.fillStyle = '#b3402e';
    ctx.beginPath();
    ctx.moveTo(hx - h.w / 2 - 3, hy - h.h);
    ctx.lineTo(hx, hy - h.h - 12);
    ctx.lineTo(hx + h.w / 2 + 3, hy - h.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(hx - 4, hy - h.h + 8, 8, 10);
  }
  // Palms.
  for (const p of is.palms) {
    const px = p.x - camX;
    const py = terrainHeightAt({ islands: [is] }, p.x);
    drawPalm(ctx, px, py, p.h, p.lean, time);
  }
  // Runway strip with centre line, edge lights and a windsock.
  if (is.strip) drawRunway(ctx, is.strip, camX, time);
}

function drawPalm(ctx, x, y, h, lean, time) {
  const sway = Math.sin(time * 0.001 + x * 0.01) * 0.05;
  ctx.strokeStyle = '#7c4a21';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * h * 0.5, y - h * 0.6, x + lean * h, y - h);
  ctx.stroke();
  ctx.strokeStyle = '#2f7d3a';
  ctx.lineWidth = 3;
  const tx = x + lean * h;
  const ty = y - h;
  for (let i = 0; i < 5; i++) {
    const a = -0.4 - i * 0.45 + sway;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(a) * 16, ty + Math.sin(a) * 10 - 4, tx + Math.cos(a) * 26, ty + Math.sin(a) * 16 + 6);
    ctx.stroke();
  }
  ctx.fillStyle = '#6b4423';
  ctx.beginPath();
  ctx.arc(tx - 3, ty + 3, 3.5, 0, Math.PI * 2);
  ctx.arc(tx + 4, ty + 4, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawRunway(ctx, strip, camX, time) {
  const x0 = strip.x0 - camX;
  const x1 = strip.x1 - camX;
  const y = strip.y;
  ctx.fillStyle = PALETTE.runway;
  ctx.fillRect(x0, y, x1 - x0, 12);
  ctx.fillStyle = PALETTE.runwayLine;
  const dash = 34;
  for (let x = x0 + 18; x < x1 - 30; x += dash) {
    ctx.fillRect(x, y + 5, 18, 3);
  }
  // Threshold bars.
  ctx.fillRect(x0 + 8, y + 2, 10, 8);
  ctx.fillRect(x1 - 18, y + 2, 10, 8);
  // Edge lights blink in sequence.
  const on = Math.floor(time / 350) % 2 === 0;
  ctx.fillStyle = on ? '#fde047' : '#a16207';
  for (let x = x0 + 24; x < x1 - 10; x += 72) {
    ctx.beginPath();
    ctx.arc(x, y - 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Windsock at the far end.
  const wx = x1 - 46;
  const wave = Math.sin(time * 0.004) * 0.12;
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(wx, y);
  ctx.lineTo(wx, y - 44);
  ctx.stroke();
  ctx.save();
  ctx.translate(wx, y - 44);
  ctx.rotate(0.25 + wave);
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(30, -5);
  ctx.lineTo(30, 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(10, -5, 6, 10);
  ctx.restore();
}
