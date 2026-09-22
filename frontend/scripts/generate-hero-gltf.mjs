import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'public/assets/eteria_hero.gltf');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const bones = [
  ['Hips',null,[0,1.05,0]],['Spine','Hips',[0,.33,0]],['Chest','Spine',[0,.34,0]],
  ['Neck','Chest',[0,.28,0]],['Head','Neck',[0,.22,0]],
  ['UpperArm_L','Chest',[-.42,.18,0]],['ForeArm_L','UpperArm_L',[0,-.40,0]],['Hand_L','ForeArm_L',[0,-.34,0]],
  ['UpperArm_R','Chest',[.42,.18,0]],['ForeArm_R','UpperArm_R',[0,-.40,0]],['Hand_R','ForeArm_R',[0,-.34,0]],
  ['UpperLeg_L','Hips',[-.19,-.08,0]],['LowerLeg_L','UpperLeg_L',[0,-.45,0]],['Foot_L','LowerLeg_L',[0,-.40,-.06]],
  ['UpperLeg_R','Hips',[.19,-.08,0]],['LowerLeg_R','UpperLeg_R',[0,-.45,0]],['Foot_R','LowerLeg_R',[0,-.40,-.06]],
];
const boneIndex = Object.fromEntries(bones.map((b,i)=>[b[0],i]));

function mul4(a,b){
  const o=new Float32Array(16);
  for(let r=0;r<4;r++) for(let c=0;c<4;c++) for(let k=0;k<4;k++) o[r*4+c]+=a[r*4+k]*b[k*4+c];
  return o;
}
function translate(x,y,z){const m=new Float32Array([1,0,0,x,0,1,0,y,0,0,1,z,0,0,0,1]);return m;}
function invertTranslation(m){return translate(-m[3],-m[7],-m[11]);}
const worlds=[];
for(const [name,parent,t] of bones){const local=translate(...t); worlds.push(parent?mul4(worlds[boneIndex[parent]],local):local);}
function gltfMatrix(m){return [m[0],m[4],m[8],m[12],m[1],m[5],m[9],m[13],m[2],m[6],m[10],m[14],m[3],m[7],m[11],m[15]];}

function quat(rx=0,ry=0,rz=0){
  const cx=Math.cos(rx/2),sx=Math.sin(rx/2),cy=Math.cos(ry/2),sy=Math.sin(ry/2),cz=Math.cos(rz/2),sz=Math.sin(rz/2);
  return [sx*cy*cz+cx*sy*sz,cx*sy*cz-sx*cy*sz,cx*cy*sz+sx*sy*cz,cx*cy*cz-sx*sy*sz];
}

function ellipsoid(center,radii,joint,lat=8,lon=12){
  const [cx,cy,cz]=center,[rx,ry,rz]=radii,p=[],n=[],uv=[],f=[];
  for(let i=0;i<=lat;i++){
    const v=i/lat,th=v*Math.PI,st=Math.sin(th),ct=Math.cos(th);
    for(let j=0;j<=lon;j++){
      const u=j/lon,ph=u*Math.PI*2,cp=Math.cos(ph),sp=Math.sin(ph),x=rx*st*cp,y=ry*ct,z=rz*st*sp;
      p.push(cx+x,cy+y,cz+z);let nx=x/(rx*rx),ny=y/(ry*ry),nz=z/(rz*rz);const l=Math.hypot(nx,ny,nz)||1; n.push(nx/l,ny/l,nz/l);uv.push(u,1-v);
    }
  }
  for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){const a=i*(lon+1)+j,b=a+1,c=(i+1)*(lon+1)+j,d=c+1;f.push(a,c,b,b,c,d);}
  return {p,n,uv,f,joint};
}
function cylinder(center,r,h,joint,sides=12){
  const [cx,cy,cz]=center,p=[],n=[],uv=[],f=[];
  for(let k=0;k<2;k++){const yo=(k?1:-1)*h/2;for(let j=0;j<=sides;j++){const u=j/sides,a=u*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);p.push(cx+r*ca,cy+yo,cz+r*sa);n.push(ca,0,sa);uv.push(u,k);}}
  for(let j=0;j<sides;j++){const a=j,b=j+1,c=sides+1+j,d=c+1;f.push(a,c,b,b,c,d);} return {p,n,uv,f,joint};
}
function box(center,size,joint){
  const [cx,cy,cz]=center,[sx,sy,sz]=size,p=[],n=[],uv=[],f=[];
  const faces=[[[0,0,-1],[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1]]],[[0,0,1],[[-1,-1,1],[-1,1,1],[1,1,1],[1,-1,1]]],[[-1,0,0],[[-1,-1,-1],[-1,1,-1],[-1,1,1],[-1,-1,1]]],[[1,0,0],[[1,-1,-1],[1,-1,1],[1,1,1],[1,1,-1]]],[[0,-1,0],[[-1,-1,-1],[-1,-1,1],[1,-1,1],[1,-1,-1]]],[[0,1,0],[[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]]]];
  for(const [nn,vs] of faces){const base=p.length/3;vs.forEach(([x,y,z],i)=>{p.push(cx+x*sx/2,cy+y*sy/2,cz+z*sz/2);n.push(...nn);uv.push(i===1||i===2?1:0,i>=2?1:0);});f.push(base,base+1,base+2,base,base+2,base+3);} return {p,n,uv,f,joint};
}

