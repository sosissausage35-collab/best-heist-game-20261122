// The game's rules and state, with no drawing and no browser in it: the thief,
// the patrolling sentries and sweeping cameras, the alarm, the loot, the vault
// diamond and the exit, across three rooms. step() advances one fixed step and
// returns what happened as bit flags, so the caller can react (sounds, screens)
// without the world knowing about them.

import {
  ALARM,
  ARENA,
  CAMERA,
  DECOYS_PER_LEVEL,
  DECOY_THROW_RANGE,
  LEVELS,
  LIVES,
  LOOT,
  SENTRY,
  THIEF,
} from './settings.js';

export const EV_PICKUP = 1;
export const EV_CAUGHT = 2;
export const EV_CLEAR = 4;
export const EV_OVER = 8;
export const EV_CHASE = 16;
export const EV_TOSS = 32;
export const EV_DIAMOND = 64;

function angleGap(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// Does the segment (x1,y1)-(x2,y2) cross the rectangle? Slab test.
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const slabs = [
    [-dx, x1 - rect.x],
    [dx, rect.x + rect.w - x1],
    [-dy, y1 - rect.y],
    [dy, rect.y + rect.h - y1],
  ];
  for (const [p, q] of slabs) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
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

function circleHitsRect(x, y, radius, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < radius * radius;
}

export function createHeist(random) {
  const state = {
    level: 0,
    score: 0,
    lives: LIVES,
    alarm: 0,
    spotted: false,
    decoys: DECOYS_PER_LEVEL,
    thief: { x: 0, y: 0, face: 0, invulnerable: 0 },
    sentries: [],
    cameras: [],
    coins: [],
    bags: [],
    diamondTaken: false,
    exitOpen: false,
    phase: 'play',
    levelTime: 0,
    toast: 0,
    flying: null,
    clearBonus: 0,
  };

  function loadLevel(index) {
    const room = LEVELS[index];
    state.level = index;
    state.alarm = 0;
    state.spotted = false;
    state.decoys = DECOYS_PER_LEVEL;
    state.thief.x = room.start.x;
    state.thief.y = room.start.y;
    state.thief.face = 0;
    state.thief.invulnerable = 0;
    state.sentries = room.sentries.map((s) => ({
      x: s.path[0][0],
      y: s.path[0][1],
      path: s.path,
      leg: 0,
      wait: 0,
      mode: 'patrol',
      chaseLeft: 0,
      lastSeen: { x: s.path[0][0], y: s.path[0][1] },
      blind: 0,
      probe: { x: 0, y: 0 },
      probeWait: 0,
      face: Math.atan2(s.path[1][1] - s.path[0][1], s.path[1][0] - s.path[0][0]),
    }));
    state.cameras = room.cameras.map((c) => ({ ...c, angle: c.base }));
    state.coins = room.coins.map((c) => ({ x: c.x, y: c.y, taken: false }));
    state.bags = room.bags.map((b) => ({ x: b.x, y: b.y, taken: false }));
    state.diamondTaken = false;
    state.exitOpen = false;
    state.phase = 'play';
    state.levelTime = 0;
    state.toast = 2;
    state.flying = null;
    state.clearBonus = 0;
  }

  function reset() {
    state.score = 0;
    state.lives = LIVES;
    loadLevel(0);
  }

  function room() {
    return LEVELS[state.level];
  }

  /** Is the point inside a solid block (with a margin for the thief's body)? */
  function blockedAt(x, y, radius) {
    if (x < radius || x > ARENA.width - radius || y < radius || y > ARENA.height - radius) return true;
    for (const block of room().blocks) {
      if (circleHitsRect(x, y, radius, block)) return true;
    }
    return false;
  }

  /** Is the line of sight between two points cut by a block? */
  function sightCut(x1, y1, x2, y2) {
    for (const block of room().blocks) {
      if (segmentHitsRect(x1, y1, x2, y2, block)) return true;
    }
    return false;
  }

  /** Is the point inside a sentry's or a camera's cone, with sight? */
  function watchedAt(x, y, sneak) {
    for (const s of state.sentries) {
      const range = sneak ? SENTRY.sneakRange : SENTRY.range;
      const dx = x - s.x;
      const dy = y - s.y;
      const d = Math.hypot(dx, dy);
      if (d > range) continue;
      if (angleGap(Math.atan2(dy, dx), s.face) > SENTRY.halfAngle) continue;
      if (sightCut(s.x, s.y, x, y)) continue;
      return { by: 'sentry', distance: d, range };
    }
    for (const c of state.cameras) {
      const dx = x - c.x;
      const dy = y - c.y;
      const d = Math.hypot(dx, dy);
      if (d > CAMERA.range) continue;
      if (angleGap(Math.atan2(dy, dx), c.angle) > CAMERA.halfAngle) continue;
      if (sightCut(c.x, c.y, x, y)) continue;
      return { by: 'camera', distance: d, range: CAMERA.range };
    }
    return null;
  }

  function moveThief(dt, steer, sneak) {
    const speed = sneak ? THIEF.sneak : THIEF.walk;
    const nx = state.thief.x + steer.x * speed * dt;
    const ny = state.thief.y + steer.y * speed * dt;
    if (!blockedAt(nx, state.thief.y, THIEF.radius)) state.thief.x = nx;
    if (!blockedAt(state.thief.x, ny, THIEF.radius)) state.thief.y = ny;
    if (steer.x !== 0 || steer.y !== 0) state.thief.face = Math.atan2(steer.y, steer.x);
    if (state.thief.invulnerable > 0) state.thief.invulnerable = Math.max(0, state.thief.invulnerable - dt);
  }

  /** Can this one sentry see the thief right now (cone, range, sight)? */
  function sentrySees(s, sneak) {
    const range = sneak ? SENTRY.sneakRange : SENTRY.range;
    const dx = state.thief.x - s.x;
    const dy = state.thief.y - s.y;
    const d = Math.hypot(dx, dy);
    if (d > range) return false;
    if (angleGap(Math.atan2(dy, dx), s.face) > SENTRY.halfAngle) return false;
    return !sightCut(s.x, s.y, state.thief.x, state.thief.y);
  }

  function moveSentry(s, dt, sneak) {
    if (s.mode === 'chase') {
      // Run at the thief while it is in sight; blind, run to where it was
      // last seen, and give up there to look around instead.
      if (sentrySees(s, sneak)) {
        s.lastSeen = { x: state.thief.x, y: state.thief.y };
        s.blind = 0;
      } else {
        s.blind += dt;
        if (s.blind > SENTRY.blindSeconds) {
          s.mode = 'investigate';
          s.probe = { x: s.lastSeen.x, y: s.lastSeen.y };
          s.probeWait = SENTRY.investigateSeconds;
          return;
        }
      }
      const dx = s.lastSeen.x - s.x;
      const dy = s.lastSeen.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        s.x += (dx / d) * SENTRY.chase * dt;
        s.y += (dy / d) * SENTRY.chase * dt;
        s.face = Math.atan2(dy, dx);
      }
      s.chaseLeft -= dt;
      if (s.chaseLeft <= 0) s.mode = 'return';
      return;
    }
    if (s.mode === 'investigate') {
      const dx = s.probe.x - s.x;
      const dy = s.probe.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        s.x += (dx / d) * SENTRY.patrol * 1.5 * dt;
        s.y += (dy / d) * SENTRY.patrol * 1.5 * dt;
        s.face = Math.atan2(dy, dx);
      } else {
        s.probeWait -= dt;
        if (s.probeWait <= 0) s.mode = 'return';
      }
      return;
    }
    if (s.mode === 'return') {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < s.path.length; i += 1) {
        const d = Math.hypot(s.path[i][0] - s.x, s.path[i][1] - s.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      s.leg = best;
      const tx = s.path[best][0];
      const ty = s.path[best][1];
      const dx = tx - s.x;
      const dy = ty - s.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        s.x += (dx / d) * SENTRY.patrol * dt;
        s.y += (dy / d) * SENTRY.patrol * dt;
        s.face = Math.atan2(dy, dx);
      } else {
        s.mode = 'patrol';
      }
      return;
    }
    // Patrol: walk the legs, pausing at each waypoint.
    if (s.wait > 0) {
      s.wait -= dt;
      return;
    }
    const target = s.path[(s.leg + 1) % s.path.length];
    const dx = target[0] - s.x;
    const dy = target[1] - s.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) {
      s.leg = (s.leg + 1) % s.path.length;
      s.wait = SENTRY.waypointPause;
      const next = s.path[(s.leg + 1) % s.path.length];
      s.face = Math.atan2(next[1] - s.y, next[0] - s.x);
    } else {
      s.x += (dx / d) * SENTRY.patrol * dt;
      s.y += (dy / d) * SENTRY.patrol * dt;
      s.face = Math.atan2(dy, dx);
    }
  }

  function sweepCameras(dt) {
    for (const c of state.cameras) {
      c.angle = c.base + c.sweep * Math.sin(state.levelTime * c.speed * 2);
    }
  }

  function grabLoot() {
    let events = 0;
    for (const coin of state.coins) {
      if (coin.taken) continue;
      if (Math.hypot(coin.x - state.thief.x, coin.y - state.thief.y) < 28) {
        coin.taken = true;
        state.score += LOOT.coin;
        events |= EV_PICKUP;
      }
    }
    for (const bag of state.bags) {
      if (bag.taken) continue;
      if (Math.hypot(bag.x - state.thief.x, bag.y - state.thief.y) < 30) {
        bag.taken = true;
        state.score += LOOT.bag;
        events |= EV_PICKUP;
      }
    }
    if (!state.diamondTaken) {
      const d = room().diamond;
      if (Math.hypot(d.x - state.thief.x, d.y - state.thief.y) < 30) {
        state.diamondTaken = true;
        state.exitOpen = true;
        state.score += LOOT.diamond;
        events |= EV_DIAMOND;
      }
    }
    return events;
  }

  function atExit() {
    const e = room().exit;
    return (
      state.thief.x > e.x - 6 &&
      state.thief.x < e.x + e.w + 6 &&
      state.thief.y > e.y - 6 &&
      state.thief.y < e.y + e.h + 6
    );
  }

  function startChase() {
    let nearest = null;
    let nearestD = Infinity;
    for (const s of state.sentries) {
      const d = Math.hypot(s.x - state.thief.x, s.y - state.thief.y);
      if (d < nearestD) {
        nearestD = d;
        nearest = s;
      }
    }
    if (nearest) {
      nearest.mode = 'chase';
      nearest.chaseLeft = SENTRY.chaseSeconds;
      nearest.lastSeen = { x: state.thief.x, y: state.thief.y };
      nearest.blind = 0;
    }
    state.spotted = true;
    return EV_CHASE;
  }

  function caught(events) {
    state.lives -= 1;
    events |= EV_CAUGHT;
    if (state.lives <= 0) {
      state.phase = 'over';
      events |= EV_OVER;
      return events;
    }
    // Wake up back at the entrance: the room resets its watchers, the alarm
    // drops, and the thief gets a short grace period.
    state.thief.x = room().start.x;
    state.thief.y = room().start.y;
    state.thief.invulnerable = THIEF.invulnerableAfterCaught;
    state.alarm = ALARM.caughtReset;
    for (const s of state.sentries) {
      s.x = s.path[0][0];
      s.y = s.path[0][1];
      s.leg = 0;
      s.wait = 0;
      s.mode = 'patrol';
    }
    return events;
  }

  /**
   * One fixed step. `steer` is a unit-ish {x, y} vector, `sneak` slows the
   * thief and shrinks the sentries' sight, `toss` is a field point to throw
   * a noise coin at (or null). With `calm` set (the title screen's backdrop)
   * the thief wanders but nothing scores, no alarm rises and nobody is caught.
   */
  function step(dt, steer, sneak, toss, calm) {
    if (state.phase !== 'play') return 0;
    let events = 0;
    state.levelTime += dt;
    if (state.toast > 0) state.toast = Math.max(0, state.toast - dt);

    // The thrown coin flies, then clinks down and draws the sentries over.
    if (state.flying) {
      state.flying.t -= dt;
      if (state.flying.t <= 0) {
        const at = state.flying;
        state.flying = null;
        for (const s of state.sentries) {
          if (s.mode !== 'chase' && Math.hypot(s.x - at.x, s.y - at.y) < SENTRY.investigateRadius) {
            s.mode = 'investigate';
            s.probe = { x: at.x, y: at.y };
            s.probeWait = SENTRY.investigateSeconds;
          }
        }
      }
    } else if (toss && state.decoys > 0 && !calm) {
      const dx = toss.x - state.thief.x;
      const dy = toss.y - state.thief.y;
      const d = Math.hypot(dx, dy);
      const reach = Math.min(d, DECOY_THROW_RANGE);
      const tx = d > 0 ? state.thief.x + (dx / d) * reach : state.thief.x;
      const ty = d > 0 ? state.thief.y + (dy / d) * reach : state.thief.y;
      state.decoys -= 1;
      state.flying = { x: tx, y: ty, t: 0.35 };
      events |= EV_TOSS;
    }

    moveThief(dt, steer, sneak);
    for (const s of state.sentries) moveSentry(s, dt, sneak);
    sweepCameras(dt);
    if (calm) return events;

    events |= grabLoot();

    // The alarm: seen in a cone, it climbs (faster up close); hidden, it falls.
    const seen = watchedAt(state.thief.x, state.thief.y, sneak);
    const chasing = state.sentries.some((s) => s.mode === 'chase');
    if (seen && state.thief.invulnerable === 0) {
      const rate = ALARM.riseFar + (ALARM.riseNear - ALARM.riseFar) * (1 - seen.distance / seen.range);
      state.alarm += rate * (seen.by === 'camera' ? ALARM.cameraBoost : 1) * dt;
      if (state.alarm >= 100) {
        state.alarm = 100;
        if (!chasing) events |= startChase();
      }
    } else {
      state.alarm = Math.max(0, state.alarm - (chasing ? ALARM.decayWhileChased : ALARM.decay) * dt);
    }

    if (chasing && state.thief.invulnerable === 0) {
      for (const s of state.sentries) {
        if (s.mode === 'chase' && Math.hypot(s.x - state.thief.x, s.y - state.thief.y) < SENTRY.catchDistance) {
          return caught(events);
        }
      }
    }

    if (state.exitOpen && atExit()) {
      state.clearBonus = LOOT.exit + (state.spotted ? 0 : LOOT.ghost);
      state.score += state.clearBonus;
      if (state.level >= LEVELS.length - 1) {
        state.phase = 'win';
      } else {
        state.phase = 'clear';
      }
      events |= EV_CLEAR;
    }
    return events;
  }

  /** Move on to the next room after a level-clear screen. */
  function nextLevel() {
    if (state.phase === 'clear') loadLevel(state.level + 1);
  }

  reset();
  return {
    state,
    reset,
    step,
    nextLevel,
    watchedAt,
    blockedAt,
    room,
  };
}
