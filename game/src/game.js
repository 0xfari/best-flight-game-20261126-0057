// Ember Isles Airmail — the game itself.
// One job: the state machine (title, flying, paused, landed, crashed),
// the camera, the wind, the collisions and the score at the end.

import { MISSIONS, SCALE, VIEW, PHYSICS } from './config.js';
import { buildTerrain, terrainHeightAt, drawSky, drawClouds, drawTerrain, worldToScreen } from './terrain.js';
import { makePlane, stepPlane } from './plane.js';
import { makeInput, attachInput, readControls, takePressed } from './input.js';
import { makeAudio, startAudio, setEngine, playRingChime, playTouchdown, playCrash, playWarning } from './audio.js';
import { buildRings, collectRing, nextRingDistance, scoreSortie, judgeTouchdown } from './missions.js';
import { drawFlightFrame, makeParticles, spawnBurst, stepParticles } from './render.js';
import { makeNoise1D } from './random.js';

export function makeGame(canvas) {
  const firstMission = MISSIONS[0];
  const firstTerrain = buildTerrain(firstMission);
  const game = {
    canvas,
    ctx: canvas.getContext('2d'),
    state: 'title', // title | flying | paused | landed | crashed
    missionIndex: 0,
    mission: firstMission,
    terrain: firstTerrain,
    rings: buildRings(firstMission, firstTerrain),
    plane: makePlane(MISSIONS[0]),
    particles: makeParticles(),
    input: makeInput(),
    audio: makeAudio(),
    camX: 0,
    camAlt: 0,
    gust: 0,
    gustNoise: makeNoise1D(99, 16, -1, 1),
    windDrift: 0,
    timeSec: 0,
    flightTime: 0,
    result: null, // score breakdown once the sortie ends
    crashReason: '',
    buttons: [],
    scale: SCALE,
    warnedStall: false,
  };
  attachInput(game.input, canvas);
  return game;
}

export function startMission(game, index) {
  game.missionIndex = index;
  game.mission = MISSIONS[index];
  game.terrain = buildTerrain(game.mission);
  game.rings = buildRings(game.mission, game.terrain);
  game.plane = makePlane(game.mission);
  game.particles = makeParticles();
  game.gustNoise = makeNoise1D(game.mission.seed * 17 + 3, 16, -1, 1);
  game.camX = 0;
  game.camAlt = 0;
  game.gust = 0;
  game.windDrift = 0;
  game.flightTime = 0;
  game.result = null;
  game.crashReason = '';
  game.state = 'flying';
  game.warnedStall = false;
}

function endSortie(game, kind, reason) {
  const plane = game.plane;
  const ringsTaken = game.rings.filter((r) => r.taken).length;
  if (kind === 'landed') {
    const onStrip = plane.x >= game.terrain.runway.x0 && plane.x <= game.terrain.runway.x1;
    game.result = scoreSortie(ringsTaken, game.mission.rings, onStrip, !onStrip, plane.fuel, game.flightTime);
    game.state = 'landed';
    playTouchdown(game.audio);
  } else {
    game.result = scoreSortie(ringsTaken, game.mission.rings, false, false, plane.fuel, game.flightTime);
    game.crashReason = reason;
    game.state = 'crashed';
    playCrash(game.audio);
  }
  setEngine(game.audio, 0, false);
}

