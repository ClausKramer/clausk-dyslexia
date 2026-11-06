// Lydøens 3D-univers. Én WebGL-scene bag brugerfladen, med tilstande:
//   home      – øerne svæver rundt om hjemmeøen, dragen flyver ottetaller, barnet kan dreje og trykke på øer
//   mission   – smal stribe øverst på opgaveskærmen: dragen flyver mod øen ét stykke pr. opgave og samler stjerner
//   celebrate – fuld skærm bag opsummeringen: fyrværkeri, dragen cirkler, øer der er vokset, pulserer
//   lair      – dragehulen (butikken): dragen sidder i reden og drejer, så nyt udstyr kan ses
//   hidden    – voksenzone og mærker: ingen rendering (sparer batteri)
//
// Under opgaverne holdes 3D-visningen bevidst lille og rolig, så den ikke forstyrrer læsningen.
import * as THREE from 'three';
import { CATEGORIES } from '../content/categories.js';
import { Dragon } from './dragon.js';
import { buildCategoryIsland, buildHomeIsland, buildCloud, rnd } from './islands.js';
import { Particles, starGeometry } from './effects.js';

const RING_R = 22;
const DRAGON_SCALE = 1.6; // dragen er lidt større end "virkeligheden", så barnet kan se sin drage
const UP = new THREE.Vector3(0, 1, 0);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}

const LEVEL_STARS = (isl) => (isl.growth > 0 ? '★'.repeat(isl.level) + '☆'.repeat(3 - isl.level) : '☆☆☆');

