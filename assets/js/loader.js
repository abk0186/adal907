import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/OrbitControls.js';

const PAINT = 0x3b3f44;
const RED = 0xd71920;
const BG = 0xe6e8eb;

const POSE = {
  boomDown: 0.34,
  boomUp: -1.02,
  bucketCarry: -0.42,
  bucketDump: 0.85,
  artic: 0.58,
};

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();

function glAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch (err) {
    return false;
  }
}

function markFallback(stage) {
  stage.classList.add('is-fallback');
  const hint = stage.parentElement && stage.parentElement.querySelector('.hint');
  if (hint) hint.textContent = 'Браузер без WebGL показывает фотографию машины.';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function canvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function makeBrandTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 320;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.font = '800 200px Manrope, Arial, sans-serif';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 22;
  g.strokeStyle = '#000000';
  g.fillStyle = '#FFFFFF';
  g.strokeText('ADAL', 24, 165);
  g.fillText('ADAL', 24, 165);
  const word = g.measureText('ADAL').width;
  const x = 56 + word;
  roundRect(g, x, 70, 520, 186, 32);
  g.fillStyle = '#D71920';
  g.fill();
  g.font = '800 78px Manrope, Arial, sans-serif';
  g.fillStyle = '#FFFFFF';
  g.textAlign = 'center';
  g.fillText('MODEL 907', x + 260, 172);
  return canvasTexture(canvas);
}

function makePhoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 360;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.font = '800 112px Manrope, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 18;
  g.strokeStyle = '#111111';
  g.fillStyle = '#FFFFFF';
  const text = '8 700 333 0 999';
  g.strokeText(text, 512, 185);
  g.fillText(text, 512, 185);
  return canvasTexture(canvas);
}

function makeHazardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = '#161616';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#F0C400';
  for (let i = -6; i < 10; i += 1) {
    g.beginPath();
    g.moveTo(i * 22, 0);
    g.lineTo(i * 22 + 48, 0);
    g.lineTo(i * 22 - 16, 128);
    g.lineTo(i * 22 - 64, 128);
    g.fill();
  }
  return canvasTexture(canvas);
}

function makeEnvTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, '#ffffff');
  sky.addColorStop(0.42, '#d5dbe3');
  sky.addColorStop(0.58, '#b4bcc4');
  sky.addColorStop(1, '#8b939b');
  g.fillStyle = sky;
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.fillRect(36, 18, 110, 46);
  g.fillRect(250, 28, 150, 38);
  g.fillRect(430, 16, 60, 34);
  const tex = canvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

function makeContactTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 24, 128, 128, 124);
  grd.addColorStop(0, 'rgba(30,34,38,0.22)');
  grd.addColorStop(1, 'rgba(30,34,38,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function shade(mesh, cast = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

function box(parent, w, h, d, material, x, y, z, cast = true) {
  const mesh = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), cast);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function anchor(parent, x, y, z) {
  const obj = new THREE.Object3D();
  obj.position.set(x, y, z);
  parent.add(obj);
  return obj;
}

function makePlate(shape, depth) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 1,
    curveSegments: 12,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(depth / 2, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

function armShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.08, 0.22);
  shape.lineTo(-0.14, -0.15);
  shape.lineTo(0.22, -0.19);
  shape.lineTo(0.78, -0.04);
  shape.lineTo(1.12, 0.02);
  shape.lineTo(1.30, 0.06);
  shape.lineTo(1.42, 0.20);
  shape.lineTo(1.32, 0.38);
  shape.lineTo(1.08, 0.30);
  shape.lineTo(0.62, 0.36);
  shape.lineTo(0.22, 0.28);
  shape.lineTo(-0.08, 0.22);
  const pivot = new THREE.Path();
  pivot.absarc(0, 0, 0.055, 0, Math.PI * 2, true);
  shape.holes.push(pivot);
  const tip = new THREE.Path();
  tip.absarc(1.26, 0.18, 0.042, 0, Math.PI * 2, true);
  shape.holes.push(tip);
  return shape;
}

function bucketSideShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.02, 0.08);
  shape.lineTo(-0.14, -0.02);
  shape.lineTo(-0.10, -0.38);
  shape.lineTo(0.52, -0.52);
  shape.lineTo(0.70, -0.44);
  shape.lineTo(0.60, -0.02);
  shape.lineTo(0.40, 0.10);
  shape.lineTo(0.02, 0.12);
  shape.closePath();
  return shape;
}

function addLugs(wheel, lugGeo, lugMat) {
  const around = 18;
  const count = around * 2;
  const mesh = new THREE.InstancedMesh(lugGeo, lugMat, count);
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  let index = 0;
  for (let i = 0; i < around; i += 1) {
    for (const side of [-1, 1]) {
      const angle = (i / around) * Math.PI * 2 + side * 0.09;
      const radial = new THREE.Vector3(0, Math.cos(angle), Math.sin(angle));
      dummy.position.copy(radial).multiplyScalar(0.334);
      dummy.position.x = side * 0.052;
      dummy.quaternion.setFromUnitVectors(up, radial);
      dummy.rotateY(side * 0.42);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      index += 1;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  wheel.add(mesh);
}

function makeWheel(materials, lugGeo) {
  const wheel = new THREE.Group();
  const tire = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.328, 0.328, 0.2, 40), materials.tire));
  tire.rotation.z = Math.PI / 2;
  wheel.add(tire);

  const wall = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.25, 32), materials.tire));
  wall.rotation.z = Math.PI / 2;
  wheel.add(wall);

  addLugs(wheel, lugGeo, materials.lug);

  const rim = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.21, 24), materials.rim));
  rim.rotation.z = Math.PI / 2;
  wheel.add(rim);

  const disk = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.222, 20), materials.rim));
  disk.rotation.z = Math.PI / 2;
  wheel.add(disk);

  const lip = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.03, 24), materials.rimEdge));
  lip.rotation.z = Math.PI / 2;
  lip.position.x = 0.09;
  wheel.add(lip);

  const hub = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.24, 14), materials.steel));
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);

  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    const bolt = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.25, 8), materials.steel), false);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(0, Math.cos(angle) * 0.078, Math.sin(angle) * 0.078);
    wheel.add(bolt);
  }
  return wheel;
}

function placeWheel(wheel, parent, x, z) {
  wheel.position.set(x, 0.348, z);
  parent.add(wheel);
}

function makeBar(radius, material) {
  const group = new THREE.Group();
  const tube = shade(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 10), material));
  group.add(tube);
  group.userData.kind = 'bar';
  return group;
}

function makeHydra(barrelR, rodR, materials) {
  const group = new THREE.Group();
  const barrel = shade(new THREE.Mesh(new THREE.CylinderGeometry(barrelR, barrelR, 1, 14), materials.steel));
  const rod = shade(new THREE.Mesh(new THREE.CylinderGeometry(rodR, rodR, 1, 12), materials.chrome));
  const capGeo = new THREE.CylinderGeometry(barrelR * 1.45, barrelR * 1.45, 0.045, 12);
  const capA = shade(new THREE.Mesh(capGeo, materials.red));
  const capB = shade(new THREE.Mesh(capGeo, materials.red));
  group.add(barrel, rod, capA, capB);
  group.userData.kind = 'hydra';
  return group;
}

