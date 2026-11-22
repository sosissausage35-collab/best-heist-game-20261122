// Midnight Vault: the world. A top-down stealth heist: the thief crosses one
// room, guards walk waypoint loops with vision cones, wall cameras sweep,
// loot is scattered around, the vault diamond is the target, and the alarm
// meter decides whether the guards start hunting. All movement runs in fixed
// 1/60 s steps from a seeded RNG, so a seed always replays the same game.
import {
  ALARM_FALL,
  ALARM_RISE,
  ALARM_TIME,
  CAMERA,
  CAUGHT_DIST,
  DIAMOND_DIST,
  FIELD,
  GUARD,
  LEVELS,
  LIVES,
  LOOT_DIST,
  PLAYER,
  SNEAK_SEEN,
  WALL,
} from './config.js';

export const EVENT_LOOT = 1;
export const EVENT_DIAMOND = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_CLEAR = 8;
export const EVENT_OVER = 16;
export const EVENT_VICTORY = 32;
export const EVENT_ALARM = 64;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Whether the segment (x1,y1)-(x2,y2) touches rect {x,y,w,h} (Liang-Barsky). */
function segHitsRect(x1, y1, x2, y2, r) {
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function walls() {
  return [
    { x: 0, y: 0, w: FIELD.width, h: WALL },
    { x: 0, y: FIELD.height - WALL, w: FIELD.width, h: WALL },
    { x: 0, y: 0, w: WALL, h: FIELD.height },
    { x: FIELD.width - WALL, y: 0, w: WALL, h: FIELD.height },
  ];
}

export function createWorld(rng) {
  const state = {
    levelIndex: 0,
    level: LEVELS[0],
    score: 0,
    lives: LIVES,
    time: 0,
    levelTime: 0,
    player: { x: 640, y: 610, dir: -Math.PI / 2, sneaking: false, invuln: 0 },
    guards: [],
    cameras: [],
    coins: [],
    bags: [],
    diamond: { x: 640, y: 138, taken: false },
    noises: [],
    noiseLeft: 3,
    alarm: 0,
    alarmMode: 0,
    stealth: true,
    lootGot: 0,
    lootTotal: 0,
    phase: 'playing',
    lastClear: null,
  };

  function obstacles() {
    return [...walls(), ...state.level.cases, state.level.vault];
  }

  function collides(x, y, r) {
    for (const rect of obstacles()) {
      if (circleHitsRect(x, y, r, rect)) return true;
    }
    return false;
  }

  function losClear(x1, y1, x2, y2) {
    for (const rect of state.level.cases) {
      if (segHitsRect(x1, y1, x2, y2, rect)) return false;
    }
    return true;
  }

  /** Whether a spotter (x, y, dir, range, half) can see point (px, py). */
  function sees(spotter, px, py) {
    const dx = px - spotter.x;
    const dy = py - spotter.y;
    const dist = Math.hypot(dx, dy);
    if (dist > spotter.range) return 0;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), spotter.dir)) > spotter.half) return 0;
    if (!losClear(spotter.x, spotter.y, px, py)) return 0;
    return Math.max(0.25, 1.15 - dist / spotter.range);
  }

  function reset(levelIndex, keepScore) {
    const level = LEVELS[levelIndex];
    state.levelIndex = levelIndex;
    state.level = level;
    state.levelTime = 0;
    state.player.x = level.start[0];
    state.player.y = level.start[1];
    state.player.dir = -Math.PI / 2;
    state.player.sneaking = false;
    state.player.invuln = 0;
    state.guards = level.guards.map((g, i) => {
      const startWp = Math.floor(rng() * g.waypoints.length);
      const [wx, wy] = g.waypoints[startWp];
      return {
        x: wx,
        y: wy,
        dir: 0,
        waypoints: g.waypoints,
        wpIndex: (startWp + 1) % g.waypoints.length,
        wpDir: 1,
        speed: g.speed,
        mode: 'patrol',
        tx: 0,
        ty: 0,
        wait: 0,
        seeing: false,
      };
    });
    state.cameras = level.cameras.map((c) => ({
      x: c.x,
      y: c.y,
      base: c.base,
      sweep: c.sweep,
      period: c.period,
      t: rng() * c.period,
      angle: c.base,
      seeing: false,
    }));
    state.coins = level.coins.map(([x, y]) => ({ x, y, taken: false }));
    state.bags = level.bags.map(([x, y]) => ({ x, y, taken: false }));
    state.diamond = { x: level.diamond[0], y: level.diamond[1], taken: false };
    state.noises = [];
    state.noiseLeft = level.noiseCoins;
    state.alarm = 0;
    state.alarmMode = 0;
    state.stealth = true;
    state.lootGot = 0;
    state.lootTotal = level.coins.length + level.bags.length + 1;
    state.phase = 'playing';
    state.lastClear = null;
    if (!keepScore) {
      state.score = 0;
      state.lives = LIVES;
      state.time = 0;
    }
  }

  function nextLevel() {
    reset(state.levelIndex + 1, true);
  }

  function caught(events) {
    state.lives -= 1;
    events |= EVENT_CAUGHT;
    if (state.lives <= 0) {
      state.phase = 'over';
      events |= EVENT_OVER;
      return events;
    }
    state.player.x = state.level.start[0];
    state.player.y = state.level.start[1];
    state.player.invuln = 2;
    state.alarm = 35;
    state.alarmMode = 0;
    for (const g of state.guards) {
      g.mode = 'patrol';
      g.wait = 0;
    }
    return events;
  }

  /**
   * Advance the world one fixed step. move is a normalized {x, y} direction
   * (or {x:0,y:0}); opts: {sneak, throwAt, ambient}. Ambient steps (the title
   * screen backdrop) move guards and cameras but never detect, alarm or loot.
   * Returns an event bitmask.
   */
  function step(dt, move, opts = {}) {
    let events = 0;
    state.time += dt;
    if (state.phase !== 'playing') {
      // The room keeps breathing behind an end screen.
      for (const c of state.cameras) {
        c.t += dt;
        c.angle = c.base + c.sweep * Math.sin((2 * Math.PI * c.t) / c.period);
      }
      return events;
    }
    state.levelTime += dt;
    const p = state.player;
    const ambient = opts.ambient === true;
    if (p.invuln > 0) p.invuln -= dt;

    // --- the thief
    const speed = opts.sneak ? PLAYER.sneak : PLAYER.walk;
    p.sneaking = opts.sneak === true;
    if (!ambient && (move.x !== 0 || move.y !== 0)) {
      p.dir = Math.atan2(move.y, move.x);
      const nx = p.x + move.x * speed * dt;
      if (!collides(nx, p.y, PLAYER.radius)) p.x = nx;
      const ny = p.y + move.y * speed * dt;
      if (!collides(p.x, ny, PLAYER.radius)) p.y = ny;
    }

    // --- a thrown noise coin pulls nearby guards over
    if (!ambient && opts.throwAt && state.noiseLeft > 0) {
      const t = opts.throwAt;
      const cx = Math.max(WALL + 8, Math.min(FIELD.width - WALL - 8, t.x));
      const cy = Math.max(WALL + 8, Math.min(FIELD.height - WALL - 8, t.y));
      state.noises.push({ x: cx, y: cy, t: 3 });
      state.noiseLeft -= 1;
      for (const g of state.guards) {
        if (Math.hypot(g.x - cx, g.y - cy) < 280) {
          g.mode = 'investigate';
          g.tx = cx;
          g.ty = cy;
          g.wait = 0;
        }
      }
    }
    for (let i = state.noises.length - 1; i >= 0; i--) {
      state.noises[i].t -= dt;
      if (state.noises[i].t <= 0) state.noises.splice(i, 1);
    }

    // --- guards
    for (const g of state.guards) {
      let tx;
      let ty;
      let sp = g.speed;
      if (g.mode === 'chase' && state.alarmMode > 0) {
        tx = p.x;
        ty = p.y;
        sp = GUARD.chase;
      } else if (g.mode === 'investigate') {
        tx = g.tx;
        ty = g.ty;
        if (Math.hypot(tx - g.x, ty - g.y) < 8) {
          g.wait += dt;
          if (g.wait > 2) {
            g.mode = 'patrol';
            g.wait = 0;
          }
          tx = g.x;
          ty = g.y;
        }
      } else {
        g.mode = 'patrol';
        const wp = g.waypoints[g.wpIndex];
        tx = wp[0];
        ty = wp[1];
        if (Math.hypot(tx - g.x, ty - g.y) < 6) {
          g.wpIndex += g.wpDir;
          if (g.wpIndex >= g.waypoints.length || g.wpIndex < 0) {
            g.wpDir *= -1;
            g.wpIndex += g.wpDir * 2;
          }
        }
      }
      const dx = tx - g.x;
      const dy = ty - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.5) {
        const want = Math.atan2(dy, dx);
        let turn = angleDiff(want, g.dir);
        const maxTurn = 6 * dt;
        turn = Math.max(-maxTurn, Math.min(maxTurn, turn));
        g.dir += turn;
        const stepLen = Math.min(dist, sp * dt);
        const nx = g.x + Math.cos(g.dir) * stepLen;
        const ny = g.y + Math.sin(g.dir) * stepLen;
        if (!collides(nx, g.y, GUARD.radius)) g.x = nx;
        if (!collides(g.x, ny, GUARD.radius)) g.y = ny;
      }
    }

    // --- cameras
    for (const c of state.cameras) {
      c.t += dt;
      c.angle = c.base + c.sweep * Math.sin((2 * Math.PI * c.t) / c.period);
    }

    if (ambient) return events;

    // --- who sees the thief?
    let seen = false;
    const sneakFactor = p.sneaking ? SNEAK_SEEN : 1;
    if (p.invuln <= 0) {
      for (const g of state.guards) {
        const prox = sees({ x: g.x, y: g.y, dir: g.dir, range: GUARD.coneRange, half: GUARD.coneHalf }, p.x, p.y);
        g.seeing = prox > 0;
        if (prox > 0) {
          seen = true;
          state.alarm += ALARM_RISE * prox * sneakFactor * dt;
        }
      }
      for (const c of state.cameras) {
        const prox = sees({ x: c.x, y: c.y, dir: c.angle, range: CAMERA.range, half: CAMERA.half }, p.x, p.y);
        c.seeing = prox > 0;
        if (prox > 0) {
          seen = true;
          state.alarm += ALARM_RISE * prox * sneakFactor * dt;
        }
      }
    } else {
      for (const g of state.guards) g.seeing = false;
      for (const c of state.cameras) c.seeing = false;
    }
    if (seen && state.alarm >= 100) {
      state.alarm = 100;
      if (state.alarmMode <= 0) {
        state.alarmMode = ALARM_TIME;
        state.stealth = false;
        events |= EVENT_ALARM;
        for (const g of state.guards) g.mode = 'chase';
      }
    } else if (!seen) {
      state.alarm = Math.max(0, state.alarm - ALARM_FALL * dt);
    }
    if (state.alarmMode > 0) {
      state.alarmMode -= dt;
      if (state.alarmMode <= 0) {
        for (const g of state.guards) if (g.mode === 'chase') g.mode = 'patrol';
      }
    }

    // --- bumped into a guard?
    if (p.invuln <= 0) {
      for (const g of state.guards) {
        if (Math.hypot(g.x - p.x, g.y - p.y) < CAUGHT_DIST) {
          return caught(events);
        }
      }
    }

    // --- loot
    for (const coin of state.coins) {
      if (!coin.taken && Math.hypot(coin.x - p.x, coin.y - p.y) < LOOT_DIST) {
        coin.taken = true;
        state.score += 100;
        state.lootGot += 1;
        events |= EVENT_LOOT;
      }
    }
    for (const bag of state.bags) {
      if (!bag.taken && Math.hypot(bag.x - p.x, bag.y - p.y) < LOOT_DIST) {
        bag.taken = true;
        state.score += 250;
        state.lootGot += 1;
        events |= EVENT_LOOT;
      }
    }
    if (!state.diamond.taken && Math.hypot(state.diamond.x - p.x, state.diamond.y - p.y) < DIAMOND_DIST) {
      state.diamond.taken = true;
      state.score += 1000;
      state.lootGot += 1;
      events |= EVENT_DIAMOND;
    }

    // --- the exit, once the diamond is in hand
    const e = state.level.exit;
    if (state.diamond.taken && p.x > e.x && p.x < e.x + e.w && p.y > e.y - 14 && p.y < e.y + e.h) {
      const bonus = 500 + (state.stealth ? 300 : 0);
      state.score += bonus;
      state.lastClear = { level: state.level.name, loot: state.lootGot, bonus, stealth: state.stealth };
      events |= EVENT_CLEAR;
      if (state.levelIndex >= LEVELS.length - 1) {
        state.phase = 'victory';
        events |= EVENT_VICTORY;
      } else {
        state.phase = 'clear';
      }
    }
    return events;
  }

  /** Whether any guard or camera can currently see point (x, y). */
  function canSeePoint(x, y) {
    for (const g of state.guards) {
      if (sees({ x: g.x, y: g.y, dir: g.dir, range: GUARD.coneRange, half: GUARD.coneHalf }, x, y) > 0) return true;
    }
    for (const c of state.cameras) {
      if (sees({ x: c.x, y: c.y, dir: c.angle, range: CAMERA.range, half: CAMERA.half }, x, y) > 0) return true;
    }
    return false;
  }

  function canStand(x, y) {
    if (x < WALL + PLAYER.radius || x > FIELD.width - WALL - PLAYER.radius) return false;
    if (y < WALL + PLAYER.radius || y > FIELD.height - WALL - PLAYER.radius) return false;
    return !collides(x, y, PLAYER.radius);
  }

  reset(0, false);
  return { state, reset, nextLevel, step, canSeePoint, canStand };
}
