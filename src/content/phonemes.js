// Bogstaver, vokaler, klynger og hvordan vi "siger" dem via talesyntese.
// Talesyntese udtaler enkeltbogstaver som bogstavnavne ("be", "de"). For de lyde, der kan holdes
// (s, m, f, l ...), bruger vi en forlænget form, som lyder mere som bogstavlyden.

export const VOWELS = ['a', 'e', 'i', 'o', 'u', 'y', 'æ', 'ø', 'å'];
export const CONSONANTS = ['b', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v'];
export const LETTERS = [...CONSONANTS, ...VOWELS];

// Visuelt/lydligt forvekslelige bogstaver – bruges som "svære" distraktorer og i forældreoverblikket.
export const CONFUSABLE = {
  b: ['d', 'p'], d: ['b', 'p', 't'], p: ['b', 'd'], t: ['d', 'f'], f: ['t', 'v'], v: ['f', 'b'],
  m: ['n', 'u'], n: ['m', 'u', 'r'], u: ['n', 'y', 'o'], y: ['u', 'i'], i: ['j', 'l', 'y'], j: ['i', 'g'], l: ['i', 't'],
  g: ['k', 'j'], k: ['g', 'h'], h: ['k', 'n'], r: ['n', 'l'], s: ['z', 'c'],
  a: ['e', 'æ', 'å'], e: ['æ', 'i', 'a'], æ: ['e', 'a', 'ø'], o: ['ø', 'å', 'u'], ø: ['o', 'å', 'æ'], å: ['o', 'ø', 'a'],
};

// Hvad talesyntesen skal sige for en lydbrik.
export const TILE_SPEECH = {
  a: 'a', e: 'e', i: 'i', o: 'o', u: 'u', y: 'y', æ: 'æ', ø: 'ø', å: 'å',
  s: 'sss', m: 'mmm', n: 'nnn', l: 'lll', f: 'fff', r: 'rrr', v: 'vvv', j: 'jjj', h: 'hhh',
  b: 'b', d: 'd', g: 'g', k: 'k', p: 'p', t: 't',
  ng: 'ng', kk: 'k', ll: 'lll', ss: 'sss', bb: 'b', ff: 'fff', ej: 'ej',
  hv: 'vvv', hj: 'jjj', kn: 'nnn', kj: 'kj', gn: 'ng',
};

export const CLUSTERS = ['bl', 'br', 'bj', 'dr', 'fl', 'fr', 'gl', 'gr', 'kl', 'kr', 'kn', 'pl', 'pr', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sv', 'tr', 'hv', 'hj'];

export const isVowel = (t) => VOWELS.includes(t);
export const speechFor = (tile) => TILE_SPEECH[tile] || tile;
