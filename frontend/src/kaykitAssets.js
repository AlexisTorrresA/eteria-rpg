import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { createWeaponModel } from './models.js';

const BASE = '/assets/kaykit/runtime';
const loader = new GLTFLoader();
const cache = new Map();
THREE.Cache.enabled = true;

const HERO_VARIANTS = {
  rogue: `${BASE}/characters/Rogue.glb`,
  hooded: `${BASE}/characters/Rogue_Hooded.glb`,
  knight: `${BASE}/characters/Knight.glb`,
};

const WEAPON_ASSETS = {
  'aether-blade': `${BASE}/weapons/sword_1handed.gltf`,
  'ember-axe': `${BASE}/weapons/axe_2handed.gltf`,
  'moon-spear': `${BASE}/weapons/staff.gltf`,
  'rift-daggers': `${BASE}/weapons/dagger.gltf`,
  'eclipse-glaive': `${BASE}/weapons/sword_2handed.gltf`,
};

const ENEMY_ASSETS = {
  shade: { url: `${BASE}/enemies/Skeleton_Rogue.glb`, weapon: 'rift-daggers', height: 2.0, tint: 0x65507f },
  marauder: { url: `${BASE}/enemies/Skeleton_Rogue.glb`, weapon: 'ember-axe', height: 2.18, tint: 0x9a6c58 },
  guardian: { url: `${BASE}/enemies/Skeleton_Warrior.glb`, weapon: 'eclipse-glaive', height: 2.42, tint: 0x71819c },
  ashArcher: { url: `${BASE}/enemies/Skeleton_Rogue.glb`, weaponUrl: `${BASE}/weapons/crossbow_2handed.gltf`, height: 2.12, tint: 0xb45b3c },
};

const semanticPatterns = {
  idle: [/^idle/i, /idle/i, /standing/i],
  walk: [/walk/i],
  run: [/run/i, /sprint/i],
  attack1: [/1h.*attack/i, /attack.*(slice|slash|horizontal|1|a)/i, /melee.*attack/i, /attack/i],
  attack2: [/attack.*(diagonal|vertical|2|b)/i, /2h.*attack/i, /melee.*attack/i, /attack/i],
  heavy: [/heavy/i, /2h.*attack/i, /attack.*(strong|power)/i, /attack/i],
  dash: [/roll/i, /dodge/i, /dash/i, /jump/i, /run/i],
};

