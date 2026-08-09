import * as THREE from 'three';
import './style.css';

const $ = (id) => document.getElementById(id);
const canvas = $('game-canvas');
const loadingScreen = $('loading-screen');
const menuScreen = $('menu-screen');
const pauseScreen = $('pause-screen');
const victoryScreen = $('victory-screen');
const hud = $('hud');
const continueBtn = $('continue-btn');
const toastEl = $('toast');
const minimap = $('minimap');
const mapCtx = minimap.getContext('2d');

const SAVE_KEY = 'eteria-rpg-save-v1';
const GOALS = { kills: 6, crystals: 5 };
const WORLD_SIZE = 84;
const HALF_WORLD = WORLD_SIZE / 2 - 2;

const UI = {
  level: $('level-label'), gold: $('gold-label'), healthBar: $('health-bar'), healthText: $('health-text'), xpBar: $('xp-bar'),
  kills: $('quest-enemies'), crystals: $('quest-crystals'), questStatus: $('quest-status'), potionCount: $('potion-count'),
  dashButton: $('dash-btn')
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const rand = (min, max) => min + Math.random() * (max - min);
const dist2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function showOnly(screen) {
  for (const el of [loadingScreen, menuScreen, pauseScreen, victoryScreen]) el.classList.remove('active');
  if (screen) screen.classList.add('active');
}

let toastTimer;
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

function vibrate(ms = 20) {
  if ('vibrate' in navigator) navigator.vibrate(ms);
}

function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

class EteriaGame {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x16243a);
    this.scene.fog = new THREE.FogExp2(0x16243a, 0.018);

    this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 180);
    this.camera.position.set(0, 9, 12);

    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.active = false;
    this.paused = false;
    this.finished = false;
    this.keys = Object.create(null);
    this.joystick = new THREE.Vector2();
    this.lastMove = new THREE.Vector3(0, 0, -1);
    this.enemies = [];
    this.crystals = [];
    this.decorAnimations = [];
    this.attackTimer = 0;
    this.dashTimer = 0;
    this.dashActive = 0;
    this.enemySpawnSerial = 0;

    this.defaultState();
    this.createWorld();
    this.createPlayer();
    this.bindInput();
    this.onResize();
    addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.active && !this.paused) this.pause();
    });

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  defaultState() {
    this.state = {
      hp: 100, maxHp: 100, level: 1, xp: 0, xpNext: 100,
      gold: 0, potions: 3, kills: 0, crystals: 0,
      x: 0, z: 10, deaths: 0, startedAt: Date.now()
    };
  }

  createWorld() {
    const hemi = new THREE.HemisphereLight(0x9bd7ff, 0x13210f, 2.1);
    this.scene.add(hemi);
    this.hemi = hemi;

    const sun = new THREE.DirectionalLight(0xfff1cc, 2.6);
    sun.position.set(-18, 28, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -32;
    sun.shadow.camera.right = 32;
    sun.shadow.camera.top = 32;
    sun.shadow.camera.bottom = -32;
    this.scene.add(sun);
    this.sun = sun;

    const groundMat = new THREE.MeshStandardMaterial({ color: 0x284a35, roughness: 0.95, metalness: 0.02 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 1, 1), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 72),
      new THREE.MeshStandardMaterial({ color: 0x5f5a49, roughness: 1 })
    );
    path.rotation.x = -Math.PI / 2;
    path.rotation.z = -0.22;
    path.position.y = 0.012;
    this.scene.add(path);

    const water = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 40),
      new THREE.MeshStandardMaterial({ color: 0x164e63, roughness: 0.25, metalness: 0.25, transparent: true, opacity: 0.82 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(-23, 0.025, -22);
    this.scene.add(water);
    this.decorAnimations.push((t) => { water.material.opacity = 0.76 + Math.sin(t * 1.4) * 0.06; });

    for (let i = 0; i < 34; i++) {
      let x = rand(-38, 38), z = rand(-38, 38);
      if (Math.abs(x) < 6 || (x < -14 && z < -12)) { i--; continue; }
      this.scene.add(this.makeTree(x, z, rand(0.75, 1.3)));
    }

    for (let i = 0; i < 24; i++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rand(.35, .9), 0),
        new THREE.MeshStandardMaterial({ color: i % 3 ? 0x4b5563 : 0x64748b, roughness: 1 })
      );
      rock.scale.y = rand(.65, 1.4);
      rock.position.set(rand(-39, 39), .28, rand(-39, 39));
      rock.rotation.set(rand(0, 2), rand(0, 2), rand(0, 2));
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }

    this.createRuins();
    this.createFireflies();
    this.createPortal();
  }

  makeTree(x, z, scale) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.22, .34, 2.2, 7), new THREE.MeshStandardMaterial({ color: 0x5b3b2c, roughness: 1 }));
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    const crownMat = new THREE.MeshStandardMaterial({ color: Math.random() > .45 ? 0x285f3d : 0x356b46, roughness: .9 });
    const crown1 = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.6, 8), crownMat);
    crown1.position.y = 2.7;
    crown1.castShadow = true;
    const crown2 = new THREE.Mesh(new THREE.ConeGeometry(.92, 2.1, 8), crownMat);
    crown2.position.y = 3.7;
    crown2.castShadow = true;
    group.add(trunk, crown1, crown2);
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    return group;
  }

  createRuins() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x59616e, roughness: .92 });
    const positions = [[18,-18], [22,-18], [18,-23], [22,-23], [-10,26], [-14,26]];
    positions.forEach(([x,z], i) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.7, .9, rand(3.5, 5.2), 6), mat);
      pillar.position.set(x, 1.9, z);
      pillar.rotation.y = i * .4;
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);
    });
  }

  createFireflies() {
    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i*3] = rand(-38, 38);
      positions[i*3+1] = rand(.8, 6);
      positions[i*3+2] = rand(-38, 38);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xa7f3d0, size: .11, transparent: true, opacity: .72, sizeAttenuation: true });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.decorAnimations.push((t) => { points.rotation.y = t * .008; mat.opacity = .58 + Math.sin(t * 1.8) * .14; });
  }

  createPortal() {
    this.portal = new THREE.Group();
    this.portal.position.set(30, 0, -29);
    const stone = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: .8 });
    const glow = new THREE.MeshStandardMaterial({ color: 0x312e81, emissive: 0x11114f, emissiveIntensity: .7, transparent: true, opacity: .5, side: THREE.DoubleSide });
    const left = new THREE.Mesh(new THREE.BoxGeometry(1.1, 6.6, 1.2), stone); left.position.set(-2.3, 3.2, 0);
    const right = left.clone(); right.position.x = 2.3;
    const top = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.1, 1.2), stone); top.position.set(0, 6.2, 0);
    const core = new THREE.Mesh(new THREE.CircleGeometry(2.05, 48), glow); core.position.set(0, 3.3, .08);
    for (const mesh of [left,right,top]) { mesh.castShadow = true; mesh.receiveShadow = true; }
    this.portalCore = core;
    this.portal.add(left,right,top,core);
    this.scene.add(this.portal);
    this.decorAnimations.push((t) => {
      this.portalCore.rotation.z = t * .12;
      this.portalCore.material.emissiveIntensity = this.isPortalUnlocked() ? 2.0 + Math.sin(t*3)*.35 : .45;
      this.portalCore.material.opacity = this.isPortalUnlocked() ? .86 : .34;
      this.portalCore.material.color.setHex(this.isPortalUnlocked() ? 0x22d3ee : 0x312e81);
    });
  }

  createPlayer() {
    this.player = new THREE.Group();
    const armor = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: .55, metalness: .15 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: .85 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xf3c6a5, roughness: .8 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: .28, metalness: .72 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.46, .95, 5, 8), armor); body.position.y = 1.16;
    const head = new THREE.Mesh(new THREE.SphereGeometry(.39, 16, 12), skin); head.position.y = 2.08;
    const cape = new THREE.Mesh(new THREE.BoxGeometry(.74, 1.2, .12), cloth); cape.position.set(0,1.26,.43); cape.rotation.x = -.10;
    const sword = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.10, 1.35, .11), metal); blade.position.y = .68;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(.52,.09,.11), metal); guard.position.y = .08;
    sword.add(blade, guard); sword.position.set(.66, 1.05, -.08); sword.rotation.z = -.55; sword.rotation.x = -.12;
    this.sword = sword;

    for (const mesh of [body, head, cape, blade, guard]) mesh.castShadow = true;
    this.player.add(body, head, cape, sword);
    this.player.position.set(0, 0, 10);
    this.scene.add(this.player);
  }

  resetWorldEntities() {
    for (const enemy of this.enemies) this.scene.remove(enemy.group);
    for (const crystal of this.crystals) this.scene.remove(crystal.mesh);
    this.enemies = [];
    this.crystals = [];
    this.spawnEnemies(Math.max(3, 9 - this.state.kills));
    this.spawnCrystals(Math.max(2, 8 - this.state.crystals));
  }

  spawnEnemies(count) {
    const spots = [[-22,-10],[14,-9],[-12,-28],[27,14],[-29,23],[11,25],[32,-5],[-32,-31],[4,-34],[24,29]];
    for (let i = 0; i < count; i++) {
      const spot = spots[(this.enemySpawnSerial++) % spots.length];
      this.enemies.push(this.makeEnemy(spot[0] + rand(-2,2), spot[1] + rand(-2,2)));
    }
  }

  makeEnemy(x, z) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x24153d, emissive: 0x120522, emissiveIntensity: .6, roughness: .7 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff6b9a, emissive: 0xff174a, emissiveIntensity: 2.2 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.42, .72, 4, 7), bodyMat); body.position.y = 1.02; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(.46, 12, 9), bodyMat); head.position.y = 1.78; head.castShadow = true;
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(.055, 7, 5), eyeMat); eye1.position.set(-.16,1.82,-.42);
    const eye2 = eye1.clone(); eye2.position.x = .16;
    group.add(body, head, eye1, eye2);
    group.position.set(x, 0, z);
    this.scene.add(group);
    return { group, hp: 55 + this.state.level * 6, maxHp: 55 + this.state.level * 6, speed: rand(1.7,2.25), cooldown: rand(.3,1), spawn: new THREE.Vector3(x,0,z), phase: rand(0,Math.PI*2), bodyMat };
  }

  spawnCrystals(count) {
    const spots = [[-8,-6],[-25,13],[9,-23],[23,4],[-8,31],[34,22],[-30,-7],[6,16]];
    for (let i = 0; i < count; i++) {
      const [x,z] = spots[i % spots.length];
      const mat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x0891b2, emissiveIntensity: 1.8, metalness: .15, roughness: .25 });
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.52, 0), mat);
      mesh.position.set(x + rand(-1.5,1.5), .72, z + rand(-1.5,1.5));
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.crystals.push({ mesh, phase: rand(0, Math.PI * 2) });
    }
  }

  newGame() {
    this.defaultState();
    localStorage.removeItem(SAVE_KEY);
    this.player.position.set(0,0,10);
    this.resetWorldEntities();
    this.startPlay();
    toast('Tu aventura comienza. Sigue el sendero.');
  }

  continueGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      this.defaultState();
      Object.assign(this.state, saved?.state || {});
      this.player.position.set(this.state.x || 0, 0, this.state.z || 10);
      this.resetWorldEntities();
      this.startPlay();
      toast('Partida recuperada.');
    } catch {
      this.newGame();
    }
  }

  startPlay() {
    this.finished = false;
    this.paused = false;
    this.active = true;
    showOnly(null);
    hud.classList.remove('hidden');
    this.updateUI();
    this.save();
  }

  pause() {
    if (!this.active || this.finished) return;
    this.paused = true;
    showOnly(pauseScreen);
  }

  resume() {
    this.paused = false;
    showOnly(null);
    this.clock.getDelta();
  }

  save() {
    if (!this.active) return;
    this.state.x = Number(this.player.position.x.toFixed(2));
    this.state.z = Number(this.player.position.z.toFixed(2));
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, state: this.state, savedAt: Date.now() }));
    continueBtn.classList.remove('hidden');
  }

  restart() {
    localStorage.removeItem(SAVE_KEY);
    this.active = false;
    this.paused = false;
    this.finished = false;
    hud.classList.add('hidden');
    this.newGame();
  }

  bindInput() {
    addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') { e.preventDefault(); this.attack(); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.dash();
      if (e.code === 'KeyQ') this.usePotion();
      if (e.code === 'Escape') this.paused ? this.resume() : this.pause();
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    const joystick = $('joystick');
    const thumb = $('joystick-thumb');
    let pointerId = null;
    const updateJoystick = (e) => {
      const rect = joystick.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const radius = rect.width * .33;
      const len = Math.hypot(dx, dy) || 1;
      const scale = Math.min(1, radius / len);
      const px = dx * scale, py = dy * scale;
      thumb.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      this.joystick.set(px / radius, py / radius);
    };
    joystick.addEventListener('pointerdown', (e) => { pointerId = e.pointerId; joystick.setPointerCapture(pointerId); updateJoystick(e); });
    joystick.addEventListener('pointermove', (e) => { if (e.pointerId === pointerId) updateJoystick(e); });
    const endJoy = (e) => { if (pointerId === null || e.pointerId !== pointerId) return; pointerId = null; this.joystick.set(0,0); thumb.style.transform = 'translate3d(0,0,0)'; };
    joystick.addEventListener('pointerup', endJoy); joystick.addEventListener('pointercancel', endJoy);

    $('attack-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); this.attack(); });
    $('dash-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); this.dash(); });
    $('potion-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); this.usePotion(); });
  }

  attack() {
    if (!this.active || this.paused || this.finished || this.attackTimer > 0) return;
    this.attackTimer = .42;
    this.sword.userData.swing = .22;
    vibrate(18);
    const forward = this.lastMove.clone().normalize();
    let hit = false;
    for (const enemy of [...this.enemies]) {
      const delta = enemy.group.position.clone().sub(this.player.position);
      const distance = delta.length();
      if (distance > 2.8) continue;
      delta.y = 0;
      const dot = delta.normalize().dot(forward);
      if (dot < -.18) continue;
      hit = true;
      const damage = 28 + (this.state.level - 1) * 7;
      enemy.hp -= damage;
      enemy.group.scale.set(1.18,.82,1.18);
      enemy.bodyMat.emissiveIntensity = 2.6;
      setTimeout(() => { if (enemy.group.parent) { enemy.group.scale.set(1,1,1); enemy.bodyMat.emissiveIntensity = .6; } }, 90);
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
    if (hit) vibrate(32);
  }

  killEnemy(enemy) {
    this.scene.remove(enemy.group);
    this.enemies = this.enemies.filter((e) => e !== enemy);
    this.state.kills += 1;
    this.state.gold += 12 + Math.floor(Math.random() * 8);
    if (Math.random() < .22) { this.state.potions++; toast('Una Sombra dejó una poción.'); }
    else toast('Sombra derrotada +25 XP');
    this.gainXp(25);
    this.updateUI();
    this.checkQuest();
  }

  dash() {
    if (!this.active || this.paused || this.finished || this.dashTimer > 0) return;
    this.dashTimer = 2.15;
    this.dashActive = .19;
    vibrate(22);
    UI.dashButton.classList.add('cooldown');
  }

  usePotion() {
    if (!this.active || this.paused || this.finished) return;
    if (this.state.potions <= 0) return toast('No te quedan pociones.');
    if (this.state.hp >= this.state.maxHp) return toast('Tu salud ya está completa.');
    this.state.potions--;
    this.state.hp = Math.min(this.state.maxHp, this.state.hp + Math.round(this.state.maxHp * .42));
    vibrate([18, 25, 18]);
    toast('Poción usada.');
    this.updateUI();
  }

  gainXp(amount) {
    this.state.xp += amount;
    while (this.state.xp >= this.state.xpNext) {
      this.state.xp -= this.state.xpNext;
      this.state.level++;
      this.state.xpNext = Math.round(this.state.xpNext * 1.35);
      this.state.maxHp += 18;
      this.state.hp = this.state.maxHp;
      this.state.potions++;
      toast(`¡Nivel ${this.state.level}! Vida y daño aumentados.`);
    }
  }

  takeDamage(amount) {
    if (this.finished) return;
    this.state.hp = Math.max(0, this.state.hp - amount);
    vibrate(45);
    this.updateUI();
    if (this.state.hp <= 0) {
      this.state.deaths++;
      this.state.gold = Math.max(0, this.state.gold - 10);
      this.state.hp = this.state.maxHp;
      this.player.position.set(0,0,10);
      toast('Has caído. El Santuario te devuelve al valle.');
      this.updateUI();
    }
  }

  updatePlayer(dt) {
    let x = this.joystick.x + (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) - (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0);
    let z = this.joystick.y + (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0) - (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0);
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    const moving = Math.hypot(x,z) > .08;
    const speed = 5.1 + (this.state.level - 1) * .08;
    if (moving) {
      const dir = new THREE.Vector3(x, 0, z).normalize();
      this.lastMove.lerp(dir, .3).normalize();
      const multiplier = this.dashActive > 0 ? 3.5 : 1;
      this.player.position.addScaledVector(dir, speed * multiplier * dt);
      this.player.rotation.y = Math.atan2(-dir.x, -dir.z);
      this.player.position.y = Math.abs(Math.sin(this.elapsed * 10)) * .045;
    } else {
      this.player.position.y = THREE.MathUtils.lerp(this.player.position.y, 0, .2);
    }
    this.player.position.x = clamp(this.player.position.x, -HALF_WORLD, HALF_WORLD);
    this.player.position.z = clamp(this.player.position.z, -HALF_WORLD, HALF_WORLD);

    if (this.sword.userData.swing > 0) {
      this.sword.userData.swing -= dt;
      const p = 1 - this.sword.userData.swing / .22;
      this.sword.rotation.z = -0.55 - Math.sin(p * Math.PI) * 1.8;
      this.sword.rotation.x = -.12 - Math.sin(p * Math.PI) * .35;
    } else {
      this.sword.rotation.z = THREE.MathUtils.lerp(this.sword.rotation.z, -.55, .18);
      this.sword.rotation.x = THREE.MathUtils.lerp(this.sword.rotation.x, -.12, .18);
    }
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      enemy.cooldown -= dt;
      const toPlayer = this.player.position.clone().sub(enemy.group.position);
      const d = toPlayer.length();
      let dir;
      if (d < 15) {
        dir = toPlayer.setY(0).normalize();
        if (d > 1.45) enemy.group.position.addScaledVector(dir, enemy.speed * dt);
        enemy.group.rotation.y = Math.atan2(-dir.x, -dir.z);
        if (d < 1.65 && enemy.cooldown <= 0) {
          enemy.cooldown = 1.15 + Math.random() * .35;
          this.takeDamage(8 + this.state.level * 1.4);
        }
      } else {
        const t = this.elapsed * .32 + enemy.phase;
        const target = enemy.spawn.clone().add(new THREE.Vector3(Math.cos(t) * 2.2, 0, Math.sin(t * .8) * 2.2));
        dir = target.sub(enemy.group.position).setY(0);
        if (dir.length() > .25) enemy.group.position.addScaledVector(dir.normalize(), enemy.speed * .28 * dt);
      }
      enemy.group.position.y = .04 + Math.sin(this.elapsed * 3 + enemy.phase) * .06;
    }
  }

  updateCrystals(dt) {
    for (const crystal of [...this.crystals]) {
      crystal.mesh.rotation.y += dt * 1.4;
      crystal.mesh.position.y = .72 + Math.sin(this.elapsed * 2.5 + crystal.phase) * .18;
      if (dist2D(crystal.mesh.position, this.player.position) < 1.35) {
        this.scene.remove(crystal.mesh);
        this.crystals = this.crystals.filter((c) => c !== crystal);
        this.state.crystals++;
        this.state.gold += 5;
        this.gainXp(12);
        vibrate(24);
        toast('Fragmento recuperado +12 XP');
        this.updateUI();
        this.checkQuest();
      }
    }
  }

  isPortalUnlocked() {
    return this.state.kills >= GOALS.kills && this.state.crystals >= GOALS.crystals;
  }

  checkQuest() {
    if (this.isPortalUnlocked()) toast('¡Portal desbloqueado! Ve al noreste del valle.');
    this.save();
  }

  updatePortal() {
    if (!this.isPortalUnlocked()) return;
    if (dist2D(this.player.position, this.portal.position) < 2.3) this.win();
  }

  win() {
    if (this.finished) return;
    this.finished = true;
    this.active = false;
    this.save();
    hud.classList.add('hidden');
    const seconds = Math.max(1, Math.round((Date.now() - this.state.startedAt) / 1000));
    const mins = Math.floor(seconds / 60);
    $('victory-stats').innerHTML = `
      <div><strong>${this.state.level}</strong><span>NIVEL</span></div>
      <div><strong>${this.state.gold}</strong><span>ESENCIA</span></div>
      <div><strong>${mins}m</strong><span>TIEMPO</span></div>`;
    showOnly(victoryScreen);
    localStorage.removeItem(SAVE_KEY);
    continueBtn.classList.add('hidden');
    vibrate([35,60,35,60,90]);
  }

  updateCamera(dt) {
    const targetPos = new THREE.Vector3(this.player.position.x, 8.4, this.player.position.z + 10.8);
    const smoothing = 1 - Math.pow(.001, dt);
    this.camera.position.lerp(targetPos, smoothing);
    this.camera.lookAt(this.player.position.x, 1.2, this.player.position.z - 1.8);
  }

  updateAtmosphere() {
    const cycle = (Math.sin(this.elapsed * .025) + 1) * .5;
    const day = new THREE.Color(0x1e3850);
    const dusk = new THREE.Color(0x11172b);
    this.scene.background.copy(dusk).lerp(day, .35 + cycle * .48);
    this.scene.fog.color.copy(this.scene.background);
    this.hemi.intensity = 1.45 + cycle * .9;
    this.sun.intensity = 1.8 + cycle * 1.05;
    this.sun.position.x = Math.cos(this.elapsed * .025) * 26;
  }

  updateUI() {
    UI.level.textContent = `Nv. ${this.state.level}`;
    UI.gold.textContent = `${this.state.gold} ✦`;
    UI.healthBar.style.width = `${(this.state.hp / this.state.maxHp) * 100}%`;
    UI.healthText.textContent = `${Math.ceil(this.state.hp)} / ${this.state.maxHp}`;
    UI.xpBar.style.width = `${(this.state.xp / this.state.xpNext) * 100}%`;
    UI.kills.textContent = `Sombras: ${Math.min(this.state.kills, GOALS.kills)} / ${GOALS.kills}`;
    UI.crystals.textContent = `Fragmentos: ${Math.min(this.state.crystals, GOALS.crystals)} / ${GOALS.crystals}`;
    UI.potionCount.textContent = this.state.potions;
    UI.questStatus.textContent = this.isPortalUnlocked() ? 'Portal abierto · ve al noreste ✦' : 'El portal sigue sellado.';
  }

  drawMinimap() {
    const w = minimap.width, h = minimap.height;
    mapCtx.clearRect(0,0,w,h);
    mapCtx.save();
    mapCtx.translate(w/2,h/2);
    mapCtx.beginPath(); mapCtx.arc(0,0,w*.47,0,Math.PI*2); mapCtx.clip();
    mapCtx.fillStyle = 'rgba(8, 30, 31, .88)'; mapCtx.fillRect(-w/2,-h/2,w,h);
    const s = (w*.43) / HALF_WORLD;
    const dot = (x,z,r,color) => { mapCtx.beginPath(); mapCtx.arc(x*s, z*s, r, 0, Math.PI*2); mapCtx.fillStyle=color; mapCtx.fill(); };
    for (const c of this.crystals) dot(c.mesh.position.x,c.mesh.position.z,2.4,'#67e8f9');
    for (const e of this.enemies) dot(e.group.position.x,e.group.position.z,2.2,'#fb7185');
    dot(this.portal.position.x,this.portal.position.z,3.1,this.isPortalUnlocked() ? '#fbbf24' : '#7c3aed');
    dot(this.player.position.x,this.player.position.z,3.8,'#f8fafc');
    mapCtx.restore();
    mapCtx.strokeStyle='rgba(255,255,255,.22)'; mapCtx.lineWidth=2; mapCtx.beginPath(); mapCtx.arc(w/2,h/2,w*.47,0,Math.PI*2); mapCtx.stroke();
  }

  updateTimers(dt) {
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.dashActive = Math.max(0, this.dashActive - dt);
    if (this.dashTimer <= 0) UI.dashButton.classList.remove('cooldown');
  }

  onResize() {
    const w = innerWidth, h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, w < 900 ? 1.6 : 1.9));
  }

  animate() {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), .033);
    this.elapsed += dt;
    for (const fn of this.decorAnimations) fn(this.elapsed);

    if (this.active && !this.paused && !this.finished) {
      this.updateTimers(dt);
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateCrystals(dt);
      this.updatePortal();
      this.updateCamera(dt);
      this.updateAtmosphere();
      this.drawMinimap();
    } else if (!this.active) {
      const target = new THREE.Vector3(0, 8.8, 18);
      this.camera.position.lerp(target, .025);
      this.camera.lookAt(0,1,0);
      this.updateAtmosphere();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

const game = new EteriaGame();

$('start-btn').addEventListener('click', () => game.newGame());
continueBtn.addEventListener('click', () => game.continueGame());
$('pause-btn').addEventListener('click', () => game.pause());
$('resume-btn').addEventListener('click', () => game.resume());
$('save-btn').addEventListener('click', () => { game.save(); toast('Partida guardada.'); });
$('restart-btn').addEventListener('click', () => game.restart());
$('victory-restart-btn').addEventListener('click', () => game.restart());

if (hasSave()) continueBtn.classList.remove('hidden');

setTimeout(() => {
  loadingScreen.classList.remove('active');
  menuScreen.classList.add('active');
}, 650);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
