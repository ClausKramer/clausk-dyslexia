// Øerne: én svævende ø pr. færdighedsområde med et vartegn, plus hjemmeøen med dragens rede.
// Øen vokser (træer, blomster, svampe, krystal) med barnets fremskridt, og flag viser niveauet.
import * as THREE from 'three';
import { letterTexture } from './effects.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
function mesh(geo, mat, p = [0, 0, 0], s = 1, r = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p);
  if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(...s);
  m.rotation.set(...r);
  return m;
}
const place = (obj, p) => { obj.position.set(p[0], p[1], p[2]); return obj; };
const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

export function tree(scale = 1, color = '#3f9a4a') {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 5), std('#8a5a2b'), [0, 0.3, 0]));
  g.add(mesh(new THREE.ConeGeometry(0.6, 1.1, 6), std(color), [0, 1.0, 0]));
  g.add(mesh(new THREE.ConeGeometry(0.45, 0.8, 6), std(color), [0, 1.5, 0]));
  g.scale.setScalar(scale);
  return g;
}
function flower(color) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4), std('#4f8f3a'), [0, 0.17, 0]));
  g.add(mesh(new THREE.IcosahedronGeometry(0.13, 0), std(color), [0, 0.38, 0]));
  return g;
}
function mushroom() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.3, 6), std('#fff4d6'), [0, 0.15, 0]));
  g.add(mesh(new THREE.SphereGeometry(0.22, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), std('#e5394f'), [0, 0.28, 0]));
  return g;
}
function letterBlock(letter, color, size = 0.7) {
  const tex = letterTexture(letter, '#fffdf7', color);
  return new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
}

