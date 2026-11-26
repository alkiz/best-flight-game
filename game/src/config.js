// config.js — every tunable number for Sky Courier: Island Run.
// One place to balance the game: view, physics, scoring, missions, palette.

export const VIEW = { width: 1280, height: 800 };

// The sea surface sits at this screen y; terrain and runways rise above it.
export const SEA_Y = 660;
// The plane's fixed screen x; the world scrolls past it.
export const PLANE_X = 360;

// --- flight model (screen px, seconds) ---
export const FLIGHT = {
  minSpeed: 70, // px/s — below this the wing stops lifting
  maxSpeed: 430, // px/s — full throttle in a dive
  cruiseSpeed: 210, // px/s — comfortable throttle
  accel: 90, // px/s^2 toward the throttle's target speed
  brake: 260, // px/s^2 while Space (airbrake) is held
  climbRate: 150, // px/s of vertical speed at full climb
  sinkRate: 120, // px/s of vertical speed at full descent
  gravitySink: 34, // px/s^2 extra sink when stalled (too slow)
  pitchMax: 0.62, // radians of nose up/down the pilot can command
  pitchSpeed: 2.4, // rad/s the nose moves toward the commanded pitch
  drag: 0.12, // 1/s passive speed bleed
};

// --- fuel, damage, lives ---
export const PILOT = {
  fuelMax: 100,
  fuelBurn: 1.15, // units/s at full throttle (scales with throttle)
  fuelPerRing: 9, // fuel back for flying a ring
  fuelPerPerfectRing: 14,
  hearts: 3, // hits before a crash costs a life
  lives: 3, // sorties before game over
  invulnerableMs: 1600, // mercy window after a hit
};

// --- scoring ---
export const SCORE = {
  ring: 100,
  perfectRing: 150,
  ringComboStep: 25, // extra per ring in a row without a miss
  delivery: 500,
  timeBonusPerSecond: 12, // leftover par time, per second
  fuelBonusPerUnit: 4, // leftover fuel at delivery, per unit
  nearMiss: 40, // skimming an obstacle without touching it
};

// --- the three legs of the island run ---
// distance is the leg length in world px; rings and hazards scale with it.
export const MISSIONS = [
  {
    id: 1,
    name: 'Leg 1 — Coral Bay to Palm Island',
    from: 'Coral Bay',
    to: 'Palm Island',
    distance: 6200,
    rings: 5,
    balloons: 3,
    birds: 2,
    storms: 1,
    towers: 1,
    parSeconds: 75,
    cargo: 'a crate of mangoes',
  },
  {
    id: 2,
    name: 'Leg 2 — Palm Island to Turtle Rock',
    from: 'Palm Island',
    to: 'Turtle Rock',
    distance: 9200,
    rings: 7,
    balloons: 5,
    birds: 4,
    storms: 2,
    towers: 2,
    parSeconds: 105,
    cargo: 'a box of spare spark plugs',
  },
  {
    id: 3,
    name: 'Leg 3 — Turtle Rock to Sunset Strip',
    from: 'Turtle Rock',
    to: 'Sunset Strip',
    distance: 12400,
    rings: 9,
    balloons: 7,
    birds: 6,
    storms: 3,
    towers: 3,
    parSeconds: 140,
    cargo: 'a birthday cake (do not drop it)',
  },
];

// --- one warm tropical-dawn palette, used by every draw call ---
export const PALETTE = {
  skyTop: '#2b6cb0',
  skyMid: '#7fb3d9',
  skyHorizon: '#ffd9a0',
  sun: '#fff3c4',
  sunCore: '#ffe27a',
  seaDeep: '#14506e',
  seaShallow: '#2e8b9a',
  seaGlitter: '#ffe9a8',
  sand: '#f2d8a0',
  grass: '#4d9e57',
  grassDark: '#357a40',
  hill: '#3c7a4e',
  mountainFar: '#7d9bb5',
  mountainNear: '#5b7d95',
  cloud: '#ffffff',
  storm: '#4a4a58',
  stormBelly: '#2e2e3a',
  planeCream: '#fff6e0',
  planeTeal: '#0f766e',
  planeCoral: '#e85d3d',
  planeDark: '#334155',
  ring: '#ffd23e',
  ringGlow: '#ff9d00',
  runway: '#3f4756',
  runwayLine: '#f8fafc',
  hudPanel: 'rgba(8, 20, 36, 0.72)',
  hudText: '#f1f5f9',
  hudAmber: '#fbbf24',
  hudGreen: '#4ade80',
  hudRed: '#f87171',
};
