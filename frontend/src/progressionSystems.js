import * as THREE from 'three';

export const ARMORS = [
  { id:'wanderer-mail', name:'Malla del Viajero', slot:'chest', icon:'🥋', price:45, rarity:'Común', stats:{str:1,def:2,crit:0}, color:0x2563eb },
  { id:'moon-hood', name:'Capucha Lunar', slot:'head', icon:'🌙', price:70, rarity:'Rara', stats:{str:0,def:1,crit:0.03}, color:0x7c3aed },
  { id:'ember-sigil', name:'Sello de Brasa', slot:'charm', icon:'🔥', price:85, rarity:'Raro', stats:{str:3,def:0,crit:0.01}, color:0xea580c },
  { id:'guardian-plate', name:'Coraza del Guardián', slot:'chest', icon:'🛡', price:150, rarity:'Épica', stats:{str:2,def:7,crit:0}, color:0x475569 },
  { id:'eclipse-crown', name:'Corona del Eclipse', slot:'head', icon:'👑', price:180, rarity:'Épica', stats:{str:1,def:2,crit:0.06}, color:0x9333ea },
  { id:'ashen-heart', name:'Corazón de Ceniza', slot:'charm', icon:'💠', price:210, rarity:'Legendaria', stats:{str:5,def:3,crit:0.03}, color:0xdc2626 }
];

export const SKILLS = [
  { id:'might-1', name:'Fuerza del Umbral', icon:'⚔', cost:1, desc:'+12% daño físico.', requires:[], effect:{damage:0.12} },
  { id:'guard-1', name:'Piel de Guardián', icon:'🛡', cost:1, desc:'+10% reducción de daño.', requires:[], effect:{reduction:0.10} },
  { id:'precision-1', name:'Ojo Lunar', icon:'✦', cost:1, desc:'+5% probabilidad crítica.', requires:[], effect:{crit:0.05} },
  { id:'might-2', name:'Golpe del Eclipse', icon:'☾', cost:2, desc:'+18% daño adicional.', requires:['might-1'], effect:{damage:0.18} },
  { id:'specialist', name:'Canalización', icon:'✧', cost:2, desc:'Especiales recuperan 18% más rápido.', requires:['precision-1'], effect:{specialCooldown:-0.18} },
  { id:'fortress', name:'Último Bastión', icon:'◆', cost:2, desc:'+35 vida máxima y +8% defensa.', requires:['guard-1'], effect:{hp:35,reduction:0.08} },
  { id:'executioner', name:'Verdugo', icon:'⚡', cost:3, desc:'+25% daño contra enemigos bajo 35% de vida.', requires:['might-2'], effect:{execute:0.25} },
  { id:'blood-eclipse', name:'Sangre del Eclipse', icon:'♥', cost:3, desc:'Recupera 3% del daño crítico como vida.', requires:['specialist','fortress'], effect:{critLeech:0.03} }
];

export const QUESTS = [
  { id:'main-eclipse', kind:'main', title:'Fragmentos del Eclipse', desc:'Reúne 6 fragmentos y derrota a Vharok.', target:1, reward:'Acceso a las Tierras de Ceniza' },
  { id:'main-ashes', kind:'main', title:'Tras el Umbral', desc:'Entra en las Tierras de Ceniza y derrota 6 criaturas.', target:6, reward:'Capítulo II completado' },
  { id:'shade-hunter', kind:'side', title:'Cazador de Sombras', desc:'Derrota 6 Sombras Errantes.', target:6, reward:'60 esencia + 1 punto de habilidad' },
  { id:'treasure-hunter', kind:'side', title:'Reliquias perdidas', desc:'Abre 4 cofres antiguos.', target:4, reward:'Coraza del Guardián' },
  { id:'old-voices', kind:'side', title:'Voces antiguas', desc:'Habla con Liora y Eldren.', target:2, reward:'45 esencia + 1 punto de habilidad' },
  { id:'ash-hunt', kind:'side', title:'Plaga de Ceniza', desc:'Derrota 3 Arqueros de Ceniza.', target:3, reward:'Corazón de Ceniza' }
];

const SLOT_LABELS = { head:'Cabeza', chest:'Armadura', charm:'Talismán' };

function mat(color, emissive=0, intensity=0, roughness=.65, metalness=.15) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity:intensity, roughness, metalness });
}

