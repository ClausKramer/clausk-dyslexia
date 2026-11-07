import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTask, GENERATORS } from '../src/tasks/index.js';
import { createProfile, updateItem } from '../src/engine/adaptive.js';
import { CATEGORY_IDS } from '../src/content/categories.js';
import { seededRng } from '../src/util.js';

function checkTask(t, cat, level) {
  assert.equal(t.category, cat);
  assert.equal(t.level, level);
  assert.ok(t.instruction);
  assert.ok(Array.isArray(t.speakOnStart) && t.speakOnStart.length);
  assert.ok(Array.isArray(t.repeat));
  assert.ok(Array.isArray(t.items));
  if (t.mode === 'choice') {
    assert.ok(t.choices.length >= 2 && t.choices.length <= 6, `${t.type}: ${t.choices.length} valg`);
    assert.ok(t.choices.some((c) => c.id === t.answer), `${t.type}: svaret ${t.answer} findes ikke blandt valgene`);
    assert.equal(new Set(t.choices.map((c) => c.id)).size, t.choices.length, `${t.type}: dublerede valg`);
    const emojis = t.choices.map((c) => c.emoji).filter(Boolean);
    assert.equal(new Set(emojis).size, emojis.length, `${t.type}: dublerede billeder ${emojis}`);
    assert.ok(t.choices.every((c) => c.label || c.emoji), `${t.type}: valg uden label/emoji`);
  } else {
    assert.equal(t.mode, 'sequence');
    assert.ok(t.answerSeq.every((id) => t.tiles.some((x) => x.id === id)));
    assert.ok(t.tiles.length > t.answerSeq.length, 'der skal være distraktorbrikker');
    assert.ok(t.wordText);
  }
}

test('alle generatorer laver gyldige opgaver på alle fem niveauer (200 pr. kombination)', () => {
  const profile = createProfile('Test');
  const rng = seededRng(42);
  for (const cat of CATEGORY_IDS) {
    assert.ok(GENERATORS[cat], `mangler generator for ${cat}`);
    for (const level of [1, 2, 3, 4, 5]) {
      for (let i = 0; i < 200; i++) checkTask(generateTask(cat, { profile, level, rng }), cat, level);
    }
  }
});

test('niveau 1 i Lydbroen bruger kun korte, lydrette ord', () => {
  const profile = createProfile('Test');
  const rng = seededRng(1);
  for (let i = 0; i < 100; i++) {
    const t = generateTask('syntese', { profile, level: 1, rng });
    assert.ok(t.answer.length <= 3, `for langt ord: ${t.answer}`);
  }
});

test('på højere niveau bruges forvekslelige distraktorer i Bogstavbjerget', () => {
  const profile = createProfile('Test');
  const rng = seededRng(5);
  let confusableSeen = 0;
  for (let i = 0; i < 100; i++) {
    const t = generateTask('bogstav', { profile, level: 3, rng });
    if (t.type !== 'bogstav-sound') continue;
    const ids = t.choices.map((c) => c.id);
    if ((t.answer === 'b' && ids.includes('d')) || (t.answer === 'd' && ids.includes('b')) || (t.answer === 'o' && (ids.includes('ø') || ids.includes('å')))) confusableSeen++;
  }
  assert.ok(confusableSeen > 0);
});

test('brikker der driller, kommer oftere igen', () => {
  const profile = createProfile('Test');
  const rng = seededRng(9);
  const now = 1_700_000_000_000;
  for (const v of ['a', 'e', 'i', 'o', 'u', 'y', 'æ', 'ø', 'å']) for (let k = 0; k < 4; k++) updateItem(profile, `vokal:${v}`, true, now);
  updateItem(profile, 'vokal:ø', false, now);
  let count = 0;
  for (let i = 0; i < 150; i++) if (generateTask('vokal', { profile, level: 1, rng, now: now + 6 * 60e3 }).answer === 'ø') count++;
  assert.ok(count > 60, `ø valgt ${count}/150`);
});

test('confusionFor returnerer nøgle for forkert valg og null for rigtigt', () => {
  const profile = createProfile('Test');
  const rng = seededRng(2);
  const t = generateTask('vokal', { profile, level: 2, rng });
  assert.equal(t.confusionFor(t.answer), null);
  const wrong = t.choices.find((c) => c.id !== t.answer).id;
  assert.equal(t.confusionFor(wrong), `vokal:${t.answer}|${wrong}`);
});

test('Læsefyret: oplæsning tæller som hjælp og ordantal registreres', () => {
  const profile = createProfile('Test');
  const rng = seededRng(8);
  for (const level of [1, 2, 3, 4, 5]) {
    const t = generateTask('saetning', { profile, level, rng });
    assert.equal(t.speakIsHint, true);
    assert.ok(t.words >= 2);
  }
});
