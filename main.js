import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ============================================================
   The Half-Built House — Simpsons-style cel-shaded 3D scene
   Left half: finished (peach walls, purple roof).
   Right half: bare studs, scaffolding, ladder, paint spill.
   ============================================================ */

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x79cff7);
scene.fog = new THREE.Fog(0x79cff7, 70, 160);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 11, 39); // open facing the front of the house from the street

const controls = new OrbitControls(camera, canvas);
window.CAM = camera; // debugging handle
controls.target.set(0, 4, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotate = false; // user drives the camera
controls.minDistance = 10;
controls.maxDistance = 60;
controls.maxPolarAngle = Math.PI / 2 - 0.06;
controls.enablePan = false;

/* ---------- lights ---------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.78)); // a touch lower so shadows read more
const sun = new THREE.DirectionalLight(0xfff3c4, 2.2);
sun.position.set(36, 56, 28); // far enough back that the clouds sit inside the shadow frustum
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -45;
sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45;
sun.shadow.camera.bottom = -45;
sun.shadow.camera.far = 170;
scene.add(sun);

/* ---------- toon material helper ---------- */
const steps = new Uint8Array([110, 160, 210, 255]);
const gradientMap = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
gradientMap.minFilter = THREE.NearestFilter;
gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;

const MAT = {};
function toon(color) {
  if (!MAT[color]) MAT[color] = new THREE.MeshToonMaterial({ color, gradientMap });
  return MAT[color];
}

/* ---------- procedural cartoon textures ---------- */
function canvasTexture(size, drawFn, repeat = 1) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  drawFn(cv.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

// speckled grass
const grassTex = canvasTexture(256, (ctx, s) => {
  ctx.fillStyle = '#7ec850';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 520; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? '#74be47' : '#8ad35c';
    ctx.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 3, 2);
  }
  ctx.strokeStyle = '#6ab03e';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * s, y = Math.random() * s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 5); ctx.stroke();
  }
}, 40);
const grassMat = new THREE.MeshToonMaterial({ map: grassTex, gradientMap });

// neutral shingle rows — multiplied with each roof colour
const shingleTex = canvasTexture(256, (ctx, s) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 3;
  const row = 32;
  for (let y = row; y <= s; y += row) {
    ctx.beginPath(); ctx.moveTo(0, y - 1); ctx.lineTo(s, y - 1); ctx.stroke();
  }
  for (let r = 0; r < s / row; r++) {
    const off = (r % 2) * row;
    for (let x = off; x <= s; x += row * 2) {
      ctx.beginPath(); ctx.moveTo(x, r * row); ctx.lineTo(x, r * row + row); ctx.stroke();
    }
  }
}, 3);
const roofMats = {};
function roofMat(color) {
  if (!roofMats[color]) roofMats[color] = new THREE.MeshToonMaterial({ color, gradientMap, map: shingleTex });
  return roofMats[color];
}

// wood grain for plywood
const grainTex = canvasTexture(256, (ctx, s) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(120,70,20,0.18)';
  ctx.lineWidth = 2;
  for (let y = 6; y < s; y += 10 + Math.random() * 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(s * 0.3, y + 4, s * 0.6, y - 4, s, y + 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(120,70,20,0.12)';
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * s, y = Math.random() * s;
    ctx.beginPath(); ctx.ellipse(x, y, 6, 3, 0, 0, Math.PI * 2); ctx.stroke();
  }
}, 2);
const plywoodMat = new THREE.MeshToonMaterial({ color: 0xd9a05b, gradientMap, map: grainTex });

// asphalt speckle
const asphaltTex = canvasTexture(128, (ctx, s) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    const g = 200 + Math.floor(Math.random() * 55);
    ctx.fillStyle = `rgba(${g},${g},${g},0.55)`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
}, 1);
asphaltTex.repeat.set(40, 2);

const edgeMat = new THREE.LineBasicMaterial({ color: 0x4a2c12 });
function box(w, h, d, color, x, y, z, { edges = false, shadow = true, parent = scene } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  if (edges) {
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeMat);
    m.add(line);
  }
  return m;
}

/* ---------- palette ---------- */
const C = {
  grass: 0x7ec850,
  grassDark: 0x64ab3c,
  wall: 0xf6b26b,
  wallShade: 0xe89a4f,
  roof: 0x7c6bae,
  trim: 0xfff6e0,
  door: 0x8a5a2b,
  glass: 0xbfe6f7,
  wood: 0xe0b06f,
  woodDark: 0xb98a4e,
  plywood: 0xd9a05b,
  steel: 0x9bb0c1,
  white: 0xfafafa,
  pink: 0xff7bac,
  orange: 0xff8c1a,
  path: 0xe8d9a8,
};

/* ---------- ground ---------- */
const ground = new THREE.Mesh(new THREE.CircleGeometry(120, 48), grassMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// darker grass patches
for (let i = 0; i < 14; i++) {
  const r = 1 + Math.random() * 2.5;
  const patch = new THREE.Mesh(new THREE.CircleGeometry(r, 20), toon(C.grassDark));
  patch.rotation.x = -Math.PI / 2;
  const a = Math.random() * Math.PI * 2;
  const d = 14 + Math.random() * 30;
  patch.position.set(Math.cos(a) * d, 0.01, Math.sin(a) * d);
  scene.add(patch);
}

// path from gate to door
const path = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 8.4), toon(C.path));
path.rotation.x = -Math.PI / 2;
path.position.set(-1.8, 0.02, 8.1);
path.receiveShadow = true;
scene.add(path);

