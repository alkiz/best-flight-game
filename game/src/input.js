// input.js — keyboard, mouse and touch, reduced to one read() per frame.
// Action keys (Enter, P, M, R) are edge-triggered: read() reports them
// once, then clears them, so a held key never double-fires.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const pointer = { x: 0, y: 0, active: false };

  function canvasY(clientY) {
    const r = canvas.getBoundingClientRect();
    return ((clientY - r.top) / r.height) * 800;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    pointer.active = true;
    pointer.y = canvasY(e.clientY);
    pointer.x = e.clientX;
    pressed.add('PointerClick');
  });
  window.addEventListener('pointermove', (e) => {
    pointer.y = canvasY(e.clientY);
    pointer.x = e.clientX;
  });
  window.addEventListener('pointerup', () => {
    pointer.active = false;
  });

  function take(code) {
    if (pressed.has(code)) {
      pressed.delete(code);
      return true;
    }
    return false;
  }

  return {
    read() {
      const climb =
        (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0) -
        (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0);
      const throttleDelta =
        (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) -
        (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      const out = {
        climb,
        throttleDelta,
        brake: keys.has('Space'),
        pointerY: pointer.active ? pointer.y : null,
        pointerActive: pointer.active,
        enter: take('Enter') || take('NumpadEnter'),
        pause: take('KeyP'),
        mute: take('KeyM'),
        restart: take('KeyR'),
        clicked: take('PointerClick'),
      };
      return out;
    },
  };
}
