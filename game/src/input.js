// Ember Isles Airmail — keyboard and mouse.
// One job: turn raw device events into the game's named input state.

export function makeInput() {
  return {
    keys: new Set(),
    mouse: { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 },
    // Named, edge-triggered actions, consumed by the game loop.
    pressed: new Set(),
  };
}

const KEYMAP = {
  ArrowUp: 'throttleUp',
  KeyW: 'throttleUp',
  ArrowDown: 'throttleDown',
  KeyS: 'throttleDown',
  ArrowLeft: 'pitchUp',
  KeyA: 'pitchUp',
  ArrowRight: 'pitchDown',
  KeyD: 'pitchDown',
  Space: 'flaps',
  KeyP: 'pause',
  KeyR: 'restart',
  KeyM: 'mute',
  Enter: 'confirm',
  Digit1: 'mission1',
  Digit2: 'mission2',
  Digit3: 'mission3',
  Numpad1: 'mission1',
  Numpad2: 'mission2',
  Numpad3: 'mission3',
};

export function attachInput(input, canvas) {
  window.addEventListener('keydown', (event) => {
    const action = KEYMAP[event.code];
    if (!action) return;
    event.preventDefault();
    if (!event.repeat) input.pressed.add(action);
    input.keys.add(action);
  });
  window.addEventListener('keyup', (event) => {
    const action = KEYMAP[event.code];
    if (action) input.keys.delete(action);
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    input.mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.clickX = (event.clientX - rect.left) * (canvas.width / rect.width);
    input.mouse.clickY = (event.clientY - rect.top) * (canvas.height / rect.height);
    input.mouse.clicked = true;
  });
  window.addEventListener('blur', () => input.keys.clear());
}

// Read the held (continuous) control state for this frame.
export function readControls(input) {
  return {
    throttleUp: input.keys.has('throttleUp'),
    throttleDown: input.keys.has('throttleDown'),
    pitchUp: input.keys.has('pitchUp'),
    pitchDown: input.keys.has('pitchDown'),
    flaps: input.keys.has('flaps'),
  };
}

// Take and clear the edge-triggered actions pressed since last frame.
export function takePressed(input) {
  const pressed = new Set(input.pressed);
  input.pressed.clear();
  const clicked = input.mouse.clicked;
  input.mouse.clicked = false;
  return { pressed, clicked, clickX: input.mouse.clickX, clickY: input.mouse.clickY };
}