/* ============================================================
   HOUSE — footprint x:[-6,6], z:[-4,4], walls up to y=5
   ============================================================ */
const house = new THREE.Group();
scene.add(house);

/* ----- finished LEFT half (x<0) ----- */
box(6.3, 5, 0.3, C.wall, -3, 2.5, 3.85, { edges: true, parent: house });   // front
box(6.3, 5, 0.3, C.wall, -3, 2.5, -3.85, { edges: true, parent: house });  // back
box(0.3, 5, 8, C.wall, -5.85, 2.5, 0, { edges: true, parent: house });     // left
box(0.3, 5, 8, C.wallShade, 0, 2.5, 0, { edges: true, parent: house });    // dividing wall

// gable triangle on left end (ridge runs along x at z=0)
const gableShape = new THREE.Shape();
gableShape.moveTo(-4.3, 0); gableShape.lineTo(4.3, 0); gableShape.lineTo(0, 2.7); gableShape.closePath();
const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(gableShape, { depth: 0.3, bevelEnabled: false }), toon(C.wall));
gable.rotation.y = Math.PI / 2;
gable.position.set(-6, 5, 0);
gable.castShadow = true;
house.add(gable);
gable.add(new THREE.LineSegments(new THREE.EdgesGeometry(gable.geometry), edgeMat));

// dividing gable (shade color) so the open side reads "cut"
const gable2 = new THREE.Mesh(new THREE.ExtrudeGeometry(gableShape, { depth: 0.3, bevelEnabled: false }), toon(C.wallShade));
gable2.rotation.y = Math.PI / 2;
gable2.position.set(-0.15, 5, 0);
gable2.castShadow = true;
house.add(gable2);

/* ----- finished roof (left half only) ----- */
const slopeAng = Math.atan2(2.7, 4.3);          // rise 2.7 over half-depth 4.3
const slopeLen = Math.hypot(2.7, 4.3) + 0.8;    // + overhang
function roofPanel(width, cx, zSign, color, thickness = 0.28) {
  const p = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, slopeLen), roofMat(color));
  p.rotation.x = zSign * slopeAng;
  p.position.set(cx, 5 + 1.45, zSign * 2.25);
  p.castShadow = true;
  p.receiveShadow = true;
  house.add(p);
  p.add(new THREE.LineSegments(new THREE.EdgesGeometry(p.geometry), edgeMat));
  return p;
}
roofPanel(7.1, -3.15, 1, C.roof);
roofPanel(7.1, -3.15, -1, C.roof);

// chimney
box(0.9, 2.6, 0.9, C.wallShade, -4.4, 8.1, -1.2, { edges: true, parent: house });
box(1.1, 0.35, 1.1, C.roof, -4.4, 9.5, -1.2, { parent: house });

/* ----- windows & door on finished half ----- */
function windowAt(x, y, z) {
  box(1.5, 1.7, 0.12, C.trim, x, y, z, { shadow: false, parent: house });
  box(1.2, 1.4, 0.14, C.glass, x, y, z + 0.02, { shadow: false, parent: house });
  box(0.08, 1.4, 0.16, C.trim, x, y, z + 0.03, { shadow: false, parent: house });
  box(1.2, 0.08, 0.16, C.trim, x, y, z + 0.03, { shadow: false, parent: house });
}
windowAt(-4.3, 2.1, 4.02);
windowAt(-4.3, 4.0, 4.02);
windowAt(-1.8, 4.0, 4.02);

// door + step + knob + little awning
box(1.25, 2.6, 0.14, C.door, -1.8, 1.3, 4.02, { edges: true, parent: house });
const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), toon(0xffd90f));
knob.position.set(-1.35, 1.3, 4.12);
house.add(knob);
box(1.7, 0.18, 0.9, C.path, -1.8, 0.09, 4.35, { parent: house });
const awning = box(1.9, 0.14, 1.0, C.roof, -1.8, 2.85, 4.35, { parent: house });
awning.rotation.x = 0.25;

/* ----- construction RIGHT half (x>0) ----- */
// floor slab
const slab = box(6, 0.25, 8, C.plywood, 3, 0.125, 0, { edges: true, parent: house });
slab.material = plywoodMat;

// wall studs
function stud(x, z, h = 5, t = 0.18) { return box(t, h, t, C.wood, x, h / 2, z, { parent: house }); }
for (let x = 0.7; x <= 5.8; x += 0.85) { stud(x, 3.9); stud(x, -3.9); }
for (let z = -3.1; z <= 3.2; z += 0.9) stud(5.9, z);
stud(5.9, 3.9, 5, 0.26); stud(5.9, -3.9, 5, 0.26); // corner posts

// top plates
box(6, 0.18, 0.2, C.woodDark, 3, 5.1, 3.9, { parent: house });
box(6, 0.18, 0.2, C.woodDark, 3, 5.1, -3.9, { parent: house });
box(0.2, 0.18, 8, C.woodDark, 5.9, 5.1, 0, { parent: house });