function createMerchant() {
  const root = new THREE.Group();
  const cloth = mat(0x92400e);
  const leather = mat(0x422006);
  const gold = mat(0xf59e0b,0x78350f,.5,.3,.7);
  const skin = mat(0xd6a37f);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.4,.82,5,9), cloth);
  body.position.y=1.05; body.castShadow=true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.34,14,10), skin);
  head.position.y=1.92; head.castShadow=true;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(.48,.42,10), leather);
  hat.position.y=2.22; hat.castShadow=true;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(.7,.85,.38), leather);
  pack.position.set(0,1.12,.42); pack.castShadow=true;
  const coin = new THREE.Mesh(new THREE.TorusGeometry(.17,.05,8,18),gold);
  coin.position.set(0,2.72,0); coin.rotation.x=Math.PI/2;
  root.add(body,head,hat,pack,coin);
  root.position.set(7.5,0,4.8);
  return {root,coin};
}

export class ProgressionSystems {
  constructor(game,{toast,vibrate}) {
    this.game=game;
    this.toast=toast;
    this.vibrate=vibrate;
    this.panelOpen=null;
    this.ensureState();
    const merchant=createMerchant();
    this.merchant={id:'bram',name:'Bram',role:'Herrero del Santuario',...merchant};
    this.game.scene.add(merchant.root);
    this.bindUI();
    this.renderAll();
  }

  ensureState() {
    const s=this.game.state;
    s.skillPoints=Number(s.skillPoints ?? Math.max(0,(s.level||1)-1));
    s.unlockedSkills=Array.isArray(s.unlockedSkills)?s.unlockedSkills:[];
    s.ownedArmor=Array.isArray(s.ownedArmor)?s.ownedArmor:['wanderer-mail'];
    s.equipment={head:null,chest:'wanderer-mail',charm:null,...(s.equipment||{})};
    s.questProgress={
      shadeKills:0,chests:0,talked:[],ashKills:0,ashArchers:0,enteredAshes:false,
      completed:[],...(s.questProgress||{})
    };
    s.questProgress.chests=Math.max(s.questProgress.chests||0,s.chestsOpened||0);
    for(const npcId of (s.npcRewards||[])) if(!s.questProgress.talked.includes(npcId)) s.questProgress.talked.push(npcId);
    s.statsVersion=1;
    this.recomputeMaxHp();
    this.applyEquipmentVisual();
  }

  getStats() {
    this.ensureState();
    const s=this.game.state;
    const armorStats={str:0,def:0,crit:0};
    for (const id of Object.values(s.equipment)) {
      const item=ARMORS.find(a=>a.id===id);
      if (!item) continue;
      armorStats.str += item.stats.str||0;
      armorStats.def += item.stats.def||0;
      armorStats.crit += item.stats.crit||0;
    }

    const effects={damage:0,reduction:0,crit:0,hp:0,specialCooldown:0,execute:0,critLeech:0};
    for (const id of s.unlockedSkills) {
      const skill=SKILLS.find(x=>x.id===id);
      if (!skill) continue;
      for (const [key,val] of Object.entries(skill.effect)) effects[key]=(effects[key]||0)+val;
    }

    return {
      str:10+(s.level-1)*2+armorStats.str,
      def:2+armorStats.def,
      critBonus:armorStats.crit+effects.crit,
      damageMultiplier:1+effects.damage,
      reduction:Math.min(.65, effects.reduction + armorStats.def*.012),
      maxHpBonus:effects.hp,
      specialCooldownMultiplier:Math.max(.55,1+effects.specialCooldown),
      executeBonus:effects.execute,
      critLeech:effects.critLeech
    };
  }

  recomputeMaxHp() {
    const s=this.game.state;
    if (!s) return;
    const skillHp=(s.unlockedSkills||[]).reduce((sum,id)=>sum+(SKILLS.find(x=>x.id===id)?.effect.hp||0),0);
    const expected=100+Math.max(0,(s.level||1)-1)*18+skillHp;
    if (s.maxHp !== expected) {
      const ratio=s.maxHp ? s.hp/s.maxHp : 1;
      s.maxHp=expected;
      s.hp=Math.min(expected,Math.max(1,Math.round(expected*ratio)));
    }
  }

  outgoingDamage(base, enemy, critical=false) {
    const st=this.getStats();
    let dmg=base*(1+st.str*0.025)*st.damageMultiplier;
    if (enemy && enemy.hp/enemy.maxHp<.35) dmg*=1+st.executeBonus;
    if (critical) dmg*=1;
    return dmg;
  }

