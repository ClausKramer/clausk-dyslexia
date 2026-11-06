// Den adaptive motor. Rene funktioner over et profil-objekt, så de kan testes uden browser.
//
// Principper (se docs/forskning.md):
//  * Mestring pr. område følges løbende (eksponentielt glidende gennemsnit af rigtig/hjulpet/forkert).
//  * Opgaver vægtes mod svage områder (flere opgaver dér) – men stærke områder holdes ved lige
//    (spaced review) og bruges som "succesopgaver", når barnet har haft en svær stribe.
//  * Sværhedsgrad inden for et område justeres trinvist (op ved sikker succes, ned ved gentagne fejl).
//  * Konkrete brikker (bogstaver, vokaler, klynger, ord) følges med Leitner-bokse, så det, der driller, kommer igen.
//  * Forvekslinger (b/d, o/ø, det/der ...) tælles, så forældre kan se mønstre.

import { CATEGORIES, categoryById } from '../content/categories.js';
import { weightedPick, weightedSample, clamp, uid, defaultRng } from '../util.js';

export const LEVEL_MAX = 3;
export const MASTERY_K = 0.18;          // hvor hurtigt mestringen flytter sig pr. svar
export const LEVEL_UP_STREAK = 4;       // rigtige i træk før niveauet hæves
export const LEVEL_UP_MASTERY = 0.75;
export const LEVEL_DOWN_FAILS = 3;      // forkerte i træk før niveauet sænkes
export const TARGET_SUCCESS = { low: 0.6, high: 0.9 }; // ønsket succesrate-bånd (ca. 70-85 %)
export const LEITNER_INTERVALS = [5 * 60e3, 30 * 60e3, 24 * 3600e3, 3 * 24 * 3600e3, 7 * 24 * 3600e3];
export const STAR_MILESTONES = [25, 100, 250, 500, 1000];
const DAY = 24 * 3600e3;

export function createProfile(name, avatar = '🐉', now = Date.now()) {
  return {
    version: 1,
    id: uid(),
    name,
    avatar,
    createdAt: now,
    stars: 0,         // livstids-stjerner (dragen vokser)
    wallet: 0,        // stjerner der kan bruges i dragebutikken
    owned: ['color-green', 'hat-none', 'trail-none'],
    equipped: { color: 'color-green', hat: 'hat-none', trail: 'trail-none' },
    streak: { current: 0, best: 0, lastDay: null },
    daily: { day: null, missions: 0, claimed: false },
    comboBest: 0,
    badges: [],
    skills: {},       // pr. kategori
    items: {},        // Leitner-bokse pr. brik ("bogstav:b", "vokal:ø", "klynge:bl", "ord:det")
    confusions: {},   // "bogstav:b|d" → antal
    answers: [],      // seneste svar (globalt) – til succesbalance og tendens
    sessions: [],     // afsluttede missioner
    missionsPlayed: 0,
    unlockAll: false,
    settings: { autoRead: true, wideSpacing: true, bigText: false, uppercase: false, rate: 0.9, sounds: true, world3d: true },
  };
}

export function skill(profile, cat) {
  if (!profile.skills[cat]) {
    profile.skills[cat] = { mastery: 0.5, level: 1, attempts: 0, correct: 0, helped: 0, streak: 0, failStreak: 0, lastSeen: 0, history: [] };
  }
  return profile.skills[cat];
}

export function isUnlocked(profile, cat) {
  if (profile.unlockAll) return true;
  const def = categoryById(cat);
  if (!def) return false;
  // Forudsætning opfyldt når området er prøvet et par gange og mestringen er over tærsklen (eller niveauet er hævet).
  return def.prereq.every((p) => {
    const s = profile.skills[p.cat];
    return !!s && s.attempts >= 4 && (s.mastery >= p.mastery || s.level > 1);
  });
}

export function unlockedCategories(profile) {
  return CATEGORIES.filter((c) => isUnlocked(profile, c.id)).map((c) => c.id);
}

/** Andel rigtige blandt de seneste n svar (1 = alle rigtige). Uden svar: 0.75 (neutral). */
export function recentSuccessRate(profile, n = 6) {
  const a = profile.answers.slice(-n);
  if (!a.length) return 0.75;
  return a.reduce((s, x) => s + (x.score >= 1 ? 1 : x.score > 0 ? 0.5 : 0), 0) / a.length;
}

/**
 * Vægt pr. kategori for næste opgave.
 * recent = kategorierne for de seneste opgaver i missionen (til variation/interleaving).
 */
