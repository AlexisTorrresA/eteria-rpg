import * as THREE from 'three';

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.62,
    metalness: options.metalness ?? 0.12,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0
  });
}

function shadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createWeaponModel(weapon) {
  const group = new THREE.Group();
  const metal = mat(weapon.color, { roughness: 0.26, metalness: 0.78 });
  const glow = mat(weapon.glow, {
    roughness: 0.3,
    metalness: 0.35,
    emissive: weapon.glow,
    emissiveIntensity: 1.7
  });
  const dark = mat(0x171923, { roughness: 0.72, metalness: 0.25 });

  if (weapon.id === 'ember-axe') {
    const handle = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,1.35,8), dark));
    handle.position.y = .55;
    const head = shadow(new THREE.Mesh(new THREE.BoxGeometry(.72,.42,.16), metal));
    head.position.set(.18,1.2,0);
    head.rotation.z = -.18;
    const edge = shadow(new THREE.Mesh(new THREE.ConeGeometry(.34,.52,4), glow));
    edge.position.set(.55,1.22,0);
    edge.rotation.z = -Math.PI/2;
    group.add(handle, head, edge);
  } else if (weapon.id === 'moon-spear' || weapon.id === 'eclipse-glaive') {
    const shaft = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,1.75,8), dark));
    shaft.position.y = .7;
    const tip = shadow(new THREE.Mesh(new THREE.ConeGeometry(weapon.id === 'eclipse-glaive' ? .24 : .18,.7,6), glow));
    tip.position.y = 1.82;
    if (weapon.id === 'eclipse-glaive') {
      const blade = shadow(new THREE.Mesh(new THREE.BoxGeometry(.62,.12,.08), metal));
      blade.position.set(.22,1.62,0);
      blade.rotation.z = -.6;
      group.add(blade);
    }
    group.add(shaft, tip);
  } else if (weapon.id === 'rift-daggers') {
    for (const side of [-1,1]) {
      const blade = shadow(new THREE.Mesh(new THREE.BoxGeometry(.08,.72,.09), glow));
      blade.position.set(side*.17,.52,0);
      blade.rotation.z = side*.18;
      const grip = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.045,.05,.34,7), dark));
      grip.position.set(side*.17,.04,0);
      group.add(blade, grip);
    }
  } else if (weapon.id === 'sun-hammer') {
    const handle = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.06,.075,1.25,8), dark));
    handle.position.y = .5;
    const head = shadow(new THREE.Mesh(new THREE.BoxGeometry(.82,.42,.42), metal));
    head.position.y = 1.25;
    const core = shadow(new THREE.Mesh(new THREE.BoxGeometry(.28,.5,.5), glow));
    core.position.y = 1.25;
    group.add(handle, head, core);
  } else {
    const blade = shadow(new THREE.Mesh(new THREE.BoxGeometry(.11,1.35,.1), metal));
    blade.position.y = .76;
    const rune = shadow(new THREE.Mesh(new THREE.BoxGeometry(.035,1.02,.12), glow));
    rune.position.set(0,.8,-.01);
    const guard = shadow(new THREE.Mesh(new THREE.BoxGeometry(.55,.09,.12), glow));
    guard.position.y = .13;
    const grip = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.045,.05,.4,8), dark));
    grip.position.y = -.12;
    group.add(blade, rune, guard, grip);
  }

  group.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true;
  });
  return group;
}

