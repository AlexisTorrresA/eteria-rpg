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
    tint: 0x795c91, tintMix: .12, rotation: Math.PI * .86,
  },
  eldren: {
    label: 'Eldren', outfit: 'male_peasant', head: 'male_head', hair: 'hair_buzzed',
    tint: 0x776751, tintMix: .1, rotation: Math.PI * .18,
  },
};

const ASSET_URL = (name) => `${BASE}/characters/${name}.glb`;
const IDLE_ANIMATION_URL = `${BASE}/animations/genesara_idle.glb`;
const LOCOMOTION_ANIMATION_URL = `${BASE}/animations/UAL1_Standard.glb`;
const COMBAT_ANIMATION_URL = `${BASE}/animations/UAL2_Standard.glb`;

const semanticPatterns = {
  idle: [/^idle_loop$/i, /idle.*loop/i, /idle/i],
  walk: [/^walk_loop$/i, /walk.*loop/i, /walk/i],
  run: [/^jog_fwd_loop$/i, /^sprint_loop$/i, /jog.*fwd.*loop/i, /sprint.*loop/i, /jog/i, /run/i],
  attack1: [/^sword_regular_a$/i, /^sword_attack$/i, /sword.*regular.*a$/i, /sword.*attack/i, /attack.*1/i],
  attack2: [/^sword_regular_b$/i, /sword.*regular.*b$/i, /attack.*2/i, /strike/i],
  attack3: [/^sword_regular_c$/i, /sword.*regular.*c$/i, /attack.*3/i, /stab/i],
  heavy: [/^sword_heavy_combo$/i, /^sword_regular_combo$/i, /sword.*heavy.*combo/i, /combo.*full/i, /heavy/i],
  dash: [/^roll$/i, /^sword_dash$/i, /roll/i, /dodge/i, /dash/i],
}

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

function fitLayerSet(roots, targetHeight = 2.52) {
  const reference = roots[0];
  reference.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(reference);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = size.y > .001 ? targetHeight / size.y : 1;

  for (const root of roots) {
    root.scale.multiplyScalar(scale);
    root.updateMatrixWorld(true);
  }

  box = new THREE.Box3().setFromObject(reference);
  const floorOffset = -box.min.y;
  for (const root of roots) {
    root.position.y += floorOffset;
    root.updateMatrixWorld(true);
  }
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
  return null;
}