  incomingDamage(raw) {
    const st=this.getStats();
    const flat=Math.min(raw*.45, st.def*.55);
    return Math.max(1, raw*(1-st.reduction)-flat);
  }

  onCriticalDamage(amount) {
    const leech=this.getStats().critLeech;
    if (!leech || amount<=0) return;
    const heal=Math.max(1,Math.round(amount*leech));
    this.game.state.hp=Math.min(this.game.state.maxHp,this.game.state.hp+heal);
    this.game.rpg?.showFloatingText(this.game.player.position.clone().add(new THREE.Vector3(0,2.4,0)),`+${heal}`,'#86efac');
  }

  onLevelUp() {
    this.game.state.skillPoints=(this.game.state.skillPoints||0)+1;
    this.recomputeMaxHp();
    this.toast('Ganaste 1 punto de habilidad.');
    this.renderAll();
  }

  getNearbyInteractable() {
    const d=Math.hypot(this.game.player.position.x-this.merchant.root.position.x,this.game.player.position.z-this.merchant.root.position.z);
    if (d<2.4) return {type:'merchant',item:this.merchant,label:'Comerciar con Bram',distance:d};
    return null;
  }

  interactMerchant() { this.openShop(); }

  bindUI() {
    const $=id=>document.getElementById(id);
    $('character-btn')?.addEventListener('click',()=>this.togglePanel('character'));
    $('quests-btn')?.addEventListener('click',()=>this.togglePanel('quests'));
    $('character-close')?.addEventListener('click',()=>this.closePanels());
    $('quests-close')?.addEventListener('click',()=>this.closePanels());
    $('shop-close')?.addEventListener('click',()=>this.closePanels());

    $('armor-grid')?.addEventListener('click',(e)=>{
      const btn=e.target.closest('[data-armor-id]');
      if (btn) this.equipArmor(btn.dataset.armorId);
    });

    $('skill-grid')?.addEventListener('click',(e)=>{
      const btn=e.target.closest('[data-skill-id]');
      if (btn) this.unlockSkill(btn.dataset.skillId);
    });

    $('shop-items')?.addEventListener('click',(e)=>{
      const btn=e.target.closest('[data-buy-id]');
      if (btn) this.buy(btn.dataset.buyId);
    });
  }

  togglePanel(kind) {
    if (this.panelOpen===kind) return this.closePanels();
    this.openPanel(kind);
  }

  openPanel(kind) {
    if (!this.game.active||this.game.finished) return;
    this.closePanels(false);
    this.panelOpen=kind;
    this.game.paused=true;
    const id=kind==='character'?'character-panel':kind==='quests'?'quests-panel':'shop-panel';
    document.getElementById(id)?.classList.remove('hidden');
    this.renderAll();
  }

  openShop() { this.openPanel('shop'); }

  closePanels(resume=true) {
    for (const id of ['character-panel','quests-panel','shop-panel']) document.getElementById(id)?.classList.add('hidden');
    this.panelOpen=null;
    if (resume && !this.game.rpg?.isModalOpen()) {
      this.game.paused=false;
      this.game.clock.getDelta();
    }
  }

  isModalOpen(){ return !!this.panelOpen; }

  equipArmor(id) {
    const s=this.game.state;
    const item=ARMORS.find(a=>a.id===id);
    if (!item||!s.ownedArmor.includes(id)) return;
    s.equipment[item.slot]=id;
    this.recomputeMaxHp();
    this.applyEquipmentVisual();
    this.toast(`${item.icon} ${item.name} equipada`);
    this.renderAll();
    this.game.updateUI();
    this.game.save();
  }