// ridge beam + rafters (skeleton roof)
box(6.6, 0.22, 0.22, C.woodDark, 3.1, 7.7, 0, { parent: house });
for (let x = 0.9; x <= 6.1; x += 1.05) {
  for (const s of [1, -1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, slopeLen - 0.5), toon(C.wood));
    r.rotation.x = s * slopeAng;
    r.position.set(x, 6.4, s * 2.15);
    r.castShadow = true;
    house.add(r);
  }
}

// one plywood sheet already nailed on + one leaning
const nailedSheet = box(1.8, 2.4, 0.1, C.plywood, 1.6, 1.45, 4.0, { edges: true, parent: house });
nailedSheet.material = plywoodMat;
const leanSheet = box(1.7, 2.6, 0.12, C.plywood, 7.6, 1.28, 2.4, { edges: true });
leanSheet.material = plywoodMat;
leanSheet.rotation.z = -0.28;

/* ============================================================
   SCAFFOLDING (right of house) + ladder
   ============================================================ */
const scaffold = new THREE.Group();
scaffold.position.set(7.6, 0, -0.5);
scene.add(scaffold);

const poleGeo = new THREE.CylinderGeometry(0.09, 0.09, 6.4, 10);
for (const [px, pz] of [[-0.7, -1.6], [-0.7, 1.6], [0.9, -1.6], [0.9, 1.6]]) {
  const pole = new THREE.Mesh(poleGeo, toon(C.steel));
  pole.position.set(px, 3.2, pz);
  pole.castShadow = true;
  scaffold.add(pole);
}
for (const y of [1.1, 3.1, 5.1]) {
  box(0.12, 0.12, 3.2, C.steel, -0.7, y, 0, { parent: scaffold });
  box(0.12, 0.12, 3.2, C.steel, 0.9, y, 0, { parent: scaffold });
  box(1.6, 0.12, 0.12, C.steel, 0.1, y, -1.6, { parent: scaffold });
  box(1.6, 0.12, 0.12, C.steel, 0.1, y, 1.6, { parent: scaffold });
}
// planks on two levels
for (const y of [3.25, 5.25]) {
  box(1.7, 0.12, 3.4, C.wood, 0.1, y, 0, { edges: true, parent: scaffold });
}
// diagonal brace
const brace = box(0.1, 3.6, 0.1, C.steel, 1.0, 2.1, 0, { parent: scaffold });
brace.rotation.x = 0.72;

// ladder leaning on the scaffold
const ladder = new THREE.Group();
for (const lx of [-0.35, 0.35]) {
  const rail = box(0.09, 5.6, 0.09, C.woodDark, lx, 2.8, 0, { parent: ladder });
  rail.castShadow = true;
}
for (let y = 0.5; y <= 5.2; y += 0.55) box(0.72, 0.08, 0.08, C.wood, 0, y, 0, { parent: ladder });
ladder.rotation.x = -0.32;
ladder.position.set(7.7, 0, 3.1);
scene.add(ladder);

/* ============================================================
   PROPS — lumber, sawhorse, paint, cone, sign
   ============================================================ */
// lumber pile
const lumber = new THREE.Group();
lumber.position.set(9.6, 0, 5.6);
lumber.rotation.y = 0.4;
scene.add(lumber);
for (let row = 0; row < 3; row++) {
  for (let i = 0; i < 3 - row; i++) {
    box(0.35, 0.35, 4.6, C.wood, -0.4 + row * 0.2 + i * 0.4, 0.18 + row * 0.36, 0, { edges: true, parent: lumber });
  }
}

// sawhorse
const sawhorse = new THREE.Group();
sawhorse.position.set(4.2, 0, 7.4);
sawhorse.rotation.y = -0.5;
scene.add(sawhorse);
box(2.2, 0.18, 0.3, C.woodDark, 0, 1.05, 0, { parent: sawhorse });
for (const sx of [-0.85, 0.85]) {
  for (const sz of [-1, 1]) {
    const leg = box(0.12, 1.15, 0.12, C.wood, sx, 0.55, sz * 0.22, { parent: sawhorse });
    leg.rotation.x = sz * 0.22;
  }
}

// paint cans + pink spill
function paintCan(x, z, tipped = false) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.5, 16), toon(C.steel));
  body.castShadow = true;
  g.add(body);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16), toon(C.pink));
  lid.position.y = 0.28;
  g.add(lid);
  if (tipped) { g.rotation.z = Math.PI / 2 - 0.15; g.position.set(x, 0.33, z); }
  else g.position.set(x, 0.25, z);
  scene.add(g);
}
paintCan(2.2, 6.2);
paintCan(3.1, 6.5, true);
const spill = new THREE.Mesh(new THREE.CircleGeometry(1, 24), toon(C.pink));
spill.rotation.x = -Math.PI / 2;
spill.scale.set(1.4, 1, 1);
spill.position.set(4.2, 0.03, 6.6);
scene.add(spill);

