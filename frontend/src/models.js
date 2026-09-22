import * as THREE from 'three';

function mat(color, options = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.62,
    metalness: options.metalness ?? 0.12,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0
  });
  if (options.transparent) {
    material.transparent = true;
    material.opacity = options.opacity ?? 1;
  }
  return material;
}

function shadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function bladeFromPoints(points, depth, material, bevel = 0.018) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 2
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return shadow(new THREE.Mesh(geometry, material));
}

function addLeatherWrap(group, yStart, yEnd, radius, material, turns = 7) {
  const height = yEnd - yStart;
  for (let i = 0; i < turns; i++) {
    const ring = shadow(new THREE.Mesh(
      new THREE.TorusGeometry(radius, .011, 5, 10),
      material
    ));
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = (i % 2 ? .18 : -.18);
    ring.position.y = yStart + (height * (i + .5)) / turns;
    group.add(ring);
  }
}

function addRune(group, x, y, z, material, scale = 1) {
  const vertical = shadow(new THREE.Mesh(new THREE.BoxGeometry(.025, .23 * scale, .026), material));
  vertical.position.set(x, y, z);
  const horizontal = shadow(new THREE.Mesh(new THREE.BoxGeometry(.14 * scale, .022, .026), material));
  horizontal.position.set(x, y, z);
  horizontal.rotation.z = Math.PI / 4;
  group.add(vertical, horizontal);
}

