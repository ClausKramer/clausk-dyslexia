import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORDS, COMPOUNDS, INFLECTIONS, vowelOf, gapVowel, gapCluster } from '../src/content/words.js';
import { SIGHT_GROUPS, SIGHT_SENTENCES } from '../src/content/sightWords.js';
import { YESNO, SUBJECTS, ACTIONS } from '../src/content/sentences.js';
import { CATEGORIES, categoryById } from '../src/content/categories.js';
import { TILE_SPEECH, CLUSTERS } from '../src/content/phonemes.js';

test('alle ord har emoji, lydbrikker der staver ordet, og gyldigt niveau', () => {
  const seen = new Set();
  for (const w of WORDS) {
    assert.ok(w.e, `${w.w} mangler emoji`);
    assert.ok(!seen.has(w.w), `${w.w} er dubleret`);
    seen.add(w.w);
    assert.equal(w.ph.join(''), w.w, `${w.w}: lydbrikker ${w.ph.join('+')} staver ikke ordet`);
    assert.ok([1, 2, 3].includes(w.lvl), `${w.w} har ugyldigt niveau`);
    assert.ok(vowelOf(w), `${w.w} har ingen vokal`);
    if (w.cluster) assert.ok(w.w.startsWith(w.cluster), `${w.w} starter ikke med klyngen ${w.cluster}`);
    if (w.cluster) assert.ok(CLUSTERS.includes(w.cluster), `${w.w}: ukendt klynge ${w.cluster}`);
    for (const t of w.ph) assert.ok(TILE_SPEECH[t], `${w.w}: lydbrikken "${t}" mangler i TILE_SPEECH`);
  }
});

test('hul-funktioner', () => {
  const sol = WORDS.find((w) => w.w === 'sol');
  assert.equal(gapVowel(sol), 's_l');
  const blad = WORDS.find((w) => w.w === 'blad');
  assert.equal(gapCluster(blad), '__ad');
});

test('rimfamilier har mindst to medlemmer, så rimopgaver kan laves', () => {
  const fam = {};
  for (const w of WORDS) if (w.rhyme) (fam[w.rhyme] ||= []).push(w.w);
  const usable = Object.values(fam).filter((f) => f.length >= 2);
  assert.ok(usable.length >= 15, `kun ${usable.length} brugbare rimfamilier`);
});

test('der er nok ord til hvert niveau og til klynge/vokal-opgaver', () => {
  for (const lvl of [1, 2, 3]) assert.ok(WORDS.filter((w) => w.lvl === lvl).length >= 25, `niveau ${lvl} har for få ord`);
  assert.ok(WORDS.filter((w) => w.cluster && w.cluster.length === 2 && !w.silent && w.lvl <= 2).length >= 15);
  for (const v of ['a', 'e', 'i', 'o', 'u', 'y', 'æ', 'ø', 'å']) assert.ok(WORDS.some((w) => vowelOf(w) === v && w.lvl === 1), `ingen niveau-1-ord med vokalen ${v}`);
});

test('sammensatte ord og bøjninger er konsistente', () => {
  for (const c of COMPOUNDS) {
    assert.equal(c.parts.join(''), c.w, `${c.w}: delene staver ikke ordet`);
    assert.equal(c.pe.length, 2);
  }
  for (const i of INFLECTIONS) {
    assert.ok(i.q.includes('___'));
    assert.ok(!i.d.includes(i.a));
    assert.equal(i.d.length, 2);
  }
});

test('småord: grupper uden dubletter og sætninger med hul', () => {
  for (const g of SIGHT_GROUPS) assert.equal(new Set(g).size, g.length, `dublet i ${g}`);
  for (const s of SIGHT_SENTENCES) {
    assert.ok(s.s.includes('___'), s.s);
    assert.ok(!s.d.includes(s.a), s.s);
    assert.ok([2, 3].includes(s.lvl));
  }
});

test('sætningsindhold', () => {
  assert.ok(YESNO.filter((q) => q.a).length >= 5 && YESNO.filter((q) => !q.a).length >= 5);
  assert.ok(SUBJECTS.length >= 5 && ACTIONS.length >= 8);
  for (const a of ACTIONS) assert.ok(a.long);
});

test('kategoriernes forudsætninger peger på eksisterende kategorier', () => {
  for (const c of CATEGORIES) for (const p of c.prereq) assert.ok(categoryById(p.cat), `${c.id}: ukendt forudsætning ${p.cat}`);
  assert.equal(new Set(CATEGORIES.map((c) => c.id)).size, CATEGORIES.length);
});
