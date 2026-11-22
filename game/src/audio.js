// Tiny procedural sounds (WebAudio, no assets): a blip for loot, a two-tone
// wail while the alarm is hot, a sting for getting caught, an arpeggio for a
// cleared level. Everything is lazy and guarded: no gesture, no audio, and a
// headless screenshot run stays silent and deterministic.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let lastAlarm = 0;

  function ensure() {
    if (ctx !== null) return ctx;
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, gain, when = 0) {
    const ac = ensure();
    if (ac === null || muted) return;
    try {
      const t0 = ac.currentTime + when;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    pickup() {
      tone(880, 0.09, 'sine', 0.12);
      tone(1318, 0.12, 'sine', 0.08, 0.06);
    },
    diamond() {
      tone(1046, 0.1, 'sine', 0.12);
      tone(1318, 0.1, 'sine', 0.12, 0.08);
      tone(1568, 0.18, 'sine', 0.12, 0.16);
    },
    alarm(now) {
      if (now - lastAlarm < 0.55) return;
      lastAlarm = now;
      tone(620, 0.22, 'square', 0.05);
      tone(460, 0.22, 'square', 0.05, 0.24);
    },
    caught() {
      tone(392, 0.16, 'sawtooth', 0.1);
      tone(311, 0.16, 'sawtooth', 0.1, 0.14);
      tone(233, 0.3, 'sawtooth', 0.1, 0.28);
    },
    clear() {
      tone(523, 0.1, 'sine', 0.12);
      tone(659, 0.1, 'sine', 0.12, 0.09);
      tone(784, 0.1, 'sine', 0.12, 0.18);
      tone(1046, 0.22, 'sine', 0.12, 0.27);
    },
    click() {
      tone(660, 0.05, 'sine', 0.07);
    },
  };
}
