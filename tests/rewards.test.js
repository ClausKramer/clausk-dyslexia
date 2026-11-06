import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, recordResult, dragonStage } from '../src/engine/adaptive.js';
import { ensureRewards, registerMission, dailyStatus, visibleStreak, buy, canBuy, equip, dragonLook, islandGrowth, worldState, noteCombo, DAILY_GOAL, DAILY_BONUS, PERFECT_BONUS, SHOP } from '../src/engine/rewards.js';
import { CATEGORY_IDS } from '../src/content/categories.js';

const DAY = 24 * 3600e3;
const T0 = new Date(2026, 10, 2, 15, 0).getTime(); // 2. nov. kl. 15 lokal tid
const ok = [{ score: 1 }, { score: 0.5 }];

test('ældre profiler migreres: pung = stjerner, standardudstyr', () => {
  const p = createProfile('A');
  delete p.wallet; delete p.owned; delete p.equipped; delete p.streak; delete p.daily; delete p.settings.world3d;
  p.stars = 42;
  ensureRewards(p);
  assert.equal(p.wallet, 42);
  assert.deepEqual(p.equipped, { color: 'color-green', hat: 'hat-none', trail: 'trail-none' });
  assert.equal(p.settings.world3d, true);
});

test('stjerner fra opgaver lander både i livstidstotal og pung', () => {
  const p = createProfile('A');
  recordResult(p, { category: 'fonem', items: [] }, { score: 1, now: T0 });
  assert.equal(p.stars, 2);
  assert.equal(p.wallet, 2);
});

test('stribe: stiger dag for dag, starter forfra efter pause, bedste bevares', () => {
  const p = createProfile('A');
  assert.equal(registerMission(p, ok, T0).streak, 1);
  assert.equal(registerMission(p, ok, T0 + 3600e3).streak, 1, 'samme dag tæller ikke dobbelt');
  assert.equal(registerMission(p, ok, T0 + DAY).streak, 2);
  assert.equal(registerMission(p, ok, T0 + 2 * DAY).streak, 3);
  assert.ok(p.badges.includes('streak-3'));
  assert.equal(registerMission(p, ok, T0 + 5 * DAY).streak, 1);
  assert.equal(p.streak.best, 3);
});

test('synlig stribe skjules, når der er gået mere end en dag', () => {
  const p = createProfile('A');
  registerMission(p, ok, T0);
  assert.equal(visibleStreak(p, T0 + DAY), 1);
  assert.equal(visibleStreak(p, T0 + 3 * DAY), 0);
});

test('dagens mål: skattekisten udbetales én gang pr. dag', () => {
  const p = createProfile('A');
  let r;
  for (let i = 0; i < DAILY_GOAL - 1; i++) { r = registerMission(p, ok, T0 + i); assert.equal(r.chest, 0); }
  const before = p.wallet;
  r = registerMission(p, ok, T0 + 100);
  assert.equal(r.chest, DAILY_BONUS);
  assert.equal(p.wallet, before + DAILY_BONUS);
  assert.equal(registerMission(p, ok, T0 + 200).chest, 0);
  assert.equal(dailyStatus(p, T0 + 300).done, true);
  assert.equal(dailyStatus(p, T0 + DAY).missions, 0, 'ny dag nulstiller målet');
  assert.equal(registerMission(p, ok, T0 + DAY).chest, 0);
  assert.equal(registerMission(p, ok, T0 + DAY + 1).chest, DAILY_BONUS);
});

test('perfekt mission giver bonus og mærke', () => {
  const p = createProfile('A');
  const r = registerMission(p, [{ score: 1 }, { score: 1 }], T0);
  assert.equal(r.perfect, true);
  assert.equal(r.perfectBonus, PERFECT_BONUS);
  assert.ok(p.badges.includes('perfect-mission'));
  assert.equal(registerMission(p, ok, T0 + DAY).perfect, false);
});

test('combo-rekord og mærke', () => {
  const p = createProfile('A');
  noteCombo(p, 4); noteCombo(p, 10); noteCombo(p, 3);
  assert.equal(p.comboBest, 10);
  registerMission(p, ok, T0);
  assert.ok(p.badges.includes('combo-10'));
});

test('butik: kan ikke købe uden stjerner, køb trækker fra pungen og tager tingen på', () => {
  const p = createProfile('A');
  assert.equal(canBuy(p, 'hat-crown').reason, 'mangler');
  assert.equal(buy(p, 'hat-crown').ok, false);
  p.wallet = 150;
  const r = buy(p, 'hat-crown');
  assert.equal(r.ok, true);
  assert.equal(p.wallet, 50);
  assert.equal(p.equipped.hat, 'hat-crown');
  assert.equal(canBuy(p, 'hat-crown').reason, 'ejet');
  assert.equal(equip(p, 'hat-none'), true);
  assert.equal(equip(p, 'hat-wizard'), false, 'kan ikke tage noget på, man ikke ejer');
  assert.equal(p.equipped.hat, 'hat-none');
  assert.equal(canBuy(p, 'findes-ikke').reason, 'ukendt');
});

test('butikkens varer er unikke og alle typer har en gratis standard', () => {
  assert.equal(new Set(SHOP.map((i) => i.id)).size, SHOP.length);
  for (const k of ['color', 'hat', 'trail']) assert.ok(SHOP.some((i) => i.kind === k && i.price === 0));
});

test('dragens udseende følger stjerner og udstyr', () => {
  const p = createProfile('A');
  assert.equal(dragonLook(p).stage, 0);
  p.stars = 200; p.wallet = 200;
  buy(p, 'color-blue'); buy(p, 'trail-fire');
  const look = dragonLook(p);
  assert.equal(look.stage, dragonStage(200).index);
  assert.equal(look.color, '#3d7fd9');
  assert.equal(look.trail, '#ff7a3d');
});

test('øernes vækst stiger med niveau, mestring og antal opgaver', () => {
  assert.equal(islandGrowth(undefined), 0);
  assert.equal(islandGrowth({ attempts: 0, level: 1, mastery: 0.5 }), 0);
  const a = islandGrowth({ attempts: 5, level: 1, mastery: 0.5 });
  const b = islandGrowth({ attempts: 20, level: 2, mastery: 0.7 });
  const c = islandGrowth({ attempts: 40, level: 3, mastery: 0.9 });
  assert.ok(a >= 1 && a <= b && b <= c && c === 4, `${a} ${b} ${c}`);
});

test('verdenstilstand markerer svageste og stærkeste ø', () => {
  const p = createProfile('A');
  p.unlockAll = true;
  p.skills.vokal = { mastery: 0.2, level: 1, attempts: 10, history: [] };
  p.skills.fonem = { mastery: 0.9, level: 2, attempts: 12, history: [] };
  const w = worldState(p);
  assert.equal(w.islands.length, CATEGORY_IDS.length);
  assert.equal(w.islands.find((i) => i.id === 'vokal').focus, true);
  assert.equal(w.islands.find((i) => i.id === 'fonem').strong, true);
  assert.equal(worldState(null).labels, false);
});
