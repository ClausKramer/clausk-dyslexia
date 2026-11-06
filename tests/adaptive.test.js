import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, skill, recordResult, categoryWeights, planMission, pickCategory, isUnlocked, updateItem, itemWeight, pickItems, analyze, finishMission, LEVEL_UP_STREAK, LEVEL_DOWN_FAILS, dragonStage } from '../src/engine/adaptive.js';
import { CATEGORY_IDS } from '../src/content/categories.js';
import { seededRng } from '../src/util.js';

const NOW = 1_700_000_000_000;
const task = (category, extra = {}) => ({ category, items: [], confusion: null, ...extra });
function answer(p, cat, score, n = 1, t = NOW) { let out; for (let i = 0; i < n; i++) out = recordResult(p, task(cat), { score, ms: 1000, now: t + i }); return out; }

test('ny profil: kun områder uden forudsætninger er åbne', () => {
  const p = createProfile('Test');
  assert.equal(isUnlocked(p, 'fonem'), true);
  assert.equal(isUnlocked(p, 'bogstav'), true);
  assert.equal(isUnlocked(p, 'syntese'), false);
  assert.equal(isUnlocked(p, 'saetning'), false);
  p.unlockAll = true;
  assert.equal(isUnlocked(p, 'saetning'), true);
});

test('mestring stiger ved rigtige svar og falder ved forkerte', () => {
  const p = createProfile('Test');
  answer(p, 'fonem', 1, 3);
  assert.ok(skill(p, 'fonem').mastery > 0.65);
  answer(p, 'fonem', 0, 6);
  assert.ok(skill(p, 'fonem').mastery < 0.4);
});

test('svage områder vægtes højere end stærke', () => {
  const p = createProfile('Test');
  p.unlockAll = true;
  for (const c of CATEGORY_IDS) answer(p, c, 1, 5); // alle set, alle gode
  answer(p, 'vokal', 0, 8); // vokal bliver svag
  for (const c of ['fonem', 'bogstav', 'syntese', 'analyse']) answer(p, c, 1, 2); // seneste svar blandet, så succesbalancen er neutral
  const w = categoryWeights(p, { now: NOW + 100 });
  const strong = CATEGORY_IDS.filter((c) => c !== 'vokal').map((c) => w[c]);
  assert.ok(w.vokal > Math.max(...strong) * 2, `vokal ${w.vokal} vs ${Math.max(...strong)}`);
});

test('stærke områder forsvinder ikke helt (vedligehold)', () => {
  const p = createProfile('Test');
  p.unlockAll = true;
  for (const c of CATEGORY_IDS) answer(p, c, 1, 12);
  const w = categoryWeights(p, { now: NOW + 100 });
  for (const c of CATEGORY_IDS) assert.ok(w[c] > 0.15, `${c} har vægt ${w[c]}`);
});

test('områder der ikke er set længe, får mere vægt', () => {
  const p = createProfile('Test');
  p.unlockAll = true;
  for (const c of CATEGORY_IDS) answer(p, c, 1, 8, NOW);
  answer(p, 'fonem', 1, 1, NOW + 10 * 24 * 3600e3); // fonem set for nylig
  const w = categoryWeights(p, { now: NOW + 10 * 24 * 3600e3 + 1000 });
  assert.ok(w.bogstav > w.fonem);
});

test('variation: samme område dæmpes, hvis det lige har været brugt', () => {
  const p = createProfile('Test');
  p.unlockAll = true;
  for (const c of CATEGORY_IDS) answer(p, c, 1, 8);
  const w1 = categoryWeights(p, { now: NOW, recent: [] });
  const w2 = categoryWeights(p, { now: NOW, recent: ['fonem'] });
  assert.ok(w2.fonem < w1.fonem * 0.5);
});

test('succesbalance: efter en svær stribe favoriseres stærke områder', () => {
  const p = createProfile('Test');
  p.unlockAll = true;
  for (const c of CATEGORY_IDS) answer(p, c, 1, 8);
  answer(p, 'klynge', 0, 10); // klynge er nu svag og de seneste svar er forkerte
  const w = categoryWeights(p, { now: NOW + 100 });
  // Når succesraten er lav skal den svage kategori ikke dominere fuldstændigt
  const ratio = w.klynge / w.fonem;
  assert.ok(ratio < 2.5, `ratio ${ratio}`);
});

test('niveau hæves efter sikker succes og sænkes efter gentagne fejl', () => {
  const p = createProfile('Test');
  let up = false;
  for (let i = 0; i < 12 && !up; i++) up = answer(p, 'bogstav', 1).leveledUp;
  assert.equal(up, true);
  assert.equal(skill(p, 'bogstav').level, 2);
  let down = false;
  for (let i = 0; i < LEVEL_DOWN_FAILS; i++) down = answer(p, 'bogstav', 0).leveledDown;
  assert.equal(down, true);
  assert.equal(skill(p, 'bogstav').level, 1);
});

test('niveau går ikke over 5', () => {
  const p = createProfile('Test');
  answer(p, 'syntese', 1, 120);
  assert.equal(skill(p, 'syntese').level, 5);
  assert.ok(p.badges.includes('level5-syntese'));
});

