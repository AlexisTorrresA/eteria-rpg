import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createWeaponModel } from './models.js';

const EQUIPMENT_COLORS = {
  'wanderer-mail': 0x5d4636,
  'guardian-plate': 0x58606b,
  'moon-hood': 0x4c3b78,
  'eclipse-crown': 0x7e22ce,
  'ember-sigil': 0xc2410c,
  'ashen-heart': 0x991b1b
};

export class RiggedHeroController {
  constructor(game) {
    this.game = game;
    this.ready = false;
    this.root = null;
    this.mixer = null;
    this.actions = new Map();
    this.currentLoop = null;
    this.oneShot = null;
    this.weaponAnchor = null;
    this.weaponModel = null;
    this.faceMeshes = [];
    this.blinkClock = 2.2 + Math.random() * 1.8;
    this.blinkTime = 0;
    this.smile = 0;
    this.headBone = null;
    this.headGear = new THREE.Group();
  }

  async load(weapon) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('/assets/eteria_hero.gltf');

    this.root = gltf.scene;
    this.root.name = 'EteriaRiggedHero';
    this.root.position.set(0, 0, 0);
    this.root.rotation.set(0, 0, 0);

    this.root.traverse((obj) => {
      if (obj.isMesh || obj.isSkinnedMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (obj.material) {
          obj.material.envMapIntensity = 0.72;
          obj.material.needsUpdate = true;
        }
      }
      if (obj.isMesh && obj.morphTargetInfluences?.length) this.faceMeshes.push(obj);
    });

    this.mixer = new THREE.AnimationMixer(this.root);
    for (const clip of gltf.animations) {
      const action = this.mixer.clipAction(clip);
      action.enabled = true;
      if (['Attack_1', 'Attack_2', 'Heavy_Attack', 'Dash'].includes(clip.name)) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(clip.name, action);
    }

    this.weaponAnchor = this.root.getObjectByName('WeaponSocket_R');
    this.headBone = this.root.getObjectByName('Head');

    if (!this.weaponAnchor) throw new Error('WeaponSocket_R missing in hero GLTF');
    if (this.headBone) this.headBone.add(this.headGear);

    this.game.player.add(this.root);
    this.setWeapon(weapon);
    this.playLoop('Idle', 0);

    if (this.game.proceduralHeroVisual) this.game.proceduralHeroVisual.visible = false;
    this.ready = true;
    this.applyEquipmentVisual(this.game.state.equipment || {});

