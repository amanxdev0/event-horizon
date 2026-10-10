/* EVENT HORIZON — scroll-driven black-hole dive.
   Damped scroll playhead · DOM-measured chapters · camera stops ·
   film HUD · adaptive quality · reduced-motion & no-WebGL fallbacks. */
import * as THREE from 'three';

/* ---------------- helpers ---------------- */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** envelope: 0→1 across [a,b], holds, 1→0 across [c,d] */
const env = (p, a, b, c, d) => sstep(a, b, p) * (1 - sstep(c, d, p));
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));

/* ---------------- dom ---------------- */
const canvas = document.getElementById('film');
const redveil = document.getElementById('redveil');
const blackveil = document.getElementById('blackveil');
const zoneEl = document.getElementById('zone');
const distEl = document.getElementById('dist');
const barEl = document.getElementById('bar');
const fpsEl = document.getElementById('fps');
const nogl = document.getElementById('nogl');
const rmnote = document.getElementById('rmnote');
const chapterEls = [...document.querySelectorAll('.chapter')];

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- renderer ---------------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  canvas.style.display = 'none';
  nogl.hidden = false;
  throw e;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010103);
scene.fog = new THREE.FogExp2(0x010103, 0.00045);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 5000);

/* adaptive pixel ratio */
const PR_CAP = Math.min(devicePixelRatio || 1, 2);
let prScale = 1;
function applyPR() {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, PR_CAP) * prScale);
  renderer.setSize(innerWidth, innerHeight);
}
applyPR();

/* ---------------- starfield ---------------- */
function makeStars(n, rMin, rMax, size) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const palette = [[1, 1, 1], [1, 1, 1], [0.62, 0.71, 1], [1, 0.85, 0.63]];
  for (let i = 0; i < n; i++) {
    const r = rnd(rMin, rMax);
    const th = rnd(Math.PI * 2);
    const ph = Math.acos(rnd(-1, 1));
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph);
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    const c = palette[(Math.random() * palette.length) | 0];
    const b = rnd(0.35, 1);
    col[i * 3] = c[0] * b; col[i * 3 + 1] = c[1] * b; col[i * 3 + 2] = c[2] * b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({
    size, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.95, depthWrite: false,
  });
  return new THREE.Points(g, m);
}
const stars = makeStars(2600, 700, 1600, 1.8);
const dust = makeStars(500, 120, 500, 1.2); // nearer sparse dust
scene.add(stars, dust);

/* ---------------- the black hole ---------------- */
const hole = new THREE.Group();
scene.add(hole);

/* event horizon — pure black sphere (front-side: invisible from inside) */
const horizon = new THREE.Mesh(
  new THREE.SphereGeometry(10, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0x000000 })
);
hole.add(horizon);