  applyEquipmentVisual() {
    const rig=this.game.heroRig;
    if(!rig) return;
    const s=this.game.state;
    const chest=ARMORS.find(a=>a.id===s.equipment?.chest);
    const head=ARMORS.find(a=>a.id===s.equipment?.head);
    const charm=ARMORS.find(a=>a.id===s.equipment?.charm);

    if(chest){
      rig.torso.material.color.setHex(chest.color);
      rig.shoulderL.material.color.setHex(chest.color);
      rig.shoulderR.material.color.setHex(chest.color);
      rig.chest.material.emissive.setHex(chest.id==='guardian-plate'?0x334155:0x000000);
      rig.chest.material.emissiveIntensity=chest.id==='guardian-plate'?.35:0;
    } else {
      rig.torso.material.color.setHex(0x1d4ed8);
    }

    rig.hair.material.color.setHex(0x241a17);
    rig.brow.material.color.setHex(0x33231d);
    if (rig.hoodGear) {
      rig.hoodGear.visible = head?.id === 'moon-hood';
      rig.hoodGear.material.color.setHex(head?.color ?? 0x334155);
    }
    if (rig.crownGear) {
      rig.crownGear.visible = head?.id === 'eclipse-crown';
      rig.crownGear.traverse(obj => {
        if (obj.isMesh) {
          obj.material.color.setHex(head?.color ?? 0x8d949c);
          obj.material.emissive?.setHex(head?.id === 'eclipse-crown' ? 0x581c87 : 0x000000);
          if ('emissiveIntensity' in obj.material) obj.material.emissiveIntensity = head?.id === 'eclipse-crown' ? .35 : 0;
        }
      });
    }

    if(charm){
      rig.rune.material.color.setHex(charm.color);
      rig.rune.material.emissive.setHex(charm.color);
      rig.rune.material.emissiveIntensity=2.1;
    } else {
      rig.rune.material.color.setHex(0x67e8f9);
      rig.rune.material.emissive.setHex(0x0891b2);
      rig.rune.material.emissiveIntensity=1.8;
    }
  }

  buy(id) {
    const s=this.game.state;
    if (id==='potion') {
      if (s.gold<18) return this.toast('Necesitas 18 de esencia.');
      s.gold-=18; s.potions+=1;
      this.toast('Compraste una poción.');
    } else {
      const item=ARMORS.find(a=>a.id===id);
      if (!item) return;
      if (s.ownedArmor.includes(id)) return this.toast('Ya posees este objeto.');
      if (s.gold<item.price) return this.toast(`Necesitas ${item.price} de esencia.`);
      s.gold-=item.price;
      s.ownedArmor.push(id);
      this.toast(`Compraste ${item.name}.`);
    }
    this.vibrate(20);
    this.renderAll();
    this.game.rpg?.renderInventory();
    this.game.updateUI();
    this.game.save();
  }

  unlockSkill(id) {
    const s=this.game.state;
    const skill=SKILLS.find(x=>x.id===id);
    if (!skill||s.unlockedSkills.includes(id)) return;
    if (!skill.requires.every(req=>s.unlockedSkills.includes(req))) return this.toast('Primero desbloquea la habilidad anterior.');
    if (s.skillPoints<skill.cost) return this.toast(`Necesitas ${skill.cost} punto(s) de habilidad.`);
    s.skillPoints-=skill.cost;
    s.unlockedSkills.push(id);
    this.recomputeMaxHp();
    this.toast(`${skill.icon} ${skill.name} desbloqueada`);
    this.renderAll();
    this.game.updateUI();
    this.game.save();
  }

  recordKill(type) {
    const q=this.game.state.questProgress;
    if (type==='shade') q.shadeKills=(q.shadeKills||0)+1;
    if (type==='ashArcher') q.ashArchers=(q.ashArchers||0)+1;
    if (type==='ashArcher'||type==='ashHound') q.ashKills=(q.ashKills||0)+1;
    this.checkQuestRewards();
  }

  recordChest(){ this.game.state.questProgress.chests=(this.game.state.questProgress.chests||0)+1; this.checkQuestRewards(); }

  recordTalk(id) {
    const q=this.game.state.questProgress;
    if (!q.talked.includes(id)) q.talked.push(id);
    this.checkQuestRewards();
  }

  recordRegion(id) {
    if (id==='ashen-wastes') this.game.state.questProgress.enteredAshes=true;
    this.checkQuestRewards();
  }

  questValue(id) {
    const s=this.game.state,q=s.questProgress;
    if (id==='main-eclipse') return s.bossDefeated?1:0;
    if (id==='main-ashes') return q.enteredAshes?Math.min(6,q.ashKills||0):0;
    if (id==='shade-hunter') return Math.min(6,q.shadeKills||0);
    if (id==='treasure-hunter') return Math.min(4,q.chests||0);
    if (id==='old-voices') return Math.min(2,q.talked.length);
    if (id==='ash-hunt') return Math.min(3,q.ashArchers||0);
    return 0;
  }

