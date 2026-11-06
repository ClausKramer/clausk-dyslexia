// Opgavegeneratorer. Hver kategori har én generator, der ud fra profil + niveau laver et opgaveobjekt:
//
// {
//   category, type, level, instruction,
//   speakOnStart: [part...]   part = {text} | {tiles:[...]} | {pause: ms}    (læses op når opgaven vises)
//   repeat: [part...]         (hvad 🔊-knappen gentager; default = speakOnStart)
//   speakIsHint: bool         (i Læsefyret "koster" oplæsning – læsning er pointen)
//   stimulus: { emoji, text, sub }   (det store felt øverst; text kan være ord med hul eller en sætning)
//   mode: 'choice' | 'sequence'
//   choices: [{ id, label, emoji, speak }]   answer: id            (choice)
//   tiles:   [{ id, label, speak }]          answerSeq: [id...]    (sequence)
//   items: [Leitner-nøgler]   confusionFor(chosenId) → "type:forventet|valgt" | null
//   words: antal ord (til læsehastighed)
// }

import { WORDS, COMPOUNDS, INFLECTIONS, vowelOf, gapVowel, gapCluster } from '../content/words.js';
import { SIGHT_GROUPS, SIGHT_WORDS, SIGHT_SENTENCES, sightGroupOf } from '../content/sightWords.js';
import { SUBJECTS, ACTIONS, SIMPLE_FRAMES, YESNO } from '../content/sentences.js';
import { VOWELS, CONFUSABLE, CLUSTERS, isVowel, speechFor } from '../content/phonemes.js';
import { pickItems } from '../engine/adaptive.js';
import { shuffle, pick, sample, defaultRng } from '../util.js';

const tileParts = (tiles) => [{ tiles }];
const text = (t) => ({ text: t });

function mkChoices(correct, distractors, rng, labelFn = (x) => x, extra = () => ({})) {
  const all = shuffle([correct, ...distractors], rng);
  return all.map((x) => ({ id: labelFn(x), label: labelFn(x), ...extra(x) }));
}

function uniqueEmoji(words) {
  const seen = new Set();
  return words.filter((w) => (seen.has(w.e) ? false : (seen.add(w.e), true)));
}

/** Distraktorbogstaver: på højere niveau vælges forvekslelige bogstaver. */
function letterDistractors(target, n, level, rng, pool) {
  const conf = (CONFUSABLE[target] || []).filter((l) => pool.includes(l));
  const others = pool.filter((l) => l !== target && !conf.includes(l));
  const picks = level >= 2 ? [...shuffle(conf, rng).slice(0, Math.min(n, level - 1)), ...shuffle(others, rng)] : shuffle(others, rng);
  return picks.slice(0, n);
}

