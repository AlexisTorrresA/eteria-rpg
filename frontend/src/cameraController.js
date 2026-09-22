import * as THREE from 'three';

const PRESETS = {
  portrait: {
    explore: { height: 8.55, distance: 13.6, fov: 54, lookAhead: 1.25, enemyWeight: 0 },
    combat:  { height: 7.15, distance: 11.15, fov: 51, lookAhead: .65, enemyWeight: .22 },
    boss:    { height: 8.65, distance: 13.85, fov: 54, lookAhead: .4, enemyWeight: .34 },
    dash:    { height: 8.35, distance: 14.8, fov: 55, lookAhead: 1.65, enemyWeight: 0 },
    focus:   { height: 6.9, distance: 10.65, fov: 49, lookAhead: .2, enemyWeight: .46 },
  },
  landscape: {
    explore: { height: 7.05, distance: 11.8, fov: 50, lookAhead: 1.35, enemyWeight: 0 },
    combat:  { height: 6.1, distance: 9.85, fov: 48, lookAhead: .75, enemyWeight: .2 },
    boss:    { height: 7.25, distance: 12.2, fov: 51, lookAhead: .45, enemyWeight: .3 },
    dash:    { height: 7.0, distance: 13.1, fov: 52, lookAhead: 1.8, enemyWeight: 0 },
    focus:   { height: 5.9, distance: 9.5, fov: 47, lookAhead: .2, enemyWeight: .42 },
  },
};

function expSmoothing(rate, dt) {
  return 1 - Math.exp(-rate * dt);
}

export class DynamicCameraController {
  constructor(game) {
    this.game = game;
    this.position = game.camera.position.clone();
    this.lookTarget = game.player.position.clone().add(new THREE.Vector3(0, 1.25, 0));
    this.zoomImpulse = 0;
    this.shake = 0;
    this.combatHold = 0;
    this.focusTime = 0;
    this.focusStrength = 0;
    this.focusPoint = new THREE.Vector3();
    this.mode = 'explore';
  }

  kick(kind, strength = 1) {
    if (kind === 'attack') {
      this.zoomImpulse -= .48 * strength;
      this.combatHold = Math.max(this.combatHold, 1.7);
    } else if (kind === 'heavy') {
      this.zoomImpulse -= .9 * strength;
      this.shake = Math.max(this.shake, .045 * strength);
      this.combatHold = Math.max(this.combatHold, 2.0);
    } else if (kind === 'special') {
      this.zoomImpulse -= 1.15 * strength;
      this.shake = Math.max(this.shake, .06 * strength);
      this.combatHold = Math.max(this.combatHold, 2.3);
    } else if (kind === 'impact') {
      this.zoomImpulse -= .28 * strength;
      this.shake = Math.max(this.shake, .075 * strength);
      this.combatHold = Math.max(this.combatHold, 1.7);
    } else if (kind === 'dash') {
      this.zoomImpulse += 1.45 * strength;
    } else if (kind === 'damage') {
      this.zoomImpulse += .16 * strength;
      this.shake = Math.max(this.shake, .16 * strength);
      this.combatHold = Math.max(this.combatHold, 1.2);
    }
  }

  focusOn(position, duration = 1.8, strength = .55) {
    if (!position) return;
    this.focusPoint.copy(position);
    this.focusTime = Math.max(this.focusTime, duration);
    this.focusStrength = THREE.MathUtils.clamp(strength, 0, .8);
  }

  nearestEnemy() {
    let nearest = null;
    let nearestDistance = Infinity;
    const player = this.game.player.position;
    for (const enemy of this.game.enemies) {
      if (!enemy?.group?.parent || enemy.hp <= 0) continue;
      const d = enemy.group.position.distanceTo(player);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearest = enemy;
      }
    }
    return { enemy: nearest, distance: nearestDistance };
  }

  update(dt) {
    const game = this.game;
    const player = game.player.position;
    const portrait = innerHeight > innerWidth;
    const family = portrait ? PRESETS.portrait : PRESETS.landscape;

    this.combatHold = Math.max(0, this.combatHold - dt);
    this.focusTime = Math.max(0, this.focusTime - dt);
    this.zoomImpulse = THREE.MathUtils.damp(this.zoomImpulse, 0, 5.4, dt);
    this.shake = THREE.MathUtils.damp(this.shake, 0, 8.5, dt);

    const { enemy: nearest, distance: nearestDistance } = this.nearestEnemy();
    const boss = game.boss?.group?.parent ? game.boss : null;
    const bossDistance = boss ? boss.group.position.distanceTo(player) : Infinity;

    let mode = 'explore';
    if (this.focusTime > 0) mode = 'focus';
    else if (game.dashActive > 0) mode = 'dash';
    else if (boss && bossDistance < 22) mode = 'boss';
    else if (this.combatHold > 0 || nearestDistance < 8.5) mode = 'combat';
    this.mode = mode;

    const preset = family[mode];
    const move = game.lastMove.clone().setY(0);
    if (move.lengthSq() < .0001) move.set(0, 0, -1);
    move.normalize();

    const desiredLook = player.clone();
    desiredLook.y += 1.25;
    desiredLook.addScaledVector(move, preset.lookAhead);

    const targetEnemy = boss && mode === 'boss' ? boss : nearest;
    if (targetEnemy && preset.enemyWeight > 0) {
      const enemyPoint = targetEnemy.group.position.clone();
      enemyPoint.y += targetEnemy.isBoss ? 1.8 : 1.15;
      desiredLook.lerp(enemyPoint, preset.enemyWeight);
    }

    if (this.focusTime > 0) {
      const point = this.focusPoint.clone();
      point.y += .9;
      desiredLook.lerp(point, this.focusStrength);
    }

    const desiredPosition = desiredLook.clone().add(new THREE.Vector3(
      0,
      preset.height,
      preset.distance + this.zoomImpulse
    ));

    // Slightly bias the camera opposite the movement direction to reveal more space ahead.
    desiredPosition.x -= move.x * (portrait ? .42 : .62);
    desiredPosition.z -= move.z * .18;

    const posAlpha = expSmoothing(mode === 'combat' || mode === 'focus' ? 5.2 : 3.6, dt);
    const lookAlpha = expSmoothing(mode === 'combat' || mode === 'focus' ? 7.2 : 4.7, dt);
    this.position.lerp(desiredPosition, posAlpha);
    this.lookTarget.lerp(desiredLook, lookAlpha);

    const t = game.elapsed;
    const shakeOffset = new THREE.Vector3(
      Math.sin(t * 57.3) * this.shake,
      Math.sin(t * 71.1 + 1.2) * this.shake * .62,
      Math.cos(t * 63.7 + .4) * this.shake * .7
    );

    game.camera.position.copy(this.position).add(shakeOffset);
    game.camera.lookAt(this.lookTarget);

    const fovTarget = preset.fov + Math.max(0, this.zoomImpulse) * .28;
    game.camera.fov = THREE.MathUtils.damp(game.camera.fov, fovTarget, 5.1, dt);
    game.camera.updateProjectionMatrix();

    if (game.heroRim) {
      game.heroRim.position.set(
        player.x + 1.5,
        player.y + 3.1,
        player.z + 2.2
      );
    }
  }
}
