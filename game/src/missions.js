// Ember Isles Airmail — missions and scoring.
// One job: where the rings hang, what counts as a landing, and what a
// sortie is worth when it ends.

import { makeRandom, range } from './random.js';
import { PHYSICS, RING } from './config.js';
import { terrainHeightAt } from './terrain.js';

// Place the rings along the route: spread out, always well above the
// ground beneath them, never higher than a cruise climb can reach.
export function buildRings(mission, terrain) {
  const rand = makeRandom(mission.seed * 331 + 7);
  const rings = [];
  const start = 700;
  const end = mission.routeLengthM - 700;
  for (let i = 0; i < mission.rings; i++) {
    const t = mission.rings === 1 ? 0.5 : i / (mission.rings - 1);
    const x = start + (end - start) * t + range(rand, -90, 90);
    const ground = terrainHeightAt(terrain, x);
    rings.push({
      x,
      alt: Math.min(320, Math.max(75, ground + range(rand, 55, 95))),
      taken: false,
      pulse: range(rand, 0, Math.PI * 2),
    });
  }
  return rings;
}

// Distance from the plane to the next unflown ring, in metres.
export function nextRingDistance(plane, rings) {
  const next = rings.find((r) => !r.taken);
  if (!next) return 0;
  return Math.hypot(next.x - plane.x, next.alt - plane.alt);
}

// Try to collect a ring the plane just flew through. Returns the ring
// or null. Collecting refunds a little fuel — the airmail bonus.
export function collectRing(plane, rings) {
  for (const ring of rings) {
    if (ring.taken) continue;
    const d = Math.hypot(ring.x - plane.x, ring.alt - plane.alt);
    if (d < RING.collectM) {
      ring.taken = true;
      plane.fuel = Math.min(100, plane.fuel + PHYSICS.ringFuelRefund);
      return ring;
    }
  }
  return null;
}

// Score a finished sortie. `landedWell` is true only for a gentle
// touchdown on the strip; a rough field landing scores less.
export function scoreSortie(ringsTaken, ringTotal, landedWell, landedRough, fuelLeft, timeSec) {
  const ringScore = ringsTaken * PHYSICS.scoreRing;
  let landingScore = 0;
  if (landedWell) landingScore = PHYSICS.scoreLandingMax;
  else if (landedRough) landingScore = 150;
  const fuelScore = Math.round(Math.max(0, fuelLeft) * PHYSICS.scoreFuelPerUnit);
  const timeBonus = Math.max(0, Math.round(240 - timeSec));
  const total = ringScore + landingScore + fuelScore + timeBonus;
  return {
    ringScore,
    landingScore,
    fuelScore,
    timeBonus,
    total,
    ringsTaken,
    ringTotal,
  };
}

// What the touchdown was: 'strip' (on the runway, gentle), 'rough'
// (on land, gentle, off the strip), 'hard' (too fast or too steep),
// 'water' (ditched in the sea).
export function judgeTouchdown(plane, terrain, runway) {
  const P = PHYSICS;
  const ground = terrainHeightAt(terrain, plane.x);
  const onStrip = plane.x >= runway.x0 && plane.x <= runway.x1;
  const gentle = plane.vspeed > -P.landingVSpeedMax && plane.speed < P.landingSpeedMax
    && Math.abs(plane.pitchDeg) < P.landingPitchMaxDeg;
  if (ground <= 0.5) return 'water';
  if (!gentle) return 'hard';
  if (onStrip) return 'strip';
  return 'rough';
}
