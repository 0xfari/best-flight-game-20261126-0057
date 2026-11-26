// Ember Isles Airmail — the scene.
// One job: compose one frame of the flying game — sky, clouds, sea,
// islands, rings, the plane, particles and weather — from the state.

import { drawSky, drawClouds, drawTerrain, worldToScreen } from './terrain.js';
import { drawPlane } from './plane.js';
import { drawHud } from './instruments.js';
import { RING } from './config.js';

// A ring the pilot flies through: a glowing hoop standing in the sky.
export function drawRing(ctx, ring, camX, camAlt, scale, timeSec) {
  const p = worldToScreen(ring.x, ring.alt, camX, camAlt, scale);
  const r = RING.radiusM * scale.y;
  if (p.x < -80 || p.x > ctx.canvas.width + 80) return;
  const pulse = 1 + 0.06 * Math.sin(timeSec * 2 + ring.pulse);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(pulse, pulse);
  const glow = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.5);
  glow.addColorStop(0, 'rgba(255,207,63,0)');
  glow.addColorStop(0.8, 'rgba(255,207,63,0.25)');
  glow.addColorStop(1, 'rgba(255,207,63,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffcf3f';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#fff3c4';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, -0.6, 0.9);
  ctx.stroke();
  ctx.restore();
  // Distance tag above the next ring.
  ctx.fillStyle = '#fff3c4';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('RING', p.x, p.y - r - 10);
}

// Particles: prop wash, ring bursts, smoke, landing dust.
export function makeParticles() {
  return [];
}

export function spawnBurst(particles, sx, sy, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 140;
    particles.push({
      x: sx, y: sy,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      life: 0.5 + Math.random() * 0.5, age: 0,
      size: 2 + Math.random() * 4, color,
    });
  }
}

export function stepParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age >= p.life) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 30 * dt;
  }
}

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    const alpha = 1 - p.age / p.life;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Gust streaks: faint diagonal lines that show the wind the pilot feels.
export function drawGusts(ctx, gust, timeSec) {
  if (Math.abs(gust) < 1.2) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 10; i++) {
    const x = ((i * 173.3 + timeSec * (40 + gust * 12)) % (ctx.canvas.width + 120) + ctx.canvas.width + 120) % (ctx.canvas.width + 120) - 60;
    const y = (i * 89.7) % ctx.canvas.height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 34, y + 8);
    ctx.stroke();
  }
  ctx.restore();
}

// The flying frame: everything behind the HUD.
export function drawFlightFrame(ctx, game, timeSec) {
  const { plane, terrain, rings, particles } = game;
  const scale = game.scale;
  const camX = game.camX;
  const camAlt = game.camAlt;
  drawSky(ctx, terrain.mission.palette, timeSec, camX);
  drawClouds(ctx, terrain, camX, camAlt, scale, timeSec);
  drawTerrain(ctx, terrain, camX, camAlt, scale);
  for (const ring of rings) {
    if (!ring.taken) drawRing(ctx, ring, camX, camAlt, scale, timeSec);
  }
  drawGusts(ctx, game.gust, timeSec);
  const planePos = worldToScreen(plane.x, plane.alt, camX, camAlt, scale);
  drawPlane(ctx, plane, planePos.x, planePos.y);
  drawParticles(ctx, particles);
  // Smoke trail when the hull is hurt.
  if (plane.damage > 35 && Math.random() < 0.5) {
    spawnBurst(particles, planePos.x - 40, planePos.y + 4, 'rgba(60,60,60,0.6)', 1);
  }
  const headingDeg = 90 + game.windDrift;
  const nextRing = rings.find((r) => !r.taken);
  const nextRingM = nextRing ? Math.hypot(nextRing.x - plane.x, nextRing.alt - plane.alt) : 0;
  const ringsLeft = rings.filter((r) => !r.taken).length;
  drawHud(ctx, plane, terrain.mission, ringsLeft, nextRingM, headingDeg, timeSec, game.state === 'flying');
}