function normalizedName(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function loadGltf(url) {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  return cache.get(url);
}

function findClip(clips, semantic, exclude = new Set()) {
  const patterns = semanticPatterns[semantic] || [];
  for (const pattern of patterns) {
    const found = clips.find((clip) => !exclude.has(clip.name) && pattern.test(clip.name));
    if (found) return found;
  }
  return clips.find((clip) => !exclude.has(clip.name)) || null;
}

function findNode(root, side, kind = 'hand') {
  const nodes = [];
  root.traverse((node) => nodes.push(node));

  // KayKit provides explicit handslot.l / handslot.r attachment nodes.
  const preferred = side === 'right'
    ? ['handslotr','righthandslot','weaponslotr']
    : ['handslotl','lefthandslot','weaponslotl'];
  for (const node of nodes) {
    const n = normalizedName(node.name);
    if (preferred.some((part) => n === part || n.includes(part))) return node;
  }

  const exact = side === 'right'
    ? ['handr','righthand','rhand','wristr','righthandbone']
    : ['handl','lefthand','lhand','wristl','lefthandbone'];
  for (const node of nodes) {
    const n = normalizedName(node.name);
    if (exact.some((part) => n === normalizedName(part) || n.includes(normalizedName(part)))) return node;
  }

  const sideTokens = side === 'right' ? ['right','r'] : ['left','l'];
  return nodes.find((node) => {
    const n = normalizedName(node.name);
    if (!n.includes(kind)) return false;
    return sideTokens.some((token) => n.includes(token));
  }) || null;
}

function findHead(root) {
  let result = null;
  root.traverse((node) => {
    if (result) return;
    const n = normalizedName(node.name);
    if (n === 'head' || n.endsWith('head') || n.includes('headbone')) result = node;
  });
  return result;
}

function prepareMaterials(root, tint = null) {
  const materials = [];
  root.traverse((obj) => {
    if (!obj.isMesh && !obj.isSkinnedMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const source = Array.isArray(obj.material) ? obj.material : [obj.material];
    const cloned = source.map((material) => {
      const m = material.clone();
      if ('envMapIntensity' in m) m.envMapIntensity = 1.05;
      if ('roughness' in m) m.roughness = Math.min(.88, Math.max(.38, m.roughness ?? .65));
      if (tint && m.color) {
        const tintColor = new THREE.Color(tint);
        m.color.lerp(tintColor, .18);
      }
      m.needsUpdate = true;
      materials.push(m);
      return m;
    });
    obj.material = Array.isArray(obj.material) ? cloned : cloned[0];
  });
  return materials;
}

function fitHeight(root, targetHeight) {
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

function variantForEquipment(equipment = {}) {
  if (equipment.chest === 'guardian-plate') return 'knight';
  if (equipment.head === 'moon-hood') return 'hooded';
  return 'rogue';
}

function weaponTransform(id) {
  return {
    'aether-blade': { scale: 1, rot: [0, 0, 0] },
    'ember-axe': { scale: .94, rot: [0, 0, 0] },
    'moon-spear': { scale: 1.08, rot: [0, 0, 0] },
    'rift-daggers': { scale: .95, rot: [0, 0, 0] },
    'eclipse-glaive': { scale: 1.02, rot: [0, 0, 0] },
  }[id] || { scale: .64, rot: [0, 0, -.1] };
}

async function cloneWeaponAsset(url) {
  const gltf = await loadGltf(url);
  const root = gltf.scene.clone(true);
  prepareMaterials(root);
  return root;
}

function addEteriaRune(root, color) {
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.55,
    metalness: .22,
    roughness: .26,
  });
  const rune = new THREE.Mesh(new THREE.OctahedronGeometry(.035, 0), material);
  rune.name = 'EteriaWeaponRune';
  rune.position.set(0, .12, -.035);
  rune.castShadow = true;
  root.add(rune);
}

class AnimationDriver {
  constructor(root, clips) {
    this.root = root;
    this.clips = clips;
    this.mixer = new THREE.AnimationMixer(root);
    this.actions = new Map();
    this.current = null;
    this.oneShot = null;

    const used = new Set();
    for (const semantic of ['idle','walk','run','attack1','attack2','heavy','dash']) {
      const clip = findClip(clips, semantic, semantic.startsWith('attack') ? used : new Set());
      if (!clip) continue;
      if (semantic.startsWith('attack')) used.add(clip.name);
      const action = this.mixer.clipAction(clip);
      if (['attack1','attack2','heavy','dash'].includes(semantic)) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(semantic, action);
    }
  }

  loop(name, fade = .16) {
    if (this.oneShot) return;
    const next = this.actions.get(name) || this.actions.get('idle');
    if (!next || this.current === name) return;
    const previous = this.actions.get(this.current);
    next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
    if (previous && previous !== next) previous.crossFadeTo(next, fade, false);
    this.current = name;
  }

  shot(name, speed = 1) {
    const action = this.actions.get(name) || this.actions.get('attack1');
    if (!action) return;
    if (this.oneShot && this.oneShot !== action) this.oneShot.stop();

    const loopAction = this.actions.get(this.current) || this.actions.get('idle');
    action.reset().setLoop(THREE.LoopOnce, 1).setEffectiveTimeScale(speed).setEffectiveWeight(1);
    action.clampWhenFinished = true;
    if (loopAction && loopAction !== action) loopAction.crossFadeTo(action, .07, false);
    action.play();
    this.oneShot = action;

    const done = (event) => {
      if (event.action !== action) return;
      this.mixer.removeEventListener('finished', done);
      this.oneShot = null;
      const back = this.actions.get(this.current) || this.actions.get('idle');
      if (back) {
        back.reset().setEffectiveWeight(1).play();
        action.crossFadeTo(back, .11, false);
      }
    };
    this.mixer.addEventListener('finished', done);
  }

  update(dt) {
    this.mixer.update(dt);
  }
}

export class KayKitHeroController {
  constructor(game) {
    this.game = game;
    this.ready = false;
    this.variant = null;
    this.model = null;
    this.driver = null;
    this.weapon = null;
    this.weaponObjects = [];
    this.variantToken = 0;
    this.weaponToken = 0;
    this.equipment = {};
    this.rightHand = null;
    this.leftHand = null;
    this.headBone = null;
  }

  async load(weapon, equipment = {}) {
    this.weapon = weapon;
    this.equipment = equipment || {};
    await this.switchVariant(variantForEquipment(this.equipment));
    this.ready = true;
    if (this.game.proceduralHeroVisual) this.game.proceduralHeroVisual.visible = false;
    return this;
  }

  async switchVariant(variant) {
    if (this.variant === variant && this.model) return;
    const token = ++this.variantToken;
    const gltf = await loadGltf(HERO_VARIANTS[variant] || HERO_VARIANTS.rogue);
    if (token !== this.variantToken) return;

    const model = cloneSkeleton(gltf.scene);
    model.name = `KayKitHero_${variant}`;
    model.traverse((node) => {
      const n = normalizedName(node.name);
      if (n.includes('offhand') && !node.isBone) node.visible = false;
    });
    prepareMaterials(model);
    fitHeight(model, 2.48);
    model.rotation.y = Math.PI;

    const previous = this.model;
    this.model = model;
    this.variant = variant;
    this.rightHand = findNode(model, 'right');
    this.leftHand = findNode(model, 'left');
    this.headBone = findHead(model);
    this.driver = new AnimationDriver(model, gltf.animations || []);
    this.driver.loop('idle', 0);

    this.game.player.add(model);
    previous?.removeFromParent();
    this.addEquipmentAccent();
    if (this.weapon) await this.setWeapon(this.weapon);
  }

  clearWeapons() {
    for (const object of this.weaponObjects) object.removeFromParent();
    this.weaponObjects = [];
  }

  async setWeapon(weapon) {
    if (!weapon || !this.model) return;
    this.weapon = weapon;
    const token = ++this.weaponToken;
    this.clearWeapons();

    try {
      const url = WEAPON_ASSETS[weapon.id];
      if (url) {
        const right = await cloneWeaponAsset(url);
        if (token !== this.weaponToken) return;
        const t = weaponTransform(weapon.id);
        right.scale.setScalar(t.scale);
        right.rotation.set(...t.rot);
        addEteriaRune(right, weapon.glow);

        const anchor = this.rightHand || this.model;
        if (!this.rightHand) right.position.set(.48, 1.05, -.18);
        anchor.add(right);
        this.weaponObjects.push(right);

        if (weapon.id === 'rift-daggers' && this.leftHand) {
          const left = right.clone(true);
          left.rotation.y += Math.PI;
          this.leftHand.add(left);
          this.weaponObjects.push(left);
        }
        return;
      }
    } catch (error) {
      console.warn('[eteria] authored weapon fallback:', weapon.id, error);
    }

    const fallback = createWeaponModel(weapon);
    fallback.scale.setScalar(.62);
    if (this.rightHand) this.rightHand.add(fallback);
    else {
      fallback.position.set(.48,1.05,-.18);
      this.model.add(fallback);
    }
    this.weaponObjects.push(fallback);
  }

  addEquipmentAccent() {
    if (!this.model) return;
    this.model.getObjectByName('EteriaCrown')?.removeFromParent();
    if (this.equipment.head === 'eclipse-crown' && this.headBone) {
      const crown = new THREE.Group();
      crown.name = 'EteriaCrown';
      const material = new THREE.MeshStandardMaterial({
        color: 0x7e22ce, emissive: 0x581c87, emissiveIntensity: .55, metalness: .72, roughness: .3,
      });
      const band = new THREE.Mesh(new THREE.TorusGeometry(.16,.018,7,18), material);
      band.rotation.x = Math.PI / 2;
      crown.add(band);
      for (let i=-2;i<=2;i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(.025,.16,5), material);
        spike.position.set(i*.06,.1-Math.abs(i)*.012,0);
        crown.add(spike);
      }
      crown.position.y = .12;
      this.headBone.add(crown);
    }
  }

  async applyEquipmentVisual(equipment = {}) {
    this.equipment = equipment || {};
    const desired = variantForEquipment(this.equipment);
    if (desired !== this.variant) await this.switchVariant(desired);
    this.addEquipmentAccent();
  }

  playAttack(step = 0) {
    this.driver?.shot(step >= 3 ? 'heavy' : step % 2 ? 'attack2' : 'attack1', step >= 3 ? 1.05 : 1.18);
  }

  playSpecial(weaponId) {
    this.driver?.shot('heavy', ['ember-axe','sun-hammer'].includes(weaponId) ? .9 : 1.12);
  }

  playDash() {
    this.driver?.shot('dash', 1.2);
  }

  update(dt, moving, dashing = false) {
    if (!this.ready || !this.driver) return;
    if (!this.driver.oneShot) this.driver.loop(dashing ? 'run' : moving ? 'walk' : 'idle');
    this.driver.update(dt);
  }
}

