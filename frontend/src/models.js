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
    head,nose,jaw,hair,brow,cowlA,cowlB,
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
    torso, chest, hair, brow, shoulderL, shoulderR, backpack, pendant
  };
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