// ---------- Vartegn ----------
const LANDMARKS = {
  fonem(c, anim) { // Lydhulen: klippehule med flagermus
    const g = new THREE.Group();
    g.add(mesh(new THREE.SphereGeometry(1.6, 9, 7, 0, Math.PI * 2, 0, Math.PI / 2), std('#7d6f63'), [0, 0, 0], [1.1, 1.0, 1]));
    g.add(mesh(new THREE.CircleGeometry(0.75, 10, 0, Math.PI), std('#1d1a24'), [0, 0.02, 1.55], [1, 1.1, 1]));
    const bats = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Group();
      b.add(mesh(new THREE.SphereGeometry(0.14, 6, 4), std('#3a2f4a')));
      b.add(mesh(new THREE.ConeGeometry(0.25, 0.05, 3), std('#3a2f4a'), [0.22, 0.02, 0], 1, [0, 0, Math.PI / 2]));
      b.add(mesh(new THREE.ConeGeometry(0.25, 0.05, 3), std('#3a2f4a'), [-0.22, 0.02, 0], 1, [0, 0, -Math.PI / 2]));
      b.userData.phase = i * 2.1;
      bats.add(b);
    }
    g.add(bats);
    anim.push((t) => bats.children.forEach((b) => { const a = t * 1.4 + b.userData.phase; b.position.set(Math.cos(a) * 1.8, 2.2 + Math.sin(a * 2) * 0.3, Math.sin(a) * 1.8); b.rotation.y = -a; }));
    return g;
  },
  bogstav(c, anim) { // Bogstavbjerget: bjerge med sne og svævende bogstaver
    const g = new THREE.Group();
    g.add(mesh(new THREE.ConeGeometry(1.5, 2.8, 6), std('#9a9184'), [0, 1.4, 0]));
    g.add(mesh(new THREE.ConeGeometry(0.62, 0.9, 6), std('#ffffff'), [0, 2.4, 0]));
    g.add(mesh(new THREE.ConeGeometry(1.0, 1.8, 6), std('#a89f90'), [1.2, 0.9, 0.5]));
    g.add(mesh(new THREE.ConeGeometry(0.4, 0.5, 6), std('#ffffff'), [1.2, 1.6, 0.5]));
    const letters = ['a', 'b', 's'].map((l, i) => { const b = letterBlock(l, c.color, 0.6); b.userData.phase = i * 2.1; g.add(b); return b; });
    anim.push((t) => letters.forEach((b) => { const a = t * 0.6 + b.userData.phase; b.position.set(Math.cos(a) * 2.1, 2.6 + Math.sin(t * 1.5 + b.userData.phase) * 0.3, Math.sin(a) * 2.1); b.rotation.y = t * 0.8; }));
    return g;
  },
  syntese(c) { // Lydbroen: buebro
    const g = new THREE.Group();
    g.add(mesh(new THREE.TorusGeometry(1.5, 0.22, 6, 14, Math.PI), std(c.color), [0, 0, 0]));
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI;
      g.add(mesh(new THREE.BoxGeometry(0.35, 0.12, 0.8), std('#b98a5a'), [Math.cos(a) * 1.5, Math.sin(a) * 1.5 + 0.18, 0], 1, [0, 0, a - Math.PI / 2]));
    }
    g.add(mesh(new THREE.DodecahedronGeometry(0.55, 0), std('#8f8578'), [1.7, 0.3, 0]));
    g.add(mesh(new THREE.DodecahedronGeometry(0.55, 0), std('#8f8578'), [-1.7, 0.3, 0]));
    return g;
  },
  analyse(c, anim) { // Byggepladsen: kran og bogstavklodser
    const g = new THREE.Group();
    const yellow = std('#f2b705');
    g.add(mesh(new THREE.BoxGeometry(0.3, 3.2, 0.3), yellow, [-1, 1.6, 0]));
    const arm = new THREE.Group();
    arm.position.set(-1, 3.2, 0);
    arm.add(mesh(new THREE.BoxGeometry(2.8, 0.22, 0.22), yellow, [0.9, 0, 0]));
    arm.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4), std('#444'), [2, -0.6, 0]));
    const hook = letterBlock('o', c.color, 0.5);
    hook.position.set(2, -1.4, 0);
    arm.add(hook);
    g.add(arm);
    'kat'.split('').forEach((l, i) => g.add(place(letterBlock(l, c.color, 0.6), [0.1 + i * 0.65, 0.3, 0.6])));
    anim.push((t) => { arm.rotation.y = Math.sin(t * 0.4) * 0.6; });
    return g;
  },
  vokal(c, anim, fx) { // Vokalvulkanen: vulkan med glød og røg
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.55, 1.7, 2.4, 8), std('#6e5a4f'), [0, 1.2, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 8), std('#ff5a2a', { emissive: '#ff3a00', emissiveIntensity: 0.8 }), [0, 2.42, 0]));
    const top = new THREE.Vector3();
    let acc = 0;
    anim.push((t, dt) => {
      acc += dt;
      if (fx && acc > 0.25) {
        acc = 0;
        g.localToWorld(top.set(0, 2.5, 0));
        fx.emit(top, { color: Math.random() < 0.3 ? '#ff7a3d' : '#887777', speed: 1.4, dir: { x: 0, y: 1, z: 0 }, spread: 0.3, life: 1.8, gravity: 0.2 });
      }
    });
    return g;
  },
  klynge(c) { // Klyngekløften: to klippesøjler med kløft
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.6, 0.9, 2.6, 6), std('#7f8c6b'), [-0.9, 1.3, 0], 1, [0, 0, 0.08]));
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.85, 2.2, 6), std('#8b977a'), [0.9, 1.1, 0.1], 1, [0, 0, -0.1]));
    g.add(mesh(new THREE.DodecahedronGeometry(0.4, 0), std('#6f7a5c'), [0, 2.2, 0]));
    return g;
  },
  ordbilleder(c, anim) { // Troldeskoven: skov og en venlig trold
    const g = new THREE.Group();
    [[-1.2, 0.6], [1.1, -0.6], [-0.6, -1.1], [1.3, 0.9], [0, 1.3]].forEach(([x, z], i) => { const tr = tree(0.9 + (i % 2) * 0.3, '#2f7a3a'); tr.position.set(x, 0, z); g.add(tr); });
    const troll = new THREE.Group();
    troll.add(mesh(new THREE.SphereGeometry(0.45, 8, 6), std('#7aa35a'), [0, 0.45, 0], [1, 1.1, 1]));
    troll.add(mesh(new THREE.SphereGeometry(0.32, 8, 6), std('#86b066'), [0, 1.05, 0.05]));
    troll.add(mesh(new THREE.SphereGeometry(0.12, 6, 4), std('#5f8a43'), [0, 1.0, 0.36]));
    troll.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), std('#1d1a24'), [0.11, 1.15, 0.28]));
    troll.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), std('#1d1a24'), [-0.11, 1.15, 0.28]));
    troll.add(mesh(new THREE.ConeGeometry(0.2, 0.4, 6), std('#8a5a2b'), [0, 1.45, 0]));
    troll.position.set(0.3, 0, 0.2);
    g.add(troll);
    anim.push((t) => { troll.rotation.y = Math.sin(t * 0.7) * 0.6; troll.position.y = Math.abs(Math.sin(t * 2)) * 0.12; });
    return g;
  },
  morfem(c, anim) { // Ordværkstedet: hytte med tandhjul
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(2, 1.3, 1.6), std('#d9b48a'), [0, 0.65, 0]));
    g.add(mesh(new THREE.ConeGeometry(1.55, 1.0, 4), std(c.color), [0, 1.8, 0], [1, 1, 0.85], [0, Math.PI / 4, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.45, 0.75, 0.05), std('#7a4a26'), [0, 0.38, 0.81]));
    const gear = new THREE.Group();
    gear.add(mesh(new THREE.TorusGeometry(0.45, 0.12, 5, 12), std('#9aa3ad', { metalness: 0.5, roughness: 0.4 })));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; gear.add(mesh(new THREE.BoxGeometry(0.18, 0.22, 0.14), std('#9aa3ad', { metalness: 0.5 }), [Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0], 1, [0, 0, a])); }
    gear.position.set(0.6, 1.0, 0.9);
    g.add(gear);
    anim.push((t) => { gear.rotation.z = t * 0.8; });
    return g;
  },
  saetning(c, anim) { // Læsefyret: fyrtårn med roterende lys
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.CylinderGeometry(0.5 - i * 0.06, 0.56 - i * 0.06, 0.8, 10), std(i % 2 ? '#ffffff' : '#e5394f'), [0, 0.4 + i * 0.8, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 10), std('#fff6c8', { emissive: '#ffd84a', emissiveIntensity: 0.9 }), [0, 3.45, 0]));
    g.add(mesh(new THREE.ConeGeometry(0.5, 0.5, 10), std('#2f3a4a'), [0, 3.95, 0]));
    const beam = mesh(new THREE.ConeGeometry(0.9, 6, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), [0, 0, 3], 1, [Math.PI / 2, 0, 0]);
    const pivot = new THREE.Group();
    pivot.position.set(0, 3.45, 0);
    pivot.add(beam);
    g.add(pivot);
    anim.push((t) => { pivot.rotation.y = t * 0.9; });
    return g;
  },
};

