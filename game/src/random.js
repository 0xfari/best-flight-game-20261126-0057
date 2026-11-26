// Ember Isles Airmail — deterministic randomness.
// One job: a seeded generator so terrain, rings and gusts are the same
// every run of a mission, and screenshots never surprise us.

// mulberry32: small, fast, good enough for terrain and weather.
export function makeRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rand, low, high) {
  return low + rand() * (high - low);
}

export function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

// Smooth 1-D value noise from a seeded generator: a row of random
// control points, cosine-interpolated. Used for gusts and hill wobble.
export function makeNoise1D(seed, points, low, high) {
  const rand = makeRandom(seed);
  const values = [];
  for (let i = 0; i <= points; i++) values.push(range(rand, low, high));
  return function noiseAt(t) {
    const x = Math.max(0, Math.min(points - 0.0001, t * points));
    const i = Math.floor(x);
    const f = x - i;
    const smooth = f * f * (3 - 2 * f);
    return values[i] + (values[i + 1] - values[i]) * smooth;
  };
}