// ---------- fonem: Lydhulen ----------
export function genFonem({ profile, level, rng = defaultRng, now = Date.now() }) {
  const variant = level === 1 ? 'first' : level === 2 ? pick(['last', 'rhyme'], rng) : pick(['rhyme', 'same-first', 'last'], rng);
  const basePool = WORDS.filter((w) => w.lvl <= Math.min(2, level) && !w.silent && w.ph[0].length === 1);

  if (variant === 'first' || variant === 'last') {
    const idx = variant === 'first' ? 0 : -1;
    const pool = basePool.filter((w) => w.ph.at(idx).length === 1);
    const [word] = pickItems(profile, pool, (w) => `lyd:${w.ph.at(idx)}`, 1, { now, rng });
    const target = word.ph.at(idx);
    const letterPool = [...new Set(pool.map((w) => w.ph.at(idx)))];
    const dis = letterDistractors(target, level >= 3 ? 3 : 2, level, rng, letterPool);
    return {
      category: 'fonem', type: `fonem-${variant}`, level,
      instruction: variant === 'first' ? 'Hvilken lyd starter ordet?' : 'Hvilken lyd slutter ordet?',
      speakOnStart: [text(variant === 'first' ? 'Hvilken lyd starter ordet' : 'Hvilken lyd slutter ordet'), { pause: 200 }, text(word.w)],
      repeat: [text(word.w)],
      stimulus: { emoji: word.e },
      mode: 'choice',
      choices: mkChoices(target, dis, rng, (l) => l, (l) => ({ speak: tileParts([l]) })),
      answer: target,
      items: [`lyd:${target}`],
      confusionFor: (c) => (c === target ? null : `bogstav:${target}|${c}`),
    };
  }

  if (variant === 'rhyme') {
    const families = {};
    for (const w of WORDS) if (w.rhyme) (families[w.rhyme] ||= []).push(w);
    const usable = Object.values(families).filter((f) => f.length >= 2);
    const fam = pick(usable, rng);
    const [word, match] = sample(fam, 2, rng);
    const dis = sample(uniqueEmoji(WORDS.filter((w) => w.rhyme !== word.rhyme && w.lvl <= 2 && w.e !== word.e && w.e !== match.e)), level >= 3 ? 3 : 2, rng);
    const choices = shuffle([match, ...dis], rng).map((w) => ({ id: w.w, label: '', emoji: w.e, speak: [text(w.w)] }));
    return {
      category: 'fonem', type: 'fonem-rhyme', level,
      instruction: `Hvilket ord rimer på "${word.w}"?`,
      speakOnStart: [text(`Hvilket ord rimer på ${word.w}?`), { pause: 300 }, ...choices.flatMap((c) => [text(c.id), { pause: 250 }])],
      stimulus: { emoji: word.e, text: word.w },
      mode: 'choice', choices, answer: match.w,
      items: [`rim:${word.rhyme}`],
      confusionFor: () => null,
    };
  }

  // same-first: hvilket ord starter med samme lyd som X?
  const [word] = pickItems(profile, basePool, (w) => `lyd:${w.ph[0]}`, 1, { now, rng });
  const same = basePool.filter((w) => w.ph[0] === word.ph[0] && w.w !== word.w && w.e !== word.e);
  const match = pick(same.length ? same : basePool.filter((w) => w.w !== word.w), rng);
  const dis = sample(uniqueEmoji(basePool.filter((w) => w.ph[0] !== word.ph[0] && w.e !== match.e)), 2, rng);
  const choices = shuffle([match, ...dis], rng).map((w) => ({ id: w.w, label: '', emoji: w.e, speak: [text(w.w)] }));
  return {
    category: 'fonem', type: 'fonem-same-first', level,
    instruction: `Hvilket ord starter med samme lyd som "${word.w}"?`,
    speakOnStart: [text(`Hvilket ord starter med samme lyd som ${word.w}?`), { pause: 300 }, ...choices.flatMap((c) => [text(c.id), { pause: 250 }])],
    stimulus: { emoji: word.e },
    mode: 'choice', choices, answer: match.w,
    items: [`lyd:${word.ph[0]}`],
    confusionFor: () => null,
  };
}

// ---------- bogstav: Bogstavbjerget ----------
const LETTER_POOL_L1 = ['s', 'm', 'a', 'l', 'o', 'i', 'e', 'n', 't', 'r', 'f', 'u'];
const LETTER_POOL_L2 = [...LETTER_POOL_L1, 'b', 'd', 'p', 'k', 'g', 'h', 'v', 'j', 'y'];
const LETTER_POOL_L3 = [...LETTER_POOL_L2, 'æ', 'ø', 'å'];

