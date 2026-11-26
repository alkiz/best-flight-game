// game.js — the state machine: legs, rings, fuel, damage, landings,
// crashes, scoring. It owns the world (terrain, obstacles, plane) and
// turns input + time into a new state every frame.

import { VIEW, SEA_Y, PLANE_X, MISSIONS, PILOT, SCORE } from './config.js';
import { createPlane, stepPlane, drawPlane } from './plane.js';
import { buildTerrain, terrainHeightAt, runwayAt, drawTerrain } from './terrain.js';
import {
  buildObstacles, updateObstacles, nextRing, ringCrossed,
  hitTest, nearMiss, drawObstacles,
} from './obstacles.js';
import { drawHUD, drawTitle, drawPaused, drawMissionComplete, drawGameComplete, drawGameOver } from './hud.js';

export function createGame(seedText = '1') {
  const game = {
    seed: seedText,
    phase: 'title', // title | flying | paused | landed | crashed | complete | gameover
    missionIndex: 0,
    score: 0,
    best: 0,
    lives: PILOT.lives,
    totalRings: 0,
    landings: 0,
    muted: false,
    frozen: false, // screenshot poses freeze the physics
    time: 0, // wall time the renderer reads
    legTime: 0,
    combo: 0,
    popups: [],
    banner: '',
    bannerColor: '#fff',
    bannerTtl: 0,
    crashTtl: 0,
    invulnUntil: 0,
    nearMissAt: 0,
    legStats: null,
    prevX: 0,
  };
  startLeg(game, 0);
  game.phase = 'title';
  return game;
}

export function currentMission(game) {
  return MISSIONS[game.missionIndex];
}

export function startLeg(game, index) {
  const mission = MISSIONS[index];
  game.missionIndex = index;
  game.mission = mission;
  game.terrain = buildTerrain(game.seed, mission);
  game.obs = buildObstacles(game.seed, mission, game.terrain);
  const home = runwayAt(game.terrain, 'home');
  const startX = home ? home.x0 + 80 : 100;
  const startY = home ? home.y - 14 : SEA_Y - 14;
  game.plane = createPlane(startX, startY);
  game.plane.throttle = 0;
  game.hearts = PILOT.hearts;
  game.legTime = 0;
  game.combo = 0;
  game.popups = [];
  game.banner = '';
  game.bannerTtl = 0;
  game.legStats = null;
  game.prevX = game.plane.x;
  game.invulnUntil = 0;
}

function addPopup(game, text, color) {
  game.popups.push({ x: PLANE_X + 90, y: game.plane.y - 60, text, color, life: 1.4 });
}

