// Lydøen – spillets skærme og flow. Ren DOM uden frameworks; 3D-verdenen (src/world) indlæses ved siden af,
// og spillet falder tilbage til en 2D-udgave, hvis WebGL ikke findes (eller ?2d står i adressen).
import { CATEGORIES, categoryById } from './content/categories.js';
import { isVowel } from './content/phonemes.js';
import { createProfile, skill, isUnlocked, planMission, recordResult, finishMission, analyze, dragonStage, badgeInfo, LEVEL_MAX, unlockedCategories } from './engine/adaptive.js';
import { ensureRewards, registerMission, dailyStatus, visibleStreak, worldState, SHOP, SHOP_KINDS, shopItem, buy, equip, canBuy, noteCombo } from './engine/rewards.js';
import { generateTask } from './tasks/index.js';
import { loadAll, saveAll, exportJson, importJson } from './storage.js';
import { initSpeech, speakParts, say, stop as stopSpeech, unlock as unlockSpeech, hasSpeech, hasDanishVoice, setRate } from './speech.js';
import { playCorrect, playWrong, playTap, playFanfare, resumeAudio, setSoundsEnabled } from './audio.js';
import { escapeHtml as esc, pick } from './util.js';

const app = document.getElementById('app');
const AVATARS = ['🐉', '🦊', '🐼', '🦄', '🐸', '🦉', '🐬', '🦋', '🐯', '🐙'];
const PRAISE = ['Flot!', 'Super!', 'Sådan!', 'Godt gået!', 'Du kan det!', 'Perfekt!', 'Ja!', 'Rigtigt!'];
const DRAGON_HELLO = ['Hej {n}! Skal vi læse?', 'Vrrrum! Jeg er klar, {n}!', 'Hihi, det kilder!', 'Lad os flyve til en ø, {n}!'];
const MISSION_LENGTH = 8;
const params = new URLSearchParams(location.search);

const state = {
  data: loadAll(),
  profile: null,
  screen: 'start',
  mission: null,
  parentOk: false,
  gate: null,
  newName: '',
  newAvatar: AVATARS[0],
  shopTab: 'color',
  busy: false,
};
state.data.profiles.forEach(ensureRewards);

// ---------- 3D-verden ----------
let world = null;
async function initWorld() {
  if (params.has('2d')) return;
  try {
    const m = await import('./world/index.js');
    world = m.createWorld({
      container: document.getElementById('world'),
      labels: document.getElementById('world-labels'),
      onIslandTap: (cat) => onIslandTap(cat),
      onDragonTap: () => onDragonTap(),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
  } catch (e) {
    console.warn('3D-verdenen kunne ikke starte – bruger 2D.', e);
    world = null;
  }
}
const worldOn = () => !!world && (state.profile ? state.profile.settings.world3d !== false : true);
const WORLD_MODE = { start: 'home', home: 'home', mission: 'mission', summary: 'celebrate', shop: 'lair', badges: 'hidden', parent: 'hidden' };
function syncWorld() {
  if (!world) return;
  if (!worldOn()) { world.setMode('hidden'); return; }
  const ws = worldState(state.screen === 'start' ? null : state.profile);
  if (state.screen === 'start') ws.labels = false;
  world.setState(ws);
  world.setMode(WORLD_MODE[state.screen] || 'hidden');
}

// ---------- hjælpere ----------
function persist() { saveAll(state.data); }
function go(screen) { stopSpeech(); state.screen = screen; render(); window.scrollTo(0, 0); }
function applySettings() {
  const s = state.profile?.settings || {};
  document.body.classList.toggle('wide-spacing', s.wideSpacing !== false);
  document.body.classList.toggle('big-text', !!s.bigText);
  document.body.classList.toggle('uppercase', !!s.uppercase);
  setRate(s.rate || 0.9);
  setSoundsEnabled(s.sounds !== false);
}
function masteryStars(s) {
  if (!s || s.attempts === 0) return '☆☆☆';
  const n = Math.min(3, Math.max(1, s.level));
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}
function fmtDate(ts) { return new Date(ts).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }); }
function confetti() {
  const host = document.getElementById('confetti');
  const colors = ['#f5b301', '#2bb3c0', '#e54b6b', '#3aa655', '#7c5cff', '#ff7a59'];
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + 'vw';
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = Math.random() * 0.4 + 's';
    host.appendChild(s);
    setTimeout(() => s.remove(), 2200);
  }
}
function starPop(n) {
  if (!n) return;
  const el = document.createElement('div');
  el.className = 'star-pop';
  el.textContent = `+${n} ⭐`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}
const tileHtml = (t) => `<span class="tile readable ${isVowel(t) ? 'vowel' : ''}">${esc(t)}</span>`;
function lockedText(cat) { const c = categoryById(cat); return `${c.name} åbner, når du har øvet i ${c.prereq.map((q) => categoryById(q.cat).name).join(' og ')}`; }