// One frame of the state machine. `dt` is seconds since the last frame.
export function updateGame(game, dt) {
  const { pressed, clicked, clickX, clickY } = takePressed(game.input);
  if (pressed.has('mute')) game.audio.muted = !game.audio.muted;
  if (pressed.has('confirm') || clicked) startAudio(game.audio);

  if (game.state === 'title') {
    updateTitle(game, pressed, clicked, clickX, clickY);
    return;
  }
  if (game.state === 'paused') {
    if (pressed.has('pause') || pressed.has('confirm')) game.state = 'flying';
    if (pressed.has('restart')) startMission(game, game.missionIndex);
    return;
  }
  if (game.state === 'landed' || game.state === 'crashed') {
    if (pressed.has('restart') || pressed.has('confirm') || clicked) {
      startMission(game, game.missionIndex);
    }
    stepParticles(game.particles, dt);
    return;
  }

  // Flying.
  if (pressed.has('pause')) {
    game.state = 'paused';
    setEngine(game.audio, 0, false);
    return;
  }
  if (pressed.has('restart')) {
    startMission(game, game.missionIndex);
    return;
  }
  game.timeSec += dt;
  game.flightTime += dt;
  const controls = readControls(game.input);
  const plane = game.plane;
  // Wind: a steady headwind plus gusts that breathe with the noise field.
  // Near the ground the gusts fade — the air is calmer at the strip, so
  // a gust cannot turn a gentle touchdown into a crash by itself.
  const gustAmp = game.mission.gust;
  game.gust = game.gustNoise(game.flightTime / 9) * gustAmp;
  game.windDrift = -game.mission.headwind * 0.4 + game.gust * 0.8;
  const groundCalm = Math.max(0.25, Math.min(1, plane.alt / 60));
  stepPlane(plane, controls, game.gust * groundCalm, dt);
  // Headwind eats ground speed; tail gusts give a little back.
  plane.x -= (game.mission.headwind - game.gust * 0.5) * dt * 0.4;
  // Stall warning, once per stall.
  if (plane.speed < PHYSICS.stallSpeed && !game.warnedStall) {
    game.warnedStall = true;
    playWarning(game.audio);
  }
  if (plane.speed >= PHYSICS.stallSpeed + 4) game.warnedStall = false;
  setEngine(game.audio, plane.throttle, true);
  // Rings.
  const ring = collectRing(plane, game.rings);
  if (ring) {
    playRingChime(game.audio);
    const screen = screenPos(game, ring.x, ring.alt);
    spawnBurst(game.particles, screen.x, screen.y, '#ffcf3f', 26);
  }
  stepParticles(game.particles, dt);
  // Ground contact.
  const ground = terrainHeightAt(game.terrain, plane.x);
  if (plane.alt <= ground + 1) {
    const verdict = judgeTouchdown(plane, game.terrain, game.terrain.runway);
    const screen = screenPos(game, plane.x, plane.alt);
    if (verdict === 'water') {
      spawnBurst(game.particles, screen.x, screen.y, '#7ec8f2', 40);
      endSortie(game, 'crashed', 'Ditched in the sea — the mail went down with the plane.');
    } else if (verdict === 'hard') {
      spawnBurst(game.particles, screen.x, screen.y, '#ff5a4e', 40);
      spawnBurst(game.particles, screen.x, screen.y, '#3c3f46', 24);
      endSortie(game, 'crashed', 'Came in too hot and too steep — the undercarriage gave up first.');
    } else {
      plane.alt = ground + 1;
      plane.vspeed = 0;
      plane.speed = Math.max(0, plane.speed - 30 * dt);
      if (verdict === 'rough') {
        plane.damage = Math.min(100, plane.damage + PHYSICS.damageRoughField);
        spawnBurst(game.particles, screen.x, screen.y + 10, '#c9b48a', 20);
      }
      if (plane.speed < 2) endSortie(game, 'landed', '');
      else if (verdict === 'strip' && plane.speed < 12) endSortie(game, 'landed', '');
    }
  }
  // Out of fuel over the sea with no speed left is a ditching.
  if (plane.fuel <= 0 && plane.speed < PHYSICS.stallSpeed - 6 && plane.alt < 30) {
    endSortie(game, 'crashed', 'Out of fuel and out of sky — she settled into the drink.');
  }
  // Overshot the strip: the route ends at the runway, and this plane
  // only flies east, so a pass beyond it is a missed approach, not a
  // scenic detour. End the sortie with the reason on screen.
  if (plane.x > game.terrain.runway.x1 + 400) {
    endSortie(game, 'crashed', 'Overshot the strip — the runway is behind you now.');
  }
  // Camera: keep the plane a third of the way across, ease the altitude.
  const targetCamX = Math.max(0, plane.x - 380);
  game.camX += (targetCamX - game.camX) * Math.min(1, dt * 2.2);
  const targetCamAlt = Math.max(0, Math.min(420, plane.alt - 140));
  game.camAlt += (targetCamAlt - game.camAlt) * Math.min(1, dt * 1.6);
}

function screenPos(game, x, alt) {
  return {
    x: (x - game.camX) * game.scale.x,
    y: 600 - (alt - game.camAlt) * game.scale.y,
  };
}

// ---- title screen --------------------------------------------------------

function updateTitle(game, pressed, clicked, clickX, clickY) {
  game.buttons = [];
  const W = VIEW.width;
  // Mission cards, clickable.
  MISSIONS.forEach((mission, i) => {
    const bx = W / 2 - 420 + i * 290;
    game.buttons.push({ x: bx, y: 430, w: 270, h: 150, mission: i });
  });
  if (pressed.has('mission1')) startMission(game, 0);
  if (pressed.has('mission2')) startMission(game, 1);
  if (pressed.has('mission3')) startMission(game, 2);
  if (pressed.has('confirm')) startMission(game, game.missionIndex);
  if (clicked) {
    for (const b of game.buttons) {
      if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) {
        startMission(game, b.mission);
        return;
      }
    }
  }
}