const groups=[[],[],[],[]]; const add=(m,g)=>groups[m].push(g);
add(0,ellipsoid([0,2.34,-.02],[.29,.34,.27],boneIndex.Head,10,16));
add(0,ellipsoid([-.43,1.03,-.01],[.105,.13,.1],boneIndex.Hand_L,6,10)); add(0,ellipsoid([.43,1.03,-.01],[.105,.13,.1],boneIndex.Hand_R,6,10));
add(1,ellipsoid([0,1.53,.02],[.37,.43,.24],boneIndex.Chest,8,14));
for(const [x,b1,b2] of [[-.19,'UpperLeg_L','LowerLeg_L'],[.19,'UpperLeg_R','LowerLeg_R']]){add(1,cylinder([x,.72,0],.135,.42,boneIndex[b1],10));add(1,cylinder([x,.29,0],.115,.39,boneIndex[b2],10));}
for(const [x,b] of [[-.42,'UpperArm_L'],[.42,'UpperArm_R']]) add(1,cylinder([x,1.68,0],.115,.4,boneIndex[b],10));
add(2,ellipsoid([0,1.52,-.015],[.39,.40,.225],boneIndex.Chest,8,14));
add(2,cylinder([-.42,1.31,0],.105,.30,boneIndex.ForeArm_L,10));add(2,cylinder([.42,1.31,0],.105,.30,boneIndex.ForeArm_R,10));
add(2,box([-.19,.08,-.10],[.27,.28,.44],boneIndex.Foot_L));add(2,box([.19,.08,-.10],[.27,.28,.44],boneIndex.Foot_R));add(2,box([0,1.08,.23],[.62,.18,.22],boneIndex.Hips));
add(3,box([0,1.57,-.235],[.52,.38,.07],boneIndex.Chest));add(3,ellipsoid([-.47,1.83,-.01],[.24,.15,.20],boneIndex.Chest,6,10));add(3,ellipsoid([.47,1.83,-.01],[.21,.13,.18],boneIndex.Chest,6,10));