export function createWeaponModel(weapon) {
  const group = new THREE.Group();
  const forgedSteel = mat(0xb7bcc3, { roughness: .28, metalness: .9 });
  const darkSteel = mat(0x3c424a, { roughness: .34, metalness: .82 });
  const bronze = mat(0x8f6a35, { roughness: .38, metalness: .72 });
  const leather = mat(0x2a1b16, { roughness: .9, metalness: .02 });
  const leatherWarm = mat(0x4a2f22, { roughness: .86, metalness: .03 });
  const wood = mat(0x3a281d, { roughness: .92, metalness: .02 });
  const rune = mat(weapon.glow, {
    roughness: .25,
    metalness: .2,
    emissive: weapon.glow,
    emissiveIntensity: 2.15
  });

  if (weapon.id === 'aether-blade') {
    const blade = bladeFromPoints([
      [-.075,.18],[-.09,.92],[-.055,1.5],[0,1.72],[.055,1.5],[.09,.92],[.075,.18]
    ], .07, forgedSteel, .014);
    const fuller = shadow(new THREE.Mesh(new THREE.BoxGeometry(.024, 1.22, .078), darkSteel));
    fuller.position.y = .85;
    fuller.scale.x = .45;
    const guard = bladeFromPoints([
      [-.42,.12],[-.18,.04],[0,.12],[.18,.04],[.42,.12],[.34,.2],[0,.17],[-.34,.2]
    ], .11, bronze, .012);
    const grip = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.047,.052,.47,10), wood));
    grip.position.y = -.13;
    const pommel = shadow(new THREE.Mesh(new THREE.OctahedronGeometry(.095,0), bronze));
    pommel.position.y = -.4;
    group.add(blade, fuller, guard, grip, pommel);
    addLeatherWrap(group, -.34, .08, .061, leatherWarm, 8);
    addRune(group, 0, .72, -.045, rune, .72);
  } else if (weapon.id === 'ember-axe') {
    const haft = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.048,.062,1.72,10), wood));
    haft.position.y = .48;
    const collar = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.15,10), bronze));
    collar.position.y = 1.27;
    const head = bladeFromPoints([
      [-.12,1.05],[.17,1.11],[.52,1.27],[.72,1.47],[.63,1.78],[.3,1.72],[.03,1.52],[-.15,1.48]
    ], .18, darkSteel, .025);
    const cuttingEdge = bladeFromPoints([
      [.5,1.28],[.72,1.47],[.63,1.78],[.52,1.73],[.59,1.5]
    ], .195, forgedSteel, .012);
    const spike = bladeFromPoints([
      [-.13,1.29],[-.38,1.43],[-.13,1.52]
    ], .14, darkSteel, .01);
    group.add(haft, collar, head, cuttingEdge, spike);
    addLeatherWrap(group, -.28, .8, .071, leather, 11);
    addRune(group, .22, 1.47, -.105, rune, .85);
  } else if (weapon.id === 'moon-spear') {
    const shaft = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.035,.048,2.05,10), wood));
    shaft.position.y = .65;
    const lowerCap = shadow(new THREE.Mesh(new THREE.ConeGeometry(.075,.28,8), darkSteel));
    lowerCap.position.y = -.5;
    lowerCap.rotation.z = Math.PI;
    const collar = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.18,10), bronze));
    collar.position.y = 1.58;
    const tip = bladeFromPoints([
      [-.12,1.6],[-.2,1.95],[0,2.4],[.2,1.95],[.12,1.6]
    ], .085, forgedSteel, .014);
    const core = bladeFromPoints([
      [-.035,1.7],[0,2.26],[.035,1.7]
    ], .095, rune, .006);
    const ribbon = new THREE.Mesh(
      new THREE.PlaneGeometry(.16,.72,1,5),
      mat(0x29324a,{roughness:.92,transparent:true,opacity:.92})
    );
    ribbon.position.set(.09,1.33,.04);
    ribbon.rotation.z = -.13;
    group.add(shaft, lowerCap, collar, tip, core, ribbon);
    addLeatherWrap(group, -.15, .82, .055, leatherWarm, 10);
  } else if (weapon.id === 'rift-daggers') {
    for (const side of [-1,1]) {
      const sub = new THREE.Group();
      sub.position.x = side * .18;
      sub.rotation.z = side * .08;
      const blade = bladeFromPoints([
        [-.06,.14],[-.13,.52],[-.08,.9],[0,1.17],[.1,.84],[.12,.48],[.06,.14]
      ], .065, forgedSteel, .012);
      const inner = bladeFromPoints([
        [-.025,.24],[-.04,.72],[0,.98],[.035,.68],[.02,.24]
      ], .074, darkSteel, .004);
      const guard = shadow(new THREE.Mesh(new THREE.BoxGeometry(.26,.07,.1), bronze));
      guard.position.y = .12;
      guard.rotation.z = side * .14;
      const grip = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.037,.043,.36,9), wood));
      grip.position.y = -.1;
      const pommel = shadow(new THREE.Mesh(new THREE.OctahedronGeometry(.07,0), bronze));
      pommel.position.y = -.31;
      sub.add(blade, inner, guard, grip, pommel);
      addLeatherWrap(sub, -.26, .04, .049, leather, 6);
      addRune(sub, 0, .6, -.04, rune, .5);
      group.add(sub);
    }
  } else if (weapon.id === 'sun-hammer') {
    const haft = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.052,.068,1.55,10), wood));
    haft.position.y = .42;
    const neck = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.2,10), bronze));
    neck.position.y = 1.25;
    const head = shadow(new THREE.Mesh(new THREE.BoxGeometry(.84,.38,.42), darkSteel));
    head.position.y = 1.43;
    const faceL = shadow(new THREE.Mesh(new THREE.BoxGeometry(.18,.48,.5), forgedSteel));
    faceL.position.set(-.48,1.43,0);
    const faceR = faceL.clone();
    faceR.position.x = .48;
    const bands = [];
    for (const x of [-.23,.23]) {
      const band = shadow(new THREE.Mesh(new THREE.BoxGeometry(.08,.46,.47), bronze));
      band.position.set(x,1.43,0);
      bands.push(band);
    }
    const core = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.5,12), rune));
    core.rotation.x = Math.PI / 2;
    core.position.set(0,1.43,-.01);
    group.add(haft, neck, head, faceL, faceR, ...bands, core);
    addLeatherWrap(group, -.28, .82, .077, leatherWarm, 10);
  } else if (weapon.id === 'eclipse-glaive') {
    const shaft = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.045,.058,1.68,10), wood));
    shaft.position.y = .36;
    const lowerCap = shadow(new THREE.Mesh(new THREE.OctahedronGeometry(.09,0), bronze));
    lowerCap.position.y = -.5;
    const blade = bladeFromPoints([
      [-.08,1.08],[-.12,1.55],[-.03,2.12],[.2,2.52],[.36,2.25],[.28,1.78],[.12,1.25]
    ], .1, darkSteel, .018);
    const edge = bladeFromPoints([
      [.2,2.52],[.36,2.25],[.28,1.78],[.21,1.62],[.27,2.17]
    ], .115, forgedSteel, .008);
    const guard = bladeFromPoints([
      [-.32,1.04],[-.08,.96],[0,1.09],[.28,.98],[.35,1.1],[0,1.2]
    ], .13, bronze, .012);
    group.add(shaft, lowerCap, blade, edge, guard);
    addLeatherWrap(group, -.34, .68, .067, leather, 11);
    for (let i = 0; i < 4; i++) addRune(group, .08 + i*.035, 1.42 + i*.23, -.06, rune, .52);
  }

  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return group;
}

