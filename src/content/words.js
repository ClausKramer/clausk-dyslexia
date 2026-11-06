// Ordforråd med lydbrikker. Hvert ord: w = ord, e = emoji (billede), ph = lydbrikker i rækkefølge,
// lvl = sværhedsgrad 1-3 (antal lyde/klynger/ulydrethed), rhyme = rimfamilie, cluster = konsonantklynge i starten,
// silent = ordet rummer stumme/ulydrette bogstaver (bruges til at vælge "lydrette" ord på niveau 1).
// Lydbrikkerne følger bogstaverne (grafemer), så barnet kan bygge ordet – flerbogstavs-brikker som "ng", "hv", "hj", "kn"
// viser, at bogstaverne tilsammen giver én lyd.

export const WORDS = [
  // ---- Niveau 1: 2-3 lyde, overvejende lydrette ----
  { w: 'is', e: '🍦', ph: ['i', 's'], lvl: 1, rhyme: 'is' },
  { w: 'ko', e: '🐄', ph: ['k', 'o'], lvl: 1, rhyme: 'o' },
  { w: 'bi', e: '🐝', ph: ['b', 'i'], lvl: 1, rhyme: 'i' },
  { w: 'ti', e: '🔟', ph: ['t', 'i'], lvl: 1, rhyme: 'i' },
  { w: 'by', e: '🏙️', ph: ['b', 'y'], lvl: 1, rhyme: 'y' },
  { w: 'sø', e: '🏞️', ph: ['s', 'ø'], lvl: 1, rhyme: 'ø' },
  { w: 'ur', e: '⌚', ph: ['u', 'r'], lvl: 1, rhyme: 'ur' },
  { w: 'sol', e: '☀️', ph: ['s', 'o', 'l'], lvl: 1, rhyme: 'ol' },
  { w: 'mus', e: '🐭', ph: ['m', 'u', 's'], lvl: 1, rhyme: 'us' },
  { w: 'hus', e: '🏠', ph: ['h', 'u', 's'], lvl: 1, rhyme: 'us' },
  { w: 'bus', e: '🚌', ph: ['b', 'u', 's'], lvl: 1, rhyme: 'us' },
  { w: 'bil', e: '🚗', ph: ['b', 'i', 'l'], lvl: 1, rhyme: 'il' },
  { w: 'pil', e: '🏹', ph: ['p', 'i', 'l'], lvl: 1, rhyme: 'il' },
  { w: 'kat', e: '🐱', ph: ['k', 'a', 't'], lvl: 1, rhyme: 'at' },
  { w: 'hat', e: '🎩', ph: ['h', 'a', 't'], lvl: 1, rhyme: 'at' },
  { w: 'ris', e: '🍚', ph: ['r', 'i', 's'], lvl: 1, rhyme: 'is' },
  { w: 'kop', e: '☕', ph: ['k', 'o', 'p'], lvl: 1, rhyme: 'op' },
  { w: 'bad', e: '🛁', ph: ['b', 'a', 'd'], lvl: 1, rhyme: 'ad' },
  { w: 'mad', e: '🍽️', ph: ['m', 'a', 'd'], lvl: 1, rhyme: 'ad' },
  { w: 'ged', e: '🐐', ph: ['g', 'e', 'd'], lvl: 1, rhyme: 'ed' },
  { w: 'pen', e: '🖊️', ph: ['p', 'e', 'n'], lvl: 1, rhyme: 'en' },
  { w: 'hul', e: '🕳️', ph: ['h', 'u', 'l'], lvl: 1, rhyme: 'ul' },
  { w: 'gul', e: '🟡', ph: ['g', 'u', 'l'], lvl: 1, rhyme: 'ul' },
  { w: 'lys', e: '💡', ph: ['l', 'y', 's'], lvl: 1, rhyme: 'ys' },
  { w: 'ræv', e: '🦊', ph: ['r', 'æ', 'v'], lvl: 1, rhyme: 'æv' },
  { w: 'æg', e: '🥚', ph: ['æ', 'g'], lvl: 1, rhyme: 'æg' },
  { w: 'bog', e: '📖', ph: ['b', 'o', 'g'], lvl: 1, rhyme: 'og' },
  { w: 'tog', e: '🚂', ph: ['t', 'o', 'g'], lvl: 1, rhyme: 'og' },
  { w: 'ost', e: '🧀', ph: ['o', 's', 't'], lvl: 1, rhyme: 'ost' },
  { w: 'dør', e: '🚪', ph: ['d', 'ø', 'r'], lvl: 1, rhyme: 'ør' },
  { w: 'nød', e: '🥜', ph: ['n', 'ø', 'd'], lvl: 1, rhyme: 'ød' },
  { w: 'rød', e: '🔴', ph: ['r', 'ø', 'd'], lvl: 1, rhyme: 'ød' },
  { w: 'får', e: '🐑', ph: ['f', 'å', 'r'], lvl: 1, rhyme: 'år' },
  { w: 'hår', e: '💇', ph: ['h', 'å', 'r'], lvl: 1, rhyme: 'år' },
  { w: 'båd', e: '⛵', ph: ['b', 'å', 'd'], lvl: 1, rhyme: 'åd' },
  { w: 'lås', e: '🔒', ph: ['l', 'å', 's'], lvl: 1, rhyme: 'ås' },
  { w: 'gås', e: '🪿', ph: ['g', 'å', 's'], lvl: 1, rhyme: 'ås' },
  { w: 'and', e: '🦆', ph: ['a', 'n', 'd'], lvl: 1, rhyme: 'and' },
  { w: 'abe', e: '🐵', ph: ['a', 'b', 'e'], lvl: 1 },
  { w: 'øje', e: '👁️', ph: ['ø', 'j', 'e'], lvl: 1 },
  { w: 'øre', e: '👂', ph: ['ø', 'r', 'e'], lvl: 1 },
  { w: 'fod', e: '🦶', ph: ['f', 'o', 'd'], lvl: 1, rhyme: 'od' },
  { w: 'sne', e: '❄️', ph: ['s', 'n', 'e'], lvl: 1, rhyme: 'e', cluster: 'sn' },
  { w: 'ske', e: '🥄', ph: ['s', 'k', 'e'], lvl: 1, rhyme: 'e', cluster: 'sk' },
  { w: 'tre', e: '3️⃣', ph: ['t', 'r', 'e'], lvl: 1, rhyme: 'e', cluster: 'tr' },
  { w: 'sko', e: '👟', ph: ['s', 'k', 'o'], lvl: 1, rhyme: 'o', cluster: 'sk' },
  { w: 'bro', e: '🌉', ph: ['b', 'r', 'o'], lvl: 1, rhyme: 'o', cluster: 'br' },
  { w: 'træ', e: '🌳', ph: ['t', 'r', 'æ'], lvl: 1, rhyme: 'æ', cluster: 'tr' },
  { w: 'frø', e: '🐸', ph: ['f', 'r', 'ø'], lvl: 1, rhyme: 'ø', cluster: 'fr' },
  { w: 'fly', e: '✈️', ph: ['f', 'l', 'y'], lvl: 1, rhyme: 'y', cluster: 'fl' },
  { w: 'sky', e: '☁️', ph: ['s', 'k', 'y'], lvl: 1, rhyme: 'y', cluster: 'sk' },
  { w: 'blå', e: '🔵', ph: ['b', 'l', 'å'], lvl: 1, rhyme: 'å', cluster: 'bl' },

  // ---- Niveau 2: 4 lyde, klynger, enkelte ulydrette ----
  { w: 'bold', e: '⚽', ph: ['b', 'o', 'l', 'd'], lvl: 2, rhyme: 'old' },
  { w: 'hund', e: '🐶', ph: ['h', 'u', 'n', 'd'], lvl: 2, rhyme: 'und', silent: true },
  { w: 'mund', e: '👄', ph: ['m', 'u', 'n', 'd'], lvl: 2, rhyme: 'und', silent: true },
  { w: 'rund', e: '⭕', ph: ['r', 'u', 'n', 'd'], lvl: 2, rhyme: 'und', silent: true },
  { w: 'sand', e: '🏖️', ph: ['s', 'a', 'n', 'd'], lvl: 2, rhyme: 'and', silent: true },
  { w: 'tand', e: '🦷', ph: ['t', 'a', 'n', 'd'], lvl: 2, rhyme: 'and', silent: true },
  { w: 'mand', e: '👨', ph: ['m', 'a', 'n', 'd'], lvl: 2, rhyme: 'and', silent: true },
  { w: 'vand', e: '💧', ph: ['v', 'a', 'n', 'd'], lvl: 2, rhyme: 'and', silent: true },
  { w: 'hånd', e: '✋', ph: ['h', 'å', 'n', 'd'], lvl: 2, rhyme: 'ånd', silent: true },
  { w: 'fisk', e: '🐟', ph: ['f', 'i', 's', 'k'], lvl: 2, rhyme: 'isk' },
  { w: 'hest', e: '🐴', ph: ['h', 'e', 's', 't'], lvl: 2, rhyme: 'est' },
  { w: 'seng', e: '🛏️', ph: ['s', 'e', 'ng'], lvl: 2, rhyme: 'eng' },
  { w: 'ring', e: '💍', ph: ['r', 'i', 'ng'], lvl: 2, rhyme: 'ing' },
  { w: 'saks', e: '✂️', ph: ['s', 'a', 'k', 's'], lvl: 2 },
  { w: 'sort', e: '⚫', ph: ['s', 'o', 'r', 't'], lvl: 2 },
  { w: 'telt', e: '⛺', ph: ['t', 'e', 'l', 't'], lvl: 2 },
  { w: 'sofa', e: '🛋️', ph: ['s', 'o', 'f', 'a'], lvl: 2 },
  { w: 'kage', e: '🎂', ph: ['k', 'a', 'g', 'e'], lvl: 2, silent: true },
  { w: 'måne', e: '🌙', ph: ['m', 'å', 'n', 'e'], lvl: 2 },
  { w: 'hane', e: '🐓', ph: ['h', 'a', 'n', 'e'], lvl: 2 },
  { w: 'høne', e: '🐔', ph: ['h', 'ø', 'n', 'e'], lvl: 2 },
  { w: 'næse', e: '👃', ph: ['n', 'æ', 's', 'e'], lvl: 2 },
  { w: 'løve', e: '🦁', ph: ['l', 'ø', 'v', 'e'], lvl: 2 },
  { w: 'ugle', e: '🦉', ph: ['u', 'g', 'l', 'e'], lvl: 2 },
  { w: 'æble', e: '🍎', ph: ['æ', 'b', 'l', 'e'], lvl: 2 },
  { w: 'pære', e: '🍐', ph: ['p', 'æ', 'r', 'e'], lvl: 2 },
  { w: 'fugl', e: '🐦', ph: ['f', 'u', 'g', 'l'], lvl: 2, silent: true },
  { w: 'regn', e: '🌧️', ph: ['r', 'e', 'g', 'n'], lvl: 2, silent: true },
  { w: 'mælk', e: '🍼', ph: ['m', 'æ', 'l', 'k'], lvl: 2 },
  { w: 'stol', e: '🪑', ph: ['s', 't', 'o', 'l'], lvl: 2, rhyme: 'ol', cluster: 'st' },
  { w: 'sten', e: '🪨', ph: ['s', 't', 'e', 'n'], lvl: 2, rhyme: 'en', cluster: 'st' },
  { w: 'slot', e: '🏰', ph: ['s', 'l', 'o', 't'], lvl: 2, rhyme: 'ot', cluster: 'sl' },
  { w: 'smil', e: '😊', ph: ['s', 'm', 'i', 'l'], lvl: 2, rhyme: 'il', cluster: 'sm' },
  { w: 'skib', e: '🚢', ph: ['s', 'k', 'i', 'b'], lvl: 2, cluster: 'sk' },
  { w: 'skov', e: '🌲', ph: ['s', 'k', 'o', 'v'], lvl: 2, cluster: 'sk' },
  { w: 'blad', e: '🍃', ph: ['b', 'l', 'a', 'd'], lvl: 2, rhyme: 'ad', cluster: 'bl' },
  { w: 'brød', e: '🍞', ph: ['b', 'r', 'ø', 'd'], lvl: 2, rhyme: 'ød', cluster: 'br' },
  { w: 'brun', e: '🟤', ph: ['b', 'r', 'u', 'n'], lvl: 2, rhyme: 'un', cluster: 'br' },
  { w: 'dreng', e: '👦', ph: ['d', 'r', 'e', 'ng'], lvl: 2, rhyme: 'eng', cluster: 'dr' },
  { w: 'flag', e: '🏳️', ph: ['f', 'l', 'a', 'g'], lvl: 2, cluster: 'fl' },
  { w: 'glas', e: '🥛', ph: ['g', 'l', 'a', 's'], lvl: 2, cluster: 'gl' },
  { w: 'gris', e: '🐷', ph: ['g', 'r', 'i', 's'], lvl: 2, rhyme: 'is', cluster: 'gr' },
  { w: 'grøn', e: '🟢', ph: ['g', 'r', 'ø', 'n'], lvl: 2, cluster: 'gr' },
  { w: 'græs', e: '🌿', ph: ['g', 'r', 'æ', 's'], lvl: 2, cluster: 'gr' },
  { w: 'kran', e: '🏗️', ph: ['k', 'r', 'a', 'n'], lvl: 2, cluster: 'kr' },
  { w: 'kniv', e: '🔪', ph: ['kn', 'i', 'v'], lvl: 2, cluster: 'kn', silent: true },
  { w: 'hval', e: '🐋', ph: ['hv', 'a', 'l'], lvl: 2, cluster: 'hv', silent: true },
  { w: 'hjul', e: '🛞', ph: ['hj', 'u', 'l'], lvl: 2, cluster: 'hj', silent: true },
  { w: 'hvid', e: '⚪', ph: ['hv', 'i', 'd'], lvl: 2, cluster: 'hv', silent: true },

  // ---- Niveau 3: 5+ lyde, dobbeltkonsonanter, sværere klynger ----
  { w: 'konge', e: '👑', ph: ['k', 'o', 'ng', 'e'], lvl: 3 },
  { w: 'banan', e: '🍌', ph: ['b', 'a', 'n', 'a', 'n'], lvl: 3 },
  { w: 'robot', e: '🤖', ph: ['r', 'o', 'b', 'o', 't'], lvl: 3 },
  { w: 'kasse', e: '📦', ph: ['k', 'a', 'ss', 'e'], lvl: 3 },
  { w: 'lampe', e: '🪔', ph: ['l', 'a', 'm', 'p', 'e'], lvl: 3 },
  { w: 'gaffel', e: '🍴', ph: ['g', 'a', 'ff', 'e', 'l'], lvl: 3 },
  { w: 'nøgle', e: '🔑', ph: ['n', 'ø', 'g', 'l', 'e'], lvl: 3, silent: true },
  { w: 'kylling', e: '🐥', ph: ['k', 'y', 'll', 'i', 'ng'], lvl: 3 },
  { w: 'elefant', e: '🐘', ph: ['e', 'l', 'e', 'f', 'a', 'n', 't'], lvl: 3 },
  { w: 'slange', e: '🐍', ph: ['s', 'l', 'a', 'ng', 'e'], lvl: 3, cluster: 'sl' },
  { w: 'snegl', e: '🐌', ph: ['s', 'n', 'e', 'g', 'l'], lvl: 3, cluster: 'sn', silent: true },
  { w: 'spand', e: '🪣', ph: ['s', 'p', 'a', 'n', 'd'], lvl: 3, rhyme: 'and', cluster: 'sp', silent: true },
  { w: 'spejl', e: '🪞', ph: ['s', 'p', 'e', 'j', 'l'], lvl: 3, cluster: 'sp' },
  { w: 'svane', e: '🦢', ph: ['s', 'v', 'a', 'n', 'e'], lvl: 3, cluster: 'sv' },
  { w: 'sværd', e: '🗡️', ph: ['s', 'v', 'æ', 'r', 'd'], lvl: 3, cluster: 'sv', silent: true },
  { w: 'stjerne', e: '⭐', ph: ['s', 't', 'j', 'e', 'r', 'n', 'e'], lvl: 3, cluster: 'st' },
  { w: 'blomst', e: '🌸', ph: ['b', 'l', 'o', 'm', 's', 't'], lvl: 3, cluster: 'bl' },
  { w: 'bjørn', e: '🐻', ph: ['b', 'j', 'ø', 'r', 'n'], lvl: 3, cluster: 'bj' },
  { w: 'drage', e: '🐉', ph: ['d', 'r', 'a', 'g', 'e'], lvl: 3, cluster: 'dr', silent: true },
  { w: 'frugt', e: '🍇', ph: ['f', 'r', 'u', 'g', 't'], lvl: 3, cluster: 'fr' },
  { w: 'klokke', e: '⏰', ph: ['k', 'l', 'o', 'kk', 'e'], lvl: 3, cluster: 'kl' },
  { w: 'klovn', e: '🤡', ph: ['k', 'l', 'o', 'v', 'n'], lvl: 3, cluster: 'kl' },
  { w: 'krabbe', e: '🦀', ph: ['k', 'r', 'a', 'bb', 'e'], lvl: 3, cluster: 'kr' },
  { w: 'plante', e: '🪴', ph: ['p', 'l', 'a', 'n', 't', 'e'], lvl: 3, cluster: 'pl' },
  { w: 'prins', e: '🤴', ph: ['p', 'r', 'i', 'n', 's'], lvl: 3, cluster: 'pr' },
  { w: 'trold', e: '🧌', ph: ['t', 'r', 'o', 'l', 'd'], lvl: 3, rhyme: 'old', cluster: 'tr' },
  { w: 'trompet', e: '🎺', ph: ['t', 'r', 'o', 'm', 'p', 'e', 't'], lvl: 3, cluster: 'tr' },
  { w: 'kjole', e: '👗', ph: ['kj', 'o', 'l', 'e'], lvl: 3, silent: true },
  { w: 'hjerte', e: '❤️', ph: ['hj', 'e', 'r', 't', 'e'], lvl: 3, cluster: 'hj', silent: true },
  { w: 'hjelm', e: '⛑️', ph: ['hj', 'e', 'l', 'm'], lvl: 3, cluster: 'hj', silent: true },
  { w: 'hvalp', e: '🐕', ph: ['hv', 'a', 'l', 'p'], lvl: 3, cluster: 'hv', silent: true },

  // ---- Niveau 4: lange ord, flere stavelser, dobbeltkonsonanter, c/z/w, tre-konsonant-klynger ----
  { w: 'tomat', e: '🍅', ph: ['t', 'o', 'm', 'a', 't'], lvl: 4 },
  { w: 'citron', e: '🍋', ph: ['c', 'i', 't', 'r', 'o', 'n'], lvl: 4 },
  { w: 'agurk', e: '🥒', ph: ['a', 'g', 'u', 'r', 'k'], lvl: 4 },
  { w: 'ananas', e: '🍍', ph: ['a', 'n', 'a', 'n', 'a', 's'], lvl: 4 },
  { w: 'gulerod', e: '🥕', ph: ['g', 'u', 'l', 'e', 'r', 'o', 'd'], lvl: 4, silent: true },
  { w: 'giraf', e: '🦒', ph: ['g', 'i', 'r', 'a', 'f'], lvl: 4 },
  { w: 'kamel', e: '🐫', ph: ['k', 'a', 'm', 'e', 'l'], lvl: 4 },
  { w: 'delfin', e: '🐬', ph: ['d', 'e', 'l', 'f', 'i', 'n'], lvl: 4 },
  { w: 'pingvin', e: '🐧', ph: ['p', 'i', 'ng', 'v', 'i', 'n'], lvl: 4 },
  { w: 'raket', e: '🚀', ph: ['r', 'a', 'k', 'e', 't'], lvl: 4 },
  { w: 'cykel', e: '🚲', ph: ['c', 'y', 'k', 'e', 'l'], lvl: 4 },
  { w: 'tromme', e: '🥁', ph: ['t', 'r', 'o', 'mm', 'e'], lvl: 4, cluster: 'tr' },
  { w: 'ballon', e: '🎈', ph: ['b', 'a', 'll', 'o', 'n'], lvl: 4 },
  { w: 'blyant', e: '✏️', ph: ['b', 'l', 'y', 'a', 'n', 't'], lvl: 4, cluster: 'bl' },
  { w: 'telefon', e: '📱', ph: ['t', 'e', 'l', 'e', 'f', 'o', 'n'], lvl: 4 },
  { w: 'vulkan', e: '🌋', ph: ['v', 'u', 'l', 'k', 'a', 'n'], lvl: 4 },
  { w: 'kartoffel', e: '🥔', ph: ['k', 'a', 'r', 't', 'o', 'ff', 'e', 'l'], lvl: 4 },
  { w: 'edderkop', e: '🕷️', ph: ['e', 'dd', 'e', 'r', 'k', 'o', 'p'], lvl: 4, silent: true },
  { w: 'gorilla', e: '🦍', ph: ['g', 'o', 'r', 'i', 'll', 'a'], lvl: 4 },
  { w: 'zebra', e: '🦓', ph: ['z', 'e', 'b', 'r', 'a'], lvl: 4 },
  { w: 'kanin', e: '🐰', ph: ['k', 'a', 'n', 'i', 'n'], lvl: 4 },
  { w: 'violin', e: '🎻', ph: ['v', 'i', 'o', 'l', 'i', 'n'], lvl: 4 },
  { w: 'tiger', e: '🐯', ph: ['t', 'i', 'g', 'e', 'r'], lvl: 4 },
  { w: 'panda', e: '🐼', ph: ['p', 'a', 'n', 'd', 'a'], lvl: 4 },
  { w: 'kiwi', e: '🥝', ph: ['k', 'i', 'w', 'i'], lvl: 4 },
  { w: 'strand', e: '🏝️', ph: ['s', 't', 'r', 'a', 'n', 'd'], lvl: 4, cluster: 'str', silent: true },
  { w: 'strømpe', e: '🧦', ph: ['s', 't', 'r', 'ø', 'm', 'p', 'e'], lvl: 4, cluster: 'str' },
  { w: 'strøm', e: '⚡', ph: ['s', 't', 'r', 'ø', 'm'], lvl: 4, cluster: 'str' },
  { w: 'skrue', e: '🔩', ph: ['s', 'k', 'r', 'u', 'e'], lvl: 4, cluster: 'skr' },
  { w: 'skrive', e: '✍️', ph: ['s', 'k', 'r', 'i', 'v', 'e'], lvl: 4, cluster: 'skr' },
  { w: 'skrald', e: '🗑️', ph: ['s', 'k', 'r', 'a', 'l', 'd'], lvl: 4, cluster: 'skr', silent: true },
  { w: 'sprøjte', e: '💉', ph: ['s', 'p', 'r', 'ø', 'j', 't', 'e'], lvl: 4, cluster: 'spr' },
  { w: 'spring', e: '🤸', ph: ['s', 'p', 'r', 'i', 'ng'], lvl: 4, cluster: 'spr' },

  // ---- Niveau 5: lange ord med svær stavning (ch, gh, zz, stumme bogstaver, mange stavelser) ----
  { w: 'chokolade', e: '🍫', ph: ['ch', 'o', 'k', 'o', 'l', 'a', 'd', 'e'], lvl: 5, silent: true },
  { w: 'krokodille', e: '🐊', ph: ['k', 'r', 'o', 'k', 'o', 'd', 'i', 'll', 'e'], lvl: 5, cluster: 'kr' },
  { w: 'papegøje', e: '🦜', ph: ['p', 'a', 'p', 'e', 'g', 'ø', 'j', 'e'], lvl: 5, silent: true },
  { w: 'skildpadde', e: '🐢', ph: ['s', 'k', 'i', 'l', 'd', 'p', 'a', 'dd', 'e'], lvl: 5, cluster: 'sk', silent: true },
  { w: 'mariehøne', e: '🐞', ph: ['m', 'a', 'r', 'i', 'e', 'h', 'ø', 'n', 'e'], lvl: 5 },
  { w: 'blæksprutte', e: '🐙', ph: ['b', 'l', 'æ', 'k', 's', 'p', 'r', 'u', 'tt', 'e'], lvl: 5, cluster: 'bl' },
  { w: 'flodhest', e: '🦛', ph: ['f', 'l', 'o', 'd', 'h', 'e', 's', 't'], lvl: 5, cluster: 'fl', silent: true },
  { w: 'næsehorn', e: '🦏', ph: ['n', 'æ', 's', 'e', 'h', 'o', 'r', 'n'], lvl: 5 },
  { w: 'helikopter', e: '🚁', ph: ['h', 'e', 'l', 'i', 'k', 'o', 'p', 't', 'e', 'r'], lvl: 5 },
  { w: 'dinosaur', e: '🦕', ph: ['d', 'i', 'n', 'o', 's', 'a', 'u', 'r'], lvl: 5 },
  { w: 'kænguru', e: '🦘', ph: ['k', 'æ', 'ng', 'u', 'r', 'u'], lvl: 5 },
  { w: 'græskar', e: '🎃', ph: ['g', 'r', 'æ', 's', 'k', 'a', 'r'], lvl: 5, cluster: 'gr' },
  { w: 'paraply', e: '☂️', ph: ['p', 'a', 'r', 'a', 'p', 'l', 'y'], lvl: 5 },
  { w: 'pizza', e: '🍕', ph: ['p', 'i', 'zz', 'a'], lvl: 5 },
  { w: 'egern', e: '🐿️', ph: ['e', 'g', 'e', 'r', 'n'], lvl: 5, silent: true },
  { w: 'jordbær', e: '🍓', ph: ['j', 'o', 'r', 'd', 'b', 'æ', 'r'], lvl: 5, silent: true },
  { w: 'hamburger', e: '🍔', ph: ['h', 'a', 'm', 'b', 'u', 'r', 'g', 'e', 'r'], lvl: 5 },
  { w: 'spaghetti', e: '🍝', ph: ['s', 'p', 'a', 'gh', 'e', 'tt', 'i'], lvl: 5, cluster: 'sp' },
  { w: 'kalender', e: '📅', ph: ['k', 'a', 'l', 'e', 'n', 'd', 'e', 'r'], lvl: 5 },
  { w: 'guitar', e: '🎸', ph: ['g', 'u', 'i', 't', 'a', 'r'], lvl: 5 },
];