export function genBogstav({ profile, level, rng = defaultRng, now = Date.now() }) {
  const pool = level === 1 ? LETTER_POOL_L1 : level === 2 ? LETTER_POOL_L2 : LETTER_POOL_L3;
  const [target] = pickItems(profile, pool, (l) => `bogstav:${l}`, 1, { now, rng });
  const starting = WORDS.filter((w) => w.ph[0] === target && w.lvl <= level);
  const variant = level === 1 || !starting.length ? 'sound-to-letter' : pick(['sound-to-letter', 'letter-to-word'], rng);

  if (variant === 'sound-to-letter') {
    const dis = letterDistractors(target, level === 1 ? 2 : level === 2 ? 3 : 4, level, rng, pool);
    return {
      category: 'bogstav', type: 'bogstav-sound', level,
      instruction: 'Hvilket bogstav siger denne lyd?',
      speakOnStart: [text('Hvilket bogstav siger denne lyd?'), { pause: 300 }, { tiles: [target] }, { pause: 400 }, { tiles: [target] }],
      repeat: [{ tiles: [target] }],
      stimulus: { emoji: '🔊', sub: 'Tryk på højttaleren for at høre lyden igen' },
      mode: 'choice',
      choices: mkChoices(target, dis, rng, (l) => l, (l) => ({ speak: tileParts([l]) })),
      answer: target,
      items: [`bogstav:${target}`],
      confusionFor: (c) => (c === target ? null : `bogstav:${target}|${c}`),
    };
  }

  // letter-to-word: se bogstavet → hvilket ord starter med det?
  const word = pick(starting, rng);
  const conf = CONFUSABLE[target] || [];
  const confWords = uniqueEmoji(WORDS.filter((w) => conf.includes(w.ph[0]) && w.e !== word.e && w.lvl <= 2));
  const otherWords = uniqueEmoji(WORDS.filter((w) => w.ph[0] !== target && !conf.includes(w.ph[0]) && w.e !== word.e && w.lvl <= 2));
  const dis = [...sample(confWords, level >= 3 ? 2 : 1, rng), ...shuffle(otherWords, rng)].slice(0, 2);
  const choices = shuffle([word, ...dis], rng).map((w) => ({ id: w.w, label: w.w, emoji: w.e, speak: [text(w.w)] }));
  return {
    category: 'bogstav', type: 'bogstav-word', level,
    instruction: `Hvilket ord starter med "${target}"?`,
    speakOnStart: [text('Hvilket ord starter med lyden'), { tiles: [target] }],
    repeat: [{ tiles: [target] }],
    stimulus: { text: target, big: true },
    mode: 'choice', choices, answer: word.w,
    items: [`bogstav:${target}`],
    confusionFor: (c) => { const w = WORDS.find((x) => x.w === c); return w ? `bogstav:${target}|${w.ph[0]}` : null; },
  };
}

// ---------- syntese: Lydbroen ----------
export function genSyntese({ profile, level, rng = defaultRng, now = Date.now() }) {
  const pool = WORDS.filter((w) => (level === 1 ? w.lvl === 1 && !w.silent : level === 2 ? w.lvl <= 2 : w.lvl >= 2));
  const [word] = pickItems(profile, pool, (w) => `ord:${w.w}`, 1, { now, rng });
  // Distraktorer: på højere niveau ord der ligner (samme rim eller samme startlyd), ellers tilfældige.
  const similar = uniqueEmoji(WORDS.filter((w) => w.w !== word.w && w.e !== word.e && ((w.rhyme && w.rhyme === word.rhyme) || w.ph[0] === word.ph[0])));
  const others = uniqueEmoji(WORDS.filter((w) => w.w !== word.w && w.e !== word.e && w.lvl <= Math.max(2, level) && !similar.includes(w)));
  const nDis = level === 1 ? 2 : 3;
  const disPool = level === 1 ? shuffle(others, rng) : [...sample(similar, level - 1, rng), ...shuffle(others, rng)];
  const dis = uniqueEmoji(disPool).slice(0, nDis);
  const choices = shuffle([word, ...dis], rng).map((w) => ({ id: w.w, label: level >= 2 ? w.w : '', emoji: w.e, speak: [text(w.w)] }));
  const slow = { tiles: word.ph, gap: level === 1 ? 650 : 450 };
  return {
    category: 'syntese', type: 'syntese', level,
    instruction: level >= 3 ? 'Læs lydene og find ordet.' : 'Hør lydene. Hvilket ord bliver det?',
    speakOnStart: level >= 3 ? [text('Læs lydene og find ordet')] : [text('Hvilket ord bliver det?'), { pause: 300 }, slow],
    repeat: [slow],
    stimulus: level === 1 ? { emoji: '👂', sub: 'Lyt godt efter' } : { tiles: word.ph },
    mode: 'choice', choices, answer: word.w,
    items: [`ord:${word.w}`],
    confusionFor: () => null,
  };
}

