// Ember Isles Airmail — screenshot states.
// One job: put the game into a fixed, readable scene for each shot, so
// the screenshots are real renders of the game's own code, taken in a
// browser, with nothing staged by hand afterwards.
//
//   ?shot=start  — title screen over the dawn isles
//   ?shot=play   — mid-flight: plane, ring ahead, runway in the distance
//   ?shot=rings  — the plane threading a ring, burst going off
//   ?shot=end    — landed on the strip, DELIVERED banner up
//
// A shot freezes the simulation after its setup so the frame is stable.

import { startMission } from './game.js';
import { drawFlightFrame, spawnBurst } from './render.js';
import { worldToScreen } from './terrain.js';
import { scoreSortie } from './missions.js';

export function shotFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
}

export function applyShot(game, shot) {
  if (!shot) return false;
  if (shot === 'start') {
    game.state = 'title';
    game.timeSec = 8;
    return true;
  }
  if (shot === 'play') {
    startMission(game, 0);
    settleFlight(game, 1500, 190, 0.72, 2);
    return true;
  }
  if (shot === 'rings') {
    startMission(game, 0);
    // Thread the second ring: the plane sits in its centre, the burst
    // going off around it. Only the first ring is already flown, so this
    // one still draws.
    const ring = game.rings[1];
    settleFlight(game, ring.x, ring.alt, 0.68, 1);
    const p = worldToScreen(ring.x, ring.alt, game.camX, game.camAlt, game.scale);
    spawnBurst(game.particles, p.x, p.y, '#ffcf3f', 30);
    return true;
  }
  if (shot === 'end') {
    startMission(game, 0);
    const strip = game.terrain.runway;
    settleFlight(game, (strip.x0 + strip.x1) / 2, strip.alt + 1, 0.2, 6);
    // Frame the strip, not the sky: lift the camera so the runway and
    // the plane sit in the lower third with air above them, and centre
    // the plane on the strip instead of pinning it to the left edge.
    game.camAlt = -160;
    game.camX = (strip.x0 + strip.x1) / 2 - 600;
    game.plane.speed = 0;
    game.plane.vspeed = 0;
    game.state = 'landed';
    // The real scorer, not a hand-written tally, so the banner's numbers
    // are the ones a finished sortie would show.
    game.result = scoreSortie(6, 6, true, false, 96, 120);
    return true;
  }
  return false;
}

// Place the plane and let the camera catch up, without burning fuel or
// time: the shot is a still, not a flight.
function settleFlight(game, x, alt, throttle, ringsTaken) {
  const plane = game.plane;
  plane.x = x;
  plane.alt = alt;
  plane.throttle = throttle;
  plane.speed = 46;
  plane.pitchDeg = 2;
  plane.fuel = 96;
  for (let i = 0; i < ringsTaken && i < game.rings.length; i++) {
    game.rings[i].taken = true;
  }
  game.camX = Math.max(0, x - 380);
  game.camAlt = Math.max(0, Math.min(420, alt - 140));
  game.timeSec = 42;
  game.flightTime = 42;
}
