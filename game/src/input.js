// Keyboard and mouse. WASD or arrows move, Shift sneaks, P pauses, M mutes,
// Space or Enter confirms, and a click on the floor throws a noise coin that
// pulls nearby guards over to investigate it.
export const ACT = { confirm: 1, pause: 2, mute: 4 };

export function makeInput(canvas) {
  const held = new Set();
  let pending = 0;
  let throwPoint = null;

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') pending |= ACT.confirm;
    if (event.code === 'KeyP' || event.code === 'Escape') pending |= ACT.pause;
    if (event.code === 'KeyM') pending |= ACT.mute;
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    throwPoint = { x, y };
    pending |= ACT.confirm;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);

  function move() {
    let x = 0;
    let y = 0;
    if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
    if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
    if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
    if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  return {
    move,
    sneaking() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    takeActions() {
      const out = pending;
      pending = 0;
      return out;
    },
    takeThrow() {
      const out = throwPoint;
      throwPoint = null;
      return out;
    },
  };
}