function span(group, objA, objB) {
  objA.getWorldPosition(_a);
  objB.getWorldPosition(_b);
  const parent = group.parent;
  parent.worldToLocal(_a);
  parent.worldToLocal(_b);
  _dir.subVectors(_b, _a);
  const len = _dir.length();
  if (len < 0.02) return;
  _mid.addVectors(_a, _b).multiplyScalar(0.5);
  group.position.copy(_mid);
  _dir.multiplyScalar(1 / len);
  group.quaternion.setFromUnitVectors(Y_AXIS, _dir);

  if (group.userData.kind === 'bar') {
    const tube = group.children[0];
    tube.scale.y = len;
    tube.position.y = 0;
    return;
  }

  const barrel = group.children[0];
  const rod = group.children[1];
  const capA = group.children[2];
  const capB = group.children[3];
  const barrelLen = Math.min(len * 0.58, 0.5);
  const rodLen = Math.max(len - barrelLen + 0.02, 0.08);
  barrel.scale.y = barrelLen;
  barrel.position.y = -len / 2 + barrelLen / 2;
  rod.scale.y = rodLen;
  rod.position.y = -len / 2 + barrelLen + rodLen / 2 - 0.02;
  capA.position.y = -len / 2;
  capB.position.y = len / 2;
}

function decalMaterial(map) {
  return new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    roughness: 0.55,
    metalness: 0.02,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

function buildMachine(materials, brandMap, phoneMap) {
  const machine = new THREE.Group();
  const rear = new THREE.Group();
  const front = new THREE.Group();
  rear.name = 'rear';
  front.name = 'front';
  machine.add(rear, front);

  const paint = materials.paint;
  const lugGeo = new THREE.BoxGeometry(0.09, 0.018, 0.048);

  box(rear, 0.74, 0.22, 1.12, paint, 0, 0.39, -0.58);
  box(rear, 0.8, 0.56, 0.78, paint, 0, 0.79, -0.8);
  box(rear, 0.62, 0.02, 0.42, materials.paintDark, 0, 1.08, -0.78);
  box(rear, 1.16, 0.34, 0.24, paint, 0, 0.33, -1.32);

  const grille = box(rear, 0.74, 0.5, 0.04, paint, 0, 0.78, -1.2);
  grille.position.z = -1.205;
  const louverGeo = new THREE.BoxGeometry(0.072, 0.016, 0.045);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const slot = shade(new THREE.Mesh(louverGeo, materials.dark), false);
      slot.position.set(-0.28 + col * 0.08, 0.9 - row * 0.11, -1.24);
      slot.rotation.z = -0.62;
      rear.add(slot);
    }
  }

  const hazardMat = new THREE.MeshStandardMaterial({
    map: materials.hazard,
    roughness: 0.62,
    metalness: 0.05,
  });
  for (const side of [-1, 1]) {
    const face = shade(new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.26), hazardMat), false);
    face.position.set(side * 0.46, 0.33, -1.445);
    face.rotation.y = Math.PI;
    rear.add(face);
    const sideFace = shade(new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.26), hazardMat), false);
    sideFace.position.set(side * 0.585, 0.33, -1.34);
    sideFace.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    rear.add(sideFace);
  }

  const hitch = shade(new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.01, 8, 16), materials.steel));
  hitch.position.set(0, 0.3, -1.47);
  rear.add(hitch);
  box(rear, 0.08, 0.1, 0.02, materials.steel, 0, 0.34, -1.45, false);

  for (const side of [-1, 1]) {
    const lamp = new THREE.Group();
    lamp.position.set(side * 0.24, 0.98, -1.2);
    const housing = shade(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.06), paint));
    const glass = shade(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.02), materials.lens), false);
    glass.position.z = -0.035;
    lamp.add(housing, glass);
    rear.add(lamp);
  }

  const stack = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.42, 12), materials.tire));
  stack.position.set(-0.5, 1.18, -0.98);
  rear.add(stack);
  const stackCap = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.034, 0.05, 12), materials.tire));
  stackCap.position.set(-0.5, 1.4, -0.98);
  rear.add(stackCap);
  const cleaner = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.2, 16), materials.tire));
  cleaner.position.set(-0.52, 0.74, -1.08);
  rear.add(cleaner);
  const cleanerCap = shade(new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), materials.tire));
  cleanerCap.scale.y = 0.55;
  cleanerCap.position.set(-0.52, 0.86, -1.08);
  rear.add(cleanerCap);
  const intake = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8), materials.tire), false);
  intake.rotation.z = Math.PI / 2;
  intake.position.set(-0.46, 0.7, -1.02);
  rear.add(intake);

  for (let i = 0; i < 5; i += 1) {
    const fin = shade(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.26), materials.dark), false);
    fin.position.set(0.408, 0.92 - i * 0.04, -0.86);
    rear.add(fin);
  }

  box(rear, 0.66, 0.4, 0.56, paint, 0, 0.7, -0.38);
  const cushion = box(rear, 0.5, 0.08, 0.4, materials.seat, 0, 0.94, -0.34);
  cushion.rotation.x = -0.04;
  const back = box(rear, 0.48, 0.32, 0.08, materials.seat, 0, 1.12, -0.5);
  back.rotation.x = -0.22;

  for (const side of [-1, 1]) {
    const rest = box(rear, 0.05, 0.045, 0.28, materials.seat, side * 0.28, 1.02, -0.36);
    rest.rotation.z = side * -0.15;
    box(rear, 0.025, 0.12, 0.32, materials.red, side * 0.315, 1.0, -0.36);
  }

  const phoneMat = decalMaterial(phoneMap);
  for (const side of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), phoneMat);
    plate.position.set(side * 0.336, 0.7, -0.38);
    plate.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    rear.add(plate);
  }

  for (const x of [-0.34, 0.34]) {
    const post = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.58, 10), paint));
    post.position.set(x, 1.18, -0.6);
    rear.add(post);
  }
  const ropsBar = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.7, 10), paint));
  ropsBar.rotation.z = Math.PI / 2;
  ropsBar.position.set(0, 1.47, -0.6);
  rear.add(ropsBar);
  const canopy = box(rear, 0.78, 0.028, 0.48, paint, 0, 1.49, -0.38);
  canopy.rotation.x = 0.04;
  const visor = box(rear, 0.78, 0.02, 0.1, paint, 0, 1.455, -0.12);
  visor.rotation.x = 0.35;

  box(rear, 0.16, 0.028, 0.24, materials.steel, 0.48, 0.22, -0.34, false);
  box(rear, 0.16, 0.028, 0.24, materials.steel, -0.48, 0.22, -0.34, false);

  const rearLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.155), decalMaterial(brandMap));
  rearLogo.position.set(0, 0.52, -1.24);
  rearLogo.rotation.y = Math.PI;
  rear.add(rearLogo);

  const rearDisk = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 20), materials.steel), false);
  rearDisk.position.set(0, 0.4, -0.03);
  rear.add(rearDisk);
  const joint = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 16), materials.steel));
  joint.position.set(0, 0.4, 0);
  machine.add(joint);

  placeWheel(makeWheel(materials, lugGeo), rear, 0.52, -0.86);
  placeWheel(makeWheel(materials, lugGeo), rear, -0.52, -0.86);
  const rearAxle = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.82, 10), materials.steel), false);
  rearAxle.rotation.z = Math.PI / 2;
  rearAxle.position.set(0, 0.348, -0.86);
  rear.add(rearAxle);

  box(front, 0.7, 0.2, 0.86, paint, 0, 0.4, 0.52);
  box(front, 0.62, 0.16, 0.18, paint, 0, 0.32, 1.02);
  box(front, 0.66, 0.04, 0.46, paint, 0, 0.52, 0.34);
  box(front, 0.045, 0.46, 0.34, paint, 0.33, 0.74, 0.66);
  box(front, 0.045, 0.46, 0.34, paint, -0.33, 0.74, 0.66);
  box(front, 0.58, 0.08, 0.2, paint, 0, 0.56, 0.5);

  for (const x of [-0.1, 0.08]) {
    const pedal = shade(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.014, 0.1), materials.steel), false);
    pedal.position.set(x, 0.56, 0.5);
    pedal.rotation.x = 0.35;
    front.add(pedal);
  }

  const column = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.34, 12), materials.tire));
  column.position.set(0, 0.9, 0.38);
  column.rotation.x = 0.5;
  front.add(column);

  const wheel = new THREE.Group();
  wheel.position.set(0, 1.08, 0.5);
  wheel.rotation.x = 0.72;
  const rimT = shade(new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.016, 8, 22), materials.tire));
  wheel.add(rimT);
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2;
    const spoke = shade(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.014, 0.012), materials.tire), false);
    spoke.position.set(Math.cos(angle) * 0.065, Math.sin(angle) * 0.065, 0);
    spoke.rotation.z = angle;
    wheel.add(spoke);
  }
  const hubCap = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.04, 12), materials.steel), false);
  hubCap.rotation.x = Math.PI / 2;
  wheel.add(hubCap);
  front.add(wheel);

  for (let i = 0; i < 2; i += 1) {
    const lever = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.18, 8), materials.steel), false);
    lever.position.set(0.18, 0.74, 0.4 + i * 0.07);
    lever.rotation.z = -0.35;
    lever.rotation.x = -0.15 + i * 0.15;
    const knob = shade(new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), i === 0 ? materials.red : materials.tire), false);
    knob.position.y = 0.1;
    lever.add(knob);
    front.add(lever);
  }

  const frontDisk = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.025, 20), materials.steel), false);
  frontDisk.position.set(0, 0.4, 0.05);
  front.add(frontDisk);

  placeWheel(makeWheel(materials, lugGeo), front, 0.52, 0.8);
  placeWheel(makeWheel(materials, lugGeo), front, -0.52, 0.8);
  const frontAxle = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.82, 10), materials.steel), false);
  frontAxle.rotation.z = Math.PI / 2;
  frontAxle.position.set(0, 0.348, 0.8);
  front.add(frontAxle);

  const boom = new THREE.Group();
  boom.position.set(0, 0.9, 0.72);
  front.add(boom);

  const armGeo = makePlate(armShape(), 0.05);
  const armMat = materials.paint.clone();
  armMat.side = THREE.DoubleSide;
  for (const side of [-1, 1]) {
    const arm = shade(new THREE.Mesh(armGeo, armMat));
    arm.position.x = side * 0.36;
    boom.add(arm);
  }

  const brandMat = decalMaterial(brandMap);
  for (const side of [-1, 1]) {
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.155), brandMat);
    logo.position.set(side * 0.4, 0.1, 0.55);
    logo.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    boom.add(logo);
  }

  const boomPin = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.82, 14), materials.steel));
  boomPin.rotation.z = Math.PI / 2;
  boom.add(boomPin);
  for (const side of [-1, 1]) {
    const cap = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), materials.red), false);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = side * 0.4;
    boom.add(cap);
  }

  const cross = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.62, 10), materials.steel), false);
  cross.rotation.z = Math.PI / 2;
  cross.position.set(0, 0.28, 0.85);
  boom.add(cross);

  const bucket = new THREE.Group();
  bucket.position.set(0, 0.18, 1.26);
  boom.add(bucket);

  const sideGeo = makePlate(bucketSideShape(), 0.028);
  const bucketMat = materials.bucket.clone();
  bucketMat.side = THREE.DoubleSide;
  for (const side of [-1, 1]) {
    const wall = shade(new THREE.Mesh(sideGeo, bucketMat));
    wall.position.x = side * 0.56;
    bucket.add(wall);
  }
  for (const side of [-1, 1]) {
    box(bucket, 0.03, 0.2, 0.16, materials.bucket, side * 0.34, -0.02, 0.02);
  }

  const floor = box(bucket, 1.06, 0.028, 0.58, materials.bucket, 0, -0.4, 0.28);
  floor.rotation.x = 0.18;
  box(bucket, 1.06, 0.4, 0.028, materials.bucket, 0, -0.18, -0.02);
  const spill = box(bucket, 1.16, 0.03, 0.16, materials.bucket, 0, 0.04, 0.46);
  spill.rotation.x = -0.55;
  box(bucket, 1.18, 0.04, 0.055, materials.steel, 0, -0.48, 0.6);
  for (const x of [-0.36, -0.12, 0.12, 0.36]) {
    box(bucket, 0.07, 0.045, 0.09, materials.steel, x, -0.5, 0.56, false);
  }
  box(bucket, 0.1, 0.2, 0.06, materials.bucket, 0, 0.12, -0.02);

  const bucketPin = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.78, 12), materials.steel));
  bucketPin.rotation.z = Math.PI / 2;
  bucket.add(bucketPin);

  const links = [];
  function bind(parent, objA, objB, group) {
    parent.add(group);
    links.push({ group, objA, objB });
  }

  bind(front, anchor(front, 0.24, 0.46, 0.5), anchor(boom, 0.24, -0.02, 0.58), makeHydra(0.04, 0.022, materials));
  bind(front, anchor(front, -0.24, 0.46, 0.5), anchor(boom, -0.24, -0.02, 0.58), makeHydra(0.04, 0.022, materials));
  bind(boom, anchor(boom, 0, 0.32, 0.55), anchor(bucket, 0, 0.2, -0.02), makeHydra(0.032, 0.018, materials));
  bind(boom, anchor(boom, 0, 0.34, 1.02), anchor(bucket, 0, 0.16, 0.08), makeBar(0.016, materials.steel));
  bind(machine, anchor(rear, -0.2, 0.32, -0.14), anchor(front, -0.2, 0.32, 0.18), makeHydra(0.028, 0.016, materials));
  bind(machine, anchor(rear, 0.2, 0.32, -0.14), anchor(front, 0.2, 0.32, 0.18), makeHydra(0.028, 0.016, materials));

  return { machine, front, boom, bucket, links };
}

