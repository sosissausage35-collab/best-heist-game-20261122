// Boot and the one loop: input is read every frame, the heist advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// painter paints what is there. The game moves between six screens: title,
// play, paused, level clear, game over and victory.
//
// ?seed=N fixes the random pattern. ?shot=start|play|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, STEP } from './settings.js';
import { seededRandom } from './rng.js';
import {
  EV_CAUGHT,
  EV_CHASE,
  EV_CLEAR,
  EV_DIAMOND,
  EV_OVER,
  EV_PICKUP,
  EV_TOSS,
  createHeist,
} from './heist.js';
import { ACT_CONFIRM, ACT_MUTE, ACT_PAUSE, readKeys } from './keys.js';
import { makeSound } from './sound.js';
import {
  VIEW_CLEAR,
  VIEW_OVER,
  VIEW_PAUSED,
  VIEW_PLAY,
  VIEW_TITLE,
  VIEW_WIN,
  makePainter,
} from './draw.js';
import { stageScene } from './scenes.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const heist = createHeist(seededRandom(seed));
const painter = makePainter(canvas);
const sound = makeSound();

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
  const scene = stageScene(name, heist);
  let painted = 0;
  function paint() {
    painter.paint(heist.state, scene.screen, scene.best, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const keys = readKeys(canvas);
  let screen = VIEW_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    sound.unlock();
    heist.reset();
    accumulator = 0;
    screen = VIEW_PLAY;
    announce(`Playing. ${LIVES} lives.`);
  }

  function endGame() {
    screen = VIEW_OVER;
    if (heist.state.score > best) {
      best = heist.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${heist.state.score}. Best ${best}.`);
  }

  function clearLevel() {
    screen = VIEW_CLEAR;
    sound.clear();
    announce(`Level clear. Score ${heist.state.score}.`);
  }

  function winGame() {
    screen = VIEW_WIN;
    sound.win();
    if (heist.state.score > best) {
      best = heist.state.score;
      saveBest(best);
    }
    announce(`Clean getaway. Score ${heist.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = keys.takeActions();
    if (actions & ACT_MUTE) {
      const muted = sound.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACT_CONFIRM && (screen === VIEW_TITLE || screen === VIEW_OVER || screen === VIEW_WIN)) {
      startGame();
    } else if (actions & ACT_CONFIRM && screen === VIEW_CLEAR) {
      heist.nextLevel();
      screen = VIEW_PLAY;
      announce('Playing.');
    } else if (actions & ACT_PAUSE && screen === VIEW_PLAY) {
      screen = VIEW_PAUSED;
      announce('Paused.');
    } else if (actions & (ACT_PAUSE | ACT_CONFIRM) && screen === VIEW_PAUSED) {
      screen = VIEW_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === VIEW_TITLE) {
      heist.step(STEP, { x: 0, y: 0 }, false, null, true);
      return;
    }
    const click = keys.takeClick();
    const toss = click ? painter.clientToArena(click.x, click.y) : null;
    const events = heist.step(STEP, keys.steer(), keys.sneaking(), toss, false);
    if (events & EV_PICKUP) sound.coin();
    if (events & EV_DIAMOND) sound.diamond();
    if (events & EV_TOSS) sound.toss();
    if (events & EV_CHASE) sound.spotted();
    if (events & EV_CAUGHT) {
      sound.caught();
      announce(heist.state.lives === 1 ? 'Caught. 1 life left.' : `Caught. ${heist.state.lives} lives left.`);
    }
    if (events & EV_OVER) endGame();
    else if (events & EV_CLEAR) {
      if (heist.state.phase === 'win') winGame();
      else clearLevel();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === VIEW_TITLE || screen === VIEW_PLAY) {
      while (accumulator >= STEP && (screen === VIEW_TITLE || screen === VIEW_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    painter.paint(heist.state, screen, best, keys.sneaking());
  }

  // Leaving the tab pauses a running game rather than letting the alarm rise unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === VIEW_PLAY) {
      screen = VIEW_PAUSED;
      announce('Paused.');
    }
  });

  announce('Midnight Vault. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
