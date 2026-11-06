// Gamification: daglig stribe, dagens mål, skattekiste, dragebutik og øernes vækst.
// Rene funktioner over profilen, så de kan testes uden browser.
//
// Designprincipper (se docs/forskning.md, afsnit 5):
//  * Belønninger kommer fra indsats og fremgang – aldrig fra hastighed.
//  * Ingen straf: en brudt stribe nævnes ikke; "bedste stribe" bevares.
//  * Stjerner har to roller: livstids-stjerner får dragen til at vokse (kan ikke mistes),
//    og en pung, der kan bruges i butikken.

import { CATEGORIES } from '../content/categories.js';
import { isUnlocked, dragonStage } from './adaptive.js';

export const DAILY_GOAL = 2;        // missioner pr. dag
export const DAILY_BONUS = 10;      // stjerner i skattekisten
export const PERFECT_BONUS = 5;     // alle opgaver rigtige i første forsøg

export const SHOP = [
  { id: 'color-green', kind: 'color', name: 'Skovgrøn', price: 0, icon: '🟢', value: '#3fae5a', belly: '#d4ecaa' },
  { id: 'color-blue', kind: 'color', name: 'Havblå', price: 30, icon: '🔵', value: '#3d7fd9', belly: '#c4e2ff' },
  { id: 'color-red', kind: 'color', name: 'Ildrød', price: 50, icon: '🔴', value: '#e0483e', belly: '#ffd1a8' },
  { id: 'color-purple', kind: 'color', name: 'Troldlilla', price: 50, icon: '🟣', value: '#8a55d6', belly: '#e6d4ff' },
  { id: 'color-pink', kind: 'color', name: 'Lyserød', price: 70, icon: '🩷', value: '#f077b0', belly: '#ffe0ef' },
  { id: 'color-gold', kind: 'color', name: 'Guld', price: 120, icon: '🟡', value: '#e8b21c', belly: '#fff2b8' },
  { id: 'color-night', kind: 'color', name: 'Nattehimmel', price: 150, icon: '⚫', value: '#2f2b55', belly: '#9d93e6' },
  { id: 'hat-none', kind: 'hat', name: 'Ingen hat', price: 0, icon: '🚫' },
  { id: 'hat-cap', kind: 'hat', name: 'Kasket', price: 30, icon: '🧢' },
  { id: 'hat-party', kind: 'hat', name: 'Festhat', price: 40, icon: '🥳' },
  { id: 'hat-wizard', kind: 'hat', name: 'Troldmandshat', price: 80, icon: '🧙' },
  { id: 'hat-crown', kind: 'hat', name: 'Krone', price: 100, icon: '👑' },
  { id: 'trail-none', kind: 'trail', name: 'Intet spor', price: 0, icon: '🚫' },
  { id: 'trail-sparkle', kind: 'trail', name: 'Stjernestøv', price: 60, icon: '✨', value: '#ffe066' },
  { id: 'trail-fire', kind: 'trail', name: 'Ildspor', price: 90, icon: '🔥', value: '#ff7a3d' },
  { id: 'trail-ice', kind: 'trail', name: 'Isspor', price: 90, icon: '❄️', value: '#9fe8ff' },
  { id: 'trail-rainbow', kind: 'trail', name: 'Regnbue', price: 140, icon: '🌈', value: 'rainbow' },
];
export const SHOP_KINDS = [
  { kind: 'color', name: 'Farver' },
  { kind: 'hat', name: 'Hatte' },
  { kind: 'trail', name: 'Spor' },
];
export const shopItem = (id) => SHOP.find((i) => i.id === id);

/** Tilføjer manglende felter på ældre profiler. Kan kaldes flere gange. */
export function ensureRewards(profile) {
  if (profile.wallet === undefined) profile.wallet = profile.stars || 0;
  profile.owned ||= ['color-green', 'hat-none', 'trail-none'];
  profile.equipped ||= { color: 'color-green', hat: 'hat-none', trail: 'trail-none' };
  profile.streak ||= { current: 0, best: 0, lastDay: null };
  profile.daily ||= { day: null, missions: 0, claimed: false };
  profile.comboBest ||= 0;
  if (profile.settings && profile.settings.world3d === undefined) profile.settings.world3d = true;
  return profile;
}