export function categoryWeights(profile, { now = Date.now(), recent = [] } = {}) {
  const rate = recentSuccessRate(profile);
  const weights = {};
  for (const c of CATEGORIES) {
    if (!isUnlocked(profile, c.id)) { weights[c.id] = 0; continue; }
    const s = skill(profile, c.id);
    const need = 1 - s.mastery;                              // svagt område → høj vægt
    const daysSince = s.lastSeen ? (now - s.lastSeen) / DAY : 3;
    const recency = clamp(daysSince / 3, 0, 1);              // længe siden → hold ved lige
    const novelty = s.attempts < 4 ? 0.6 : 0;                // nye områder skal udforskes
    let w = 0.2 + 1.5 * need * need + 0.4 * recency + novelty;

    // Variation: ikke samme område mange gange i træk.
    const last = recent[recent.length - 1];
    const prev = recent[recent.length - 2];
    if (last === c.id) w *= 0.25;
    else if (prev === c.id) w *= 0.6;

    // Succesbalance: efter en svær stribe → vælg noget, barnet kan (motivation);
    // efter en let stribe → lad svage områder fylde mere.
    if (rate < TARGET_SUCCESS.low) w *= 0.4 + s.mastery;
    else if (rate > TARGET_SUCCESS.high) w *= 1.6 - s.mastery;

    weights[c.id] = w;
  }
  return weights;
}

export function pickCategory(profile, opts = {}) {
  const rng = opts.rng || defaultRng;
  const w = categoryWeights(profile, opts);
  const ids = Object.keys(w).filter((k) => w[k] > 0);
  if (!ids.length) return 'fonem';
  return weightedPick(ids, ids.map((k) => w[k]), rng);
}

/** Planlæg en mission: liste af kategorier. focus = fast kategori (barnet valgte et sted). */
export function planMission(profile, { focus = null, n = 8, now = Date.now(), rng = defaultRng } = {}) {
  if (focus) return Array(n).fill(focus);
  const recent = [];
  for (let i = 0; i < n; i++) recent.push(pickCategory(profile, { now, rng, recent }));
  return recent;
}

// ---------- Brikker (Leitner) ----------

export function itemState(profile, key) {
  return profile.items[key] || null;
}

export function updateItem(profile, key, ok, now = Date.now()) {
  const it = (profile.items[key] ||= { box: 0, due: 0, seen: 0, fails: 0, lastSeen: 0 });
  it.seen++;
  it.lastSeen = now;
  if (ok) it.box = Math.min(LEITNER_INTERVALS.length - 1, it.box + 1);
  else { it.box = 0; it.fails++; }
  it.due = now + LEITNER_INTERVALS[it.box];
  return it;
}

/** Hvor gerne vil vi se denne brik nu? Usete brikker og brikker, der er "due", vægtes højt. */
export function itemWeight(profile, key, now = Date.now()) {
  const it = profile.items[key];
  if (!it) return 1.5;
  if (it.due <= now) return 1 + (LEITNER_INTERVALS.length - 1 - it.box) * 0.5 + Math.min(it.fails, 3) * 0.3;
  return 0.15;
}

/** Vægtet udtræk af n kandidater efter deres Leitner-tilstand. */
export function pickItems(profile, candidates, keyFn, n, { now = Date.now(), rng = defaultRng } = {}) {
  return weightedSample(candidates, (c) => itemWeight(profile, keyFn(c), now), n, rng);
}

// ---------- Registrering af svar ----------

/**
 * task: { category, items: [keys], confusion: "bogstav:b|d" | null, words?: number }
 * result: { score: 1 | 0.5 | 0, ms, now }
 * Returnerer hvad der skete (stjerner, niveauskift, badges) så UI'et kan fejre det.
 */
export function recordResult(profile, task, { score, ms = 0, now = Date.now() }) {
  const s = skill(profile, task.category);
  const out = { starsEarned: 0, leveledUp: false, leveledDown: false, newBadges: [] };

  s.attempts++;
  if (score >= 1) { s.correct++; s.streak++; s.failStreak = 0; }
  else if (score > 0) { s.helped++; s.streak = 0; s.failStreak = 0; }
  else { s.streak = 0; s.failStreak++; }

  s.mastery = clamp(s.mastery + MASTERY_K * (score - s.mastery), 0, 1);
  s.lastSeen = now;
  s.history.push({ score, ms, level: s.level, ts: now });
  if (s.history.length > 40) s.history.shift();

  if (s.streak >= LEVEL_UP_STREAK && s.mastery >= LEVEL_UP_MASTERY && s.level < LEVEL_MAX) {
    s.level++; s.streak = 0; s.mastery = 0.6; out.leveledUp = true;
  } else if (s.failStreak >= LEVEL_DOWN_FAILS && s.level > 1) {
    s.level--; s.failStreak = 0; s.mastery = Math.max(s.mastery, 0.5); out.leveledDown = true;
  }

  for (const key of task.items || []) updateItem(profile, key, score >= 1, now);
  if (score < 1 && task.confusion) profile.confusions[task.confusion] = (profile.confusions[task.confusion] || 0) + 1;

  profile.answers.push({ cat: task.category, score, ms, ts: now, level: s.level, words: task.words || 0 });
  if (profile.answers.length > 80) profile.answers.shift();

  out.starsEarned = score >= 1 ? 2 : score > 0 ? 1 : 0;
  profile.stars += out.starsEarned;
  profile.wallet = (profile.wallet ?? 0) + out.starsEarned;
  out.newBadges = checkBadges(profile);
  return out;
}