function dragonCard(p, compact = false) {
  const d = dragonStage(p.stars);
  const pct = d.next ? Math.round(((p.stars - d.min) / (d.next.min - d.min)) * 100) : 100;
  return `<div class="hud-card dragon-card ${compact ? 'compact' : ''}">
    <span class="big">${d.icon}</span>
    <div class="grow">
      <div class="row spread"><strong>${d.name}</strong><span class="muted small-text">${d.next ? `${d.next.min - p.stars} ⭐ til ${d.next.name}` : 'Fuldt udvokset!'}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
    </div>
  </div>`;
}
function goalCard(p) {
  const g = dailyStatus(p);
  const dots = Array.from({ length: g.goal }, (_, i) => `<i class="${i < g.missions ? 'on' : ''}"></i>`).join('');
  return `<div class="hud-card goal-card" title="Dagens mål">
    <span class="chest ${g.done ? 'open' : ''}">${g.done ? '🎉' : '🎁'}</span>
    <div><strong>Dagens mål</strong><div class="goal-dots">${dots}<span class="muted small-text">${g.done ? 'Klaret!' : `${g.missions}/${g.goal} missioner`}</span></div></div>
  </div>`;
}

// ---------- skærme ----------
const screens = {};

screens.start = () => `
  <div class="start-wrap">
    <div class="hero card-soft">
      <div class="logo">🏝️</div>
      <h1>Lydøen</h1>
      <p class="muted">Flyv med din drage mellem øerne – og bliv god til at læse undervejs.</p>
    </div>
    ${!hasSpeech() ? '<p class="notice">Din browser kan ikke læse højt. Prøv Chrome, Edge eller Safari.</p>' : ''}
    ${hasSpeech() && !hasDanishVoice() ? '<p class="notice">Der er ikke fundet en dansk stemme i din browser. Spillet virker, men oplæsningen bliver dårlig. Installér en dansk stemme i styresystemets indstillinger (Tale/Talesyntese).</p>' : ''}
    ${state.data.profiles.length ? `<div class="card-soft"><h2>Hvem spiller?</h2><div class="profiles">
      ${state.data.profiles.map((p) => `<button class="profile-btn" data-action="pick-profile" data-id="${p.id}"><span class="av">${p.avatar}</span><span><span class="nm">${esc(p.name)}</span><br><span class="muted">⭐ ${p.stars} · ${dragonStage(p.stars).icon}</span></span></button>`).join('')}
    </div></div>` : ''}
    <div class="card-soft">
      <h3>Ny spiller</h3>
      <input class="input" id="new-name" placeholder="Dit navn" value="${esc(state.newName)}" maxlength="20">
      <div class="avatars">${AVATARS.map((a) => `<button data-action="pick-avatar" data-av="${a}" class="${a === state.newAvatar ? 'sel' : ''}">${a}</button>`).join('')}</div>
      <button class="btn primary" data-action="create-profile">Start eventyret</button>
    </div>
  </div>`;

screens.home = () => {
  const p = state.profile;
  const streak = visibleStreak(p);
  const top = `<div class="hud-top">
      <button class="hud-chip who" data-action="to-start" title="Skift spiller"><span class="av">${p.avatar}</span>${esc(p.name)}</button>
      <div class="row tight">${streak ? `<span class="hud-chip" title="Dage i træk">🔥 ${streak}</span>` : ''}<span class="hud-chip" title="Stjerner">⭐ ${p.stars}</span></div>
    </div>`;
  const buttons = `<div class="row center-row">
      <button class="btn small" data-action="to-shop">🐉 Dragehulen</button>
      <button class="btn small" data-action="to-badges">🏅 Mærker (${p.badges.length})</button>
      <button class="btn small" data-action="to-parent">🔐 Voksen</button>
    </div>`;

  if (worldOn()) {
    return `<div class="hud">
      ${top}
      <div class="hud-cards">${dragonCard(p, true)}${goalCard(p)}</div>
      <div class="hud-bottom">
        <button class="btn primary" data-action="play">▶ Spil!</button>
        ${buttons}
        <p class="hud-hint">Tryk på en ø for at øve dér · træk for at dreje øen</p>
      </div>
    </div>`;
  }

  const an = analyze(p);
  const weakest = an.weak[0]?.id;
  const strongest = an.strong[0]?.id;
  return `${top}
  <div class="hud-cards static">${dragonCard(p)}${goalCard(p)}</div>
  <div class="play-wrap">
    <button class="btn primary" data-action="play">▶ Spil!</button>
    <p class="muted" style="margin-top:8px">Dragen vælger opgaver til dig</p>
  </div>
  <h2>Steder på øen</h2>
  <div class="map">
    ${CATEGORIES.map((c) => {
      const s = p.skills[c.id];
      const open = isUnlocked(p, c.id);
      return `<button class="place ${open ? '' : 'locked'}" style="--c:${c.color}" data-action="${open ? 'play-focus' : 'locked'}" data-cat="${c.id}" title="${open ? c.desc : lockedText(c.id)}">
        ${c.id === weakest ? '<span class="focus-tag">øv her</span>' : c.id === strongest ? '<span class="focus-tag good">stærk</span>' : ''}
        <span class="ic">${c.icon}</span><span class="nm">${c.name}</span><span class="sk">${c.skill}</span><span class="lv">${masteryStars(s)}</span>
      </button>`;
    }).join('')}
  </div>
  <div class="footer-links">${buttons}</div>`;
};

screens.badges = () => `
  <div class="topbar"><button class="btn small" data-action="to-home">← Tilbage</button><h2 style="margin:0">Mine mærker</h2><span></span></div>
  ${state.profile.badges.length ? `<div class="badges">${state.profile.badges.map((b) => { const i = badgeInfo(b); return `<div class="badge"><span class="bi">${i.icon}</span> ${esc(i.name)}</div>`; }).join('')}</div>` : '<p class="center muted">Ingen mærker endnu – spil en mission!</p>'}`;

