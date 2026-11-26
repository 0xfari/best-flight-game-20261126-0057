// Ember Isles Airmail — entry point.
// One job: size the canvas, own the animation loop, and hand each frame
// to the game state machine. Nothing else lives here.

import { VIEW } from './config.js';
import { makeGame, updateGame, drawGame } from './game.js';
import { shotFromQuery, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');

function fitCanvas() {
  // Fixed logical resolution: the game draws in 1280x720 and the
  // browser scales it, so screenshots and play look the same everywhere.
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
}

function announce(game) {
  if (!statusLine) return;
  if (game.state === 'title') statusLine.textContent = 'Ember Isles Airmail. Choose a sortie to fly.';
  else if (game.state === 'flying') statusLine.textContent = 'Flying. Rings, fuel and the strip ahead.';
  else if (game.state === 'paused') statusLine.textContent = 'Paused.';
  else if (game.state === 'landed') statusLine.textContent = `Delivered. Score ${game.result ? game.result.total : 0}.`;
  else if (game.state === 'crashed') statusLine.textContent = 'Crashed. Press R to fly again.';
}

function main() {
  fitCanvas();
  const game = makeGame(canvas);
  window.addEventListener('resize', fitCanvas);
  const shot = shotFromQuery();
  const frozen = applyShot(game, shot);
  let lastState = '';
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // In a screenshot state the simulation stays frozen: the frame is a
    // still of the game's own render, not a moment mid-flight.
    if (!frozen) updateGame(game, dt);
    else game.timeSec += dt * 0.05;
    drawGame(game);
    if (game.state !== lastState) {
      announce(game);
      lastState = game.state;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
