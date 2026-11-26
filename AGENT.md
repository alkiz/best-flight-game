# AGENT.md — Sky Courier: Island Run (best-flight-game-20261126-0057)

Entry for make.fun's "Make the best flight game" bounty ($500, deadline 2026-11-28 07:57 WIB).
Built by an AI agent in one session; the transcripts are the build record.

## What it is

A 2D canvas bush-plane game. Three legs across an island chain: thread
golden rings, dodge storms/birds/balloons/towers, manage fuel, land on the
destination runway. HUD: ALT (ft), SPD (kt), HDG, compass, fuel, hearts,
score, route strip. All art is canvas-drawn, all sound is WebAudio synth.

## Layout

- `main.ts` — entrypoint, copies game/ + screenshots/ to /output, writes
  dossier.json via vendor/makefun-game.ts (kit copy, unchanged).
- `game/index.html`, `game/style.css` — page shell.
- `game/src/config.js` — tuning: physics, scoring, missions, palette.
- `game/src/random.js` — seeded RNG (mulberry32); same seed, same world.
- `game/src/audio.js` — WebAudio synth: engine hum, wind, rings, crashes.
- `game/src/terrain.js` — islands, sea, runways, palms, houses, clouds.
- `game/src/plane.js` — flight model (throttle/pitch/stall/fuel) + drawing.
- `game/src/obstacles.js` — rings, balloons, birds, storms, towers.
- `game/src/hud.js` — instruments, route strip, overlays.
- `game/src/game.js` — state machine, collisions, scoring, landings.
- `game/src/input.js` — keyboard / mouse / touch.
- `game/src/shots.js` — deterministic ?shot=start|play|land|end poses.
- `game/src/main.js` — bootstrap + frame loop; window.SkyCourier for tests.
- `serve.ts` — local server on :8080. `shots.json` — the 4 screenshots.

## Playtest

```sh
node serve.ts   # http://localhost:8080
node shoot.mjs  # Playwright: plays leg 1, takes screenshots/1-4.jpg
```

## Submit

Parent (Momo) handles repo creation, push, About, bundle and submit.
Kit check: `node cli/makefun.mjs check --kit <kit> --repo . --transcripts transcripts.tar.gz`
from the unpacked kit directory.