const VOWEL_SET = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'æ', 'ø', 'å']);

/** Første vokal i ordets lydbrikker. */
export function vowelOf(word) {
  return word.ph.find((t) => VOWEL_SET.has(t)) || null;
}
/** Ordet med første vokal erstattet af "_" (til vokalopgaver). */
export function gapVowel(word) {
  const v = vowelOf(word);
  const i = word.ph.indexOf(v);
  return word.ph.map((t, k) => (k === i ? '_' : t)).join('');
}
/** Positioner (indeks i lydbrikkerne) for alle vokaler i ordet. */
export function vowelPositions(word) {
  return word.ph.map((t, i) => (VOWEL_SET.has(t) ? i : -1)).filter((i) => i >= 0);
}
/** Ordet med lydbrikken på plads i erstattet af "_". */
export function gapAt(word, i) {
  return word.ph.map((t, k) => (k === i ? '_' : t)).join('');
}
/** Slutklynge: de to sidste lydbrikker, hvis begge er enkelte konsonanter, der udtales (fx "st" i hest). */
export function endCluster(word) {
  if (word.silent || word.ph.length < 3) return null;
  const [a, b] = word.ph.slice(-2);
  if (a.length !== 1 || b.length !== 1 || VOWEL_SET.has(a) || VOWEL_SET.has(b)) return null;
  return a + b;
}
/** Ordet uden slutklyngen: "hest" → "he__". */
export function gapEnd(word) {
  return word.w.slice(0, -2) + '__';
}
/** Ordet uden klyngen i starten (til klyngeopgaver): "blad" → "__ad". */
export function gapCluster(word) {
  return '_'.repeat(word.cluster.length) + word.w.slice(word.cluster.length);
}

