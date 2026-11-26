// Ember Isles Airmail — the islands.
// One job: build a seeded island chain (hills, beaches, trees, houses,
// a lighthouse, the landing strip) and draw it under the plane.

import { makeRandom, range, makeNoise1D } from './random.js';

const SEA_LEVEL_M = 0;

// Build the world for one mission. Deterministic in the mission seed.
export function buildTerrain(mission) {
  const rand = makeRandom(mission.seed * 7919 + 13);
  const length = mission.routeLengthM;
  const hills = [];
  // Five to seven hill ridges, each a sine bump with its own phase.
  // Kept modest: the plane takes off at 120 m and must be able to climb
  // over every ridge at cruise power.
  const ridgeCount = 6;
  for (let i = 0; i < ridgeCount; i++) {
    hills.push({
      centre: range(rand, 300, length - 500),
      width: range(rand, 260, 620),
      height: range(rand, 40, 105),
      phase: range(rand, 0, Math.PI * 2),
    });
  }
  const wobble = makeNoise1D(mission.seed + 5, 24, -14, 14);
  // Islands: envelopes that lift the ground out of the sea.
  const islands = [];
  const islandCount = 5;
  for (let i = 0; i < islandCount; i++) {
    const centre = (i + 0.5) * (length / islandCount) + range(rand, -160, 160);
    islands.push({
      centre,
      halfWidth: range(rand, 420, 700),
      lift: range(rand, 18, 42),
    });
  }
  // The airstrip island: flat, at the end of the route.
  const runway = {
    x0: length - 260,
    x1: length + 260,
    alt: 16,
  };
  // Trees and houses, placed on dry ground only.
  const trees = [];
  const houses = [];
  for (let x = 120; x < length - 320; x += range(rand, 55, 130)) {
    const h = groundHeightAt(x, hills, islands, wobble, runway);
    if (h > 6) {
      if (rand() < 0.62) trees.push({ x, h, size: range(rand, 7, 15) });
      else if (rand() < 0.5) houses.push({ x, h, w: range(rand, 16, 26) });
    }
  }
  // Lighthouse on the tallest island near the middle of the route.
  const lightX = length * 0.45 + range(rand, -120, 120);
  const lighthouse = { x: lightX, h: groundHeightAt(lightX, hills, islands, wobble, runway) };
  // Drifting clouds, placed in world space.
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    clouds.push({
      x: range(rand, 0, length + 800),
      alt: range(rand, 260, 520),
      size: range(rand, 60, 150),
      speed: range(rand, 2, 7),
    });
  }
  return { mission, hills, islands, wobble, runway, trees, houses, lighthouse, clouds, length };
}

function islandLiftAt(x, islands) {
  let lift = 0;
  for (const isl of islands) {
    const d = (x - isl.centre) / isl.halfWidth;
    if (Math.abs(d) < 1) lift += isl.lift * (Math.cos(d * Math.PI) * 0.5 + 0.5);
  }
  return lift;
}

function groundHeightAt(x, hills, islands, wobble, runway) {
  if (x >= runway.x0 && x <= runway.x1) return runway.alt;
  let h = islandLiftAt(x, islands);
  for (const ridge of hills) {
    const d = (x - ridge.centre) / ridge.width;
    if (Math.abs(d) < 1) h += ridge.height * Math.pow(Math.cos(d * Math.PI * 0.5), 2);
  }
  h += wobble(x / 1200);
  // Flat beach for takeoff and a flat approach to the strip: the first
  // and last 700 m of the route never rise above a low dune.
  const startBlend = Math.min(1, Math.max(0, x / 700));
  h *= 0.12 + 0.88 * startBlend;
  const endBlend = Math.min(1, Math.max(0, (runway.x0 - x) / 700));
  h *= 0.12 + 0.88 * endBlend;
  return Math.max(0, Math.min(190, h));
}

// Height of the ground (metres above sea level) at world x.
export function terrainHeightAt(terrain, x) {
  return groundHeightAt(x, terrain.hills, terrain.islands, terrain.wobble, terrain.runway);
}