export function createHeroModel(weapon) {
  const root = new THREE.Group();
  const skin = mat(0xe8b894, { roughness: .82 });
  const armor = mat(0x1d4ed8, { roughness: .42, metalness: .38 });
  const armorDark = mat(0x172554, { roughness: .56, metalness: .28 });
  const silver = mat(0xdbeafe, { roughness: .24, metalness: .8 });
  const cloth = mat(0x312e81, { roughness: .84 });
  const leather = mat(0x3f2d20, { roughness: .9 });
  const cyan = mat(0x67e8f9, { roughness: .3, metalness: .2, emissive: 0x0891b2, emissiveIntensity: 1.8 });

  const torso = shadow(new THREE.Mesh(new THREE.BoxGeometry(.82,.9,.45), armor));
  torso.position.y = 1.35;
  torso.scale.x = .88;

  const chest = shadow(new THREE.Mesh(new THREE.BoxGeometry(.52,.46,.06), silver));
  chest.position.set(0,1.48,-.25);
  chest.rotation.x = -.08;

  const belt = shadow(new THREE.Mesh(new THREE.BoxGeometry(.82,.16,.5), leather));
  belt.position.y = .92;
  const buckle = shadow(new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.06), cyan));
  buckle.position.set(0,.92,-.29);

  const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(.38,18,14), skin));
  head.position.y = 2.18;
  head.scale.y = 1.03;

  const hair = shadow(new THREE.Mesh(new THREE.SphereGeometry(.4,14,10,0,Math.PI*2,0,Math.PI*.56), armorDark));
  hair.position.set(0,2.32,.02);

  const brow = shadow(new THREE.Mesh(new THREE.BoxGeometry(.62,.12,.08), armorDark));
  brow.position.set(0,2.23,-.36);

  const eyeMat = mat(0xe0f2fe, { emissive: 0x38bdf8, emissiveIntensity: 1.7, roughness: .2 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(.035,8,6), eyeMat);
  eyeL.position.set(-.12,2.2,-.37);
  const eyeR = eyeL.clone(); eyeR.position.x = .12;

  const shoulderL = shadow(new THREE.Mesh(new THREE.SphereGeometry(.26,10,8), silver));
  shoulderL.scale.set(1.25,.72,1);
  shoulderL.position.set(-.53,1.62,0);
  const shoulderR = shoulderL.clone(); shoulderR.position.x = .53;

  const armL = new THREE.Group();
  const armLMesh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,.72,8), armorDark));
  armLMesh.position.y = -.34;
  armL.add(armLMesh); armL.position.set(-.53,1.5,0);

  const armR = new THREE.Group();
  const armRMesh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,.72,8), armorDark));
  armRMesh.position.y = -.34;
  armR.add(armRMesh); armR.position.set(.53,1.5,0);

  const legL = new THREE.Group();
  const legLMesh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,.78,8), armorDark));
  legLMesh.position.y = -.35;
  const bootL = shadow(new THREE.Mesh(new THREE.BoxGeometry(.28,.24,.48), leather));
  bootL.position.set(0,-.76,-.08);
  legL.add(legLMesh, bootL); legL.position.set(-.22,.9,0);

  const legR = legL.clone();
  legR.position.x = .22;

  const cape = shadow(new THREE.Mesh(new THREE.PlaneGeometry(.92,1.5,1,4), cloth));
  cape.position.set(0,1.42,.32);
  cape.rotation.x = -.08;

  const backRune = shadow(new THREE.Mesh(new THREE.RingGeometry(.16,.24,12), cyan));
  backRune.position.set(0,1.58,.345);
  backRune.rotation.y = Math.PI;

  const weaponSocket = new THREE.Group();
  weaponSocket.position.set(.62,1.08,-.08);
  weaponSocket.rotation.set(-.12,0,-.55);
  weaponSocket.add(createWeaponModel(weapon));

  root.add(torso,chest,belt,buckle,head,hair,brow,eyeL,eyeR,shoulderL,shoulderR,armL,armR,legL,legR,cape,backRune,weaponSocket);
  return { root, weaponSocket, armL, armR, legL, legR, cape, rune: backRune, torso, chest, hair, brow, shoulderL, shoulderR };
}

function addEnemyFace(group, glowColor, y, z) {
  const eyeMat = mat(glowColor, { emissive: glowColor, emissiveIntensity: 2.5, roughness: .2 });
  for (const x of [-.15,.15]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.05,7,5), eyeMat);
    eye.position.set(x,y,z);
    group.add(eye);
  }
}

