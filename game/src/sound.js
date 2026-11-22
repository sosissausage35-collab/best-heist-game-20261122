// Procedural sound: every effect is a short oscillator phrase through one
// WebAudio context, so the game ships no audio files. The context is only
// created after the player's first gesture (browsers block audio before
// that), and every effect is a no-op until then or while muted.

export function makeSound() {
  let context = null;
  let muted = false;

  function live() {
    if (muted) return null;
    if (!context) return null;
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function tone(freq, seconds, type, volume, slideTo) {
    const ctx = live();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + seconds);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  }

  return {
    /** Call from a user gesture so the browser lets audio start. */
    unlock() {
      if (context) return;
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (Ctor) context = new Ctor();
      } catch {
        context = null;
      }
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    coin() {
      tone(1320, 0.07, 'sine', 0.1);
      setTimeout(() => tone(1760, 0.09, 'sine', 0.1), 55);
    },
    bag() {
      tone(520, 0.09, 'triangle', 0.12);
      setTimeout(() => tone(780, 0.12, 'triangle', 0.12), 70);
    },
    diamond() {
      [880, 1108, 1318, 1760].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.14, 'sine', 0.11), i * 70);
      });
    },
    toss() {
      tone(900, 0.16, 'sine', 0.07, 320);
    },
    clink() {
      tone(2400, 0.05, 'square', 0.05);
    },
    spotted() {
      tone(220, 0.28, 'sawtooth', 0.11, 440);
    },
    caught() {
      tone(392, 0.22, 'sawtooth', 0.13, 98);
    },
    clear() {
      [523, 659, 784, 1046].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.16, 'triangle', 0.11), i * 80);
      });
    },
    win() {
      [523, 659, 784, 1046, 1318, 1568].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.2, 'triangle', 0.11), i * 90);
      });
    },
  };
}