// traffic cones
function cone(x, z) {
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.85, 16), toon(C.orange));
  c.position.set(x, 0.45, z);
  c.castShadow = true;
  scene.add(c);
  box(0.8, 0.07, 0.8, C.orange, x, 0.035, z);
}
cone(-4.6, 9.8);
cone(6.8, 7.6);

// UNDER CONSTRUCTION sign (canvas texture)
const signCanvas = document.createElement('canvas');
signCanvas.width = 512; signCanvas.height = 256;
const sctx = signCanvas.getContext('2d');
sctx.fillStyle = '#f7c845'; sctx.fillRect(0, 0, 512, 256);
sctx.strokeStyle = '#5b3a1e'; sctx.lineWidth = 14; sctx.strokeRect(7, 7, 498, 242);
sctx.fillStyle = '#5b3a1e';
sctx.font = 'bold 64px Arial Black, Arial';
sctx.textAlign = 'center';
sctx.fillText('UNDER', 256, 105);
sctx.fillText('CONSTRUCTION', 256, 185);
const signTex = new THREE.CanvasTexture(signCanvas);
signTex.colorSpace = THREE.SRGBColorSpace;
const signGroup = new THREE.Group();
signGroup.position.set(9.5, 0, 10);
signGroup.rotation.y = -0.35;
scene.add(signGroup);
box(0.14, 1.9, 0.14, C.woodDark, -1.1, 0.95, 0, { parent: signGroup });
box(0.14, 1.9, 0.14, C.woodDark, 1.1, 0.95, 0, { parent: signGroup });
const signPanel = new THREE.Mesh(
  new THREE.BoxGeometry(2.9, 1.45, 0.1),
  [toon(C.woodDark), toon(C.woodDark), toon(C.woodDark), toon(C.woodDark),
   new THREE.MeshToonMaterial({ map: signTex, gradientMap }), toon(C.woodDark)]
);
signPanel.position.set(0, 2.1, 0);
signPanel.castShadow = true;
signGroup.add(signPanel);

/* ============================================================
   WORKERS — little Simpsons-style builders, animated
   ============================================================ */
const workers = [];
const SKIN = 0xffd90f;

function makeWorker({ shirt = 0xffffff, pants = 0x3a6bc4, hat = 0xff8c1a } = {}) {
  const g = new THREE.Group();

  const legGeo = new THREE.BoxGeometry(0.16, 0.55, 0.16);
  const legL = new THREE.Group(), legR = new THREE.Group();
  for (const [lg, sx] of [[legL, -0.11], [legR, 0.11]]) {
    const m = new THREE.Mesh(legGeo, toon(pants));
    m.position.y = -0.275;
    m.castShadow = true;
    lg.add(m);
    lg.position.set(sx, 0.55, 0);
    g.add(lg);
  }

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.6, 0.26), toon(shirt));
  torso.position.y = 0.85;
  torso.castShadow = true;
  g.add(torso);

  const armGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
  const armL = new THREE.Group(), armR = new THREE.Group();
  for (const [ag, sx] of [[armL, -0.28], [armR, 0.28]]) {
    const m = new THREE.Mesh(armGeo, toon(SKIN));
    m.position.y = -0.25;
    m.castShadow = true;
    ag.add(m);
    ag.position.set(sx, 1.1, 0);
    g.add(ag);
  }

  const head = new THREE.Group();
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 14), toon(SKIN));
  hm.castShadow = true;
  head.add(hm);
  for (const ex of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), toon(0xffffff));
    eye.position.set(ex, 0.05, 0.2);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), toon(0x222222));
    pupil.position.set(ex, 0.05, 0.27);
    head.add(pupil);
  }
  const hatTop = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(hat));
  hatTop.position.y = 0.12;
  hatTop.scale.y = 0.75;
  head.add(hatTop);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 14), toon(hat));
  brim.position.y = 0.1;
  head.add(brim);
  head.position.y = 1.42;
  g.add(head);

  g.scale.setScalar(1.15);
  scene.add(g);
  return { g, armL, armR, legL, legR, head };
}

// 1) hammering on the scaffold, facing the frame
{
  const w = makeWorker({ shirt: 0xffffff });
  w.g.position.set(7.7, 3.31, -0.5);
  w.g.rotation.y = -Math.PI / 2;
  const hammer = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.4), toon(C.woodDark));
  handle.position.z = 0.2;
  hammer.add(handle);
  const headH = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.11), toon(0x777f88));
  headH.position.z = 0.4;
  hammer.add(headH);
  hammer.position.y = -0.5;
  w.armR.add(hammer);
  workers.push({
    update(t) {
      w.armR.rotation.x = -1.15 + Math.sin(t * 7) * 0.55;
      w.head.rotation.x = Math.sin(t * 7) * 0.08;
    }
  });
}

// 2) sawing at the sawhorse
{
  const w = makeWorker({ shirt: 0x8fce6e, hat: 0xffd90f });
  w.g.position.set(3.94, 0, 7.88);
  w.g.rotation.y = Math.PI - 0.5;
  const saw = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.5), toon(0xb8c4cc));
  blade.position.set(0, -0.05, 0.3);
  saw.add(blade);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.12), toon(C.woodDark));
  grip.position.set(0, 0.02, 0.05);
  saw.add(grip);
  saw.position.y = -0.5;
  w.armR.add(saw);
  workers.push({
    update(t) {
      w.armR.rotation.x = -0.95 + Math.sin(t * 5) * 0.45;
      w.g.position.z = 7.88 + Math.sin(t * 5) * 0.05;
    }
  });
}

