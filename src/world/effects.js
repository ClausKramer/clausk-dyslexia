// Partikler (stjernestøv, eksplosioner, fyrværkeri), stjerne-mesh og canvas-teksturer.
import * as THREE from 'three';

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Blød rund glød til partikler. */
export function glowTexture() {
  return canvasTexture(64, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.35, 'rgba(255,255,255,0.8)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
}

/** Bogstavklods-tekstur (til Bogstavbjerget og Byggepladsen). */
export function letterTexture(letter, bg = '#fffdf7', fg = '#26231f') {
  return canvasTexture(128, (g, s) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(0,0,0,0.12)';
    g.lineWidth = 8;
    g.strokeRect(4, 4, s - 8, s - 8);
    g.fillStyle = fg;
    g.font = '700 84px Lexend, Verdana, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(letter, s / 2, s / 2 + 6);
  });
}

/** Femtakket stjerne som ekstruderet geometri. */
export function starGeometry(outer = 0.6, inner = 0.26, depth = 0.18) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 });
  g.center();
  return g;
}

/**
 * Partikelsystem med fast kapacitet. Partikler "fader" ved at farven går mod sort
 * (additiv blending), så vi ikke behøver en speciel shader.
 */
export class Particles {
  constructor(scene, capacity = 900) {
    this.cap = capacity;
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.base = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.next = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.7, map: glowTexture(), vertexColors: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this._c = new THREE.Color();
  }

  emit(p, { color = '#ffe066', speed = 2, spread = 1, life = 1, gravity = 0, dir = null, rainbow = false } = {}) {
    const i = this.next;
    this.next = (this.next + 1) % this.cap;
    this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
    const rx = (Math.random() - 0.5) * 2, ry = (Math.random() - 0.5) * 2, rz = (Math.random() - 0.5) * 2;
    const d = dir || { x: 0, y: 0, z: 0 };
    this.vel[i * 3] = d.x * speed + rx * spread;
    this.vel[i * 3 + 1] = d.y * speed + ry * spread;
    this.vel[i * 3 + 2] = d.z * speed + rz * spread;
    if (rainbow) this._c.setHSL(Math.random(), 0.9, 0.6); else this._c.set(color);
    this.base[i * 3] = this._c.r; this.base[i * 3 + 1] = this._c.g; this.base[i * 3 + 2] = this._c.b;
    this.life[i] = this.maxLife[i] = life * (0.7 + Math.random() * 0.6);
    this.grav[i] = gravity;
  }

  burst(p, n = 40, opts = {}) {
    for (let k = 0; k < n; k++) this.emit(p, { speed: 0, spread: opts.spread ?? 4, life: opts.life ?? 1.2, color: opts.color, gravity: opts.gravity ?? -3, rainbow: opts.rainbow });
  }

  update(dt) {
    for (let i = 0; i < this.cap; i++) {
      if (this.life[i] <= 0) { this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 0; continue; }
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      this.vel[i * 3 + 1] += this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.col[i * 3] = this.base[i * 3] * k;
      this.col[i * 3 + 1] = this.base[i * 3 + 1] * k;
      this.col[i * 3 + 2] = this.base[i * 3 + 2] * k;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