let chunks=[],byteLength=0,bufferViews=[],accessors=[];
function align4(){while(byteLength%4){chunks.push(Buffer.from([0]));byteLength++;}}
function view(buf,target){align4();const i=bufferViews.length;bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:buf.length,...(target?{target}:{})});chunks.push(buf);byteLength+=buf.length;return i;}
function packFloat(a){const b=Buffer.alloc(a.length*4);a.forEach((v,i)=>b.writeFloatLE(v,i*4));return b;}
function packU16(a){const b=Buffer.alloc(a.length*2);a.forEach((v,i)=>b.writeUInt16LE(v,i*2));return b;}
function packU32(a){const b=Buffer.alloc(a.length*4);a.forEach((v,i)=>b.writeUInt32LE(v,i*4));return b;}
function acc(arr,componentType,type,target,minmax=false){let buf;if(componentType===5126)buf=packFloat(arr);else if(componentType===5123)buf=packU16(arr);else buf=packU32(arr);const bv=view(buf,target), comps={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[type],count=arr.length/comps,a={bufferView:bv,componentType,count,type};if(minmax){a.min=[];a.max=[];for(let c=0;c<comps;c++){let vals=[];for(let i=c;i<arr.length;i+=comps)vals.push(arr[i]);a.min.push(Math.min(...vals));a.max.push(Math.max(...vals));}}accessors.push(a);return accessors.length-1;}

const primitives=[];
for(let mat=0;mat<4;mat++){
  let p=[],n=[],uv=[],f=[],j=[],w=[],base=0;
  for(const g of groups[mat]){p.push(...g.p);n.push(...g.n);uv.push(...g.uv);f.push(...g.f.map(v=>v+base));for(let k=0;k<g.p.length/3;k++){j.push(g.joint,0,0,0);w.push(1,0,0,0);}base+=g.p.length/3;}
  primitives.push({attributes:{POSITION:acc(p,5126,'VEC3',34962,true),NORMAL:acc(n,5126,'VEC3',34962),TEXCOORD_0:acc(uv,5126,'VEC2',34962),JOINTS_0:acc(j,5123,'VEC4',34962),WEIGHTS_0:acc(w,5126,'VEC4',34962)},indices:acc(f,5125,'SCALAR',34963),material:mat});
}

const fv=[-.13,.06,-.28,-.05,.06,-.285,-.05,.085,-.285,-.13,.085,-.28,.05,.06,-.285,.13,.06,-.28,.13,.085,-.28,.05,.085,-.285,-.10,-.105,-.285,.10,-.105,-.285,.10,-.075,-.285,-.10,-.075,-.285];
const fn=Array(12).fill(0).flatMap(()=>[0,0,-1]),fuv=Array(12).fill(0).flatMap(()=>[0,0]),fi=[0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11];
const blink=new Array(fv.length).fill(0),smile=new Array(fv.length).fill(0);for(let i=0;i<8;i++)blink[i*3+1]=-.018;for(const i of [8,9])smile[i*3+1]=.03;for(const i of [10,11])smile[i*3+1]=.02;
const facePrim={attributes:{POSITION:acc(fv,5126,'VEC3',34962,true),NORMAL:acc(fn,5126,'VEC3',34962),TEXCOORD_0:acc(fuv,5126,'VEC2',34962)},indices:acc(fi,5125,'SCALAR',34963),material:4,targets:[{POSITION:acc(blink,5126,'VEC3',34962)},{POSITION:acc(smile,5126,'VEC3',34962)}]};

let ibm=[];for(const m of worlds)ibm.push(...gltfMatrix(invertTranslation(m)));const ibmAcc=acc(ibm,5126,'MAT4');
const animations=[];
function animation(name,tracks){const samplers=[],channels=[];for(const [bone,keys] of tracks){const times=keys.map(k=>k[0]),vals=keys.flatMap(k=>k[1]),si=samplers.length;samplers.push({input:acc(times,5126,'SCALAR',null,true),output:acc(vals,5126,'VEC4'),interpolation:'LINEAR'});channels.push({sampler:si,target:{node:1+boneIndex[bone],path:'rotation'}});}animations.push({name,samplers,channels});}
function loop(a,d=1){return [[0,quat(...a[0])],[d*.25,quat(...a[1])],[d*.5,quat(...a[2])],[d*.75,quat(...a[3])],[d,quat(...a[0])]];}
animation('Idle',[['Chest',[[0,quat()],[.6,quat(.035,0,0)],[1.2,quat()],[1.8,quat(-.02,0,0)],[2.4,quat()]]],['Head',[[0,quat()],[1.2,quat(0,.06,0)],[2.4,quat()]]]]);
animation('Walk',[['UpperLeg_L',loop([[.5,0,0],[0,0,0],[-.5,0,0],[0,0,0]])],['UpperLeg_R',loop([[-.5,0,0],[0,0,0],[.5,0,0],[0,0,0]])],['UpperArm_L',loop([[-.35,0,0],[0,0,0],[.35,0,0],[0,0,0]])],['UpperArm_R',loop([[.35,0,0],[0,0,0],[-.35,0,0],[0,0,0]])]]);
animation('Run',[['UpperLeg_L',loop([[.75,0,0],[0,0,0],[-.75,0,0],[0,0,0]],.72)],['UpperLeg_R',loop([[-.75,0,0],[0,0,0],[.75,0,0],[0,0,0]],.72)],['UpperArm_L',loop([[-.62,0,0],[0,0,0],[.62,0,0],[0,0,0]],.72)],['UpperArm_R',loop([[.62,0,0],[0,0,0],[-.62,0,0],[0,0,0]],.72)]]);
animation('Attack_1',[['Chest',[[0,quat()],[.16,quat(0,-.35,-.12)],[.32,quat(.08,.42,.12)],[.52,quat()]]],['UpperArm_R',[[0,quat()],[.16,quat(-.75,0,-.65)],[.32,quat(-.2,0,1)],[.52,quat()]]]]);
animation('Attack_2',[['Chest',[[0,quat()],[.18,quat(0,.42,.15)],[.36,quat(.06,-.5,-.1)],[.58,quat()]]],['UpperArm_R',[[0,quat()],[.18,quat(-.35,0,1.05)],[.36,quat(-.8,0,-.85)],[.58,quat()]]]]);
animation('Heavy_Attack',[['Chest',[[0,quat()],[.28,quat(-.18,0,0)],[.52,quat(.38,0,0)],[.82,quat()]]],['UpperArm_R',[[0,quat()],[.28,quat(-1.8,0,-.2)],[.52,quat(.5,0,.25)],[.82,quat()]]],['UpperArm_L',[[0,quat()],[.28,quat(-1.25,0,.25)],[.52,quat(.2,0,-.2)],[.82,quat()]]]]);
animation('Dash',[['Chest',[[0,quat()],[.12,quat(.48,0,0)],[.28,quat(.34,0,0)],[.38,quat()]]],['Head',[[0,quat()],[.12,quat(-.18,0,0)],[.38,quat()]]]]);

const WHITE='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==';
const NORMAL='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNoaPj/HwAGggL/s75RMwAAAABJRU5ErkJggg==';
const MR='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4v0XkPwAHRALHKGnOVwAAAABJRU5ErkJggg==';
const images=[{uri:`data:image/png;base64,${WHITE}`},{uri:`data:image/png;base64,${NORMAL}`},{uri:`data:image/png;base64,${MR}`}],textures=[{source:0,sampler:0},{source:1,sampler:0},{source:2,sampler:0}];
const specs=[['Skin',[.70,.43,.30,1],.76,.02],['Cloth',[.11,.15,.21,1],.94,0],['Leather',[.30,.17,.10,1],.86,.03],['Steel',[.48,.52,.58,1],.32,.82],['Face',[.10,.055,.04,1],.9,0]];
const materials=specs.map(([name,color,rough,metal])=>({name,pbrMetallicRoughness:{baseColorFactor:color,baseColorTexture:{index:0},metallicRoughnessTexture:{index:2},metallicFactor:metal,roughnessFactor:rough},normalTexture:{index:1,scale:.3}}));

const nodes=[{name:'EteriaArmature',children:[1]}];
for(const [name,parent,t] of bones){const children=bones.map((b,i)=>b[1]===name?1+i:null).filter(v=>v!==null);nodes.push({name,translation:t,...(children.length?{children}:{})});}
const meshNode=nodes.length;nodes.push({name:'EteriaHeroMesh',mesh:0,skin:0});const faceNode=nodes.length;nodes.push({name:'FaceRig',mesh:1,weights:[0,0]});nodes[1+boneIndex.Head].children??=[];nodes[1+boneIndex.Head].children.push(faceNode);const socketNode=nodes.length;nodes.push({name:'WeaponSocket_R',translation:[0,-.14,-.02],rotation:quat(0,0,-.1)});nodes[1+boneIndex.Hand_R].children??=[];nodes[1+boneIndex.Hand_R].children.push(socketNode);nodes[0].children.push(meshNode);

const blob=Buffer.concat(chunks);const gltf={asset:{version:'2.0',generator:'Eteria rig generator 4.2'},scene:0,scenes:[{nodes:[0]}],nodes,meshes:[{name:'EteriaHeroBody',primitives},{name:'EteriaFaceRig',primitives:[facePrim],weights:[0,0],extras:{targetNames:['Blink','Smile']}}],skins:[{name:'EteriaSkeleton',inverseBindMatrices:ibmAcc,joints:bones.map((_,i)=>1+i),skeleton:1}],animations,materials,images,textures,samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],buffers:[{byteLength:blob.length,uri:`data:application/octet-stream;base64,${blob.toString('base64')}`}],bufferViews,accessors,extras:{eteria:{version:'4.2',facialMorphs:['Blink','Smile'],weaponSocket:'WeaponSocket_R',animations:animations.map(a=>a.name)}}};
fs.writeFileSync(OUT,JSON.stringify(gltf));
console.log(`[eteria] generated ${path.relative(process.cwd(),OUT)} (${Math.round(fs.statSync(OUT).size/1024)} KB)`);