export const wordByText = (w) => WORDS.find((x) => x.w === w);

// Sammensatte ord til Ordværkstedet.
export const COMPOUNDS = [
  { w: 'snemand', e: '⛄', parts: ['sne', 'mand'], pe: ['❄️', '👨'] },
  { w: 'regnbue', e: '🌈', parts: ['regn', 'bue'], pe: ['🌧️', '🏹'] },
  { w: 'fodbold', e: '⚽', parts: ['fod', 'bold'], pe: ['🦶', '🏀'] },
  { w: 'isbjørn', e: '🐻‍❄️', parts: ['is', 'bjørn'], pe: ['🍦', '🐻'] },
  { w: 'sommerfugl', e: '🦋', parts: ['sommer', 'fugl'], pe: ['☀️', '🐦'] },
  { w: 'jordbær', e: '🍓', parts: ['jord', 'bær'], pe: ['🌍', '🫐'] },
  { w: 'brandbil', e: '🚒', parts: ['brand', 'bil'], pe: ['🔥', '🚗'] },
  { w: 'tandbørste', e: '🪥', parts: ['tand', 'børste'], pe: ['🦷', '🧹'] },
  { w: 'solbriller', e: '🕶️', parts: ['sol', 'briller'], pe: ['☀️', '👓'] },
  { w: 'sejlbåd', e: '⛵', parts: ['sejl', 'båd'], pe: ['🏳️', '🛶'] },
  { w: 'guldfisk', e: '🐠', parts: ['guld', 'fisk'], pe: ['🥇', '🐟'] },
  { w: 'havfrue', e: '🧜‍♀️', parts: ['hav', 'frue'], pe: ['🌊', '👩'] },
  { w: 'rumskib', e: '🚀', parts: ['rum', 'skib'], pe: ['🌌', '🚢'] },
  { w: 'vandmelon', e: '🍉', parts: ['vand', 'melon'], pe: ['💧', '🍈'] },
  { w: 'lastbil', e: '🚚', parts: ['last', 'bil'], pe: ['📦', '🚗'] },
  { w: 'postkasse', e: '📮', parts: ['post', 'kasse'], pe: ['✉️', '📦'] },
  { w: 'fuglehus', e: '🏡', parts: ['fugle', 'hus'], pe: ['🐦', '🏠'] },
  { w: 'legeplads', e: '🛝', parts: ['lege', 'plads'], pe: ['🧸', '📍'] },
  { w: 'solskin', e: '🌞', parts: ['sol', 'skin'], pe: ['☀️', '✨'] },
  { w: 'natkjole', e: '👘', parts: ['nat', 'kjole'], pe: ['🌙', '👗'] },
];

