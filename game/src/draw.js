// Drawing only: the heist's state and the current screen in, pixels out. The
// 1280x720 arena is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Flat shapes and canvas text for the HUD and the
// panels; safe cover, danger and loot each read at a glance.

import { ARENA, FONT, LEVELS, LIVES, LOOT, PALETTE, SENTRY } from './settings.js';

export const VIEW_TITLE = 'title';
export const VIEW_PLAY = 'play';
export const VIEW_PAUSED = 'paused';
export const VIEW_CLEAR = 'clear';
export const VIEW_OVER = 'over';
export const VIEW_WIN = 'win';

const PANEL = { width: 640, top: 128, line: 32, bottom: 76 };
const TILE = 80;

function conePath(ctx, x, y, facing, halfAngle, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
}

export function makePainter(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / ARENA.width, height / ARENA.height);
    view.x = (width - ARENA.width * view.scale) / 2;
    view.y = (height - ARENA.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    ctx.font = fonts.get(size);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = baseline || 'alphabetic';
    ctx.fillText(value, x, y);
  }

  /** Client (page) coordinates into arena coordinates. */
  function clientToArena(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x / (window.devicePixelRatio || 1)) / (view.scale / (window.devicePixelRatio || 1)),
      y: (clientY - rect.top - view.y / (window.devicePixelRatio || 1)) / (view.scale / (window.devicePixelRatio || 1)),
    };
  }

  function paintFloor() {
    ctx.fillStyle = PALETTE.floorA;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    ctx.fillStyle = PALETTE.floorB;
    for (let row = 0; row < ARENA.height / TILE; row += 1) {
      for (let col = 0; col < ARENA.width / TILE; col += 1) {
        if ((row + col) % 2 === 0) ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      }
    }
    ctx.strokeStyle = PALETTE.floorLine;
    ctx.lineWidth = 1;
    for (let x = 0; x <= ARENA.width; x += TILE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ARENA.height);
      ctx.stroke();
    }
    for (let y = 0; y <= ARENA.height; y += TILE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ARENA.width, y);
      ctx.stroke();
    }
    // The arena's wall border.
    ctx.strokeStyle = PALETTE.wallTop;
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, ARENA.width - 4, ARENA.height - 4);
  }

  function paintBlocks(blocks) {
    for (const b of blocks) {
      if (b.kind === 'vault') {
        ctx.fillStyle = PALETTE.vault;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = PALETTE.vaultRing;
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      } else {
        ctx.fillStyle = PALETTE.caseGlass;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(b.x, b.y, b.w, 5);
        ctx.strokeStyle = PALETTE.caseGlint;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x + 8, b.y + b.h - 8);
        ctx.lineTo(b.x + b.w - 8, b.y + 8);
        ctx.stroke();
      }
    }
  }

  function paintExit(exit, open, time) {
    ctx.fillStyle = open ? PALETTE.exit : '#3a3f4d';
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    if (open) {
      ctx.fillStyle = PALETTE.exitGlow;
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 4);
      ctx.fillRect(exit.x - 4, exit.y - 4, exit.w + 8, exit.h + 8);
      ctx.globalAlpha = 1;
    }
    text('EXIT', exit.x + exit.w / 2, exit.y + exit.h / 2 + 7, 18, open ? '#06130a' : PALETTE.muted, 'center');
  }

  function paintLoot(state, room) {
    for (const coin of state.coins) {
      if (coin.taken) continue;
      ctx.fillStyle = PALETTE.coin;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5c10';
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const bag of state.bags) {
      if (bag.taken) continue;
      ctx.fillStyle = PALETTE.bag;
      ctx.beginPath();
      ctx.arc(bag.x, bag.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5d3f16';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bag.x, bag.y, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (!state.diamondTaken) {
      const d = room.diamond;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.diamond;
      ctx.fillRect(-13, -13, 26, 26);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-13, -13, 26, 26);
      ctx.restore();
      ctx.fillStyle = PALETTE.diamond;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function paintSentry(s) {
    const chasing = s.mode === 'chase';
    const coneColor = chasing ? PALETTE.chaseCone : PALETTE.sentryCone;
    ctx.fillStyle = coneColor;
    ctx.globalAlpha = chasing ? 0.3 : 0.17;
    conePath(ctx, s.x, s.y, s.face, SENTRY.halfAngle, SENTRY.range);
    ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = coneColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Body: a dark figure with a pale visor stripe facing where it looks.
    ctx.fillStyle = PALETTE.sentry;
    ctx.beginPath();
    ctx.arc(s.x, s.y, SENTRY.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = coneColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, SENTRY.radius, s.face - 0.7, s.face + 0.7);
    ctx.stroke();
    if (chasing) {
      text('!', s.x, s.y - SENTRY.radius - 6, 22, PALETTE.chaseCone, 'center');
    } else if (s.mode === 'investigate') {
      text('?', s.x, s.y - SENTRY.radius - 6, 22, PALETTE.sentryCone, 'center');
    }
  }

  function paintCamera(c) {
    ctx.fillStyle = PALETTE.cameraCone;
    ctx.globalAlpha = 0.16;
    conePath(ctx, c.x, c.y, c.angle, 0.49, 305);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = PALETTE.cameraCone;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.camera;
    ctx.fillRect(c.x - 9, c.y - 7, 18, 14);
    ctx.fillStyle = PALETTE.cameraCone;
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(c.angle) * 10, c.y + Math.sin(c.angle) * 10, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintThief(thief, sneaking, time) {
    // Never fully invisible: at worst the thief fades to 45% while invulnerable.
    ctx.globalAlpha = thief.invulnerable > 0 ? 0.45 + 0.3 * Math.abs(Math.sin(time * 8)) : 1;
    const radius = sneaking ? THIEF_RADIUS_SNEAK : THIEF_RADIUS;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(thief.x, thief.y + radius * 0.75, radius, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a5165';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    // The pale mask band, turned where the thief faces.
    ctx.strokeStyle = PALETTE.thiefBand;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, radius - 3, thief.face - 0.6, thief.face + 0.6);
    ctx.stroke();
    if (sneaking) {
      ctx.strokeStyle = 'rgba(238,241,245,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(thief.x, thief.y, radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  const THIEF_RADIUS = 13;
  const THIEF_RADIUS_SNEAK = 11;

  function paintFlying(flying) {
    if (!flying) return;
    ctx.fillStyle = PALETTE.coin;
    ctx.beginPath();
    ctx.arc(flying.x, flying.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintHud(state) {
    ctx.fillStyle = 'rgba(13,15,20,0.85)';
    ctx.fillRect(0, 0, ARENA.width, 52);
    text(`SCORE ${state.score}`, 22, 34, 24, PALETTE.text, 'left');
    text(`LEVEL ${state.level + 1} — ${LEVELS[state.level].name}`, ARENA.width / 2, 34, 22, PALETTE.text, 'center');
    // Lives as little masks.
    for (let i = 0; i < LIVES; i += 1) {
      const x = ARENA.width - 24 - i * 30;
      ctx.fillStyle = i < state.lives ? PALETTE.thiefBand : '#3a3f4d';
      ctx.beginPath();
      ctx.arc(x, 26, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    // Alarm meter.
    const barX = ARENA.width - 300;
    const barW = 170;
    text('ALARM', barX - 10, 34, 18, state.alarm > 60 ? PALETTE.danger : PALETTE.muted, 'right');
    ctx.fillStyle = '#2a2f3d';
    ctx.fillRect(barX, 18, barW, 16);
    ctx.fillStyle = state.alarm > 60 ? PALETTE.danger : PALETTE.sentryCone;
    ctx.fillRect(barX, 18, barW * Math.min(1, state.alarm / 100), 16);
    ctx.strokeStyle = PALETTE.muted;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, 18, barW, 16);
    // Decoys left, diamond status, ghost tag.
    text(`◉×${state.decoys}`, 22, 76, 18, PALETTE.coin, 'left');
    text(state.diamondTaken ? '◆ DIAMOND' : '◇ DIAMOND', 110, 76, 18, state.diamondTaken ? PALETTE.diamond : PALETTE.muted, 'left');
    if (!state.spotted) text('GHOST', 250, 76, 18, PALETTE.safe, 'left');
    if (state.toast > 0) {
      ctx.globalAlpha = Math.min(1, state.toast);
      text(`LEVEL ${state.level + 1} — ${LEVELS[state.level].name.toUpperCase()}`, ARENA.width / 2, 120, 30, PALETTE.text, 'center');
      text(state.diamondTaken ? 'Diamond taken — reach the EXIT' : 'Take the diamond, then reach the EXIT', ARENA.width / 2, 152, 18, PALETTE.muted, 'center');
      ctx.globalAlpha = 1;
    }
  }

  function paintPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (ARENA.width - PANEL.width) / 2;
    const y = (ARENA.height - height) / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, y, PANEL.width, height);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, PANEL.width, height);
    text(title, ARENA.width / 2, y + 76, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], ARENA.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, ARENA.width / 2, y + height - 38, 22, PALETTE.coin, 'center');
  }

  /** Paint one frame: the room, then the HUD or a panel for the screen the game is on. */
  function paint(state, screen, best, sneaking) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const room = LEVELS[state.level];
    paintFloor();
    paintExit(room.exit, state.exitOpen, state.levelTime);
    paintBlocks(room.blocks);
    paintLoot(state, room);
    for (const c of state.cameras) paintCamera(c);
    for (const s of state.sentries) paintSentry(s);
    paintFlying(state.flying);
    paintThief(state.thief, sneaking, state.levelTime);
    if (screen === VIEW_TITLE) {
      paintPanel(
        'MIDNIGHT VAULT',
        [
          'Slip past the guards, dodge the sweeping cameras,',
          'crack the vault, take the diamond and walk out.',
          'WASD / arrows move · Shift sneak · Click throws a noise coin',
          `Best ${best}`,
          '',
        ],
        'Press Space or click to start',
      );
      return;
    }
    paintHud(state);
    if (screen === VIEW_PAUSED) {
      paintPanel('PAUSED', ['The guards will wait for you.'], 'Press P to resume');
    } else if (screen === VIEW_CLEAR) {
      paintPanel('LEVEL CLEAR', [
        `Exit +${LOOT.exit}${state.spotted ? '' : ` · Ghost bonus +${LOOT.ghost}`}`,
        `Score ${state.score}`,
      ], 'Press Space for the next room');
    } else if (screen === VIEW_OVER) {
      paintPanel('CAUGHT!', [`Score ${state.score}`, `Best ${best}`], 'Press Space or click to try again');
    } else if (screen === VIEW_WIN) {
      paintPanel('CLEAN GETAWAY!', [`Score ${state.score}`, `Best ${best}`, 'Three rooms, no more alarms.'], 'Press Space to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { paint, clientToArena };
}