screens.shop = () => {
  const p = state.profile;
  const items = SHOP.filter((i) => i.kind === state.shopTab);
  const preview = worldOn() ? '' : `<div class="shop-preview card-soft"><span class="big">${dragonStage(p.stars).icon}</span><span class="swatch" style="background:${shopItem(p.equipped.color).value}"></span><span>${shopItem(p.equipped.hat).icon}</span><span>${shopItem(p.equipped.trail).icon}</span></div>`;
  return `<div class="shop">
    <div class="hud-top">
      <button class="hud-chip" data-action="to-home">← Hjem</button>
      <span class="hud-chip"><strong>Dragehulen</strong></span>
      <span class="hud-chip" title="Stjerner du kan bruge">⭐ ${p.wallet}</span>
    </div>
    ${preview}
    <div class="shop-panel card-soft">
      <div class="tabs">${SHOP_KINDS.map((k) => `<button class="tab ${k.kind === state.shopTab ? 'on' : ''}" data-action="shop-tab" data-kind="${k.kind}">${k.name}</button>`).join('')}</div>
      <div class="shop-grid">${items.map((it) => {
        const owned = p.owned.includes(it.id);
        const on = p.equipped[it.kind] === it.id;
        const check = canBuy(p, it.id);
        const status = on ? '✅ Valgt' : owned ? 'Brug' : check.ok ? `⭐ ${it.price}` : `⭐ ${it.price}`;
        return `<button class="shop-item ${on ? 'on' : ''} ${!owned && !check.ok ? 'poor' : ''}" data-action="shop-item" data-id="${it.id}">
          <span class="si-icon" ${it.kind === 'color' ? `style="background:${it.value}"` : ''}>${it.kind === 'color' ? '' : it.icon}</span>
          <span class="si-name readable">${esc(it.name)}</span>
          <span class="si-status">${status}</span>
        </button>`;
      }).join('')}</div>
      <p class="muted small-text center">Du får stjerner for hver opgave. Stjerner du bruger her, tæller stadig med til at få dragen til at vokse.</p>
    </div>
  </div>`;
};

screens.mission = () => {
  const m = state.mission;
  const t = m.current.task;
  const c = categoryById(t.category);
  const cur = m.current;
  const dots = m.plan.map((_, i) => {
    const r = m.results[i];
    const cls = r ? (r.score >= 1 ? 'ok' : r.score > 0 ? 'help' : 'bad') : i === m.index ? 'cur' : '';
    return `<i class="${cls}"></i>`;
  }).join('');

  let stim = '';
  if (t.stimulus) {
    const s = t.stimulus;
    stim += s.emoji ? `<div class="emoji ${s.emoji.length > 6 ? 'small' : ''}">${s.emoji}</div>` : '';
    if (s.tiles) stim += `<div class="tiles-inline">${s.tiles.map(tileHtml).join('')}</div>`;
    if (s.text) stim += s.text.includes(' ') ? `<div class="sentence readable">${esc(s.text)}</div>` : `<div class="word readable ${s.big ? 'big' : ''}">${esc(s.text)}</div>`;
    if (s.sub) stim += `<div class="sub">${esc(s.sub)}</div>`;
  }

  let body = '';
  if (t.mode === 'choice') {
    body = `<div class="choices ${t.choices.length === 2 ? 'n2' : ''}">${t.choices.map((ch) => {
      const st = cur.choiceState[ch.id] || '';
      return `<button class="choice ${ch.emoji ? 'has-emoji' : ''} ${st}" data-action="choose" data-id="${esc(ch.id)}" ${st === 'wrong' || st === 'gone' || (cur.done && st !== 'correct') ? 'disabled' : ''}>
        ${ch.emoji ? `<span class="ce">${ch.emoji}</span>` : ''}${ch.label ? `<span class="readable">${esc(ch.label)}</span>` : ''}
      </button>`;
    }).join('')}</div>`;
  } else {
    body = `<div class="seq">
      <div class="slots">${t.answerSeq.map((id, i) => `<div class="slot ${i < cur.seqPos ? 'filled' : i === cur.seqPos ? 'next' : ''}"><span class="readable">${i < cur.seqPos ? esc(t.tiles.find((x) => x.id === id).label) : ''}</span></div>`).join('')}</div>
      <div class="tile-pool">${t.tiles.map((tile) => `<button class="tile-btn ${cur.tileState[tile.id] || ''} ${cur.usedTiles.includes(tile.id) ? 'used' : ''}" data-action="tile" data-id="${esc(tile.id)}"><span class="readable">${esc(tile.label)}</span></button>`).join('')}</div>
    </div>`;
  }

  return `<div class="task">
    <div class="task-top">
      <button class="btn small ghost" data-action="quit" aria-label="Stop missionen">✖</button>
      <div class="dots">${dots}</div>
      <div class="row tight">${m.combo >= 2 ? `<span class="combo" title="Rigtige i træk">⚡ ${m.combo}</span>` : ''}<span class="cat-tag" style="--c:${c.color}">${c.icon} <span class="hide-narrow">${c.name}</span></span></div>
    </div>
    <div class="instruction"><span>${esc(t.instruction)}</span><button class="speak-btn ${t.speakIsHint ? 'hint-cost' : ''}" data-action="repeat" title="Hør igen">🔊</button></div>
    <div class="stimulus">${stim}</div>
    ${body}
    <div class="feedback ${cur.feedbackClass || ''}">${cur.feedback || ''}</div>
    <div class="task-bottom">
      ${cur.done ? `<button class="btn primary" data-action="next">Videre ➜</button>` : `<button class="btn" data-action="hint" ${cur.hintUsed ? 'disabled' : ''}>💡 Hjælp</button>`}
    </div>
  </div>`;
};

