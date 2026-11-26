// hud.js — the cockpit instruments and every screen overlay.
// The HUD is drawn on the canvas so it shows in screenshots exactly
// as the pilot sees it: ALT, SPD and HDG, fuel, score, rings, lives.

import { VIEW, PALETTE } from './config.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function gaugeBar(ctx, x, y, w, h, frac, color, bg = 'rgba(255,255,255,0.18)') {
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  const fw = Math.max(h, w * Math.min(1, Math.max(0, frac)));
  roundRect(ctx, x, y, fw, h, h / 2);
  ctx.fill();
}

export function drawHUD(ctx, s) {
  // --- instruments: ALT / SPD / HDG ---
  const labels = [
    { k: 'ALT', v: `${s.altFt.toLocaleString('en-US')} ft`, sub: 'ALTITUDE' },
    { k: 'SPD', v: `${s.speedKt} kt`, sub: s.stalled ? 'STALL!' : 'AIRSPEED' },
    { k: 'HDG', v: `${String(s.hdg).padStart(3, '0')}°`, sub: 'HEADING' },
  ];
  labels.forEach((ins, i) => {
    const x = 16 + i * 158;
    panel(ctx, x, 14, 146, 64);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ins.sub, x + 12, 32);
    ctx.fillStyle = ins.k === 'SPD' && s.stalled ? PALETTE.hudRed : PALETTE.hudText;
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText(ins.v, x + 12, 60);
  });
  // Compass strip under the instruments.
  ctx.save();
  ctx.beginPath();
  ctx.rect(16, 86, 462, 22);
  ctx.clip();
  ctx.fillStyle = 'rgba(8,20,36,0.6)';
  ctx.fillRect(16, 86, 462, 22);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let d = 0; d < 360; d += 15) {
    const off = ((d - s.hdg + 540) % 360) - 180;
    const x = 16 + 231 + off * 3.1;
    if (x < 10 || x > 484) continue;
    const card = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d];
    ctx.fillText(card || `${d}`, x, 101);
    if (d % 45 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x - 0.5, 88, 1, 5);
      ctx.fillStyle = '#94a3b8';
    }
  }
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.beginPath();
  ctx.moveTo(247, 86);
  ctx.lineTo(241, 78);
  ctx.lineTo(253, 78);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // --- mission + score, top centre ---
  panel(ctx, VIEW.width / 2 - 190, 14, 380, 64);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(s.missionName.toUpperCase(), VIEW.width / 2, 32);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText(`SCORE ${s.score.toLocaleString('en-US')}`, VIEW.width / 2, 58);
  // Ring pips.
  const pipW = 16;
  const totalW = s.ringsTotal * (pipW + 6);
  let px = VIEW.width / 2 - totalW / 2;
  for (let i = 0; i < s.ringsTotal; i++) {
    ctx.fillStyle = i < s.ringsPassed ? PALETTE.ring : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(px + pipW / 2, 70, 6, 0, Math.PI * 2);
    ctx.fill();
    px += pipW + 6;
  }

  // --- fuel, hearts, lives, top right ---
  panel(ctx, VIEW.width - 268, 14, 252, 64);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FUEL', VIEW.width - 256, 32);
  const fuelColor = s.fuel > 30 ? PALETTE.hudGreen : s.fuel > 12 ? PALETTE.hudAmber : PALETTE.hudRed;
  gaugeBar(ctx, VIEW.width - 256, 40, 130, 12, s.fuel / 100, fuelColor);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText(`${Math.round(s.fuel)}%`, VIEW.width - 118, 51);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), VIEW.width - 256, 72);
  ctx.textAlign = 'right';
  ctx.fillText(`✈ ×${s.lives}`, VIEW.width - 28, 72);
  ctx.textAlign = 'left';

  // --- throttle gauge, bottom left ---
  panel(ctx, 16, VIEW.height - 58, 210, 42);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('THROTTLE', 28, VIEW.height - 42);
  gaugeBar(ctx, 28, VIEW.height - 34, 150, 10, s.throttle, '#38bdf8');
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText(`${Math.round(s.throttle * 100)}%`, 186, VIEW.height - 24);

  // --- route strip, bottom centre: start, rings, destination ---
  const rx0 = VIEW.width / 2 - 220;
  const rw = 440;
  const ry = VIEW.height - 34;
  ctx.fillStyle = 'rgba(8,20,36,0.55)';
  roundRect(ctx, rx0 - 10, ry - 12, rw + 20, 26, 13);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rx0, ry);
  ctx.lineTo(rx0 + rw, ry);
  ctx.stroke();
  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(s.fromShort, rx0, ry - 16);
  ctx.fillText(s.toShort, rx0 + rw, ry - 16);
  for (let i = 0; i < s.ringsTotal; i++) {
    const fx = rx0 + ((i + 1) / (s.ringsTotal + 1)) * rw;
    ctx.fillStyle = i < s.ringsPassed ? PALETTE.ring : 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(fx, ry, i < s.ringsPassed ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const planeFx = rx0 + Math.min(1, Math.max(0, s.progress)) * rw;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(planeFx + 8, ry);
  ctx.lineTo(planeFx - 6, ry - 6);
  ctx.lineTo(planeFx - 6, ry + 6);
  ctx.closePath();
  ctx.fill();

  // --- warnings ---
  if (s.stalled && s.phase === 'flying') {
    ctx.fillStyle = Math.floor(performance.now() / 250) % 2 ? PALETTE.hudRed : '#fff';
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ STALL — THROTTLE UP!', VIEW.width / 2, 150);
  } else if (s.fuel <= 12 && s.fuel > 0 && s.phase === 'flying') {
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOW FUEL — FIND A RING', VIEW.width / 2, 150);
  } else if (s.fuel <= 0 && s.phase === 'flying') {
    ctx.fillStyle = PALETTE.hudRed;
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ENGINE OUT — GLIDE TO THE RUNWAY', VIEW.width / 2, 150);
  }

  // --- floating score popups ---
  ctx.textAlign = 'center';
  for (const p of s.popups) {
    ctx.globalAlpha = Math.min(1, p.life / 0.5);
    ctx.fillStyle = p.color;
    ctx.font = '800 22px system-ui, sans-serif';
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;

  // --- centre banner (RING! / DELIVERED / TURN BACK...) ---
  if (s.banner && s.bannerTtl > 0) {
    ctx.globalAlpha = Math.min(1, s.bannerTtl);
    ctx.fillStyle = s.bannerColor || PALETTE.hudText;
    ctx.font = '800 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.banner, VIEW.width / 2, 210);
    ctx.globalAlpha = 1;
  }
}

export function drawTitle(ctx, s) {
  dim(ctx, 0.45);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = '800 64px system-ui, sans-serif';
  ctx.fillText('SKY COURIER', VIEW.width / 2, 210);
  ctx.fillStyle = PALETTE.ring;
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText('— Island Run —', VIEW.width / 2, 258);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '400 19px system-ui, sans-serif';
  ctx.fillText('Fly the island chain. Thread the golden rings. Land the cargo.', VIEW.width / 2, 306);
  ctx.fillText(`Leg 1 carries ${s.cargo}. Three legs, one sunset.`, VIEW.width / 2, 336);
  panel(ctx, VIEW.width / 2 - 330, 380, 660, 150);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillText('↑ / W climb      ↓ / S descend      → / D throttle up      ← / A throttle down', VIEW.width / 2, 414);
  ctx.fillText('Mouse: steer toward the pointer      Space: airbrake      P: pause      M: mute', VIEW.width / 2, 446);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.fillText('Rings refuel you. Storms, birds, balloons and towers do not.', VIEW.width / 2, 478);
  ctx.fillStyle = '#fff';
  ctx.font = '700 26px system-ui, sans-serif';
  const pulse = 0.65 + Math.sin(performance.now() / 300) * 0.35;
  ctx.globalAlpha = pulse;
  ctx.fillText('Press ENTER or click to take off', VIEW.width / 2, 590);
  ctx.globalAlpha = 1;
  if (s.best > 0) {
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText(`Best score: ${s.best.toLocaleString('en-US')}`, VIEW.width / 2, 630);
  }
}

export function drawPaused(ctx) {
  dim(ctx, 0.55);
  ctx.fillStyle = '#fff';
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', VIEW.width / 2, 360);
  ctx.font = '400 20px system-ui, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Press P to keep flying · R to restart the leg', VIEW.width / 2, 404);
}

export function drawMissionComplete(ctx, s) {
  dim(ctx, 0.5);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.ring;
  ctx.font = '800 52px system-ui, sans-serif';
  ctx.fillText('DELIVERED!', VIEW.width / 2, 220);
  ctx.fillStyle = '#fff';
  ctx.font = '400 21px system-ui, sans-serif';
  ctx.fillText(`${s.missionName} — ${s.cargo} arrived in one piece.`, VIEW.width / 2, 264);
  panel(ctx, VIEW.width / 2 - 260, 300, 520, 210);
  const rows = [
    ['Rings flown', `${s.ringsPassed} / ${s.ringsTotal}`],
    ['Time', `${s.timeText}  (par ${s.parText})`],
    ['Delivery bonus', `+${s.deliveryBonus}`],
    ['Fuel bonus', `+${s.fuelBonus}`],
    ['Leg score', `${s.legScore.toLocaleString('en-US')}`],
    ['Total score', `${s.score.toLocaleString('en-US')}`],
  ];
  ctx.font = '600 19px system-ui, sans-serif';
  rows.forEach((r, i) => {
    const y = 336 + i * 30;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(r[0], VIEW.width / 2 - 230, y);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(r[1], VIEW.width / 2 + 230, y);
  });
  ctx.fillStyle = '#fff';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const pulse = 0.65 + Math.sin(performance.now() / 300) * 0.35;
  ctx.globalAlpha = pulse;
  ctx.fillText(s.lastMission ? 'Press ENTER for the final results' : 'Press ENTER for the next leg', VIEW.width / 2, 580);
  ctx.globalAlpha = 1;
}

export function drawGameComplete(ctx, s) {
  dim(ctx, 0.55);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.ring;
  ctx.font = '800 56px system-ui, sans-serif';
  ctx.fillText('ROUTE COMPLETE!', VIEW.width / 2, 230);
  ctx.fillStyle = '#fff';
  ctx.font = '400 21px system-ui, sans-serif';
  ctx.fillText('All three legs flown. The cake survived. The islands applaud.', VIEW.width / 2, 276);
  ctx.font = '800 40px system-ui, sans-serif';
  ctx.fillText(`FINAL SCORE  ${s.score.toLocaleString('en-US')}`, VIEW.width / 2, 360);
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`Best: ${s.best.toLocaleString('en-US')}   ·   Rings: ${s.totalRings}   ·   Landings: ${s.landings}`, VIEW.width / 2, 404);
  ctx.fillStyle = '#fff';
  ctx.font = '700 24px system-ui, sans-serif';
  const pulse = 0.65 + Math.sin(performance.now() / 300) * 0.35;
  ctx.globalAlpha = pulse;
  ctx.fillText('Press ENTER to fly the route again', VIEW.width / 2, 500);
  ctx.globalAlpha = 1;
}

export function drawGameOver(ctx, s) {
  dim(ctx, 0.6);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudRed;
  ctx.font = '800 56px system-ui, sans-serif';
  ctx.fillText('GAME OVER', VIEW.width / 2, 300);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '400 21px system-ui, sans-serif';
  ctx.fillText('Three sorties lost over the islands. The courier hangs up the headset.', VIEW.width / 2, 346);
  ctx.fillStyle = '#fff';
  ctx.font = '800 36px system-ui, sans-serif';
  ctx.fillText(`SCORE  ${s.score.toLocaleString('en-US')}`, VIEW.width / 2, 420);
  ctx.font = '700 24px system-ui, sans-serif';
  const pulse = 0.65 + Math.sin(performance.now() / 300) * 0.35;
  ctx.globalAlpha = pulse;
  ctx.fillText('Press ENTER to try again', VIEW.width / 2, 500);
  ctx.globalAlpha = 1;
}

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(4, 12, 24, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}
