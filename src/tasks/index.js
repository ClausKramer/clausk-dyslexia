// Opgavegeneratorer. Hver kategori har én generator, der ud fra profil + niveau (1-5) laver et opgaveobjekt:
//
// {
//   category, type, level, instruction,
//   speakOnStart: [part...]   part = {text} | {tiles:[...]} | {pause: ms}    (læses op når opgaven vises)
//   repeat: [part...]         (hvad 🔊-knappen gentager; default = speakOnStart)
//   speakIsHint: bool         (når læsning er pointen, "koster" oplæsning: svaret tæller som "med hjælp")
//   stimulus: { emoji, text, tiles, sub, big, question }
//   mode: 'choice' | 'sequence'
//   choices: [{ id, label, emoji, speak }]   answer: id            (choice)
//   tiles:   [{ id, label, speak }]          answerSeq: [id...]    (sequence)
//   items: [Leitner-nøgler]   confusionFor(chosenId) → "type:forventet|valgt" | null
//   words: antal ord (til læsehastighed)
// }
//
// Niveauer (overordnet):
//   1-3: grundlæggende – korte lydrette ord → klynger og ulydrette ord
//   4:   lange ord, flere stavelser, dobbeltkonsonanter, tre-konsonant-klynger, flere og mere lignende svarmuligheder
//   5:   lydsletning, stavning, slutklynger, læsning uden oplæsning, svære småord, læseforståelse af korte tekster

import { WORDS, COMPOUNDS, INFLECTIONS, TRIPLES, COMPARISONS, vowelOf, gapCluster, vowelPositions, gapAt, endCluster, gapEnd } from '../content/words.js';
import { SIGHT_WORDS, SIGHT_SENTENCES, sightGroupOf } from '../content/sightWords.js';
import { SUBJECTS, ACTIONS, SIMPLE_FRAMES, YESNO } from '../content/sentences.js';
import { DELETIONS, SPELLINGS, MINI_TEXTS, TEXTS } from '../content/advanced.js';
import { VOWELS, CONFUSABLE, CLUSTERS, CLUSTERS3, END_CLUSTERS, HOMOPHONES, isVowel, speechFor } from '../content/phonemes.js';
import { pickItems } from '../engine/adaptive.js';
import { shuffle, pick, sample, defaultRng } from '../util.js';

const tileParts = (tiles) => [{ tiles }];
const text = (t) => ({ text: t });
const NUM = ['nul', 'en', 'to', 'tre', 'fire', 'fem', 'seks', 'syv', 'otte', 'ni', 'ti', 'elleve', 'tolv'];
const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function mkChoices(correct, distractors, rng, labelFn = (x) => x, extra = () => ({})) {
  const all = shuffle([correct, ...distractors], rng);
  return all.map((x) => ({ id: labelFn(x), label: labelFn(x), ...extra(x) }));
}

function uniqueEmoji(words) {
  const seen = new Set();
  return words.filter((w) => (seen.has(w.e) ? false : (seen.add(w.e), true)));
}

/** Ordpulje pr. niveau: 1 lydrette korte, 2 ≤ niveau 2, ellers dette og forrige niveau. */
function wordsFor(level) {
  if (level === 1) return WORDS.filter((w) => w.lvl === 1 && !w.silent);
  if (level === 2) return WORDS.filter((w) => w.lvl <= 2);
  return WORDS.filter((w) => w.lvl === level || w.lvl === level - 1);
}

/** Distraktorbogstaver: på højere niveau vælges forvekslelige bogstaver. Bogstaver med samme lyd udelades altid. */
function letterDistractors(target, n, level, rng, pool) {
  const same = HOMOPHONES[target] || [];
  const usable = pool.filter((l) => l !== target && !same.includes(l));
  const conf = (CONFUSABLE[target] || []).filter((l) => usable.includes(l));
  const others = usable.filter((l) => !conf.includes(l));
  const picks = level >= 2 ? [...shuffle(conf, rng).slice(0, Math.min(n, level - 1)), ...shuffle(others, rng)] : shuffle(others, rng);
  return picks.slice(0, n);
}

