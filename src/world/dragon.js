// Dragen bygget af simple former ("low poly"). Vender mod +Z. Størrelse og detaljer følger udviklingstrinnet:
// 0 Æg (lille drage med æggeskal), 1 Udklækket, 2 Lille drage, 3 Drage, 4 Stor drage, 5 Stjernedrage.
import * as THREE from 'three';

const STAGE_SCALE = [0.6, 0.7, 0.85, 1.0, 1.2, 1.4];
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.75, metalness: 0.05, ...extra });

function mesh(geo, mat, { p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0] } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p);
  m.scale.set(...s);
  m.rotation.set(...r);
  return m;
}

function wingGeometry(side) {
  const shape = new THREE.Shape();
  const pts = [[0, 0.15], [1.2, 0.75], [2.4, 0.55], [2.0, 0.0], [2.2, -0.45], [1.4, -0.35], [1.2, -0.85], [0.5, -0.55], [0, -0.35]];
  pts.forEach(([x, y], i) => (i ? shape.lineTo(x * side, y) : shape.moveTo(x * side, y)));
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(Math.PI / 2); // læg vingen vandret: x ud til siden, forkanten (form-y) peger frem (+z)
  return g;
}

function buildHat(id) {
  const g = new THREE.Group();
  if (id === 'hat-party') {
    g.add(mesh(new THREE.ConeGeometry(0.28, 0.75, 10), std('#ff5fa2'), { p: [0, 0.37, 0] }));
    g.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), std('#ffe066'), { p: [0, 0.78, 0] }));
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.TorusGeometry(0.22 - i * 0.06, 0.025, 4, 14), std('#ffffff'), { p: [0, 0.12 + i * 0.2, 0], r: [Math.PI / 2, 0, 0] }));
  } else if (id === 'hat-crown') {
    const gold = std('#f2c230', { metalness: 0.6, roughness: 0.35 });
    g.add(mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.22, 10, 1, true), gold, { p: [0, 0.1, 0] }));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(mesh(new THREE.ConeGeometry(0.08, 0.22, 5), gold, { p: [Math.cos(a) * 0.3, 0.3, Math.sin(a) * 0.3] }));
    }
    g.add(mesh(new THREE.OctahedronGeometry(0.08), std('#e5394f', { emissive: '#6a0010' }), { p: [0, 0.12, 0.31] }));
  } else if (id === 'hat-wizard') {
    g.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 16), std('#4b3a9e'), { p: [0, 0.03, 0] }));
    g.add(mesh(new THREE.ConeGeometry(0.33, 1.0, 12), std('#5b48c2'), { p: [0, 0.52, -0.05], r: [-0.25, 0, 0] }));
    g.add(mesh(new THREE.OctahedronGeometry(0.09), std('#ffe066', { emissive: '#806000' }), { p: [0.15, 0.45, 0.2] }));
  } else if (id === 'hat-cap') {
    g.add(mesh(new THREE.SphereGeometry(0.33, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#e0483e'), { p: [0, 0, 0] }));
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.04, 0.3), std('#c23a31'), { p: [0, 0.02, 0.35] }));
  }
  return g;
}

export class Dragon {
  constructor(look) {
    this.root = new THREE.Group();     // placering og retning
    this.body = new THREE.Group();     // tricks (loop, rul) og vippen
    this.root.add(this.body);
    this.flap = 1;
    this.blinkT = 2;
    this.setLook(look);
  }

  setLook(look) {
    const key = JSON.stringify(look);
    if (key === this.key) return false;
    this.key = key;
    this.look = look;
    for (const c of [...this.body.children]) { this.body.remove(c); c.traverse((o) => { o.geometry?.dispose(); }); }
    this.build(look);
    return true;
  }