  checkQuestRewards() {
    const s=this.game.state,q=s.questProgress;
    const complete=id=>{
      if (q.completed.includes(id)) return;
      const quest=QUESTS.find(x=>x.id===id);
      if (!quest||this.questValue(id)<quest.target) return;
      q.completed.push(id);
      if (id==='shade-hunter'){s.gold+=60;s.skillPoints+=1;}
      if (id==='treasure-hunter'&&!s.ownedArmor.includes('guardian-plate')) s.ownedArmor.push('guardian-plate');
      if (id==='old-voices'){s.gold+=45;s.skillPoints+=1;}
      if (id==='ash-hunt'&&!s.ownedArmor.includes('ashen-heart')) s.ownedArmor.push('ashen-heart');
      this.toast(`Misión completada: ${quest.title}`);
    };
    for (const quest of QUESTS) complete(quest.id);
    this.renderAll();
    this.game.updateUI();
    this.game.save();
  }

  renderAll() {
    this.ensureState();
    const $=id=>document.getElementById(id);
    const s=this.game.state, stats=this.getStats();
    if ($('stat-str')) $('stat-str').textContent=stats.str;
    if ($('stat-def')) $('stat-def').textContent=stats.def;
    if ($('stat-crit')) $('stat-crit').textContent=`${Math.round((this.game.currentWeapon().crit+stats.critBonus)*100)}%`;
    if ($('stat-hp')) $('stat-hp').textContent=s.maxHp;
    if ($('skill-points')) $('skill-points').textContent=s.skillPoints;

    const armorGrid=$('armor-grid');
    if (armorGrid) armorGrid.innerHTML=ARMORS.map(item=>{
      const owned=s.ownedArmor.includes(item.id), equipped=s.equipment[item.slot]===item.id;
      return `<button class="armor-card ${equipped?'equipped':''} ${owned?'':'locked'}" data-armor-id="${item.id}" ${owned?'':'disabled'}>
        <span class="armor-icon">${item.icon}</span>
        <span><strong>${item.name}</strong><small>${SLOT_LABELS[item.slot]} · STR +${item.stats.str} · DEF +${item.stats.def} · CRIT +${Math.round(item.stats.crit*100)}%</small><em>${item.rarity}</em></span>
        <b>${equipped?'EQUIPADA':owned?'EQUIPAR':'NO OBTENIDA'}</b>
      </button>`;
    }).join('');

    const skillGrid=$('skill-grid');
    if (skillGrid) skillGrid.innerHTML=SKILLS.map(skill=>{
      const unlocked=s.unlockedSkills.includes(skill.id);
      const available=skill.requires.every(req=>s.unlockedSkills.includes(req));
      return `<button class="skill-card ${unlocked?'unlocked':''} ${available?'':'blocked'}" data-skill-id="${skill.id}" ${unlocked?'disabled':''}>
        <span>${skill.icon}</span><div><strong>${skill.name}</strong><small>${skill.desc}</small></div><b>${unlocked?'✓':skill.cost+' SP'}</b>
      </button>`;
    }).join('');

    const questList=$('quest-list');
    if (questList) questList.innerHTML=QUESTS.map(q=>{
      const value=this.questValue(q.id),done=s.questProgress.completed.includes(q.id);
      return `<article class="quest-item ${done?'done':''} ${q.kind}">
        <div><span>${q.kind==='main'?'PRINCIPAL':'SECUNDARIA'}</span><strong>${q.title}</strong></div>
        <p>${q.desc}</p>
        <div class="quest-progress"><i style="width:${Math.min(100,value/q.target*100)}%"></i></div>
        <footer><b>${value}/${q.target}</b><em>${done?'COMPLETADA':q.reward}</em></footer>
      </article>`;
    }).join('');

    const shop=$('shop-items');
    if (shop) {
      const sale=[...ARMORS,{id:'potion',name:'Poción restauradora',slot:'consumible',icon:'✚',price:18,rarity:'Consumible',stats:{str:0,def:0,crit:0}}];
      shop.innerHTML=sale.map(item=>{
        const owned=item.id!=='potion'&&s.ownedArmor.includes(item.id);
        return `<button class="shop-item" data-buy-id="${item.id}" ${owned?'disabled':''}>
          <span>${item.icon}</span><div><strong>${item.name}</strong><small>${item.id==='potion'?'Restaura 42% de vida':`STR +${item.stats.str} · DEF +${item.stats.def} · CRIT +${Math.round(item.stats.crit*100)}%`}</small></div><b>${owned?'OBTENIDA':item.price+' ✦'}</b>
        </button>`;
      }).join('');
    }
    if ($('shop-gold')) $('shop-gold').textContent=`${s.gold} ✦`;
  }

  update(dt) {
    this.merchant.coin.rotation.z+=dt*1.2;
    this.merchant.root.position.y=Math.sin(this.game.elapsed*1.5)*.025;
  }
}
