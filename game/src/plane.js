// Ember Isles Airmail — the mail plane.
// One job: the aircraft's flight model and the way it looks on screen.

import { PHYSICS } from './config.js';

export function makePlane(mission) {
  return {
    x: 40, // metres along the route
    alt: 120, // metres above sea level
    speed: 42, // m/s
    pitchDeg: 0,
    throttle: 0.55,
    fuel: mission.fuel,
    damage: 0,
    vspeed: 0,
    flaps: false,
    propAngle: 0,
    bankDeg: 0,
  };
}

// One physics step. `keys` is the live input state, `gust` the current
// vertical gust in m/s (positive lifts the tail). Returns nothing;
// the plane is mutated in place.
export function stepPlane(plane, keys, gust, dt) {
  const P = PHYSICS;
  // Throttle.
  if (keys.throttleUp) plane.throttle = Math.min(P.maxThrottle, plane.throttle + P.throttleStep * dt);
  if (keys.throttleDown) plane.throttle = Math.max(P.minThrottle, plane.throttle - P.throttleStep * dt);
  // Pitch, with a gentle drift back to level when hands are off.
  if (keys.pitchUp) plane.pitchDeg += P.pitchRateDeg * dt;
  else if (keys.pitchDown) plane.pitchDeg -= P.pitchRateDeg * dt;
  else plane.pitchDeg -= Math.sign(plane.pitchDeg) * Math.min(Math.abs(plane.pitchDeg), P.autoLevelDeg * dt);
  plane.pitchDeg = Math.max(-P.pitchMaxDeg, Math.min(P.pitchMaxDeg, plane.pitchDeg));
  plane.flaps = keys.flaps;
  // Airspeed chases the throttle setting.
  const targetSpeed = P.cruiseMin + plane.throttle * (P.cruiseMax - P.cruiseMin);
  const speedRate = plane.throttle > 0.5 ? 6 : 9;
  plane.speed += Math.max(-speedRate * dt, Math.min(speedRate * dt, targetSpeed - plane.speed));
  // Flaps trade speed for lift at low speed — the landing tool.
  const flapLift = plane.flaps ? 1.25 : 1;
  // Stall: below stall speed the wing gives up and the nose drops.
  const liftFactor = Math.min(1, (plane.speed / P.stallSpeed) * flapLift);
  const pitchRad = (plane.pitchDeg * Math.PI) / 180;
  plane.vspeed = plane.speed * Math.sin(pitchRad) * liftFactor + gust;
  if (plane.speed < P.stallSpeed) {
    plane.vspeed -= (P.stallSpeed - plane.speed) * (P.gravitySink / P.stallSpeed);
  }
  plane.alt += plane.vspeed * dt;
  plane.x += plane.speed * Math.cos(pitchRad) * dt;
  if (plane.alt < 0) plane.alt = 0;
  // Fuel burns with the throttle; empty tanks mean a glide.
  if (plane.fuel > 0) {
    plane.fuel = Math.max(0, plane.fuel - plane.throttle * P.fuelBurnPerSec * dt);
    if (plane.fuel === 0) plane.throttle = 0;
  }
  // Visual bank follows the pitch input.
  const bankTarget = keys.pitchUp ? -7 : keys.pitchDown ? 7 : 0;
  plane.bankDeg += (bankTarget - plane.bankDeg) * Math.min(1, dt * 5);
  plane.propAngle += dt * (6 + plane.throttle * 42);
}

export function isStalled(plane) {
  return plane.speed < PHYSICS.stallSpeed;
}

// Draw the plane at screen position (sx, sy), pointing right, pitched
// by plane.pitchDeg. A built-looking bush plane: cream fuselage with a
// red airmail cheatline, high wing, fixed gear, spinning prop.
export function drawPlane(ctx, plane, sx, sy) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate((-plane.pitchDeg * Math.PI) / 180);
  ctx.rotate((plane.bankDeg * Math.PI) / 180 * 0.4);
  // Prop blur disc.
  ctx.strokeStyle = 'rgba(60,60,70,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(52, 0, 15, 0, Math.PI * 2);
  ctx.stroke();
  // Prop blades.
  ctx.strokeStyle = '#2b2b30';
  ctx.lineWidth = 4;
  ctx.beginPath();
  const a = plane.propAngle;
  ctx.moveTo(52 + Math.cos(a) * 15, Math.sin(a) * 15);
  ctx.lineTo(52 - Math.cos(a) * 15, -Math.sin(a) * 15);
  ctx.stroke();
  // Tail.
  ctx.fillStyle = '#c65b4e';
  ctx.beginPath();
  ctx.moveTo(-42, -2);
  ctx.lineTo(-56, -16);
  ctx.lineTo(-50, -2);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  const fus = ctx.createLinearGradient(0, -12, 0, 12);
  fus.addColorStop(0, '#fdf6e3');
  fus.addColorStop(0.55, '#f2e3c2');
  fus.addColorStop(1, '#d9c49a');
  ctx.fillStyle = fus;
  ctx.beginPath();
  ctx.moveTo(-46, -4);
  ctx.quadraticCurveTo(-20, -13, 18, -10);
  ctx.quadraticCurveTo(46, -7, 52, 0);
  ctx.quadraticCurveTo(46, 8, 16, 10);
  ctx.quadraticCurveTo(-22, 12, -46, 5);
  ctx.closePath();
  ctx.fill();
  // Airmail cheatline.
  ctx.fillStyle = '#c65b4e';
  ctx.fillRect(-40, 1, 82, 3);
  // Cabin windows.
  ctx.fillStyle = '#9fd4e8';
  ctx.beginPath();
  ctx.moveTo(2, -9);
  ctx.lineTo(16, -9);
  ctx.lineTo(20, -3);
  ctx.lineTo(2, -3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7fb8cc';
  ctx.fillRect(24, -8, 10, 5);
  // High wing.
  ctx.fillStyle = '#e8b23a';
  ctx.beginPath();
  ctx.moveTo(-8, -11);
  ctx.lineTo(14, -11);
  ctx.lineTo(20, -6);
  ctx.lineTo(-12, -6);
  ctx.closePath();
  ctx.fill();
  // Registration.
  ctx.fillStyle = '#3c3f46';
  ctx.font = 'bold 8px monospace';
  ctx.fillText('EI-MAIL', -38, -14);
  // Fixed gear.
  ctx.strokeStyle = '#3c3f46';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-18, 10);
  ctx.lineTo(-24, 20);
  ctx.moveTo(16, 10);
  ctx.lineTo(22, 20);
  ctx.stroke();
  ctx.fillStyle = '#22242a';
  ctx.beginPath();
  ctx.arc(-24, 21, 4, 0, Math.PI * 2);
  ctx.arc(22, 21, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