// Sammensatte ord med tre dele til niveau 5 i Ordværkstedet.
export const TRIPLES = [
  { w: 'fodboldbane', e: '⚽🏟️', parts: ['fod', 'bold', 'bane'] },
  { w: 'tandbørstekop', e: '🪥🥛', parts: ['tand', 'børste', 'kop'] },
  { w: 'regnbuefarve', e: '🌈🎨', parts: ['regn', 'bue', 'farve'] },
  { w: 'jordbærkage', e: '🍓🎂', parts: ['jord', 'bær', 'kage'] },
  { w: 'havfruehale', e: '🧜‍♀️', parts: ['hav', 'frue', 'hale'] },
  { w: 'postkassenøgle', e: '📮🔑', parts: ['post', 'kasse', 'nøgle'] },
  { w: 'vandmelonsaft', e: '🍉🧃', parts: ['vand', 'melon', 'saft'] },
  { w: 'legepladsbænk', e: '🛝🪑', parts: ['lege', 'plads', 'bænk'] },
  { w: 'solbrillestel', e: '🕶️', parts: ['sol', 'brille', 'stel'] },
  { w: 'brandbilstige', e: '🚒🪜', parts: ['brand', 'bil', 'stige'] },
  { w: 'sommerfuglevinge', e: '🦋', parts: ['sommer', 'fugle', 'vinge'] },
  { w: 'isbjørneunge', e: '🐻‍❄️', parts: ['is', 'bjørne', 'unge'] },
];