function createCapeGeometry() {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -.48,.68,0,   .48,.68,0,   -.62,-.7,0,
     .48,.68,0,   .58,-.7,0,   -.62,-.7,0
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices,3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createHeroModel(weapon) {
  const root = new THREE.Group();

  const skin = mat(0xc98f6f, { roughness: .82 });
  const skinShadow = mat(0xa96f55, { roughness: .86 });
  const hairMat = mat(0x241a17, { roughness: .92 });
  const beardMat = mat(0x33231d, { roughness: .96 });
  const leather = mat(0x493023, { roughness: .9, metalness: .02 });
  const leatherDark = mat(0x241a17, { roughness: .92, metalness: .02 });
  const cloth = mat(0x293142, { roughness: .96 });
  const clothDark = mat(0x1d2431, { roughness: .98 });
  const steel = mat(0x8d949c, { roughness: .34, metalness: .82 });
  const steelDark = mat(0x4a5059, { roughness: .42, metalness: .72 });
  const linen = mat(0x9b8e7d, { roughness: .98 });
  const cyan = mat(0x7dd3fc, { roughness: .25, metalness: .18, emissive: 0x0284c7, emissiveIntensity: 1.55 });

  // Anatomical torso with layered leather armor.
  const torso = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.37,.29,.82,12), leather));
  torso.position.set(0,1.43,0);
  torso.scale.z = .7;

  const undershirt = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.385,.315,.88,12), clothDark));
  undershirt.position.set(0,1.42,.035);
  undershirt.scale.z = .72;

  const chest = shadow(new THREE.Mesh(new THREE.BoxGeometry(.54,.42,.075), steelDark));
  chest.position.set(0,1.5,-.25);
  chest.rotation.x = -.07;

  const chestCenter = shadow(new THREE.Mesh(new THREE.BoxGeometry(.08,.34,.086), steel));
  chestCenter.position.set(0,1.5,-.292);

  // Cross-body leather harness inspired by the concept sheet.
  const strapA = shadow(new THREE.Mesh(new THREE.BoxGeometry(.09,.98,.045), leatherDark));
  strapA.position.set(-.02,1.47,-.305);
  strapA.rotation.z = -.52;
  const strapB = strapA.clone();
  strapB.rotation.z = .52;
  strapB.position.x = .05;

  const belt = shadow(new THREE.Mesh(new THREE.BoxGeometry(.78,.14,.48), leatherDark));
  belt.position.y = .98;
  const buckle = shadow(new THREE.Mesh(new THREE.TorusGeometry(.095,.022,7,14), steel));
  buckle.position.set(0,.98,-.27);
  buckle.rotation.x = Math.PI/2;

  for (const x of [-.31,.31]) {
    const pouch = shadow(new THREE.Mesh(new THREE.BoxGeometry(.24,.28,.18), leather));
    pouch.position.set(x,.86,.2);
    pouch.rotation.z = x < 0 ? -.08 : .08;
    root.add(pouch);
  }

  // More human head: elongated skull, ears, nose, beard and brows.
  const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(.31,22,16), skin));
  head.position.set(0,2.25,-.02);
  head.scale.set(.9,1.08,.9);

  for (const x of [-.295,.295]) {
    const ear = shadow(new THREE.Mesh(new THREE.SphereGeometry(.052,10,8), skinShadow));
    ear.position.set(x,2.25,-.015);
    ear.scale.y = 1.35;
    root.add(ear);
  }

  const nose = shadow(new THREE.Mesh(new THREE.ConeGeometry(.048,.15,6), skinShadow));
  nose.rotation.x = -Math.PI/2;
  nose.position.set(0,2.25,-.31);

  const jaw = shadow(new THREE.Mesh(new THREE.SphereGeometry(.255,16,10,0,Math.PI*2,Math.PI*.45,Math.PI*.45), beardMat));
  jaw.position.set(0,2.11,-.035);
  jaw.scale.set(.9,.68,.91);

  const hair = shadow(new THREE.Mesh(new THREE.SphereGeometry(.325,18,12,0,Math.PI*2,0,Math.PI*.58), hairMat));
  hair.position.set(0,2.39,.005);
  hair.scale.set(1.02,1.04,1);

  const hoodGear = shadow(new THREE.Mesh(
    new THREE.SphereGeometry(.355,18,12,0,Math.PI*2,0,Math.PI*.68),
    mat(0x334155,{roughness:.94})
  ));
  hoodGear.position.set(0,2.37,.025);
  hoodGear.scale.set(1.02,1.07,1.04);
  hoodGear.visible = false;

  const crownGear = new THREE.Group();
  const crownBand = shadow(new THREE.Mesh(new THREE.TorusGeometry(.29,.022,7,20), steel));
  crownBand.rotation.x = Math.PI/2;
  crownBand.position.y = 2.46;
  crownGear.add(crownBand);
  for (let i=0;i<5;i++) {
    const spike = shadow(new THREE.Mesh(new THREE.ConeGeometry(.035,.22,6), steelDark));
    spike.position.set((i-2)*.11,2.59 - Math.abs(i-2)*.02,0);
    crownGear.add(spike);
  }
  crownGear.visible = false;

  for (let i=0;i<8;i++) {
    const lock = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(.018,.17,4,6), hairMat));
    const angle = -1.05 + i*.3;
    lock.position.set(Math.sin(angle)*.22,2.38 + (i%2)*.025,-.22 + Math.cos(angle)*.08);
    lock.rotation.z = angle*.35;
    lock.rotation.x = .28;
    root.add(lock);
  }

  const brow = shadow(new THREE.Mesh(new THREE.BoxGeometry(.49,.055,.04), beardMat));
  brow.position.set(0,2.31,-.286);

  const eyeWhite = mat(0xd9e6e9,{roughness:.3});
  const iris = mat(0x8ad2e8,{roughness:.18,emissive:0x0e7490,emissiveIntensity:.35});
  for (const x of [-.105,.105]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.035,10,8), eyeWhite);
    eye.position.set(x,2.285,-.299);
    eye.scale.y=.72;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(.015,8,6), iris);
    pupil.position.set(x,2.285,-.329);
    root.add(eye,pupil);
  }

  // Neck cowl / scarf.
  const cowlA = shadow(new THREE.Mesh(new THREE.TorusGeometry(.31,.085,8,18), cloth));
  cowlA.rotation.x = Math.PI/2;
  cowlA.position.set(0,1.98,.01);
  const cowlB = shadow(new THREE.Mesh(new THREE.TorusGeometry(.28,.065,8,18), linen));
  cowlB.rotation.x = Math.PI/2;
  cowlB.position.set(0,1.92,-.02);

  // Shoulder armor: asymmetrical, less toy-like.
  const shoulderL = shadow(new THREE.Mesh(new THREE.SphereGeometry(.23,14,9), steelDark));
  shoulderL.scale.set(1.35,.62,1.05);
  shoulderL.position.set(-.47,1.67,-.01);
  const shoulderR = shadow(new THREE.Mesh(new THREE.SphereGeometry(.205,14,9), leather));
  shoulderR.scale.set(1.28,.58,1.02);
  shoulderR.position.set(.47,1.65,-.005);

  const shoulderBandL = shadow(new THREE.Mesh(new THREE.TorusGeometry(.2,.022,7,14,Math.PI), steel));
  shoulderBandL.position.set(-.47,1.67,-.08);
  shoulderBandL.rotation.set(Math.PI/2,0,Math.PI/2);

  // Arms: upper arm + forearm + hand in one animated shoulder group.
  const armL = new THREE.Group();
  const upperL = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.105,.125,.42,10), clothDark));
  upperL.position.y = -.21;
  const foreL = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.085,.105,.39,10), leather));
  foreL.position.y = -.61;
  const bracerL = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.105,.115,.25,10), steelDark));
  bracerL.position.y = -.56;
  const handL = shadow(new THREE.Mesh(new THREE.SphereGeometry(.105,10,8), skin));
  handL.position.y = -.84;
  handL.scale.set(.82,1.15,.8);
  armL.add(upperL,foreL,bracerL,handL);
  armL.position.set(-.48,1.61,0);

  const armR = new THREE.Group();
  const upperR = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.105,.125,.42,10), clothDark));
  upperR.position.y = -.21;
  const foreR = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.085,.105,.39,10), leather));
  foreR.position.y = -.61;
  const bracerR = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.102,.112,.24,10), leatherDark));
  bracerR.position.y = -.56;
  const handR = shadow(new THREE.Mesh(new THREE.SphereGeometry(.105,10,8), skin));
  handR.position.y = -.84;
  handR.scale.set(.82,1.15,.8);
  armR.add(upperR,foreR,bracerR,handR);
  armR.position.set(.48,1.61,0);

  // Legs with thigh, shin, wrapped boots and believable foot shape.
  const makeLeg = (side) => {
    const leg = new THREE.Group();
    const thigh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.125,.145,.46,10), clothDark));
    thigh.position.y = -.23;
    const knee = shadow(new THREE.Mesh(new THREE.SphereGeometry(.135,10,8), leatherDark));
    knee.position.y = -.5;
    knee.scale.y = .72;
    const shin = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.105,.125,.42,10), cloth));
    shin.position.y = -.73;
    const boot = shadow(new THREE.Mesh(new THREE.BoxGeometry(.27,.34,.43), leatherDark));
    boot.position.set(0,-1.01,-.07);
    const toe = shadow(new THREE.Mesh(new THREE.BoxGeometry(.27,.16,.28), leatherDark));
    toe.position.set(0,-1.08,-.29);
    leg.add(thigh,knee,shin,boot,toe);
    for (let i=0;i<4;i++) {
      const wrap = shadow(new THREE.Mesh(new THREE.TorusGeometry(.12,.012,5,10), leather));
      wrap.rotation.x=Math.PI/2;
      wrap.position.y=-.83-i*.07;
      leg.add(wrap);
    }
    leg.position.set(side*.205,1.03,0);
    return leg;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // Long layered tabard panels.
  for (const x of [-.22,.22]) {
    const panel = shadow(new THREE.Mesh(new THREE.PlaneGeometry(.32,.82,1,4), cloth));
    panel.position.set(x,.71,-.13);
    panel.rotation.x = -.06;
    panel.rotation.z = x < 0 ? -.05 : .05;
    root.add(panel);
  }

  const cape = shadow(new THREE.Mesh(createCapeGeometry(), cloth));
  cape.position.set(0,1.35,.33);
  cape.rotation.x = -.08;

  const backpack = shadow(new THREE.Mesh(new THREE.BoxGeometry(.58,.68,.24), leatherDark));
  backpack.position.set(0,1.35,.43);
  backpack.rotation.x = -.05;
  const bedroll = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.62,10), linen));
  bedroll.rotation.z = Math.PI/2;
  bedroll.position.set(0,1.75,.5);

  const pendantChain = shadow(new THREE.Mesh(new THREE.TorusGeometry(.115,.01,5,18), steel));
  pendantChain.position.set(0,1.78,-.302);
  const pendant = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.022,16), steel));
  pendant.rotation.x = Math.PI/2;
  pendant.position.set(0,1.69,-.327);
  const pendantGem = shadow(new THREE.Mesh(new THREE.OctahedronGeometry(.028,0), cyan));
  pendantGem.position.set(0,1.69,-.35);

  const backRune = shadow(new THREE.Mesh(new THREE.RingGeometry(.13,.19,16), cyan));
  backRune.position.set(0,1.38,.565);
  backRune.rotation.y = Math.PI;

  const weaponSocket = new THREE.Group();
  weaponSocket.position.set(.62,1.08,-.08);
  weaponSocket.rotation.set(-.12,0,-.55);
  weaponSocket.add(createWeaponModel(weapon));

  root.add(
    undershirt,torso,chest,chestCenter,strapA,strapB,belt,buckle,
    head,nose,jaw,hair,hoodGear,crownGear,brow,cowlA,cowlB,
    shoulderL,shoulderR,shoulderBandL,
    armL,armR,legL,legR,cape,backpack,bedroll,
    pendantChain,pendant,pendantGem,backRune,weaponSocket
  );

  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return {
    root, weaponSocket, armL, armR, legL, legR, cape, rune: backRune,
    torso, chest, hair, brow, shoulderL, shoulderR, backpack, pendant, hoodGear, crownGear
  };
}

