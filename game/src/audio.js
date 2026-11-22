// Tiny procedural sounds (WebAudio, no assets): a blip for loot, a two-tone
// wail while the alarm is hot, a sting for getting caught, an arpeggio for a
// cleared level. Everything is lazy and guarded: no gesture, no audio, and a
// headless screenshot run stays silent and deterministic.
export function makeAudio() {
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

  function blip(freq, dur, type, vol, delay = 0) {
    const ac = ensure();
    if (ac === null || muted) return;
    try {
      const t0 = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ac.destination);
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
      blip(880, 0.09, 'sine', 0.12);
      blip(1318, 0.12, 'sine', 0.08, 0.06);
    },
    diamond() {
      blip(1046, 0.1, 'sine', 0.12);
      blip(1318, 0.1, 'sine', 0.12, 0.08);
      blip(1568, 0.18, 'sine', 0.12, 0.16);
    },
    alarm(now) {
      if (now - lastAlarm < 0.55) return;
      lastAlarm = now;
      blip(620, 0.22, 'square', 0.05);
      blip(460, 0.22, 'square', 0.05, 0.24);
    },
    caught() {
      blip(392, 0.16, 'sawtooth', 0.1);
      blip(311, 0.16, 'sawtooth', 0.1, 0.14);
      blip(233, 0.3, 'sawtooth', 0.1, 0.28);
    },
    clear() {
      blip(523, 0.1, 'sine', 0.12);
      blip(659, 0.1, 'sine', 0.12, 0.09);
      blip(784, 0.1, 'sine', 0.12, 0.18);
      blip(1046, 0.22, 'sine', 0.12, 0.27);
    },
    click() {
      blip(660, 0.05, 'sine', 0.07);
    },
  };
}