export class KayKitEnemyController {
  constructor(game, enemy, config) {
    this.game = game;
    this.enemy = enemy;
    this.config = config;
    this.model = null;
    this.driver = null;
    this.materials = [];
    this.fallback = [...enemy.group.children];
    this.flashTimer = 0;
    this.ready = false;
  }

  async load() {
    const gltf = await loadGltf(this.config.url);
    const model = cloneSkeleton(gltf.scene);
    model.name = `KayKitEnemy_${this.enemy.archetype.id}`;
    this.materials = prepareMaterials(model, this.config.tint);
    fitHeight(model, this.config.height / Math.max(.01, this.enemy.archetype.scale || 1));
    model.rotation.y = Math.PI;

    this.enemy.group.add(model);
    for (const child of this.fallback) child.visible = false;
    this.model = model;
    this.driver = new AnimationDriver(model, gltf.animations || []);
    this.driver.loop('idle', 0);
    this.ready = true;

    const rightHand = findNode(model, 'right');
    if (rightHand) {
      try {
        let weapon;
        if (this.config.weaponUrl) weapon = await cloneWeaponAsset(this.config.weaponUrl);
        else if (this.config.weapon && WEAPON_ASSETS[this.config.weapon]) weapon = await cloneWeaponAsset(WEAPON_ASSETS[this.config.weapon]);
        if (weapon) {
          weapon.scale.setScalar(.92);
          rightHand.add(weapon);
        }
      } catch (error) {
        console.warn('[eteria] enemy weapon asset fallback:', error);
      }
    }
    return this;
  }