export function createEnemyModel(archetype, isBoss = false) {
  const group = new THREE.Group();
  const bodyMat = mat(archetype.body, {
    roughness: .68,
    metalness: archetype.id === 'guardian' || isBoss ? .34 : .08,
    emissive: archetype.body,
    emissiveIntensity: isBoss ? .7 : .28
  });
  const glowMat = mat(archetype.glow, {
    roughness: .3,
    metalness: .18,
    emissive: archetype.glow,
    emissiveIntensity: isBoss ? 2.5 : 1.7
  });

  if (archetype.id === 'ashArcher') {
    const torso = shadow(new THREE.Mesh(new THREE.BoxGeometry(.78,.82,.42), bodyMat));
    torso.position.y = 1.22;
    const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(.34,12,9), bodyMat));
    head.position.y = 1.92;
    const hood = shadow(new THREE.Mesh(new THREE.ConeGeometry(.44,.55,8), bodyMat));
    hood.position.y = 2.2;
    const bow = shadow(new THREE.Mesh(new THREE.TorusGeometry(.52,.035,6,18,Math.PI), glowMat));
    bow.position.set(.56,1.38,-.05);
    bow.rotation.set(0,Math.PI/2,Math.PI/2);
    const string = shadow(new THREE.Mesh(new THREE.BoxGeometry(.02,1.0,.02), glowMat));
    string.position.set(.56,1.38,-.05);
    const quiver = shadow(new THREE.Mesh(new THREE.BoxGeometry(.18,.78,.22), bodyMat));
    quiver.position.set(-.36,1.25,.28);
    quiver.rotation.z=.18;
    group.add(torso,head,hood,bow,string,quiver);
    addEnemyFace(group, archetype.glow, 1.94, -.33);
  } else if (archetype.id === 'ashHound') {
    const body = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.15,.5,.55), bodyMat));
    body.position.y=.72;
    const head = shadow(new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.52), bodyMat));
    head.position.set(0,1.02,-.64);
    const jaw = shadow(new THREE.Mesh(new THREE.BoxGeometry(.36,.2,.42), glowMat));
    jaw.position.set(0,.9,-.98);
    for (const side of [-1,1]) {
      const legF=shadow(new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,.6,6),bodyMat));
      legF.position.set(side*.36,.35,-.34);
      const legB=legF.clone(); legB.position.z=.34;
      const horn=shadow(new THREE.Mesh(new THREE.ConeGeometry(.08,.36,6),glowMat));
      horn.position.set(side*.19,1.34,-.66);horn.rotation.z=side*.22;
      group.add(legF,legB,horn);
    }
    group.add(body,head,jaw);
    addEnemyFace(group, archetype.glow, 1.06, -.91);
  } else if (archetype.id === 'shade') {
    const body = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(.42,.72,4,8), bodyMat));
    body.position.y = 1.03;
    const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(.46,12,9), bodyMat));
    head.position.y = 1.82;
    const hornL = shadow(new THREE.Mesh(new THREE.ConeGeometry(.1,.48,6), glowMat));
    hornL.position.set(-.24,2.22,.02); hornL.rotation.z = -.3;
    const hornR = hornL.clone(); hornR.position.x = .24; hornR.rotation.z = .3;
    group.add(body,head,hornL,hornR);
    addEnemyFace(group, archetype.glow, 1.84, -.42);
  } else if (archetype.id === 'marauder') {
    const torso = shadow(new THREE.Mesh(new THREE.BoxGeometry(.85,.82,.5), bodyMat));
    torso.position.y = 1.25;
    const head = shadow(new THREE.Mesh(new THREE.DodecahedronGeometry(.4,1), bodyMat));
    head.position.y = 1.95;
    const hood = shadow(new THREE.Mesh(new THREE.ConeGeometry(.5,.72,8), bodyMat));
    hood.position.y = 2.18;
    const blade = shadow(new THREE.Mesh(new THREE.BoxGeometry(.1,1.0,.1), glowMat));
    blade.position.set(.62,1.05,-.08); blade.rotation.z = -.55;
    const arm = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.1,.13,.7,8), bodyMat));
    arm.position.set(.5,1.28,0); arm.rotation.z = -.2;
    group.add(torso,head,hood,blade,arm);
    addEnemyFace(group, archetype.glow, 1.96, -.36);
  } else {
    const torso = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.0,.95,.58), bodyMat));
    torso.position.y = 1.3;
    const chest = shadow(new THREE.Mesh(new THREE.BoxGeometry(.72,.56,.1), glowMat));
    chest.position.set(0,1.34,-.34);
    const head = shadow(new THREE.Mesh(new THREE.BoxGeometry(.62,.58,.58), bodyMat));
    head.position.y = 2.15;
    const shoulderL = shadow(new THREE.Mesh(new THREE.BoxGeometry(.4,.34,.62), bodyMat));
    shoulderL.position.set(-.64,1.58,0);
    const shoulderR = shoulderL.clone(); shoulderR.position.x = .64;
    const hornL = shadow(new THREE.Mesh(new THREE.ConeGeometry(.12,.58,6), glowMat));
    hornL.position.set(-.28,2.62,0); hornL.rotation.z = -.22;
    const hornR = hornL.clone(); hornR.position.x = .28; hornR.rotation.z = .22;
    group.add(torso,chest,head,shoulderL,shoulderR,hornL,hornR);
    addEnemyFace(group, archetype.glow, 2.18, -.31);
  }

  if (isBoss) {
    const crown = new THREE.Group();
    for (let i=0;i<5;i++) {
      const spike = shadow(new THREE.Mesh(new THREE.ConeGeometry(.09,.55,6), glowMat));
      spike.position.set((i-2)*.18,2.72 + Math.abs(i-2)*.04,0);
      spike.rotation.z = (i-2)*.08;
      crown.add(spike);
    }
    const ring = shadow(new THREE.Mesh(new THREE.TorusGeometry(.68,.055,7,22), glowMat));
    ring.position.y = 2.36;
    ring.rotation.x = Math.PI/2;
    group.add(crown,ring);
  }

  group.scale.setScalar(archetype.scale ?? 1);
  return { group, bodyMat, glowMat };
}