screens.summary = () => {
  const m = state.mission;
  const p = state.profile;
  const ok = m.results.filter((r) => r.score >= 1).length;
  const helped = m.results.filter((r) => r.score > 0 && r.score < 1).length;
  const d = dragonStage(p.stars);
  const r = m.reward || {};
  const lines = [];
  if (m.evolved) lines.push(`<div class="reward big-reward">🎉 Din drage er vokset! Nu er den: <strong>${d.icon} ${d.name}</strong></div>`);
  if (r.chest) lines.push(`<div class="reward">🎁 Dagens mål klaret – skattekisten gav <strong>+${r.chest} ⭐</strong></div>`);
  else if (r.daily && !r.daily.done) lines.push(`<div class="reward soft">🎁 Dagens mål: ${r.daily.missions}/${r.daily.goal} missioner – én mere, så åbner skattekisten!</div>`);
  if (r.perfect) lines.push(`<div class="reward">💎 Perfekt mission – alt rigtigt i første forsøg! <strong>+${r.perfectBonus} ⭐</strong></div>`);
  if (r.streakGrew && r.streak >= 2) lines.push(`<div class="reward">🔥 ${r.streak} dage i træk!</div>`);
  if (m.bestCombo >= 3 && !r.perfect) lines.push(`<div class="reward soft">⚡ ${m.bestCombo} rigtige i træk</div>`);
  if (m.levelUps.length) lines.push(`<div class="reward">🚀 Du rykkede op i ${m.levelUps.map((c) => categoryById(c).name).join(', ')}!</div>`);
  return `<div class="summary">
    <div class="card-soft summary-card">
      ${worldOn() ? '' : `<div class="big">${d.icon}</div>`}
      <h1>Mission klar!</h1>
      <p class="stat">⭐ ${m.starsEarned} stjerner · ✅ ${ok}${helped ? ` · 💡 ${helped}` : ''} af ${m.results.length}</p>
      ${lines.join('')}
      ${m.newBadges.length ? `<div class="badges">${m.newBadges.map((b) => { const i = badgeInfo(b); return `<div class="badge"><span class="bi">${i.icon}</span> Nyt mærke: ${esc(i.name)}</div>`; }).join('')}</div>` : ''}
      <div class="row center-row" style="margin-top:18px">
        <button class="btn primary" data-action="play">▶ Spil igen</button>
        <button class="btn" data-action="to-home">🏝️ Hjem</button>
        <button class="btn" data-action="to-shop">🐉 Dragehulen (⭐ ${p.wallet})</button>
      </div>
    </div>
  </div>`;
};