export function createWorld({ container, labels, onIslandTap = () => {}, onDragonTap = () => {}, reducedMotion = false }) {
  if (!webglAvailable()) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  } catch { return null; }
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#d4ecff', 75, 210);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 900);

  // Himmel med farveovergang
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#5fb0ff') }, bottom: { value: new THREE.Color('#fff0d2') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.2,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, h),1.0);\n#include <colorspace_fragment>\n}',
  }));
  scene.add(sky);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(14, 24), new THREE.MeshBasicMaterial({ color: '#fff6c0', fog: false }));
  scene.add(sun);

  scene.add(new THREE.HemisphereLight('#ffffff', '#7aa36a', 1.15));
  const dir = new THREE.DirectionalLight('#fff1d0', 1.7);
  dir.position.set(40, 60, 25);
  scene.add(dir);

  // Hav, der følger kameraet (bølgerne regnes i verdenskoordinater, så det ser uendeligt ud)
  const SEG = 72, SIZE = 320, STEP = SIZE / SEG;
  const oceanGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanBase = oceanGeo.attributes.position.array.slice();
  const ocean = new THREE.Mesh(oceanGeo, new THREE.MeshStandardMaterial({ color: '#3ba6d4', flatShading: true, roughness: 0.35, metalness: 0.08 }));
  scene.add(ocean);
  function updateOcean(t, center) {
    ocean.position.x = Math.round(center.x / STEP) * STEP;
    ocean.position.z = Math.round(center.z / STEP) * STEP;
    const a = oceanGeo.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) {
      const wx = oceanBase[i] + ocean.position.x, wz = oceanBase[i + 2] + ocean.position.z;
      a[i + 1] = Math.sin(wx * 0.18 + t * 1.1) * 0.32 + Math.cos(wz * 0.15 + t * 0.8) * 0.28 + Math.sin((wx + wz) * 0.06 + t * 0.5) * 0.4;
    }
    oceanGeo.attributes.position.needsUpdate = true;
  }

  const fx = new Particles(scene);

  // Øer
  const home = buildHomeIsland();
  scene.add(home.group);
  const islands = {};
  CATEGORIES.forEach((c, i) => {
    const isl = buildCategoryIsland(c, fx);
    const a = (i / CATEGORIES.length) * Math.PI * 2;
    isl.group.userData.baseY = 4.2 + (i % 3) * 1.5;
    isl.group.userData.phase = i * 0.9;
    isl.group.position.set(Math.sin(a) * RING_R, isl.group.userData.baseY, Math.cos(a) * RING_R);
    isl.group.rotation.y = a + Math.PI;
    scene.add(isl.group);
    islands[c.id] = isl;
  });

  // Skyer
  const r = rnd(12345);
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const cl = buildCloud(r);
    cl.userData = { a: r() * Math.PI * 2, d: 32 + r() * 60, h: 15 + r() * 12, s: 0.004 + r() * 0.01 };
    cl.scale.setScalar(1 + r() * 1.2);
    scene.add(cl);
    clouds.push(cl);
  }

  // Dragen
  const dragon = new Dragon({ stage: 3, color: '#3fae5a', belly: '#d4ecaa', hat: 'hat-none', trail: null });
  scene.add(dragon.root);
  dragon.root.scale.setScalar(DRAGON_SCALE);
  let look = dragon.look;

  // Labels (DOM-knapper oven på øerne – læsbar tekst og store trykflader)
  const labelEls = {};
  for (const c of CATEGORIES) {
    const b = document.createElement('button');
    b.className = 'world-label';
    b.dataset.cat = c.id;
    b.style.setProperty('--c', c.color);
    labels.appendChild(b);
    labelEls[c.id] = b;
  }
  let labelsOn = false;
  let islandStates = {};

  // ---------- Tilstand ----------
  let mode = 'home';
  let t = 0;
  let snap = true;
  const orbit = { az: 0.35, polar: 1.02, zoom: 1, idle: 99 };
  const camPos = new THREE.Vector3(0, 30, 50);
  const camLook = new THREE.Vector3(0, 4, 0);
  const desiredPos = new THREE.Vector3();
  const desiredLook = new THREE.Vector3();
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();

  // Dragestyring
  let ctl = { kind: 'idle' };
  let flight = null;          // { curve, dur, t, resolve }
  let trick = null;           // { type, t, dur }
  let bank = 0;
  let scaleAnim = null;       // evolution
  const prevPos = new THREE.Vector3();
  let lane = null;
  let celebrateCenter = new THREE.Vector3(0, 8, 0);
  let fireworkT = 0;

  function islandWorldPos(id, out) { return islands[id].group.getWorldPosition(out); }
  function idlePos(time, out) { const s = time * 0.28; return out.set(Math.sin(s) * 11, 9 + Math.sin(s * 2) * 1.5, Math.sin(s * 2) * 6); }

  function flyPath(points, dur) {
    return new Promise((resolve) => {
      if (flight) flight.resolve();
      flight = { curve: new THREE.CatmullRomCurve3(points), dur, t: 0, resolve };
    });
  }

  function homeRadius() {
    const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    return clamp(((RING_R + 7) / Math.tan(hHalf)) * 0.82, 44, 100);
  }

  // ---------- API ----------
  function setState(ws) {
    if (!ws) return;
    if (dragon.setLook(ws.look) && mode === 'lair') fx.burst(dragon.root.position, 30, { color: '#ffe066', gravity: -1, spread: 3, life: 0.9 });
    look = ws.look;
    labelsOn = !!ws.labels;
    for (const s of ws.islands) {
      islands[s.id].update(s);
      const key = JSON.stringify(s);
      if (islandStates[s.id] === key) continue;
      islandStates[s.id] = key;
      const c = CATEGORIES.find((x) => x.id === s.id);
      const el = labelEls[s.id];
      el.dataset.action = s.unlocked ? 'play-focus' : 'locked';
      el.classList.toggle('locked', !s.unlocked);
      el.classList.toggle('focus', !!s.focus);
      el.innerHTML = `<span class="wl-icon">${c.icon}</span><span class="wl-text"><span class="wl-name">${c.name}</span><span class="wl-stars">${s.unlocked ? LEVEL_STARS(s) : '🔒'}</span></span>${s.focus ? '<span class="wl-tag">øv her</span>' : s.strong ? '<span class="wl-tag good">stærk</span>' : ''}`;
      el.setAttribute('aria-label', `${c.name}${s.unlocked ? '' : ' (låst)'}`);
    }
    labels.style.display = mode === 'home' && labelsOn ? '' : 'none';
  }

  function setMode(m) {
    if (m === mode) return;
    const prev = mode;
    mode = m;
    snap = m === 'mission' || prev === 'mission' || prev === 'hidden';
    if (m === 'home' && ctl.kind !== 'idle') {
      const now = dragon.root.position.clone();
      const end = idlePos(t + 2, new THREE.Vector3());
      ctl = { kind: 'flying' };
      flyPath([now, now.clone().lerp(end, 0.5).add(tmp.set(0, 4, 0)), end], 2).then(() => { if (mode === 'home') ctl = { kind: 'idle' }; });
    }
    if (m === 'lair') { ctl = { kind: 'lair' }; snap = true; }
    if (m !== 'mission') for (const s of lane?.stars || []) scene.remove(s.mesh);
    if (m !== 'mission') lane = m === 'celebrate' ? lane : null;
    labels.style.display = m === 'home' && labelsOn ? '' : 'none';
    if (m !== 'hidden') loop();
  }

  async function flyTo(catId) {
    const start = dragon.root.position.clone();
    const end = catId ? islandWorldPos(catId, new THREE.Vector3()).add(tmp.set(0, 4, 0)) : new THREE.Vector3(0, 26, -12);
    const mid = start.clone().lerp(end, 0.5).add(tmp.set(0, 6, 0));
    ctl = { kind: 'flying', follow: true };
    if (!catId) trick = { type: 'loop', t: 0, dur: 1.2 };
    await flyPath([start, mid, end], reducedMotion ? 1.0 : 1.7);
    if (catId) islands[catId].celebrate();
    fx.burst(end, 40, { color: '#ffe066', gravity: -2 });
  }

  function missionStart({ target, n }) {
    for (const s of lane?.stars || []) scene.remove(s.mesh);
    let E, out;
    if (target) {
      const p = islandWorldPos(target, new THREE.Vector3());
      out = tmp.set(p.x, 0, p.z).normalize().clone();
      E = p.clone().addScaledVector(out, 7).add(tmp2.set(0, 2.5, 0));
    } else {
      out = new THREE.Vector3(0, 0, 1);
      E = new THREE.Vector3(0, 6, 15);
    }
    const S = E.clone().addScaledVector(out, 44);
    S.y = E.y + 2;
    const dirv = E.clone().sub(S).normalize();
    const starGeo = starGeometry(0.55, 0.24, 0.16);
    const stars = [];
    for (let k = 0; k < n; k++) {
      const mesh = new THREE.Mesh(starGeo, new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#a07000', emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.35, flatShading: true }));
      const pos = S.clone().lerp(E, (k + 0.85) / n).add(tmp.set(0, 0.6, 0));
      mesh.position.copy(pos);
      scene.add(mesh);
      stars.push({ mesh, home: pos, state: 'wait', t: 0 });
    }
    lane = { S, E, dir: dirv, n, p: 0, pTarget: 0, stars, target };
    dragon.root.position.copy(S);
    ctl = { kind: 'lane' };
    if (flight) { flight.resolve(); flight = null; }
    snap = true;
  }

  function missionStep({ index, score, leveledUp }) {
    if (!lane) return;
    const s = lane.stars[index];
    if (s) { s.state = score > 0 ? 'collect' : 'away'; s.t = 0; }
    lane.pTarget = Math.min(1, (index + 1) / lane.n);
    if (leveledUp) { trick = { type: 'loop', t: 0, dur: 1.3 }; fx.burst(dragon.root.position, 80, { rainbow: true, gravity: -1.5, spread: 5 }); }
    else if (score >= 1 && !reducedMotion) trick = { type: 'roll', t: 0, dur: 0.9 };
  }

  function celebrate({ evolved = false, levelUps = [], target = null } = {}) {
    celebrateCenter = target ? islandWorldPos(target, new THREE.Vector3()).add(tmp.set(0, 6, 0)) : new THREE.Vector3(0, 9, 0);
    ctl = { kind: 'celebrate' };
    if (flight) { flight.resolve(); flight = null; }
    for (const id of levelUps) islands[id]?.celebrate();
    if (evolved) {
      scaleAnim = { t: 0, dur: 1.6 };
      fx.burst(dragon.root.position, 120, { color: '#ffffff', gravity: -0.5, spread: 6, life: 1.6 });
    }
    fireworkT = 0;
  }

  function cheer() {
    trick = { type: 'loop', t: 0, dur: 1.1 };
    for (let i = 0; i < 30; i++) fx.emit(dragon.root.position, { color: '#ff7fb0', spread: 3, life: 1.2, gravity: 1 });
  }

  // ---------- Interaktion ----------
  const pointers = new Map();
  let down = null, pinch0 = 0, zoom0 = 1;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = orbit.zoom; }
    el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (mode !== 'home') return;
    if (pointers.size === 1) {
      orbit.az -= dx * 0.005;
      orbit.polar = clamp(orbit.polar - dy * 0.004, 0.55, 1.3);
      if (down) down.moved += Math.abs(dx) + Math.abs(dy);
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      orbit.zoom = clamp(zoom0 * (pinch0 / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))), 0.55, 1.4);
      if (down) down.moved = 99;
    }
    orbit.idle = 0;
  });
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (!down || pointers.size) return;
    const tap = down.moved < 8 && performance.now() - down.t < 500;
    down = null;
    if (!tap) return;
    const rect = el.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.intersectObject(dragon.root, true).length) { cheer(); onDragonTap(); return; }
    if (mode !== 'home') return;
    const hits = raycaster.intersectObjects(Object.values(islands).map((i) => i.group), true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.cat) o = o.parent;
      if (o) { onIslandTap(o.userData.cat); return; }
    }
  }
  el.addEventListener('pointerup', endPointer);
  el.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); down = null; });
  el.addEventListener('wheel', (e) => { if (mode !== 'home') return; e.preventDefault(); orbit.zoom = clamp(orbit.zoom * (1 + e.deltaY * 0.001), 0.55, 1.4); orbit.idle = 0; }, { passive: false });

  // ---------- Opdatering ----------
  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = mode === 'mission' ? 32 : 50;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);

  function updateDragon(dt) {
    prevPos.copy(dragon.root.position);
    const p = dragon.root.position;
    let flap = 1;
    if (flight) {
      flight.t += dt;
      const k = easeInOut(clamp(flight.t / flight.dur, 0, 1));
      flight.curve.getPoint(k, p);
      if (flight.t >= flight.dur) { const f = flight; flight = null; f.resolve(); }
    } else if (ctl.kind === 'idle') {
      idlePos(t, tmp);
      p.lerp(tmp, clamp(dt * 3, 0, 1));
      flap = 0.6;
    } else if (ctl.kind === 'lane' && lane) {
      lane.p += (lane.pTarget - lane.p) * clamp(dt * 1.8, 0, 1);
      p.copy(lane.S).lerp(lane.E, lane.p);
      p.y += Math.sin(t * 2.2) * 0.25;
    } else if (ctl.kind === 'celebrate') {
      const a = t * 0.8;
      tmp.set(Math.cos(a) * 6, Math.sin(t * 1.6) * 0.8, Math.sin(a) * 6).add(celebrateCenter);
      p.lerp(tmp, clamp(dt * 2.5, 0, 1));
    } else if (ctl.kind === 'lair') {
      tmp.copy(home.nestTop).add(tmp2.set(0, 0.9 * DRAGON_SCALE, 0));
      p.lerp(tmp, clamp(dt * 4, 0, 1));
      flap = 0.12;
    }
    // Retning og krængning
    const v = tmp3.copy(p).sub(prevPos);
    if (ctl.kind === 'lair') {
      dragon.root.rotation.set(0, t * 0.5, 0);
      bank = 0;
    } else if (ctl.kind === 'lane' && lane && !flight) {
      dragon.root.lookAt(tmp.copy(p).add(lane.dir));
      bank *= 0.9;
    } else if (v.lengthSq() > 1e-6) {
      const before = tmp2.set(0, 0, 1).applyQuaternion(dragon.root.quaternion);
      dragon.root.lookAt(tmp.copy(p).add(v));
      const after = tmp.set(0, 0, 1).applyQuaternion(dragon.root.quaternion);
      const turn = before.cross(after).y;
      bank += (clamp(-turn * 40, -0.7, 0.7) - bank) * clamp(dt * 3, 0, 1);
    }
    let rx = 0, rz = bank;
    if (trick) {
      trick.t += dt;
      const k = easeInOut(clamp(trick.t / trick.dur, 0, 1));
      if (trick.type === 'roll') rz += k * Math.PI * 2;
      if (trick.type === 'loop') { rx = -k * Math.PI * 2; dragon.body.position.y = Math.sin(k * Math.PI) * 2.2; }
      if (trick.t >= trick.dur) { trick = null; dragon.body.position.y = 0; }
    }
    dragon.body.rotation.set(rx, 0, rz);
    if (scaleAnim) {
      scaleAnim.t += dt;
      const k = clamp(scaleAnim.t / scaleAnim.dur, 0, 1);
      dragon.root.scale.setScalar(DRAGON_SCALE * (k < 0.25 ? 1 - k * 3 : easeOutBack((k - 0.25) / 0.75) + 0.0001));
      if (k >= 1) { scaleAnim = null; dragon.root.scale.setScalar(DRAGON_SCALE); }
    }
    dragon.flap = flap;
    dragon.update(dt, t);

    // Spor og aura
    const moving = v.lengthSq() > 1e-5 || ctl.kind === 'lane';
    if (look.trail && moving && ctl.kind !== 'lair') {
      dragon.tailWorld(tmp);
      for (let i = 0; i < 2; i++) fx.emit(tmp, { color: look.trail === 'rainbow' ? undefined : look.trail, rainbow: look.trail === 'rainbow', spread: 0.4, life: 0.9, gravity: -0.3 });
    }
    if (look.stage >= 5 && Math.random() < 0.4) fx.emit(dragon.root.position, { color: '#ffe9a0', spread: 1.6, life: 0.9, gravity: 0.4 });
  }

  function updateStars(dt) {
    if (!lane) return;
    for (const s of lane.stars) {
      s.mesh.rotation.y += dt * 2;
      if (s.state === 'wait') s.mesh.position.y = s.home.y + Math.sin(t * 2 + s.home.x) * 0.2;
      else if (s.state === 'collect') {
        s.t += dt;
        s.mesh.position.lerp(dragon.root.position, clamp(dt * 6, 0, 1));
        s.mesh.scale.setScalar(Math.max(0.01, 1 - s.t * 1.2));
        if (s.t > 0.6) { fx.burst(s.mesh.position, 30, { color: '#ffd23f', gravity: -2, spread: 3, life: 0.8 }); s.state = 'done'; s.mesh.visible = false; }
      } else if (s.state === 'away') {
        s.t += dt;
        s.mesh.position.y += dt * 2;
        s.mesh.scale.setScalar(Math.max(0.01, 1 - s.t * 0.8));
        if (s.t > 1.2) { s.state = 'done'; s.mesh.visible = false; }
      }
    }
  }

  function updateCamera(dt) {
    const p = dragon.root.position;
    if (mode === 'home') {
      orbit.idle += dt;
      if (orbit.idle > 5 && !reducedMotion) orbit.az += dt * 0.035;
      const rad = homeRadius() * orbit.zoom;
      if (ctl.follow && flight) {
        desiredLook.copy(p);
        desiredPos.copy(p).add(tmp.set(Math.sin(orbit.az) * 20, 10, Math.cos(orbit.az) * 20));
      } else {
        desiredLook.set(0, 4, 0);
        desiredPos.set(Math.sin(orbit.az) * Math.sin(orbit.polar) * rad, Math.cos(orbit.polar) * rad + 2, Math.cos(orbit.az) * Math.sin(orbit.polar) * rad);
      }
    } else if (mode === 'mission' && lane) {
      const perp = tmp.crossVectors(lane.dir, UP).normalize();
      desiredLook.copy(p).addScaledVector(lane.dir, clamp(camera.aspect * 1.4, 2.5, 7)).add(tmp2.set(0, 1.4, 0));
      desiredPos.copy(p).addScaledVector(perp, 18).add(tmp2.set(0, 3, 0)).addScaledVector(lane.dir, -2);
    } else if (mode === 'celebrate') {
      const a = t * 0.18 + orbit.az;
      const d = 22;
      desiredLook.copy(celebrateCenter).add(tmp.set(0, -7.5, 0));
      desiredPos.copy(celebrateCenter).add(tmp.set(Math.sin(a) * d, 5, Math.cos(a) * d));
    } else if (mode === 'lair') {
      const target = tmp.copy(home.nestTop).add(tmp2.set(0, 1.4 * DRAGON_SCALE, 0));
      const d = 9 * DRAGON_SCALE * (camera.aspect < 0.8 ? 1.35 : 1);
      const toCam = tmp2.set(0.15, 0.3, 1).normalize();
      desiredPos.copy(target).addScaledVector(toCam, d);
      // Dragen placeres i øverste del af skærmen, så butikkens kort kan ligge nederst.
      desiredLook.copy(target).add(tmp3.set(0, -d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.55, 0));
    }
    const k = snap ? 1 : 1 - Math.exp(-dt * 3.5);
    camPos.lerp(desiredPos, k);
    camLook.lerp(desiredLook, k);
    snap = false;
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  function updateLabels() {
    if (mode !== 'home' || !labelsOn) return;
    const w = container.clientWidth, h = container.clientHeight;
    for (const c of CATEGORIES) {
      const isl = islands[c.id];
      tmp.copy(isl.labelAnchor);
      isl.group.localToWorld(tmp);
      tmp.project(camera);
      const elx = labelEls[c.id];
      if (tmp.z > 1 || tmp.z < -1) { elx.style.visibility = 'hidden'; continue; }
      elx.style.visibility = '';
      elx.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px) translate(-50%, -100%)`;
      elx.style.zIndex = String(1000 - Math.round(tmp.z * 1000));
    }
  }

  // ---------- Løkke ----------
  let running = false, last = 0, frames = 0, fpsT = 0, checkedFps = false;
  function frame(now) {
    if (mode === 'hidden' || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    t += dt;
    // Sænk opløsningen på langsomme enheder
    if (!checkedFps) { frames++; fpsT += dt; if (fpsT > 3) { checkedFps = true; if (frames / fpsT < 24 && pixelRatio > 1) { pixelRatio = 1; renderer.setPixelRatio(1); resize(); } } }

    updateDragon(dt);
    updateStars(dt);
    for (const id in islands) islands[id].animate(t, dt);
    for (const cl of clouds) { cl.userData.a += cl.userData.s * dt; cl.position.set(Math.cos(cl.userData.a) * cl.userData.d, cl.userData.h, Math.sin(cl.userData.a) * cl.userData.d); }
    if (mode === 'celebrate' && !reducedMotion) {
      fireworkT -= dt;
      if (fireworkT <= 0) {
        fireworkT = 0.55 + Math.random() * 0.4;
        const at = tmp.copy(celebrateCenter).add(tmp2.set((Math.random() - 0.5) * 18, 4 + Math.random() * 6, (Math.random() - 0.5) * 18));
        fx.burst(at, 70, { rainbow: Math.random() < 0.4, color: ['#ffd23f', '#ff6fa8', '#7c5cff', '#2bb3c0'][Math.floor(Math.random() * 4)], gravity: -2.5, spread: 6, life: 1.4 });
      }
    }
    fx.update(dt);
    updateCamera(dt);
    updateOcean(t, camera.position);
    sky.position.copy(camera.position);
    sun.position.copy(camera.position).add(tmp.set(160, 120, -260));
    sun.lookAt(camera.position);
    updateLabels();
    renderer.render(scene, camera);
  }
  function loop() {
    if (running || mode === 'hidden') return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  resize();
  loop();

  return {
    setState, setMode, flyTo, missionStart, missionStep, celebrate, cheer, resize,
    get mode() { return mode; },
    _debug: { scene, camera, dragon, islands },
  };
}
