// plane.js — the bush plane: its flight model and its drawing.
// The plane always faces right; the world scrolls past it.

import { FLIGHT, PILOT, SEA_Y, PALETTE } from './config.js';

export function createPlane(startX, startY) {
  return {
    x: startX, // world x
    y: startY, // screen y
    vy: 0,
    speed: 0, // px/s forward
    pitch: 0, // radians, + is nose up
    pitchTarget: 0,
    throttle: 0, // 0..1
    fuel: 100,
    onGround: true,
    gearDown: true,
    propAngle: 0,
    trail: [], // exhaust puffs {x, y, r, life}
  };
}

// input: { climb: -1..1, throttleDelta, brake, pointerY|null, pointerActive }
// Returns { stalled } for the HUD and audio.
export function stepPlane(p, input, dt, groundY) {
  // Throttle.
  p.throttle = Math.min(1, Math.max(0, p.throttle + input.throttleDelta * dt * 1.4));
  const targetSpeed = p.onGround
    ? FLIGHT.minSpeed + p.throttle * 120
    : FLIGHT.minSpeed + p.throttle * (FLIGHT.maxSpeed - FLIGHT.minSpeed);
  const accel = input.brake ? -FLIGHT.brake : FLIGHT.accel;
  if (p.speed < targetSpeed) p.speed = Math.min(targetSpeed, p.speed + accel * dt);
  else p.speed = Math.max(targetSpeed, p.speed - FLIGHT.brake * dt * (input.brake ? 1 : 0.15));
  p.speed = Math.max(0, p.speed - FLIGHT.drag * p.speed * dt * 0.2);

  // Pitch: keyboard sets a target; the pointer steers toward its height.
  if (input.pointerActive && input.pointerY != null) {
    const dy = input.pointerY - p.y;
    p.pitchTarget = Math.max(-FLIGHT.pitchMax, Math.min(FLIGHT.pitchMax, dy * 0.004));
  } else {
    p.pitchTarget = -input.climb * FLIGHT.pitchMax;
  }
  const dp = p.pitchTarget - p.pitch;
  p.pitch += Math.max(-FLIGHT.pitchSpeed * dt, Math.min(FLIGHT.pitchSpeed * dt, dp));

  // Vertical speed from pitch and lift; stall when too slow.
  // Pitch is negative nose-up (canvas rotation), so sin(pitch) is negative
  // when climbing and vy (screen y grows downward) goes negative: up.
  const lift = Math.min(1, p.speed / 130);
  const stalled = !p.onGround && p.speed < FLIGHT.minSpeed + 12;
  let vy = Math.sin(p.pitch) * p.speed * lift;
  vy += (1 - lift) * 90; // weak lift at low speed: the plane sinks
  if (stalled) vy += 80; // stalled: the nose drops and the plane drops
  p.vy = vy;

  if (!p.onGround) {
    p.y += vy * dt;
    p.x += p.speed * dt;
  } else {
    // Rolling on the runway: pick up speed, then lift off.
    p.x += p.speed * dt;
    if (p.speed > 150 && p.pitchTarget < -0.08) {
      p.onGround = false;
      p.gearDown = false;
    }
    p.y = groundY - 14;
  }

  // Fuel burn follows the throttle; the engine quits on empty.
  if (!p.onGround && p.fuel > 0) {
    p.fuel = Math.max(0, p.fuel - (0.35 + p.throttle * PILOT.fuelBurn) * dt);
    if (p.fuel <= 0) p.throttle = 0;
  }
  p.propAngle += dt * (4 + p.throttle * 40 + p.speed * 0.05);

  // Exhaust puffs behind the tail.
  if (!p.onGround && p.throttle > 0.15 && Math.random() < 0.5) {
    p.trail.push({ x: p.x - 46, y: p.y + 4, r: 3 + Math.random() * 4, life: 0.7 });
  }
  for (const t of p.trail) t.life -= dt;
  p.trail = p.trail.filter((t) => t.life > 0);
  return { stalled };
}

