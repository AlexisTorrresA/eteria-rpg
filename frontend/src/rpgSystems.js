import * as THREE from 'three';
import { WEAPONS, weaponUnlocked } from './gameData.js';

const CHESTS = [
  { id: 'valley-cache', name: 'Cofre del Viajero', pos: [-5, 0, 15], loot: { gold: 25, potions: 1, aetherDust: 1 } },
  { id: 'moon-cache', name: 'Arca Lunar', pos: [-24, 0, 10], loot: { gold: 18, moonShards: 2 } },
  { id: 'ember-cache', name: 'Cofre de Brasa', pos: [17, 0, -12], loot: { gold: 32, emberCores: 1, aetherDust: 1 } },
  { id: 'ruin-cache', name: 'Relicario Antiguo', pos: [-12, 0, 28], loot: { gold: 38, ancientSeals: 1 } },
  { id: 'north-cache', name: 'Arca del Centinela', pos: [27, 0, 18], loot: { potions: 2, moonShards: 1, aetherDust: 2 } },
  { id: 'eclipse-cache', name: 'Cofre del Eclipse', pos: [22, 0, -28], loot: { gold: 70, emberCores: 1, moonShards: 2, ancientSeals: 1 } }
];

const NPCS = [
  { id: 'liora', name: 'Liora', role: 'Guardiana del Santuario', pos: [3.2, 0, 7.2], colors: [0x2563eb, 0x67e8f9] },
  { id: 'eldren', name: 'Eldren', role: 'Cronista de las Ruinas', pos: [-12.5, 0, 25.5], colors: [0x6d28d9, 0xfbbf24] }
];

const DIALOGUE = {
  liora: {
    intro: [
      'Despertaste justo cuando el cielo comenzó a oscurecerse otra vez.',
      'Los fragmentos del Corazón del Eclipse están corrompiendo a los guardianes del valle.',
      'Recupéralos. Si las ruinas responden a tu presencia, busca a Eldren al norte.'
    ],
    shadows: [
      'Ya lo sentiste, ¿verdad? Esas criaturas recuerdan cómo luchar.',
      'No eran monstruos. Eran nuestros protectores antes de que algo los doblegara.'
    ],
    truth: [
      'Eldren siempre sospechó que el sello ocultaba algo vivo.',
      'No te acerques al portal sin dominar tus armas. El último guardián no caerá fácilmente.'
    ],
    boss: [
      'Vharok ha despertado. No luches como un soldado: cambia de arma, esquiva y usa tu técnica especial.'
    ],
    finale: [
      'Lo lograste. El valle vuelve a respirar.',
      'Pero el portal no conduce a casa. Conduce al lugar donde comenzó el Eclipse.'
    ]
  },
  eldren: {
    intro: [
      'Pocos viajeros llegan hasta estas ruinas antes de que las Sombras los encuentren.',
      'Las runas hablan de seis armas vinculadas al Corazón. Cada una responde a una forma distinta de combatir.'
    ],
    shadows: [
      'Observa sus armaduras: esos guardianes aún llevan el sello de Eteria.',
      'Alguien no los creó. Alguien los despertó.'
    ],
    truth: [
      'Ya puedo leer el texto completo: los fragmentos no cierran el portal.',
      'Mantienen dormido a Vharok, el Guardián del Eclipse. Reunirlos será también despertarlo.'
    ],
    boss: [
      'El sello se ha roto. Vharok absorbe energía del portal.',
      'Golpea, retrocede y reserva tu técnica especial para cuando tengas una apertura.'
    ],
    finale: [
      'Vharok era un carcelero, no el prisionero.',
      'Si cruzas ese portal, la siguiente verdad de Eteria te estará esperando.'
    ]
  }
};

const SPECIALS = {
  'aether-blade': { name: 'Arco de Éter', cooldown: 5.0, icon: '◒' },
  'ember-axe': { name: 'Corte Infernal', cooldown: 7.0, icon: '🔥' },
  'moon-spear': { name: 'Estocada Lunar', cooldown: 5.8, icon: '☽' },
  'rift-daggers': { name: 'Ráfaga Fantasma', cooldown: 4.6, icon: '✣' },
  'sun-hammer': { name: 'Terremoto Solar', cooldown: 8.2, icon: '☀' },
  'eclipse-glaive': { name: 'Espiral del Eclipse', cooldown: 6.5, icon: '☾' }
};

const COMBO_MULT = [1.0, 0.92, 1.18, 1.48];
const COMBO_RANGE = [1.0, 1.05, 1.0, 1.18];
const COMBO_DOT = [-0.08, -0.34, 0.08, -0.55];

const rand = (min, max) => min + Math.random() * (max - min);
const dist2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function material(color, emissive = 0x000000, intensity = 0, metalness = .15, roughness = .6) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, metalness, roughness });
}

function shadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createLabel(text, accent = '#67e8f9') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(5,12,24,.82)';
  ctx.roundRect(18, 24, 476, 78, 24);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 73);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(3.8, .95, 1);
  return sprite;
}

function createNPCModel(npc) {
  const root = new THREE.Group();
  const [baseColor, glowColor] = npc.colors;
  const cloth = material(baseColor, 0x000000, 0, .1, .78);
  const trim = material(glowColor, glowColor, 1.3, .2, .35);
  const skin = material(0xe6b18c, 0x000000, 0, .05, .82);
  const dark = material(0x172033, 0x000000, 0, .15, .72);

  const body = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(.38, .82, 5, 9), cloth));
  body.position.y = 1.08;
  const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(.34, 16, 12), skin));
  head.position.y = 1.95;
  const hood = shadow(new THREE.Mesh(new THREE.ConeGeometry(.44, .64, 10), dark));
  hood.position.set(0, 2.18, .05);
  const shoulderL = shadow(new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), trim));
  shoulderL.scale.set(1.25, .6, 1);
  shoulderL.position.set(-.42, 1.45, 0);
  const shoulderR = shoulderL.clone();
  shoulderR.position.x = .42;

  const staff = new THREE.Group();
  const pole = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.035, .045, 1.9, 7), dark));
  pole.position.y = .8;
  const gem = shadow(new THREE.Mesh(new THREE.OctahedronGeometry(.17, 0), trim));
  gem.position.y = 1.82;
  staff.add(pole, gem);
  staff.position.set(.55, .15, .05);
  staff.rotation.z = -.08;

  const ring = shadow(new THREE.Mesh(new THREE.RingGeometry(.32, .39, 24), trim));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .04;

  const label = createLabel(npc.name, npc.id === 'liora' ? '#67e8f9' : '#fbbf24');
  label.position.y = 2.85;

  root.add(body, head, hood, shoulderL, shoulderR, staff, ring, label);
  root.position.set(...npc.pos);
  return { root, ring, gem };
}

function createChestModel(chest) {
  const root = new THREE.Group();
  const wood = material(0x5b351f, 0x000000, 0, .05, .88);
  const metal = material(0xb98a3b, 0x5b3a0a, .35, .65, .35);
  const glow = material(0x67e8f9, 0x0891b2, 1.4, .1, .28);

  const base = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.18, .58, .8), wood));
  base.position.y = .35;
  const band1 = shadow(new THREE.Mesh(new THREE.BoxGeometry(.13, .62, .84), metal));
  band1.position.set(-.35, .36, 0);
  const band2 = band1.clone();
  band2.position.x = .35;

  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, .66, .38);
  const lid = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.2, .32, .82), wood));
  lid.position.set(0, .11, -.39);
  const lidBand = shadow(new THREE.Mesh(new THREE.BoxGeometry(.16, .35, .86), metal));
  lidBand.position.set(0, .12, -.39);
  lidPivot.add(lid, lidBand);

  const lock = shadow(new THREE.Mesh(new THREE.BoxGeometry(.25, .3, .09), metal));
  lock.position.set(0, .55, -.45);
  const rune = shadow(new THREE.Mesh(new THREE.OctahedronGeometry(.09, 0), glow));
  rune.position.set(0, .62, -.51);

  root.add(base, band1, band2, lidPivot, lock, rune);
  root.position.set(...chest.pos);
  root.rotation.y = rand(-.35, .35);
  return { root, lidPivot, rune };
}

export class RPGSystems {
  constructor(game, { toast, vibrate }) {
    this.game = game;
    this.toast = toast;
    this.vibrate = vibrate;
    this.chests = [];
    this.npcs = [];
    this.effects = [];
    this.nearby = null;
    this.specialCooldown = 0;
    this.comboStep = -1;
    this.comboWindow = 0;
    this.combatAnim = null;
    this.inventoryOpen = false;
    this.dialogueOpen = false;
    this.dialogueLines = [];
    this.dialogueIndex = 0;
    this.dialogueNpc = null;

    this.dom = {
      inventoryPanel: document.getElementById('inventory-panel'),
      inventoryWeapons: document.getElementById('inventory-weapons'),
      inventoryMaterials: document.getElementById('inventory-materials'),
      inventoryStats: document.getElementById('inventory-stats'),
      inventoryBtn: document.getElementById('inventory-btn'),
      inventoryClose: document.getElementById('inventory-close'),
      interactBtn: document.getElementById('interact-btn'),
      interactPrompt: document.getElementById('interact-prompt'),
      specialBtn: document.getElementById('special-btn'),
      specialCooldown: document.getElementById('special-cooldown'),
      specialName: document.getElementById('special-name'),
      dialogue: document.getElementById('dialogue-box'),
      dialogueName: document.getElementById('dialogue-name'),
      dialogueRole: document.getElementById('dialogue-role'),
      dialogueText: document.getElementById('dialogue-text'),
      dialogueNext: document.getElementById('dialogue-next'),
      dialogueClose: document.getElementById('dialogue-close'),
      damageLayer: document.getElementById('damage-layer')
    };

    this.ensureState();
    this.createWorldContent();
    this.bindUI();
    this.syncState();
  }