class SyncedAnimationDriver {
  constructor(roots, libraries = {}) {
    this.roots = roots;
    this.idleClips = libraries.idle || [];
    this.locomotionClips = libraries.locomotion || [];
    this.combatClips = libraries.combat || [];
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
      const used = attack ? usedAttacks : new Set();
      const pools = semantic === 'idle'
        ? [this.idleClips, this.locomotionClips, this.combatClips]
        : attack
          ? [this.combatClips, this.locomotionClips, this.idleClips]
          : [this.locomotionClips, this.idleClips, this.combatClips];
      let clip = null;
      for (const pool of pools) {
        clip = selectClip(pool, semantic, used);
        if (clip) break;
      }
      if (!clip) {
        console.warn(`[eteria] Missing Quaternius animation: ${semantic}`);
        continue;
      }
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

  has(name) {
    return this.actions.has(name);
  }

  forceLoop(name, speed = 1) {
    const next = this.actions.get(name);
    if (!next?.length) return false;
    for (const semantic of ['idle', 'walk', 'run']) {
      if (semantic === name) continue;
      this.actions.get(semantic)?.forEach((action) => action.stop());
    }
    next.forEach((action) => {
      action.reset().setEffectiveWeight(1).setEffectiveTimeScale(speed).play();
    });
    this.current = name;
    return true;
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


class ProceduralLocomotionFallback {
  constructor(roots, visualRoot) {
    this.visualRoot = visualRoot;
    this.phase = 0;
    this.baseReady = false;
    this.rigs = roots.map((root) => {
      const nodes = {};
      for (const name of [
        'pelvis', 'spine_01',
        'upperarm_l', 'upperarm_r',
        'thigh_l', 'thigh_r',
        'calf_l', 'calf_r',
        'foot_l', 'foot_r',
      ]) nodes[name] = findNode(root, [name]);
      return { nodes, base: {} };
    });
  }

  captureCurrentBase() {
    for (const rig of this.rigs) {
      rig.base = {};
      for (const [name, node] of Object.entries(rig.nodes)) {
        if (node) rig.base[name] = node.quaternion.clone();
      }
    }
    this.baseReady = true;
  }

  captureLegState() {
    const rig = this.rigs[0];
    if (!rig) return null;
    const left = rig.nodes.thigh_l?.quaternion?.clone();
    const right = rig.nodes.thigh_r?.quaternion?.clone();
    return left && right ? { left, right } : null;
  }

  legDeltaFrom(state) {
    const rig = this.rigs[0];
    if (!state || !rig?.nodes.thigh_l || !rig?.nodes.thigh_r) return 0;
    return Math.max(
      state.left.angleTo(rig.nodes.thigh_l.quaternion),
      state.right.angleTo(rig.nodes.thigh_r.quaternion),
    );
  }

  targetQuaternion(base, x = 0, y = 0, z = 0) {
    const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
    return base.clone().multiply(delta);
  }

  apply(rig, name, x, y, z, alpha) {
    const node = rig.nodes[name];
    const base = rig.base[name];
    if (!node || !base) return;
    node.quaternion.slerp(this.targetQuaternion(base, x, y, z), alpha);
  }

  update(dt, moving, strength = 1, dashing = false) {
    if (!this.baseReady) this.captureCurrentBase();
    const alpha = 1 - Math.exp(-18 * dt);

    if (!moving) {
      this.reset(dt);
      return;
    }

    const intensity = THREE.MathUtils.clamp(strength, .25, 1);
    const cadence = dashing ? 10.8 : THREE.MathUtils.lerp(5.4, 8.2, intensity);
    this.phase += dt * cadence;

    const swing = Math.sin(this.phase);
    const opposite = -swing;
    const stride = (dashing ? .72 : .52) * THREE.MathUtils.lerp(.65, 1, intensity);
    const armSwing = (dashing ? .32 : .22) * THREE.MathUtils.lerp(.6, 1, intensity);
    const kneeL = Math.max(0, -swing) * (dashing ? .78 : .58);
    const kneeR = Math.max(0, swing) * (dashing ? .78 : .58);

    for (const rig of this.rigs) {
      this.apply(rig, 'thigh_l', swing * stride, 0, 0, alpha);
      this.apply(rig, 'thigh_r', opposite * stride, 0, 0, alpha);
      this.apply(rig, 'calf_l', -kneeL, 0, 0, alpha);
      this.apply(rig, 'calf_r', -kneeR, 0, 0, alpha);
      this.apply(rig, 'foot_l', kneeL * .34, 0, 0, alpha);
      this.apply(rig, 'foot_r', kneeR * .34, 0, 0, alpha);
      this.apply(rig, 'upperarm_l', 0, -swing * armSwing, 0, alpha);
      this.apply(rig, 'upperarm_r', 0, swing * armSwing, 0, alpha);
      this.apply(rig, 'spine_01', dashing ? .055 : .025, -swing * .045, 0, alpha);
    }

    const bob = Math.abs(Math.sin(this.phase * 2)) * (dashing ? .045 : .028);
    this.visualRoot.position.y = THREE.MathUtils.damp(this.visualRoot.position.y, bob, 14, dt);
  }

  reset(dt) {
    if (!this.baseReady) return;
    const alpha = 1 - Math.exp(-12 * dt);
    for (const rig of this.rigs) {
      for (const [name, node] of Object.entries(rig.nodes)) {
        const base = rig.base[name];
        if (node && base) node.quaternion.slerp(base, alpha);
      }
    }
    this.visualRoot.position.y = THREE.MathUtils.damp(this.visualRoot.position.y, 0, 14, dt);
  }
}

async function buildCharacterLayers(config, targetHeight = 2.52) {
  const names = [config.outfit, config.head, config.hair].filter(Boolean);
  const gltfs = await Promise.all(names.map((name) => loadGltf(ASSET_URL(name))));
  const roots = gltfs.map((gltf) => cloneSkeleton(gltf.scene));

  // All modular parts share the same Quaternius rig coordinates. Scale the full
  // outfit once, then apply the exact same transform to the head and hair.
  prepareMaterials(roots[0], config);
  for (let i = 1; i < roots.length; i++) {
    prepareMaterials(roots[i], { roughness: .72, metalness: 0 });
  }
  fitLayerSet(roots, targetHeight);
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
    this.gaitFallback = null;
    this.proceduralLocomotion = false;
    this.motionProbeTime = 0;
    this.motionProbeState = null;
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
    const [layers, idleGltf, locomotionGltf, combatGltf] = await Promise.all([
      buildCharacterLayers(preset, 2.52),
      loadGltf(IDLE_ANIMATION_URL),
      loadGltf(LOCOMOTION_ANIMATION_URL),
      loadGltf(COMBAT_ANIMATION_URL),
    ]);
    if (token !== this.swapToken) return;

    this.driver?.dispose();
    this.layers.forEach((layer) => layer.removeFromParent());
    this.layers = layers;
    layers.forEach((layer) => this.root.add(layer));
    this.driver = new SyncedAnimationDriver(layers, {
      idle: idleGltf.animations || [],
      locomotion: locomotionGltf.animations || [],
      combat: combatGltf.animations || [],
    });
    this.driver.loop('idle', 0, 1);
    // Apply frame zero immediately so the model never flashes or remains in bind/T-pose.
    this.driver.update(0);
    this.gaitFallback = new ProceduralLocomotionFallback(layers, this.root);
    this.gaitFallback.captureCurrentBase();
    this.proceduralLocomotion = false;
    this.motionProbeTime = 0;
    this.motionProbeState = null;
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

  enableProceduralLocomotion(reason = 'binding') {
    if (this.proceduralLocomotion || !this.driver || !this.gaitFallback) return;
    this.proceduralLocomotion = true;
    this.driver.forceLoop('idle', 1);
    this.driver.update(0);
    this.gaitFallback.captureCurrentBase();
    this.motionProbeTime = 0;
    this.motionProbeState = null;
    console.warn(`[eteria] Quaternius procedural gait enabled (${reason}).`);
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
      scale = loop === 'run'
        ? THREE.MathUtils.lerp(.9, 1.14, strength)
        : THREE.MathUtils.lerp(.72, 1.05, strength);
    }

    if (!this.driver.oneShot) {
      if (this.proceduralLocomotion) {
        if (this.driver.current !== 'idle') this.driver.forceLoop('idle', 1);
      } else {
        this.driver.loop(loop, loop === 'idle' ? .22 : .15, scale);
      }
    }

    this.driver.update(dt);

    if (this.driver.oneShot) {
      this.motionProbeTime = 0;
      this.motionProbeState = null;
      return;
    }

    if (!moving) {
      this.motionProbeTime = 0;
      this.motionProbeState = null;
      if (this.proceduralLocomotion) this.gaitFallback?.reset(dt);
      return;
    }

    if (!this.proceduralLocomotion) {
      if (!this.driver.has(loop)) {
        this.enableProceduralLocomotion(`missing-${loop}`);
      } else if (!this.motionProbeState) {
        this.motionProbeState = this.gaitFallback?.captureLegState() || null;
        this.motionProbeTime = 0;
      } else {
        this.motionProbeTime += dt;
        if (this.motionProbeTime >= .34) {
          const delta = this.gaitFallback?.legDeltaFrom(this.motionProbeState) || 0;
          if (delta < .025) this.enableProceduralLocomotion(`inactive-${loop}`);
          else {
            this.motionProbeTime = 0;
            this.motionProbeState = null;
          }
        }
      }
    }

    if (this.proceduralLocomotion) {
      this.gaitFallback?.update(dt, true, strength, dashing);
    }
  }

  dispose() {
    this.driver?.dispose();
    if (this.root) this.root.position.y = 0;
    this.gaitFallback = null;
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
    this.anchor = null;
    this.fallbackChildren = [];
    this.ready = false;
  }

  async load() {
    const npc = this.game.rpg?.npcs?.find((candidate) => candidate.id === this.id);
    if (!npc?.root) throw new Error(`Interactive NPC anchor not found: ${this.id}`);

    const [layers, idleGltf] = await Promise.all([
      buildCharacterLayers(this.config, 2.42),
      loadGltf(IDLE_ANIMATION_URL),
    ]);

    this.anchor = npc.root;
    this.fallbackChildren = [...npc.root.children];
    this.fallbackChildren.forEach((child) => { child.visible = false; });

    layers.forEach((layer) => this.root.add(layer));
    this.root.position.set(0, 0, 0);
    this.root.rotation.y = this.config.rotation || 0;
    addNameplate(this.root, this.config.label);
    npc.root.add(this.root);

    this.driver = new SyncedAnimationDriver(layers, {
      idle: idleGltf.animations || [],
      locomotion: [],
      combat: [],
    });
    this.driver.loop('idle', 0, .88);
    this.driver.update(0);
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
    this.fallbackChildren.forEach((child) => { child.visible = true; });
    this.fallbackChildren = [];
    this.anchor = null;
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
