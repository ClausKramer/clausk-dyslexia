// Hyppige, ofte ulydrette småord ("ordbilleder"). Grupperet så distraktorerne ligner hinanden –
// det er præcis de forvekslinger, ordblinde børn typisk laver.

export const SIGHT_GROUPS = [
  ['det', 'de', 'der', 'den'],
  ['jeg', 'dig', 'mig', 'sig'],
  ['hvad', 'hvor', 'hvem', 'hvis'],
  ['og', 'så', 'på', 'af'],
  ['er', 'en', 'et', 'at'],
  ['han', 'hun', 'kan', 'hen'],
  ['skal', 'vil', 'var', 'har'],
  ['ikke', 'også', 'med', 'til'],
  ['min', 'din', 'sin', 'vin'],
  ['vi', 'I', 'os', 'du'],
  ['nu', 'ud', 'op', 'ned'],
  ['her', 'der', 'hen', 'hjem'],
  ['hvorfor', 'hvornår', 'hvordan', 'hvilken'],
  ['nogle', 'noget', 'nogen', 'nok'],
  ['meget', 'mange', 'mere', 'mest'],
  ['altid', 'aldrig', 'alle', 'alt'],
  ['fordi', 'for', 'før', 'først'],
  ['kunne', 'kunde', 'kende', 'kan'],
  ['sagde', 'sammen', 'samme', 'sad'],
  ['ved', 'vej', 'vil', 'vist'],
];

export const SIGHT_WORDS = [...new Set(SIGHT_GROUPS.flat())];

export function sightGroupOf(word) {
  return SIGHT_GROUPS.find((g) => g.includes(word)) || SIGHT_WORDS;
}

// Sætninger med hul. a = rigtigt ord, d = distraktorer (ligner).
export const SIGHT_SENTENCES = [
  { s: 'Jeg ___ en hund.', a: 'har', d: ['her', 'hat'], e: '🐶', lvl: 2 },
  { s: '___ er min bil.', a: 'Det', d: ['Den', 'Der'], e: '🚗', lvl: 2 },
  { s: 'Vi ___ i skole.', a: 'skal', d: ['skol', 'skat'], e: '🏫', lvl: 2 },
  { s: 'Kan du se ___?', a: 'mig', d: ['dig', 'mit'], e: '👋', lvl: 2 },
  { s: 'Hun ___ en kat.', a: 'har', d: ['her', 'hun'], e: '🐱', lvl: 2 },
  { s: 'Mus ___ ost.', a: 'og', d: ['så', 'på'], e: '🐭🧀', lvl: 2 },
  { s: 'Bolden er ___ bordet.', a: 'på', d: ['så', 'af'], e: '⚽', lvl: 2 },
  { s: '___ er du?', a: 'Hvor', d: ['Hvad', 'Hvem'], e: '🔍', lvl: 2 },
  { s: '___ hedder du?', a: 'Hvad', d: ['Hvor', 'Hvis'], e: '🙋', lvl: 2 },
  { s: 'Jeg vil ___ have is.', a: 'ikke', d: ['også', 'inde'], e: '🙅', lvl: 2 },
  { s: 'Jeg vil ___ have is.', a: 'også', d: ['ikke', 'oven'], e: '🍦', lvl: 2 },
  { s: 'Det ___ min bog.', a: 'er', d: ['en', 'et'], e: '📖', lvl: 2 },
  { s: 'Han ___ løbe hurtigt.', a: 'kan', d: ['han', 'kun'], e: '🏃', lvl: 3 },
  { s: 'Vi går ___ i haven.', a: 'ud', d: ['nu', 'op'], e: '🌳', lvl: 3 },
  { s: 'Kom ___ til mig.', a: 'hen', d: ['her', 'hun'], e: '🫶', lvl: 3 },
  { s: 'Nu går vi ___.', a: 'hjem', d: ['hen', 'her'], e: '🏠', lvl: 3 },
  { s: '___ vil du lege med?', a: 'Hvem', d: ['Hvad', 'Hvor'], e: '🧸', lvl: 3 },
  { s: 'Jeg kommer, ___ det regner.', a: 'hvis', d: ['hvor', 'hvad'], e: '🌧️', lvl: 3 },
  { s: 'Katten sover ___ sengen.', a: 'i', d: ['I', 'is'], e: '🐱🛏️', lvl: 3 },
  { s: 'Bogen er ___ Ida.', a: 'til', d: ['vil', 'tal'], e: '🎁', lvl: 3 },
  { s: '___ er himlen blå?', a: 'Hvorfor', d: ['Hvornår', 'Hvordan'], e: '🌤️', lvl: 4 },
  { s: '___ kommer du hjem?', a: 'Hvornår', d: ['Hvorfor', 'Hvordan'], e: '🕒', lvl: 4 },
  { s: '___ laver man en kage?', a: 'Hvordan', d: ['Hvornår', 'Hvilken'], e: '🎂', lvl: 4 },
  { s: 'Jeg har ___ kugler i lommen.', a: 'nogle', d: ['noget', 'nogen'], e: '🔮', lvl: 4 },
  { s: 'Har du ___ slik?', a: 'noget', d: ['nogle', 'nogen'], e: '🍬', lvl: 4 },
  { s: 'Der er ___ fugle i træet.', a: 'mange', d: ['meget', 'mere'], e: '🐦', lvl: 4 },
  { s: 'Jeg er ___ glad i dag.', a: 'meget', d: ['mange', 'mest'], e: '😄', lvl: 4 },
  { s: 'Vi leger ___ i frikvarteret.', a: 'sammen', d: ['samme', 'sagde'], e: '🤝', lvl: 4 },
  { s: 'Hun ___ hej til mig.', a: 'sagde', d: ['sammen', 'samme'], e: '👋', lvl: 4 },
  { s: 'Jeg spiser, ___ jeg er sulten.', a: 'fordi', d: ['for', 'først'], e: '🍽️', lvl: 4 },
  { s: 'Han spiser ___ fisk. Han kan ikke lide det.', a: 'aldrig', d: ['altid', 'alle'], e: '🐟', lvl: 5 },
  { s: 'Solen står ___ op om morgenen.', a: 'altid', d: ['aldrig', 'alt'], e: '🌅', lvl: 5 },
  { s: '___ børnene løb ud i sneen.', a: 'Alle', d: ['Alt', 'Altid'], e: '❄️', lvl: 5 },
  { s: 'Jeg ___ ikke, hvor min bold er.', a: 'ved', d: ['vej', 'vil'], e: '🤷', lvl: 5 },
  { s: 'Han ___ ikke komme i går.', a: 'kunne', d: ['kunde', 'kende'], e: '🏠', lvl: 5 },
  { s: 'Hun ___ i sofaen og læste.', a: 'sad', d: ['sagde', 'samme'], e: '🛋️', lvl: 5 },
  { s: 'Der er ___ et æble tilbage.', a: 'kun', d: ['kan', 'kom'], e: '🍎', lvl: 5 },
  { s: 'Kan du hjælpe ___ med lektierne?', a: 'mig', d: ['min', 'mit'], e: '📚', lvl: 5 },
  { s: 'Det er ___ tur til at slå.', a: 'din', d: ['dig', 'dit'], e: '🎲', lvl: 5 },
  { s: 'Vi skal ___ spise, så kan vi lege.', a: 'først', d: ['før', 'fordi'], e: '🍝', lvl: 5 },
];
