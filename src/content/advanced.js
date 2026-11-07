// Indhold til niveau 4 og 5: lydsletning, stavning, sætninger med svære småord og læseforståelse.

// Lydhulen niveau 5: "Sig 'skat' uden 's'" → kat. Resultatet er altid et rigtigt ord med billede.
export const DELETIONS = [
  { from: 'skat', remove: 's', to: 'kat', e: '🐱' },
  { from: 'sko', remove: 's', to: 'ko', e: '🐄' },
  { from: 'spil', remove: 's', to: 'pil', e: '🏹' },
  { from: 'sand', remove: 's', to: 'and', e: '🦆' },
  { from: 'kost', remove: 'k', to: 'ost', e: '🧀' },
  { from: 'bris', remove: 'b', to: 'ris', e: '🍚' },
  { from: 'ris', remove: 'r', to: 'is', e: '🍦' },
  { from: 'tur', remove: 't', to: 'ur', e: '⌚' },
  { from: 'blad', remove: 'l', to: 'bad', e: '🛁' },
  { from: 'spand', remove: 'p', to: 'sand', e: '🏖️' },
  { from: 'græs', remove: 'r', to: 'gæs', e: '🪿' },
  { from: 'brød', remove: 'b', to: 'rød', e: '🔴' },
];

// Bogstavbjerget niveau 5: hør ordet og vælg den rigtige stavemåde. Distraktorerne er ikke rigtige ord.
export const SPELLINGS = [
  { w: 'hvid', e: '⚪', d: ['vihd', 'hvit'] },
  { w: 'hval', e: '🐋', d: ['wal', 'hvall'] },
  { w: 'hjul', e: '🛞', d: ['juul', 'hjull'] },
  { w: 'kniv', e: '🔪', d: ['niv', 'knif'] },
  { w: 'hund', e: '🐶', d: ['hunn', 'hundd'] },
  { w: 'mund', e: '👄', d: ['monn', 'munn'] },
  { w: 'fugl', e: '🐦', d: ['fuul', 'fugel'] },
  { w: 'regn', e: '🌧️', d: ['rejn', 'rein'] },
  { w: 'kage', e: '🎂', d: ['kæe', 'kae'] },
  { w: 'nøgle', e: '🔑', d: ['nøle', 'nøjle'] },
  { w: 'sværd', e: '🗡️', d: ['sværr', 'svert'] },
  { w: 'hjerte', e: '❤️', d: ['jerte', 'hjærte'] },
  { w: 'chokolade', e: '🍫', d: ['sjokolade', 'chokolate'] },
  { w: 'giraf', e: '🦒', d: ['sjiraf', 'girraf'] },
  { w: 'edderkop', e: '🕷️', d: ['ederkop', 'edderkopp'] },
  { w: 'cykel', e: '🚲', d: ['sykel', 'cykkel'] },
  { w: 'pizza', e: '🍕', d: ['pitsa', 'piza'] },
  { w: 'kylling', e: '🐥', d: ['kyling', 'kølling'] },
  { w: 'egern', e: '🐿️', d: ['ejern', 'egærn'] },
  { w: 'skildpadde', e: '🐢', d: ['skilpadde', 'skildpade'] },
];

// Læsefyret niveau 4: korte tekster (to sætninger) med spørgsmål og billedsvar.
export const MINI_TEXTS = [
  { t: 'Ida har en rød bold. Hun leger med sin hund.', q: 'Hvem leger Ida med?', a: '🐶', d: ['🐱', '🐴'] },
  { t: 'Bo spiser en banan. Bagefter drikker han mælk.', q: 'Hvad drikker Bo?', a: '🥛', d: ['🧃', '☕'] },
  { t: 'Det regner i dag. Mia tager sin paraply med.', q: 'Hvad tager Mia med?', a: '☂️', d: ['⚽', '🎒'] },
  { t: 'Katten sover i sengen. Musen gemmer sig under stolen.', q: 'Hvor gemmer musen sig?', a: '🪑', d: ['🛏️', '🚪'] },
  { t: 'Far bager en kage. Den er til mors fødselsdag.', q: 'Hvad bager far?', a: '🎂', d: ['🍞', '🍕'] },
  { t: 'Om vinteren bygger vi en snemand. Den får en gulerod som næse.', q: 'Hvad får snemanden som næse?', a: '🥕', d: ['🍌', '🥒'] },
  { t: 'Frøen sidder på et blad. Den fanger en flue.', q: 'Hvad fanger frøen?', a: '🪰', d: ['🐟', '🐌'] },
  { t: 'Vi kører med toget til farmor. Turen tager en time.', q: 'Hvordan kommer de til farmor?', a: '🚂', d: ['🚗', '✈️'] },
  { t: 'Uglen sover om dagen. Om natten flyver den ud.', q: 'Hvornår flyver uglen ud?', a: '🌙', d: ['☀️', '🌈'] },
  { t: 'Lise har fået en kanin. Den spiser gulerødder og salat.', q: 'Hvilket dyr har Lise fået?', a: '🐰', d: ['🐹', '🐶'] },
];

// Læsefyret niveau 5: længere tekster med spørgsmål og tekstsvar (læseforståelse uden billeder).
export const TEXTS = [
  { t: 'Bo og Mia går til stranden. Bo bygger et slot af sand. Mia finder en krabbe og viser den til Bo.', q: 'Hvad finder Mia?', a: 'en krabbe', d: ['et slot', 'en sten', 'en fisk'] },
  { t: 'Om morgenen var himlen grå. Ved frokost kom solen frem, og børnene løb ud for at lege.', q: 'Hvornår kom solen frem?', a: 'ved frokost', d: ['om morgenen', 'om aftenen', 'om natten'] },
  { t: 'Sara ville lave pandekager. Hun havde mel og mælk, men hun manglede æg. Hun lånte to æg af naboen.', q: 'Hvad manglede Sara?', a: 'æg', d: ['mel', 'mælk', 'sukker'] },
  { t: 'Hunden Fido er bange for torden. Når det tordner, kryber den ind under sofaen.', q: 'Hvor gemmer Fido sig?', a: 'under sofaen', d: ['i sengen', 'i haven', 'bag døren'] },
  { t: 'Emil har ondt i maven. Han spiste tre is i går. I dag vil han kun have vand.', q: 'Hvorfor har Emil ondt i maven?', a: 'han spiste tre is', d: ['han drak vand', 'han løb for hurtigt', 'han sov for lidt'] },
  { t: 'Klassen skal i zoo. De ser løver, giraffer og aber. Aberne er det sjoveste, fordi de laver sjove grimasser.', q: 'Hvilke dyr synes klassen er sjovest?', a: 'aberne', d: ['løverne', 'girafferne', 'pingvinerne'] },
  { t: 'Mormor strikker en blå hue til Asta. Den bliver færdig til jul, så Asta kan bruge den i sneen.', q: 'Hvilken farve har huen?', a: 'blå', d: ['rød', 'grøn', 'gul'] },
  { t: 'Noah vandede sine planter hver dag. Efter en uge kom der små røde tomater.', q: 'Hvad voksede der på planterne?', a: 'tomater', d: ['æbler', 'jordbær', 'agurker'] },
  { t: 'Det var Ellas første dag i den nye skole. Hun var nervøs, men en pige ved navn Nora spurgte, om hun ville lege.', q: 'Hvem spurgte Ella, om hun ville lege?', a: 'Nora', d: ['Ella', 'læreren', 'Mia'] },
];