  flash(color = 0xffffff, critical = false) {
    if (!this.ready) return;
    const c = new THREE.Color(color);
    for (const material of this.materials) {
      if (!material.emissive) continue;
      material.emissive.copy(c);
      material.emissiveIntensity = critical ? 1.5 : .75;
    }
    this.flashTimer = .12;
  }

  update(dt, moving = false, attacking = false) {
    if (!this.ready || !this.driver) return;
    if (attacking && !this.driver.oneShot) this.driver.shot('attack1', 1.12);
    if (!this.driver.oneShot) this.driver.loop(moving ? 'walk' : 'idle');
    this.driver.update(dt);

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        for (const material of this.materials) {
          if (!material.emissive) continue;
          material.emissive.setHex(0x000000);
          material.emissiveIntensity = 0;
        }
      }
    }
  }

  dispose() {
    this.driver?.mixer?.stopAllAction();
    this.model?.removeFromParent();
  }
}

export async function attachKayKitHero(game, weapon) {
  const controller = new KayKitHeroController(game);
  try {
    await controller.load(weapon, game.state.equipment || {});
    return controller;
  } catch (error) {
    console.warn('[eteria] KayKit hero fallback to procedural:', error);
    return null;
  }
}

export async function attachKayKitEnemy(game, enemy) {
  if (enemy.isBoss || enemy.archetype.id === 'ashHound') return null;
  const config = ENEMY_ASSETS[enemy.archetype.id];
  if (!config) return null;
  const controller = new KayKitEnemyController(game, enemy, config);
  try {
    await controller.load();
    return controller;
  } catch (error) {
    console.warn('[eteria] KayKit enemy fallback to procedural:', enemy.archetype.id, error);
    return null;
  }
}
