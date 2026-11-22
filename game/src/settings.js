// Every tuning number, colour and room layout for Midnight Vault in one place.
// The playfield is a fixed 1280x720 logical area; the painter scales it to the
// window, so no rule below depends on the screen size.

export const ARENA = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  walk: 205,
  sneak: 112,
  invulnerableAfterCaught: 2,
};

export const SENTRY = {
  radius: 13,
  patrol: 76,
  chase: 340,
  range: 262,
  sneakRange: 198,
  halfAngle: 0.56,
  chaseSeconds: 6,
  blindSeconds: 2.5,
  catchDistance: 25,
  waypointPause: 0.8,
  investigateSeconds: 1.3,
  investigateRadius: 265,
};

export const CAMERA = {
  range: 305,
  halfAngle: 0.49,
};

export const ALARM = {
  riseNear: 85,
  riseFar: 30,
  cameraBoost: 1.25,
  decay: 18,
  decayWhileChased: 8,
  caughtReset: 25,
};

export const LIVES = 3;
export const DECOYS_PER_LEVEL = 3;
export const DECOY_THROW_RANGE = 330;

export const LOOT = { coin: 100, bag: 250, diamond: 1000, exit: 500, ghost: 300 };

export const PALETTE = {
  backdrop: '#0d0f14',
  floorA: '#171a21',
  floorB: '#1b1f28',
  floorLine: '#222633',
  wall: '#2b3040',
  wallTop: '#c9a227',
  caseGlass: '#3a4358',
  caseGlint: '#8fa3c8',
  vault: '#232838',
  vaultRing: '#c9a227',
  exit: '#2fae5f',
  exitGlow: '#7be3a2',
  thief: '#232733',
  thiefBand: '#e8e4d8',
  sentry: '#3d2b2b',
  sentryCone: '#f2c94c',
  chaseCone: '#ff6b4a',
  camera: '#274b63',
  cameraCone: '#4fc3f7',
  coin: '#f2c94c',
  bag: '#b98a3e',
  diamond: '#bfe9ff',
  panel: '#1d212c',
  panelEdge: '#c9a227',
  text: '#eef1f5',
  muted: '#9aa3b5',
  danger: '#ff6b4a',
  safe: '#7be3a2',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-vault.best';

// A room: blocks are solid rectangles (display cases, desks, pillars, vault
// walls) that stop movement and block sight. Sentries walk straight legs
// between their waypoints, so every leg runs through open floor. Cameras sit
// on a wall and sweep their cone around `base` by `sweep` radians.
export const LEVELS = [
  {
    name: 'The Gallery',
    start: { x: 92, y: 628 },
    exit: { x: 1190, y: 622, w: 70, h: 58 },
    diamond: { x: 1135, y: 122 },
    blocks: [
      { x: 300, y: 180, w: 200, h: 60, kind: 'case' },
      { x: 300, y: 460, w: 200, h: 60, kind: 'case' },
      { x: 700, y: 300, w: 60, h: 200, kind: 'case' },
      { x: 900, y: 150, w: 70, h: 70, kind: 'pillar' },
      { x: 1030, y: 30, w: 210, h: 36, kind: 'vault' },
      { x: 1030, y: 30, w: 36, h: 150, kind: 'vault' },
      { x: 1204, y: 30, w: 36, h: 150, kind: 'vault' },
    ],
    coins: [
      { x: 200, y: 360 },
      { x: 560, y: 140 },
      { x: 820, y: 520 },
      { x: 980, y: 380 },
      { x: 420, y: 620 },
    ],
    bags: [
      { x: 180, y: 122 },
      { x: 1060, y: 560 },
    ],
    sentries: [
      { path: [[350, 120], [950, 120]] },
      { path: [[640, 120], [640, 600]] },
    ],
    cameras: [{ x: 640, y: 42, base: Math.PI / 2, sweep: 0.96, speed: 0.5 }],
  },
  {
    name: 'The Vault Hall',
    start: { x: 92, y: 92 },
    exit: { x: 20, y: 622, w: 70, h: 58 },
    diamond: { x: 1135, y: 580 },
    blocks: [
      { x: 280, y: 200, w: 320, h: 56, kind: 'desk' },
      { x: 680, y: 420, w: 320, h: 56, kind: 'desk' },
      { x: 480, y: 520, w: 56, h: 140, kind: 'case' },
      { x: 880, y: 140, w: 70, h: 70, kind: 'pillar' },
      { x: 240, y: 480, w: 70, h: 70, kind: 'pillar' },
      { x: 1030, y: 460, w: 36, h: 230, kind: 'vault' },
      { x: 1030, y: 654, w: 210, h: 36, kind: 'vault' },
      { x: 1204, y: 460, w: 36, h: 230, kind: 'vault' },
    ],
    coins: [
      { x: 200, y: 180 },
      { x: 560, y: 330 },
      { x: 880, y: 300 },
      { x: 980, y: 620 },
      { x: 420, y: 100 },
      { x: 700, y: 580 },
    ],
    bags: [
      { x: 1200, y: 122 },
      { x: 360, y: 640 },
    ],
    sentries: [
      { path: [[300, 330], [980, 330]] },
      { path: [[1150, 140], [1150, 400]] },
      { path: [[180, 300], [180, 640]] },
    ],
    cameras: [
      { x: 640, y: 42, base: Math.PI / 2, sweep: 0.96, speed: 0.5 },
      { x: 1238, y: 360, base: Math.PI, sweep: 0.96, speed: 0.62 },
    ],
  },
  {
    name: 'The Diamond Room',
    start: { x: 640, y: 640 },
    exit: { x: 605, y: 20, w: 70, h: 58 },
    diamond: { x: 640, y: 300 },
    blocks: [
      { x: 540, y: 210, w: 200, h: 36, kind: 'vault' },
      { x: 540, y: 354, w: 60, h: 36, kind: 'vault' },
      { x: 680, y: 354, w: 60, h: 36, kind: 'vault' },
      { x: 504, y: 246, w: 36, h: 108, kind: 'vault' },
      { x: 740, y: 246, w: 36, h: 108, kind: 'vault' },
      { x: 150, y: 180, w: 220, h: 56, kind: 'desk' },
      { x: 910, y: 180, w: 220, h: 56, kind: 'desk' },
      { x: 150, y: 500, w: 220, h: 56, kind: 'desk' },
      { x: 910, y: 500, w: 220, h: 56, kind: 'desk' },
    ],
    coins: [
      { x: 300, y: 122 },
      { x: 980, y: 122 },
      { x: 640, y: 520 },
      { x: 180, y: 360 },
      { x: 1100, y: 360 },
      { x: 430, y: 640 },
    ],
    bags: [
      { x: 122, y: 640 },
      { x: 1158, y: 640 },
    ],
    sentries: [
      { path: [[320, 460], [960, 460]] },
      { path: [[430, 100], [430, 620]] },
      { path: [[850, 100], [850, 620]] },
    ],
    cameras: [
      { x: 640, y: 42, base: Math.PI / 2, sweep: 0.96, speed: 0.5 },
      { x: 42, y: 360, base: 0, sweep: 0.96, speed: 0.62 },
      { x: 1238, y: 360, base: Math.PI, sweep: 0.96, speed: 0.55 },
    ],
  },
];
