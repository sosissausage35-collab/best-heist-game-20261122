// Keyboard and mouse input. WASD or arrows move, Shift sneaks, P pauses,
// M mutes, Space or Enter confirms, and a click on the floor throws a noise
// coin that pulls nearby guards over to investigate.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let throwAt = null;

  function codeOf(event) {
    return event.code;
  }

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    throwAt = { x, y };
    actions |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);

  function direction() {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  return {
    direction,
    sneaking() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
    takeThrow() {
      const out = throwAt;
      throwAt = null;
      return out;
    },
  };
}
