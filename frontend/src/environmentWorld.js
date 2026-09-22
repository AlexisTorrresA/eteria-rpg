import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE = '/assets/environment/quaternius';
const loader = new GLTFLoader();
const cache = new Map();

const MODELS = {
  common: 'CommonTree_2.gltf',
  twisted1: 'TwistedTree_1.gltf',
  twisted3: 'TwistedTree_3.gltf',
  dead: 'DeadTree_2.gltf',
  rock1: 'Rock_Medium_1.gltf',
  rock2: 'Rock_Medium_2.gltf',
  rock3: 'Rock_Medium_3.gltf',
  pebble: 'Pebble_Round_2.gltf',
};

function mulberry32(seed) {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeSurfaceTexture(kind = 'grass') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const palette = kind === 'path'
    ? ['#6f6754', '#81755e', '#5d5848', '#91846a']
    : ['#2e6643', '#376f49', '#285c3e', '#477b50'];

  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, 256, 256);
  const rng = mulberry32(kind === 'path' ? 8812 : 6139);

  for (let i = 0; i < 1500; i++) {
    const r = rng();
    ctx.globalAlpha = kind === 'path' ? .12 + rng() * .16 : .08 + rng() * .12;
    ctx.fillStyle = palette[1 + Math.floor(rng() * (palette.length - 1))];
    const x = rng() * 256, y = rng() * 256;
    const s = kind === 'path' ? 1 + rng() * 4 : .7 + rng() * 3.2;
    ctx.beginPath();
    ctx.ellipse(x, y, s * (1 + rng()), s, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  if (kind === 'path') {
    ctx.globalAlpha = .22;
    ctx.strokeStyle = '#4b4639';
    ctx.lineWidth = 1;
    for (let i = 0; i < 45; i++) {
      const x = rng() * 256, y = rng() * 256;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3 + rng() * 10, y + (rng() - .5) * 5);
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.repeat.set(kind === 'path' ? 3 : 14, kind === 'path' ? 12 : 14);
  return texture;
}

function makeRibbon(points, width = 9) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tangent = next.clone().sub(prev).setY(0).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(width * .5);
    const left = current.clone().add(normal);
    const right = current.clone().sub(normal);
    positions.push(left.x, .025, left.z, right.x, .025, right.z);
    const v = i / Math.max(1, points.length - 1);
    uvs.push(0, v * 8, 1, v * 8);
    if (i < points.length - 1) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function setShadows(root, enabled = true) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = enabled;
    obj.receiveShadow = true;
    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of materials) {
        if ('alphaTest' in mat && mat.map) mat.alphaTest = Math.max(mat.alphaTest || 0, .08);
      }
    }
  });
}

function loadModel(file) {
  const url = `${BASE}/${file}`;
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  return cache.get(url);
}

function cloneFitted(scene, targetHeight, x, z, rotation, shadow = true) {
  const wrapper = new THREE.Group();
  const object = scene.clone(true);
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const scale = size.y > .001 ? targetHeight / size.y : 1;
  object.scale.setScalar(scale);
  object.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(object);
  object.position.y -= fitted.min.y;
  setShadows(object, shadow);
  wrapper.add(object);
  wrapper.position.set(x, 0, z);
  wrapper.rotation.y = rotation;
  return wrapper;
}

function isReserved(x, z) {
  if (Math.abs(x) < 7 && z > -48 && z < 58) return true;
  if (Math.hypot(x + 23, z + 22) < 11) return true;
  if (Math.hypot(x - 30, z + 29) < 10) return true;
  if (Math.hypot(x - 2, z - 8) < 8) return true;
  return false;
}

export class EnvironmentWorld {
  constructor(game) {
    this.game = game;
    this.root = new THREE.Group();
    this.root.name = 'EteriaEnvironmentV7';
    this.fallback = new THREE.Group();
    this.authored = new THREE.Group();
    this.root.add(this.fallback, this.authored);
    this.game.scene.add(this.root);
  }

  build() {
    this.buildTerrain();
    this.buildWater();
    this.buildBackdrop();
    this.buildGroundDetail();
    this.buildFallbackNature();
    this.loadAuthoredNature().catch((error) => {
      console.warn('[eteria] Environment assets fallback:', error);
      this.fallback.visible = true;
    });
  }