export function isSeaAt(terrain, x) {
  return terrainHeightAt(terrain, x) <= 0.5;
}

// ---- drawing ---------------------------------------------------------

export function drawSky(ctx, palette, timeSec, camX) {
  const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  g.addColorStop(0, palette.skyTop);
  g.addColorStop(0.55, palette.skyMid);
  g.addColorStop(1, palette.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // Low sun (or moon) with a soft glow, fixed to the sky.
  const sunX = ctx.canvas.width * 0.78;
  const sunY = ctx.canvas.height * 0.2;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 120);
  glow.addColorStop(0, palette.sunGlow);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 120, sunY - 120, 240, 240);
  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
  ctx.fill();
  if (palette.night) {
    // A few fixed stars in the night sky.
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 173.3 + camX * 0.02) % ctx.canvas.width + ctx.canvas.width) % ctx.canvas.width;
      const sy = (i * 97.7) % 260;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }
  void timeSec;
}

export function drawClouds(ctx, terrain, camX, camAlt, scale, timeSec) {
  const palette = terrain.mission.palette;
  ctx.fillStyle = palette.cloud;
  for (const cloud of terrain.clouds) {
    const cx = (cloud.x + timeSec * cloud.speed - camX) * scale.x;
    const cy = 600 - (cloud.alt - camAlt) * scale.y;
    if (cx < -200 || cx > ctx.canvas.width + 200) continue;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cloud.size, cloud.size * 0.36, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + cloud.size * 0.5, cy + 6, cloud.size * 0.6, cloud.size * 0.3, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - cloud.size * 0.5, cy + 8, cloud.size * 0.55, cloud.size * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Convert world (x metres, alt metres) to screen pixels.
export function worldToScreen(x, alt, camX, camAlt, scale) {
  return {
    x: (x - camX) * scale.x,
    y: 600 - (alt - camAlt) * scale.y,
  };
}

export function drawTerrain(ctx, terrain, camX, camAlt, scale) {
  const palette = terrain.mission.palette;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const seaY = worldToScreen(0, SEA_LEVEL_M, camX, camAlt, scale).y;
  // Sea.
  const seaGrad = ctx.createLinearGradient(0, seaY, 0, h);
  seaGrad.addColorStop(0, palette.sea);
  seaGrad.addColorStop(1, palette.seaDeep);
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, Math.max(0, seaY), w, h - Math.max(0, seaY));
  // Wave sparkle lines.
  ctx.strokeStyle = palette.wave;
  ctx.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    const wx = ((i * 211.7 - camX * scale.x * 0.7) % (w + 80) + w + 80) % (w + 80) - 40;
    const wy = seaY + 14 + ((i * 37.3) % 90);
    if (wy > h) continue;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + 26, wy);
    ctx.stroke();
  }
  // Ground silhouette, sampled across the screen.
  const stepM = 8;
  const x0 = camX - 40;
  const x1 = camX + w / scale.x + 40;
  ctx.beginPath();
  let first = true;
  for (let x = x0; x <= x1; x += stepM) {
    const ground = terrainHeightAt(terrain, x);
    const p = worldToScreen(x, ground, camX, camAlt, scale);
    if (first) {
      ctx.moveTo(p.x, p.y);
      first = false;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.lineTo((x1 - camX) * scale.x, h);
  ctx.lineTo((x0 - camX) * scale.x, h);
  ctx.closePath();
  const groundGrad = ctx.createLinearGradient(0, seaY - 120, 0, h);
  groundGrad.addColorStop(0, palette.hillTop);
  groundGrad.addColorStop(0.5, palette.hillNear);
  groundGrad.addColorStop(1, palette.hillFar);
  ctx.fillStyle = groundGrad;
  ctx.fill();
  // Sand rim where the ground meets the sea.
  ctx.strokeStyle = palette.sand;
  ctx.lineWidth = 3;
  ctx.beginPath();
  first = true;
  for (let x = x0; x <= x1; x += stepM) {
    const ground = terrainHeightAt(terrain, x);
    const p = worldToScreen(x, Math.max(ground, 0.5), camX, camAlt, scale);
    if (first) {
      ctx.moveTo(p.x, p.y);
      first = false;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();
  // Trees and houses.
  for (const tree of terrain.trees) {
    const p = worldToScreen(tree.x, tree.h, camX, camAlt, scale);
    if (p.x < -30 || p.x > w + 30) continue;
    ctx.fillStyle = palette.treeDark;
    ctx.fillRect(p.x - 1.5, p.y - tree.size * 0.5, 3, tree.size * 0.5);
    ctx.fillStyle = palette.tree;
    ctx.beginPath();
    ctx.arc(p.x, p.y - tree.size * 0.7, tree.size * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const house of terrain.houses) {
    const p = worldToScreen(house.x, house.h, camX, camAlt, scale);
    if (p.x < -40 || p.x > w + 40) continue;
    ctx.fillStyle = palette.house;
    ctx.fillRect(p.x - house.w / 2, p.y - 12, house.w, 12);
    ctx.fillStyle = palette.roof;
    ctx.beginPath();
    ctx.moveTo(p.x - house.w / 2 - 2, p.y - 12);
    ctx.lineTo(p.x, p.y - 21);
    ctx.lineTo(p.x + house.w / 2 + 2, p.y - 12);
    ctx.closePath();
    ctx.fill();
  }
  // Lighthouse with a sweeping beam at night.
  const lp = worldToScreen(terrain.lighthouse.x, terrain.lighthouse.h, camX, camAlt, scale);
  if (lp.x > -80 && lp.x < w + 80) {
    ctx.fillStyle = palette.lighthouse;
    ctx.fillRect(lp.x - 7, lp.y - 46, 14, 46);
    ctx.fillStyle = palette.lighthouseBand;
    ctx.fillRect(lp.x - 7, lp.y - 34, 14, 8);
    ctx.fillRect(lp.x - 7, lp.y - 16, 14, 8);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(lp.x - 5, lp.y - 52, 10, 6);
    if (palette.night) {
      const beam = ctx.createLinearGradient(lp.x, lp.y - 48, lp.x + 260, lp.y - 48);
      beam.addColorStop(0, 'rgba(255,209,102,0.5)');
      beam.addColorStop(1, 'rgba(255,209,102,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(lp.x, lp.y - 48);
      ctx.lineTo(lp.x + 260, lp.y - 66);
      ctx.lineTo(lp.x + 260, lp.y - 30);
      ctx.closePath();
      ctx.fill();
    }
  }
  drawRunway(ctx, terrain, camX, camAlt, scale);
}

function drawRunway(ctx, terrain, camX, camAlt, scale) {
  const palette = terrain.mission.palette;
  const r = terrain.runway;
  const p0 = worldToScreen(r.x0, r.alt, camX, camAlt, scale);
  const p1 = worldToScreen(r.x1, r.alt, camX, camAlt, scale);
  if (p1.x < -50 || p0.x > ctx.canvas.width + 50) return;
  // Strip.
  ctx.fillStyle = palette.runway;
  ctx.fillRect(p0.x, p0.y, p1.x - p0.x, 8);
  // Centre dashes.
  ctx.fillStyle = palette.runwayLine;
  const dashW = 26;
  for (let x = p0.x + 8; x < p1.x - 8; x += dashW * 2) {
    ctx.fillRect(x, p0.y + 3, dashW, 2);
  }
  // Edge lights.
  ctx.fillStyle = palette.runwayLight;
  for (let x = p0.x + 4; x <= p1.x - 4; x += 34) {
    ctx.beginPath();
    ctx.arc(x, p0.y - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, p0.y + 10, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Windsock at the threshold.
  ctx.strokeStyle = '#8a8f98';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p0.x + 14, p0.y);
  ctx.lineTo(p0.x + 14, p0.y - 26);
  ctx.stroke();
  ctx.fillStyle = '#ff8c42';
  ctx.beginPath();
  ctx.moveTo(p0.x + 14, p0.y - 26);
  ctx.lineTo(p0.x + 34, p0.y - 21);
  ctx.lineTo(p0.x + 14, p0.y - 16);
  ctx.closePath();
  ctx.fill();
}