  ensureState() {
    const s = this.game.state;
    s.inventory = {
      aetherDust: 0,
      moonShards: 0,
      emberCores: 0,
      ancientSeals: 0,
      ...(s.inventory || {})
    };
    s.openedChests = Array.isArray(s.openedChests) ? s.openedChests : [];
    s.npcRewards = Array.isArray(s.npcRewards) ? s.npcRewards : [];
    s.chestsOpened = Number(s.chestsOpened || 0);
  }

  createWorldContent() {
    for (const npc of NPCS) {
      const model = createNPCModel(npc);
      this.game.scene.add(model.root);
      this.npcs.push({ ...npc, ...model, phase: rand(0, Math.PI * 2) });
    }

    for (const chest of CHESTS) {
      const model = createChestModel(chest);
      this.game.scene.add(model.root);
      this.chests.push({ ...chest, ...model, phase: rand(0, Math.PI * 2) });
    }
  }

  bindUI() {
    this.dom.inventoryBtn?.addEventListener('click', () => this.toggleInventory());
    this.dom.inventoryClose?.addEventListener('click', () => this.closeInventory());
    this.dom.interactBtn?.addEventListener('pointerdown', (e) => { e.preventDefault(); this.interact(); });
    this.dom.specialBtn?.addEventListener('pointerdown', (e) => { e.preventDefault(); this.specialAttack(); });
    this.dom.dialogueNext?.addEventListener('click', () => this.nextDialogue());
    this.dom.dialogueClose?.addEventListener('click', () => this.closeDialogue());

    this.dom.inventoryWeapons?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-weapon-id]');
      if (!button || button.disabled) return;
      if (this.game.equipWeapon(button.dataset.weaponId)) {
        this.renderInventory();
        this.closeInventory();
      }
    });
  }

  syncState() {
    this.ensureState();
    const opened = new Set(this.game.state.openedChests);
    for (const chest of this.chests) {
      const isOpen = opened.has(chest.id);
      chest.lidPivot.rotation.x = isOpen ? -1.05 : 0;
      chest.rune.visible = !isOpen;
    }
    this.renderInventory();
    this.updateSpecialUI();
  }

  isModalOpen() {
    return this.inventoryOpen || this.dialogueOpen || !!this.game.progression?.isModalOpen();
  }

  toggleInventory() {
    if (this.dialogueOpen) return;
    this.inventoryOpen ? this.closeInventory() : this.openInventory();
  }

  openInventory() {
    if (!this.game.active || this.game.finished) return;
    this.inventoryOpen = true;
    this.game.paused = true;
    this.renderInventory();
    this.dom.inventoryPanel?.classList.remove('hidden');
  }

  closeInventory() {
    if (!this.inventoryOpen) return;
    this.inventoryOpen = false;
    this.dom.inventoryPanel?.classList.add('hidden');
    if (!this.dialogueOpen && !this.game.progression?.isModalOpen()) {
      this.game.paused = false;
      this.game.clock.getDelta();
    }
  }

  renderInventory() {
    if (!this.dom.inventoryWeapons) return;
    const state = this.game.state;
    const unlocked = WEAPONS.filter((w) => weaponUnlocked(w, state));

    this.dom.inventoryWeapons.innerHTML = WEAPONS.map((weapon) => {
      const available = weaponUnlocked(weapon, state);
      const equipped = state.weaponId === weapon.id;
      const special = SPECIALS[weapon.id];
      return `<button class="weapon-card ${equipped ? 'equipped' : ''} ${available ? '' : 'locked'}"
          data-weapon-id="${weapon.id}" ${available ? '' : 'disabled'}>
        <span class="weapon-icon">${weapon.icon}</span>
        <span class="weapon-copy">
          <strong>${weapon.name}</strong>
          <small>Daño ${weapon.damage} · Alcance ${weapon.range.toFixed(1)} · Crítico ${Math.round(weapon.crit * 100)}%</small>
          <em>${special.icon} ${special.name}</em>
        </span>
        <b>${equipped ? 'EQUIPADA' : available ? 'EQUIPAR' : 'BLOQUEADA'}</b>
      </button>`;
    }).join('');

    const materials = [
      ['Polvo de Éter', '✧', state.inventory.aetherDust],
      ['Fragmento Lunar', '☽', state.inventory.moonShards],
      ['Núcleo de Brasa', '🔥', state.inventory.emberCores],
      ['Sello Antiguo', '◆', state.inventory.ancientSeals],
      ['Pociones', '✚', state.potions]
    ];
    this.dom.inventoryMaterials.innerHTML = materials.map(([name, icon, count]) =>
      `<div class="material-card"><span>${icon}</span><div><strong>${name}</strong><small>x${count}</small></div></div>`
    ).join('');

    this.dom.inventoryStats.innerHTML = `
      <div><b>${unlocked.length}/${WEAPONS.length}</b><span>ARMAS</span></div>
      <div><b>${state.chestsOpened}/${CHESTS.length}</b><span>COFRES</span></div>
      <div><b>${state.kills}</b><span>VICTORIAS</span></div>
      <div><b>${state.gold}</b><span>ESENCIA</span></div>`;
  }

  updateSpecialUI() {
    const special = SPECIALS[this.game.state.weaponId] || SPECIALS['aether-blade'];
    if (this.dom.specialName) this.dom.specialName.textContent = special.name;
    if (this.dom.specialCooldown) {
      this.dom.specialCooldown.textContent = this.specialCooldown > 0 ? this.specialCooldown.toFixed(1) : special.icon;
    }
    this.dom.specialBtn?.classList.toggle('cooldown', this.specialCooldown > 0);
  }

  update(dt) {
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    if (this.comboWindow <= 0) this.comboStep = -1;
    this.updateEffects(dt);
    this.updateWorldInteractions();
    this.updateStatuses(dt);
    this.updateSpecialUI();

    for (const npc of this.npcs) {
      npc.root.position.y = Math.sin(this.game.elapsed * 1.4 + npc.phase) * .025;
      npc.ring.rotation.z += dt * .35;
      npc.gem.rotation.y += dt * 1.2;
    }
    for (const chest of this.chests) {
      if (!this.game.state.openedChests.includes(chest.id)) {
        chest.rune.rotation.y += dt * 1.6;
        chest.rune.position.y = .62 + Math.sin(this.game.elapsed * 2.4 + chest.phase) * .05;
      }
    }
  }

  updateWorldInteractions() {
    if (!this.game.active || this.game.finished || this.isModalOpen()) {
      this.nearby = null;
      this.dom.interactBtn?.classList.add('hidden');
      this.dom.interactPrompt?.classList.add('hidden');
      return;
    }

    let nearest = null;
    let nearestDistance = Infinity;
    for (const npc of this.npcs) {
      const d = dist2D(this.game.player.position, npc.root.position);
      if (d < 2.35 && d < nearestDistance) {
        nearest = { type: 'npc', item: npc, label: `Hablar con ${npc.name}` };
        nearestDistance = d;
      }
    }
    for (const chest of this.chests) {
      if (this.game.state.openedChests.includes(chest.id)) continue;
      const d = dist2D(this.game.player.position, chest.root.position);
      if (d < 2.05 && d < nearestDistance) {
        nearest = { type: 'chest', item: chest, label: `Abrir ${chest.name}` };
        nearestDistance = d;
      }
    }

    const external = this.game.progression?.getNearbyInteractable();
    if (external && external.distance < nearestDistance) nearest = external;

    this.nearby = nearest;
    this.dom.interactBtn?.classList.toggle('hidden', !nearest);
    this.dom.interactPrompt?.classList.toggle('hidden', !nearest);
    if (nearest && this.dom.interactPrompt) this.dom.interactPrompt.textContent = `F · ${nearest.label}`;
  }

  interact() {
    if (!this.nearby) return;
    if (this.nearby.type === 'npc') this.openDialogue(this.nearby.item);
    else if (this.nearby.type === 'merchant') this.game.progression?.interactMerchant();
    else this.openChest(this.nearby.item);
  }

  openChest(chest) {
    if (this.game.state.openedChests.includes(chest.id)) return;
    this.game.state.openedChests.push(chest.id);
    this.game.state.chestsOpened += 1;
    chest.lidPivot.rotation.x = -1.05;
    chest.rune.visible = false;

    const loot = chest.loot;
    if (loot.gold) this.game.state.gold += loot.gold;
    if (loot.potions) this.game.state.potions += loot.potions;
    if (loot.aetherDust) this.game.state.inventory.aetherDust += loot.aetherDust;
    if (loot.moonShards) this.game.state.inventory.moonShards += loot.moonShards;
    if (loot.emberCores) this.game.state.inventory.emberCores += loot.emberCores;
    if (loot.ancientSeals) this.game.state.inventory.ancientSeals += loot.ancientSeals;

    const parts = [];
    if (loot.gold) parts.push(`${loot.gold} esencia`);
    if (loot.potions) parts.push(`${loot.potions} poción${loot.potions > 1 ? 'es' : ''}`);
    if (loot.aetherDust) parts.push(`${loot.aetherDust} polvo de éter`);
    if (loot.moonShards) parts.push(`${loot.moonShards} fragmento lunar`);
    if (loot.emberCores) parts.push(`${loot.emberCores} núcleo de brasa`);
    if (loot.ancientSeals) parts.push(`${loot.ancientSeals} sello antiguo`);

    this.spawnBurst(chest.root.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xfbbf24, 22, 1.3);
    this.spawnRing(chest.root.position.clone(), 0x67e8f9, 2.2);
    this.toast(`Cofre abierto: ${parts.join(' · ')}`);
    this.vibrate([20, 30, 35]);
    this.game.progression?.recordChest();
    this.renderInventory();
    this.game.updateUI();
    this.game.save();
  }

  openDialogue(npc) {
    this.dialogueNpc = npc;
    const story = this.game.storyKey || 'intro';
    this.dialogueLines = DIALOGUE[npc.id]?.[story] || DIALOGUE[npc.id]?.intro || [];
    this.dialogueIndex = 0;
    this.dialogueOpen = true;
    this.game.paused = true;
    this.dom.dialogue?.classList.remove('hidden');
    this.dom.dialogueName.textContent = npc.name;
    this.dom.dialogueRole.textContent = npc.role;
    this.renderDialogue();
  }

  renderDialogue() {
    const line = this.dialogueLines[this.dialogueIndex] || '...';
    this.dom.dialogueText.textContent = line;
    this.dom.dialogueNext.textContent = this.dialogueIndex >= this.dialogueLines.length - 1 ? 'Terminar' : 'Continuar';
  }

  nextDialogue() {
    if (!this.dialogueOpen) return;
    if (this.dialogueIndex < this.dialogueLines.length - 1) {
      this.dialogueIndex += 1;
      this.renderDialogue();
      return;
    }
    this.grantNpcReward(this.dialogueNpc);
    this.closeDialogue();
  }

  grantNpcReward(npc) {
    if (!npc) return;
    this.game.progression?.recordTalk(npc.id);
    if (this.game.state.npcRewards.includes(npc.id)) return;
    this.game.state.npcRewards.push(npc.id);
    if (npc.id === 'liora') {
      this.game.state.potions += 1;
      this.game.state.inventory.aetherDust += 1;
      this.toast('Liora te entrega 1 poción y Polvo de Éter.');
    } else {
      this.game.state.gold += 30;
      this.game.state.inventory.ancientSeals += 1;
      this.toast('Eldren te entrega 30 esencia y un Sello Antiguo.');
    }
    this.renderInventory();
    this.game.updateUI();
    this.game.save();
  }

  closeDialogue() {
    if (!this.dialogueOpen) return;
    this.dialogueOpen = false;
    this.dialogueNpc = null;
    this.dom.dialogue?.classList.add('hidden');
    if (!this.inventoryOpen && !this.game.progression?.isModalOpen()) {
      this.game.paused = false;
      this.game.clock.getDelta();
    }
  }

  basicAttack() {
    const game = this.game;
    if (!game.active || game.paused || game.finished || game.attackTimer > 0) return;
    const weapon = game.currentWeapon();

    this.comboStep = this.comboWindow > 0 ? (this.comboStep + 1) % 4 : 0;
    this.comboWindow = .82;
    const step = this.comboStep;
    game.attackTimer = weapon.cooldown * [0.82, .76, .92, 1.08][step];
    this.combatAnim = { kind: 'basic', step, weaponId: weapon.id, t: 0, duration: game.attackTimer + .12 };
    this.vibrate(step === 3 ? 32 : 16);

    const forward = game.lastMove.clone().setY(0).normalize();
    const range = weapon.range * COMBO_RANGE[step];
    const baseDamage = (weapon.damage + (game.state.level - 1) * 6) * COMBO_MULT[step];
    let hit = false;

    for (const enemy of [...game.enemies]) {
      const delta = enemy.group.position.clone().sub(game.player.position).setY(0);
      const distance = delta.length();
      if (distance > range) continue;
      const dot = delta.normalize().dot(forward);
      if (dot < COMBO_DOT[step]) continue;
      const bonusCrit = this.game.progression?.getStats().critBonus || 0;
      const critical = Math.random() < weapon.crit + bonusCrit + (step === 3 ? .06 : 0);
      let damage = baseDamage * (critical ? 1.75 : 1);
      damage = this.game.progression?.outgoingDamage(damage, enemy, critical) ?? damage;
      this.applyDamage(enemy, Math.round(damage), { critical, color: weapon.glow });
      hit = true;
    }

    const fxPos = game.player.position.clone().add(forward.multiplyScalar(1.25)).add(new THREE.Vector3(0, 1, 0));
    this.spawnBurst(fxPos, weapon.glow, 7 + step * 2, .75 + step * .12);
    if (step === 3) this.spawnRing(game.player.position.clone(), weapon.glow, 2.7);
    if (hit) this.vibrate(step === 3 ? [24, 24, 40] : 28);
  }

  specialAttack() {
    const game = this.game;
    if (!game.active || game.paused || game.finished) return;
    const weapon = game.currentWeapon();
    const special = SPECIALS[weapon.id];
    if (this.specialCooldown > 0) {
      this.toast(`${special.name}: ${this.specialCooldown.toFixed(1)} s`);
      return;
    }

    this.specialCooldown = special.cooldown * (this.game.progression?.getStats().specialCooldownMultiplier || 1);
    this.combatAnim = { kind: 'special', step: 0, weaponId: weapon.id, t: 0, duration: .72 };
    game.attackTimer = Math.max(game.attackTimer, .62);
    const forward = game.lastMove.clone().setY(0).normalize();
    const origin = game.player.position.clone();
    const base = weapon.damage + (game.state.level - 1) * 7;
    let targets = [];
    let multiplier = 1.8;

    if (weapon.id === 'aether-blade') {
      multiplier = 1.85;
      targets = this.targetsInCone(4.8, -.3);
      this.spawnArc(origin, weapon.glow, 4.4);
    } else if (weapon.id === 'ember-axe') {
      multiplier = 2.15;
      targets = this.targetsInCone(3.7, -.65);
      this.spawnRing(origin, weapon.glow, 3.8);
      for (const enemy of targets) enemy.burn = { ttl: 2.8, tick: .35, damage: Math.max(3, Math.round(base * .08)) };
    } else if (weapon.id === 'moon-spear') {
      multiplier = 2.05;
      targets = this.targetsInLine(7.0, .83);
      this.spawnTrail(origin, forward, weapon.glow, 7);
    } else if (weapon.id === 'rift-daggers') {
      const candidates = [...game.enemies].filter((e) => dist2D(e.group.position, origin) < 4.5)
        .sort((a, b) => dist2D(a.group.position, origin) - dist2D(b.group.position, origin));
      const target = candidates[0];
      if (target) {
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            if (!target.group.parent || target.hp <= 0 || !game.active) return;
            const crit = Math.random() < weapon.crit + (game.progression?.getStats().critBonus || 0);
            let strikeDamage = base * .48 * (crit ? 1.45 : 1);
            strikeDamage = game.progression?.outgoingDamage(strikeDamage, target, crit) ?? strikeDamage;
            this.applyDamage(target, Math.round(strikeDamage), { critical: crit, color: weapon.glow, quiet: i < 4 });
            this.spawnBurst(target.group.position.clone().add(new THREE.Vector3(0, 1.3, 0)), weapon.glow, 5, .6);
          }, i * 78);
        }
      }
      targets = [];
      multiplier = 0;
    } else if (weapon.id === 'sun-hammer') {
      multiplier = 2.5;
      targets = [...game.enemies].filter((e) => dist2D(e.group.position, origin) < 4.4);
      this.spawnRing(origin, weapon.glow, 4.6);
      for (const enemy of targets) {
        const push = enemy.group.position.clone().sub(origin).setY(0).normalize();
        enemy.group.position.addScaledVector(push, enemy.isBoss ? .8 : 1.8);
      }
    } else if (weapon.id === 'eclipse-glaive') {
      multiplier = 1.95;
      targets = [...game.enemies].filter((e) => dist2D(e.group.position, origin) < 5.1);
      this.spawnRing(origin, weapon.glow, 5.3);
    }

    let totalDamage = 0;
    for (const enemy of targets) {
      const critical = Math.random() < weapon.crit + (game.progression?.getStats().critBonus || 0) + .08;
      let damage = base * multiplier * (critical ? 1.55 : 1);
      damage = game.progression?.outgoingDamage(damage, enemy, critical) ?? damage;
      damage = Math.round(damage);
      totalDamage += damage;
      this.applyDamage(enemy, damage, { critical, color: weapon.glow });
    }

    if (weapon.id === 'eclipse-glaive' && totalDamage > 0) {
      const heal = Math.min(Math.round(totalDamage * .08), Math.round(game.state.maxHp * .22));
      game.state.hp = Math.min(game.state.maxHp, game.state.hp + heal);
      this.showFloatingText(game.player.position.clone().add(new THREE.Vector3(0, 2.6, 0)), `+${heal}`, '#86efac', true);
    }

    this.spawnBurst(origin.clone().add(new THREE.Vector3(0, 1.2, 0)), weapon.glow, 28, 1.55);
    this.toast(`${special.icon} ${special.name}`);
    this.vibrate([30, 30, 48]);
    game.updateUI();
  }

  targetsInCone(range, dotLimit) {
    const game = this.game;
    const forward = game.lastMove.clone().setY(0).normalize();
    return [...game.enemies].filter((enemy) => {
      const delta = enemy.group.position.clone().sub(game.player.position).setY(0);
      const d = delta.length();
      if (d > range) return false;
      return delta.normalize().dot(forward) >= dotLimit;
    });
  }

  targetsInLine(range, dotLimit) {
    return this.targetsInCone(range, dotLimit);
  }

  applyDamage(enemy, damage, { critical = false, color = 0xffffff, quiet = false } = {}) {
    if (!enemy || enemy.hp <= 0 || !enemy.group.parent) return;
    const game = this.game;
    enemy.hp -= damage;
    enemy.bodyMat.emissiveIntensity = critical ? 3.6 : 2.4;
    const baseScale = enemy.isBoss ? 1.72 : (enemy.archetype.scale || 1);
    enemy.group.scale.setScalar(baseScale * 1.06);

    this.showFloatingText(
      enemy.group.position.clone().add(new THREE.Vector3(0, enemy.isBoss ? 3.3 : 2.35, 0)),
      `${critical ? '✦ ' : ''}${damage}`,
      critical ? '#fde68a' : '#f8fafc',
      critical
    );
    this.spawnBurst(enemy.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), color, critical ? 13 : 7, critical ? 1.0 : .65);

    setTimeout(() => {
      if (!enemy.group.parent) return;
      enemy.group.scale.setScalar(baseScale);
      enemy.bodyMat.emissiveIntensity = enemy.isBoss ? .7 : .28;
    }, 110);

    if (critical) game.progression?.onCriticalDamage(damage);
    if (enemy.hp <= 0) game.killEnemy(enemy);
    else if (!quiet) game.updateUI();
  }

  updateStatuses(dt) {
    for (const enemy of [...this.game.enemies]) {
      if (!enemy.burn || enemy.hp <= 0) continue;
      enemy.burn.ttl -= dt;
      enemy.burn.tick -= dt;
      if (enemy.burn.tick <= 0) {
        enemy.burn.tick = .45;
        this.applyDamage(enemy, enemy.burn.damage, { color: 0xf97316, quiet: true });
      }
      if (enemy.burn.ttl <= 0) enemy.burn = null;
    }
  }

  updateCombatAnimation(dt, moving) {
    const g = this.game;
    const socket = g.weaponSocket;
    const rig = g.heroRig;
    const basePos = new THREE.Vector3(.62, 1.08, -.08);

    if (!this.combatAnim) {
      socket.position.lerp(basePos, .24);
      socket.rotation.x = THREE.MathUtils.lerp(socket.rotation.x, -.12, .22);
      socket.rotation.y = THREE.MathUtils.lerp(socket.rotation.y, 0, .22);
      socket.rotation.z = THREE.MathUtils.lerp(socket.rotation.z, -.55, .22);
      if (!moving) {
        rig.armL.rotation.z = THREE.MathUtils.lerp(rig.armL.rotation.z, 0, .2);
        rig.armR.rotation.z = THREE.MathUtils.lerp(rig.armR.rotation.z, 0, .2);
      }
      return;
    }

    const a = this.combatAnim;
    a.t += dt;
    const p = Math.min(1, a.t / a.duration);
    const wave = Math.sin(p * Math.PI);
    const weaponId = a.weaponId;

    if (a.kind === 'basic') {
      const step = a.step;
      if (weaponId === 'moon-spear') {
        socket.position.z = -.08 - wave * (1.05 + step * .12);
        socket.rotation.x = -.05 + wave * .18;
        socket.rotation.z = -.48;
        rig.armR.rotation.x = -wave * .95;
      } else if (weaponId === 'rift-daggers') {
        socket.rotation.z = -.45 + Math.sin(p * Math.PI * (step % 2 ? -1 : 1)) * 1.8;
        socket.rotation.y = wave * (step % 2 ? -.75 : .75);
        rig.armL.rotation.z = wave * (step % 2 ? .9 : -.9);
        rig.armR.rotation.z = -rig.armL.rotation.z;
      } else if (weaponId === 'ember-axe' || weaponId === 'sun-hammer') {
        socket.rotation.x = -.15 - wave * (step === 3 ? 2.3 : 1.65);
        socket.rotation.z = -.5 + Math.sin(p * Math.PI * 2) * .35;
        socket.position.y = 1.08 + wave * .42;
        rig.armR.rotation.x = -wave * 1.15;
      } else if (weaponId === 'eclipse-glaive') {
        socket.rotation.y = p * Math.PI * 2 * (step === 3 ? 1.35 : .72);
        socket.rotation.z = -.55 - wave * 1.25;
        rig.armL.rotation.z = wave * .55;
      } else {
        const direction = step % 2 ? 1 : -1;
        socket.rotation.z = -.55 + direction * wave * (step === 3 ? 2.3 : 1.7);
        socket.rotation.x = -.12 - wave * (step === 2 ? .85 : .32);
        rig.armR.rotation.z = direction * wave * .55;
      }

      if (step === 3) {
        g.player.position.addScaledVector(g.lastMove, dt * 1.15);
        rig.cape.rotation.x = .12 + wave * .18;
      }
    } else {
      if (weaponId === 'moon-spear') {
        socket.position.z = -.08 - wave * 1.7;
        socket.rotation.z = -.35;
        rig.armR.rotation.x = -wave * 1.35;
      } else if (weaponId === 'rift-daggers') {
        socket.rotation.y = p * Math.PI * 7;
        socket.rotation.z = -.55 + Math.sin(p * Math.PI * 5) * 1.3;
        rig.armL.rotation.z = Math.sin(p * Math.PI * 6) * .9;
        rig.armR.rotation.z = -rig.armL.rotation.z;
      } else if (weaponId === 'ember-axe' || weaponId === 'sun-hammer') {
        socket.position.y = 1.08 + wave * .75;
        socket.rotation.x = -.12 - p * Math.PI * 2.5;
        rig.armR.rotation.x = -wave * 1.5;
      } else {
        socket.rotation.y = p * Math.PI * 4;
        socket.rotation.z = -.55 - wave * 1.65;
        rig.armL.rotation.z = wave * .8;
        rig.armR.rotation.z = -wave * .5;
      }
      rig.cape.rotation.x = .16 + wave * .3;
    }

    if (p >= 1) {
      this.combatAnim = null;
      rig.armL.rotation.z = 0;
      rig.armR.rotation.z = 0;
    }
  }

  spawnBurst(position, color, count = 10, force = .8) {
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      velocities.push(new THREE.Vector3(rand(-1,1), rand(.1,1.2), rand(-1,1)).normalize().multiplyScalar(rand(.8,2.2) * force));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: .12, transparent: true, opacity: .95, sizeAttenuation: true });
    const points = new THREE.Points(geo, mat);
    this.game.scene.add(points);
    this.effects.push({ type: 'burst', object: points, geo, mat, velocities, ttl: .55, maxTtl: .55 });
  }

  spawnRing(position, color, radius = 3) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .78, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(.82, 1, 40), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position).setY(.08);
    this.game.scene.add(ring);
    this.effects.push({ type: 'ring', object: ring, mat, ttl: .55, maxTtl: .55, radius });
  }

  spawnArc(position, color, radius = 4) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .78, side: THREE.DoubleSide, depthWrite: false });
    const arc = new THREE.Mesh(new THREE.RingGeometry(radius * .65, radius * .72, 38, 1, -.95, 1.9), mat);
    arc.rotation.x = -Math.PI / 2;
    arc.position.copy(position).setY(.12);
    arc.rotation.z = Math.atan2(-this.game.lastMove.x, -this.game.lastMove.z);
    this.game.scene.add(arc);
    this.effects.push({ type: 'fade', object: arc, mat, ttl: .38, maxTtl: .38 });
  }

  spawnTrail(position, direction, color, length = 6) {
    for (let i = 1; i <= 8; i++) {
      const p = position.clone().addScaledVector(direction, (length / 8) * i).add(new THREE.Vector3(0, .8, 0));
      this.spawnBurst(p, color, 2, .25);
    }
  }

  updateEffects(dt) {
    for (const effect of [...this.effects]) {
      effect.ttl -= dt;
      const life = Math.max(0, effect.ttl / effect.maxTtl);
      effect.mat.opacity = life;

      if (effect.type === 'burst') {
        const attr = effect.geo.getAttribute('position');
        for (let i = 0; i < effect.velocities.length; i++) {
          const v = effect.velocities[i];
          v.y -= 2.4 * dt;
          attr.array[i * 3] += v.x * dt;
          attr.array[i * 3 + 1] += v.y * dt;
          attr.array[i * 3 + 2] += v.z * dt;
        }
        attr.needsUpdate = true;
      } else if (effect.type === 'ring') {
        const progress = 1 - life;
        const scale = .25 + progress * effect.radius;
        effect.object.scale.setScalar(scale);
      }

      if (effect.ttl <= 0) {
        this.game.scene.remove(effect.object);
        effect.geo?.dispose?.();
        effect.mat?.dispose?.();
        this.effects = this.effects.filter((e) => e !== effect);
      }
    }
  }

  showFloatingText(worldPosition, text, color = '#fff', strong = false) {
    if (!this.dom.damageLayer) return;
    const projected = worldPosition.clone().project(this.game.camera);
    const x = (projected.x * .5 + .5) * window.innerWidth;
    const y = (-projected.y * .5 + .5) * window.innerHeight;
    const el = document.createElement('div');
    el.className = `damage-number ${strong ? 'critical' : ''}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    this.dom.damageLayer.appendChild(el);
    setTimeout(() => el.remove(), 780);
  }
}

export { SPECIALS, CHESTS, NPCS };
