// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between six screens: title,
// play, paused, level clear, game over and victory.
//
// ?seed=N fixes the world. ?shot=start|play|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_ALARM,
  EVENT_CAUGHT,
  EVENT_CLEAR,
  EVENT_DIAMOND,
  EVENT_LOOT,
  EVENT_OVER,
  EVENT_VICTORY,
  createWorld,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  SCREEN_CLEAR,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_VICTORY,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each catch.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset(0, false);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives.`);
  }

  function handleEvents(events) {
    if (events & EVENT_LOOT) audio.pickup();
    if (events & EVENT_DIAMOND) audio.diamond();
    if (events & EVENT_ALARM) announce('Alarm! The guards are hunting you.');
    if (events & EVENT_CAUGHT) {
      audio.caught();
      announce(world.state.lives === 1 ? 'Caught. 1 life left.' : `Caught. ${world.state.lives} lives left.`);
    }
    if (events & EVENT_CLEAR) {
      audio.clear();
      screen = SCREEN_CLEAR;
      announce(`Level clear. Score ${world.state.score}.`);
    }
    if (events & EVENT_OVER) {
      screen = SCREEN_OVER;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    }
    if (events & EVENT_VICTORY) {
      screen = SCREEN_VICTORY;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce(`The perfect heist. Score ${world.state.score}.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      audio.toggleMute();
      announce(audio.muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      audio.click();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_VICTORY) startGame();
      else if (screen === SCREEN_CLEAR) {
        world.nextLevel();
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, { ambient: true });
      return;
    }
    const throwAt = input.takeThrow();
    const events = world.step(STEP, input.direction(), { sneak: input.sneaking(), throwAt });
    if (world.state.alarm > 70) audio.alarm(performance.now());
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let guard = 0;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY) && guard < 40) {
        step();
        accumulator -= STEP;
        guard += 1;
      }
      if (guard >= 40) accumulator = 0;
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Midnight Vault. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