export function drawPlane(ctx, p, screenX, time, camX) {
  // Exhaust puffs (the trail stores world x; camX maps it to the screen).
  for (const t of p.trail) {
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, t.life * 0.35)})`;
    ctx.beginPath();
    ctx.arc(t.x - camX, t.y, t.r * (1.4 - t.life), 0, Math.PI * 2);
    ctx.fill();
  }

  // Shadow on the ground below (only when low).
  const groundGap = SEA_Y - p.y;
  if (groundGap > 0 && groundGap < 320) {
    ctx.fillStyle = `rgba(0,0,0,${0.22 * (1 - groundGap / 320)})`;
    ctx.beginPath();
    ctx.ellipse(screenX, SEA_Y - 4, 46 * (1 - groundGap / 420), 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(screenX, p.y);
  ctx.rotate(p.pitch * 0.55);

  // Tail fin.
  ctx.fillStyle = PALETTE.planeTeal;
  ctx.beginPath();
  ctx.moveTo(-34, -2);
  ctx.lineTo(-50, -26);
  ctx.lineTo(-38, -28);
  ctx.lineTo(-24, -4);
  ctx.closePath();
  ctx.fill();
  // Tailplane.
  ctx.fillStyle = PALETTE.planeCoral;
  ctx.beginPath();
  ctx.moveTo(-36, 2);
  ctx.lineTo(-52, 8);
  ctx.lineTo(-50, 13);
  ctx.lineTo(-32, 8);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  ctx.fillStyle = PALETTE.planeCream;
  ctx.beginPath();
  ctx.moveTo(52, 0);
  ctx.quadraticCurveTo(40, -13, 8, -14);
  ctx.lineTo(-30, -11);
  ctx.quadraticCurveTo(-44, -10, -44, 0);
  ctx.quadraticCurveTo(-44, 10, -28, 11);
  ctx.lineTo(20, 12);
  ctx.quadraticCurveTo(44, 11, 52, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.planeDark;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Coral cheatline stripe.
  ctx.fillStyle = PALETTE.planeCoral;
  ctx.beginPath();
  ctx.moveTo(50, 1);
  ctx.quadraticCurveTo(20, -3, -28, -2);
  ctx.lineTo(-28, 3);
  ctx.quadraticCurveTo(20, 3, 50, 5);
  ctx.closePath();
  ctx.fill();
  // Cockpit windows.
  ctx.fillStyle = '#bae6fd';
  ctx.beginPath();
  ctx.moveTo(30, -11);
  ctx.quadraticCurveTo(18, -13, 12, -11);
  ctx.lineTo(12, -4);
  ctx.lineTo(30, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.moveTo(9, -11);
  ctx.lineTo(2, -11);
  ctx.lineTo(2, -4);
  ctx.lineTo(9, -4);
  ctx.closePath();
  ctx.fill();
  // Wing (high wing, seen from the side).
  ctx.fillStyle = PALETTE.planeTeal;
  ctx.beginPath();
  ctx.moveTo(14, -12);
  ctx.lineTo(-6, -12);
  ctx.lineTo(-12, -30);
  ctx.lineTo(2, -30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-10, -29, 10, 3);
  // Strut.
  ctx.strokeStyle = PALETTE.planeDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(8, -10);
  ctx.lineTo(16, 8);
  ctx.stroke();
  // Nose + spinning propeller.
  ctx.fillStyle = PALETTE.planeDark;
  ctx.beginPath();
  ctx.arc(52, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(56, 0);
  ctx.rotate(p.propAngle);
  ctx.fillStyle = 'rgba(51,65,85,0.75)';
  ctx.beginPath();
  ctx.ellipse(0, -20, 3.5, 20, 0, 0, Math.PI * 2);
  ctx.ellipse(0, 20, 3.5, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.arc(56, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  // Landing gear.
  if (p.gearDown) {
    ctx.strokeStyle = PALETTE.planeDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(28, 11);
    ctx.lineTo(28, 22);
    ctx.moveTo(-14, 11);
    ctx.lineTo(-14, 22);
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(28, 24, 5, 0, Math.PI * 2);
    ctx.arc(-14, 24, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Navigation lights: red left, green right, white tail blink.
  const blink = Math.floor(time / 400) % 2 === 0;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(-44, -2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(50, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  if (blink) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-46, -24, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
