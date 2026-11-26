// Ember Isles Airmail — the instruments.
// One job: every gauge and tape the pilot reads, drawn lit on canvas:
// airspeed and altitude tapes, a heading strip, an artificial horizon,
// a fuel gauge, a throttle lever and the warning lamps.

import { isStalled } from './plane.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(12,16,24,0.72)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function label(ctx, text, x, y, color) {
  ctx.fillStyle = color || '#9fb4c8';
  ctx.font = '600 10px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function bigValue(ctx, text, x, y, color) {
  ctx.fillStyle = color || '#f5f2e4';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

// A vertical tape: a scale with the current value centred and lit.
function drawTape(ctx, x, y, w, h, value, unit, step, labelText, accent) {
  panel(ctx, x, y, w, h);
  label(ctx, labelText, x + 8, y + 14);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y + 18, w, h - 18);
  ctx.clip();
  const centre = y + h / 2 + 4;
  const pxPerUnit = (h - 40) / (step * 8);
  const low = Math.max(0, Math.floor((value - step * 4) / step) * step);
  ctx.fillStyle = '#8fa8bc';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  for (let v = low; v <= value + step * 4 + step; v += step) {
    const ty = centre - (v - value) * pxPerUnit;
    if (ty < y + 24 || ty > y + h - 8) continue;
    ctx.fillText(String(Math.round(v)), x + w - 26, ty + 4);
    ctx.fillRect(x + w - 20, ty, 12, 1);
  }
  ctx.restore();
  // Lit centre readout.
  ctx.fillStyle = accent;
  ctx.fillRect(x, centre - 13, w, 26);
  ctx.fillStyle = '#10141c';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(value)} ${unit}`, x + w / 2, centre + 5);
}

// Compass strip across the top centre.
function drawCompass(ctx, headingDeg, w) {
  const x0 = (ctx.canvas.width - w) / 2;
  const y = 14;
  panel(ctx, x0, y, w, 34);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y, w, 34);
  ctx.clip();
  const pxPerDeg = w / 120;
  const centre = x0 + w / 2;
  ctx.fillStyle = '#c8d4de';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  for (let d = Math.floor((headingDeg - 60) / 10) * 10; d <= headingDeg + 60; d += 10) {
    const norm = ((d % 360) + 360) % 360;
    const dx = centre + (d - headingDeg) * pxPerDeg;
    if (dx < x0 + 8 || dx > x0 + w - 8) continue;
    const name = norm === 0 ? 'N' : norm === 90 ? 'E' : norm === 180 ? 'S' : norm === 270 ? 'W' : String(norm).padStart(3, '0');
    ctx.fillText(name, dx, y + 22);
    ctx.fillRect(dx - 0.5, y + 26, 1, 6);
  }
  ctx.restore();
  ctx.fillStyle = '#ffcf3f';
  ctx.beginPath();
  ctx.moveTo(centre, y + 2);
  ctx.lineTo(centre - 5, y + 9);
  ctx.lineTo(centre + 5, y + 9);
  ctx.closePath();
  ctx.fill();
}

// Artificial horizon: a round gauge with a rolling sky/ground split.
function drawHorizon(ctx, cx, cy, r, pitchDeg, bankDeg) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate((-bankDeg * Math.PI) / 180);
  const offset = (pitchDeg / 26) * r;
  ctx.fillStyle = '#7ec8f2';
  ctx.fillRect(-r, -r + offset, r * 2, r - offset);
  ctx.fillStyle = '#8a6b46';
  ctx.fillRect(-r, offset, r * 2, r - offset + r);
  ctx.strokeStyle = '#f5f2e4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, offset);
  ctx.lineTo(r, offset);
  ctx.stroke();
  ctx.restore();
  // Fixed wings marker.
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.55, cy);
  ctx.lineTo(cx - r * 0.2, cy);
  ctx.moveTo(cx + r * 0.2, cy);
  ctx.lineTo(cx + r * 0.55, cy);
  ctx.stroke();
  // Rim and label.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  label(ctx, 'ATT', cx - r + 4, cy + r + 14);
}

// Round dial with a needle: used for fuel.
function drawDial(ctx, cx, cy, r, fraction, labelText, goodColor, warnColor) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#10141c';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Arc from -210deg to 30deg.
  const start = Math.PI * 0.75;
  const end = Math.PI * 2.25;
  ctx.strokeStyle = fraction < 0.25 ? warnColor : goodColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5, start, start + (end - start) * fraction);
  ctx.stroke();
  const angle = start + (end - start) * fraction;
  ctx.strokeStyle = '#f5f2e4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * (r - 8), cy + Math.sin(angle) * (r - 8));
  ctx.stroke();
  ctx.fillStyle = '#f5f2e4';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(fraction * 100)}`, cx, cy + r * 0.45);
  label(ctx, labelText, cx - r + 4, cy + r + 14);
}