function addEnemyFace(group, glowColor, y, z, spacing = .12, scale = 1) {
  const eyeMat = mat(glowColor, { emissive: glowColor, emissiveIntensity: 2.8, roughness: .15 });
  for (const x of [-spacing, spacing]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.035 * scale, 8, 6), eyeMat);
    eye.position.set(x,y,z);
    eye.scale.y = .72;
    group.add(eye);
  }
}

function taperedTorso(topRadius, bottomRadius, height, material, sides = 10) {
  const mesh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(topRadius, bottomRadius, height, sides), material));
  mesh.scale.z = .72;
  return mesh;
}

function enemyArm(material, length = .64, upper = .105, lower = .082) {
  const arm = new THREE.Group();
  const upperArm = shadow(new THREE.Mesh(new THREE.CylinderGeometry(upper, upper * 1.12, length * .52, 8), material));
  upperArm.position.y = -length * .25;
  const elbow = shadow(new THREE.Mesh(new THREE.SphereGeometry(upper * .95, 8, 6), material));
  elbow.position.y = -length * .52;
  const forearm = shadow(new THREE.Mesh(new THREE.CylinderGeometry(lower, upper, length * .5, 8), material));
  forearm.position.y = -length * .73;
  const hand = shadow(new THREE.Mesh(new THREE.SphereGeometry(lower * 1.08, 8, 6), material));
  hand.position.y = -length;
  arm.add(upperArm, elbow, forearm, hand);
  return arm;
}