    return this;
  }

  dispose() {
    if (!this.root) return;
    this.root.traverse((obj) => {
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
      else obj.material?.dispose?.();
    });
    this.root.removeFromParent();
    this.ready = false;
  }

  setWeapon(weapon) {
    if (!this.weaponAnchor || !weapon) return;
    if (this.weaponModel) {
      this.weaponModel.removeFromParent();
      this.weaponModel.traverse((obj) => {
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
        else obj.material?.dispose?.();
      });
    }

    const model = createWeaponModel(weapon);
    const transform = {
      'aether-blade': { scale: .72, pos: [0, -.03, .01], rot: [0, 0, -.08] },
      'ember-axe': { scale: .68, pos: [0, -.04, .01], rot: [0, 0, -.1] },
      'moon-spear': { scale: .62, pos: [0, -.06, .02], rot: [0, 0, -.06] },
      'rift-daggers': { scale: .76, pos: [0, -.02, .01], rot: [0, 0, -.08] },
      'sun-hammer': { scale: .66, pos: [0, -.05, .02], rot: [0, 0, -.1] },
      'eclipse-glaive': { scale: .61, pos: [0, -.08, .02], rot: [0, 0, -.08] }
    }[weapon.id] || { scale: .7, pos: [0,0,0], rot: [0,0,0] };

    model.scale.setScalar(transform.scale);
    model.position.set(...transform.pos);
    model.rotation.set(...transform.rot);
    this.weaponAnchor.add(model);
    this.weaponModel = model;
  }

  playLoop(name, fade = .14) {
    if (this.oneShot) return;
    if (this.currentLoop === name) return;

    const next = this.actions.get(name) || this.actions.get('Idle');
    if (!next) return;

    const current = this.currentLoop ? this.actions.get(this.currentLoop) : null;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();

    if (current && current !== next) {
      current.crossFadeTo(next, fade, false);
    }

    this.currentLoop = name;
  }

  playOneShot(name, speed = 1) {
    const action = this.actions.get(name);
    if (!action || !this.mixer) return;

    if (this.oneShot && this.oneShot !== action) {
      this.oneShot.stop();
    }

    const loop = this.currentLoop ? this.actions.get(this.currentLoop) : this.actions.get('Idle');
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.setEffectiveTimeScale(speed);
    action.setEffectiveWeight(1);

    if (loop && loop !== action) loop.crossFadeTo(action, .06, false);
    action.play();
    this.oneShot = action;

    const onFinished = (event) => {
      if (event.action !== action) return;
      this.mixer.removeEventListener('finished', onFinished);
      this.oneShot = null;
      const target = this.actions.get(this.currentLoop || 'Idle');
      if (target) {
        target.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
        action.crossFadeTo(target, .1, false);
      }
    };
    this.mixer.addEventListener('finished', onFinished);
  }

  playAttack(step = 0) {
    if (step >= 3) this.playOneShot('Heavy_Attack', 1.15);
    else this.playOneShot(step % 2 ? 'Attack_2' : 'Attack_1', 1.2);
  }

  playSpecial(weaponId) {
    const speed = ['ember-axe', 'sun-hammer'].includes(weaponId) ? .82 : 1.08;
    this.playOneShot('Heavy_Attack', speed);
  }

  playDash() {
    this.playOneShot('Dash', 1.25);
  }

  setSmile(value = 0) {
    this.smile = THREE.MathUtils.clamp(value, 0, 1);
  }

  updateFace(dt) {
    this.blinkClock -= dt;
    if (this.blinkClock <= 0 && this.blinkTime <= 0) {
      this.blinkTime = .16;
      this.blinkClock = 2.1 + Math.random() * 2.7;
    }

    let blink = 0;
    if (this.blinkTime > 0) {
      this.blinkTime -= dt;
      const p = 1 - Math.max(0, this.blinkTime) / .16;
      blink = Math.sin(p * Math.PI);
    }

    for (const mesh of this.faceMeshes) {
      if (!mesh.morphTargetInfluences) continue;
      if (mesh.morphTargetInfluences.length > 0) mesh.morphTargetInfluences[0] = blink;
      if (mesh.morphTargetInfluences.length > 1) mesh.morphTargetInfluences[1] = this.smile;
    }
  }

  applyEquipmentVisual(equipment = {}) {
    if (!this.root) return;

    const chestColor = EQUIPMENT_COLORS[equipment.chest] || 0x5d4636;
    const charmColor = EQUIPMENT_COLORS[equipment.charm] || 0x7dd3fc;

    this.root.traverse((obj) => {
      if (!obj.isMesh && !obj.isSkinnedMesh) return;
      const name = obj.material?.name || '';
      if (name === 'Leather') obj.material.color.setHex(chestColor);
      if (name === 'Steel' && equipment.chest === 'guardian-plate') {
        obj.material.color.setHex(0x7b8491);
        obj.material.metalness = .9;
      }
    });

    while (this.headGear.children.length) {
      const child = this.headGear.children.pop();
      child?.geometry?.dispose?.();
      child?.material?.dispose?.();
    }

    if (equipment.head === 'moon-hood') {
      const hood = new THREE.Mesh(
        new THREE.SphereGeometry(.34, 18, 12, 0, Math.PI * 2, 0, Math.PI * .7),
        new THREE.MeshStandardMaterial({ color: 0x4c3b78, roughness: .92, metalness: .02 })
      );
      hood.position.set(0, .11, .02);
      hood.scale.set(1.02, 1.08, 1.05);
      hood.castShadow = true;
      this.headGear.add(hood);
    } else if (equipment.head === 'eclipse-crown') {
      const metal = new THREE.MeshStandardMaterial({
        color: 0x7e22ce,
        roughness: .34,
        metalness: .78,
        emissive: 0x3b0764,
        emissiveIntensity: .45
      });
      const band = new THREE.Mesh(new THREE.TorusGeometry(.29, .022, 8, 22), metal);
      band.rotation.x = Math.PI / 2;
      band.position.y = .19;
      this.headGear.add(band);
      for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(.035, .22, 6), metal);
        spike.position.set((i - 2) * .11, .31 - Math.abs(i - 2) * .02, 0);
        spike.castShadow = true;
        this.headGear.add(spike);
      }
    }

    if (equipment.charm) {
      const head = this.root.getObjectByName('Chest');
      if (head && !head.getObjectByName('RiggedCharmGlow')) {
        const glow = new THREE.Mesh(
          new THREE.OctahedronGeometry(.045, 0),
          new THREE.MeshStandardMaterial({
            color: charmColor,
            emissive: charmColor,
            emissiveIntensity: 1.8,
            roughness: .22,
            metalness: .18
          })
        );
        glow.name = 'RiggedCharmGlow';
        glow.position.set(0, .02, -.28);
        head.add(glow);
      } else if (head?.getObjectByName('RiggedCharmGlow')) {
        const glow = head.getObjectByName('RiggedCharmGlow');
        glow.material.color.setHex(charmColor);
        glow.material.emissive.setHex(charmColor);
      }
    } else {
      this.root.getObjectByName('RiggedCharmGlow')?.removeFromParent();
    }
  }

  update(dt, moving, dashing = false) {
    if (!this.ready || !this.mixer) return;
    if (!this.oneShot) this.playLoop(dashing ? 'Run' : moving ? 'Walk' : 'Idle');
    this.mixer.update(dt);
    this.updateFace(dt);
  }
}

export async function attachRiggedHero(game, weapon) {
  const controller = new RiggedHeroController(game);
  try {
    await controller.load(weapon);
    return controller;
  } catch (error) {
    console.warn('[eteria] rigged GLTF hero fallback:', error);
    controller.dispose();
    return null;
  }
}
