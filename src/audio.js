// Små spil-lyde via Web Audio (ingen lydfiler).
let ctx = null;
let enabled = true;

function ac() {
  if (!ctx && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ctx;
}

export function setSoundsEnabled(on) { enabled = on; }

function tone(freq, start, dur, type = 'sine', vol = 0.15) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

export function playCorrect() {
  if (!enabled) return;
  tone(523, 0, 0.15); tone(659, 0.12, 0.15); tone(784, 0.24, 0.25);
}
export function playWrong() {
  if (!enabled) return;
  tone(220, 0, 0.2, 'triangle', 0.1); tone(196, 0.18, 0.25, 'triangle', 0.1);
}
export function playTap() {
  if (!enabled) return;
  tone(880, 0, 0.06, 'sine', 0.05);
}
export function playFanfare() {
  if (!enabled) return;
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3));
  tone(1319, 0.5, 0.5);
}
export function resumeAudio() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume();
}