function drawTitle(ctx, game, timeSec) {
  const W = VIEW.width;
  const H = VIEW.height;
  // A calm dawn scene behind the menu: the same world, drifting slowly.
  drawTitleScene(ctx, game, timeSec);
  // Darken for legibility.
  ctx.fillStyle = 'rgba(10,16,28,0.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5f2e4';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('EMBER ISLES', W / 2, 150);
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillStyle = '#ffd166';
  ctx.fillText('AIRMAIL', W / 2, 222);
  ctx.fillStyle = '#dfe9f2';
  ctx.font = '18px Georgia, serif';
  ctx.fillText('A bush-plane courier over the dawn isles — rings, wind, fuel, and one lit strip.', W / 2, 262);
  ctx.font = '15px monospace';
  ctx.fillStyle = '#9fb4c8';
  ctx.fillText('↑ / W throttle up    ↓ / S throttle down    ← → pitch    SPACE flaps    P pause    M mute', W / 2, 300);
  ctx.fillText('Fly through every ring, then land gently on the strip. Mind the fuel — rings top it up.', W / 2, 326);
  // Mission cards.
  MISSIONS.forEach((mission, i) => {
    const bx = W / 2 - 420 + i * 290;
    const by = 430;
    const hover = game.input.mouse.x >= bx && game.input.mouse.x <= bx + 270
      && game.input.mouse.y >= by && game.input.mouse.y <= by + 150;
    ctx.fillStyle = hover ? 'rgba(255,209,102,0.22)' : 'rgba(12,16,24,0.72)';
    ctx.beginPath();
    ctx.roundRect(bx, by, 270, 150, 10);
    ctx.fill();
    ctx.strokeStyle = i === game.missionIndex ? '#ffd166' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = i === game.missionIndex ? 2.5 : 1;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`SORTIE ${i + 1}  —  press ${i + 1}`, bx + 16, by + 26);
    ctx.fillStyle = '#f5f2e4';
    ctx.font = 'bold 19px Georgia, serif';
    ctx.fillText(mission.name, bx + 16, by + 56);
    ctx.fillStyle = '#c8d4de';
    ctx.font = '12px monospace';
    wrapText(ctx, mission.briefing, bx + 16, by + 78, 238, 16);
    ctx.fillStyle = '#9fb4c8';
    ctx.fillText(`${mission.rings} rings · fuel ${mission.fuel} · wind ${mission.headwind} m/s`, bx + 16, by + 132);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8fa8bc';
  ctx.font = '12px monospace';
  ctx.fillText('Click a sortie, or press 1 / 2 / 3 — ENTER flies the selected one.', W / 2, 620);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

// The title backdrop: the same world, drifting slowly, no HUD.
function drawTitleScene(ctx, game, timeSec) {
  const terrain = game.terrain;
  const camX = 1200 + timeSec * 6;
  const camAlt = 60;
  drawSky(ctx, terrain.mission.palette, timeSec, camX);
  drawClouds(ctx, terrain, camX, camAlt, game.scale, timeSec);
  drawTerrain(ctx, terrain, camX, camAlt, game.scale);
  // A plane silhouette crossing the sky.
  const p = worldToScreen(1200 + timeSec * 6 + 500, 220 + Math.sin(timeSec * 0.7) * 12, camX, camAlt, game.scale);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(30,30,40,0.85)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-8, -17, 26, 4);
  ctx.beginPath();
  ctx.moveTo(-30, -2);
  ctx.lineTo(-40, -14);
  ctx.lineTo(-34, -2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---- end screens ---------------------------------------------------------

function drawEndScreen(ctx, game, title, titleColor) {
  const W = VIEW.width;
  ctx.fillStyle = 'rgba(10,16,28,0.55)';
  ctx.fillRect(0, 0, W, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText(title, W / 2, 170);
  const r = game.result;
  ctx.fillStyle = '#f5f2e4';
  ctx.font = '17px monospace';
  const lines = [
    `Rings flown: ${r.ringsTaken}/${r.ringTotal} — ${r.ringScore} pts`,
    `Landing: ${r.landingScore} pts`,
    `Fuel left: ${r.fuelScore} pts`,
    `Time bonus: ${r.timeBonus} pts`,
  ];
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 250 + i * 30));
  ctx.font = 'bold 30px monospace';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(`TOTAL  ${r.total}`, W / 2, 420);
  if (game.state === 'crashed') {
    ctx.fillStyle = '#ffb0a8';
    ctx.font = '15px Georgia, serif';
    ctx.fillText(game.crashReason, W / 2, 470);
  }
  ctx.fillStyle = '#9fb4c8';
  ctx.font = '14px monospace';
  ctx.fillText('Press R or ENTER — or click — to fly this sortie again.', W / 2, 540);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(10,16,28,0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5f2e4';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('PAUSED', VIEW.width / 2, 330);
  ctx.font = '15px monospace';
  ctx.fillStyle = '#9fb4c8';
  ctx.fillText('P to resume · R to restart the sortie', VIEW.width / 2, 380);
}

// ---- frame entry ---------------------------------------------------------

export function drawGame(game) {
  const ctx = game.ctx;
  if (game.state === 'title') {
    drawTitle(ctx, game, game.timeSec);
    return;
  }
  drawFlightFrame(ctx, game, game.timeSec);
  if (game.state === 'paused') drawPaused(ctx);
  if (game.state === 'landed') drawEndScreen(ctx, game, 'DELIVERED', '#7fb069');
  if (game.state === 'crashed') drawEndScreen(ctx, game, 'DOWN', '#ff5a4e');
}