screens.parent = () => {
  if (!state.parentOk) {
    if (!state.gate) { const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4); state.gate = { a, b }; }
    return `<div class="gate card">
      <h2>Voksenzone</h2>
      <p class="muted">Hvad er ${state.gate.a} × ${state.gate.b}?</p>
      <input class="input" id="gate-input" inputmode="numeric" autocomplete="off">
      <div class="row" style="justify-content:center;margin-top:14px">
        <button class="btn primary" data-action="gate-check">Åbn</button>
        <button class="btn ghost" data-action="to-home">Tilbage</button>
      </div>
    </div>`;
  }
  const p = state.profile;
  const an = analyze(p);
  const s = p.settings;
  const trendArrow = (t) => (t > 0.1 ? '↑' : t < -0.1 ? '↓' : '→');
  const statusName = { ny: 'Ny', svag: 'Svag', øver: 'Øver', stærk: 'Stærk' };
  const lastSessions = p.sessions.slice(-10).reverse();
  const toggle = (key, label, hint = '') => `<div class="toggle"><span>${label}${hint ? `<br><span class="muted" style="font-size:0.85em">${hint}</span>` : ''}</span><button class="switch ${s[key] !== false && s[key] ? 'on' : ''}" data-action="toggle" data-key="${key}" aria-label="${label}"></button></div>`;
  return `<div class="parent">
    <div class="topbar"><button class="btn small" data-action="to-home">← Til spillet</button><h2 style="margin:0">${p.avatar} ${esc(p.name)}</h2><span></span></div>
    <p class="muted">${an.totalAnswers ? `${p.missionsPlayed} missioner · ${Math.round(an.overallRate * 100)} % rigtige i de seneste opgaver · ${p.stars} stjerner · bedste stribe ${p.streak.best} dage` : 'Ingen opgaver endnu.'}</p>

    <h2>Anbefalinger</h2>
    ${an.recommendations.length ? an.recommendations.map((r) => `<div class="reco ${r.kind}">${esc(r.text)}</div>`).join('') : '<p class="muted">Spil nogle missioner, så kommer der anbefalinger her.</p>'}

    <h2>Styrker og svagheder</h2>
    <p class="muted">Mestring er et løbende skøn (0–100 %) ud fra de seneste svar. Niveau 1–3 er sværhedsgraden; spillet justerer den selv, men du kan ændre den her. I 3D-verdenen vokser øerne med fremskridtet, og den svageste ø får en gul ring.</p>
    ${an.cats.map((c) => `<div class="card cat-card" style="--c:${c.def.color}">
      <div class="title">${c.def.icon} ${esc(c.def.name)} <span class="muted" style="font-weight:400">· ${esc(c.def.skill)}</span> <span class="pill ${c.status}">${statusName[c.status]}</span>${c.unlocked ? '' : ' <span class="pill">🔒 låst</span>'}</div>
      <div class="lvl-ctl"><span class="muted">Niveau</span><button data-action="level" data-cat="${c.id}" data-d="-1" ${c.level <= 1 ? 'disabled' : ''}>−</button><strong>${c.level}</strong><button data-action="level" data-cat="${c.id}" data-d="1" ${c.level >= LEVEL_MAX ? 'disabled' : ''}>+</button></div>
      <div class="bar cat" style="grid-column:1/-1"><i style="width:${c.attempts ? Math.round(c.mastery * 100) : 0}%"></i></div>
      <div class="meta">${c.attempts ? `Mestring ${Math.round(c.mastery * 100)} % · ${c.attempts} opgaver · ${Math.round(c.rate * 100)} % rigtige i alt · seneste 10: ${c.recentRate !== null ? Math.round(c.recentRate * 100) + ' %' : '–'} ${trendArrow(c.trend)}${c.avgMs ? ` · gns. ${(c.avgMs / 1000).toFixed(1)} s pr. opgave` : ''}` : 'Ikke øvet endnu'}</div>
    </div>`).join('')}

    <h2>Forvekslinger</h2>
    ${an.confusions.length ? `<div class="chips">${an.confusions.map((c) => `<span class="chip">${esc(c.expected)} ↔ ${esc(c.chosen)} <span class="muted">×${c.n}</span></span>`).join('')}</div><p class="muted" style="margin-top:8px">Viser "rigtigt ↔ valgt", når det er sket mindst to gange. Disse brikker kommer oftere igen i spillet.</p>` : '<p class="muted">Ingen tydelige forvekslinger endnu.</p>'}

    <h2>Brikker der driller</h2>
    ${an.hardItems.length ? `<div class="chips">${an.hardItems.map((it) => `<span class="chip">${esc(it.key.split(':')[1])} <span class="muted">${it.fails} fejl</span></span>`).join('')}</div>` : '<p class="muted">Ingen endnu.</p>'}

    ${an.readingSpeed.recent ? `<h2>Læsehastighed (Læsefyret)</h2><p>Seneste: ca. ${Math.round(an.readingSpeed.recent)} ord/min${an.readingSpeed.earlier ? ` (før: ${Math.round(an.readingSpeed.earlier)})` : ''}. Tallet er groft – det måler tid fra sætningen vises, til der svares.</p>` : ''}

    <h2>Seneste missioner</h2>
    ${lastSessions.length ? `<table><tr><th>Dato</th><th>Sted</th><th>Rigtige</th><th>Stjerner</th><th>Tid</th></tr>${lastSessions.map((x) => `<tr><td>${fmtDate(x.ts)}</td><td>${x.focus ? categoryById(x.focus).name : 'Blandet'}</td><td>${x.correct}${x.helped ? ` (+${x.helped} hjulpet)` : ''} / ${x.n}</td><td>⭐ ${x.stars}</td><td>${Math.round(x.durationMs / 60000)} min</td></tr>`).join('')}</table>` : '<p class="muted">Ingen endnu.</p>'}

    <h2>Indstillinger</h2>
    <div class="card">
      ${toggle('autoRead', 'Læs opgaven højt automatisk')}
      ${toggle('world3d', '3D-verden med flyvende drage', world ? 'Slå fra på langsomme enheder – spillet bruger så en enkel 2D-udgave' : 'Ikke tilgængelig i denne browser (kræver WebGL)')}
      ${toggle('wideSpacing', 'Ekstra luft mellem bogstaver', 'Anbefales ved ordblindhed')}
      ${toggle('bigText', 'Større tekst')}
      ${toggle('uppercase', 'STORE BOGSTAVER i opgaverne', 'Normalt er små bogstaver bedst at øve, da det er dem, man møder i bøger')}
      ${toggle('sounds', 'Spil-lyde (bip ved rigtigt/forkert)')}
      <div class="toggle"><span>Talehastighed</span><span class="row"><button class="btn small" data-action="rate" data-d="-0.1">Langsommere</button><strong>${Math.round((s.rate || 0.9) * 100)} %</strong><button class="btn small" data-action="rate" data-d="0.1">Hurtigere</button></span></div>
      <div class="toggle"><span>Lås alle steder op<br><span class="muted" style="font-size:0.85em">Ellers åbnes steder gradvist i takt med fremskridt</span></span><button class="switch ${p.unlockAll ? 'on' : ''}" data-action="toggle-unlock"></button></div>
    </div>

    <h2>Data</h2>
    <div class="row">
      <button class="btn small" data-action="export">⬇ Gem backup (JSON)</button>
      <label class="btn small">⬆ Hent backup <input type="file" id="import-file" accept="application/json" class="hidden"></label>
      <button class="btn small danger" data-action="reset">Nulstil ${esc(p.name)}s fremskridt</button>
    </div>
    <p class="muted" style="margin-top:14px">Alt gemmes kun i denne browser. Læs mere om forskningen bag spillet i <code>docs/forskning.md</code>.</p>
  </div>`;
};