function setBanner(game, text, color = '#fff', ttl = 1.6) {
  game.banner = text;
  game.bannerColor = color;
  game.bannerTtl = ttl;
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function update(game, input, dt, sound) {
  if (game.frozen) return;
  game.time += dt * 1000;

  if (input.mute) {
    game.muted = !game.muted;
    sound.setMuted(game.muted);
  }

  if (game.phase === 'title') {
    if (input.enter || input.clicked) {
      game.phase = 'flying';
      sound.ensure();
      sound.resume();
      sound.click();
      setBanner(game, `${game.mission.name} — deliver ${game.mission.cargo}!`, '#ffd23e', 2.2);
    }
    return;
  }

  if (game.phase === 'flying' && input.pause) {
    game.phase = 'paused';
    sound.setFlight(0, 0, false);
    return;
  }
  if (game.phase === 'paused') {
    if (input.pause || input.enter) {
      game.phase = 'flying';
      sound.resume();
    }
    if (input.restart) {
      startLeg(game, game.missionIndex);
      game.phase = 'flying';
    }
    return;
  }
  if (game.phase === 'landed' || game.phase === 'complete') {
    if (input.enter) {
      if (game.phase === 'landed') {
        if (game.missionIndex + 1 < MISSIONS.length) {
          startLeg(game, game.missionIndex + 1);
          game.phase = 'flying';
          setBanner(game, `${currentMission(game).name} — deliver ${currentMission(game).cargo}!`, '#ffd23e', 2.2);
        } else {
          game.phase = 'complete';
        }
      } else {
        // Fly the whole route again, score kept as the new best.
        game.best = Math.max(game.best, game.score);
        game.score = 0;
        game.lives = PILOT.lives;
        game.totalRings = 0;
        game.landings = 0;
        startLeg(game, 0);
        game.phase = 'flying';
      }
      sound.click();
    }
    return;
  }
  if (game.phase === 'gameover') {
    if (input.enter) {
      game.best = Math.max(game.best, game.score);
      game.score = 0;
      game.lives = PILOT.lives;
      game.totalRings = 0;
      game.landings = 0;
      startLeg(game, 0);
      game.phase = 'flying';
      sound.click();
    }
    return;
  }
  if (game.phase === 'crashed') {
    game.crashTtl -= dt;
    if (game.crashTtl <= 0) {
      if (game.lives > 0) {
        startLeg(game, game.missionIndex);
        game.phase = 'flying';
        setBanner(game, `Sortie ${PILOT.lives - game.lives + 1} — try the leg again`, '#fff', 2);
      } else {
        game.phase = 'gameover';
        sound.gameOver();
      }
    }
    return;
  }

  // --- flying ---
  game.legTime += dt;
  const p = game.plane;
  const groundY = terrainHeightAt(game.terrain, p.x);
  const step = stepPlane(p, input, dt, groundY);
  updateObstacles(game.obs, dt, game.time);
  sound.setFlight(p.throttle, p.speed / 430, !p.onGround);

  // Ceiling and the back edge of the world.
  if (p.y < 80) {
    p.y = 80;
    p.vy = 0;
  }
  if (p.x < -100) p.x = -100;

  // Rings: crossing the next ring's line scores. A ring the plane has
  // flown past without entering is missed — it must not block the rings
  // after it, or no later ring could ever score.
  for (const r of game.obs.rings) {
    if (!r.passed && !r.missed && r.x < p.x - 20) {
      r.missed = true;
      game.combo = 0;
      addPopup(game, 'MISSED RING', '#cbd5e1');
    }
  }
  const ring = nextRing(game.obs);
  if (ring && game.prevX < ring.x && p.x >= ring.x) {
    const res = ringCrossed(p, ring);
    if (res) {
      ring.passed = true;
      ring.perfect = res.perfect;
      const pts = (res.perfect ? SCORE.perfectRing : SCORE.ring) + game.combo * SCORE.ringComboStep;
      game.score += pts;
      game.totalRings++;
      game.combo++;
      p.fuel = Math.min(100, p.fuel + (res.perfect ? PILOT.fuelPerPerfectRing : PILOT.fuelPerRing));
      addPopup(game, res.perfect ? `PERFECT +${pts}` : `RING +${pts}`, '#ffd23e');
      setBanner(game, res.perfect ? 'PERFECT RING!' : 'RING!', '#ffd23e', 0.9);
      sound.ring(res.perfect);
    }
  }
  game.prevX = p.x;

  // Overshot the runway: a go-around, not a dead end. The plane is put
  // back on final approach with speed to fly, and tries the landing again.
  const destStrip = runwayAt(game.terrain, 'dest');
  if (destStrip && p.x > destStrip.x1 + 150) {
    p.x = destStrip.x0 - 1300;
    p.y = destStrip.y - 180;
    p.vy = 0;
    p.speed = 210;
    p.throttle = 0.6;
    p.pitch = 0.08;
    game.prevX = p.x;
    game.combo = 0;
    setBanner(game, 'GO-AROUND — back on final approach', '#fbbf24', 2);
    sound.scrape();
  }

  // Near misses are worth a little, once a second at most.
  if (game.time - game.nearMissAt > 1200 && nearMiss(p, game.obs)) {
    game.nearMissAt = game.time;
    game.score += SCORE.nearMiss;
    addPopup(game, `NEAR MISS +${SCORE.nearMiss}`, '#7dd3fc');
  }

  // Hits: a short mercy window, a bounce, a lost heart.
  if (game.time > game.invulnUntil) {
    const hit = hitTest(p, game.obs, 22);
    if (hit) {
      game.hearts--;
      game.invulnUntil = game.time + PILOT.invulnerableMs;
      game.combo = 0;
      p.vy = -150;
      p.speed *= 0.72;
      p.fuel = Math.max(0, p.fuel - 4);
      addPopup(game, `HIT — ${hit.toUpperCase()}!`, '#f87171');
      sound.thud();
      if (game.hearts <= 0) return crash(game, sound, 'Torn apart mid-air.');
    }
  }

  // Rolling off the home runway into the sea ends the sortie.
  if (p.onGround && p.x > game.terrain.islands[0].x1 + 30) {
    return crash(game, sound, 'Rolled off the runway into the sea.');
  }

  // Ground and sea.
  if (!p.onGround) {
    const gy = terrainHeightAt(game.terrain, p.x);
    if (p.y + 12 >= gy) {
      const dest = runwayAt(game.terrain, 'dest');
      const overStrip = dest && p.x >= dest.x0 && p.x <= dest.x1;
      if (overStrip) {
        const gentle = Math.abs(p.vy) < 95 && p.speed < 290;
        if (gentle) return land(game, sound);
        // A hard or fast touchdown still lands — but it hurts.
        if (Math.abs(p.vy) < 220 && p.speed < 380) {
          game.hearts--;
          game.invulnUntil = game.time + PILOT.invulnerableMs;
          addPopup(game, 'HARD LANDING — ouch', '#f87171');
          sound.thud();
          if (game.hearts <= 0) return crash(game, sound, 'The landing gear gave up.');
          return land(game, sound);
        }
        return crash(game, sound, 'Slammed into the runway.');
      }
      if (gy >= SEA_Y - 1) return crash(game, sound, 'Ditched in the sea.');
      return crash(game, sound, 'Crashed into the island.');
    }
  }

  // Popups and banner decay.
  for (const pop of game.popups) {
    pop.y -= 34 * dt;
    pop.life -= dt;
  }
  game.popups = game.popups.filter((pop) => pop.life > 0);
  if (game.bannerTtl > 0) game.bannerTtl -= dt;
}

function crash(game, sound, why) {
  game.lives--;
  game.phase = 'crashed';
  game.crashTtl = 1.8;
  game.banner = '';
  game.lastCrash = { why, x: Math.round(game.plane.x), y: Math.round(game.plane.y), speed: Math.round(game.plane.speed) };
  sound.thud();
  sound.setFlight(0, 0, false);
  addPopup(game, why, '#f87171');
  return undefined;
}

function land(game, sound) {
  const p = game.plane;
  const dest = runwayAt(game.terrain, 'dest');
  p.onGround = true;
  p.gearDown = true;
  p.y = dest.y - 14;
  p.speed = Math.min(p.speed, 120);
  p.throttle = 0;
  game.phase = 'landed';
  game.landings++;
  const timeBonus = Math.max(0, Math.round((game.mission.parSeconds - game.legTime) * SCORE.timeBonusPerSecond));
  const fuelBonus = Math.round(p.fuel * SCORE.fuelBonusPerUnit);
  const legScore = SCORE.delivery + timeBonus + fuelBonus;
  game.score += legScore;
  game.legStats = {
    deliveryBonus: SCORE.delivery + timeBonus,
    fuelBonus,
    legScore,
    timeText: fmtTime(game.legTime),
    parText: fmtTime(game.mission.parSeconds),
  };
  setBanner(game, 'DELIVERED!', '#4ade80', 2);
  sound.landJingle();
  sound.setFlight(0, 0, false);
  return undefined;
}

export function hudSnapshot(game) {
  const p = game.plane;
  const mission = game.mission;
  const ringsPassed = game.obs.rings.filter((r) => r.passed).length;
  const altFt = Math.max(0, Math.round((SEA_Y - p.y) * 8));
  const speedKt = Math.round(p.speed * 0.55);
  const hdg = Math.round(Math.min(150, Math.max(30, 90 + p.pitch * 40)));
  const progress = Math.min(1, Math.max(0, p.x / game.terrain.legEnd));
  const s = {
    phase: game.phase,
    altFt,
    speedKt,
    hdg,
    stalled: !p.onGround && p.speed < 82,
    fuel: p.fuel,
    hearts: game.hearts,
    lives: game.lives,
    score: game.score,
    best: game.best,
    missionName: mission.name,
    cargo: mission.cargo,
    ringsPassed,
    ringsTotal: mission.rings,
    throttle: p.throttle,
    fromShort: mission.from,
    toShort: mission.to,
    progress,
    popups: game.popups,
    banner: game.banner,
    bannerTtl: game.bannerTtl,
    bannerColor: game.bannerColor,
    lastMission: game.missionIndex === MISSIONS.length - 1,
    totalRings: game.totalRings,
    landings: game.landings,
  };
  if (game.legStats) Object.assign(s, game.legStats);
  return s;
}

export function draw(game, ctx, time) {
  const p = game.plane;
  const camX = p.x - PLANE_X;
  drawTerrain(ctx, game.terrain, camX, VIEW.width, VIEW.height, time);
  drawObstacles(ctx, game.obs, camX, VIEW.width, time);

  // Off-screen arrow toward the next ring.
  const ring = nextRing(game.obs);
  if (ring && game.phase === 'flying') {
    const sx = ring.x - camX;
    if (sx > VIEW.width - 40 || sx < 40) {
      const ax = sx > VIEW.width - 40 ? VIEW.width - 60 : 60;
      const dir = sx > VIEW.width - 40 ? 1 : -1;
      ctx.save();
      ctx.translate(ax, ring.y);
      ctx.scale(dir, 1);
      ctx.fillStyle = 'rgba(255,210,62,0.9)';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-8, -12);
      ctx.lineTo(-8, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,210,62,0.95)';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(Math.abs(ring.x - p.x) / 50) * 50}m`, ax, ring.y - 24);
    }
  }

  drawPlane(ctx, p, PLANE_X, time, camX);

  const s = hudSnapshot(game);
  if (game.phase !== 'title') drawHUD(ctx, s);
  if (game.phase === 'title') {
    drawHUD(ctx, { ...s, phase: 'title' });
    drawTitle(ctx, s);
  } else if (game.phase === 'paused') drawPaused(ctx);
  else if (game.phase === 'landed') drawMissionComplete(ctx, s);
  else if (game.phase === 'complete') drawGameComplete(ctx, s);
  else if (game.phase === 'gameover') drawGameOver(ctx, s);
  else if (game.phase === 'crashed') {
    ctx.fillStyle = 'rgba(220,38,38,0.28)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#fff';
    ctx.font = '800 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRASHED!', VIEW.width / 2, 330);
    ctx.font = '400 20px system-ui, sans-serif';
    ctx.fillStyle = '#fecaca';
    ctx.fillText(game.lives > 0 ? `Lives left: ${game.lives} — the leg restarts…` : 'No lives left…', VIEW.width / 2, 372);
  }
}
