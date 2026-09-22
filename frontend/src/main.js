import * as THREE from 'three';
import './style.css';
import { WEAPONS, ENEMY_ARCHETYPES, BOSS, STORY, weaponUnlocked } from './gameData.js';
import { createHeroModel, createEnemyModel, createWeaponModel } from './models.js';
import { RPGSystems } from './rpgSystems.js';
import { ProgressionSystems } from './progressionSystems.js';
import { WorldExpansion } from './worldExpansion.js';

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
const GOALS = { kills: 8, crystals: 6 };
const WORLD_SIZE = 84;
const HALF_WORLD = 148;

const UI = {
  level: $('level-label'), gold: $('gold-label'), healthBar: $('health-bar'), healthText: $('health-text'), xpBar: $('xp-bar'),
  kills: $('quest-enemies'), crystals: $('quest-crystals'), questStatus: $('quest-status'), potionCount: $('potion-count'),
  dashButton: $('dash-btn'), weaponButton: $('weapon-btn'), weaponLabel: $('weapon-label'),
  chapter: $('chapter-label'), questTitle: $('quest-title'), bossHud: $('boss-hud'),
  bossBar: $('boss-bar'), bossText: $('boss-text')
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
    this.boss = null;
    this.unlockedWeaponIds = new Set();
    this.storyKey = 'intro';

    this.defaultState();
    this.createWorld();
    this.createPlayer();
    this.rpg = new RPGSystems(this, { toast, vibrate });
    this.progression = new ProgressionSystems(this, { toast, vibrate });
    this.world = new WorldExpansion(this, { toast, vibrate });
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
      weaponId: 'aether-blade', bossDefeated: false, chapter: 'intro',
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
    const model = createHeroModel(WEAPONS[0]);
    this.player = model.root;
    this.weaponSocket = model.weaponSocket;
    this.heroRig = model;
    this.player.position.set(0, 0, 10);
    this.scene.add(this.player);
    this.updateWeaponUnlocks(false);
    this.equipWeapon(this.state.weaponId || 'aether-blade', false);
  }

  currentWeapon() {
    return WEAPONS.find((weapon) => weapon.id === this.state.weaponId) || WEAPONS[0];
  }

  updateWeaponUnlocks(announce = true) {
    const available = WEAPONS.filter((weapon) => weaponUnlocked(weapon, this.state));
    const nextIds = new Set(available.map((weapon) => weapon.id));
    if (announce) {
      for (const weapon of available) {
        if (!this.unlockedWeaponIds.has(weapon.id)) toast(`Nueva arma: ${weapon.name} ${weapon.icon}`);
      }
    }
    this.unlockedWeaponIds = nextIds;
    if (!nextIds.has(this.state.weaponId)) this.state.weaponId = available[0]?.id || WEAPONS[0].id;
    this.rpg?.renderInventory();
    return available;
  }

  equipWeapon(id, announce = true) {
    const weapon = WEAPONS.find((item) => item.id === id);
    if (!weapon || !weaponUnlocked(weapon, this.state)) return false;
    this.state.weaponId = weapon.id;
    while (this.weaponSocket.children.length) this.weaponSocket.remove(this.weaponSocket.children[0]);
    this.weaponSocket.add(createWeaponModel(weapon));
    if (announce) toast(`${weapon.icon} ${weapon.name} equipada`);
    this.updateUI();
    this.rpg?.renderInventory();
    this.rpg?.updateSpecialUI();
    return true;
  }

  cycleWeapon() {
    const available = this.updateWeaponUnlocks(false);
    if (available.length < 2) return toast('Aún no has desbloqueado otra arma.');
    const current = available.findIndex((weapon) => weapon.id === this.state.weaponId);
    const next = available[(current + 1) % available.length];
    this.equipWeapon(next.id);
    vibrate(16);
  }

  resetWorldEntities() {
    for (const enemy of this.enemies) this.scene.remove(enemy.group);
    for (const crystal of this.crystals) this.scene.remove(crystal.mesh);
    this.enemies = [];
    this.crystals = [];
    this.boss = null;
    if (this.state.currentRegion === 'ashen-wastes') {
      this.world?.spawnAshEnemies();
    } else {
      this.spawnEnemies(Math.max(4, 11 - this.state.kills));
      this.spawnCrystals(Math.max(2, 9 - this.state.crystals));
      if (this.isBossReady() && !this.state.bossDefeated) this.spawnBoss();
    }
  }

  spawnEnemies(count) {
    const spots = [[-22,-10],[14,-9],[-12,-28],[27,14],[-29,23],[11,25],[32,-5],[-32,-31],[4,-34],[24,29]];
    for (let i = 0; i < count; i++) {
      const spot = spots[(this.enemySpawnSerial++) % spots.length];
      const serial = this.enemySpawnSerial;
      const type = serial % 5 === 0 ? 'guardian' : serial % 3 === 0 ? 'marauder' : 'shade';
      this.enemies.push(this.makeEnemy(spot[0] + rand(-2,2), spot[1] + rand(-2,2), type));
    }
  }

  makeEnemy(x, z, type = 'shade') {
    const archetype = ENEMY_ARCHETYPES[type] || ENEMY_ARCHETYPES.shade;
    const model = createEnemyModel(archetype, false);
    const group = model.group;
    group.position.set(x, 0, z);
    this.scene.add(group);
    const hp = archetype.hp + this.state.level * archetype.hpPerLevel;
    return {
      group, hp, maxHp: hp,
      speed: rand(archetype.speed[0], archetype.speed[1]),
      cooldown: rand(.3,1),
      attackCooldown: archetype.cooldown,
      spawn: new THREE.Vector3(x,0,z),
      phase: rand(0,Math.PI*2),
      bodyMat: model.bodyMat,
      archetype,
      isBoss: false
    };
  }

  spawnBoss() {
    if (this.boss || this.state.bossDefeated) return;
    const archetype = { ...BOSS };
    const model = createEnemyModel(archetype, true);
    const group = model.group;
    group.position.set(27.5, 0, -25.5);
    this.scene.add(group);
    const hp = BOSS.hp + this.state.level * BOSS.hpPerLevel;
    this.boss = {
      group, hp, maxHp: hp,
      speed: BOSS.speed,
      cooldown: .5,
      attackCooldown: [BOSS.cooldown, BOSS.cooldown + .25],
      spawn: new THREE.Vector3(27.5,0,-25.5),
      phase: 0,
      bodyMat: model.bodyMat,
      archetype: BOSS,
      isBoss: true
    };
    this.enemies.push(this.boss);
    this.storyKey = 'boss';
    toast('Vharok ha despertado junto al portal.');
    this.updateUI();
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
    this.unlockedWeaponIds = new Set();
    this.storyKey = 'intro';
    this.rpg?.syncState();
    this.progression?.ensureState();
    this.progression?.renderAll();
    this.world?.ensureState();
    localStorage.removeItem(SAVE_KEY);
    this.player.position.set(0,0,10);
    this.resetWorldEntities();
    this.startPlay();
    this.storyKey = 'intro';
    this.updateWeaponUnlocks(false);
    this.equipWeapon('aether-blade', false);
    toast('Liora: “Viajero, el Eclipse ha despertado. Recupera los fragmentos.”');
  }

  continueGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      this.defaultState();
      Object.assign(this.state, saved?.state || {});
      this.rpg?.syncState();
      this.progression?.ensureState();
      this.progression?.renderAll();
      this.world?.ensureState();
      this.storyKey = this.state.chapter || 'intro';
      this.updateStoryProgress();
      this.player.position.set(this.state.x || 0, 0, this.state.z || 10);
      this.updateWeaponUnlocks(false);
      this.equipWeapon(this.state.weaponId || 'aether-blade', false);
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
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 4, state: this.state, savedAt: Date.now() }));
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
      if (e.code === 'KeyR') this.cycleWeapon();
      if (e.code === 'KeyE') this.rpg?.specialAttack();
      if (e.code === 'KeyF') this.rpg?.interact();
      if (e.code === 'KeyI') this.rpg?.toggleInventory();
      if (e.code === 'KeyC') this.progression?.togglePanel('character');
      if (e.code === 'KeyJ') this.progression?.togglePanel('quests');
      if (e.code.startsWith('Digit')) {
        const slot = Number(e.code.slice(5)) - 1;
        const available = this.updateWeaponUnlocks(false);
        if (slot >= 0 && slot < available.length) this.equipWeapon(available[slot].id);
      }
      if (e.code === 'Escape') {
        if (this.rpg?.inventoryOpen) this.rpg.closeInventory();
        else if (this.rpg?.dialogueOpen) this.rpg.closeDialogue();
        else if (this.progression?.isModalOpen()) this.progression.closePanels();
        else this.paused ? this.resume() : this.pause();
      }
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
    $('weapon-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); this.cycleWeapon(); });
  }

  attack() {
    this.rpg?.basicAttack();
  }

  killEnemy(enemy) {
    this.rpg?.spawnBurst(enemy.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), enemy.archetype?.glow || 0xf8fafc, enemy.isBoss ? 34 : 16, enemy.isBoss ? 1.6 : 1.0);
    this.scene.remove(enemy.group);
    this.enemies = this.enemies.filter((e) => e !== enemy);

    if (enemy.isBoss) {
      this.boss = null;
      this.state.bossDefeated = true;
      this.state.gold += BOSS.gold;
      this.gainXp(BOSS.xp);
      this.updateWeaponUnlocks(true);
      this.storyKey = 'finale';
      this.progression?.checkQuestRewards();
      toast('Vharok ha caído. El portal conduce ahora a las Tierras de Ceniza.');
      this.updateUI();
      this.checkQuest();
      return;
    }

    const archetype = enemy.archetype;
    this.state.kills += 1;
    this.progression?.recordKill(archetype.id);
    this.state.gold += Math.round(rand(archetype.gold[0], archetype.gold[1]));
    if (Math.random() < .2) {
      this.state.potions++;
      toast(`${archetype.name} dejó una poción.`);
    } else {
      toast(`${archetype.name} derrotado +${archetype.xp} XP`);
    }
    this.gainXp(archetype.xp);
    this.updateWeaponUnlocks(true);
    this.updateStoryProgress();
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
    this.rpg?.showFloatingText(this.player.position.clone().add(new THREE.Vector3(0, 2.5, 0)), '+VIDA', '#86efac', true);
    this.rpg?.spawnBurst(this.player.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0x34d399, 12, .7);
    this.rpg?.renderInventory();
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
      toast(`¡Nivel ${this.state.level}! Vida, daño y arsenal mejorados.`);
      this.progression?.onLevelUp();
      this.state.hp = this.state.maxHp;
      this.updateWeaponUnlocks(true);
    }
  }

  takeDamage(amount) {
    if (this.finished) return;
    amount = this.progression?.incomingDamage(amount) ?? amount;
    this.state.hp = Math.max(0, this.state.hp - amount);
    vibrate(45);
    this.rpg?.showFloatingText(this.player.position.clone().add(new THREE.Vector3(0, 2.45, 0)), `-${Math.round(amount)}`, '#fb7185', true);
    this.rpg?.spawnBurst(this.player.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xfb7185, 8, .55);
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
    if (this.state.currentRegion === 'ashen-wastes') {
      this.player.position.x = clamp(this.player.position.x, 66, 144);
      this.player.position.z = clamp(this.player.position.z, -40, 40);
    } else {
      this.player.position.x = clamp(this.player.position.x, -40, 40);
      this.player.position.z = clamp(this.player.position.z, -40, 40);
    }

    const gait = moving ? Math.sin(this.elapsed * 10) : 0;
    this.heroRig.legL.rotation.x = gait * .55;
    this.heroRig.legR.rotation.x = -gait * .55;
    this.heroRig.armL.rotation.x = -gait * .35;
    this.heroRig.armR.rotation.x = gait * .28;
    this.heroRig.cape.rotation.x = -.08 + Math.abs(gait) * .08 + (this.dashActive > 0 ? .22 : 0);
    this.heroRig.rune.rotation.z += dt * .7;

    this.rpg?.updateCombatAnimation(dt, moving);
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      const toPlayer = this.player.position.clone().sub(enemy.group.position);
      const d = toPlayer.length();

      if (enemy.isBoss) {
        this.world?.updateBoss(enemy, dt, toPlayer, d);
        continue;
      }

      if (enemy.archetype.ranged) {
        this.world?.updateRangedEnemy(enemy, dt, toPlayer, d);
        continue;
      }

      enemy.cooldown -= dt;
      let dir;
      if (d < 15) {
        dir = toPlayer.setY(0).normalize();
        if (d > 1.45) enemy.group.position.addScaledVector(dir, enemy.speed * dt);
        enemy.group.rotation.y = Math.atan2(-dir.x, -dir.z);
        if (d < 1.65 && enemy.cooldown <= 0) {
          const [minCd, maxCd] = enemy.attackCooldown;
          enemy.cooldown = rand(minCd, maxCd);
          enemy.attackAnim = .34;
          this.takeDamage(enemy.archetype.damage + this.state.level * enemy.archetype.damagePerLevel);
        }
      } else {
        const t = this.elapsed * .32 + enemy.phase;
        const target = enemy.spawn.clone().add(new THREE.Vector3(Math.cos(t) * 2.2, 0, Math.sin(t * .8) * 2.2));
        dir = target.sub(enemy.group.position).setY(0);
        if (dir.length() > .25) enemy.group.position.addScaledVector(dir.normalize(), enemy.speed * .28 * dt);
      }
      enemy.group.position.y = .04 + Math.sin(this.elapsed * 3 + enemy.phase) * .06;
      enemy.attackAnim = Math.max(0, (enemy.attackAnim || 0) - dt);
      const strike = enemy.attackAnim > 0 ? Math.sin((1 - enemy.attackAnim / .34) * Math.PI) : 0;
      const type = enemy.archetype.id;
      if (type === 'shade' || type === 'ashHound') enemy.group.rotation.z = strike * .24;
      else if (type === 'marauder') enemy.group.rotation.z = -strike * .38;
      else if (type === 'guardian') enemy.group.rotation.x = strike * .32;
      if (!enemy.attackAnim) {
        enemy.group.rotation.x = THREE.MathUtils.lerp(enemy.group.rotation.x, 0, .18);
        enemy.group.rotation.z = THREE.MathUtils.lerp(enemy.group.rotation.z, 0, .18);
      }
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
        this.updateWeaponUnlocks(true);
        this.updateStoryProgress();
        this.updateUI();
        this.checkQuest();
      }
    }
  }

  isBossReady() {
    return this.state.kills >= GOALS.kills && this.state.crystals >= GOALS.crystals;
  }

  isPortalUnlocked() {
    return !!this.state.bossDefeated;
  }

  updateStoryProgress() {
    const previous = this.storyKey;
    if (this.state.currentRegion === 'ashen-wastes') this.storyKey = 'wastes';
    else if (this.state.bossDefeated) this.storyKey = 'finale';
    else if (this.boss || this.isBossReady()) this.storyKey = 'boss';
    else if (this.state.kills >= 5 || this.state.crystals >= 4) this.storyKey = 'truth';
    else if (this.state.kills >= 2 || this.state.crystals >= 2) this.storyKey = 'shadows';
    else this.storyKey = 'intro';
    this.state.chapter = this.storyKey;

    if (previous !== this.storyKey) {
      const messages = {
        shadows: 'Liora: “No son bestias salvajes. Los antiguos guardianes están siendo controlados.”',
        truth: 'Eldren: “Los fragmentos no sellan el Eclipse; mantienen dormido a su Guardián.”',
        boss: 'El último fragmento vibra. Algo enorme despierta junto al portal.',
        finale: 'El equilibrio vuelve al valle. Más allá del portal comienza otra región de Eteria.'
      };
      if (messages[this.storyKey]) toast(messages[this.storyKey]);
    }
  }

  checkQuest() {
    this.updateStoryProgress();
    if (this.isBossReady() && !this.state.bossDefeated && !this.boss) this.spawnBoss();
    if (this.isPortalUnlocked() && this.state.currentRegion !== 'ashen-wastes') toast('¡Portal desbloqueado! Ve al noreste del valle.');
    this.save();
  }

  updatePortal() {
    if (!this.isPortalUnlocked()) return;
    if (this.state.currentRegion !== 'ashen-wastes' && dist2D(this.player.position, this.portal.position) < 2.3) {
      this.world?.enterAshenWastes();
      this.storyKey = 'wastes';
      this.updateUI();
    }
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
    if (this.state.currentRegion === 'ashen-wastes') {
      const ash = new THREE.Color(0x2a1c1c);
      const ember = new THREE.Color(0x5b2b22);
      this.scene.background.copy(ash).lerp(ember, .2 + cycle * .22);
      this.scene.fog.color.copy(this.scene.background);
      this.scene.fog.density = .024;
      this.hemi.intensity = 1.05 + cycle * .38;
      this.sun.intensity = 1.35 + cycle * .45;
      this.sun.color.setHex(0xffb36b);
      this.sun.position.set(95,24,18);
    } else {
      const day = new THREE.Color(0x1e3850);
      const dusk = new THREE.Color(0x11172b);
      this.scene.background.copy(dusk).lerp(day, .35 + cycle * .48);
      this.scene.fog.color.copy(this.scene.background);
      this.scene.fog.density = .018;
      this.hemi.intensity = 1.45 + cycle * .9;
      this.sun.intensity = 1.8 + cycle * 1.05;
      this.sun.color.setHex(0xfff1cc);
      this.sun.position.x = Math.cos(this.elapsed * .025) * 26;
    }
  }

  updateUI() {
    UI.level.textContent = `Nv. ${this.state.level}`;
    UI.gold.textContent = `${this.state.gold} ✦`;
    UI.healthBar.style.width = `${(this.state.hp / this.state.maxHp) * 100}%`;
    UI.healthText.textContent = `${Math.ceil(this.state.hp)} / ${this.state.maxHp}`;
    UI.xpBar.style.width = `${(this.state.xp / this.state.xpNext) * 100}%`;
    if (this.state.currentRegion === 'ashen-wastes') {
      UI.kills.textContent = `Criaturas de Ceniza: ${Math.min(this.state.questProgress?.ashKills || 0, 6)} / 6`;
      UI.crystals.textContent = `Objetivo: alcanza el faro oriental`;
    } else {
      UI.kills.textContent = `Enemigos: ${Math.min(this.state.kills, GOALS.kills)} / ${GOALS.kills}`;
      UI.crystals.textContent = `Fragmentos: ${Math.min(this.state.crystals, GOALS.crystals)} / ${GOALS.crystals}`;
    }
    UI.potionCount.textContent = this.state.potions;

    const story = STORY[this.storyKey] || STORY.intro;
    UI.chapter.textContent = story.chapter;
    UI.questTitle.textContent = story.title;
    UI.questStatus.textContent = this.isPortalUnlocked()
      ? 'Portal abierto · entra al noreste ✦'
      : this.isBossReady()
        ? 'Vharok protege el portal. Derrótalo.'
        : story.status;

    const weapon = this.currentWeapon();
    UI.weaponLabel.textContent = `${weapon.icon} ${weapon.name}`;
    UI.weaponButton.title = `Cambiar arma · ${weapon.name}`;

    if (this.boss && !this.state.bossDefeated) {
      UI.bossHud.classList.remove('hidden');
      UI.bossBar.style.width = `${Math.max(0, this.boss.hp / this.boss.maxHp) * 100}%`;
      UI.bossText.textContent = `${BOSS.name} · Fase ${this.boss.bossPhase || 1} · ${Math.max(0, Math.ceil(this.boss.hp))} / ${this.boss.maxHp}`;
    } else {
      UI.bossHud.classList.add('hidden');
    }
  }

  drawMinimap() {
    const w = minimap.width, h = minimap.height;
    mapCtx.clearRect(0,0,w,h);
    mapCtx.save();
    mapCtx.translate(w/2,h/2);
    mapCtx.beginPath(); mapCtx.arc(0,0,w*.47,0,Math.PI*2); mapCtx.clip();
    mapCtx.fillStyle = 'rgba(8, 30, 31, .88)'; mapCtx.fillRect(-w/2,-h/2,w,h);
    const centerX = this.state.currentRegion === 'ashen-wastes' ? 105 : 0;
    const localHalf = 42;
    const s = (w*.43) / localHalf;
    const dot = (x,z,r,color) => { mapCtx.beginPath(); mapCtx.arc((x-centerX)*s, z*s, r, 0, Math.PI*2); mapCtx.fillStyle=color; mapCtx.fill(); };
    for (const c of this.crystals) dot(c.mesh.position.x,c.mesh.position.z,2.4,'#67e8f9');
    for (const e of this.enemies) {
      if (Math.abs(e.group.position.x-centerX) > 48) continue;
      const color = e.isBoss ? '#f0abfc' : e.archetype.id === 'ashArcher' ? '#fb923c' : e.archetype.id === 'ashHound' ? '#ef4444' : e.archetype.id === 'guardian' ? '#a78bfa' : e.archetype.id === 'marauder' ? '#fb923c' : '#fb7185';
      dot(e.group.position.x,e.group.position.z,e.isBoss ? 3.8 : 2.2,color);
    }
    if (this.state.currentRegion !== 'ashen-wastes') dot(this.portal.position.x,this.portal.position.z,3.1,this.isPortalUnlocked() ? '#fbbf24' : '#7c3aed');
    if (this.state.currentRegion === 'ashen-wastes' && this.world?.endBeacon) dot(this.world.endBeacon.position.x,this.world.endBeacon.position.z,3.4,'#fbbf24');
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
      this.rpg?.update(dt);
      this.progression?.update(dt);
      this.world?.update(dt);
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
