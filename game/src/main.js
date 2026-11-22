// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between six screens: title,
// play, paused, level clear, game over and victory.
//
// ?seed=N fixes the world. ?shot=start|play|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, TICK } from './config.js';
import { makeRng } from './random.js';
import { EV, buildWorld } from './world.js';
import { ACT, makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { Screens, makeRenderer } from './render.js';
import { stageScene } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = buildWorld(makeRng(seed));
const renderer = makeRenderer(canvas);
const audio = makeAudio();

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
  const scene = stageScene(name, world);
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
  const input = makeInput(canvas);
  let screen = Screens.title;
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
    screen = Screens.play;
    announce(`Playing. ${LIVES} lives.`);
  }

  function handleEvents(events) {
    if (events & EV.loot) audio.pickup();
    if (events & EV.diamond) audio.diamond();
    if (events & EV.alarm) announce('Alarm! The guards are hunting you.');
    if (events & EV.caught) {
      audio.caught();
      announce(world.state.lives === 1 ? 'Caught. 1 life left.' : `Caught. ${world.state.lives} lives left.`);
    }
    if (events & EV.clear) {
      audio.clear();
      screen = Screens.clear;
      announce(`Level clear. Score ${world.state.score}.`);
    }
    if (events & EV.over) {
      screen = Screens.over;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    }
    if (events & EV.victory) {
      screen = Screens.victory;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce(`The perfect heist. Score ${world.state.score}.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACT.mute) {
      audio.toggleMute();
      announce(audio.muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACT.confirm) {
      audio.unlock();
      audio.click();
      if (screen === Screens.title || screen === Screens.over || screen === Screens.victory) startGame();
      else if (screen === Screens.clear) {
        world.nextLevel();
        screen = Screens.play;
        announce('Playing.');
      } else if (screen === Screens.paused) {
        screen = Screens.play;
        announce('Playing.');
      }
    } else if (actions & ACT.pause && screen === Screens.play) {
      screen = Screens.paused;
      announce('Paused.');
    } else if (actions & ACT.pause && screen === Screens.paused) {
      screen = Screens.play;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === Screens.title) {
      world.step(TICK, { x: 0, y: 0 }, { ambient: true });
      return;
    }
    const throwAt = input.takeThrow();
    const events = world.step(TICK, input.move(), { sneak: input.sneaking(), throwAt });
    if (world.state.alarm > 70) audio.alarm(performance.now());
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === Screens.title || screen === Screens.play) {
      let guard = 0;
      while (accumulator >= TICK && (screen === Screens.title || screen === Screens.play) && guard < 40) {
        step();
        accumulator -= TICK;
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
    if (document.hidden && screen === Screens.play) {
      screen = Screens.paused;
      announce('Paused.');
    }
  });

  announce('Midnight Vault. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