  buildTerrain() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(128, 128),
      new THREE.MeshStandardMaterial({
        map: makeSurfaceTexture('grass'),
        color: 0xb7d1b2,
        roughness: .96,
        metalness: 0,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'VerdantGround';
    this.root.add(ground);

    const pathPoints = [
      new THREE.Vector3(-8, 0, 61),
      new THREE.Vector3(-5, 0, 46),
      new THREE.Vector3(-1, 0, 31),
      new THREE.Vector3(2, 0, 15),
      new THREE.Vector3(6, 0, 1),
      new THREE.Vector3(13, 0, -13),
      new THREE.Vector3(23, 0, -24),
      new THREE.Vector3(33, 0, -36),
    ];
    const path = new THREE.Mesh(
      makeRibbon(pathPoints, 9.5),
      new THREE.MeshStandardMaterial({
        map: makeSurfaceTexture('path'),
        color: 0xc4b99b,
        roughness: .98,
        metalness: 0,
      })
    );
    path.receiveShadow = true;
    path.name = 'AetherRoad';
    this.root.add(path);

    const vergeMat = new THREE.MeshStandardMaterial({
      color: 0x3d754c,
      roughness: 1,
      transparent: true,
      opacity: .82,
    });
    for (let i = 0; i < 18; i++) {
      const patch = new THREE.Mesh(new THREE.CircleGeometry(2.5 + (i % 4) * .7, 18), vergeMat);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(-45 + (i * 13) % 92, .01, -46 + (i * 19) % 91);
      patch.scale.x = 1.7;
      this.root.add(patch);
    }
  }

  buildWater() {
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(9.2, 56),
      new THREE.MeshPhysicalMaterial({
        color: 0x247b88,
        roughness: .16,
        metalness: .05,
        transmission: .08,
        transparent: true,
        opacity: .82,
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(-23, .04, -22);
    this.root.add(water);

    const shoreMat = new THREE.MeshStandardMaterial({ color: 0x7d7a63, roughness: .98 });
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      const radius = 9.4 + Math.sin(i * 2.1) * .65;
      const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(.35 + (i % 5) * .07, 0),
        shoreMat
      );
      stone.position.set(-23 + Math.cos(a) * radius, .23, -22 + Math.sin(a) * radius);
      stone.scale.set(1.35, .65 + (i % 3) * .16, .9);
      stone.rotation.set(i * .23, i * .51, i * .17);
      stone.castShadow = i % 2 === 0;
      stone.receiveShadow = true;
      this.root.add(stone);
    }

    this.game.decorAnimations.push((t) => {
      water.material.opacity = .78 + Math.sin(t * 1.1) * .035;
      water.rotation.z = Math.sin(t * .08) * .012;
    });
  }

  buildBackdrop() {
    const hillMatA = new THREE.MeshStandardMaterial({ color: 0x274d3a, roughness: 1 });
    const hillMatB = new THREE.MeshStandardMaterial({ color: 0x315b41, roughness: 1 });
    const rng = mulberry32(94821);

    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2 + rng() * .12;
      const radius = 67 + rng() * 16;
      const h = 8 + rng() * 14;
      const r = 7 + rng() * 8;
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(r, h, 7 + Math.floor(rng() * 3)),
        i % 2 ? hillMatA : hillMatB
      );
      hill.position.set(Math.cos(a) * radius, h * .5 - .8, Math.sin(a) * radius);
      hill.rotation.y = rng() * Math.PI;
      hill.scale.x = .85 + rng() * .75;
      hill.receiveShadow = true;
      this.root.add(hill);
    }

