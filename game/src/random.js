// A tiny seeded generator (mulberry32). The same seed always deals the same
// guard starts and camera phases, so a screenshot or a replay is exact.
export function makeRng(seed) {
  let state = seed >>> 0;
  return function roll() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mix = Math.imul(state ^ (state >>> 15), 1 | state);
    mix = (mix + Math.imul(mix ^ (mix >>> 7), 61 | mix)) ^ mix;
    return ((mix ^ (mix >>> 14)) >>> 0) / 4294967296;
  };
}
