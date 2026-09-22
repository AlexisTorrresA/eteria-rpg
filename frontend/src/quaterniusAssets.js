import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { createWeaponModel } from './models.js';

const BASE = '/assets/quaternius/runtime';
const loader = new GLTFLoader();
const cache = new Map();
THREE.Cache.enabled = true;

const HERO_PRESETS = {
  guardian: {
    label: 'Guardián', outfit: 'male_ranger', head: 'male_head', hair: 'hair_buzzed',
    tint: 0x73809a, tintMix: .2, metalness: .2, roughness: .62,
  },
  explorer: {
    label: 'Explorador', outfit: 'male_ranger', head: 'male_head', hair: 'hair_simpleparted',
    tint: 0x516b4d, tintMix: .13, metalness: .06, roughness: .82,
  },
  aether: {
    label: 'Espadachín del Éter', outfit: 'male_ranger', head: 'male_head', hair: 'hair_simpleparted',
    tint: 0x53648f, tintMix: .17, metalness: .14, roughness: .68,
  },
};

const NPC_PRESETS = {
  liora: {
    label: 'Liora', outfit: 'female_ranger', head: 'female_head', hair: 'hair_long',
    tint: 0x795c91, tintMix: .12, position: [-4.2, 0, 6.1], rotation: .5,
  },
  eldren: {
    label: 'Eldren', outfit: 'male_peasant', head: 'male_head', hair: 'hair_buzzed',
    tint: 0x776751, tintMix: .1, position: [5.1, 0, 4.4], rotation: -.65,
  },
};

const ASSET_URL = (name) => `${BASE}/characters/${name}.glb`;
const ANIMATION_URL = `${BASE}/animations/UAL2_Standard.glb`;

const semanticPatterns = {
  idle: [/idle.*loop/i, /idle/i, /standing/i],
  walk: [/walk.*forward/i, /walk/i],
  run: [/jog.*forward/i, /run.*forward/i, /sprint/i, /jog/i, /run/i],
  attack1: [/sword.*combo.*1/i, /sword.*attack.*1/i, /melee.*combo.*1/i, /attack.*1/i, /slash/i, /attack/i],
  attack2: [/sword.*combo.*2/i, /sword.*attack.*2/i, /melee.*combo.*2/i, /attack.*2/i, /strike/i, /attack/i],
  attack3: [/sword.*combo.*3/i, /sword.*attack.*3/i, /melee.*combo.*3/i, /attack.*3/i, /stab/i, /attack/i],
  heavy: [/heavy/i, /combo.*full/i, /combo.*3/i, /power.*attack/i, /attack/i],
  dash: [/dodge.*forward/i, /dodge/i, /roll.*forward/i, /roll/i, /dash/i, /parkour/i, /run/i],
};

function normalized(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function loadGltf(url) {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  return cache.get(url);
}

function findNode(root, names) {
  const wanted = names.map(normalized);
  let found = null;
  root.traverse((node) => {
    if (found) return;
    const n = normalized(node.name);
    if (wanted.some((name) => n === name || n.endsWith(name) || n.includes(name))) found = node;
  });
  return found;
}

function fitHeight(root, targetHeight = 2.52) {
  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y > .001) root.scale.multiplyScalar(targetHeight / size.y);
  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(root);
  root.position.y -= box.min.y;
  root.updateMatrixWorld(true);
}