export async function initViewer(stage) {
  if (!glAvailable()) {
    markFallback(stage);
    return;
  }

  if (document.fonts && document.fonts.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => { setTimeout(resolve, 1200); }),
    ]);
  }

  const canvas = stage.querySelector('canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    markFallback(stage);
    return;
  }

  const mobile = window.matchMedia('(max-width: 800px)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(BG, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.environment = makeEnvTexture();

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  camera.position.set(4.35, 2.05, 4.55);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0.05, 0.7, 0.2);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.75;
  controls.minDistance = 2.6;
  controls.maxDistance = 8.5;
  controls.minPolarAngle = 0.18;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.85;
  controls.update();

  const hemi = new THREE.HemisphereLight(0xfffdfb, 0xb7bec6, 0.72);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));

  const key = new THREE.DirectionalLight(0xfff6ee, 3.1);
  key.position.set(5.2, 8.4, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 24;
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.028;
  scene.add(key);
  key.target.position.set(0, 0.4, 0.3);
  scene.add(key.target);

  const fill = new THREE.DirectionalLight(0xd7e2ee, 1.15);
  fill.position.set(-5, 3.2, -2.4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.7);
  rim.position.set(-2.2, 5.5, -5);
  scene.add(rim);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: BG, roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 4.8),
    new THREE.MeshBasicMaterial({ map: makeContactTexture(), transparent: true, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(0.05, 0.005, 0.15);
  scene.add(blob);

  const materials = {
    paint: new THREE.MeshStandardMaterial({ color: PAINT, metalness: 0.28, roughness: 0.5, envMapIntensity: 0.6 }),
    paintDark: new THREE.MeshStandardMaterial({ color: 0x34383c, metalness: 0.28, roughness: 0.48, envMapIntensity: 0.55 }),
    bucket: new THREE.MeshStandardMaterial({ color: 0x1c1f22, metalness: 0.48, roughness: 0.4, envMapIntensity: 0.75 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0.04, roughness: 0.92 }),
    lug: new THREE.MeshStandardMaterial({ color: 0x101010, metalness: 0.04, roughness: 0.88 }),
    rim: new THREE.MeshStandardMaterial({ color: 0x2a2e32, metalness: 0.72, roughness: 0.38, envMapIntensity: 0.8 }),
    rimEdge: new THREE.MeshStandardMaterial({ color: 0x3d4248, metalness: 0.7, roughness: 0.35, envMapIntensity: 0.85 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8d949b, metalness: 0.82, roughness: 0.32, envMapIntensity: 1 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe6eaee, metalness: 0.92, roughness: 0.18, envMapIntensity: 1.25 }),
    red: new THREE.MeshStandardMaterial({ color: RED, metalness: 0.25, roughness: 0.42 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x171717, metalness: 0.08, roughness: 0.74 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x121416, roughness: 0.85, metalness: 0.1 }),
    lens: new THREE.MeshStandardMaterial({
      color: 0xf7f8fa,
      emissive: 0xd5deea,
      emissiveIntensity: 0.65,
      roughness: 0.12,
      metalness: 0.05,
    }),
    hazard: makeHazardTexture(),
  };

  const brandMap = makeBrandTexture();
  const phoneMap = makePhoneTexture();
  const rig = buildMachine(materials, brandMap, phoneMap);
  scene.add(rig.machine);

  const state = { boom: 0, boomTo: 0, artic: 0, articTo: 0 };
  const boomBtn = document.getElementById('btn-boom');
  const articBtn = document.getElementById('btn-artic');

  function setPressed(button, on, onLabel, offLabel) {
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.textContent = on ? onLabel : offLabel;
  }

  boomBtn.addEventListener('click', () => {
    state.boomTo = state.boomTo > 0.5 ? 0 : 1;
    if (reduced) state.boom = state.boomTo;
    setPressed(boomBtn, state.boomTo > 0.5, 'Опустить ковш', 'Поднять ковш');
  });
  articBtn.addEventListener('click', () => {
    state.articTo = state.articTo > 0.5 ? 0 : 1;
    if (reduced) state.artic = state.articTo;
    setPressed(articBtn, state.articTo > 0.5, 'Выпрямить раму', 'Излом рамы');
  });

  let idle = true;
  let idleTimer = 0;
  const wake = () => {
    idle = false;
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => { idle = true; }, 2400);
  };
  controls.addEventListener('start', wake);
  controls.addEventListener('end', wake);

  function resize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(stage);

  const fallback = stage.querySelector('.fallback');
  if (fallback) {
    fallback.alt = '';
    fallback.setAttribute('aria-hidden', 'true');
  }
  stage.classList.add('is-live');

  const clock = new THREE.Clock();
  let running = true;

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = 1 - Math.exp(-dt * 2.6);
    state.boom += (state.boomTo - state.boom) * k;
    state.artic += (state.articTo - state.artic) * k;

    rig.boom.rotation.x = THREE.MathUtils.lerp(POSE.boomDown, POSE.boomUp, state.boom);
    rig.bucket.rotation.x = THREE.MathUtils.lerp(POSE.bucketCarry, POSE.bucketDump, state.boom);
    rig.front.rotation.y = THREE.MathUtils.lerp(0, POSE.artic, state.artic);
    rig.machine.updateMatrixWorld(true);
    for (let i = 0; i < rig.links.length; i += 1) {
      const link = rig.links[i];
      span(link.group, link.objA, link.objB);
    }

    controls.autoRotate = idle && !reduced;
    controls.update();
    renderer.render(scene, camera);
  }

  document.addEventListener('visibilitychange', () => {
    const visible = document.visibilityState === 'visible';
    if (visible && !running) {
      running = true;
      clock.getDelta();
      frame();
    } else if (!visible) {
      running = false;
    }
  });

  let lostTimer = 0;
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    running = false;
    window.clearTimeout(lostTimer);
    lostTimer = window.setTimeout(() => {
      stage.classList.remove('is-live');
      markFallback(stage);
    }, 900);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    window.clearTimeout(lostTimer);
    stage.classList.add('is-live');
    stage.classList.remove('is-fallback');
    running = true;
    clock.getDelta();
    resize();
    frame();
  });

  frame();
}