function render() {
  applySettings();
  const on = worldOn();
  document.body.classList.toggle('world-on', on);
  document.body.className = document.body.className.replace(/\bscreen-\S+/g, '').trim();
  document.body.classList.add(`screen-${state.screen}`);
  app.innerHTML = screens[state.screen]();
  syncWorld();
  if (state.screen === 'parent' && !state.parentOk) document.getElementById('gate-input')?.focus();
  if (state.screen === 'parent' && state.parentOk) document.getElementById('import-file')?.addEventListener('change', onImport);
}

// ---------- mission ----------
async function startMission(focus = null) {
  if (state.busy) return;
  const p = state.profile;
  if (worldOn() && state.screen === 'home') {
    state.busy = true;
    document.body.classList.add('busy');
    say(focus ? `Vi flyver til ${categoryById(focus).name}!` : 'Op og flyve!');
    try { await world.flyTo(focus); } finally { state.busy = false; document.body.classList.remove('busy'); }
  }
  const plan = planMission(p, { focus, n: MISSION_LENGTH });
  state.mission = { focus, plan, index: 0, results: [], startedAt: Date.now(), starsEarned: 0, starsBefore: p.stars, levelUps: [], newBadges: [], current: null, combo: 0, bestCombo: 0 };
  loadTask();
  go('mission');
  if (worldOn()) world.missionStart({ target: focus, n: plan.length });
  presentTask();
}

function loadTask() {
  const m = state.mission;
  const p = state.profile;
  const cat = m.plan[m.index];
  const task = generateTask(cat, { profile: p, level: skill(p, cat).level });
  m.current = { task, attempts: 0, hintUsed: false, spokeHint: false, seqPos: 0, seqErrors: 0, usedTiles: [], choiceState: {}, tileState: {}, confusion: null, done: false, feedback: '', feedbackClass: '', shownAt: Date.now() };
}

function presentTask() {
  const cur = state.mission.current;
  cur.shownAt = Date.now();
  if (state.profile.settings.autoRead !== false) speakParts(cur.task.speakOnStart);
}

function finishTask(score) {
  const m = state.mission;
  const cur = m.current;
  const t = cur.task;
  cur.done = true;
  const ms = Date.now() - cur.shownAt;
  const outcome = recordResult(state.profile, { category: t.category, items: t.items, confusion: cur.confusion, words: t.words }, { score, ms });
  m.results.push({ score, cat: t.category, ms });
  m.starsEarned += outcome.starsEarned;
  m.combo = score >= 1 ? m.combo + 1 : 0;
  m.bestCombo = Math.max(m.bestCombo, m.combo);
  noteCombo(state.profile, m.combo);
  if (outcome.leveledUp) m.levelUps.push(t.category);
  m.newBadges.push(...outcome.newBadges);
  persist();
  if (worldOn()) world.missionStep({ index: m.index, score, leveledUp: outcome.leveledUp });
  starPop(outcome.starsEarned);
  if (score >= 1) {
    cur.feedback = m.combo >= 3 ? `${pick(PRAISE)} ${m.combo} i træk!` : pick(PRAISE);
    cur.feedbackClass = 'ok';
    playCorrect();
    if (!worldOn()) confetti();
    const parts = [{ text: cur.feedback }];
    if (outcome.leveledUp) parts.push({ pause: 200 }, { text: `Du rykker op til niveau ${skill(state.profile, t.category).level}!` });
    speakParts(parts);
    render();
    setTimeout(nextTask, outcome.leveledUp ? 2400 : 1400);
  } else if (score > 0) {
    cur.feedback = 'Rigtigt – flot kæmpet!';
    cur.feedbackClass = 'ok';
    playCorrect();
    say(cur.feedback);
    render();
    setTimeout(nextTask, 1500);
  } else {
    cur.feedback = 'Nu ved du det til næste gang!';
    cur.feedbackClass = '';
    say(cur.feedback);
    render();
  }
}

function nextTask() {
  const m = state.mission;
  if (!m || state.screen !== 'mission') return;
  if (!m.current.done) return;
  m.index++;
  if (m.index >= m.plan.length) return endMission();
  loadTask();
  render();
  presentTask();
}

function endMission() {
  const m = state.mission;
  const p = state.profile;
  const byCat = {};
  for (const r of m.results) { const b = (byCat[r.cat] ||= { n: 0, ok: 0 }); b.n++; if (r.score >= 1) b.ok++; }
  const bonus = 3;
  const fresh = finishMission(p, {
    focus: m.focus, n: m.results.length,
    correct: m.results.filter((r) => r.score >= 1).length,
    helped: m.results.filter((r) => r.score > 0 && r.score < 1).length,
    stars: m.starsEarned + bonus, bonus, byCat, durationMs: Date.now() - m.startedAt,
  });
  m.starsEarned += bonus;
  const reward = registerMission(p, m.results);
  m.reward = reward;
  m.starsEarned += reward.chest + reward.perfectBonus;
  m.evolved = dragonStage(p.stars).index > dragonStage(m.starsBefore).index;
  m.newBadges = [...new Set([...m.newBadges, ...fresh, ...reward.newBadges])];
  persist();
  playFanfare();
  confetti();
  go('summary');
  if (worldOn()) world.celebrate({ evolved: m.evolved, levelUps: m.levelUps, target: m.focus });
  const parts = [{ text: `Mission klar! Du fik ${m.starsEarned} stjerner.` }];
  if (m.evolved) parts.push({ pause: 300 }, { text: `Din drage er vokset. Nu er den ${dragonStage(p.stars).name}!` });
  if (reward.chest) parts.push({ pause: 300 }, { text: 'Du klarede dagens mål og åbnede skattekisten!' });
  speakParts(parts);
}