// 3) carrying a plank back and forth across the yard
{
  const w = makeWorker({ shirt: 0x6ec3e8 });
  const plank = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 2.3), toon(C.wood));
  plank.position.set(0.3, 1.62, 0);
  plank.castShadow = true;
  w.g.add(plank);
  w.armR.rotation.x = -2.5; // holding the plank on the shoulder
  workers.push({
    update(t) {
      const p = Math.sin(t * 0.45);
      const dir = Math.cos(t * 0.45);
      w.g.position.set(5 + 4 * p, Math.abs(Math.sin(t * 6)) * 0.06, 9.3);
      w.g.rotation.y = dir >= 0 ? Math.PI / 2 : -Math.PI / 2;
      const swing = Math.sin(t * 6) * 0.55;
      w.legL.rotation.x = swing;
      w.legR.rotation.x = -swing;
      w.armL.rotation.x = -swing * 0.7;
    }
  });
}

// 4) painting the finished wall, next to the door
{
  const w = makeWorker({ shirt: 0xf5f0e6, pants: 0xf5f0e6, hat: 0xffffff });
  w.g.position.set(-3.05, 0, 4.85);
  w.g.rotation.y = Math.PI;
  const roller = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.05), toon(0x777f88));
  stick.position.y = -0.1;
  roller.add(stick);
  const rollerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 10), toon(C.pink));
  rollerHead.rotation.z = Math.PI / 2;
  rollerHead.position.y = -0.3;
  roller.add(rollerHead);
  roller.position.y = -0.55;
  roller.rotation.x = Math.PI;
  w.armR.add(roller);
  // the patch of fresh pink paint he's responsible for
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.3), toon(C.pink));
  patch.position.set(-3.05, 1.6, 4.06);
  scene.add(patch);
  workers.push({
    update(t) {
      w.armR.rotation.x = -1.7 + Math.sin(t * 2.4) * 0.45;
    }
  });
}

/* ============================================================
   WHITE PICKET FENCE — front z=12 (gate at x=-1.8), sides x=±15
   ============================================================ */
const fence = new THREE.Group();
scene.add(fence);
const picketGeo = new THREE.BoxGeometry(0.16, 1.0, 0.05);
const tipGeo = new THREE.ConeGeometry(0.13, 0.22, 4);
const picketMat = toon(C.white);

function picket(x, z, rotY = 0) {
  const p = new THREE.Mesh(picketGeo, picketMat);
  p.position.set(x, 0.5, z);
  p.rotation.y = rotY;
  p.castShadow = true;
  fence.add(p);
  const t = new THREE.Mesh(tipGeo, picketMat);
  t.position.set(x, 1.11, z);
  t.rotation.y = rotY + Math.PI / 4;
  fence.add(t);
}
function rail(len, x, z, rotY = 0) {
  for (const y of [0.35, 0.78]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.09, 0.05), picketMat);
    r.position.set(x, y, z);
    r.rotation.y = rotY;
    fence.add(r);
  }
}

// front run (gate gap x in [-3.0, -0.6])
for (let x = -15; x <= 15; x += 0.55) {
  if (x > -3.0 && x < -0.6) continue;
  picket(x, 12);
}
rail(11.6, -9.1, 12);   // left of gate: x -15 .. -3.3 → hmm, keep simple full-length pieces
rail(15.3, 7.35, 12);   // right of gate
// side runs
for (let z = -8; z <= 11.6; z += 0.55) { picket(-15, z, Math.PI / 2); picket(15, z, Math.PI / 2); }
rail(20, -15, 2, Math.PI / 2);
rail(20, 15, 2, Math.PI / 2);

// little open gate
const gate = new THREE.Group();
gate.position.set(-3.0, 0, 12);
gate.rotation.y = -0.9;
fence.add(gate);
for (let gx = 0.15; gx <= 2.2; gx += 0.5) {
  const p = new THREE.Mesh(picketGeo, picketMat);
  p.position.set(gx, 0.5, 0);
  p.castShadow = true;
  gate.add(p);
  const t = new THREE.Mesh(tipGeo, picketMat);
  t.position.set(gx, 1.11, 0);
  t.rotation.y = Math.PI / 4;
  gate.add(t);
}
for (const y of [0.35, 0.78]) {
  const r = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.09, 0.05), picketMat);
  r.position.set(1.17, y, 0.03);
  gate.add(r);
}

/* ============================================================
   SKY — Simpsons clouds + a couple of bushes/trees
   ============================================================ */