/** Svævende ø for én kategori. Returnerer et objekt med update(state) og animate(t, dt). */
export function buildCategoryIsland(cat, fx) {
  const group = new THREE.Group();
  group.userData.cat = cat.id;
  const anim = [];
  const r = rnd(cat.id.split('').reduce((s, ch) => s + ch.charCodeAt(0) * 31, 7));

  const grass = std('#7cc96b');
  const rock = std('#9b8468');
  group.add(mesh(new THREE.CylinderGeometry(3.2, 3.0, 0.8, 10), grass, [0, -0.4, 0]));
  group.add(mesh(new THREE.ConeGeometry(3.0, 4.2, 10), rock, [0, -2.9, 0], 1, [Math.PI, 0, 0]));
  for (let i = 0; i < 4; i++) group.add(mesh(new THREE.DodecahedronGeometry(0.4 + r() * 0.4, 0), rock, [(r() - 0.5) * 3, -1.3 - r() * 1.5, (r() - 0.5) * 3]));
  // Farvet kant i kategoriens farve, så øerne kan kendes fra hinanden.
  group.add(mesh(new THREE.TorusGeometry(3.15, 0.12, 4, 24), std(cat.color), [0, -0.05, 0], 1, [Math.PI / 2, 0, 0]));

  const landmark = LANDMARKS[cat.id](cat, anim, fx);
  group.add(landmark);

  // Vækst-lag 1-4
  const growth = [new THREE.Group(), new THREE.Group(), new THREE.Group(), new THREE.Group()];
  const rim = (k) => { const a = r() * Math.PI * 2; const d = 2.0 + r() * 0.9; return [Math.cos(a) * d, 0, Math.sin(a) * d]; };
  for (let i = 0; i < 3; i++) growth[0].add(place(flower(['#ff6fa8', '#ffe066', '#ffffff'][i]), rim()));
  for (let i = 0; i < 2; i++) growth[1].add(place(tree(0.6 + r() * 0.3), rim()));
  for (let i = 0; i < 4; i++) growth[1].add(place(flower(['#b18cff', '#ff9a4a'][i % 2]), rim()));
  for (let i = 0; i < 3; i++) growth[2].add(place(mushroom(), rim()));
  for (let i = 0; i < 2; i++) growth[2].add(place(tree(0.7 + r() * 0.3, '#5fb85a'), rim()));
  const crystal = mesh(new THREE.OctahedronGeometry(0.55, 0), std(cat.color, { emissive: cat.color, emissiveIntensity: 0.6, roughness: 0.3 }), [0, 5.2, 0], [0.8, 1.3, 0.8]);
  growth[3].add(crystal);
  growth.forEach((gg) => { gg.visible = false; group.add(gg); });

  // Niveauflag
  const flags = [0, 1, 2].map((i) => {
    const f = new THREE.Group();
    const a = Math.PI * 0.75 + i * 0.35;
    f.position.set(Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6);
    f.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 4), std('#5a4636'), [0, 0.7, 0]));
    f.add(mesh(new THREE.ConeGeometry(0.28, 0.6, 3), std(cat.color), [0.25, 1.2, 0], [1, 1, 0.25], [0, 0, -Math.PI / 2]));
    f.visible = false;
    group.add(f);
    return f;
  });

  // Fokus-ring ("øv her") og låse-sky
  const ring = mesh(new THREE.TorusGeometry(3.7, 0.1, 6, 40), new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.8 }), [0, 0.1, 0], 1, [Math.PI / 2, 0, 0]);
  ring.visible = false;
  group.add(ring);
  const cloud = new THREE.Group();
  const cloudMat = std('#f4f6fb', { roughness: 1 });
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; cloud.add(mesh(new THREE.IcosahedronGeometry(1.2 + r() * 0.6, 1), cloudMat, [Math.cos(a) * 2.4, 0.8 + r() * 1.2, Math.sin(a) * 2.4])); }
  cloud.add(mesh(new THREE.IcosahedronGeometry(2.2, 1), cloudMat, [0, 2.2, 0]));
  cloud.visible = false;
  group.add(cloud);

  const state = { growth: -1, level: 0, focus: null, unlocked: null };
  let pulse = 0;

  return {
    group,
    labelAnchor: new THREE.Vector3(0, 4.6, 0),
    update(s) {
      if (s.unlocked !== state.unlocked) { cloud.visible = !s.unlocked; landmark.visible = s.unlocked; }
      if (s.growth !== state.growth || s.level !== state.level) {
        if (state.growth >= 0 && (s.growth > state.growth || s.level > state.level)) pulse = 1;
        growth.forEach((gg, i) => { gg.visible = s.unlocked && s.growth >= i + 1; });
        flags.forEach((f, i) => { f.visible = s.unlocked && s.growth > 0 && i < s.level; });
      }
      ring.visible = !!s.focus && s.unlocked;
      Object.assign(state, s);
    },
    celebrate() { pulse = 1; },
    animate(t, dt) {
      group.position.y = group.userData.baseY + Math.sin(t * 0.6 + group.userData.phase) * 0.35;
      for (const f of anim) f(t, dt);
      crystal.rotation.y = t * 0.9;
      crystal.position.y = 5.2 + Math.sin(t * 1.6) * 0.2;
      if (ring.visible) { ring.material.opacity = 0.45 + Math.sin(t * 3) * 0.35; ring.scale.setScalar(1 + Math.sin(t * 3) * 0.03); }
      if (cloud.visible) cloud.rotation.y = t * 0.05;
      if (pulse > 0) { pulse = Math.max(0, pulse - dt * 0.8); const k = 1 + Math.sin((1 - pulse) * Math.PI) * 0.18; landmark.scale.setScalar(k); }
    },
  };
}