// Gradbøjning (stor – større – størst) til niveau 4 i Ordværkstedet.
export const COMPARISONS = [
  { q: 'Musen er lille. Myren er ___.', e: '🐭🐜', a: 'mindre', d: ['lillere', 'mindst'] },
  { q: 'Bjørnen er stor. Elefanten er ___.', e: '🐻🐘', a: 'større', d: ['storere', 'størst'] },
  { q: 'Min bror er høj. Far er ___.', e: '👦👨', a: 'højere', d: ['højst', 'højre'] },
  { q: 'Bussen er hurtig. Toget er ___.', e: '🚌🚂', a: 'hurtigere', d: ['hurtigst', 'hurtiger'] },
  { q: 'Is er kold. Sne er ___.', e: '🍦❄️', a: 'koldere', d: ['koldest', 'kolder'] },
  { q: 'Kagen er god. Is er endnu ___.', e: '🎂🍦', a: 'bedre', d: ['godere', 'bedst'] },
  { q: 'Bedstefar er gammel. Oldefar er ___.', e: '👴🧓', a: 'ældre', d: ['gamlere', 'ældst'] },
  { q: 'Stenen er tung. Klippen er ___.', e: '🪨⛰️', a: 'tungere', d: ['tungest', 'tunger'] },
  { q: 'Raketten er den ___ af dem alle.', e: '🚀', a: 'hurtigste', d: ['hurtigere', 'hurtig'] },
  { q: 'Giraffen er det ___ dyr i zoo.', e: '🦒', a: 'højeste', d: ['højere', 'høje'] },
  { q: 'I dag er årets ___ dag.', e: '☀️', a: 'varmeste', d: ['varmere', 'varme'] },
  { q: 'Myren er det ___ dyr i haven.', e: '🐜', a: 'mindste', d: ['mindre', 'lilleste'] },
];

