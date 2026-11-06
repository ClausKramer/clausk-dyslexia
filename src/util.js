// Små hjælpefunktioner. Alle tilfældighedsfunktioner tager en valgfri rng (0..1) så motoren kan testes deterministisk.

export const defaultRng = () => Math.random();

export function shuffle(arr, rng = defaultRng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick(arr, rng = defaultRng) {
  return arr[Math.floor(rng() * arr.length)];
}

export function sample(arr, n, rng = defaultRng) {
  return shuffle(arr, rng).slice(0, n);
}

/** Vægtet valg: items[i] vælges med sandsynlighed weights[i]/sum. */
export function weightedPick(items, weights, rng = defaultRng) {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return pick(items, rng);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Vægtet udtræk uden tilbagelægning. */
export function weightedSample(items, weightFn, n, rng = defaultRng) {
  const pool = items.slice();
  const out = [];
  while (out.length < n && pool.length) {
    const w = pool.map(weightFn);
    const chosen = weightedPick(pool, w, rng);
    out.push(chosen);
    pool.splice(pool.indexOf(chosen), 1);
  }
  return out;
}

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Deterministisk rng til tests (mulberry32). */
export function seededRng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
