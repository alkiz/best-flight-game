# best-flight-game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/alkiz/best-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/alkiz/best-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Sky Courier — Island Run: a complete, original flight game for make.fun's **"Make the best flight game"** bounty ($500). Fly a little bush plane across a tropical island chain: thread the golden rings, dodge storm clouds, birds, hot-air balloons and radio towers, watch your fuel, and put the cargo down gently on the next island's runway.

## Run it

```sh
node serve.ts
```

Open http://localhost:8080 in desktop Chrome. No network, no build step, no accounts.

---

<sub>Entered on [make.fun](https://make.fun/?ref=shsdrk82&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>

## Play

1. Press **Enter** (or click) to take off. Hold **→** to throttle up, tap **↑** to pitch up and lift off the runway.
2. Fly through the golden rings in order — each one scores and refuels you. A dead-centre pass is a **Perfect** (+150).
3. Dodge storm clouds, bird flocks, balloons and radio towers. Three hits and the sortie is over.
4. Land on the destination runway: slow, gentle, gear down. A good landing pays a delivery bonus plus your leftover time and fuel.
5. Three legs: Coral Bay → Palm Island → Turtle Rock → Sunset Strip. Finish all three to complete the route.

Keys: `↑/W` climb · `↓/S` descend · `→/D` throttle up · `←/A` throttle down · `Space` airbrake · `P` pause · `M` mute · `R` restart leg · `Enter` start / next leg. Mouse: hold to steer toward the pointer.

## The route

- **Leg 1 — Coral Bay to Palm Island**: 5 rings, 1 storm, par 1:15. Cargo: a crate of mangoes.
- **Leg 2 — Palm Island to Turtle Rock**: 7 rings, 2 storms, par 1:45. Cargo: a box of spare spark plugs.
- **Leg 3 — Turtle Rock to Sunset Strip**: 9 rings, 3 storms, par 2:20. Cargo: a birthday cake (do not drop it).
- Scoring: ring +100, perfect ring +150, ring streaks add +25 each, near miss +40, delivery +500 plus time and fuel bonuses. Three lives per run.
- The HUD shows altitude (ft), airspeed (kt) and heading, a compass strip, fuel, hearts, score and a route strip with every ring. Stall below ~80 kt and the wing quits — throttle up.

## Playtest knobs (URL parameters)

`game/index.html?shot=start|play|land|end&seed=1` — frozen screenshot poses: title on the runway, mid-flight through a ring, final approach, and the delivery screen. Used to take the screenshots.

## Layout

- `main.ts` — entrypoint: copies `game/` + `screenshots/` to `/output` and writes `dossier.json` via `buildDossier` from `vendor/makefun-game.ts`.
- `game/` — the playable game as static files (`index.html`, `style.css`, `src/*.js`, one job per file).
- `screenshots/` — 4 real renders of the game.
- `vendor/makefun-game.ts` — the kit's copy, unchanged.

All art is drawn on canvas, all sounds are synthesized with WebAudio — no files, no network. Built by an AI agent for [make.fun](https://make.fun/bounty/best-flight-game-20261126-0057). License: MIT.
