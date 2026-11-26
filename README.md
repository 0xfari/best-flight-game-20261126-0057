# Ember Isles Airmail

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/0xfari/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/0xfari/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A bush-plane courier game for the [best flight game bounty](https://make.fun/bounty/best-flight-game-20261126-0057). Fly the mail plane through the rings over the Ember Isles, mind the fuel and the wind, and put her down gently on the lit strip at Ember Point.

Three sorties with different weather, fuel and ring lines: First Light Run, Crosswind Canyon and Night Mail.

## Play

Serve `game/` with any static server — `node serve.ts`, then open http://localhost:8080 — and fly with the keyboard:

- **↑ / W** throttle up, **↓ / S** throttle down
- **← → / A D** pitch up and down
- **SPACE** flaps (extra lift for landing)
- **P** pause, **R** restart, **M** mute, **1 / 2 / 3** pick a sortie

Fly through every ring (each one tops up the fuel), then land on the runway: gentle descent, slow speed, wings level. A hard touchdown, a ditch in the sea or an empty tank ends the sortie.

## Files

- `game/index.html` — the page; `game/src/` holds one file per job: `config.js` (tuning and missions), `random.js` (seeded noise), `terrain.js` (the islands), `plane.js` (flight model and the aircraft), `input.js`, `audio.js` (synthesized sound), `instruments.js` (HUD and gauges), `missions.js` (rings and scoring), `render.js` (the scene), `game.js` (state machine), `shots.js` (screenshot states), `main.js` (the loop).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`.
- `screenshots/` — real renders of the game in a browser (start, play, rings, end).
