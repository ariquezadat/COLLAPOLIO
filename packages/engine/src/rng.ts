/**
 * PRNG determinista (mulberry32). El estado vive dentro de GameState para que
 * el reducer siga siendo puro y las partidas sean reproducibles en tests.
 */
export function nextRandom(seed: number): { value: number; seed: number } {
  let t = (seed + 0x6d2b79f5) | 0;
  let r = t;
  r = Math.imul(r ^ (r >>> 15), r | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return { value: ((r ^ (r >>> 14)) >>> 0) / 4294967296, seed: t };
}

/** Entero en [0, n) */
export function nextInt(seed: number, n: number): { value: number; seed: number } {
  const r = nextRandom(seed);
  return { value: Math.floor(r.value * n), seed: r.seed };
}

/** Fisher–Yates determinista */
export function shuffle<T>(arr: T[], seed: number): { value: T[]; seed: number } {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    const r = nextInt(s, i + 1);
    s = r.seed;
    const j = r.value;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return { value: a, seed: s };
}