// The full HUD for the flying state. `flying` is false on the end
// screens, where the warnings must not bleed through the overlay.
export function drawHud(ctx, plane, mission, ringsLeft, nextRingM, headingDeg, timeSec, flying) {
  const W = ctx.canvas.width;
  const knots = plane.speed * 1.944;
  const feet = plane.alt * 3.281;
  drawTape(ctx, 16, 16, 92, 132, knots, 'KT', 10, 'AIRSPEED', '#7ec8f2');
  drawTape(ctx, W - 108, 16, 92, 132, feet, 'FT', 100, 'ALTITUDE', '#ffd166');
  drawCompass(ctx, headingDeg, 300);
  // Throttle lever, bottom left.
  panel(ctx, 16, ctx.canvas.height - 96, 44, 80);
  label(ctx, 'THR', 26, ctx.canvas.height - 80);
  const leverTop = ctx.canvas.height - 30;
  const leverBottom = ctx.canvas.height - 66;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(38, leverBottom);
  ctx.lineTo(38, leverTop);
  ctx.stroke();
  const leverY = leverTop - plane.throttle * (leverTop - leverBottom);
  ctx.fillStyle = plane.flaps ? '#ff8c42' : '#ffd166';
  ctx.fillRect(28, leverY - 4, 20, 8);
  if (plane.flaps) label(ctx, 'FLAPS', 66, ctx.canvas.height - 44, '#ff8c42');
  // Instrument cluster, bottom right.
  const cy = ctx.canvas.height - 52;
  drawHorizon(ctx, W - 200, cy, 34, plane.pitchDeg, plane.bankDeg);
  drawDial(ctx, W - 120, cy, 34, plane.fuel / mission.fuel, 'FUEL', '#7ec8f2', '#ff5a4e');
  drawDial(ctx, W - 44, cy, 34, 1 - plane.damage / 100, 'HULL', '#7fb069', '#ff5a4e');
  // Mission line, top centre under the compass.
  ctx.fillStyle = '#f5f2e4';
  ctx.font = '600 13px monospace';
  ctx.textAlign = 'center';
  const ringText = ringsLeft > 0
    ? `RINGS ${mission.rings - ringsLeft}/${mission.rings} — NEXT ${Math.max(0, Math.round(nextRingM))} m`
    : 'ALL RINGS — LAND ON THE STRIP';
  ctx.fillText(`${mission.name.toUpperCase()}  ·  ${ringText}`, W / 2, 66);
  // Warnings, centre screen — only while actually flying.
  if (flying && isStalled(plane)) {
    const blink = Math.floor(timeSec * 3) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#ff5a4e';
      ctx.font = 'bold 26px monospace';
      ctx.fillText('STALL — NOSE DOWN, THROTTLE UP', W / 2, 150);
    }
  } else if (flying && plane.fuel < mission.fuel * 0.2 && plane.fuel > 0) {
    ctx.fillStyle = '#ffb03a';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('LOW FUEL', W / 2, 150);
  }
  // Vertical speed, small, under the altitude tape.
  ctx.fillStyle = '#5a6b7c';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`V/S ${plane.vspeed >= 0 ? '+' : ''}${(plane.vspeed * 196.85).toFixed(0)} FPM`, W - 108, 166);
  ctx.fillText(`HDG ${String(Math.round(headingDeg)).padStart(3, '0')}°`, 16, 166);
}
