// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so the frame is what a short game really looks like and
// the same seed always gives the same frame. The play pilot is careful enough
// to dodge most cones, so the alarm meter shows a reading; the end pilot is
// reckless, so it gets caught, as a hurried player is.
import { TICK } from './config.js';
import { EV } from './world.js';
import { Screens } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;
const CELL = 40;
const COLS = 32; // 1280 / 40
const ROWS = 18; // 720 / 40

/** The thief's next target: the nearest loot still on the floor, the diamond included. */
function pickTarget(state) {
  let best = null;
  let bestD = Infinity;
  const consider = (x, y, weight) => {
    const d = Math.hypot(x - state.player.x, y - state.player.y) * weight;
    if (d < bestD) {
      bestD = d;
      best = { x, y };
    }
  };
  for (const c of state.coins) if (!c.taken) consider(c.x, c.y, 1);
  for (const b of state.bags) if (!b.taken) consider(b.x, b.y, 0.9);
  if (!state.diamond.taken) consider(state.diamond.x, state.diamond.y, 0.7);
  if (best === null) {
    const e = state.level.exit;
    best = { x: e.x + e.w / 2, y: e.y - 10 };
  }
  return best;
}

const cellOf = (x, y) => [Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL))), Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL)))];
const cellKey = (cx, cy) => cy * COLS + cx;

/**
 * A breadth-first path over a coarse grid from the thief to the target,
 * steering around the display cases. Returns the next cell's centre, or the
 * target itself when already close. Deterministic: neighbours are tried in a
 * fixed order.
 */
function pathStep(world, target) {
  const s = world.state;
  const [sx, sy] = cellOf(s.player.x, s.player.y);
  const [tx, ty] = cellOf(target.x, target.y);
  const start = cellKey(sx, sy);
  const prev = new Map([[start, -1]]);
  const queue = [start];
  let goal = -1;
  while (queue.length > 0) {
    const cur = queue.shift();
    const cx = cur % COLS;
    const cy = Math.floor(cur / COLS);
    const centreX = cx * CELL + CELL / 2;
    const centreY = cy * CELL + CELL / 2;
    if (Math.hypot(target.x - centreX, target.y - centreY) < CELL) {
      goal = cur;
      break;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const key = cellKey(nx, ny);
      if (prev.has(key)) continue;
      if (!world.canStand(nx * CELL + CELL / 2, ny * CELL + CELL / 2)) continue;
      prev.set(key, cur);
      queue.push(key);
    }
  }
  if (goal < 0) return null;
  let cur = goal;
  let next = cur;
  while (prev.get(cur) !== -1 && prev.get(cur) !== undefined) {
    next = cur;
    cur = prev.get(cur);
  }
  if (next === start) return { x: target.x, y: target.y };
  return { x: (next % COLS) * CELL + CELL / 2, y: Math.floor(next / COLS) * CELL + CELL / 2 };
}

/**
 * One step toward the target: the breadth-first path's next cell, unless a
 * careful pilot can see a safer neighbour that still heads the right way.
 * A reckless pilot takes the path as it is, straight through the cones.
 */
function autopilot(world, reckless) {
  const s = world.state;
  const target = pickTarget(s);
  const step = pathStep(world, target);
  if (step === null) return { x: 0, y: 0 };
  const dx = step.x - s.player.x;
  const dy = step.y - s.player.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return { x: 0, y: 0 };
  if (reckless) return { x: dx / len, y: dy / len };
  // Careful: if the path's next cell is watched, look for a safe neighbour
  // that still gets closer to the target; otherwise take the path anyway.
  if (!world.canSeePoint(step.x, step.y)) return { x: dx / len, y: dy / len };
  const [sx, sy] = cellOf(s.player.x, s.player.y);
  let bestCell = null;
  let bestD = Infinity;
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const nx = sx + ox;
    const ny = sy + oy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
    const cx = nx * CELL + CELL / 2;
    const cy = ny * CELL + CELL / 2;
    if (!world.canStand(cx, cy) || world.canSeePoint(cx, cy)) continue;
    const d = Math.hypot(target.x - cx, target.y - cy);
    if (d < bestD) {
      bestD = d;
      bestCell = { x: cx, y: cy };
    }
  }
  if (bestCell === null) return { x: dx / len, y: dy / len };
  const bx = bestCell.x - s.player.x;
  const by = bestCell.y - s.player.y;
  const blen = Math.hypot(bx, by);
  return blen < 4 ? { x: 0, y: 0 } : { x: bx / blen, y: by / blen };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageScene(name, world) {
  world.reset(0, false);
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / TICK; i++) world.step(TICK, { x: 0, y: 0 }, { ambient: true });
    // Freeze the clock where the title's "press space" prompt is lit, so the
    // cover always shows it.
    world.state.time = 4;
    return { screen: Screens.title, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const reckless = name === 'end';
  for (let i = 0; i < limit / TICK; i++) {
    const events = world.step(TICK, autopilot(world, reckless), {});
    if (events & EV.over) break;
    if (events & EV.clear) {
      if (world.state.phase === 'victory') break;
      world.nextLevel();
    }
  }
  if (world.state.phase === 'over') return { screen: Screens.over, best: world.state.score };
  if (world.state.phase === 'victory') return { screen: Screens.victory, best: world.state.score };
  return { screen: Screens.play, best: world.state.score };
}