export function finishMission(profile, summary, now = Date.now()) {
  profile.missionsPlayed++;
  profile.stars += summary.bonus || 0;
  profile.wallet = (profile.wallet ?? 0) + (summary.bonus || 0);
  profile.sessions.push({ ...summary, ts: now });
  if (profile.sessions.length > 200) profile.sessions.shift();
  return checkBadges(profile);
}

export function checkBadges(profile) {
  const fresh = [];
  const add = (id) => { if (!profile.badges.includes(id)) { profile.badges.push(id); fresh.push(id); } };
  if (profile.missionsPlayed >= 1) add('first-mission');
  if (profile.missionsPlayed >= 10) add('missions-10');
  if (profile.missionsPlayed >= 50) add('missions-50');
  for (const m of STAR_MILESTONES) if (profile.stars >= m) add(`stars-${m}`);
  if (dragonStage(profile.stars).index >= 5) add('evolve-5');
  for (const c of CATEGORIES) {
    const s = profile.skills[c.id];
    if (!s) continue;
    if (s.attempts >= 10 && s.mastery >= 0.8) add(`master-${c.id}`);
    if (s.level >= 3) add(`level3-${c.id}`);
  }
  return fresh;
}

export const BADGES = {
  'first-mission': { icon: '🎒', name: 'Første mission' },
  'missions-10': { icon: '🧭', name: '10 missioner' },
  'missions-50': { icon: '🏆', name: '50 missioner' },
  'stars-25': { icon: '⭐', name: '25 stjerner' },
  'stars-100': { icon: '🌟', name: '100 stjerner' },
  'stars-250': { icon: '💫', name: '250 stjerner' },
  'stars-500': { icon: '🌠', name: '500 stjerner' },
  'stars-1000': { icon: '🪐', name: '1000 stjerner' },
  'perfect-mission': { icon: '💎', name: 'Perfekt mission' },
  'streak-3': { icon: '🔥', name: '3 dage i træk' },
  'streak-7': { icon: '🌋', name: '7 dage i træk' },
  'streak-30': { icon: '☄️', name: '30 dage i træk' },
  'combo-10': { icon: '⚡', name: '10 rigtige i træk' },
  'evolve-5': { icon: '🐉', name: 'Stjernedrage' },
};
export function badgeInfo(id) {
  if (BADGES[id]) return BADGES[id];
  const [kind, cat] = id.split('-');
  const c = categoryById(cat);
  if (kind === 'master') return { icon: c?.icon || '🏅', name: `Mester i ${c?.name || cat}` };
  if (kind === 'level3') return { icon: '🔝', name: `Niveau 3 i ${c?.name || cat}` };
  return { icon: '🏅', name: id };
}

/** Dragens udviklingstrin ud fra stjerner. */
export function dragonStage(stars) {
  const stages = [
    { min: 0, icon: '🥚', name: 'Æg' },
    { min: 20, icon: '🐣', name: 'Udklækket' },
    { min: 60, icon: '🦎', name: 'Lille drage' },
    { min: 150, icon: '🐲', name: 'Drage' },
    { min: 350, icon: '🐉', name: 'Stor drage' },
    { min: 700, icon: '🐉✨', name: 'Stjernedrage' },
  ];
  let index = 0;
  stages.forEach((s, i) => { if (stars >= s.min) index = i; });
  const next = stages[index + 1] || null;
  return { ...stages[index], index, next };
}

// ---------- Analyse til forældreoverblik ----------