// soft 4-step shading so clouds get pale grey undersides instead of flat white
const cloudSteps = new Uint8Array([208, 230, 246, 255]);
const cloudGrad = new THREE.DataTexture(cloudSteps, cloudSteps.length, 1, THREE.RedFormat);
cloudGrad.minFilter = THREE.NearestFilter;
cloudGrad.magFilter = THREE.NearestFilter;
cloudGrad.needsUpdate = true;
const cloudMat = new THREE.MeshToonMaterial({
  color: 0xffffff,
  gradientMap: cloudGrad,
  emissive: 0xdfeef7,          // lifts sunlit sides back to pure white, undersides stay soft grey-blue
  emissiveIntensity: 0.35,
});
const clouds = [];
function cloud(x, y, z, s = 1) {
  const g = new THREE.Group();
  const blobs = [
    [0, 0, 0, 1.6], [1.4, 0.25, 0.2, 1.15], [-1.4, 0.2, -0.1, 1.1],
    [0.6, 0.75, 0, 1.0], [-0.6, 0.7, 0.15, 0.95],
  ];
  for (const [bx, by, bz, br] of blobs) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(br, 18, 14), cloudMat);
    b.position.set(bx, by, bz);
    b.scale.y = 0.72;
    b.castShadow = true;
    g.add(b);
  }
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  scene.add(g);
  clouds.push(g);
}
cloud(-26, 17, -30, 1.6);
cloud(18, 21, -38, 2.0);
cloud(34, 15, -12, 1.3);
cloud(-38, 20, 8, 1.7);
cloud(6, 24, -55, 2.4);

/* ---------- clickable cloud links above the house ---------- */
function labelTexture(text) {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 256;
  const ctx = cv.getContext('2d');
  function draw() {
    ctx.clearRect(0, 0, 1024, 256);
    ctx.font = "100px 'Luckiest Guy', 'Arial Black', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#111111';
    ctx.fillText(text, 512, 140);
  }
  draw();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  document.fonts.ready.then(() => { draw(); tex.needsUpdate = true; }); // redraw once Luckiest Guy loads
  return tex;
}

const linkClouds = [];
function cloudLink(text, href, x, y, z, s = 1.5) {
  const g = new THREE.Group();
  const blobs = [
    [0, 0, 0, 1.6], [1.5, 0.2, 0.1, 1.15], [-1.5, 0.2, -0.1, 1.1],
    [0.7, 0.7, 0, 1.0], [-0.7, 0.65, 0.1, 0.95],
  ];
  for (const [bx, by, bz, br] of blobs) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(br, 18, 14), cloudMat);
    b.position.set(bx, by, bz);
    b.scale.y = 0.72;
    b.castShadow = true;
    g.add(b);
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(text), transparent: true }));
  sprite.scale.set(4.0, 1.0, 1);
  sprite.position.set(0, 0.15, 2.8);
  g.add(sprite);
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  g.userData = { href, sprite, baseY: y };
  scene.add(g);
  linkClouds.push(g);
}
cloudLink('CONTACT', 'contact.html', -9, 11.4, -1, 1.4);
cloudLink('PORTFOLIO', 'portfolio.html', 0, 12.6, -3, 1.5);
cloudLink('ABOUT', 'about.html', 8.5, 11.4, -1, 1.4);

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
function cloudHit(e) {
  pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(linkClouds, true);
  return hits.length ? hits[0].object : null;
}
let downX = 0, downY = 0;
canvas.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
canvas.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // it was a drag, not a click
  let obj = cloudHit(e);
  while (obj && !obj.userData.href) obj = obj.parent;
  if (obj) window.location.href = obj.userData.href;
});
canvas.addEventListener('pointermove', (e) => {
  canvas.style.cursor = cloudHit(e) ? 'pointer' : '';
});

// bushes
function bush(x, z, s = 1) {
  const g = new THREE.Group();
  for (const [bx, br] of [[-0.5, 0.6], [0.4, 0.7], [0, 0.8]]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(br, 14, 12), toon(0x3f9b3f));
    b.position.set(bx, br * 0.7, 0);
    b.castShadow = true;
    g.add(b);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  scene.add(g);
}
bush(-8.2, 5.2, 1.1);
bush(-12.5, 9, 0.9);
bush(12.5, -6, 1.3);

// simple cartoon trees
function tree(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3.2, 10), toon(0x8a5a2b));
  trunk.position.y = 1.6;
  trunk.castShadow = true;
  g.add(trunk);
  for (const [tx, ty, tz, tr] of [[0, 4.4, 0, 1.9], [-1.3, 3.7, 0.3, 1.3], [1.2, 3.8, -0.2, 1.35], [0.2, 3.4, 1.2, 1.2]]) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(tr, 16, 12), toon(0x4caf50));
    leaf.position.set(tx, ty, tz);
    leaf.castShadow = true;
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  scene.add(g);
}
tree(-11.5, -5.5);

/* ============================================================
   THE NEIGHBOURHOOD — street + finished houses all around
   ============================================================ */
// road along the front (z 14..20) with sidewalks and dashes
const road = new THREE.Mesh(new THREE.PlaneGeometry(130, 6), new THREE.MeshToonMaterial({ color: 0x82858f, gradientMap, map: asphaltTex }));
road.rotation.x = -Math.PI / 2;
road.position.set(0, 0.025, 17);
road.receiveShadow = true;
scene.add(road);
for (const sz of [13.55, 20.45]) {
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(130, 0.9), toon(0xd6d3cc));
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(0, 0.03, sz);
  walk.receiveShadow = true;
  scene.add(walk);
}
for (let dx = -62; dx <= 62; dx += 4) {
  const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.28), toon(0xf7c845));
  dash.rotation.x = -Math.PI / 2;
  dash.position.set(dx, 0.035, 17);
  scene.add(dash);
}