function prepareMaterials(root, preset = {}) {
  root.traverse((obj) => {
    if (!obj.isMesh && !obj.isSkinnedMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const source = Array.isArray(obj.material) ? obj.material : [obj.material];
    const materials = source.map((material) => {
      const m = material.clone();
      if (m.color && preset.tint) m.color.lerp(new THREE.Color(preset.tint), preset.tintMix ?? .12);
      if ('roughness' in m) m.roughness = preset.roughness ?? Math.max(.58, m.roughness ?? .72);
      if ('metalness' in m) m.metalness = preset.metalness ?? Math.min(.12, m.metalness ?? .06);
      if ('envMapIntensity' in m) m.envMapIntensity = .86;
      m.needsUpdate = true;
      return m;
    });
    obj.material = Array.isArray(obj.material) ? materials : materials[0];
  });
}

function selectClip(clips, semantic, used = new Set()) {
  for (const pattern of semanticPatterns[semantic] || []) {
    const clip = clips.find((candidate) => !used.has(candidate.name) && pattern.test(candidate.name || ''));
    if (clip) return clip;
  }
  return clips.find((candidate) => !used.has(candidate.name)) || null;
}

class SyncedAnimationDriver {
  constructor(roots, clips) {
    this.roots = roots;
    this.clips = clips;
    this.mixers = roots.map((root) => new THREE.AnimationMixer(root));
    this.actions = new Map();
    this.current = null;
    this.oneShot = null;
    this.buildActions();
  }

  buildActions() {
    const usedAttacks = new Set();
    for (const semantic of ['idle', 'walk', 'run', 'attack1', 'attack2', 'attack3', 'heavy', 'dash']) {
      const attack = semantic.startsWith('attack') || semantic === 'heavy';
      const clip = selectClip(this.clips, semantic, attack ? usedAttacks : new Set());
      if (!clip) continue;
      if (attack) usedAttacks.add(clip.name);
      const actions = this.mixers.map((mixer) => {
        const action = mixer.clipAction(clip);
        action.enabled = true;
        if (attack || semantic === 'dash') {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        return action;
      });
      this.actions.set(semantic, actions);
    }
  }

  loop(name, fade = .16, speed = 1) {
    if (this.oneShot) return;
    const next = this.actions.get(name) || this.actions.get('idle');
    if (!next?.length) return;
    if (this.current === name) {
      next.forEach((action) => action.setEffectiveTimeScale(speed));
      return;
    }
    const previous = this.actions.get(this.current);
    next.forEach((action, i) => {
      action.reset().setEffectiveWeight(1).setEffectiveTimeScale(speed).play();
      previous?.[i]?.crossFadeTo(action, fade, false);
    });
    this.current = name;
  }

  shot(name, speed = 1, fade = .07) {
    const shots = this.actions.get(name) || this.actions.get('attack1');
    if (!shots?.length) return;
    if (this.oneShot) this.oneShot.forEach((action) => action.stop());
    const loops = this.actions.get(this.current) || this.actions.get('idle');
    shots.forEach((action, i) => {
      action.reset().setLoop(THREE.LoopOnce, 1).setEffectiveWeight(1).setEffectiveTimeScale(speed);
      action.clampWhenFinished = true;
      loops?.[i]?.crossFadeTo(action, fade, false);
      action.play();
    });
    this.oneShot = shots;
    const firstMixer = this.mixers[0];
    const firstAction = shots[0];
    const done = (event) => {
      if (event.action !== firstAction) return;
      firstMixer.removeEventListener('finished', done);
      this.oneShot = null;
      const back = this.actions.get(this.current) || this.actions.get('idle');
      back?.forEach((action, i) => {
        action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
        shots[i]?.crossFadeTo(action, .12, false);
      });
    };
    firstMixer.addEventListener('finished', done);
  }

  update(dt) {
    this.mixers.forEach((mixer) => mixer.update(dt));
  }

  dispose() {
    this.mixers.forEach((mixer) => mixer.stopAllAction());
  }
}

async function buildCharacterLayers(config, targetHeight = 2.52) {
  const names = [config.outfit, config.head, config.hair].filter(Boolean);
  const gltfs = await Promise.all(names.map((name) => loadGltf(ASSET_URL(name))));
  const roots = gltfs.map((gltf) => cloneSkeleton(gltf.scene));
  for (const root of roots) {
    prepareMaterials(root, config);
    fitHeight(root, targetHeight);
  }
  return roots;
}

function addNameplate(parent, text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(9, 15, 28, .72)';
  ctx.roundRect(20, 8, 216, 48, 20);
  ctx.fill();
  ctx.font = '600 28px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#eef7ff';
  ctx.fillText(text, 128, 33);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(2.25, .56, 1);
  sprite.position.set(0, 2.95, 0);
  parent.add(sprite);
}

function presetForEquipment(equipment = {}) {
  if (equipment.chest === 'guardian-plate') return 'guardian';
  if (equipment.head === 'moon-hood') return 'explorer';
  return 'aether';
}

function weaponTransform(id) {
  const base = { scale: .52, pos: [0, .02, -.02], rot: [Math.PI / 2, 0, 0] };
  return {
    'aether-blade': base,
    'ember-axe': { scale: .48, pos: [0, .01, -.03], rot: [Math.PI / 2, 0, 0] },
    'moon-spear': { scale: .44, pos: [0, -.02, -.02], rot: [Math.PI / 2, 0, 0] },
    'rift-daggers': { scale: .46, pos: [0, .015, -.02], rot: [Math.PI / 2, 0, 0] },
    'sun-hammer': { scale: .46, pos: [0, 0, -.03], rot: [Math.PI / 2, 0, 0] },
    'eclipse-glaive': { scale: .43, pos: [0, -.02, -.03], rot: [Math.PI / 2, 0, 0] },
  }[id] || base;
}

export class QuaterniusHeroController {
  constructor(game) {
    this.game = game;
    this.ready = false;
    this.root = new THREE.Group();
    this.root.name = 'EteriaQuaterniusHero';
    this.root.rotation.y = Math.PI;
    this.layers = [];
    this.driver = null;
    this.weapon = null;
    this.weaponObjects = [];
    this.rightHand = null;
    this.leftHand = null;
    this.presetId = null;
    this.swapToken = 0;
  }

  async load(weapon, equipment = {}) {
    this.weapon = weapon;
    this.game.player.add(this.root);
    await this.switchPreset(presetForEquipment(equipment), true);
    if (this.game.proceduralHeroVisual) this.game.proceduralHeroVisual.visible = false;
    this.ready = true;
    return this;
  }

  async switchPreset(presetId, initial = false) {
    if (!initial && presetId === this.presetId) return;
    const token = ++this.swapToken;
    const preset = HERO_PRESETS[presetId] || HERO_PRESETS.aether;
    const [layers, animGltf] = await Promise.all([
      buildCharacterLayers(preset, 2.52),
      loadGltf(ANIMATION_URL),
    ]);
    if (token !== this.swapToken) return;

    this.driver?.dispose();
    this.layers.forEach((layer) => layer.removeFromParent());
    this.layers = layers;
    layers.forEach((layer) => this.root.add(layer));
    this.driver = new SyncedAnimationDriver(layers, animGltf.animations || []);
    this.driver.loop('idle', 0, 1);
    this.presetId = presetId;
    this.rightHand = findNode(layers[0], ['hand_r', 'righthand']);
    this.leftHand = findNode(layers[0], ['hand_l', 'lefthand']);
    if (this.weapon) this.setWeapon(this.weapon);
  }

  clearWeapons() {
    this.weaponObjects.forEach((object) => object.removeFromParent());
    this.weaponObjects = [];
  }

  setWeapon(weapon) {
    if (!weapon || !this.layers.length) return;
    this.weapon = weapon;
    this.clearWeapons();
    const t = weaponTransform(weapon.id);
    const mount = (hand, mirror = false) => {
      if (!hand) return;
      const model = createWeaponModel(weapon);
      model.scale.setScalar(t.scale);
      model.position.set(...t.pos);
      model.rotation.set(...t.rot);
      if (mirror) model.rotation.z += Math.PI;
      hand.add(model);
      this.weaponObjects.push(model);
    };
    mount(this.rightHand || this.layers[0]);
    if (weapon.id === 'rift-daggers') mount(this.leftHand, true);
  }

  async applyEquipmentVisual(equipment = {}) {
    await this.switchPreset(presetForEquipment(equipment));
  }

  playAttack(step = 0) {
    const names = ['attack1', 'attack2', 'attack3', 'heavy'];
    const speed = this.weapon?.id === 'rift-daggers' ? 1.22 : ['ember-axe', 'sun-hammer'].includes(this.weapon?.id) ? .86 : 1.04;
    this.driver?.shot(names[Math.min(3, Math.max(0, step))], speed);
  }

  playSpecial(weaponId) {
    const speed = ['ember-axe', 'sun-hammer'].includes(weaponId) ? .8 : weaponId === 'rift-daggers' ? 1.2 : .96;
    this.driver?.shot('heavy', speed, .055);
  }

  playDash() {
    this.driver?.shot('dash', 1.12, .05);
  }

  update(dt, moving, dashing = false, motion = {}) {
    if (!this.ready || !this.driver) return;
    const strength = motion.locomotionBlend ?? motion.inputStrength ?? (moving ? 1 : 0);
    let loop = 'idle';
    let scale = 1;
    if (dashing) {
      loop = 'run';
      scale = 1.25;
    } else if (moving) {
      loop = strength > .48 ? 'run' : 'walk';
      scale = loop === 'run' ? THREE.MathUtils.lerp(.9, 1.14, strength) : THREE.MathUtils.lerp(.72, 1.05, strength);
    }
    if (!this.driver.oneShot) this.driver.loop(loop, loop === 'idle' ? .22 : .15, scale);
    this.driver.update(dt);
  }

  dispose() {
    this.driver?.dispose();
    this.root.removeFromParent();
    this.ready = false;
  }
}

class QuaterniusNPCController {
  constructor(game, id, config) {
    this.game = game;
    this.id = id;
    this.config = config;
    this.root = new THREE.Group();
    this.root.name = `EteriaNPC_${id}`;
    this.driver = null;
    this.ready = false;
  }

  async load() {
    const [layers, animGltf] = await Promise.all([
      buildCharacterLayers(this.config, 2.42),
      loadGltf(ANIMATION_URL),
    ]);
    layers.forEach((layer) => this.root.add(layer));
    this.root.position.set(...this.config.position);
    this.root.rotation.y = this.config.rotation || 0;
    addNameplate(this.root, this.config.label);
    this.game.scene.add(this.root);
    this.driver = new SyncedAnimationDriver(layers, animGltf.animations || []);
    this.driver.loop('idle', 0, .88);
    this.ready = true;
    return this;
  }

  update(dt) {
    if (!this.ready) return;
    this.driver?.update(dt);
  }

  dispose() {
    this.driver?.dispose();
    this.root.removeFromParent();
  }
}

export async function attachQuaterniusHero(game, weapon) {
  const controller = new QuaterniusHeroController(game);
  try {
    await controller.load(weapon, game.state.equipment || {});
    return controller;
  } catch (error) {
    console.warn('[eteria] Quaternius hero fallback:', error);
    controller.dispose();
    return null;
  }
}

export async function attachQuaterniusNPC(game, id) {
  const config = NPC_PRESETS[id];
  if (!config) return null;
  const controller = new QuaterniusNPCController(game, id, config);
  try {
    return await controller.load();
  } catch (error) {
    console.warn('[eteria] Quaternius NPC fallback:', id, error);
    controller.dispose();
    return null;
  }
}