// Bøjninger (flertal og datid) til niveau 3 i Ordværkstedet.
export const INFLECTIONS = [
  { q: 'Én bil – to ___', e: '🚗🚗', a: 'biler', d: ['bile', 'bilen'] },
  { q: 'Én kat – to ___', e: '🐱🐱', a: 'katte', d: ['kater', 'katten'] },
  { q: 'Én hund – to ___', e: '🐶🐶', a: 'hunde', d: ['hunder', 'hunden'] },
  { q: 'Én bog – to ___', e: '📖📖', a: 'bøger', d: ['boger', 'bogen'] },
  { q: 'Ét hus – to ___', e: '🏠🏠', a: 'huse', d: ['huser', 'huset'] },
  { q: 'Ét æble – to ___', e: '🍎🍎', a: 'æbler', d: ['æble', 'æblet'] },
  { q: 'Én hest – to ___', e: '🐴🐴', a: 'heste', d: ['hester', 'hesten'] },
  { q: 'Én fisk – to ___', e: '🐟🐟', a: 'fisk', d: ['fiske', 'fisker'] },
  { q: 'Én mus – to ___', e: '🐭🐭', a: 'mus', d: ['muse', 'muser'] },
  { q: 'Ét barn – to ___', e: '🧒🧒', a: 'børn', d: ['barne', 'barner'] },
  { q: 'I dag hopper jeg. I går ___ jeg.', e: '🦘', a: 'hoppede', d: ['hopper', 'hoppe'] },
  { q: 'I dag leger jeg. I går ___ jeg.', e: '🧸', a: 'legede', d: ['leger', 'lege'] },
  { q: 'I dag spiser jeg. I går ___ jeg.', e: '🍽️', a: 'spiste', d: ['spiser', 'spise'] },
  { q: 'I dag løber jeg. I går ___ jeg.', e: '🏃', a: 'løb', d: ['løber', 'løbe'] },
  { q: 'I dag sover jeg. I går ___ jeg.', e: '😴', a: 'sov', d: ['sover', 'sove'] },
  { q: 'I dag læser jeg. I går ___ jeg.', e: '📖', a: 'læste', d: ['læser', 'læse'] },
];
