// Midnight Vault: every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the HUD lives in the top wall band.
export const FIELD = { width: 1280, height: 720 };
export const WALL = 48; // border thickness (the room is WALL..FIELD.width-WALL)
export const STEP = 1 / 60;
export const LIVES = 3;
export const BEST_KEY = 'midnight-vault-best';
export const PLAYER = { radius: 12, walk: 178, sneak: 102 };
export const GUARD = { radius: 13, chase: 148, coneRange: 235, coneHalf: 0.62 };
export const CAMERA = { range: 275, half: 0.5 };
export const ALARM_RISE = 34; // alarm points per second, per spotter, at point blank
export const ALARM_FALL = 9; // alarm points per second while unseen
export const ALARM_TIME = 4; // seconds guards chase once the alarm hits 100
export const CAUGHT_DIST = 26;
export const LOOT_DIST = 26;
export const DIAMOND_DIST = 32;
export const SNEAK_SEEN = 0.45; // detection multiplier while sneaking

export const COLORS = {
  floorA: '#232a3d',
  floorB: '#1d2334',
  wall: '#0d1020',
  wallTrim: '#c9a227',
  caseGlass: '#3d5a73',
  caseEdge: '#8fb4d6',
  vault: '#4a3f1e',
  vaultTrim: '#ffd94a',
  exit: '#1d7a4a',
  exitText: '#b8ffce',
  guard: '#2e4a8f',
  guardCap: '#1c2f5e',
  coneCalm: 'rgba(255, 205, 70, 0.16)',
  coneSeen: 'rgba(255, 70, 70, 0.30)',
  cameraCone: 'rgba(110, 170, 255, 0.15)',
  thief: '#101014',
  thiefMask: '#f2f2f2',
  coin: '#ffd94a',
  bag: '#b07a3a',
  diamond: '#7fe7ff',
  text: '#f4f1e6',
  dim: '#9aa3b5',
  alarmLow: '#59d867',
  alarmMid: '#ffd94a',
  alarmHigh: '#ff5252',
};

// One level: display cases block movement and sight; guards walk waypoint loops;
// cameras sit on the walls and sweep; coins and bags are side loot, the diamond
// is the vault target, and the exit is the door in the bottom wall.
export const LEVELS = [
  {
    name: '1 · The Gallery',
    cases: [
      { x: 200, y: 180, w: 180, h: 90 },
      { x: 900, y: 180, w: 180, h: 90 },
      { x: 200, y: 420, w: 180, h: 90 },
      { x: 900, y: 420, w: 180, h: 90 },
      { x: 560, y: 300, w: 160, h: 90 },
    ],
    vault: { x: 590, y: 64, w: 100, h: 56 },
    diamond: [640, 138],
    exit: { x: 600, y: 656, w: 80, h: 16 },
    start: [640, 610],
    guards: [
      { waypoints: [[200, 140], [1080, 140]], speed: 70 },
      { waypoints: [[140, 140], [140, 540]], speed: 60 },
    ],
    cameras: [{ x: 64, y: 64, base: 0.785, sweep: 0.5, period: 5 }],
    coins: [[320, 140], [960, 140], [320, 560], [960, 560]],
    bags: [[640, 470]],
    noiseCoins: 3,
  },
  {
    name: '2 · The Vault Hall',
    cases: [
      { x: 180, y: 160, w: 160, h: 80 },
      { x: 940, y: 160, w: 160, h: 80 },
      { x: 180, y: 440, w: 160, h: 80 },
      { x: 940, y: 440, w: 160, h: 80 },
      { x: 480, y: 280, w: 320, h: 80 },
      { x: 600, y: 520, w: 80, h: 60 },
    ],
    vault: { x: 590, y: 64, w: 100, h: 56 },
    diamond: [640, 138],
    exit: { x: 600, y: 656, w: 80, h: 16 },
    start: [640, 610],
    guards: [
      { waypoints: [[300, 260], [980, 260]], speed: 80 },
      { waypoints: [[1120, 140], [1120, 540]], speed: 70 },
      { waypoints: [[300, 600], [980, 600]], speed: 75 },
    ],
    cameras: [
      { x: 64, y: 64, base: 0.785, sweep: 0.5, period: 4.5 },
      { x: 1216, y: 64, base: 2.356, sweep: 0.5, period: 5.5 },
    ],
    coins: [[280, 120], [1000, 120], [640, 220], [280, 580], [1000, 580], [640, 420]],
    bags: [[360, 380], [920, 380]],
    noiseCoins: 3,
  },
  {
    name: '3 · The Diamond Room',
    cases: [
      { x: 160, y: 150, w: 140, h: 80 },
      { x: 980, y: 150, w: 140, h: 80 },
      { x: 160, y: 470, w: 140, h: 80 },
      { x: 980, y: 470, w: 140, h: 80 },
      { x: 420, y: 250, w: 120, h: 220 },
      { x: 740, y: 250, w: 120, h: 220 },
      { x: 580, y: 560, w: 120, h: 60 },
    ],
    vault: { x: 590, y: 64, w: 100, h: 56 },
    diamond: [640, 138],
    exit: { x: 600, y: 656, w: 80, h: 16 },
    start: [640, 610],
    guards: [
      { waypoints: [[300, 200], [980, 200]], speed: 90 },
      { waypoints: [[240, 600], [560, 600]], speed: 85 },
      { waypoints: [[340, 140], [340, 540]], speed: 78 },
      { waypoints: [[1150, 140], [1150, 540]], speed: 78 },
    ],
    cameras: [
      { x: 64, y: 64, base: 0.785, sweep: 0.55, period: 4 },
      { x: 1216, y: 64, base: 2.356, sweep: 0.55, period: 5 },
      { x: 640, y: 64, base: 1.571, sweep: 0.6, period: 6 },
    ],
    coins: [[260, 120], [1020, 120], [640, 200], [260, 610], [1020, 610], [480, 480], [800, 480], [640, 330]],
    bags: [[360, 330], [920, 330]],
    noiseCoins: 4,
  },
];