test('hjulpet svar (0.5) nulstiller striben uden at tælle som fejl', () => {
  const p = createProfile('Test');
  answer(p, 'fonem', 1, LEVEL_UP_STREAK - 1);
  answer(p, 'fonem', 0.5);
  assert.equal(skill(p, 'fonem').streak, 0);
  assert.equal(skill(p, 'fonem').failStreak, 0);
  assert.equal(skill(p, 'fonem').level, 1);
});

test('Leitner: forkerte brikker ryger i boks 0 og vægtes højt; rigtige rykker op', () => {
  const p = createProfile('Test');
  updateItem(p, 'bogstav:b', true, NOW);
  updateItem(p, 'bogstav:b', true, NOW + 1);
  assert.equal(p.items['bogstav:b'].box, 2);
  assert.ok(itemWeight(p, 'bogstav:b', NOW + 2) < 0.5, 'ikke due endnu → lav vægt');
  updateItem(p, 'bogstav:d', false, NOW);
  assert.equal(p.items['bogstav:d'].box, 0);
  assert.ok(itemWeight(p, 'bogstav:d', NOW + 10 * 60e3) > 2);
  assert.equal(itemWeight(p, 'bogstav:x', NOW), 1.5, 'usete brikker vægtes højt');
});

test('pickItems foretrækker brikker, der driller', () => {
  const p = createProfile('Test');
  const rng = seededRng(7);
  for (const l of ['a', 'b', 'c', 'd']) for (let i = 0; i < 4; i++) updateItem(p, `bogstav:${l}`, true, NOW);
  updateItem(p, 'bogstav:b', false, NOW);
  let bCount = 0;
  for (let i = 0; i < 200; i++) {
    const [x] = pickItems(p, ['a', 'b', 'c', 'd'], (l) => `bogstav:${l}`, 1, { now: NOW + 6 * 60e3, rng });
    if (x === 'b') bCount++;
  }
  assert.ok(bCount > 120, `b valgt ${bCount}/200`);
});

test('forvekslinger tælles kun ved fejl', () => {
  const p = createProfile('Test');
  recordResult(p, task('bogstav', { confusion: 'bogstav:b|d' }), { score: 1, now: NOW });
  assert.equal(p.confusions['bogstav:b|d'], undefined);
  recordResult(p, task('bogstav', { confusion: 'bogstav:b|d' }), { score: 0, now: NOW });
  recordResult(p, task('bogstav', { confusion: 'bogstav:b|d' }), { score: 0.5, now: NOW });
  assert.equal(p.confusions['bogstav:b|d'], 2);
});

test('planMission respekterer fokus og låste områder', () => {
  const p = createProfile('Test');
  const rng = seededRng(3);
  assert.deepEqual(planMission(p, { focus: 'vokal', n: 4, rng }), ['vokal', 'vokal', 'vokal', 'vokal']);
  const plan = planMission(p, { n: 20, now: NOW, rng });
  for (const c of plan) assert.ok(['fonem', 'bogstav'].includes(c), `låst kategori ${c} i plan`);
});

test('pickCategory vælger kun åbne kategorier', () => {
  const p = createProfile('Test');
  const rng = seededRng(11);
  for (let i = 0; i < 50; i++) assert.ok(['fonem', 'bogstav'].includes(pickCategory(p, { now: NOW, rng })));
});

test('analyze giver status, anbefalinger og forvekslinger', () => {
  const p = createProfile('Test');
  p.unlockAll = true;
  answer(p, 'vokal', 0, 8);
  answer(p, 'fonem', 1, 10);
  for (let i = 0; i < 3; i++) recordResult(p, task('vokal', { confusion: 'vokal:o|ø' }), { score: 0, now: NOW });
  const an = analyze(p, NOW);
  assert.equal(an.cats.find((c) => c.id === 'vokal').status, 'svag');
  assert.equal(an.cats.find((c) => c.id === 'fonem').status, 'stærk');
  assert.ok(an.weak.some((c) => c.id === 'vokal'));
  assert.ok(an.strong.some((c) => c.id === 'fonem'));
  assert.ok(an.confusions.some((c) => c.expected === 'o' && c.chosen === 'ø'));
  assert.ok(an.recommendations.some((r) => r.kind === 'svag'));
  assert.ok(an.recommendations.some((r) => r.kind === 'forveksling'));
});

test('stjerner, badges og dragetrin', () => {
  const p = createProfile('Test');
  assert.equal(dragonStage(0).name, 'Æg');
  answer(p, 'fonem', 1, 15);
  assert.equal(p.stars, 30);
  assert.ok(p.badges.includes('stars-25'));
  const fresh = finishMission(p, { focus: null, n: 8, correct: 8, helped: 0, stars: 19, bonus: 3, byCat: {}, durationMs: 60000 }, NOW);
  assert.ok(fresh.includes('first-mission'));
  assert.equal(p.missionsPlayed, 1);
  assert.ok(dragonStage(p.stars).name !== 'Æg');
});