  build(look) {
    const stage = look.stage ?? 3;
    const skin = std(look.color);
    const belly = std(look.belly);
    const wingMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(look.color).lerp(new THREE.Color(look.belly), 0.35), side: THREE.DoubleSide, flatShading: true, roughness: 0.8 });
    const horn = std(stage >= 5 ? '#ffd84a' : '#fff4d6', stage >= 5 ? { emissive: '#7a5a00', metalness: 0.4 } : {});
    const dark = std('#1d1a24');
    const white = std('#ffffff');
    const g = new THREE.Group();
    this.body.add(g);
    this.model = g;
    g.scale.setScalar(STAGE_SCALE[stage] || 1);

    g.add(mesh(new THREE.SphereGeometry(1, 14, 10), skin, { s: [0.85, 0.8, 1.3] }));
    g.add(mesh(new THREE.SphereGeometry(1, 14, 10), belly, { p: [0, -0.22, 0.12], s: [0.68, 0.62, 1.12] }));

    // Hoved
    const head = new THREE.Group();
    head.position.set(0, 0.75, 1.15);
    g.add(head);
    this.head = head;
    head.add(mesh(new THREE.SphereGeometry(1, 14, 10), skin, { s: [0.62, 0.56, 0.66] }));
    head.add(mesh(new THREE.SphereGeometry(1, 12, 8), belly, { p: [0, -0.14, 0.5], s: [0.42, 0.3, 0.42] }));
    head.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), dark, { p: [0.12, -0.04, 0.88] }));
    head.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), dark, { p: [-0.12, -0.04, 0.88] }));
    this.eyes = [];
    for (const sx of [1, -1]) {
      const eye = new THREE.Group();
      eye.position.set(0.28 * sx, 0.16, 0.42);
      eye.add(mesh(new THREE.SphereGeometry(0.19, 10, 8), white));
      eye.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), dark, { p: [0.02 * sx, 0.01, 0.12] }));
      eye.add(mesh(new THREE.SphereGeometry(0.04, 6, 4), white, { p: [0.05 * sx, 0.06, 0.2] }));
      head.add(eye);
      this.eyes.push(eye);
      head.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), std('#ff9db5'), { p: [0.4 * sx, -0.12, 0.38], s: [1, 0.6, 0.4] }));
      if (stage >= 1) head.add(mesh(new THREE.ConeGeometry(0.09, 0.42, 6), horn, { p: [0.22 * sx, 0.5, -0.15], r: [-0.55, 0, -0.25 * sx] }));
    }
    const hat = buildHat(look.hat);
    hat.position.set(0, 0.48, -0.02);
    head.add(hat);

    // Rygpigge
    if (stage >= 1) for (let i = 0; i < 4; i++) g.add(mesh(new THREE.ConeGeometry(0.12 - i * 0.015, 0.35, 5), horn, { p: [0, 0.8 - i * 0.05, 0.6 - i * 0.55], r: [-0.4, 0, 0] }));

    // Hale
    this.tail = [];
    let prev = g;
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, i === 0 ? -0.05 : 0.02, i === 0 ? -1.15 : -0.4);
      seg.add(mesh(new THREE.SphereGeometry(0.4 - i * 0.055, 8, 6), skin, { s: [1, 0.9, 1.3] }));
      prev.add(seg);
      this.tail.push(seg);
      prev = seg;
    }
    prev.add(mesh(new THREE.ConeGeometry(0.22, 0.45, 4), horn, { p: [0, 0, -0.3], r: [-Math.PI / 2, 0, 0], s: [1, 1, 0.35] }));

    // Ben
    for (const [x, z] of [[0.45, 0.6], [-0.45, 0.6], [0.45, -0.55], [-0.45, -0.55]]) g.add(mesh(new THREE.SphereGeometry(0.22, 8, 6), skin, { p: [x, -0.7, z], s: [1, 0.9, 1.2] }));

    // Vinger
    const wingScale = stage === 0 ? 0.45 : stage === 1 ? 0.6 : 1;
    this.wings = [];
    for (const side of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(0.55 * side, 0.55, 0.3);
      const w = new THREE.Mesh(wingGeometry(side), wingMat);
      w.scale.setScalar(wingScale);
      pivot.add(w);
      g.add(pivot);
      this.wings.push({ pivot, side });
    }

    // Æggeskal på trin 0
    if (stage === 0) {
      const shell = std('#fff6e0');
      g.add(mesh(new THREE.SphereGeometry(1.08, 14, 8, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.48), shell, { s: [0.9, 0.95, 1.2], p: [0, -0.05, 0] }));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.add(mesh(new THREE.ConeGeometry(0.16, 0.3, 3), shell, { p: [Math.cos(a) * 0.92, -0.02, Math.sin(a) * 1.25], s: [1, 1, 0.4], r: [0, -a, 0] }));
      }
    }
  }

  /** Tailposition i verdenskoordinater (til spor-partikler). */
  tailWorld(target) {
    const last = this.tail[this.tail.length - 1];
    return last ? last.getWorldPosition(target) : this.root.getWorldPosition(target);
  }

  update(dt, t) {
    const speed = 4 + this.flap * 5;
    const amp = 0.25 + this.flap * 0.5;
    const a = Math.sin(t * speed) * amp + 0.15;
    for (const { pivot, side } of this.wings) pivot.rotation.z = a * side;
    this.tail.forEach((seg, i) => { seg.rotation.y = Math.sin(t * 2.4 - i * 0.7) * 0.18; seg.rotation.x = Math.sin(t * 1.7 - i * 0.5) * 0.06; });
    if (this.head) this.head.rotation.x = Math.sin(t * 1.3) * 0.08;
    this.model.position.y = Math.sin(t * speed + 1.2) * 0.08 * this.flap;
    this.blinkT -= dt;
    const blink = this.blinkT < 0.12 ? 0.15 : 1;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3;
    for (const e of this.eyes) e.scale.y = blink;
  }
}
