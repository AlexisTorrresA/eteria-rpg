import * as THREE from 'three';
import { ENEMY_ARCHETYPES } from './gameData.js';

const rand=(a,b)=>a+Math.random()*(b-a);
const dist2D=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

function shadow(mesh){mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}

export class WorldExpansion {
  constructor(game,{toast,vibrate}) {
    this.game=game; this.toast=toast; this.vibrate=vibrate;
    this.projectiles=[];
    this.ashGroup=new THREE.Group();
    this.ashCenter=new THREE.Vector3(105,0,0);
    this.endBeacon=null;
    this.createAshenWastes();
    this.ensureState();
  }

  ensureState(){
    const s=this.game.state;
    s.currentRegion=s.currentRegion||'verdant-valley';
    s.ashenSpawned=!!s.ashenSpawned;
  }

  createAshenWastes(){
    const g=this.ashGroup;
    const ground=shadow(new THREE.Mesh(
      new THREE.PlaneGeometry(82,82),
      new THREE.MeshStandardMaterial({color:0x392f2a,roughness:.98,metalness:.03})
    ));
    ground.rotation.x=-Math.PI/2; ground.position.set(105,-.015,0); g.add(ground);

    const path=shadow(new THREE.Mesh(
      new THREE.PlaneGeometry(11,70),
      new THREE.MeshStandardMaterial({color:0x1f2937,roughness:.92})
    ));
    path.rotation.x=-Math.PI/2; path.rotation.z=.12; path.position.set(105,.01,0); g.add(path);

    const lavaMat=new THREE.MeshStandardMaterial({color:0xf97316,emissive:0xdc2626,emissiveIntensity:1.8,roughness:.28});
    for(const [x,z,r] of [[89,-17,4],[121,14,5],[132,-23,3.6],[98,27,3]]) {
      const pool=new THREE.Mesh(new THREE.CircleGeometry(r,32),lavaMat.clone());
      pool.rotation.x=-Math.PI/2;pool.position.set(x,.025,z);g.add(pool);
      this.game.decorAnimations.push(t=>{pool.material.emissiveIntensity=1.5+Math.sin(t*2+x)*.35;});
    }

    const obsMat=new THREE.MeshStandardMaterial({color:0x111827,roughness:.45,metalness:.35,emissive:0x3b0764,emissiveIntensity:.25});
    for(let i=0;i<32;i++){
      const spike=shadow(new THREE.Mesh(new THREE.ConeGeometry(rand(.28,.7),rand(1.2,3.8),5),obsMat));
      spike.position.set(rand(68,142),rand(.6,1.7),rand(-37,37));
      spike.rotation.z=rand(-.2,.2);g.add(spike);
    }

    for(let i=0;i<14;i++){
      const trunk=shadow(new THREE.Mesh(new THREE.CylinderGeometry(.12,.24,rand(1.8,3.4),6),new THREE.MeshStandardMaterial({color:0x2b211e,roughness:1})));
      trunk.position.set(rand(72,138),1.3,rand(-35,35)); trunk.rotation.z=rand(-.4,.4);g.add(trunk);
    }

    const gate=new THREE.Group();
    gate.position.set(71,0,0);
    const stone=new THREE.MeshStandardMaterial({color:0x282332,roughness:.7,metalness:.12});
    const glow=new THREE.MeshStandardMaterial({color:0xf97316,emissive:0xdc2626,emissiveIntensity:2,transparent:true,opacity:.72,side:THREE.DoubleSide});
    const l=shadow(new THREE.Mesh(new THREE.BoxGeometry(1,5.5,1),stone));l.position.set(-1.8,2.7,0);
    const r=l.clone();r.position.x=1.8;
    const top=shadow(new THREE.Mesh(new THREE.BoxGeometry(4.6,1,1),stone));top.position.set(0,5.1,0);
    const core=new THREE.Mesh(new THREE.CircleGeometry(1.5,36),glow);core.position.set(0,2.7,.06);
    gate.add(l,r,top,core);g.add(gate);

    const beaconMat=new THREE.MeshStandardMaterial({color:0xfbbf24,emissive:0xf59e0b,emissiveIntensity:1.8,metalness:.25,roughness:.3});
    this.endBeacon=shadow(new THREE.Mesh(new THREE.OctahedronGeometry(1.25,0),beaconMat));
    this.endBeacon.position.set(136,1.6,28);g.add(this.endBeacon);
    this.game.decorAnimations.push(t=>{this.endBeacon.rotation.y=t*.5;this.endBeacon.position.y=1.6+Math.sin(t*2)*.18;});

    this.game.scene.add(g);
  }

  enterAshenWastes(){
    this.ensureState();
    const s=this.game.state;
    if(s.currentRegion==='ashen-wastes') return;
    s.currentRegion='ashen-wastes';
    this.game.player.position.set(76,0,0);
    this.game.lastMove.set(1,0,0);
    this.game.progression?.recordRegion('ashen-wastes');
    this.spawnAshEnemies();
    this.toast('CAPÍTULO V · Las Tierras de Ceniza');
    this.game.rpg?.spawnBurst(this.game.player.position.clone().add(new THREE.Vector3(0,1,0)),0xf97316,30,1.4);
    this.vibrate([25,30,45]);
    this.game.save();
  }

