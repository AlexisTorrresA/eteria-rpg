import * as THREE from 'three';

const PRESETS = {
  portrait: {
    explore: { height: 8.55, distance: 13.6, fov: 54, lookAhead: 1.25, enemyWeight: 0 },
    combat:  { height: 7.75, distance: 12.55, fov: 52, lookAhead: .22, enemyWeight: .10 },
    boss:    { height: 8.8, distance: 14.1, fov: 54, lookAhead: .25, enemyWeight: .18 },
    dash:    { height: 8.35, distance: 14.8, fov: 55, lookAhead: 1.65, enemyWeight: 0 },
    focus:   { height: 7.6, distance: 12.2, fov: 51, lookAhead: .15, enemyWeight: .20 },
  },
  landscape: {
    explore: { height: 7.05, distance: 11.8, fov: 50, lookAhead: 1.35, enemyWeight: 0 },
    combat:  { height: 6.55, distance: 10.9, fov: 49, lookAhead: .28, enemyWeight: .10 },
    boss:    { height: 7.4, distance: 12.7, fov: 51, lookAhead: .25, enemyWeight: .16 },
    dash:    { height: 7.0, distance: 13.1, fov: 52, lookAhead: 1.8, enemyWeight: 0 },
    focus:   { height: 6.35, distance: 10.7, fov: 48, lookAhead: .15, enemyWeight: .18 },
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
      this.zoomImpulse -= .08 * strength;
      this.combatHold = Math.max(this.combatHold, 1.25);
    } else if (kind === 'heavy') {
      this.zoomImpulse -= .18 * strength;
      this.shake = Math.max(this.shake, .032 * strength);
      this.combatHold = Math.max(this.combatHold, 1.55);
    } else if (kind === 'special') {
      this.zoomImpulse -= .25 * strength;
      this.shake = Math.max(this.shake, .045 * strength);
      this.combatHold = Math.max(this.combatHold, 1.75);
    } else if (kind === 'impact') {
      this.zoomImpulse -= .06 * strength;
      this.shake = Math.max(this.shake, .052 * strength);
      this.combatHold = Math.max(this.combatHold, 1.25);
    } else if (kind === 'dash') {
      this.zoomImpulse += .9 * strength;
    } else if (kind === 'damage') {
      this.zoomImpulse += .1 * strength;
      this.shake = Math.max(this.shake, .11 * strength);
      this.combatHold = Math.max(this.combatHold, 1.0);
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

    // Keep the hero as the camera anchor. Combat can bias the gaze toward a
    // target, but it must never drag the camera itself away from the player.
    const heroLook = player.clone();
    heroLook.y += portrait ? 1.35 : 1.25;

    const desiredLook = heroLook.clone();
    const combatFraming = mode === 'combat' || mode === 'boss' || mode === 'focus';
    const safeLookAhead = combatFraming
      ? Math.min(preset.lookAhead, portrait ? .22 : .3)
      : preset.lookAhead;
    desiredLook.addScaledVector(move, safeLookAhead);

    const targetEnemy = boss && mode === 'boss' ? boss : nearest;
    if (targetEnemy && preset.enemyWeight > 0) {
      const enemyPoint = targetEnemy.group.position.clone();
      enemyPoint.y += targetEnemy.isBoss ? 1.8 : 1.15;
      const toEnemy = enemyPoint.sub(heroLook);
      const maxTargetOffset = portrait ? 1.45 : 2.05;
      if (toEnemy.length() > maxTargetOffset) toEnemy.setLength(maxTargetOffset);
      desiredLook.addScaledVector(toEnemy, preset.enemyWeight);
    }

    if (this.focusTime > 0) {
      const point = this.focusPoint.clone();
      point.y += .9;
      const toFocus = point.sub(heroLook);
      const maxFocusOffset = portrait ? 1.8 : 2.5;
      if (toFocus.length() > maxFocusOffset) toFocus.setLength(maxFocusOffset);
      desiredLook.addScaledVector(toFocus, Math.min(this.focusStrength, .35));
    }

    const cameraAnchor = player.clone();
    const desiredPosition = cameraAnchor.add(new THREE.Vector3(
      0,
      preset.height,
      preset.distance + this.zoomImpulse
    ));

    // Small reveal-ahead offset only; the player remains inside the safe center
    // area even while swinging a weapon on a portrait phone display.
    desiredPosition.x -= move.x * (portrait ? .2 : .32);
    desiredPosition.z -= move.z * .08;

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
