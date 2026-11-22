// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh heist for a fixed number of steps, steered by an
// autopilot that walks a coarse grid around the blocks, so the frame is what a
// short game really looks like and the same seed always gives the same frame.
// The careful pilot reads the cones and sneaks through them; the reckless one
// walks straight at the loot, as a hurried player does.

import { ARENA, STEP } from './settings.js';
import { EV_CLEAR, EV_OVER } from './heist.js';
import { VIEW_OVER, VIEW_PLAY, VIEW_TITLE } from './draw.js';

const START_SECONDS = 5;
const END_LIMIT_SECONDS = 600;
const CELL = 40;
const COLS = Math.floor(ARENA.width / CELL);
const ROWS = Math.floor(ARENA.height / CELL);

/** The nearest thing worth walking to: loose loot first, then the diamond, then the exit. */
function pickTarget(heist) {
  const state = heist.state;
  const thief = state.thief;
  let best = null;
  let bestScore = Infinity;
  const consider = (x, y, weight) => {
    const d = Math.hypot(x - thief.x, y - thief.y) * weight;
    if (d < bestScore) {
      bestScore = d;
      best = { x, y };
    }
  };
  for (const coin of state.coins) if (!coin.taken) consider(coin.x, coin.y, 1);
  for (const bag of state.bags) if (!bag.taken) consider(bag.x, bag.y, 0.9);
  if (!state.diamondTaken) {
    const d = heist.room().diamond;
    consider(d.x, d.y, 0.7);
  }
  if (best === null) {
    const e = heist.room().exit;
    best = { x: e.x + e.w / 2, y: e.y + e.h / 2 };
  }
  return best;
}

function cellOf(x, y) {
  return [
    Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL))),
    Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL))),
  ];
}

function cellKey(cx, cy) {
  return cy * COLS + cx;
}

/**
 * A breadth-first walk over the coarse grid from the thief to the target,
 * steering around the blocks. Returns the next cell's centre, or the target
 * itself when already close. Neighbours are tried in a fixed order, so the
 * walk is deterministic.
 */
function nextCell(heist, target) {
  const thief = heist.state.thief;
  const [sx, sy] = cellOf(thief.x, thief.y);
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
      if (heist.blockedAt(nx * CELL + CELL / 2, ny * CELL + CELL / 2, 16)) continue;
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

/** The nearest cell no cone watches, within five cells of the thief: a hiding place. */
function nearestSafeCell(heist) {
  const thief = heist.state.thief;
  const [sx, sy] = cellOf(thief.x, thief.y);
  let best = null;
  let bestD = Infinity;
  for (let cy = Math.max(0, sy - 5); cy <= Math.min(ROWS - 1, sy + 5); cy += 1) {
    for (let cx = Math.max(0, sx - 5); cx <= Math.min(COLS - 1, sx + 5); cx += 1) {
      const x = cx * CELL + CELL / 2;
      const y = cy * CELL + CELL / 2;
      if (heist.blockedAt(x, y, 16)) continue;
      if (heist.watchedAt(x, y, false) !== null) continue;
      const d = Math.hypot(x - thief.x, y - thief.y);
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  }
  return best;
}

/**
 * One steering step toward the target. A careful pilot that can see the next
 * cell is watched looks for a safe neighbour that still heads the right way,
 * and sneaks when it must cross a cone; a reckless pilot takes the path as it
 * is, straight through the cones. When a chase is on, the careful pilot drops
 * everything and runs for the nearest cell no cone watches.
 */
function driveThief(heist, reckless) {
  const thief = heist.state.thief;
  if (!reckless && heist.state.sentries.some((s) => s.mode === 'chase')) {
    const safe = nearestSafeCell(heist);
    if (safe !== null) {
      const dx = safe.x - thief.x;
      const dy = safe.y - thief.y;
      const len = Math.hypot(dx, dy);
      if (len >= 4) return { steer: { x: dx / len, y: dy / len }, sneak: false };
      return { steer: { x: 0, y: 0 }, sneak: false };
    }
  }
  const target = pickTarget(heist);
  const step = nextCell(heist, target);
  if (step === null) return { steer: { x: 0, y: 0 }, sneak: false };
  const dx = step.x - thief.x;
  const dy = step.y - thief.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return { steer: { x: 0, y: 0 }, sneak: false };
  const head = { x: dx / len, y: dy / len };
  if (reckless) return { steer: head, sneak: false };
  const watched = heist.watchedAt(step.x, step.y, false) !== null;
  if (!watched) return { steer: head, sneak: false };
  // Look for a safe neighbour cell that still gets closer to the target.
  const [sx, sy] = cellOf(thief.x, thief.y);
  let safeCell = null;
  let safeD = Infinity;
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const nx = sx + ox;
    const ny = sy + oy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
    const cx = nx * CELL + CELL / 2;
    const cy = ny * CELL + CELL / 2;
    if (heist.blockedAt(cx, cy, 16)) continue;
    if (heist.watchedAt(cx, cy, true) !== null) continue;
    const d = Math.hypot(target.x - cx, target.y - cy);
    if (d < safeD) {
      safeD = d;
      safeCell = { x: cx, y: cy };
    }
  }
  if (safeCell !== null) {
    const bx = safeCell.x - thief.x;
    const by = safeCell.y - thief.y;
    const blen = Math.hypot(bx, by);
    if (blen < 4) return { steer: { x: 0, y: 0 }, sneak: false };
    return { steer: { x: bx / blen, y: by / blen }, sneak: false };
  }
  return { steer: head, sneak: true };
}

/**
 * Set `heist` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageScene(name, heist) {
  heist.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      heist.step(STEP, { x: 0, y: 0 }, false, null, true);
    }
    return { screen: VIEW_TITLE, best: 0 };
  }
  const reckless = name === 'end';
  const limit = reckless ? END_LIMIT_SECONDS : 100;
  for (let i = 0; i < limit / STEP; i += 1) {
    const { steer, sneak } = driveThief(heist, reckless);
    const events = heist.step(STEP, steer, sneak, null, false);
    if (events & EV_OVER) break;
    if (events & EV_CLEAR) {
      if (heist.state.phase === 'win') break;
      heist.nextLevel();
    }
    // The play scene is a room mid-heist: stop once the pilot has played the
    // second room a little, rather than running on until it is caught.
    if (!reckless && heist.state.level >= 1 && heist.state.levelTime > 12) break;
  }
  if (heist.state.phase === 'over') return { screen: VIEW_OVER, best: heist.state.score };
  return { screen: VIEW_PLAY, best: heist.state.score };
}