/** Hjemmeøen: sandstrand, palmer og dragens rede. Ligger i vandet. */
export function buildHomeIsland() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(7, 7.8, 1.2, 14), std('#f2dca2'), [0, 0.1, 0]));
  g.add(mesh(new THREE.CylinderGeometry(5.2, 6.4, 1.4, 12), std('#8fd17a'), [0, 0.6, 0]));
  g.add(mesh(new THREE.ConeGeometry(3.2, 2.2, 9), std('#79bd66'), [-1.5, 2.0, -1.5]));
  for (const [x, z, s] of [[4.6, -1.2, 1], [-4.7, -0.6, 0.9], [1.4, -4.9, 1.1]]) {
    const p = new THREE.Group();
    const trunk = std('#a8774a');
    for (let i = 0; i < 5; i++) p.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.55, 6), trunk, [i * 0.07, 0.28 + i * 0.5, 0], 1, [0, 0, -0.08]));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; p.add(mesh(new THREE.ConeGeometry(0.28, 1.6, 4), std('#3f9a4a'), [Math.cos(a) * 0.7 + 0.35, 2.55, Math.sin(a) * 0.7], [1, 1, 0.35], [Math.PI / 2 - 0.5, 0, 0]).rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -a + Math.PI / 2)); }
    p.position.set(x, 1.2, z);
    p.scale.setScalar(s);
    g.add(p);
  }
  const nest = mesh(new THREE.TorusGeometry(1.3, 0.45, 6, 14), std('#a07a4e'), [0.6, 1.5, 2.6], 1, [Math.PI / 2, 0, 0]);
  g.add(nest);
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.DodecahedronGeometry(0.5, 0), std('#a59a8a'), [Math.cos(i) * 6.2, 0.6, Math.sin(i) * 6.2]));
  return { group: g, nestTop: new THREE.Vector3(0.6, 2.1, 2.6) };
}

export function buildCloud(r) {
  const g = new THREE.Group();
  const mat = std('#ffffff', { roughness: 1 });
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) g.add(mesh(new THREE.IcosahedronGeometry(1.2 + r() * 1.2, 1), mat, [i * 1.6 - n * 0.8, r() * 0.6, (r() - 0.5) * 1.2]));
  return g;
}

export { rnd };
