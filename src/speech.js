// Dansk oplæsning via browserens Web Speech API (ingen eksterne tjenester).
// Enkeltlyde: talesyntesen udtaler bogstaver som navne ("be"), så vi bruger forlængede former for de lyde,
// der kan holdes (sss, mmm ...). Se TILE_SPEECH i content/phonemes.js.

import { speechFor } from './content/phonemes.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null;
let rate = 0.9;
let token = 0;

function pickVoice() {
  if (!synth) return null;
  const voices = synth.getVoices();
  const da = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('da'));
  // Foretræk lokale/naturlige stemmer.
  const preferred = da.find((v) => /natural|premium|enhanced|neural/i.test(v.name)) || da.find((v) => v.localService) || da[0];
  voice = preferred || null;
  return voice;
}

export function initSpeech() {
  if (!synth) return;
  pickVoice();
  synth.onvoiceschanged = () => pickVoice();
}

export const hasSpeech = () => !!synth;
export const hasDanishVoice = () => !!(voice || pickVoice());
export function setRate(r) { rate = r; }

/** Afbryd al igangværende tale. */
export function stop() {
  token++;
  if (synth) synth.cancel();
}

function speakOne(txt, { r = rate, pitch = 1 } = {}) {
  return new Promise((resolve) => {
    if (!synth || !txt) return resolve();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'da-DK';
    if (voice) u.voice = voice;
    u.rate = r;
    u.pitch = pitch;
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    u.onend = finish;
    u.onerror = finish;
    // Sikkerhedsnet: nogle browsere sender aldrig onend.
    setTimeout(finish, Math.max(1500, txt.length * 120 + 800));
    synth.speak(u);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Afspil en sekvens af dele: {text}, {tiles:[...], gap}, {pause: ms}.
 * Returnerer et promise, der løses når alt er sagt (eller afbrudt).
 */
export async function speakParts(parts) {
  if (!synth) return;
  const my = ++token;
  synth.cancel();
  await sleep(60);
  for (const p of parts) {
    if (my !== token) return;
    if (p.pause) await sleep(p.pause);
    else if (p.text) await speakOne(p.text);
    else if (p.tiles) {
      for (const t of p.tiles) {
        if (my !== token) return;
        await speakOne(speechFor(t), { r: Math.min(rate, 0.8) });
        await sleep(p.gap || 350);
      }
    }
  }
}

export const say = (t) => speakParts([{ text: t }]);

/** iOS/Safari kræver en brugerhandling før tale virker – kald ved første klik. */
export function unlock() {
  if (!synth) return;
  try { const u = new SpeechSynthesisUtterance(''); u.lang = 'da-DK'; synth.speak(u); } catch { /* ignorer */ }
}