function answerSpeech(t) {
  if (t.mode === 'sequence') return [{ text: t.wordText }];
  const ch = t.choices.find((c) => c.id === t.answer);
  return ch?.speak || [{ text: ch?.label || '' }];
}

function onChoose(id) {
  const cur = state.mission.current;
  const t = cur.task;
  if (cur.done) return;
  if (cur.choiceState[id] === 'wrong' || cur.choiceState[id] === 'gone') return;
  if (id === t.answer) {
    cur.choiceState[id] = 'correct';
    const score = cur.attempts >= 2 ? 0 : cur.attempts === 0 && !cur.hintUsed && !cur.spokeHint ? 1 : 0.5;
    finishTask(score);
    return;
  }
  cur.attempts++;
  cur.choiceState[id] = 'wrong';
  if (cur.attempts === 1) {
    cur.confusion = t.confusionFor ? t.confusionFor(id) : null;
    cur.feedback = 'Prøv igen 💪';
    cur.feedbackClass = 'bad';
    playWrong();
    say('Prøv igen');
  } else {
    cur.choiceState[t.answer] = 'reveal';
    for (const c of t.choices) if (c.id !== t.answer && cur.choiceState[c.id] !== 'wrong') cur.choiceState[c.id] = 'gone';
    cur.feedback = 'Her er det rigtige svar – tryk på det';
    cur.feedbackClass = '';
    playWrong();
    speakParts([{ text: 'Det rigtige svar er' }, { pause: 150 }, ...answerSpeech(t), { pause: 200 }, { text: 'Tryk på det' }]);
  }
  render();
}

function onTile(id) {
  const cur = state.mission.current;
  const t = cur.task;
  if (cur.done || cur.usedTiles.includes(id)) return;
  const tile = t.tiles.find((x) => x.id === id);
  const expectedId = t.answerSeq[cur.seqPos];
  const expected = t.tiles.find((x) => x.id === expectedId);
  if (tile.label === expected.label) {
    cur.usedTiles.push(id);
    cur.seqPos++;
    cur.tileState = {};
    playTap();
    if (cur.seqPos >= t.answerSeq.length) {
      const score = cur.seqErrors === 0 && !cur.hintUsed ? 1 : cur.seqErrors <= 2 ? 0.5 : 0;
      finishTask(score);
      return;
    }
    speakParts(tile.speak);
  } else {
    cur.seqErrors++;
    cur.tileState = { [id]: 'wrong' };
    if (!cur.confusion && t.confusionFor) cur.confusion = t.confusionFor(expected.label, tile.label);
    playWrong();
    if (cur.seqErrors >= 3) {
      cur.tileState[expectedId] = 'reveal';
      cur.feedback = 'Den næste lyd lyser grønt';
      speakParts([{ text: 'Den næste lyd er' }, { tiles: [expected.label] }]);
    } else {
      cur.feedback = 'Ikke den – prøv igen 💪';
      cur.feedbackClass = 'bad';
    }
  }
  render();
}

function onHint() {
  const cur = state.mission.current;
  const t = cur.task;
  if (cur.done || cur.hintUsed) return;
  cur.hintUsed = true;
  if (t.mode === 'choice') {
    const wrong = t.choices.filter((c) => c.id !== t.answer && !cur.choiceState[c.id]);
    if (wrong.length > 1) cur.choiceState[pick(wrong).id] = 'gone';
    else if (wrong.length === 1 && t.choices.length > 2) cur.choiceState[wrong[0].id] = 'gone';
    say('Jeg fjerner et forkert svar');
  } else {
    const dis = t.tiles.filter((x) => !t.answerSeq.includes(x.id) && !cur.usedTiles.includes(x.id));
    if (dis.length) cur.usedTiles.push(pick(dis).id);
    say('Jeg fjerner en forkert lyd');
  }
  render();
}

function onRepeat() {
  const cur = state.mission.current;
  if (cur.task.speakIsHint && !cur.done) cur.spokeHint = true;
  speakParts(cur.task.repeat);
}

// ---------- verden: tryk ----------
function onIslandTap(cat) {
  if (state.screen !== 'home' || state.busy || !state.profile) return;
  unlockSpeech();
  resumeAudio();
  if (isUnlocked(state.profile, cat)) startMission(cat); else say(lockedText(cat));
}
function onDragonTap() {
  playTap();
  const name = state.profile?.name || '';
  if (state.screen === 'home' || state.screen === 'start' || state.screen === 'shop') say(pick(DRAGON_HELLO).replace('{n}', name));
}

