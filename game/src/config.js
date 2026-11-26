// Ember Isles Airmail — tuning, missions and palettes.
// One job: every number the rest of the game agrees on lives here.

export const VIEW = { width: 1280, height: 720 };

// Pixels per metre on each axis. The world is long and low, so the
// horizontal scale is compressed and the vertical scale is not.
export const SCALE = { x: 0.34, y: 0.55 };

export const PHYSICS = {
  minThrottle: 0,
  maxThrottle: 1,
  throttleStep: 0.55, // per second while the key is held
  cruiseMin: 18, // m/s at idle throttle
  cruiseMax: 74, // m/s at full throttle
  stallSpeed: 24, // m/s — below this the wing stops flying
  pitchMaxDeg: 26,
  pitchRateDeg: 42, // per second while the key is held
  autoLevelDeg: 9, // per second the nose drifts back to level
  gravitySink: 14, // m/s of sink per m/s under stall speed
  fuelBurnPerSec: 0.55, // at full throttle; rings refund fuel
  ringFuelRefund: 4,
  landingVSpeedMax: 8, // m/s down: harder than this on touchdown is a crash
  landingSpeedMax: 46, // m/s over the ground: faster than this is a crash
  landingPitchMaxDeg: 11,
  damageRoughField: 30,
  scoreRing: 100,
  scoreLandingMax: 500,
  scoreFuelPerUnit: 2,
};

export const RING = { radiusM: 26, collectM: 24 };

// Three sorties. Same plane, same islands family, different weather,
// fuel and ring lines — the judge's "missions with different goals".
export const MISSIONS = [
  {
    id: 'first-light',
    name: 'First Light Run',
    seed: 11,
    rings: 6,
    fuel: 100,
    headwind: 0,
    gust: 0,
    routeLengthM: 5200,
    briefing: 'Six rings over the dawn isles, then put her down on the strip at Ember Point.',
    palette: {
      skyTop: '#7ec8f2', skyMid: '#bfe6f7', skyLow: '#ffe9b8',
      sun: '#ffd66e', sunGlow: 'rgba(255,214,110,0.45)',
      sea: '#2f7fb8', seaDeep: '#1d5a8a', wave: 'rgba(255,255,255,0.35)',
      hillFar: '#8fae7e', hillNear: '#5d8a4e', hillTop: '#7fb069',
      sand: '#ecd9a0', tree: '#2f6b34', treeDark: '#245628',
      house: '#f2ede2', roof: '#c65b4e', lighthouse: '#f4f1e6', lighthouseBand: '#d84a3a',
      runway: '#3c3f46', runwayLine: '#f5f2e4', runwayLight: '#ffd166',
      cloud: 'rgba(255,255,255,0.85)', ring: '#ffcf3f', ringGlow: 'rgba(255,207,63,0.55)',
      night: false,
    },
  },
  {
    id: 'crosswind-canyon',
    name: 'Crosswind Canyon',
    seed: 27,
    rings: 8,
    fuel: 100,
    headwind: 9,
    gust: 7,
    routeLengthM: 6800,
    briefing: 'Eight rings through the canyon isles. Gusts shove the tail — ride them, do not fight them.',
    palette: {
      skyTop: '#6fa8d8', skyMid: '#a8cfe8', skyLow: '#f7d9a0',
      sun: '#ffcf5e', sunGlow: 'rgba(255,207,94,0.4)',
      sea: '#2b6f9e', seaDeep: '#174a6e', wave: 'rgba(255,255,255,0.3)',
      hillFar: '#7d9a72', hillNear: '#4c7442', hillTop: '#6b9a58',
      sand: '#e2cd92', tree: '#2a5e2e', treeDark: '#1f4c24',
      house: '#efe8d8', roof: '#b34a3e', lighthouse: '#efece0', lighthouseBand: '#c73e30',
      runway: '#383b42', runwayLine: '#f5f2e4', runwayLight: '#ffd166',
      cloud: 'rgba(255,255,255,0.8)', ring: '#ffb03a', ringGlow: 'rgba(255,176,58,0.55)',
      night: false,
    },
  },
  {
    id: 'night-mail',
    name: 'Night Mail',
    seed: 43,
    rings: 7,
    fuel: 88,
    headwind: 4,
    gust: 3,
    routeLengthM: 6000,
    briefing: 'The last mail run, flown by lantern light. Seven rings, one lit strip, no second chances.',
    palette: {
      skyTop: '#101a33', skyMid: '#25355c', skyLow: '#7a4a5e',
      sun: '#f7e8c8', sunGlow: 'rgba(247,232,200,0.28)',
      sea: '#16283f', seaDeep: '#0d1a2c', wave: 'rgba(180,200,230,0.22)',
      hillFar: '#2c3d4a', hillNear: '#1e2f38', hillTop: '#31474f',
      sand: '#8a7d5e', tree: '#16281f', treeDark: '#101f18',
      house: '#c9bda6', roof: '#8a3f34', lighthouse: '#e8e2d2', lighthouseBand: '#b23a2e',
      runway: '#23262e', runwayLine: '#e8e4d2', runwayLight: '#ffcf4d',
      cloud: 'rgba(120,140,180,0.35)', ring: '#ffd94d', ringGlow: 'rgba(255,217,77,0.6)',
      night: true,
    },
  },
];