export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayDiff(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/** Dagens mål set fra i dag (nulstilles ved ny dag uden at ændre profilen). */
export function dailyStatus(profile, now = Date.now()) {
  ensureRewards(profile);
  const today = dayKey(now);
  const d = profile.daily.day === today ? profile.daily : { day: today, missions: 0, claimed: false };
  return { goal: DAILY_GOAL, missions: Math.min(d.missions, DAILY_GOAL), done: d.missions >= DAILY_GOAL, claimed: d.claimed };
}

/** Den stribe, der vises i dag: kun hvis der er spillet i dag eller i går. */
export function visibleStreak(profile, now = Date.now()) {
  ensureRewards(profile);
  const s = profile.streak;
  if (!s.lastDay) return 0;
  return dayDiff(s.lastDay, dayKey(now)) <= 1 ? s.current : 0;
}

/**
 * Kaldes når en mission er færdig. Opdaterer stribe og dagens mål og udbetaler skattekisten.
 * results: [{score}] for missionen.
 */
export function registerMission(profile, results, now = Date.now()) {
  ensureRewards(profile);
  const today = dayKey(now);
  const out = { streak: 0, streakGrew: false, daily: null, chest: 0, perfect: false, perfectBonus: 0, newBadges: [] };

  const s = profile.streak;
  if (s.lastDay !== today) {
    s.current = s.lastDay && dayDiff(s.lastDay, today) === 1 ? s.current + 1 : 1;
    s.lastDay = today;
    s.best = Math.max(s.best, s.current);
    out.streakGrew = true;
  }
  out.streak = s.current;

  if (profile.daily.day !== today) profile.daily = { day: today, missions: 0, claimed: false };
  profile.daily.missions++;
  if (profile.daily.missions >= DAILY_GOAL && !profile.daily.claimed) {
    profile.daily.claimed = true;
    out.chest = DAILY_BONUS;
  }
  out.daily = dailyStatus(profile, now);

  out.perfect = results.length > 0 && results.every((r) => r.score >= 1);
  if (out.perfect) out.perfectBonus = PERFECT_BONUS;

  const bonus = out.chest + out.perfectBonus;
  profile.stars += bonus;
  profile.wallet += bonus;

  const add = (id) => { if (!profile.badges.includes(id)) { profile.badges.push(id); out.newBadges.push(id); } };
  if (out.perfect) add('perfect-mission');
  if (s.current >= 3) add('streak-3');
  if (s.current >= 7) add('streak-7');
  if (s.current >= 30) add('streak-30');
  if (profile.comboBest >= 10) add('combo-10');
  return out;
}

export function noteCombo(profile, combo) {
  ensureRewards(profile);
  profile.comboBest = Math.max(profile.comboBest, combo);
}

// ---------- Butik ----------

export function canBuy(profile, id) {
  ensureRewards(profile);
  const item = shopItem(id);
  if (!item) return { ok: false, reason: 'ukendt' };
  if (profile.owned.includes(id)) return { ok: false, reason: 'ejet' };
  if (profile.wallet < item.price) return { ok: false, reason: 'mangler', missing: item.price - profile.wallet };
  return { ok: true };
}

export function buy(profile, id) {
  const check = canBuy(profile, id);
  if (!check.ok) return check;
  const item = shopItem(id);
  profile.wallet -= item.price;
  profile.owned.push(id);
  profile.equipped[item.kind] = id;
  return { ok: true, item };
}

export function equip(profile, id) {
  ensureRewards(profile);
  const item = shopItem(id);
  if (!item || !profile.owned.includes(id)) return false;
  profile.equipped[item.kind] = id;
  return true;
}

/** Hvordan dragen ser ud (bruges af 3D-verdenen). */
export function dragonLook(profile) {
  if (!profile) return { stage: 3, color: '#3fae5a', belly: '#d4ecaa', hat: 'hat-none', trail: null };
  ensureRewards(profile);
  const color = shopItem(profile.equipped.color) || SHOP[0];
  const trail = shopItem(profile.equipped.trail);
  return {
    stage: dragonStage(profile.stars).index,
    color: color.value,
    belly: color.belly,
    hat: profile.equipped.hat,
    trail: trail && trail.value ? trail.value : null,
  };
}

// ---------- Øernes vækst ----------

/** 0 = uberørt, 1-4 = øen blomstrer mere og mere op i takt med niveau, mestring og antal opgaver. */
export function islandGrowth(skill) {
  if (!skill || !skill.attempts) return 0;
  const points = (skill.level - 1) * 1.5 + skill.mastery * 1.5 + Math.min(skill.attempts, 40) / 20;
  return Math.max(1, Math.min(4, Math.round(points)));
}

/** Samlet tilstand til 3D-verdenen. profile = null giver en dekorativ verden til startskærmen. */
export function worldState(profile) {
  if (!profile) {
    return {
      look: dragonLook(null),
      islands: CATEGORIES.map((c) => ({ id: c.id, unlocked: true, growth: 2, level: 1, focus: false, strong: false })),
      labels: false,
    };
  }
  const attempted = CATEGORIES.filter((c) => isUnlocked(profile, c.id) && profile.skills[c.id]?.attempts >= 5);
  const weakest = attempted.filter((c) => profile.skills[c.id].mastery < 0.45).sort((a, b) => profile.skills[a.id].mastery - profile.skills[b.id].mastery)[0];
  const strongest = attempted.filter((c) => profile.skills[c.id].mastery >= 0.7).sort((a, b) => profile.skills[b.id].mastery - profile.skills[a.id].mastery)[0];
  return {
    look: dragonLook(profile),
    islands: CATEGORIES.map((c) => {
      const s = profile.skills[c.id];
      return {
        id: c.id,
        unlocked: isUnlocked(profile, c.id),
        growth: islandGrowth(s),
        level: s ? s.level : 1,
        focus: weakest?.id === c.id,
        strong: strongest?.id === c.id,
      };
    }),
    labels: true,
  };
}
