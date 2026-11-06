# Lydøen 🏝️ – et adaptivt læsespil til ordblinde børn

Lydøen er et dansk læsespil, hvor barnet leger sig til læsning uden at opdage, at det øver.
Spillet følger med i, hvilke områder barnet har svært ved, giver flere opgaver dér – og holder samtidig
øje med, hvad barnet er god til, så niveauet hæves, og succesoplevelserne bliver ved med at komme.

Spillet er bygget med udgangspunkt i forskning om ordblindhed (fonologisk opmærksomhed, systematisk
bogstav-lyd-træning, lydsyntese/-analyse, morfologi, mange gentagelser med høj succesrate).
Se [docs/forskning.md](docs/forskning.md) for referencer og for hvordan forskningen er omsat til design.

## Sådan kører du spillet

Spillet er ren HTML/CSS/JavaScript uden byggetrin og uden afhængigheder.

```bash
npm start          # starter en lille webserver på http://localhost:8080
npm test           # kører testene (node --test)
```

Du kan også hoste mappen hvor som helst (fx GitHub Pages) – der er kun statiske filer.

**Oplæsning:** Spillet bruger browserens indbyggede danske talesyntese (Web Speech API). Det virker bedst i
Chrome, Edge og Safari med en dansk stemme installeret i styresystemet (på Mac: Systemindstillinger → Tilgængelighed →
Oplæst indhold → Systemstemme → Dansk; på Windows: Indstillinger → Tid og sprog → Tale). På iPad/iPhone findes en dansk
stemme som standard. Alle data gemmes lokalt i browseren (ingen konto, ingen server).

## Spiluniverset

Barnet er på Lydøen med en drage, der vokser af stjerner. Øen har ni steder – ét pr. færdighedsområde:

| Sted | Færdighed | Opgaver |
| --- | --- | --- |
| 🦇 Lydhulen | Fonemisk opmærksomhed | Første/sidste lyd i ord, rim, samme startlyd |
| ⛰️ Bogstavbjerget | Bogstav ↔ lyd | Hør lyd → vælg bogstav; se bogstav → vælg ord |
| 🌉 Lydbroen | Lydsyntese (blending) | Hør/læs lydene én ad gangen → find ordet |
| 🏗️ Byggepladsen | Lydanalyse (segmentering) | Byg ordet af lydbrikker i rækkefølge |
| 🌋 Vokalvulkanen | Vokaler | Hvilken vokal mangler i "h_st"? |
| 🪨 Klyngekløften | Konsonantklynger | Hvilke lyde starter "__ad"? |
| 🧌 Troldeskoven | Hyppige, ulydrette småord | Hør ordet → find det; udfyld hul i sætning |
| 🔧 Ordværkstedet | Morfologi | Sæt ord sammen, del ord op, bøj ord |
| 🗼 Læsefyret | Sætningslæsning og forståelse | Læs sætning → find billede; ja/nej-spørgsmål |

Stederne åbnes gradvist, når forudsætningerne er på plads (kan slås fra under "Voksen").
Knappen **Spil!** lader motoren vælge en blandet mission på 8 opgaver; barnet kan også vælge et sted selv.

Alle instruktioner læses højt, alle svar er billeder eller knapper, så barnet aldrig er afhængig af at kunne
læse menuer. Forkerte svar straffes ikke: første gang "prøv igen", anden gang vises det rigtige svar, og barnet
trykker på det (model → gentag). 💡 Hjælp fjerner et forkert svar.

## Den adaptive motor (`src/engine/adaptive.js`)

* **Mestring pr. område** (0–1): glidende gennemsnit af de seneste svar (rigtig = 1, med hjælp = 0,5, forkert = 0).
* **Niveau 1–3 pr. område:** hæves efter 4 rigtige i træk med høj mestring; sænkes efter 3 forkerte i træk.
  Forældre kan justere manuelt.
* **Valg af næste område:** vægtet sandsynlighed, hvor
  * svage områder vægtes kraftigt op (`1,5 · (1 − mestring)²`),
  * områder, der ikke er set længe, vægtes op (vedligehold / spaced review),
  * nye områder udforskes først,
  * samme område dæmpes, hvis det lige har været brugt (interleaving),
  * **succesbalance:** efter en svær stribe (< 60 % rigtige) favoriseres stærke områder, så barnet får succes;
    efter en let stribe (> 90 %) fylder svage områder mere. Målet er ca. 70–85 % rigtige.
* **Brikker (Leitner-bokse):** hvert bogstav, vokal, klynge og ord har en boks 0–4. Fejl → boks 0 og brikken
  kommer snart igen; rigtige → længere interval (5 min, 30 min, 1 dag, 3 dage, 7 dage).
* **Forvekslinger:** hvert forkert valg registreres som "forventet | valgt" (fx b|d, o|ø, det|der), så
  forældre kan se mønstre, og generatorerne bruger forvekslelige distraktorer på højere niveauer.

## Forældreoverblik ("Voksen")

Åbnes med et lille regnestykke. Viser pr. område: status (ny / svag / øver / stærk), mestring, niveau, antal
opgaver, succesrate, tendens og svartid. Desuden anbefalinger med konkrete tips, forvekslinger, brikker der
driller, læsehastighed (Læsefyret), seneste missioner, indstillinger (oplæsning, bogstavafstand, tekststørrelse,
talehastighed, lås alt op) og backup/import som JSON.

## Projektstruktur

```
index.html, styles.css        – app-skal og dysleksivenlig typografi
src/main.js                   – skærme og spilflow
src/engine/adaptive.js        – mestring, niveauer, vægtning, Leitner, analyse
src/tasks/index.js            – opgavegeneratorer (én pr. område)
src/content/                  – ord (med lydbrikker og emoji), småord, sætninger, kategorier, lyde
src/speech.js, src/audio.js   – oplæsning og spil-lyde
src/storage.js                – localStorage, eksport/import
tests/                        – motor-, indholds- og generatortests
docs/forskning.md             – forskningsgrundlag og designvalg
```

## Udvid indholdet

* **Nye ord:** tilføj til `src/content/words.js` med `ph` (lydbrikker, der tilsammen staver ordet), `e` (emoji),
  `lvl`, evt. `rhyme`, `cluster`, `silent`. Testene tjekker, at brikkerne staver ordet.
* **Nye småord/sætninger:** `src/content/sightWords.js` og `src/content/sentences.js`.
* **Nyt område:** tilføj kategori i `categories.js`, en generator i `tasks/index.js` og registrér den i `GENERATORS`.

## Idéer til næste skridt

* Indspil rigtige bogstavlyde (forælder eller lærer) i stedet for talesyntesens tilnærmelser.
* Flere opgavetyper: skriv ordet med tastatur, læs højt med mikrofon (talegenkendelse), længere tekster.
* Rigtige illustrationer i stedet for emoji.
* Synkronisering mellem enheder (p.t. kun lokal lagring + manuel backup).
