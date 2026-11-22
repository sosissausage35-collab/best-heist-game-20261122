// Midnight Vault: every pixel on the canvas. A dark museum hall at night, the
// thief in black, guards with yellow vision cones, sweeping camera cones, the
// gold vault and its diamond, and the alarm meter across the top bar. Screens
// (title, paused, level clear, game over, victory) are overlays on the room.
import { BORDER, PALETTE, ROOM, SENTRY, THIEF } from './config.js';

export const Screens = {
  title: 'title',
  play: 'play',
  paused: 'paused',
  clear: 'clear',
  over: 'over',
  victory: 'victory',
};

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function cone(ctx, x, y, dir, half, range, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - half, dir + half);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 11, 22, 0.92)';
  ctx.strokeStyle = PALETTE.trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
}

function centerText(ctx, text, x, y, size, color, bold = true) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

export function makeRenderer(canvas) {
  canvas.width = ROOM.width;
  canvas.height = ROOM.height;
  const ctx = canvas.getContext('2d');

  function drawRoom(state) {
    // Floor: two-tone checker.
    const tile = 64;
    for (let y = 0; y < ROOM.height / tile; y++) {
      for (let x = 0; x < ROOM.width / tile; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x * tile, y * tile, tile, tile);
      }
    }
    // Walls and gold trim.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, ROOM.width, BORDER);
    ctx.fillRect(0, ROOM.height - BORDER, ROOM.width, BORDER);
    ctx.fillRect(0, 0, BORDER, ROOM.height);
    ctx.fillRect(ROOM.width - BORDER, 0, BORDER, ROOM.height);
    ctx.strokeStyle = PALETTE.trim;
    ctx.lineWidth = 2;
    ctx.strokeRect(BORDER + 1, BORDER + 1, ROOM.width - 2 * BORDER - 2, ROOM.height - 2 * BORDER - 2);

    // Display cases: glass slabs with a golden exhibit inside.
    for (const c of state.level.cases) {
      ctx.fillStyle = PALETTE.glass;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(c.x, c.y, c.w, 10);
      ctx.strokeStyle = PALETTE.glassEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      ctx.fillStyle = PALETTE.coin;
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // The vault: a heavy door on the top wall, gold-framed.
    const v = state.level.vault;
    ctx.fillStyle = PALETTE.vault;
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.strokeStyle = PALETTE.vaultGold;
    ctx.lineWidth = 3;
    ctx.strokeRect(v.x + 1, v.y + 1, v.w - 2, v.h - 2);
    ctx.beginPath();
    ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.vaultGold;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VAULT', v.x + v.w / 2, v.y + v.h / 2);

    // The exit: a green door in the bottom wall.
    const e = state.level.exit;
    ctx.fillStyle = PALETTE.exit;
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.exitText;
    ctx.fillText('EXIT', e.x + e.w / 2, e.y + e.h / 2);
    ctx.fillStyle = 'rgba(29, 122, 74, 0.25)';
    ctx.fillRect(e.x - 10, e.y - 26, e.w + 20, 26);

    // Loot: coins spin, bags sit heavy, the diamond pulses.
    const pulse = 1 + 0.12 * Math.sin(state.time * 4);
    for (const coin of state.coins) {
      if (coin.taken) continue;
      ctx.fillStyle = PALETTE.coin;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 9 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6d1f';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (const bag of state.bags) {
      if (bag.taken) continue;
      ctx.fillStyle = PALETTE.bag;
      ctx.beginPath();
      ctx.roundRect(bag.x - 11, bag.y - 9, 22, 18, 5);
      ctx.fill();
      ctx.strokeStyle = '#5e3d16';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = PALETTE.coin;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText('$', bag.x, bag.y + 1);
    }
    if (!state.diamond.taken) {
      const d = state.diamond;
      const r = 13 * pulse;
      ctx.fillStyle = PALETTE.gem;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y - r);
      ctx.lineTo(d.x + r * 0.8, d.y);
      ctx.lineTo(d.x, d.y + r);
      ctx.lineTo(d.x - r * 0.8, d.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(d.x - r * 0.8, d.y);
      ctx.lineTo(d.x + r * 0.8, d.y);
      ctx.stroke();
    }

    // Thrown noise coins: gold rings that fade.
    for (const n of state.noises) {
      ctx.strokeStyle = `rgba(255, 217, 74, ${Math.min(1, n.t)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 10 + (3 - n.t) * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.coin;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCones(state) {
    for (const g of state.guards) {
      cone(ctx, g.x, g.y, g.dir, SENTRY.viewHalf, SENTRY.viewRange, g.seeing ? PALETTE.coneHot : PALETTE.coneCalm);
    }
    for (const c of state.cameras) {
      cone(ctx, c.x, c.y, c.angle, 0.5, 275, PALETTE.camCone);
    }
  }

  function drawActors(state) {
    // Cameras: little wall boxes with a lens.
    for (const c of state.cameras) {
      ctx.fillStyle = '#20242e';
      ctx.beginPath();
      ctx.roundRect(c.x - 9, c.y - 6, 18, 12, 3);
      ctx.fill();
      ctx.fillStyle = c.seeing ? '#ff5252' : '#7fe7ff';
      ctx.beginPath();
      ctx.arc(c.x + Math.cos(c.angle) * 8, c.y + Math.sin(c.angle) * 8, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Guards: navy uniforms, caps, and a facing tick. A "!" over a guard means
    // it is hunting you; a "?" means it heard a noise coin and is looking.
    for (const g of state.guards) {
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(g.x, g.y, SENTRY.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.guardCap;
      ctx.beginPath();
      ctx.arc(g.x, g.y - 3, 7, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#dfe6f2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(g.dir) * 17, g.y + Math.sin(g.dir) * 17);
      ctx.stroke();
      if (g.mode === 'chase') {
        ctx.strokeStyle = '#ff5252';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(g.x, g.y, SENTRY.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillStyle = '#ff5252';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', g.x, g.y - 24);
      } else if (g.mode === 'investigate') {
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillStyle = '#ffd94a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', g.x, g.y - 24);
      }
    }
    // The thief: black cloak, white mask band. While invulnerable after a
    // catch it blinks — but it only fades, it never vanishes, so the thief
    // stays visible in every frame, screenshots included.
    const p = state.player;
    const blinkOff = p.invuln > 0 && Math.floor(state.time * 8) % 2 === 1;
    ctx.globalAlpha = blinkOff ? 0.45 : 1;
    {
      const r = p.sneaking ? THIEF.radius - 2 : THIEF.radius;
      ctx.fillStyle = PALETTE.thief;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a3a44';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = PALETTE.mask;
      ctx.fillRect(p.x - 7, p.y - 3, 14, 5);
      ctx.fillStyle = PALETTE.thief;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.dir) * r, p.y + Math.sin(p.dir) * r);
      ctx.lineTo(p.x + Math.cos(p.dir + 2.6) * (r - 3), p.y + Math.sin(p.dir + 2.6) * (r - 3));
      ctx.lineTo(p.x + Math.cos(p.dir - 2.6) * (r - 3), p.y + Math.sin(p.dir - 2.6) * (r - 3));
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state) {
    // Top bar: title left, alarm meter centre, score right.
    ctx.fillStyle = 'rgba(5, 8, 18, 0.72)';
    ctx.fillRect(0, 0, ROOM.width, BORDER);
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`MIDNIGHT VAULT · ${state.level.name}`, 16, 25);
    // Alarm meter.
    const barX = 540;
    const barW = 260;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = state.alarm > 70 ? PALETTE.bad : PALETTE.dim;
    ctx.fillText('ALARM', barX - 58, 25);
    ctx.fillStyle = '#0a0d18';
    ctx.strokeStyle = '#4a5266';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(barX, 15, barW, 18, 4);
    ctx.fill();
    ctx.stroke();
    const fill = Math.max(0, Math.min(1, state.alarm / 100));
    ctx.fillStyle = state.alarm > 70 ? PALETTE.bad : state.alarm > 35 ? PALETTE.warn : PALETTE.ok;
    if (fill > 0) {
      ctx.beginPath();
      ctx.roundRect(barX + 2, 17, (barW - 4) * fill, 14, 3);
      ctx.fill();
    }
    // Score, loot, lives, time, noise coins — and GHOST while nobody has seen you.
    const hearts = '♥'.repeat(Math.max(0, state.lives)) + '♡'.repeat(Math.max(0, 3 - state.lives));
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'right';
    ctx.fillText(
      `SCORE ${state.score}   ◆ ${state.lootGot}/${state.lootTotal}   ${hearts}   ${fmtTime(state.levelTime)}   ●×${state.noiseLeft}${state.ghost ? '   GHOST' : ''}`,
      ROOM.width - 16,
      25,
    );
    // Bottom hint.
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.textAlign = 'center';
    ctx.fillText('WASD / ARROWS move · SHIFT sneak · CLICK throws a noise coin · P pause · M mute', ROOM.width / 2, ROOM.height - 24);
    // Hot alarm: a red flash over the room.
    if (state.alarm > 65) {
      ctx.fillStyle = `rgba(255, 40, 40, ${((state.alarm - 65) / 35) * 0.16})`;
      ctx.fillRect(0, BORDER, ROOM.width, ROOM.height - 2 * BORDER);
    }
    // Level intro: the room's name for the first two seconds.
    if (state.phase === 'playing' && state.levelTime < 2) {
      ctx.globalAlpha = state.levelTime < 1.5 ? 1 : 1 - (state.levelTime - 1.5) / 0.5;
      centerText(ctx, state.level.name, ROOM.width / 2, 120, 30, PALETTE.vaultGold);
      ctx.globalAlpha = 1;
    }
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(5, 8, 18, 0.86)';
    ctx.fillRect(0, 0, ROOM.width, ROOM.height);
    centerText(ctx, 'MIDNIGHT VAULT', ROOM.width / 2, 190, 64, PALETTE.vaultGold);
    centerText(ctx, 'A top-down stealth heist', ROOM.width / 2, 248, 22, PALETTE.text, false);
    centerText(ctx, 'Slip past the guards and their cameras, crack the vault,', ROOM.width / 2, 312, 17, PALETTE.dim, false);
    centerText(ctx, 'grab the diamond, and walk out the exit — without raising the alarm.', ROOM.width / 2, 338, 17, PALETTE.dim, false);
    centerText(ctx, 'WASD / ARROWS — move      SHIFT — sneak      CLICK — throw a noise coin', ROOM.width / 2, 402, 16, PALETTE.text, false);
    centerText(ctx, 'Coins +100 · Bags +250 · Diamond +1000 · Clear the level +500 · Stay unseen +300', ROOM.width / 2, 434, 15, PALETTE.dim, false);
    centerText(ctx, `3 levels · 3 lives · Best score ${best}`, ROOM.width / 2, 474, 16, PALETTE.text, false);
    if (Math.floor(state.time * 1.6) % 2 === 0) {
      centerText(ctx, 'PRESS SPACE OR CLICK TO START', ROOM.width / 2, 548, 22, PALETTE.vaultGold);
    }
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(5, 8, 18, 0.7)';
    ctx.fillRect(0, 0, ROOM.width, ROOM.height);
    centerText(ctx, 'PAUSED', ROOM.width / 2, 330, 48, PALETTE.text);
    centerText(ctx, 'Press P to resume', ROOM.width / 2, 392, 18, PALETTE.dim, false);
  }

  function drawClear(state) {
    ctx.fillStyle = 'rgba(5, 8, 18, 0.72)';
    ctx.fillRect(0, 0, ROOM.width, ROOM.height);
    panel(ctx, 390, 220, 500, 280);
    centerText(ctx, 'LEVEL CLEAR!', ROOM.width / 2, 268, 40, PALETTE.vaultGold);
    const c = state.lastClear;
    centerText(ctx, c ? `${c.level} — loot ${c.loot} pieces` : '', ROOM.width / 2, 322, 17, PALETTE.text, false);
    centerText(ctx, `Clear bonus +500${c && c.ghost ? '   ·   Ghost bonus +300 (never seen)' : ''}`, ROOM.width / 2, 356, 16, PALETTE.dim, false);
    centerText(ctx, `SCORE ${state.score}`, ROOM.width / 2, 402, 24, PALETTE.text);
    centerText(ctx, 'PRESS SPACE — NEXT LEVEL', ROOM.width / 2, 458, 18, PALETTE.vaultGold);
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(20, 5, 8, 0.8)';
    ctx.fillRect(0, 0, ROOM.width, ROOM.height);
    centerText(ctx, 'CAUGHT!', ROOM.width / 2, 280, 56, PALETTE.bad);
    centerText(ctx, 'The guards got you. The vault keeps its diamond — this time.', ROOM.width / 2, 344, 18, PALETTE.dim, false);
    centerText(ctx, `SCORE ${state.score}   ·   BEST ${best}`, ROOM.width / 2, 398, 22, PALETTE.text);
    centerText(ctx, 'PRESS SPACE — TRY AGAIN', ROOM.width / 2, 462, 18, PALETTE.vaultGold);
  }

  function drawVictory(state, best) {
    ctx.fillStyle = 'rgba(5, 12, 8, 0.82)';
    ctx.fillRect(0, 0, ROOM.width, ROOM.height);
    centerText(ctx, 'THE PERFECT HEIST!', ROOM.width / 2, 272, 52, PALETTE.vaultGold);
    centerText(ctx, 'Three rooms, three vaults, one diamond each — and nobody saw a thing.', ROOM.width / 2, 336, 18, PALETTE.dim, false);
    centerText(ctx, `FINAL SCORE ${state.score}   ·   BEST ${best}`, ROOM.width / 2, 392, 24, PALETTE.text);
    centerText(ctx, 'PRESS SPACE — PLAY AGAIN', ROOM.width / 2, 456, 18, PALETTE.vaultGold);
  }

  function draw(state, screen, best) {
    ctx.clearRect(0, 0, ROOM.width, ROOM.height);
    drawRoom(state);
    drawCones(state);
    drawActors(state);
    drawHud(state);
    if (screen === Screens.title) drawTitle(state, best);
    else if (screen === Screens.paused) drawPaused();
    else if (screen === Screens.clear) drawClear(state);
    else if (screen === Screens.over) drawOver(state, best);
    else if (screen === Screens.victory) drawVictory(state, best);
  }

  return { draw };
}