  spawnAshEnemies(){
    const s=this.game.state;
    if(s.ashenSpawned && this.game.enemies.some(e=>e.archetype?.region==='ashen-wastes')) return;
    s.ashenSpawned=true;
    const spots=[[88,-8],[94,17],[108,-18],[116,6],[127,24],[132,-12],[101,30],[124,-30],[138,5]];
    spots.forEach(([x,z],i)=>{
      const type=i%3===0?'ashArcher':'ashHound';
      this.game.enemies.push(this.game.makeEnemy(x+rand(-2,2),z+rand(-2,2),type));
    });
  }

  updateRangedEnemy(enemy,dt,toPlayer,d){
    enemy.cooldown-=dt;
    const dir=toPlayer.clone().setY(0).normalize();
    if(d<5.5) enemy.group.position.addScaledVector(dir,-enemy.speed*.72*dt);
    else if(d>9.5&&d<18) enemy.group.position.addScaledVector(dir,enemy.speed*.55*dt);
    enemy.group.rotation.y=Math.atan2(-dir.x,-dir.z);

    if(d<15&&enemy.cooldown<=0){
      const [minCd,maxCd]=enemy.attackCooldown;
      enemy.cooldown=rand(minCd,maxCd);
      this.spawnEnemyProjectile(enemy,dir);
    }
    enemy.group.position.y=.06+Math.sin(this.game.elapsed*3+enemy.phase)*.05;
  }

  spawnEnemyProjectile(enemy,dir){
    const mat=new THREE.MeshBasicMaterial({color:enemy.archetype.glow});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),mat);
    mesh.position.copy(enemy.group.position).add(new THREE.Vector3(0,1.45,0));
    this.game.scene.add(mesh);
    this.projectiles.push({mesh,velocity:dir.clone().multiplyScalar(8),ttl:2.4,damage:enemy.archetype.damage+this.game.state.level*enemy.archetype.damagePerLevel});
    this.game.rpg?.spawnBurst(mesh.position.clone(),enemy.archetype.glow,4,.25);
  }

  updateBoss(enemy,dt,toPlayer,d){
    const ratio=enemy.hp/enemy.maxHp;
    const phase=ratio>.66?1:ratio>.33?2:3;
    if(enemy.bossPhase!==phase){
      enemy.bossPhase=phase;
      this.toast(`Vharok entra en fase ${phase}`);
      this.game.rpg?.spawnRing(enemy.group.position.clone(),phase===2?0xf97316:0xd946ef,phase===3?5.5:4.4);
      if(phase===2) enemy.speed*=1.18;
      if(phase===3) enemy.speed*=1.22;
    }

    enemy.cooldown-=dt;
    enemy.phaseCooldown=(enemy.phaseCooldown||0)-dt;
    const dir=toPlayer.clone().setY(0).normalize();
    enemy.group.rotation.y=Math.atan2(-dir.x,-dir.z);

    if(phase===1){
      if(d>1.8) enemy.group.position.addScaledVector(dir,enemy.speed*dt);
      if(d<2.2&&enemy.cooldown<=0){
        enemy.cooldown=1.05; enemy.attackAnim=.38;
        this.game.takeDamage(enemy.archetype.damage+this.game.state.level*enemy.archetype.damagePerLevel);
      }
    } else if(phase===2){
      if(d>4.2) enemy.group.position.addScaledVector(dir,enemy.speed*.72*dt);
      if(enemy.phaseCooldown<=0){
        enemy.phaseCooldown=2.4;
        for(let i=0;i<6;i++){
          const a=i/6*Math.PI*2;
          this.spawnEnemyProjectile(enemy,new THREE.Vector3(Math.cos(a),0,Math.sin(a)));
        }
        this.game.rpg?.spawnRing(enemy.group.position.clone(),0xf97316,4.6);
      }
    } else {
      if(d>2.4) enemy.group.position.addScaledVector(dir,enemy.speed*1.12*dt);
      if(enemy.phaseCooldown<=0){
        enemy.phaseCooldown=2.0;
        const offset=new THREE.Vector3(rand(-3,3),0,rand(-3,3));
        enemy.group.position.copy(this.game.player.position).add(offset);
        this.game.rpg?.spawnBurst(enemy.group.position.clone().add(new THREE.Vector3(0,1.4,0)),0xd946ef,24,1.3);
        if(dist2D(enemy.group.position,this.game.player.position)<3.2) this.game.takeDamage((enemy.archetype.damage+8)*1.1);
      }
      if(d<2.1&&enemy.cooldown<=0){enemy.cooldown=.78;this.game.takeDamage((enemy.archetype.damage+this.game.state.level*enemy.archetype.damagePerLevel)*1.18);}
    }

    enemy.group.position.y=.06+Math.sin(this.game.elapsed*2.4)*.08;
  }

  update(dt){
    for(const p of [...this.projectiles]){
      p.ttl-=dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.y+=dt*8;
      if(dist2D(p.mesh.position,this.game.player.position)<.65){
        this.game.scene.remove(p.mesh);this.projectiles=this.projectiles.filter(x=>x!==p);
        this.game.takeDamage(p.damage);continue;
      }
      if(p.ttl<=0){this.game.scene.remove(p.mesh);this.projectiles=this.projectiles.filter(x=>x!==p);}
    }

    if(this.game.state.currentRegion==='ashen-wastes'){
      this.spawnAshEnemies();
      if((this.game.state.questProgress?.ashKills||0)>=6 && dist2D(this.game.player.position,this.endBeacon.position)<2.6){
        this.game.win();
      }
    }
  }
}