function enemyLeg(material, scale = 1) {
  const leg = new THREE.Group();
  const thigh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.11*scale,.135*scale,.4*scale,8),material));
  thigh.position.y = -.2*scale;
  const knee = shadow(new THREE.Mesh(new THREE.SphereGeometry(.11*scale,8,6),material));
  knee.position.y = -.42*scale;
  const shin = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.085*scale,.11*scale,.37*scale,8),material));
  shin.position.y = -.61*scale;
  const foot = shadow(new THREE.Mesh(new THREE.BoxGeometry(.21*scale,.13*scale,.34*scale),material));
  foot.position.set(0,-.82*scale,-.08*scale);
  leg.add(thigh,knee,shin,foot);
  return leg;
}

function addEnemyClaws(group, handPos, glowMaterial, spread = 1) {
  for (let i=-1;i<=1;i++) {
    const claw = shadow(new THREE.Mesh(new THREE.ConeGeometry(.018,.18,5),glowMaterial));
    claw.position.set(handPos.x + i*.045*spread, handPos.y - .08, handPos.z - .08);
    claw.rotation.x = Math.PI * .46;
    group.add(claw);
  }
}

export function createEnemyModel(archetype, isBoss = false) {
  const group = new THREE.Group();
  const bodyMat = mat(archetype.body, {
    roughness: archetype.id === 'guardian' || isBoss ? .48 : .76,
    metalness: archetype.id === 'guardian' || isBoss ? .38 : .08,
    emissive: archetype.body,
    emissiveIntensity: isBoss ? .52 : .1
  });
  const darkMat = mat(
    archetype.id === 'ashArcher' || archetype.id === 'ashHound' ? 0x211918 : 0x161a24,
    { roughness: .88, metalness: .05 }
  );
  const armorMat = mat(
    archetype.id === 'marauder' ? 0x5a4035 : 0x455063,
    { roughness: .48, metalness: .52 }
  );
  const glowMat = mat(archetype.glow, {
    roughness: .22,
    metalness: .12,
    emissive: archetype.glow,
    emissiveIntensity: isBoss ? 2.8 : 1.9
  });

  if (archetype.id === 'shade') {
    const torso = taperedTorso(.31,.22,.82,bodyMat,10);
    torso.position.set(0,1.26,.02);
    torso.rotation.x = -.17;

    const mantle = shadow(new THREE.Mesh(new THREE.SphereGeometry(.37,12,8,0,Math.PI*2,0,Math.PI*.52),darkMat));
    mantle.position.set(0,1.67,.04);
    mantle.scale.set(1.18,.55,.88);

    const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(.25,14,10),bodyMat));
    head.position.set(0,1.97,-.08);
    head.scale.set(.82,1.08,.86);

    const jaw = shadow(new THREE.Mesh(new THREE.SphereGeometry(.19,12,8),darkMat));
    jaw.position.set(0,1.84,-.14);
    jaw.scale.set(.92,.55,.86);

    for (const side of [-1,1]) {
      const arm = enemyArm(bodyMat,.86,.085,.055);
      arm.position.set(side*.34,1.55,0);
      arm.rotation.z = side * .34;
      arm.rotation.x = -.12;
      group.add(arm);
      addEnemyClaws(group,new THREE.Vector3(side*.57,.72,-.08),glowMat,.9);

      const leg = enemyLeg(bodyMat,.84);
      leg.position.set(side*.15,.93,.07);
      leg.rotation.z = side*.06;
      group.add(leg);

      const horn = shadow(new THREE.Mesh(new THREE.ConeGeometry(.045,.29,6),glowMat));
      horn.position.set(side*.16,2.26,-.02);
      horn.rotation.z = side*.22;
      group.add(horn);
    }

    const spineGlow = shadow(new THREE.Mesh(new THREE.BoxGeometry(.055,.55,.055),glowMat));
    spineGlow.position.set(0,1.31,.22);
    spineGlow.rotation.x = -.16;
    group.add(torso,mantle,head,jaw,spineGlow);
    addEnemyFace(group,archetype.glow,2.0,-.30,.095,.9);
  } else if (archetype.id === 'marauder') {
    const torso = taperedTorso(.38,.29,.86,bodyMat,10);
    torso.position.y = 1.35;
    const breast = shadow(new THREE.Mesh(new THREE.BoxGeometry(.56,.44,.08),armorMat));
    breast.position.set(0,1.45,-.27);

    const belt = shadow(new THREE.Mesh(new THREE.BoxGeometry(.66,.11,.45),darkMat));
    belt.position.y = .96;

    const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(.27,14,10),bodyMat));
    head.position.set(0,2.02,-.02);
    head.scale.set(.88,1.05,.9);

    const hood = shadow(new THREE.Mesh(new THREE.SphereGeometry(.33,14,10,0,Math.PI*2,0,Math.PI*.68),darkMat));
    hood.position.set(0,2.09,.02);

    const shoulderL = shadow(new THREE.Mesh(new THREE.SphereGeometry(.19,10,8),armorMat));
    shoulderL.scale.set(1.35,.58,1);
    shoulderL.position.set(-.46,1.64,0);
    const shoulderR = shoulderL.clone();
    shoulderR.position.x = .46;

    for (const side of [-1,1]) {
      const arm = enemyArm(bodyMat,.68,.095,.07);
      arm.position.set(side*.44,1.57,0);
      arm.rotation.z = side*.16;
      group.add(arm);
      const leg = enemyLeg(darkMat,.95);
      leg.position.set(side*.18,.93,0);
      group.add(leg);
    }

    const sword = new THREE.Group();
    const blade = bladeFromPoints([[-.055,.1],[-.07,.72],[0,.98],[.07,.72],[.055,.1]],.055,glowMat,.008);
    const guard = shadow(new THREE.Mesh(new THREE.BoxGeometry(.3,.055,.07),armorMat));
    guard.position.y=.08;
    const grip = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.032,.038,.28,7),darkMat));
    grip.position.y=-.1;
    sword.add(blade,guard,grip);
    sword.position.set(.57,1.0,-.05);
    sword.rotation.z=-.58;

    group.add(torso,breast,belt,head,hood,shoulderL,shoulderR,sword);
    addEnemyFace(group,archetype.glow,2.03,-.27,.095,.88);
  } else if (archetype.id === 'guardian' || isBoss) {
    const scale = isBoss ? 1.08 : 1;
    const torso = taperedTorso(.48*scale,.35*scale,.98*scale,bodyMat,12);
    torso.position.y = 1.4*scale;

    const breast = shadow(new THREE.Mesh(new THREE.BoxGeometry(.7*scale,.58*scale,.11*scale),armorMat));
    breast.position.set(0,1.45*scale,-.34*scale);

    const core = shadow(new THREE.Mesh(new THREE.OctahedronGeometry(.12*scale,0),glowMat));
    core.position.set(0,1.48*scale,-.41*scale);

    const helmet = shadow(new THREE.Mesh(new THREE.SphereGeometry(.31*scale,14,10),armorMat));
    helmet.position.set(0,2.18*scale,0);
    helmet.scale.set(.95,1.03,.9);

    const facePlate = shadow(new THREE.Mesh(new THREE.BoxGeometry(.42*scale,.28*scale,.08*scale),darkMat));
    facePlate.position.set(0,2.12*scale,-.28*scale);

    for (const side of [-1,1]) {
      const shoulder = shadow(new THREE.Mesh(new THREE.SphereGeometry(.28*scale,12,8),armorMat));
      shoulder.scale.set(1.45,.62,1.08);
      shoulder.position.set(side*.58*scale,1.72*scale,0);
      group.add(shoulder);

      const arm = enemyArm(armorMat,.76*scale,.125*scale,.09*scale);
      arm.position.set(side*.57*scale,1.58*scale,0);
      arm.rotation.z = side*.13;
      group.add(arm);

      const leg = enemyLeg(darkMat,1.07*scale);
      leg.position.set(side*.21*scale,.97*scale,.02);
      group.add(leg);

      const horn = shadow(new THREE.Mesh(new THREE.ConeGeometry(.07*scale,.38*scale,6),glowMat));
      horn.position.set(side*.21*scale,2.55*scale,.02);
      horn.rotation.z = side*.2;
      group.add(horn);
    }

    const shield = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.38*scale,.38*scale,.09*scale,8),armorMat));
    shield.rotation.x = Math.PI/2;
    shield.position.set(-.72*scale,1.12*scale,-.05);
    const shieldRune = shadow(new THREE.Mesh(new THREE.RingGeometry(.14*scale,.2*scale,10),glowMat));
    shieldRune.position.set(-.72*scale,1.12*scale,-.1);
    group.add(torso,breast,core,helmet,facePlate,shield,shieldRune);
    addEnemyFace(group,archetype.glow,2.15*scale,-.34*scale,.1*scale,.85*scale);

    if (isBoss) {
      const crown = new THREE.Group();
      for (let i=0;i<5;i++) {
        const spike = shadow(new THREE.Mesh(new THREE.ConeGeometry(.055*scale,.48*scale,6),glowMat));
        spike.position.set((i-2)*.13*scale,2.65*scale + Math.abs(i-2)*.035,0);
        spike.rotation.z=(i-2)*.08;
        crown.add(spike);
      }
      const ring = shadow(new THREE.Mesh(new THREE.TorusGeometry(.5*scale,.035*scale,8,24),glowMat));
      ring.position.y = 2.28*scale;
      ring.rotation.x = Math.PI/2;
      group.add(crown,ring);
    }
  } else if (archetype.id === 'ashArcher') {
    const torso = taperedTorso(.31,.24,.78,bodyMat,10);
    torso.position.y = 1.32;
    const cloak = shadow(new THREE.Mesh(new THREE.ConeGeometry(.42,.86,10,1,true),darkMat));
    cloak.position.set(0,1.24,.12);
    cloak.rotation.x = Math.PI;

    const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(.25,14,10),bodyMat));
    head.position.set(0,2.0,-.03);
    const hood = shadow(new THREE.Mesh(new THREE.SphereGeometry(.31,14,10,0,Math.PI*2,0,Math.PI*.7),darkMat));
    hood.position.set(0,2.06,.02);

    for (const side of [-1,1]) {
      const arm = enemyArm(bodyMat,.7,.085,.06);
      arm.position.set(side*.34,1.56,0);
      arm.rotation.z = side*.12;
      group.add(arm);
      const leg = enemyLeg(darkMat,.92);
      leg.position.set(side*.16,.91,0);
      group.add(leg);
    }

    const bow = new THREE.Group();
    const arc = shadow(new THREE.Mesh(new THREE.TorusGeometry(.46,.028,6,22,Math.PI),glowMat));
    arc.rotation.set(0,Math.PI/2,Math.PI/2);
    const string = shadow(new THREE.Mesh(new THREE.BoxGeometry(.018,.91,.018),glowMat));
    bow.add(arc,string);
    bow.position.set(.52,1.37,-.08);

    const quiver = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,.66,8),darkMat));
    quiver.position.set(-.32,1.37,.28);
    quiver.rotation.z=.16;

    group.add(torso,cloak,head,hood,bow,quiver);
    addEnemyFace(group,archetype.glow,2.02,-.26,.09,.84);
  } else if (archetype.id === 'ashHound') {
    const body = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(.24,.78,5,9),bodyMat));
    body.rotation.z = Math.PI/2;
    body.position.set(0,.78,.08);
    body.scale.set(1,1,.82);

    const chest = shadow(new THREE.Mesh(new THREE.SphereGeometry(.32,12,9),bodyMat));
    chest.position.set(0,.82,-.32);
    chest.scale.set(.9,1.08,.9);

    const neck = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.16,.21,.38,8),darkMat));
    neck.position.set(0,1.02,-.55);
    neck.rotation.x = -.62;

    const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(.24,12,9),bodyMat));
    head.position.set(0,1.12,-.77);
    head.scale.set(.86,.82,1.15);

    const muzzle = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,.34,8),darkMat));
    muzzle.rotation.x = Math.PI/2;
    muzzle.position.set(0,1.05,-1.02);

    for (const side of [-1,1]) {
      const ear = shadow(new THREE.Mesh(new THREE.ConeGeometry(.06,.28,6),glowMat));
      ear.position.set(side*.14,1.39,-.78);
      ear.rotation.z = side*.18;
      group.add(ear);

      for (const z of [-.38,.36]) {
        const leg = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,.44,7),darkMat));
        leg.position.set(side*.22,.42,z);
        leg.rotation.z = side*.05;
        const paw = shadow(new THREE.Mesh(new THREE.BoxGeometry(.16,.1,.23),bodyMat));
        paw.position.set(side*.22,.18,z-.04);
        group.add(leg,paw);
      }
    }

    const tail = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.035,.065,.65,7),darkMat));
    tail.position.set(0,.9,.65);
    tail.rotation.x = -.82;

    group.add(body,chest,neck,head,muzzle,tail);
    addEnemyFace(group,archetype.glow,1.15,-.98,.09,.8);
  }

  group.scale.setScalar(archetype.scale ?? 1);
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return { group, bodyMat, glowMat };
}