// ---------- fonem: Lydhulen ----------
export function genFonem({ profile, level, rng = defaultRng, now = Date.now() }) {
  const variant = level === 1 ? 'first'
    : level === 2 ? pick(['last', 'rhyme'], rng)
    : level === 3 ? pick(['rhyme', 'same-first', 'last'], rng)
    : level === 4 ? pick(['count', 'count', 'same-first', 'last'], rng)
    : pick(['delete', 'delete', 'count'], rng);
  const basePool = WORDS.filter((w) => w.lvl <= Math.min(2, level) && !w.silent && w.ph[0].length === 1);

  if (variant === 'count') {
    const pool = WORDS.filter((w) => !w.silent && w.lvl <= (level >= 5 ? 4 : 3) && w.ph.length >= (level >= 5 ? 4 : 3) && w.ph.length <= 8);
    const [word] = pickItems(profile, pool, (w) => `lydtal:${w.ph.length}`, 1, { now, rng });
    const n = word.ph.length;
    const opts = [n - 1, n, n + 1, ...(level >= 5 ? [n + 2] : [])].filter((x) => x >= 1);
    return {
      category: 'fonem', type: 'fonem-count', level,
      instruction: 'Hvor mange lyde er der i ordet?',
      speakOnStart: [text('Hvor mange lyde er der i ordet'), { pause: 200 }, text(word.w)],
      repeat: [text(word.w)],
      stimulus: { emoji: word.e, sub: 'Sig ordet langsomt og tæl lydene' },
      mode: 'choice',
      choices: shuffle(opts, rng).map((x) => ({ id: String(x), label: String(x), speak: [text(NUM[x] || String(x))] })),
      answer: String(n),
      items: [`lydtal:${n}`],
      confusionFor: () => null,
    };
  }

  if (variant === 'delete') {
    const [d] = pickItems(profile, DELETIONS, (x) => `slet:${x.from}`, 1, { now, rng });
    const dis = sample(uniqueEmoji(WORDS.filter((w) => w.e !== d.e && w.w !== d.to && w.lvl <= 2)), 3, rng);
    const choices = shuffle([{ id: d.to, e: d.e }, ...dis.map((w) => ({ id: w.w, e: w.e }))], rng).map((c) => ({ id: c.id, label: '', emoji: c.e, speak: [text(c.id)] }));
    const say = [text(`Sig ${d.from} uden`), { tiles: [d.remove] }, { pause: 200 }, text('Hvad bliver det?')];
    return {
      category: 'fonem', type: 'fonem-delete', level,
      instruction: `Sig "${d.from}" uden "${d.remove}". Hvad bliver det?`,
      speakOnStart: say,
      repeat: say,
      stimulus: { text: d.from, big: true, sub: `uden "${d.remove}"` },
      mode: 'choice', choices, answer: d.to,
      items: [`slet:${d.from}`],
      confusionFor: () => null,
    };
  }

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
  const dis = sample(uniqueEmoji(basePool.filter((w) => w.ph[0] !== word.ph[0] && w.e !== match.e && w.e !== word.e)), level >= 4 ? 3 : 2, rng);
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
const LETTER_POOL_L4 = [...LETTER_POOL_L3, 'c', 'z'];
const WORD_ONLY_LETTERS = ['c', 'z']; // har samme lyd som s – kan kun øves visuelt (hvilket ord starter med c?)

export function genBogstav({ profile, level, rng = defaultRng, now = Date.now() }) {
  if (level >= 5 && rng() < 0.55) {
    const [sp] = pickItems(profile, SPELLINGS, (x) => `stavning:${x.w}`, 1, { now, rng });
    return {
      category: 'bogstav', type: 'bogstav-spelling', level,
      instruction: 'Hør ordet. Hvilken stavemåde er rigtig?',
      speakOnStart: [text('Hvordan staves'), { pause: 150 }, text(sp.w)],
      repeat: [text(sp.w)],
      stimulus: { emoji: sp.e },
      mode: 'choice',
      choices: mkChoices(sp.w, sp.d, rng),
      answer: sp.w,
      items: [`stavning:${sp.w}`],
      confusionFor: (c) => (c === sp.w ? null : `ord:${sp.w}|${c}`),
    };
  }

  const pool = level === 1 ? LETTER_POOL_L1 : level === 2 ? LETTER_POOL_L2 : level === 3 ? LETTER_POOL_L3 : LETTER_POOL_L4;
  const [target] = pickItems(profile, pool, (l) => `bogstav:${l}`, 1, { now, rng });
  const starting = WORDS.filter((w) => w.ph[0] === target && w.lvl <= Math.min(level, 4));
  const wordOnly = WORD_ONLY_LETTERS.includes(target);
  if (wordOnly && !starting.length) return genBogstav({ profile, level: 3, rng, now });
  const variant = wordOnly ? 'letter-to-word' : level === 1 || !starting.length ? 'sound-to-letter' : pick(['sound-to-letter', 'letter-to-word'], rng);
  const nDis = level === 1 ? 2 : level === 2 ? 3 : level === 3 ? 4 : 5;

  if (variant === 'sound-to-letter') {
    const dis = letterDistractors(target, nDis, level, rng, pool.filter((l) => !WORD_ONLY_LETTERS.includes(l)));
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
  const conf = [...(CONFUSABLE[target] || []), ...(HOMOPHONES[target] || [])];
  const confWords = uniqueEmoji(WORDS.filter((w) => conf.includes(w.ph[0]) && w.e !== word.e && w.lvl <= 3));
  const otherWords = uniqueEmoji(WORDS.filter((w) => w.ph[0] !== target && !conf.includes(w.ph[0]) && w.e !== word.e && w.lvl <= 2));
  const nWords = level >= 4 ? 3 : 2;
  const dis = uniqueEmoji([...sample(confWords, level >= 3 ? 2 : 1, rng), ...shuffle(otherWords, rng)]).slice(0, nWords);
  const choices = shuffle([word, ...dis], rng).map((w) => ({ id: w.w, label: w.w, emoji: w.e, speak: [text(w.w)] }));
  return {
    category: 'bogstav', type: 'bogstav-word', level,
    instruction: `Hvilket ord starter med "${target}"?`,
    speakOnStart: wordOnly ? [text('Hvilket ord starter med bogstavet'), text(target)] : [text('Hvilket ord starter med lyden'), { tiles: [target] }],
    repeat: wordOnly ? [text(target)] : [{ tiles: [target] }],
    stimulus: { text: target, big: true },
    mode: 'choice', choices, answer: word.w,
    items: [`bogstav:${target}`],
    confusionFor: (c) => { const w = WORDS.find((x) => x.w === c); return w ? `bogstav:${target}|${w.ph[0]}` : null; },
  };
}

// ---------- syntese: Lydbroen ----------
export function genSyntese({ profile, level, rng = defaultRng, now = Date.now() }) {
  const pool = wordsFor(level);
  const [word] = pickItems(profile, pool, (w) => `ord:${w.w}`, 1, { now, rng });
  // Distraktorer: på højere niveau ord der ligner (samme rim eller samme startlyd), ellers tilfældige.
  const similar = uniqueEmoji(WORDS.filter((w) => w.w !== word.w && w.e !== word.e && ((w.rhyme && w.rhyme === word.rhyme) || w.ph[0] === word.ph[0] || (level >= 4 && w.ph.length === word.ph.length))));
  const others = uniqueEmoji(WORDS.filter((w) => w.w !== word.w && w.e !== word.e && w.lvl <= Math.max(2, level) && !similar.includes(w)));
  const nDis = level === 1 ? 2 : level <= 3 ? 3 : 4;
  const disPool = level === 1 ? shuffle(others, rng) : [...sample(similar, Math.min(level - 1, 3), rng), ...shuffle(others, rng)];
  const dis = uniqueEmoji(disPool).slice(0, nDis);
  // Niveau 1-2: lyt (og se ordene på niveau 2). Niveau 3+: læs selv og find billedet – ingen tekst på svarene.
  const choices = shuffle([word, ...dis], rng).map((w) => ({ id: w.w, label: level === 2 ? w.w : '', emoji: w.e, speak: [text(w.w)] }));
  const slow = { tiles: word.ph, gap: level === 1 ? 650 : level <= 3 ? 450 : 300 };
  const reading = level >= 3;
  return {
    category: 'syntese', type: 'syntese', level,
    instruction: level >= 5 ? 'Læs ordet og find billedet.' : reading ? 'Læs lydene og find billedet.' : 'Hør lydene. Hvilket ord bliver det?',
    speakOnStart: level >= 5 ? [text('Læs ordet og find billedet')] : reading ? [text('Læs lydene og find billedet')] : [text('Hvilket ord bliver det?'), { pause: 300 }, slow],
    repeat: [slow],
    speakIsHint: reading,
    stimulus: level === 1 ? { emoji: '👂', sub: 'Lyt godt efter' } : level >= 5 ? { text: word.w, big: true } : { tiles: word.ph },
    mode: 'choice', choices, answer: word.w,
    items: [`ord:${word.w}`],
    confusionFor: () => null,
  };
}

// ---------- analyse: Byggepladsen ----------
export function genAnalyse({ profile, level, rng = defaultRng, now = Date.now() }) {
  const pool = level === 1 ? WORDS.filter((w) => w.lvl === 1 && !w.silent && w.ph.length >= 2)
    : level === 2 ? WORDS.filter((w) => w.lvl === 2 || (w.lvl === 1 && w.ph.length === 3))
    : wordsFor(level);
  const [word] = pickItems(profile, pool, (w) => `ord:${w.w}`, 1, { now, rng });
  const used = new Set(word.ph);
  const nDis = level === 1 ? 2 : level <= 3 ? 3 : 4;
  const confusables = [...new Set(word.ph.flatMap((t) => CONFUSABLE[t] || []))].filter((t) => !used.has(t));
  const allTiles = ['a', 'e', 'i', 'o', 'u', 'y', 'æ', 'ø', 'å', 'b', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v'].filter((t) => !used.has(t));
  const disPool = level === 1 ? shuffle(allTiles.filter((t) => !confusables.includes(t)), rng) : [...sample(confusables, Math.min(level - 1, 3), rng), ...shuffle(allTiles, rng)];
  const dis = [...new Set(disPool)].slice(0, nDis);
  const tiles = shuffle([...word.ph.map((t, i) => ({ id: `${t}#${i}`, label: t, speak: tileParts([t]), tile: t })), ...dis.map((t, i) => ({ id: `${t}#d${i}`, label: t, speak: tileParts([t]), tile: t }))], rng);
  const dictation = level >= 5; // niveau 5: kun lyd, intet billede – ren stavning efter gehør
  return {
    category: 'analyse', type: dictation ? 'analyse-diktat' : 'analyse', level,
    instruction: dictation ? 'Hør ordet og stav det.' : 'Byg ordet. Tryk på lydene i rækkefølge.',
    speakOnStart: dictation ? [text('Hør ordet og stav det'), { pause: 250 }, text(word.w)] : [text('Byg ordet'), { pause: 200 }, text(word.w), { pause: 300 }, text('Tryk på lydene i rækkefølge')],
    repeat: [text(word.w)],
    stimulus: dictation ? { emoji: '👂', sub: 'Tryk på højttaleren for at høre ordet igen' } : { emoji: word.e },
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
  const pool = wordsFor(level).filter((w) => vowelOf(w));
  const [word] = pickItems(profile, pool, (w) => `vokal:${vowelOf(w)}`, 1, { now, rng });
  // Niveau 1-3: første vokal. Niveau 4-5: en tilfældig vokal i et langt ord.
  const positions = vowelPositions(word);
  const idx = level >= 4 ? pick(positions, rng) : positions[0];
  const v = word.ph[idx];
  const conf = CONFUSABLE[v].filter((x) => isVowel(x));
  const others = VOWELS.filter((x) => x !== v && !conf.includes(x));
  const n = level === 1 ? 2 : level === 2 ? 3 : level <= 4 ? 4 : 5;
  const dis = (level === 1 ? shuffle(others, rng) : [...sample(conf, Math.min(level - 1, conf.length), rng), ...shuffle(others, rng)]).slice(0, n);
  return {
    category: 'vokal', type: 'vokal', level,
    instruction: 'Hvilken vokal mangler i ordet?',
    speakOnStart: [text('Hvilken vokal mangler i ordet'), { pause: 200 }, text(word.w)],
    repeat: [text(word.w)],
    stimulus: { emoji: word.e, text: gapAt(word, idx), big: true },
    mode: 'choice',
    choices: mkChoices(v, dis, rng, (x) => x, (x) => ({ speak: tileParts([x]) })),
    answer: v,
    items: [`vokal:${v}`],
    confusionFor: (c) => (c === v ? null : `vokal:${v}|${c}`),
  };
}

// ---------- klynge: Klyngekløften ----------
export function genKlynge({ profile, level, rng = defaultRng, now = Date.now() }) {
  if (level === 4) {
    // Tre konsonanter i starten: str, skr, spr
    const pool = WORDS.filter((w) => w.cluster && w.cluster.length === 3);
    const [word] = pickItems(profile, pool, (w) => `klynge:${w.cluster}`, 1, { now, rng });
    const cl = word.cluster;
    const partial = [cl[0] + cl[1], cl[0] + cl[2], cl[1] + cl[2]].filter((x) => x !== cl);
    const dis = [...sample(partial, 2, rng), ...sample(CLUSTERS3.filter((c) => c !== cl), 1, rng)];
    return {
      category: 'klynge', type: 'klynge-3', level,
      instruction: 'Hvilke lyde starter ordet?',
      speakOnStart: [text('Hvilke lyde starter ordet'), { pause: 200 }, text(word.w)],
      repeat: [text(word.w)],
      stimulus: { emoji: word.e, text: '___' + word.w.slice(3), big: true },
      mode: 'choice',
      choices: mkChoices(cl, dis, rng, (x) => x, (x) => ({ speak: tileParts(x.split('')) })),
      answer: cl,
      items: [`klynge:${cl}`],
      confusionFor: (c) => (c === cl ? null : `klynge:${cl}|${c}`),
    };
  }
  if (level >= 5) {
    // Slutklynger: he__ → st
    // Udelad klynger med blødt d eller v/j, der udtales som vokal (klovn), så opgaven er entydig.
    const pool = WORDS.filter((w) => { const e = endCluster(w); return e && !e.endsWith('d') && !'vj'.includes(e[0]); });
    const [word] = pickItems(profile, pool, (w) => `slutklynge:${endCluster(w)}`, 1, { now, rng });
    const ec = endCluster(word);
    const swapped = ec[1] + ec[0];
    const sharing = END_CLUSTERS.filter((c) => c !== ec && c !== swapped && (c[0] === ec[0] || c[1] === ec[1]));
    const rest = END_CLUSTERS.filter((c) => c !== ec && c !== swapped && !sharing.includes(c));
    const dis = [...new Set([swapped, ...sample(sharing, 2, rng), ...shuffle(rest, rng)])].filter((c) => c !== ec).slice(0, 3);
    return {
      category: 'klynge', type: 'klynge-slut', level,
      instruction: 'Hvilke bogstaver mangler til sidst?',
      speakOnStart: [text('Hvilke bogstaver mangler til sidst i ordet'), { pause: 200 }, text(word.w)],
      repeat: [text(word.w)],
      stimulus: { emoji: word.e, text: gapEnd(word), big: true },
      mode: 'choice',
      choices: mkChoices(ec, dis, rng, (x) => x, (x) => ({ speak: tileParts(x.split('')) })),
      answer: ec,
      items: [`slutklynge:${ec}`],
      confusionFor: (c) => (c === ec ? null : `klynge:${ec}|${c}`),
    };
  }
  const pool = WORDS.filter((w) => w.cluster && w.cluster.length === 2 && w.lvl <= 3 && (level === 1 ? w.lvl <= 2 && !w.silent : level === 2 ? w.lvl <= 2 : true));
  const [word] = pickItems(profile, pool, (w) => `klynge:${w.cluster}`, 1, { now, rng });
  const cl = word.cluster;
  const sameFirst = CLUSTERS.filter((c) => c !== cl && c[0] === cl[0]);
  const sameSecond = CLUSTERS.filter((c) => c !== cl && c[1] === cl[1] && c[0] !== cl[0]);
  const others = CLUSTERS.filter((c) => c !== cl && c[0] !== cl[0] && c[1] !== cl[1]);
  const n = level === 1 ? 2 : 3;
  const dis = [...new Set(level === 1 ? shuffle(others, rng) : [...sample([...sameFirst, ...sameSecond], level, rng), ...shuffle(others, rng)])].slice(0, n);
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
    const [word] = pickItems(profile, SIGHT_WORDS.filter((w) => sightGroupOf(w).length > 1), (w) => `ord:${w}`, 1, { now, rng });
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
  const pool = SIGHT_SENTENCES.filter((s) => (level <= 3 ? s.lvl <= level : s.lvl === level || s.lvl === level - 1));
  const [sent] = pickItems(profile, pool, (s) => `ord:${s.a.toLowerCase()}`, 1, { now, rng });
  const spoken = sent.s.replace('___', sent.a);
  const isCap = sent.a[0] !== sent.a[0].toLowerCase();
  const taken = new Set([sent.a, ...sent.d].map((x) => x.toLowerCase()));
  const extra = sightGroupOf(sent.a.toLowerCase()).filter((w) => !taken.has(w.toLowerCase())).map((w) => (isCap ? cap(w) : w));
  const dis = level >= 3 ? [...sent.d, ...sample(extra, level >= 5 ? 2 : 1, rng)] : sent.d;
  const reading = level >= 3;
  return {
    category: 'ordbilleder', type: 'ordbilleder-gap', level,
    instruction: reading ? 'Læs sætningen. Hvilket ord passer i hullet?' : 'Hvilket ord mangler i sætningen?',
    speakOnStart: reading ? [text('Hvilket ord passer i hullet?')] : [text('Hvilket ord mangler?'), { pause: 300 }, text(spoken)],
    repeat: [text(spoken)],
    speakIsHint: reading,
    stimulus: { emoji: sent.e, text: sent.s },
    mode: 'choice',
    choices: mkChoices(sent.a, dis, rng),
    answer: sent.a,
    items: [`ord:${sent.a.toLowerCase()}`],
    confusionFor: (c) => (c === sent.a ? null : `ord:${sent.a.toLowerCase()}|${c.toLowerCase()}`),
    words: wordCount(sent.s),
  };
}

// ---------- morfem: Ordværkstedet ----------
function choiceTask({ level, type, item, keyPrefix, rng }) {
  return {
    category: 'morfem', type, level,
    instruction: 'Hvilket ord passer?',
    speakOnStart: [text('Hvilket ord passer?'), { pause: 200 }, text(item.q.replace('___', 'dut'))],
    repeat: [text(item.q.replace('___', 'dut'))],
    speakIsHint: level >= 4,
    stimulus: { emoji: item.e, text: item.q },
    mode: 'choice',
    choices: mkChoices(item.a, item.d, rng),
    answer: item.a,
    items: [`${keyPrefix}:${item.a}`],
    confusionFor: () => null,
    words: wordCount(item.q),
  };
}

function splitLabel(w, b1, b2) { return `${w.slice(0, b1)} + ${w.slice(b1, b2)} + ${w.slice(b2)}`; }

export function genMorfem({ profile, level, rng = defaultRng, now = Date.now() }) {
  if (level >= 5 && rng() < 0.6) {
    // Tre dele: fodboldbane → fod + bold + bane
    const [t] = pickItems(profile, TRIPLES, (x) => `morfem:${x.w}`, 1, { now, rng });
    const w = t.w;
    const b1 = t.parts[0].length, b2 = b1 + t.parts[1].length;
    const cand = [[b1 + 1, b2], [b1, b2 - 1], [b1 - 1, b2 + 1], [b1, b2 + 1], [b1 - 1, b2]]
      .filter(([x, y]) => x >= 1 && y > x + 0 && y < w.length && !(x === b1 && y === b2) && y - x >= 1);
    const wrong = [];
    for (const [x, y] of shuffle(cand, rng)) { const l = splitLabel(w, x, y); if (!wrong.includes(l)) wrong.push(l); if (wrong.length === 2) break; }
    const correct = splitLabel(w, b1, b2);
    return {
      category: 'morfem', type: 'morfem-tre', level,
      instruction: 'Hvilke tre ord gemmer sig i ordet?',
      speakOnStart: [text('Hvilke tre ord gemmer sig i ordet'), { pause: 200 }, text(w)],
      repeat: [text(w)],
      stimulus: { emoji: t.e, text: w, big: true },
      mode: 'choice',
      choices: mkChoices(correct, wrong, rng),
      answer: correct,
      items: [`morfem:${w}`],
      confusionFor: () => null,
    };
  }
  if (level >= 4) {
    if (rng() < 0.6) { const [c] = pickItems(profile, COMPARISONS, (x) => `grad:${x.a}`, 1, { now, rng }); return choiceTask({ level, type: 'morfem-grad', item: c, keyPrefix: 'grad', rng }); }
    const [inf] = pickItems(profile, INFLECTIONS, (x) => `boejning:${x.a}`, 1, { now, rng });
    return choiceTask({ level, type: 'morfem-boejning', item: inf, keyPrefix: 'boejning', rng });
  }
  if (level === 3 && rng() < 0.5) {
    const [inf] = pickItems(profile, INFLECTIONS, (x) => `boejning:${x.a}`, 1, { now, rng });
    return choiceTask({ level, type: 'morfem-boejning', item: inf, keyPrefix: 'boejning', rng });
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
function yesNoTask(profile, level, rng, now) {
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
    words: wordCount(q.q),
  };
}

function miniTextTask(profile, level, rng, now) {
  const [m] = pickItems(profile, MINI_TEXTS, (x) => `tekst:${x.q}`, 1, { now, rng });
  return {
    category: 'saetning', type: 'saetning-minitekst', level,
    instruction: 'Læs teksten og svar på spørgsmålet.',
    speakOnStart: [text('Læs teksten og svar på spørgsmålet')],
    repeat: [text(m.t), { pause: 300 }, text(m.q)],
    speakIsHint: true,
    stimulus: { text: m.t, question: m.q, passage: true },
    mode: 'choice',
    choices: shuffle([m.a, ...m.d], rng).map((e) => ({ id: e, label: '', emoji: e })),
    answer: m.a,
    items: [`tekst:${m.q}`],
    confusionFor: () => null,
    words: wordCount(m.t) + wordCount(m.q),
  };
}

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
      words: wordCount(sentence),
    };
  }
  if (level >= 5) {
    if (rng() < 0.3) return miniTextTask(profile, level, rng, now);
    const [tx] = pickItems(profile, TEXTS, (x) => `tekst:${x.q}`, 1, { now, rng });
    return {
      category: 'saetning', type: 'saetning-tekst', level,
      instruction: 'Læs teksten og svar på spørgsmålet.',
      speakOnStart: [text('Læs teksten og svar på spørgsmålet')],
      repeat: [text(tx.t), { pause: 300 }, text(tx.q)],
      speakIsHint: true,
      stimulus: { text: tx.t, question: tx.q, passage: true },
      mode: 'choice',
      choices: mkChoices(tx.a, tx.d, rng),
      answer: tx.a,
      items: [`tekst:${tx.q}`],
      confusionFor: () => null,
      words: wordCount(tx.t) + wordCount(tx.q),
    };
  }
  if (level === 4) return rng() < 0.6 ? miniTextTask(profile, level, rng, now) : yesNoTask(profile, level, rng, now);
  if (level === 3 && rng() < 0.5) return yesNoTask(profile, level, rng, now);
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
    words: wordCount(sentence),
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