// generic finished Simpsons-style house
function finishedHouse({ wall, roof, door = C.door }, x, z, rotY = 0, s = 1) {
  const g = new THREE.Group();
  const W = 9, H = 4.6, D = 7;

  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), toon(wall));
  body.position.y = H / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  body.add(new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), edgeMat));
  g.add(body);

  // gable ends (ridge along x)
  const gs = new THREE.Shape();
  gs.moveTo(-D / 2, 0); gs.lineTo(D / 2, 0); gs.lineTo(0, 2.3); gs.closePath();
  for (const sx of [-1, 1]) {
    const ge = new THREE.Mesh(new THREE.ExtrudeGeometry(gs, { depth: 0.3, bevelEnabled: false }), toon(wall));
    ge.rotation.y = Math.PI / 2;
    ge.position.set(sx * W / 2 - (sx > 0 ? 0.3 : 0), H, 0);
    ge.castShadow = true;
    g.add(ge);
  }

  // roof panels
  const ang = Math.atan2(2.3, D / 2);
  const len = Math.hypot(2.3, D / 2) + 0.8;
  for (const zs of [1, -1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(W + 1, 0.26, len), roofMat(roof));
    p.rotation.x = zs * ang;
    p.position.set(0, H + 1.25, zs * (D / 4 - 0.05));
    p.castShadow = true;
    p.receiveShadow = true;
    p.add(new THREE.LineSegments(new THREE.EdgesGeometry(p.geometry), edgeMat));
    g.add(p);
  }

  // chimney
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), toon(wall));
  ch.position.set(W / 4, H + 2.6, -1);
  ch.castShadow = true;
  g.add(ch);

  // door, knob, step
  const dr = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.4, 0.14), toon(door));
  dr.position.set(0.9, 1.2, D / 2 + 0.05);
  dr.add(new THREE.LineSegments(new THREE.EdgesGeometry(dr.geometry), edgeMat));
  g.add(dr);
  const kn = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), toon(0xffd90f));
  kn.position.set(1.3, 1.2, D / 2 + 0.14);
  g.add(kn);
  const st = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.8), toon(C.path));
  st.position.set(0.9, 0.08, D / 2 + 0.4);
  g.add(st);

  // windows
  for (const [wx, wy] of [[-2.6, 2.0], [-2.6, 3.6], [2.9, 3.6]]) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 0.12), toon(C.trim));
    fr.position.set(wx, wy, D / 2 + 0.04);
    g.add(fr);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 0.14), toon(C.glass));
    gl.position.set(wx, wy, D / 2 + 0.05);
    g.add(gl);
  }

  // front bushes
  for (const bx of [-3.4, 3.4]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 12), toon(0x3f9b3f));
    b.position.set(bx, 0.5, D / 2 + 0.7);
    b.castShadow = true;
    g.add(b);
  }

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  g.scale.setScalar(s);
  scene.add(g);
}

// neighbours beside the main house
finishedHouse({ wall: 0xf2a2c0, roof: 0x5b7fbf }, -28, 2, 0.12);
finishedHouse({ wall: 0x9fd0e8, roof: 0x7c6bae }, 28, 2, -0.1);
// across the street, facing back at us
finishedHouse({ wall: 0xcdb4e2, roof: 0x6f5b9e, door: 0x5b3a1e }, -25, 37, Math.PI);
finishedHouse({ wall: 0xc9e265, roof: 0xb05c6e }, 0, 38, Math.PI, 0.95);
finishedHouse({ wall: 0xf6b26b, roof: 0x4f8f5b }, 26, 37, Math.PI + 0.08);

// street trees + extra greenery
tree(-14, 21.5, 0.8);
tree(13.5, 21.6, 0.9);
tree(-36, 8, 1.1);
tree(37, 10, 1.0);
tree(-33, 26, 0.85);
tree(34, 27, 0.9);
bush(-21, 12.5, 1.0);
bush(21.5, 12.6, 1.1);

/* ============================================================
   SOCCER FIELD — behind the houses (backyard side)
   ============================================================ */
const FIELD = { cx: 0, cz: -27, w: 28, d: 16 }; // long axis along x
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

// mowed stripes
for (let i = 0; i < 8; i++) {
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.w / 8, FIELD.d), toon(i % 2 ? 0x63b840 : 0x71c94e));
  stripe.rotation.x = -Math.PI / 2;
  stripe.position.set(FIELD.cx - FIELD.w / 2 + FIELD.w / 16 + i * FIELD.w / 8, 0.03, FIELD.cz);
  stripe.receiveShadow = true;
  scene.add(stripe);
}