export function analyze(profile, now = Date.now()) {
  const cats = CATEGORIES.map((c) => {
    const s = profile.skills[c.id];
    if (!s) return { id: c.id, def: c, unlocked: isUnlocked(profile, c.id), attempts: 0, status: 'ny', mastery: 0.5, level: 1, rate: null, recentRate: null, trend: 0, avgMs: null };
    const hist = s.history;
    const last = hist.slice(-10);
    const prev = hist.slice(-20, -10);
    const rateOf = (arr) => (arr.length ? arr.reduce((a, h) => a + h.score, 0) / arr.length : null);
    const recentRate = rateOf(last);
    const trend = prev.length >= 5 && recentRate !== null ? recentRate - rateOf(prev) : 0;
    const status = s.attempts < 5 ? 'ny' : s.mastery < 0.45 ? 'svag' : s.mastery < 0.7 ? 'øver' : 'stærk';
    const timed = last.filter((h) => h.ms > 0);
    const avgMs = timed.length ? timed.reduce((a, h) => a + h.ms, 0) / timed.length : null;
    return { id: c.id, def: c, unlocked: isUnlocked(profile, c.id), attempts: s.attempts, correct: s.correct, helped: s.helped, mastery: s.mastery, level: s.level, rate: s.attempts ? (s.correct + 0.5 * s.helped) / s.attempts : null, recentRate, trend, status, avgMs, lastSeen: s.lastSeen };
  });

  const confusions = Object.entries(profile.confusions)
    .map(([k, n]) => { const [type, pair] = k.split(':'); const [expected, chosen] = pair.split('|'); return { type, expected, chosen, n }; })
    .filter((c) => c.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);

  const hardItems = Object.entries(profile.items)
    .map(([k, it]) => ({ key: k, ...it }))
    .filter((it) => it.fails >= 2 && it.box <= 1)
    .sort((a, b) => b.fails - a.fails)
    .slice(0, 12);

  // Læsehastighed (Læsefyret): ord pr. minut for de seneste sætningsopgaver.
  const reading = profile.answers.filter((a) => a.cat === 'saetning' && a.words > 0 && a.ms > 0);
  const wpm = (arr) => (arr.length ? (arr.reduce((s, a) => s + a.words, 0) / (arr.reduce((s, a) => s + a.ms, 0) / 60000)) : null);
  const readingSpeed = { recent: wpm(reading.slice(-10)), earlier: wpm(reading.slice(-20, -10)) };

  const weak = cats.filter((c) => c.status === 'svag').sort((a, b) => a.mastery - b.mastery);
  const strong = cats.filter((c) => c.status === 'stærk').sort((a, b) => b.mastery - a.mastery);

  const recommendations = [];
  for (const c of weak.slice(0, 2)) recommendations.push({ kind: 'svag', cat: c.id, text: `${c.def.name} (${c.def.skill}) ser svært ud lige nu. Spillet giver automatisk flere opgaver her på niveau ${c.level}. Tip: ${c.def.tip}` });
  for (const c of strong.slice(0, 2)) recommendations.push({ kind: 'stærk', cat: c.id, text: `${c.def.name} (${c.def.skill}) går rigtig godt – niveau ${c.level}${c.level < LEVEL_MAX ? ', og niveauet hæves automatisk ved fortsat succes' : ' (højeste niveau)'}. Området holdes ved lige med få opgaver.` });
  for (const c of confusions.slice(0, 3)) {
    const what = c.type === 'ord' ? `ordene "${c.expected}" og "${c.chosen}"` : `${c.type === 'vokal' ? 'vokalerne' : c.type === 'klynge' ? 'klyngerne' : 'bogstaverne'} "${c.expected}" og "${c.chosen}"`;
    recommendations.push({ kind: 'forveksling', text: `Forveksler ofte ${what} (${c.n} gange). Tip: Øv parret side om side – sig lyden, mærk mundstillingen, og find forskellen (fx "b har maven foran, d har maven bagved").` });
  }
  const total = profile.answers.length;
  if (total >= 10 && recentSuccessRate(profile, 20) < 0.55) recommendations.push({ kind: 'motivation', text: 'Succesraten er lav for tiden. Spillet vælger automatisk flere lette opgaver, men overvej at spille sammen og holde sessionerne korte (10 minutter).' });
  if (total >= 10 && recentSuccessRate(profile, 20) > 0.92) recommendations.push({ kind: 'udfordring', text: 'Næsten alt er rigtigt. Niveauerne hæves automatisk – du kan også låse alle områder op under "Indstillinger".' });
  if (readingSpeed.recent && readingSpeed.earlier && readingSpeed.recent > readingSpeed.earlier * 1.15) recommendations.push({ kind: 'flyd', text: 'Læsehastigheden i Læsefyret er steget. Fortsæt med gentagne læsninger af samme korte tekster.' });

  return { cats, weak, strong, confusions, hardItems, readingSpeed, recommendations, totalAnswers: total, overallRate: recentSuccessRate(profile, 40) };
}
