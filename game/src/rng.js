// A small seeded random number generator (xorshift32): the same seed gives the
// same game, which is what makes the screenshot scenes repeatable.

export function seededRandom(seed) {
  let s = (seed | 0) || 0x9e3779b9;
  return function next() {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
