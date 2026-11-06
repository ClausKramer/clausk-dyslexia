// Sætninger til Læsefyret. Niveau 1: korte sætninger med ét billede.
// Niveau 2: subjekt + handling → sammensat billede (to emoji). Niveau 3: ja/nej-spørgsmål og længere sætninger.

export const SUBJECTS = [
  { t: 'Katten', e: '🐱' }, { t: 'Hunden', e: '🐶' }, { t: 'Musen', e: '🐭' }, { t: 'Drengen', e: '👦' },
  { t: 'Pigen', e: '👧' }, { t: 'Bjørnen', e: '🐻' }, { t: 'Fuglen', e: '🐦' }, { t: 'Aben', e: '🐵' },
  { t: 'Koen', e: '🐄' }, { t: 'Frøen', e: '🐸' },
];

export const ACTIONS = [
  { t: 'spiser is', e: '🍦', long: 'spiser en stor, kold is' },
  { t: 'spiser kage', e: '🎂', long: 'spiser en sød kage' },
  { t: 'har en bold', e: '⚽', long: 'har en rund bold' },
  { t: 'ser en bil', e: '🚗', long: 'ser en rød bil' },
  { t: 'har en hat', e: '🎩', long: 'har en høj hat på' },
  { t: 'læser en bog', e: '📖', long: 'læser en tyk bog' },
  { t: 'sover i en seng', e: '🛏️', long: 'sover i en blød seng' },
  { t: 'kører i tog', e: '🚂', long: 'kører med et langt tog' },
  { t: 'er i huset', e: '🏠', long: 'er inde i det lille hus' },
  { t: 'har et æble', e: '🍎', long: 'har et rødt æble' },
  { t: 'ser en stjerne', e: '⭐', long: 'ser en lysende stjerne' },
  { t: 'spiser en banan', e: '🍌', long: 'spiser en gul banan' },
];

// Simple niveau-1 sætninger: "Her er en kat." → vælg 🐱
export const SIMPLE_FRAMES = ['Her er en ___.', 'Se en ___.', 'Jeg har en ___.', 'Det er en ___.'];

// Ja/nej-spørgsmål (læseforståelse) til niveau 3.
export const YESNO = [
  { q: 'Kan en fisk flyve?', a: false, e: '🐟' },
  { q: 'Er sne kold?', a: true, e: '❄️' },
  { q: 'Har en hund fire ben?', a: true, e: '🐶' },
  { q: 'Kan en bil svømme?', a: false, e: '🚗' },
  { q: 'Spiser en ko græs?', a: true, e: '🐄' },
  { q: 'Er solen gul?', a: true, e: '☀️' },
  { q: 'Bor fisk i et træ?', a: false, e: '🌳' },
  { q: 'Kan en fugl flyve?', a: true, e: '🐦' },
  { q: 'Er is varm?', a: false, e: '🍦' },
  { q: 'Har en kat en hale?', a: true, e: '🐱' },
  { q: 'Kan en sten sove?', a: false, e: '🪨' },
  { q: 'Er en banan gul?', a: true, e: '🍌' },
  { q: 'Kører et tog på vandet?', a: false, e: '🚂' },
  { q: 'Har en mus store ører?', a: true, e: '🐭' },
  { q: 'Kan en frø hoppe?', a: true, e: '🐸' },
  { q: 'Spiser en løve kage?', a: false, e: '🦁' },
  { q: 'Er en elefant lille?', a: false, e: '🐘' },
  { q: 'Kan man læse i en bog?', a: true, e: '📖' },
];