// ---------- analyse: Byggepladsen ----------
export function genAnalyse({ profile, level, rng = defaultRng, now = Date.now() }) {
  const pool = WORDS.filter((w) => (level === 1 ? w.lvl === 1 && !w.silent && w.ph.length >= 2 : level === 2 ? w.lvl === 2 || (w.lvl === 1 && w.ph.length === 3) : w.lvl >= 2));
  const [word] = pickItems(profile, pool, (w) => `ord:${w.w}`, 1, { now, rng });
  const used = new Set(word.ph);
  const nDis = level === 1 ? 2 : 3;
  const confusables = [...new Set(word.ph.flatMap((t) => CONFUSABLE[t] || []))].filter((t) => !used.has(t));
  const allTiles = ['a', 'e', 'i', 'o', 'u', 'y', 'æ', 'ø', 'å', 'b', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v'].filter((t) => !used.has(t));
  const disPool = level === 1 ? shuffle(allTiles.filter((t) => !confusables.includes(t)), rng) : [...sample(confusables, level - 1, rng), ...shuffle(allTiles, rng)];
  const dis = [...new Set(disPool)].slice(0, nDis);
  const tiles = shuffle([...word.ph.map((t, i) => ({ id: `${t}#${i}`, label: t, speak: tileParts([t]), tile: t })), ...dis.map((t, i) => ({ id: `${t}#d${i}`, label: t, speak: tileParts([t]), tile: t }))], rng);
  return {
    category: 'analyse', type: 'analyse', level,
    instruction: 'Byg ordet. Tryk på lydene i rækkefølge.',
    speakOnStart: [text('Byg ordet'), { pause: 200 }, text(word.w), { pause: 300 }, text('Tryk på lydene i rækkefølge')],
    repeat: [text(word.w)],
    stimulus: { emoji: word.e },
    mode: 'sequence',
    tiles,
    answerSeq: word.ph.map((t, i) => `${t}#${i}`),
    items: [`ord:${word.w}`, ...word.ph.filter((t) => !isVowel(t) && t.length === 1).slice(0, 2).map((t) => `bogstav:${t}`)],
    confusionFor: (expectedTile, chosenTile) => (expectedTile && chosenTile && expectedTile !== chosenTile ? `bogstav:${expectedTile}|${chosenTile}` : null),
    wordText: word.w,
  };
}

// ---------- vokal: Vokalvulkanen ----------
export function genVokal({ profile, level, rng = defaultRng, now = Date.now() }) {
  const pool = WORDS.filter((w) => vowelOf(w) && (level === 1 ? w.lvl === 1 && !w.silent : level === 2 ? w.lvl <= 2 : w.lvl >= 2));
  const [word] = pickItems(profile, pool, (w) => `vokal:${vowelOf(w)}`, 1, { now, rng });
  const v = vowelOf(word);
  const conf = CONFUSABLE[v].filter((x) => isVowel(x));
  const others = VOWELS.filter((x) => x !== v && !conf.includes(x));
  const n = level === 1 ? 2 : level === 2 ? 3 : 4;
  const dis = (level === 1 ? shuffle(others, rng) : [...sample(conf, level - 1, rng), ...shuffle(others, rng)]).slice(0, n);
  return {
    category: 'vokal', type: 'vokal', level,
    instruction: 'Hvilken vokal mangler i ordet?',
    speakOnStart: [text('Hvilken vokal mangler i ordet'), { pause: 200 }, text(word.w)],
    repeat: [text(word.w)],
    stimulus: { emoji: word.e, text: gapVowel(word), big: true },
    mode: 'choice',
    choices: mkChoices(v, dis, rng, (x) => x, (x) => ({ speak: tileParts([x]) })),
    answer: v,
    items: [`vokal:${v}`],
    confusionFor: (c) => (c === v ? null : `vokal:${v}|${c}`),
  };
}

// ---------- klynge: Klyngekløften ----------
export function genKlynge({ profile, level, rng = defaultRng, now = Date.now() }) {
  const pool = WORDS.filter((w) => w.cluster && w.cluster.length === 2 && (level === 1 ? w.lvl <= 2 && !w.silent : level === 2 ? w.lvl <= 2 : true));
  const [word] = pickItems(profile, pool, (w) => `klynge:${w.cluster}`, 1, { now, rng });
  const cl = word.cluster;
  const sameFirst = CLUSTERS.filter((c) => c !== cl && c[0] === cl[0]);
  const sameSecond = CLUSTERS.filter((c) => c !== cl && c[1] === cl[1] && c[0] !== cl[0]);
  const others = CLUSTERS.filter((c) => c !== cl && c[0] !== cl[0] && c[1] !== cl[1]);
  const n = level === 1 ? 2 : 3;
  const dis = (level === 1 ? shuffle(others, rng) : [...sample([...sameFirst, ...sameSecond], level, rng), ...shuffle(others, rng)]).slice(0, n);
  return {
    category: 'klynge', type: 'klynge', level,
    instruction: 'Hvilke lyde starter ordet?',
    speakOnStart: [text('Hvilke lyde starter ordet'), { pause: 200 }, text(word.w)],
    repeat: [text(word.w)],
    stimulus: { emoji: word.e, text: gapCluster(word), big: true },
    mode: 'choice',
    choices: mkChoices(cl, dis, rng, (x) => x, (x) => ({ speak: tileParts(x.split('')) })),
    answer: cl,
    items: [`klynge:${cl}`],
    confusionFor: (c) => (c === cl ? null : `klynge:${cl}|${c}`),
  };
}

// ---------- ordbilleder: Troldeskoven ----------
export function genOrdbilleder({ profile, level, rng = defaultRng, now = Date.now() }) {
  if (level === 1) {
    const [word] = pickItems(profile, SIGHT_WORDS, (w) => `ord:${w}`, 1, { now, rng });
    const group = sightGroupOf(word).filter((w) => w !== word);
    const dis = sample(group, 2, rng);
    return {
      category: 'ordbilleder', type: 'ordbilleder-hear', level,
      instruction: 'Hvilket ord hører du?',
      speakOnStart: [text('Hvilket ord hører du?'), { pause: 300 }, text(word), { pause: 400 }, text(word)],
      repeat: [text(word)],
      stimulus: { emoji: '👂' },
      mode: 'choice',
      choices: mkChoices(word, dis, rng),
      answer: word,
      items: [`ord:${word}`],
      confusionFor: (c) => (c === word ? null : `ord:${word}|${c}`),
    };
  }
  const pool = SIGHT_SENTENCES.filter((s) => s.lvl <= level);
  const [sent] = pickItems(profile, pool, (s) => `ord:${s.a.toLowerCase()}`, 1, { now, rng });
  const spoken = sent.s.replace('___', sent.a);
  const dis = level >= 3 ? [...sent.d, ...sample(sightGroupOf(sent.a.toLowerCase()).filter((w) => w !== sent.a.toLowerCase() && !sent.d.includes(w)), 1, rng)] : sent.d;
  return {
    category: 'ordbilleder', type: 'ordbilleder-gap', level,
    instruction: level >= 3 ? 'Læs sætningen. Hvilket ord passer i hullet?' : 'Hvilket ord mangler i sætningen?',
    speakOnStart: level >= 3 ? [text('Hvilket ord passer i hullet?')] : [text('Hvilket ord mangler?'), { pause: 300 }, text(spoken)],
    repeat: [text(spoken)],
    speakIsHint: level >= 3,
    stimulus: { emoji: sent.e, text: sent.s },
    mode: 'choice',
    choices: mkChoices(sent.a, dis, rng),
    answer: sent.a,
    items: [`ord:${sent.a.toLowerCase()}`],
    confusionFor: (c) => (c === sent.a ? null : `ord:${sent.a.toLowerCase()}|${c.toLowerCase()}`),
    words: sent.s.split(' ').length,
  };
}

// ---------- morfem: Ordværkstedet ----------
export function genMorfem({ profile, level, rng = defaultRng, now = Date.now() }) {
  if (level === 3 && rng() < 0.5) {
    const [inf] = pickItems(profile, INFLECTIONS, (x) => `boejning:${x.a}`, 1, { now, rng });
    return {
      category: 'morfem', type: 'morfem-boejning', level,
      instruction: 'Hvilket ord passer?',
      speakOnStart: [text('Hvilket ord passer?'), { pause: 200 }, text(inf.q.replace('___', 'dut'))],
      repeat: [text(inf.q.replace('___', 'dut'))],
      stimulus: { emoji: inf.e, text: inf.q },
      mode: 'choice',
      choices: mkChoices(inf.a, inf.d, rng),
      answer: inf.a,
      items: [`boejning:${inf.a}`],
      confusionFor: () => null,
      words: inf.q.split(' ').length,
    };
  }
  const [comp] = pickItems(profile, COMPOUNDS, (c) => `morfem:${c.w}`, 1, { now, rng });
  if (level === 1) {
    const dis = sample(COMPOUNDS.filter((c) => c.w !== comp.w && c.e !== comp.e), 2, rng);
    const choices = shuffle([comp, ...dis], rng).map((c) => ({ id: c.w, label: c.w, emoji: c.e, speak: [text(c.w)] }));
    return {
      category: 'morfem', type: 'morfem-saet-sammen', level,
      instruction: `Hvilket ord får du af "${comp.parts[0]}" + "${comp.parts[1]}"?`,
      speakOnStart: [text(`Hvilket ord får du, når du sætter ${comp.parts[0]} og ${comp.parts[1]} sammen?`)],
      stimulus: { emoji: `${comp.pe[0]} + ${comp.pe[1]}`, text: `${comp.parts[0]} + ${comp.parts[1]}` },
      mode: 'choice', choices, answer: comp.w,
      items: [`morfem:${comp.w}`],
      confusionFor: () => null,
    };
  }
  // niveau 2-3: hvilke to ord gemmer sig i ordet?
  const wrong1 = pick(COMPOUNDS.filter((c) => c.parts[0] !== comp.parts[0]), rng);
  const wrong2 = pick(COMPOUNDS.filter((c) => c.parts[1] !== comp.parts[1]), rng);
  const pairs = [
    { id: comp.parts.join('+'), label: `${comp.parts[0]} + ${comp.parts[1]}` },
    { id: `${wrong1.parts[0]}+${comp.parts[1]}`, label: `${wrong1.parts[0]} + ${comp.parts[1]}` },
    { id: `${comp.parts[0]}+${wrong2.parts[1]}`, label: `${comp.parts[0]} + ${wrong2.parts[1]}` },
  ];
  return {
    category: 'morfem', type: 'morfem-del-op', level,
    instruction: 'Hvilke to ord gemmer sig i ordet?',
    speakOnStart: [text('Hvilke to ord gemmer sig i ordet'), { pause: 200 }, text(comp.w)],
    repeat: [text(comp.w)],
    stimulus: { emoji: comp.e, text: comp.w, big: true },
    mode: 'choice',
    choices: shuffle(pairs, rng),
    answer: comp.parts.join('+'),
    items: [`morfem:${comp.w}`],
    confusionFor: () => null,
  };
}

// ---------- saetning: Læsefyret ----------
export function genSaetning({ profile, level, rng = defaultRng, now = Date.now() }) {
  if (level === 1) {
    const pool = uniqueEmoji(WORDS.filter((w) => w.lvl <= 2 && !w.silent));
    const [word] = pickItems(profile, pool, (w) => `ord:${w.w}`, 1, { now, rng });
    const frame = pick(SIMPLE_FRAMES, rng);
    const sentence = frame.replace('___', word.w);
    const dis = sample(uniqueEmoji(pool.filter((w) => w.e !== word.e && w.w !== word.w)), 2, rng);
    const choices = shuffle([word, ...dis], rng).map((w) => ({ id: w.w, label: '', emoji: w.e, speak: [text(w.w)] }));
    return {
      category: 'saetning', type: 'saetning-1', level,
      instruction: 'Læs sætningen og find billedet.',
      speakOnStart: [text('Læs sætningen og find billedet')],
      repeat: [text(sentence)],
      speakIsHint: true,
      stimulus: { text: sentence },
      mode: 'choice', choices, answer: word.w,
      items: [`ord:${word.w}`],
      confusionFor: () => null,
      words: sentence.split(' ').length,
    };
  }
  if (level === 3 && rng() < 0.5) {
    const [q] = pickItems(profile, YESNO, (x) => `spm:${x.q}`, 1, { now, rng });
    return {
      category: 'saetning', type: 'saetning-janej', level,
      instruction: 'Læs spørgsmålet. Ja eller nej?',
      speakOnStart: [text('Læs spørgsmålet. Ja eller nej?')],
      repeat: [text(q.q)],
      speakIsHint: true,
      stimulus: { emoji: q.e, text: q.q },
      mode: 'choice',
      choices: [{ id: 'ja', label: 'Ja', emoji: '👍' }, { id: 'nej', label: 'Nej', emoji: '👎' }],
      answer: q.a ? 'ja' : 'nej',
      items: [`spm:${q.q}`],
      confusionFor: () => null,
      words: q.q.split(' ').length,
    };
  }
  const subj = pick(SUBJECTS, rng);
  const act = pick(ACTIONS, rng);
  const sentence = `${subj.t} ${level >= 3 ? act.long : act.t}.`;
  const otherSubj = pick(SUBJECTS.filter((s) => s.e !== subj.e), rng);
  const otherAct = pick(ACTIONS.filter((a) => a.e !== act.e), rng);
  const scenes = [
    { id: 'ok', emoji: `${subj.e}${act.e}` },
    { id: 'wrong-subj', emoji: `${otherSubj.e}${act.e}` },
    { id: 'wrong-act', emoji: `${subj.e}${otherAct.e}` },
  ];
  if (level >= 3) scenes.push({ id: 'wrong-both', emoji: `${otherSubj.e}${otherAct.e}` });
  return {
    category: 'saetning', type: 'saetning-scene', level,
    instruction: 'Læs sætningen og find det rigtige billede.',
    speakOnStart: [text('Læs sætningen og find det rigtige billede')],
    repeat: [text(sentence)],
    speakIsHint: true,
    stimulus: { text: sentence },
    mode: 'choice',
    choices: shuffle(scenes, rng).map((s) => ({ id: s.id, label: '', emoji: s.emoji })),
    answer: 'ok',
    items: [],
    confusionFor: () => null,
    words: sentence.split(' ').length,
  };
}

export const GENERATORS = {
  fonem: genFonem,
  bogstav: genBogstav,
  syntese: genSyntese,
  analyse: genAnalyse,
  vokal: genVokal,
  klynge: genKlynge,
  ordbilleder: genOrdbilleder,
  morfem: genMorfem,
  saetning: genSaetning,
};

export function generateTask(category, ctx) {
  const gen = GENERATORS[category];
  if (!gen) throw new Error(`Ukendt kategori: ${category}`);
  const t = gen(ctx);
  t.id = `${category}-${Math.random().toString(36).slice(2, 8)}`;
  t.repeat ||= t.speakOnStart;
  return t;
}

export { speechFor };