/* photon ring — thin bright circle at 1.5 Rs */
const photonRing = new THREE.Mesh(
  new THREE.TorusGeometry(15.2, 0.28, 10, 128),
  new THREE.MeshBasicMaterial({
    color: 0xfff3d6, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
photonRing.rotation.x = -Math.PI / 2 + 0.18;
hole.add(photonRing);

/* accretion disk — custom shader: heat gradient + turbulence + doppler beaming */
const diskUniforms = { uTime: { value: 0 } };
const disk = new THREE.Mesh(
  new THREE.RingGeometry(16, 62, 128, 8),
  new THREE.ShaderMaterial({
    uniforms: diskUniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec3 vLocal;
      varying vec3 vWorld;
      void main() {
        vLocal = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vLocal;
      varying vec3 vWorld;
      void main() {
        float r = length(vLocal.xy);
        float inner = 16.0, outer = 62.0;
        float rn = clamp((r - inner) / (outer - inner), 0.0, 1.0);
        float ang = atan(vLocal.y, vLocal.x);
        vec3 hot  = vec3(1.0, 0.95, 0.85);
        vec3 mid  = vec3(1.0, 0.55, 0.18);
        vec3 cold = vec3(0.45, 0.08, 0.02);
        vec3 col = mix(hot, mid, smoothstep(0.0, 0.45, rn));
        col = mix(col, cold, smoothstep(0.4, 1.0, rn));
        float streak = 0.72
          + 0.28 * sin(ang * 7.0 + rn * 26.0 - uTime * 2.6)
                 * sin(ang * 13.0 - rn * 34.0 + uTime * 1.7);
        float dop = 1.0 + 0.55 * clamp(-vWorld.x / 60.0, -1.0, 1.0);
        float a = smoothstep(0.0, 0.06, rn) * (1.0 - smoothstep(0.85, 1.0, rn));
        a += (1.0 - smoothstep(0.0, 0.10, rn)) * 0.55; // inner rim flare
        gl_FragColor = vec4(col * streak * dop * 1.6, clamp(a, 0.0, 1.0) * 0.92);
      }`,
  })
);
disk.rotation.x = -Math.PI / 2 + 0.18;
hole.add(disk);

/* lensed arcs — disk light bent over & under the sphere (Interstellar-style) */
const arcMat = new THREE.MeshBasicMaterial({
  color: 0xff9a3c, transparent: true, opacity: 0.75,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const arcGeo = new THREE.TorusGeometry(14.5, 0.55, 12, 72, Math.PI * 0.85);
const arcTop = new THREE.Mesh(arcGeo, arcMat);
arcTop.rotation.z = Math.PI * 0.075;
arcTop.position.y = 6.5;
arcTop.rotation.x = 0.12;
const arcBottom = new THREE.Mesh(arcGeo, arcMat.clone());
arcBottom.rotation.z = Math.PI * 1.075;
arcBottom.position.y = -6.5;
arcBottom.rotation.x = -0.12;
hole.add(arcTop, arcBottom);

/* halo glow sprite */
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,170,80,0.55)');
  grad.addColorStop(0.4, 'rgba(255,120,40,0.22)');
  grad.addColorStop(1, 'rgba(255,100,30,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  return t;
}
const glow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTexture(), blending: THREE.AdditiveBlending,
  transparent: true, depthWrite: false, opacity: 0.8,
}));
glow.scale.set(190, 190, 1);
hole.add(glow);

/* ---------------- chapters & camera stops ---------------- */
const STOPS = [
  { chapter: 0, at: 0.35, pos: [0, 70, 300],   look: [0, 0, 0],   zone: 'DEEP SPACE' },
  { chapter: 1, at: 0.50, pos: [90, 30, 150],  look: [0, 0, 0],   zone: 'ACCRETION DISK' },
  { chapter: 2, at: 0.50, pos: [-55, 10, 70],  look: [0, 0, 0],   zone: 'PHOTON SPHERE' },
  { chapter: 3, at: 0.50, pos: [18, 4, 30],    look: [0, 0, 0],   zone: 'POINT OF NO RETURN' },
  { chapter: 4, at: 0.50, pos: [0, 1.5, 13.5], look: [0, 0, 0],   zone: 'EVENT HORIZON' },
  { chapter: 5, at: 0.50, pos: [0, 0, 7],      look: [0, 0, -12],  zone: 'SPAGHETTIFICATION' },
  { chapter: 6, at: 0.60, pos: [0, 0, 2.5],    look: [0, 0, -12],  zone: 'SINGULARITY' },
];

let chapterRects = [];
let stopP = [];
function measure() {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const y = scrollY;
  chapterRects = chapterEls.map((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + y, bottom: r.bottom + y };
  });
  stopP = STOPS.map((s) => {
    const r = chapterRects[s.chapter];
    return clamp01((r.top + s.at * (r.bottom - r.top)) / max);
  });
}
measure();
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  applyPR();
  measure();
});
addEventListener('load', measure);

let targetP = 0;
let smoothP = 0;
addEventListener('scroll', () => {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  targetP = clamp01(scrollY / max);
}, { passive: true });

/* camera interpolation between stops */
const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();
function flyTo(p) {
  let i = 0;
  while (i < stopP.length - 2 && p > stopP[i + 1]) i++;
  const a = STOPS[i], b = STOPS[i + 1];
  const pa = stopP[i], pb = stopP[i + 1];
  const t = sstep(0, 1, (p - pa) / Math.max(1e-6, pb - pa));
  _pos.set(
    lerp(a.pos[0], b.pos[0], t),
    lerp(a.pos[1], b.pos[1], t),
    lerp(a.pos[2], b.pos[2], t)
  );
  _look.set(
    lerp(a.look[0], b.look[0], t),
    lerp(a.look[1], b.look[1], t),
    lerp(a.look[2], b.look[2], t)
  );
  /* terminal turbulence */
  const shake = env(p, 0.70, 0.85, 0.985, 1.0) * 0.6;
  if (shake > 0.001) {
    _pos.x += rnd(-1, 1) * shake;
    _pos.y += rnd(-1, 1) * shake;
  }
  camera.position.copy(_pos);
  camera.lookAt(_look);
}

function currentZone(p) {
  let z = STOPS[0].zone;
  for (let i = 0; i < stopP.length; i++) {
    if (p + 0.001 >= stopP[i]) z = STOPS[i].zone;
  }
  return z;
}

function fmtDist(p) {
  const km = 1.4e6 * Math.pow(1 - p, 2.6);
  return Math.round(km).toLocaleString('en-US') + ' KM';
}

/* ---------------- main loop ---------------- */
let last = performance.now();
let fpsEMA = 60;
let lowTimer = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  /* fps meter + adaptive quality */
  const fps = 1 / Math.max(1e-4, dt);
  fpsEMA += (fps - fpsEMA) * 0.05;
  fpsEl.textContent = Math.round(fpsEMA);
  if (fpsEMA < 34) lowTimer += dt; else lowTimer = 0;
  const want = lowTimer > 1.2 ? 0.7 : 1;
  if (Math.abs(want - prScale) > 0.01) {
    prScale += (want - prScale) * 0.05;
    applyPR();
  }

  /* damped playhead */
  smoothP += (targetP - smoothP) * (1 - Math.exp(-dt * 5.5));
  if (Math.abs(targetP - smoothP) < 1e-4) smoothP = targetP;
  const p = smoothP;

  /* world animation */
  diskUniforms.uTime.value += dt;
  disk.rotation.z += dt * (0.25 + p * 1.4);
  photonRing.rotation.z -= dt * (0.4 + p * 2.0);
  const arcPulse = 0.65 + 0.2 * Math.sin(now * 0.0016);
  arcTop.material.opacity = arcPulse;
  arcBottom.material.opacity = arcPulse;
  stars.rotation.y += dt * 0.004 * (1 + p * 9);
  dust.rotation.y -= dt * 0.006 * (1 + p * 6);
  /* spaghettification: stretch the starfield along the fall axis */
  const stretch = sstep(0.68, 1, p);
  stars.scale.set(1 - 0.25 * stretch, 1 + 2.4 * stretch, 1 - 0.25 * stretch);

  /* redshift + terminal fade */
  redveil.style.opacity = (env(p, 0.50, 0.66, 0.86, 0.97) * 0.9).toFixed(3);
  blackveil.style.opacity = sstep(0.94, 1.0, p).toFixed(3);

  flyTo(p);

  /* HUD */
  zoneEl.textContent = currentZone(p);
  distEl.textContent = fmtDist(p);
  barEl.style.transform = `scaleX(${p.toFixed(4)})`;

  /* chapter activation */
  const y = scrollY + innerHeight * 0.5;
  chapterEls.forEach((el, i) => {
    const r = chapterRects[i];
    el.classList.toggle('active', r && y >= r.top && y < r.bottom);
  });

  renderer.render(scene, camera);
}

if (REDUCED) {
  /* still frame, no loop */
  rmnote.hidden = false;
  measure();
  smoothP = targetP = 0.16;
  flyTo(0.16);
  zoneEl.textContent = currentZone(0.16);
  distEl.textContent = fmtDist(0.16);
  barEl.style.transform = 'scaleX(0.16)';
  chapterEls[1] && chapterEls[1].classList.add('active');
  renderer.render(scene, camera);
} else {
  requestAnimationFrame(frame);
}