    const mistMat = new THREE.MeshBasicMaterial({
      color: 0x9bc5b4,
      transparent: true,
      opacity: .07,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 7; i++) {
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(32, 5), mistMat);
      mist.position.set(-50 + i * 17, 2.8 + (i % 2), -54 + (i % 3) * 7);
      mist.rotation.y = .1 * i;
      this.root.add(mist);
      this.game.decorAnimations.push((t) => {
        mist.position.x += Math.sin(t * .08 + i) * .0009;
      });
    }
  }

  buildGroundDetail() {
    const rng = mulberry32(314159);
    const bladeGeo = new THREE.ConeGeometry(.045, .42, 3);
    bladeGeo.translate(0, .21, 0);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x5b8f52, roughness: 1 });
    const count = 280;
    const grass = new THREE.InstancedMesh(bladeGeo, bladeMat, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      let x, z;
      do {
        x = (rng() - .5) * 116;
        z = (rng() - .5) * 116;
      } while (isReserved(x, z));
      dummy.position.set(x, .01, z);
      const s = .7 + rng() * 1.2;
      dummy.scale.set(s, s, s);
      dummy.rotation.y = rng() * Math.PI;
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
    }
    grass.instanceMatrix.needsUpdate = true;
    grass.receiveShadow = true;
    this.root.add(grass);

    const flowerColors = [0x93c5fd, 0xf9a8d4, 0xfde68a, 0xc4b5fd];
    for (let i = 0; i < 42; i++) {
      const flower = new THREE.Mesh(
        new THREE.IcosahedronGeometry(.075 + (i % 3) * .015, 0),
        new THREE.MeshStandardMaterial({
          color: flowerColors[i % flowerColors.length],
          emissive: flowerColors[i % flowerColors.length],
          emissiveIntensity: .12,
          roughness: .7,
        })
      );
      let x, z;
      do {
        x = (rng() - .5) * 104;
        z = (rng() - .5) * 104;
      } while (isReserved(x, z));
      flower.position.set(x, .16, z);
      this.root.add(flower);
    }
  }

  buildFallbackNature() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x68432d, roughness: 1 });
    const leafMats = [
      new THREE.MeshStandardMaterial({ color: 0x326f49, roughness: .9 }),
      new THREE.MeshStandardMaterial({ color: 0x477b4d, roughness: .9 }),
    ];
    const rng = mulberry32(77123);

    for (let i = 0; i < 30; i++) {
      let x, z;
      do {
        x = (rng() - .5) * 114;
        z = (rng() - .5) * 114;
      } while (isReserved(x, z));
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.22, .42, 3.2, 7), trunkMat);
      trunk.position.y = 1.6;
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7 + rng() * .5, 1), leafMats[i % 2]);
      crown.position.y = 3.7;
      trunk.castShadow = crown.castShadow = Math.hypot(x, z) < 42;
      g.add(trunk, crown);
      g.position.set(x, 0, z);
      g.scale.setScalar(.85 + rng() * .65);
      this.fallback.add(g);
    }
  }

  async loadAuthoredNature() {
    const entries = await Promise.all(Object.entries(MODELS).map(async ([key, file]) => {
      const gltf = await loadModel(file);
      return [key, gltf.scene];
    }));
    const models = Object.fromEntries(entries);
    const rng = mulberry32(20260922);

    const treeTypes = ['common', 'twisted1', 'twisted3'];
    for (let i = 0; i < 42; i++) {
      let x, z;
      do {
        const ring = i < 24 ? 42 + rng() * 18 : 18 + rng() * 38;
        const a = rng() * Math.PI * 2;
        x = Math.cos(a) * ring + (rng() - .5) * 8;
        z = Math.sin(a) * ring + (rng() - .5) * 8;
      } while (isReserved(x, z) || Math.abs(x) > 61 || Math.abs(z) > 61);
      const type = treeTypes[Math.floor(rng() * treeTypes.length)];
      const height = 4.8 + rng() * 3.4;
      const tree = cloneFitted(models[type], height, x, z, rng() * Math.PI * 2, Math.hypot(x, z) < 42);
      this.authored.add(tree);
    }

    for (let i = 0; i < 7; i++) {
      const a = rng() * Math.PI * 2;
      const r = 31 + rng() * 27;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (isReserved(x, z)) continue;
      this.authored.add(cloneFitted(models.dead, 3.8 + rng() * 2.6, x, z, rng() * Math.PI * 2, false));
    }

    const rocks = ['rock1', 'rock2', 'rock3'];
    for (let i = 0; i < 34; i++) {
      let x, z;
      do {
        x = (rng() - .5) * 118;
        z = (rng() - .5) * 118;
      } while (Math.abs(x) < 4 && z > -50 && z < 55);
      const type = rocks[i % rocks.length];
      const rock = cloneFitted(models[type], .55 + rng() * 1.15, x, z, rng() * Math.PI * 2, Math.hypot(x, z) < 35);
      rock.scale.x = .85 + rng() * .5;
      rock.scale.z = .8 + rng() * .55;
      this.authored.add(rock);
    }

    for (let i = 0; i < 28; i++) {
      const x = -5 + (rng() - .5) * 18;
      const z = -45 + rng() * 100;
      if (Math.hypot(x + 23, z + 22) < 10) continue;
      const pebble = cloneFitted(models.pebble, .15 + rng() * .22, x, z, rng() * Math.PI * 2, false);
      this.authored.add(pebble);
    }

    this.fallback.visible = false;
    console.info('[eteria] Eteria 7 environment assets loaded.');
  }
}