// ---------- butik ----------
function onShopItem(id) {
  const p = state.profile;
  const item = shopItem(id);
  if (p.owned.includes(id)) {
    equip(p, id);
    persist();
    playTap();
    say(item.name);
    render();
    return;
  }
  const r = buy(p, id);
  if (r.ok) {
    persist();
    playFanfare();
    confetti();
    say(`Du købte ${item.name}!`);
    render();
  } else if (r.reason === 'mangler') {
    playWrong();
    say(`Du mangler ${r.missing} stjerner. Spil en mission mere!`);
  }
}

// ---------- import/eksport ----------
function onExport() {
  const blob = new Blob([exportJson(state.data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lydoen-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function onImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = importJson(r.result);
      if (!confirm(`Hent ${data.profiles.length} spiller(e) fra backup? Spillere med samme id erstattes.`)) return;
      for (const p of data.profiles) {
        ensureRewards(p);
        const i = state.data.profiles.findIndex((x) => x.id === p.id);
        if (i >= 0) state.data.profiles[i] = p; else state.data.profiles.push(p);
      }
      persist();
      state.profile = state.data.profiles.find((x) => x.id === state.profile.id) || state.profile;
      render();
      alert('Backup hentet.');
    } catch (err) { alert(err.message); }
  };
  r.readAsText(file);
}

// ---------- hændelser ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn || state.busy) return;
  const { action } = btn.dataset;
  unlockSpeech();
  resumeAudio();
  const p = state.profile;
  switch (action) {
    case 'pick-avatar': state.newAvatar = btn.dataset.av; state.newName = document.getElementById('new-name')?.value || ''; render(); break;
    case 'create-profile': {
      const name = (document.getElementById('new-name')?.value || '').trim();
      if (!name) { say('Skriv dit navn først'); document.getElementById('new-name')?.focus(); return; }
      const prof = createProfile(name, state.newAvatar);
      ensureRewards(prof);
      state.data.profiles.push(prof);
      state.data.activeId = prof.id;
      state.profile = prof;
      state.newName = '';
      persist();
      go('home');
      say(`Velkommen til Lydøen, ${name}! Din drage er lige kommet ud af ægget.`);
      break;
    }
    case 'pick-profile': state.profile = state.data.profiles.find((x) => x.id === btn.dataset.id); state.data.activeId = state.profile.id; persist(); go('home'); say(`Hej ${state.profile.name}!`); break;
    case 'to-start': state.profile = null; state.parentOk = false; go('start'); break;
    case 'to-home': state.parentOk = false; state.gate = null; go('home'); break;
    case 'to-badges': go('badges'); break;
    case 'to-shop': go('shop'); say('Velkommen i dragehulen. Her kan du give din drage nye farver, hatte og spor.'); break;
    case 'to-parent': state.gate = null; go('parent'); break;
    case 'play': startMission(null); break;
    case 'play-focus': startMission(btn.dataset.cat); break;
    case 'locked': say(lockedText(btn.dataset.cat)); break;
    case 'quit': if (state.mission.results.length === 0 || confirm('Vil du stoppe missionen nu?')) { state.mission = null; go('home'); } break;
    case 'choose': onChoose(btn.dataset.id); break;
    case 'tile': onTile(btn.dataset.id); break;
    case 'hint': onHint(); break;
    case 'repeat': onRepeat(); break;
    case 'next': nextTask(); break;
    case 'shop-tab': state.shopTab = btn.dataset.kind; render(); break;
    case 'shop-item': onShopItem(btn.dataset.id); break;
    case 'gate-check': {
      const v = Number(document.getElementById('gate-input')?.value);
      if (v === state.gate.a * state.gate.b) { state.parentOk = true; render(); } else { state.gate = null; render(); }
      break;
    }
    case 'toggle': p.settings[btn.dataset.key] = !(p.settings[btn.dataset.key] !== false && p.settings[btn.dataset.key]); persist(); render(); break;
    case 'toggle-unlock': p.unlockAll = !p.unlockAll; persist(); render(); break;
    case 'rate': p.settings.rate = Math.round(Math.min(1.3, Math.max(0.5, (p.settings.rate || 0.9) + Number(btn.dataset.d))) * 10) / 10; persist(); render(); say('Sådan lyder jeg nu'); break;
    case 'level': { const s = skill(p, btn.dataset.cat); s.level = Math.min(LEVEL_MAX, Math.max(1, s.level + Number(btn.dataset.d))); s.streak = 0; s.failStreak = 0; persist(); render(); break; }
    case 'export': onExport(); break;
    case 'reset': if (confirm(`Slet alle fremskridt for ${p.name}? Det kan ikke fortrydes.`)) { const fresh = ensureRewards(createProfile(p.name, p.avatar)); fresh.id = p.id; fresh.settings = p.settings; const i = state.data.profiles.findIndex((x) => x.id === p.id); state.data.profiles[i] = fresh; state.profile = fresh; persist(); render(); } break;
    default: break;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && state.screen === 'parent' && !state.parentOk) document.querySelector('[data-action="gate-check"]')?.click();
  if (e.key === 'Enter' && state.screen === 'start' && e.target.id === 'new-name') document.querySelector('[data-action="create-profile"]')?.click();
});

// ---------- opstart ----------
initSpeech();
if (state.data.activeId) {
  state.profile = state.data.profiles.find((x) => x.id === state.data.activeId) || null;
  if (state.profile) state.screen = 'home';
}
render();
initWorld().then(render);
// Eksponeres til fejlsøgning i konsollen.
window.lydoen = { state, analyze, unlockedCategories, get world() { return world; } };