// white lines
function fieldLine(w, d, x, z) {
  const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat);
  l.rotation.x = -Math.PI / 2;
  l.position.set(x, 0.05, z);
  scene.add(l);
}
fieldLine(FIELD.w, 0.18, FIELD.cx, FIELD.cz - FIELD.d / 2);       // sidelines
fieldLine(FIELD.w, 0.18, FIELD.cx, FIELD.cz + FIELD.d / 2);
fieldLine(0.18, FIELD.d, FIELD.cx - FIELD.w / 2, FIELD.cz);       // goal lines
fieldLine(0.18, FIELD.d, FIELD.cx + FIELD.w / 2, FIELD.cz);
fieldLine(0.18, FIELD.d, FIELD.cx, FIELD.cz);                     // halfway line
// centre circle
const circle = new THREE.Mesh(new THREE.RingGeometry(2.8, 3.0, 40), lineMat);
circle.rotation.x = -Math.PI / 2;
circle.position.set(FIELD.cx, 0.05, FIELD.cz);
scene.add(circle);
// penalty boxes
for (const s of [-1, 1]) {
  const bx = FIELD.cx + s * FIELD.w / 2;
  fieldLine(0.18, 7, bx - s * 4.5, FIELD.cz);
  fieldLine(4.5, 0.18, bx - s * 2.25, FIELD.cz - 3.5);
  fieldLine(4.5, 0.18, bx - s * 2.25, FIELD.cz + 3.5);
}

// goals
for (const s of [-1, 1]) {
  const gx = FIELD.cx + s * FIELD.w / 2;
  for (const gz of [-2, 2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.7, 10), lineMat);
    post.position.set(gx, 0.85, FIELD.cz + gz);
    post.castShadow = true;
    scene.add(post);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.16, 10), lineMat);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(gx, 1.7, FIELD.cz);
  bar.castShadow = true;
  scene.add(bar);
}

// ball, mid-field
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.25, 18, 14), toon(0xffffff));
ball.position.set(FIELD.cx + 2.5, 0.25, FIELD.cz - 1.5);
ball.castShadow = true;
scene.add(ball);

/* ============================================================
   FORESTS & HILLS — fill out the world
   ============================================================ */
function pine(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.4, 8), toon(0x7a4a22));
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  g.add(trunk);
  const layers = [[1.7, 2.0, 1.9], [1.35, 1.7, 3.2], [1.0, 1.4, 4.3]];
  for (const [r, h, y] of layers) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), toon(0x2e7d32));
    c.position.y = y;
    c.castShadow = true;
    g.add(c);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  scene.add(g);
}

// forest belt behind the soccer field
for (let i = 0; i < 14; i++) {
  const x = -32 + i * 5 + (Math.random() - 0.5) * 3;
  const z = -42 - Math.random() * 14;
  Math.random() < 0.6 ? pine(x, z, 0.9 + Math.random() * 0.7) : tree(x, z, 0.8 + Math.random() * 0.5);
}
// forest on the far side, beyond the street houses
for (let i = 0; i < 14; i++) {
  const x = -52 + i * 8 + (Math.random() - 0.5) * 4;
  const z = 50 + Math.random() * 16;
  Math.random() < 0.55 ? pine(x, z, 1.0 + Math.random() * 0.8) : tree(x, z, 0.9 + Math.random() * 0.5);
}
// left & right woods
for (let i = 0; i < 9; i++) {
  const z = -36 + i * 5.5 + (Math.random() - 0.5) * 3;
  pine(-44 - Math.random() * 16, z, 0.9 + Math.random() * 0.7);
  Math.random() < 0.5 ? pine(44 + Math.random() * 16, z + 3, 0.9 + Math.random() * 0.6)
                      : tree(46 + Math.random() * 12, z + 3, 0.8 + Math.random() * 0.4);
}
// a few extra round trees near the field
tree(-19, -24, 0.9);
tree(19.5, -30, 1.0);
bush(-16, -34, 1.2);
bush(17, -20, 1.0);

// rolling hills on the horizon
function hill(x, z, r, color) {
  const h = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), toon(color));
  h.scale.y = 0.32;
  h.position.set(x, 0, z);
  h.receiveShadow = true;
  scene.add(h);
}
hill(-55, -55, 20, 0x69b34c);
hill(-10, -78, 19, 0x5da043);
hill(44, -72, 17, 0x74c257);
hill(78, -16, 16, 0x69b34c);
hill(-80, -6, 16, 0x5da043);
hill(-72, 52, 18, 0x69b34c);
hill(74, 50, 19, 0x5da043);
hill(12, 85, 20, 0x74c257);

/* ---------- animate ---------- */
const clock = new THREE.Clock();
let firstFrame = true;

const _toCam = new THREE.Vector3();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  for (let i = 0; i < clouds.length; i++) {
    const c = clouds[i];
    c.position.x += dt * (0.4 + i * 0.12);
    if (c.position.x > 60) c.position.x = -60;
  }
  for (let i = 0; i < workers.length; i++) workers[i].update(t);
  // link clouds: gentle bob + keep label on the camera-facing side
  for (let i = 0; i < linkClouds.length; i++) {
    const g = linkClouds[i];
    g.position.y = g.userData.baseY + Math.sin(t * 0.8 + i * 2.1) * 0.35;
    _toCam.copy(camera.position);
    g.worldToLocal(_toCam);
    _toCam.normalize().multiplyScalar(2.8); // stay clear of the widest cloud blob so letters never clip
    _toCam.y = Math.max(_toCam.y, 0.15);
    g.userData.sprite.position.copy(_toCam);
  }
  controls.update();
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    document.getElementById('loader').classList.add('done');
  }
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
