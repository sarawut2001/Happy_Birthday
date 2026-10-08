import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

export type MonchhichiPose = 'Idle' | 'Walk' | 'Wave' | 'Celebrate' | 'Shy' | 'Float' | 'Hug' | 'Present' | 'Invite' | 'Blow' | 'Thanks';
export const monchhichiPoses: MonchhichiPose[] = ['Idle', 'Walk', 'Wave', 'Celebrate', 'Shy', 'Float', 'Hug', 'Present', 'Invite', 'Blow', 'Thanks'];
const smooth = THREE.MathUtils.smoothstep;
const clamp = THREE.MathUtils.clamp;
const factor = 2.8 / 1.898819;
const bounds = { minX: -.650, maxX: .650, minY: -.975, maxY: .975 };
const worldPoint = (x: number, y: number, z = 0) => new THREE.Vector3((x + .002659) * factor, (y + .951554) * factor, z * factor);

// Offline authoring only. The application loads the exported GLB.
// Reproject the source artwork before replacing its thin, irregular side walls.
export function projectReference(source: GLTF) {
  const width = 1024, height = 1536;
  const scene = new THREE.Scene(), root = source.scene.clone(true);
  const materials: THREE.Material[] = [];
  root.traverse(o => { if (o instanceof THREE.Mesh) {
    const original = (Array.isArray(o.material) ? o.material[0] : o.material) as THREE.MeshStandardMaterial;
    const mat = new THREE.MeshBasicMaterial({ map: original.map, color: original.color, side: THREE.DoubleSide, toneMapped: false });
    materials.push(mat); o.material = mat;
  } });
  scene.add(root);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height); renderer.setClearColor(0, 0); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  const camera = new THREE.OrthographicCamera(bounds.minX, bounds.maxX, bounds.maxY, bounds.minY, .01, 10); camera.position.z = 3;
  renderer.render(scene, camera);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(renderer.domElement, 0, 0);
  renderer.dispose(); materials.forEach(m => m.dispose());
  const image = ctx.getImageData(0, 0, width, height), pixels = image.data, mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = pixels[i * 4 + 3] > 48 ? 1 : 0;
  // Seal enclosed raster pinholes and extend their neighboring colors. Exterior gaps stay open.
  const outside = new Uint8Array(mask.length), queue = new Int32Array(mask.length); let start = 0, end = 1; outside[0] = 1;
  while (start < end) { const i = queue[start++], x = i % width;
    for (const n of [x ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i >= width ? i - width : -1, i < mask.length - width ? i + width : -1]) {
      if (n < 0 || outside[n] || mask[n]) continue; outside[n] = 1; queue[end++] = n;
    }
  }
  let holes = 0;
  for (let i = 0; i < mask.length; i++) if (!outside[i] && !mask[i]) { mask[i] = 2; holes++; }
  for (let pass = 0; pass < 32 && holes; pass++) for (let i = 0; i < mask.length; i++) if (mask[i] === 2) {
    const n = [i - 1, i + 1, i - width, i + width].find(j => j >= 0 && j < mask.length && mask[j] === 1);
    if (n === undefined) continue;
    for (let k = 0; k < 3; k++) pixels[i * 4 + k] = pixels[n * 4 + k]; pixels[i * 4 + 3] = 255; mask[i] = 1; holes--;
  }
  ctx.putImageData(image, 0, 0);
  return { canvas, width, height, pixels, mask, bounds };
}
type Point = [number, number];
type Part = { name: string; polygon: Point[]; center: Point; front: number; curve: number; depth: number; rect: [number, number, number, number]; };
const parts: Part[] = [
  { name: 'head', polygon: [[-.65,1],[.65,1],[.65,.16],[.51,.16],[.485,.11],[.468,.075],[.435,.02],[.403,-.055],[.35,-.12],[.25,-.17],[0,-.205],[-.24,-.195],[-.42,-.125],[-.57,-.045],[-.65,.02]], center: [0,.40], front: .025, curve: .235, depth: .30, rect: [8,8,1200,1200] },
  { name: 'body', polygon: [[-.29,-.16],[.255,-.16],[.30,-.24],[.36,-.43],[.385,-.58],[.37,-.72],[.15,-.80],[-.15,-.80],[-.36,-.70],[-.365,-.49],[-.32,-.30]], center: [0,-.49], front: -.012, curve: .155, depth: .18, rect: [8,1220,620,810] },
  { name: 'armL', polygon: [[-.23,-.18],[-.24,-.52],[-.47,-.51],[-.50,-.45],[-.49,-.365],[-.42,-.255],[-.36,-.18]], center: [-.38,-.355], front: -.04, curve: .072, depth: .085, rect: [1230,8,800,410] },
  { name: 'armR', polygon: [[.225,-.235],[.36,-.10],[.455,-.02],[.50,-.035],[.545,-.075],[.50,-.16],[.46,-.33],[.32,-.445],[.24,-.39]], center: [.385,-.21], front: -.04, curve: .072, depth: .085, rect: [1230,438,800,530] },
  { name: 'handL', polygon: [[-.65,-.34],[-.48,-.35],[-.465,-.39],[-.46,-.54],[-.65,-.55]], center: [-.54,-.425], front: -.032, curve: .066, depth: .075, rect: [1450,1220,580,370] },
  { name: 'handR', polygon: [[.435,.020],[.47,.10],[.65,.14],[.65,-.12],[.505,-.11],[.475,-.065]], center: [.54,.005], front: -.032, curve: .066, depth: .075, rect: [1450,1610,580,420] },
  { name: 'legL', polygon: [[-.36,-.65],[-.035,-.68],[-.015,-.78],[-.08,-.99],[-.42,-.99],[-.42,-.80]], center: [-.22,-.83], front: -.025, curve: .092, depth: .115, rect: [650,1220,380,650] },
  { name: 'legR', polygon: [[.015,-.68],[.37,-.65],[.43,-.99],[.10,-.99],[.015,-.79]], center: [.23,-.83], front: -.025, curve: .092, depth: .115, rect: [1050,1220,380,650] },
  { name: 'tail', polygon: [[-.29,-.55],[-.29,-.76],[-.65,-.77],[-.65,-.53]], center: [-.43,-.66], front: -.055, curve: .046, depth: .046, rect: [1230,990,800,210] },
];
function inside(x: number, y: number, polygon: Point[]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const a = points[0], b = points[points.length - 1], dx = b[0] - a[0], dy = b[1] - a[1]; let largest = 0, at = 0;
  for (let i = 1; i < points.length - 1; i++) { const p = points[i], t = clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1),0,1); const d = Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy); if (d > largest) { largest = d; at = i; } }
  return largest > tolerance ? [...simplify(points.slice(0,at+1),tolerance).slice(0,-1),...simplify(points.slice(at),tolerance)] : [a,b];
}
function outline(part: Part, reference: ReturnType<typeof projectReference>) {
  const w = 512, h = 768, mask = new Uint8Array(w*h), sx = (bounds.maxX-bounds.minX)/w, sy = (bounds.maxY-bounds.minY)/h;
  for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
    const x = bounds.minX+(col+.5)*sx, y = bounds.maxY-(row+.5)*sy;
    if (inside(x,y,part.polygon) && reference.mask[(row*2+1)*reference.width+col*2+1]) mask[row*w+col] = 1;
  }
  // Keep the anatomical silhouette, excluding detached subpixel atlas artifacts.
  const visited = new Uint8Array(mask.length), queue = new Int32Array(mask.length); let largest: number[] = [];
  for (let i = 0; i < mask.length; i++) if (mask[i] && !visited[i]) {
    let start = 0, end = 1; queue[0] = i; visited[i] = 1;
    while (start < end) { const j = queue[start++], x = j%w; for (const n of [x?j-1:-1,x<w-1?j+1:-1,j>=w?j-w:-1,j<mask.length-w?j+w:-1]) if (n>=0&&mask[n]&&!visited[n]) { visited[n]=1;queue[end++]=n; } }
    if (end > largest.length) largest = Array.from(queue.subarray(0,end));
  }
  mask.fill(0); for (const i of largest) mask[i] = 1;
  const edges = new Map<number,number[]>(), key = (x: number,y: number) => y*(w+1)+x;
  const edge = (a: number,b: number) => { const list = edges.get(a)??[];list.push(b);edges.set(a,list); };
  for (const i of largest) { const x=i%w,y=Math.floor(i/w);
    if (!y||!mask[i-w]) edge(key(x,y),key(x+1,y));
    if (x===w-1||!mask[i+1]) edge(key(x+1,y),key(x+1,y+1));
    if (y===h-1||!mask[i+w]) edge(key(x+1,y+1),key(x,y+1));
    if (!x||!mask[i-1]) edge(key(x,y+1),key(x,y));
  }
  let longest: Point[] = [];
  while (edges.size) { const first = edges.keys().next().value!, loop: Point[] = []; let at=first,guard=0;
    do { loop.push([bounds.minX+(at%(w+1))*sx,bounds.maxY-Math.floor(at/(w+1))*sy]);const list=edges.get(at);if(!list?.length)break;const next=list.pop()!;if(!list.length)edges.delete(at);at=next; } while(at!==first&&guard++<mask.length*2);
    if (loop.length > longest.length) longest = loop;
  }
  if (longest.length < 3) throw new Error(`Empty silhouette: ${part.name}`);
  const middle = Math.floor(longest.length/2);
  const contour = [...simplify(longest.slice(0,middle+1),.0018).slice(0,-1),...simplify([...longest.slice(middle),longest[0]],.0018).slice(0,-1)];
  if (THREE.ShapeUtils.isClockWise(contour.map(p=>new THREE.Vector2(...p)))) contour.reverse();
  return contour;
}
function cap(contour: Point[]) {
  const points = contour.slice(), triangles = THREE.ShapeUtils.triangulateShape(contour.map(p=>new THREE.Vector2(...p)),[]).flat();
  let indices = triangles; const key = (a: number,b: number) => a<b?`${a}:${b}`:`${b}:${a}`;
  // Conforming subdivision: neighboring triangles share every new midpoint,
  // including contour edges, so the front/back caps never acquire T-junctions.
  for (let pass=0;pass<10;pass++) {
    const split=new Map<string,number>();
    for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){const a=indices[i+k],b=indices[i+(k+1)%3];if(Math.hypot(points[a][0]-points[b][0],points[a][1]-points[b][1])>.032&&!split.has(key(a,b))){split.set(key(a,b),points.length);points.push([(points[a][0]+points[b][0])/2,(points[a][1]+points[b][1])/2]);}}
    if(!split.size)break;
    const next:number[]=[];
    for(let i=0;i<indices.length;i+=3){const[a,b,c]=indices.slice(i,i+3),ab=split.get(key(a,b)),bc=split.get(key(b,c)),ca=split.get(key(c,a));
      if(ab!==undefined&&bc!==undefined&&ca!==undefined)next.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
      else if(ab!==undefined&&bc!==undefined)next.push(a,ab,c,ab,bc,c,ab,b,bc);
      else if(bc!==undefined&&ca!==undefined)next.push(b,bc,a,bc,ca,a,bc,c,ca);
      else if(ca!==undefined&&ab!==undefined)next.push(c,ca,b,ca,ab,b,ca,a,ab);
      else if(ab!==undefined)next.push(a,ab,c,ab,b,c);
      else if(bc!==undefined)next.push(b,bc,a,bc,c,a);
      else if(ca!==undefined)next.push(c,ca,b,ca,a,b);
      else next.push(a,b,c);
    }
    indices=next;
  }
  const edges=new Map<string,{a:number;b:number;count:number}>();
  // Earcut and the conforming splits preserve CCW winding. Do not independently
  // flip nearly collinear triangles: floating-point signs can reverse a shared edge.
  for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){const a=indices[i+k],b=indices[i+(k+1)%3],id=key(a,b),existing=edges.get(id);if(existing)existing.count++;else edges.set(id,{a,b,count:1});}
  return { points, indices, boundary:[...edges.values()].filter(e=>e.count===1) };
}

export function createMonchhichi(source: GLTF) {
  const reference=projectReference(source), atlas=document.createElement('canvas');atlas.width=atlas.height=2048;
  const ctx=atlas.getContext('2d',{willReadFrequently:true})!;
  const root=new THREE.Group();root.name='Monchhichi';const bones:THREE.Bone[]=[],positions=new Map<string,THREE.Vector3>();
  const bone=(name:string,parent:THREE.Object3D,p:[number,number,number])=>{const world=worldPoint(...p),b=new THREE.Bone();b.name=name;b.position.copy(world).sub(positions.get(parent.name)??new THREE.Vector3());parent.add(b);bones.push(b);positions.set(name,world);return b;};
  const pelvis=bone('Pelvis',root,[0,-.58,-.055]),spine=bone('Spine',pelvis,[0,-.30,-.055]);bone('Head',spine,[0,-.17,-.035]);
  const armL=bone('ArmL',spine,[-.255,-.285,-.05]),elbowL=bone('ElbowL',armL,[-.40,-.375,-.05]);bone('HandL',elbowL,[-.485,-.405,-.03]);
  const armR=bone('ArmR',spine,[.265,-.275,-.05]),elbowR=bone('ElbowR',armR,[.40,-.18,-.05]);bone('HandR',elbowR,[.485,-.075,-.03]);
  const legL=bone('LegL',pelvis,[-.14,-.695,-.055]),kneeL=bone('KneeL',legL,[-.22,-.815,-.035]);bone('FootL',kneeL,[-.27,-.895,.005]);
  const legR=bone('LegR',pelvis,[.16,-.695,-.055]),kneeR=bone('KneeR',legR,[.26,-.805,-.035]);bone('FootR',kneeR,[.29,-.87,.005]);bone('Tail',pelvis,[-.285,-.67,-.05]);
  const boneIndex=new Map(bones.map((b,i)=>[b.name,i]));
  const pos:number[]=[],uv:number[]=[],colors:number[]=[],joints:number[]=[],weights:number[]=[],frontIndices:number[][]=[[],[],[],[]],shellIndices:number[]=[];
  const fur=new THREE.Color('#594229'),skin=new THREE.Color('#ffe0b4'),sideNormals=new Map<number,THREE.Vector3>();
  const shellColor=(part:Part,x:number,y:number)=>{const pale=part.name.startsWith('hand')?1:part.name.startsWith('leg')?1-smooth(y,-.885,-.855):part.name==='armL'?1-smooth(x,-.49,-.455):part.name==='armR'?smooth(x,.48,.515):part.name==='head'&&Math.abs(x)>.37&&y<.20&&y>-.06?.40:0;return fur.clone().lerp(skin,pale);};
  const influence=(part:Part,x:number,y:number):[string,number][]=>{
    if(part.name==='head')return[['Head',1]];
    if(part.name.startsWith('hand'))return[[part.name==='handL'?'HandL':'HandR',1]];
    if(part.name==='body'){const t=smooth(y,-.64,-.35);return[['Spine',t],['Pelvis',1-t]];}
    if(part.name==='tail')return[['Tail',1]];
    if(part.name.startsWith('arm')){const side=part.name.endsWith('L')?'L':'R',a=Math.abs(x),elbow=smooth(a,.365,.43),shoulder=smooth(a,.245,.285);return[['Spine',1-shoulder],[`Arm${side}`,shoulder*(1-elbow)],[`Elbow${side}`,shoulder*elbow]];}
    const side=part.name.endsWith('L')?'L':'R',hip=1-smooth(y,-.755,-.69),knee=1-smooth(y,-.86,-.78),foot=1-smooth(y,-.915,-.86);return[['Pelvis',1-hip],[`Leg${side}`,hip*(1-knee)],[`Knee${side}`,hip*knee*(1-foot)],[`Foot${side}`,hip*knee*foot]];
  };
  const specs:Record<string,unknown>[]=[];
  for(const part of parts){
    const contour=outline(part,reference),surface=cap(contour),minX=Math.min(...contour.map(p=>p[0]))-.012,maxX=Math.max(...contour.map(p=>p[0]))+.012,minY=Math.min(...contour.map(p=>p[1]))-.012,maxY=Math.max(...contour.map(p=>p[1]))+.012;
    const [rx,ry,rw,rh]=part.rect;ctx.fillStyle='#594229';ctx.fillRect(rx-4,ry-4,rw+8,rh+8);
    ctx.drawImage(reference.canvas,(minX-bounds.minX)/(bounds.maxX-bounds.minX)*reference.width,(bounds.maxY-maxY)/(bounds.maxY-bounds.minY)*reference.height,(maxX-minX)/(bounds.maxX-bounds.minX)*reference.width,(maxY-minY)/(bounds.maxY-bounds.minY)*reference.height,rx,ry,rw,rh);
    if(part.name==='armR'){const image=ctx.getImageData(rx,ry,rw,rh);for(let row=0;row<rh;row++)for(let col=0;col<rw;col++){const x=minX+col/rw*(maxX-minX),y=maxY-row/rh*(maxY-minY);if(y>-.14&&inside(x,y,parts[0].polygon)){const i=(row*rw+col)*4;image.data[i]=89;image.data[i+1]=66;image.data[i+2]=41;image.data[i+3]=255;}}ctx.putImageData(image,rx,ry);}
    const base=pos.length/3,count=surface.points.length;
    const ax=(maxX-minX)*.52,ay=(maxY-minY)*.53;
    const add=(x:number,y:number,z:number,back:boolean)=>{const v=worldPoint(x,y,z);pos.push(v.x,v.y,v.z);uv.push((rx+(x-minX)/(maxX-minX)*rw)/2048,1-(ry+(maxY-y)/(maxY-minY)*rh)/2048);
      const c=shellColor(part,x,y);colors.push(back?c.r:1,back?c.g:1,back?c.b:1);const list=influence(part,x,y);for(let i=0;i<4;i++){joints.push(boneIndex.get(list[i]?.[0]??'Pelvis')!);weights.push(list[i]?.[1]??0);}
    };
    // Inflate from the exact contour, rather than extruding a flat image.
    // Distance to its boundary makes both caps roll into a thin equator.
    const distances = surface.points.map(([x,y]) => {
      let nearest = Infinity;
      for (const {a,b} of surface.boundary) {
        const A=surface.points[a],B=surface.points[b],dx=B[0]-A[0],dy=B[1]-A[1];
        const t=clamp(((x-A[0])*dx+(y-A[1])*dy)/(dx*dx+dy*dy||1),0,1);
        nearest=Math.min(nearest,Math.hypot(x-A[0]-t*dx,y-A[1]-t*dy));
      }
      return nearest;
    });
    const radius=Math.max(...distances);
    const dome=(i:number)=>Math.sqrt(Math.max(0,1-(1-distances[i]/radius)**2));
    const bump=(x:number,y:number,cx:number,cy:number,rx:number,ry:number)=>Math.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2)*2);
    surface.points.forEach(([x,y],i)=>{
      const d=dome(i), edge=smooth(distances[i],0,.045);
      let detail=0;
      if(part.name==='head') {
        detail=.074*bump(x,y,-.044,.07,.060,.048)
          +.024*(bump(x,y,-.235,.012,.12,.10)+bump(x,y,.23,.012,.12,.10))
          -.027*(bump(x,y,-.41,.11,.075,.08)+bump(x,y,.43,.13,.075,.08));
      }
      // The bib follows the rounded chest and sits just above its fur.
      if(part.name==='body')detail=.012*bump(x,y,0,-.32,.20,.20);
      add(x,y,part.front+.003+part.curve*d+detail*edge,false);
    });
    surface.points.forEach(([x,y],i)=>add(x,y,part.front-.003-part.depth*dome(i),true));
    const materialAt=(x:number,y:number)=>{
      const px=clamp(Math.round((x-bounds.minX)/(bounds.maxX-bounds.minX)*reference.width),0,reference.width-1);
      const py=clamp(Math.round((bounds.maxY-y)/(bounds.maxY-bounds.minY)*reference.height),0,reference.height-1);
      const at=(py*reference.width+px)*4,R=reference.pixels[at],G=reference.pixels[at+1],B=reference.pixels[at+2];
      if(part.name==='body'&&R>G*1.5&&R>B*1.5)return 2;
      if(part.name==='head'&&Math.hypot((x+.044)/.052,(y-.07)/.042)<1)return 3;
      if(R>150&&G>105&&B>65)return 1;
      return 0;
    };
    for(let i=0;i<surface.indices.length;i+=3){
      const[a,b,c]=surface.indices.slice(i,i+3),P=surface.points;
      const m=materialAt((P[a][0]+P[b][0]+P[c][0])/3,(P[a][1]+P[b][1]+P[c][1])/3);
      frontIndices[m].push(base+a,base+b,base+c);shellIndices.push(base+count+c,base+count+b,base+count+a);
    }
    // glTF always multiplies COLOR_0 into base color. Give the side wall its
    // own seam vertices so fur colors cannot darken the front artwork.
    const sideVertices=new Map<number,number>();
    const sideVertex=(index:number)=>{const cached=sideVertices.get(index);if(cached!==undefined)return cached;const next=pos.length/3;pos.push(...pos.slice(index*3,index*3+3));uv.push(...uv.slice(index*2,index*2+2));joints.push(...joints.slice(index*4,index*4+4));weights.push(...weights.slice(index*4,index*4+4));
      const[x,y]=surface.points[(index-base)%count],c=shellColor(part,x,y);colors.push(c.r,c.g,c.b);
      // A smooth anatomical wall normal prevents every tiny raster hair step
      // from becoming a horizontal lighting stripe around the rim.
      sideNormals.set(next,new THREE.Vector3((x-part.center[0])/(ax*ax),(y-part.center[1])/(ay*ay),index<base+count?.12:-.12).normalize());sideVertices.set(index,next);return next;};
    for(const{a,b}of surface.boundary){const fa=sideVertex(base+a),fb=sideVertex(base+b),ba=sideVertex(base+count+a),bb=sideVertex(base+count+b);shellIndices.push(fa,ba,bb,fa,bb,fb);}
    specs.push({part:part.name,frontVertices:count,triangles:surface.indices.length/3*2+surface.boundary.length*2,frontCurvature:part.curve,backDepth:part.depth});
  }
  const texture=new THREE.CanvasTexture(atlas);texture.colorSpace=THREE.SRGBColorSpace;texture.name='reference-front-artwork';
  const grain=document.createElement('canvas');grain.width=grain.height=256;
  const grainContext=grain.getContext('2d')!, grainImage=grainContext.createImageData(256,256);
  for(let i=0;i<256*256;i++) { const n=Math.sin(i*12.9898)*43758.5453,v=124+(n-Math.floor(n))*8;grainImage.data.set([v,v,255,255],i*4); }
  grainContext.putImageData(grainImage,0,0);
  const normalTexture=new THREE.CanvasTexture(grain);normalTexture.wrapS=normalTexture.wrapT=THREE.RepeatWrapping;normalTexture.repeat.set(6,6);normalTexture.name='soft-fur-grain';
  const front=new THREE.MeshStandardMaterial({map:texture,roughness:.88,metalness:0,normalMap:normalTexture,normalScale:new THREE.Vector2(.12,.12)});front.name='reference-artwork-front';
  const skinMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:.64,metalness:0});skinMaterial.name='reference-artwork-skin';
  const clothMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:.56,metalness:0});clothMaterial.name='reference-artwork-bib';
  const noseMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:.32,metalness:0});noseMaterial.name='reference-artwork-nose';
  const shell=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,metalness:0,normalMap:normalTexture,normalScale:new THREE.Vector2(.08,.08)});shell.name='matched-fur-and-skin-shell';
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(joints,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.setIndex([...frontIndices.flat(),...shellIndices]);let offset=0;frontIndices.forEach((indices,i)=>{geometry.addGroup(offset,indices.length,i);offset+=indices.length;});geometry.addGroup(offset,shellIndices.length,4);geometry.computeVertexNormals();const normal=geometry.attributes.normal;
  for(let i=0;i<normal.count;i++){const n=sideNormals.get(i)??new THREE.Vector3().fromBufferAttribute(normal,i);if(n.lengthSq()<1e-12)n.set(0,0,1);n.normalize();normal.setXYZ(i,n.x,n.y,n.z);}geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new THREE.SkinnedMesh(geometry,[front,skinMaterial,clothMaterial,noseMaterial,shell]);mesh.name='Monchhichi-textured-body';mesh.userData={topology:'closed',parts:specs,sourceFrontPreserved:true};mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);root.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(bones));mesh.normalizeSkinWeights();
  const heart=new THREE.Group();heart.name='HeartProp';heart.position.set(0,.05,.34);heart.scale.setScalar(.00001);spine.add(heart);
  const shape=new THREE.Shape();shape.moveTo(0,-.5);shape.bezierCurveTo(-.2,-.3,-.6,0,-.6,.3);shape.bezierCurveTo(-.6,.65,-.18,.7,0,.35);shape.bezierCurveTo(.18,.7,.6,.65,.6,.3);shape.bezierCurveTo(.6,0,.2,-.3,0,-.5);
  const prop=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSegments:3,bevelSize:.04,bevelThickness:.04,curveSegments:12}),new THREE.MeshStandardMaterial({color:'#ec7ba6',roughness:.5}));prop.name='little-heart';prop.userData.topology='closed';heart.add(prop);
  const clips=monchhichiPoses.map(pose=>createClip(pose,bones,pelvis.position));for(const clip of clips)groundClip(root,mesh,clip);
  root.animations=clips;root.userData={modelVersion:4,source:'Meshy_AI_Monchhichi_Monkey_1003091923_texture.glb',method:'contour distance inflated anatomical volumes; raised nose, cheeks and bib; rounded palms and limbs; reference projected UV; soft material separation',rig:'16-bone skin; rigid head',forward:'+Z',ground:0,walkStride:.24,walkDuration:1.6};
  return{root,clips};
}
function createClip(pose: MonchhichiPose, bones: THREE.Bone[], rest: THREE.Vector3) {
  const duration = { Idle: 4, Walk: 1.6, Wave: 2.8, Celebrate: 2, Shy: 3.2, Float: 4.8, Hug: 4.2, Present: 3.6, Invite: 3.2, Blow: 3.6, Thanks: 4.2 }[pose];
  const frames = Math.ceil(duration * 30), times: number[] = [], positions: number[] = [];
  const rotations = new Map(bones.map(b => [b.name, [] as number[]]));
  const quaternion = new THREE.Quaternion();
  const holding = new Map<string, THREE.Quaternion>();
  for (const side of ['L', 'R']) {
    const arm = bones.find(b => b.name === `Arm${side}`)!, elbow = bones.find(b => b.name === `Elbow${side}`)!, hand = bones.find(b => b.name === `Hand${side}`)!;
    const shoulder = arm.getWorldPosition(new THREE.Vector3()), target = new THREE.Vector3((side === 'L' ? -.12 : .12) * 2.8 / 1.898819, .711554 * 2.8 / 1.898819, .24 * 2.8 / 1.898819);
    const direction = target.sub(shoulder), a = elbow.position.length(), b = hand.position.length(), distance = clamp(direction.length(), .01, a + b - .005); direction.normalize();
    const along = (a * a - b * b + distance * distance) / (2 * distance);
    const bend = new THREE.Vector3(side === 'L' ? -.15 : .15, -1, 0); bend.addScaledVector(direction, -bend.dot(direction)).normalize();
    const upper = direction.clone().multiplyScalar(along).addScaledVector(bend, Math.sqrt(Math.max(0, a * a - along * along)));
    const q = new THREE.Quaternion().setFromUnitVectors(elbow.position.clone().normalize(), upper.clone().normalize());
    const lower = direction.clone().multiplyScalar(distance).sub(upper).applyQuaternion(q.clone().invert());
    const elbowRotation = new THREE.Quaternion().setFromUnitVectors(hand.position.clone().normalize(), lower.normalize());
    holding.set(`Arm${side}`, q); holding.set(`Elbow${side}`, elbowRotation);
    // Keep the illustrated palms facing forward while the elbows wrap around
    // the heart. Inheriting their IK rotation exposed only rectangular side walls.
    holding.set(`Hand${side}`, q.clone().multiply(elbowRotation).invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, side === 'L' ? .12 : -.12))));
  }
  // Place the wrists below and outside the illustrated cheeks. Palms keep their
  // original forward orientation; no finger or facial deformation is introduced.
  const blowing = new Map<string, THREE.Quaternion>();
  for (const side of ['L', 'R']) {
    const arm = bones.find(b => b.name === `Arm${side}`)!, elbow = bones.find(b => b.name === `Elbow${side}`)!, hand = bones.find(b => b.name === `Hand${side}`)!;
    const target = worldPoint(side === 'L' ? -.30 : .30, side === 'L' ? -.14 : -.24, .16);
    const direction = target.sub(arm.getWorldPosition(new THREE.Vector3())), a = elbow.position.length(), b = hand.position.length(), distance = clamp(direction.length(), .01, a + b - .005); direction.normalize();
    const along = (a * a - b * b + distance * distance) / (2 * distance);
    const bend = new THREE.Vector3(side === 'L' ? -.25 : .25, -1, 0); bend.addScaledVector(direction, -bend.dot(direction)).normalize();
    const upper = direction.clone().multiplyScalar(along).addScaledVector(bend, Math.sqrt(Math.max(0, a * a - along * along)));
    const q = new THREE.Quaternion().setFromUnitVectors(elbow.position.clone().normalize(), upper.clone().normalize());
    const lower = direction.clone().multiplyScalar(distance).sub(upper).applyQuaternion(q.clone().invert());
    const elbowRotation = new THREE.Quaternion().setFromUnitVectors(hand.position.clone().normalize(), lower.normalize());
    blowing.set(`Arm${side}`, q); blowing.set(`Elbow${side}`, elbowRotation);
    blowing.set(`Hand${side}`, q.clone().multiply(elbowRotation).invert());
  }
  for (let i = 0; i <= frames; i++) {
    const time = i / frames * duration, phase = i === frames ? 0 : i / frames * Math.PI * 2, s = Math.sin(phase), c = Math.cos(phase);
    const r: Record<string, [number, number, number]> = Object.fromEntries(bones.map(b => [b.name, [0, 0, 0]]));
    r.ArmR[2] = -1.25; r.ArmL[2] = .08;
    let lift = 0, z = 0;
    r.Spine[0] = s * .010; r.Spine[2] = s * .006; r.Head[1] = s * .018; r.Head[2] = s * .012; r.Tail[1] = s * .12;
    if (pose === 'Walk') {
      r.LegL[0] = s * .23; r.LegR[0] = -s * .23;
      r.KneeL[0] = Math.max(0, -s) ** 2 * .20; r.KneeR[0] = Math.max(0, s) ** 2 * .20;
      r.FootL[0] = -.10 * s; r.FootR[0] = .10 * s;
      r.ArmL[0] = -s * .12; r.ArmR[0] = s * .12;
      r.Pelvis[1] = s * .035; r.Head[2] = -s * .025;
    } else if (pose === 'Wave') {
      r.ArmR[2] = s * .045; r.ElbowR[2] = s * .075; r.HandR[2] = Math.sin(phase * 2) * .13;
      r.Head[2] = s * .010; lift = (1 - c) * .01;
    } else if (pose === 'Celebrate') {
      r.ArmR[2] = .05 + s * .08; r.ArmL[2] = -.65 - s * .08;
      r.KneeL[0] = r.KneeR[0] = .12 * (1 - c); lift = .09 * (1 - c); r.Head[1] = s * .06;
    } else if (pose === 'Shy') {
      r.Head[0] = .10 + (1 - c) * .035; r.Head[2] = -.055;
      r.ArmR[2] = -1.40; r.ArmL[2] = .16; r.Spine[0] = .02;
    } else if (pose === 'Float') {
      r.ArmR[2] = -.50 + s * .035; r.ArmL[2] = .05 - s * .035;
      r.LegL[0] = .10 + s * .045; r.LegR[0] = -.08 - s * .045;
      r.Pelvis[2] = s * .025; lift = .07 * (1 - c); z = s * .02;
    } else if (pose === 'Hug') {
      r.ArmL = [-.25, -.22, .63]; r.ArmR = [-.27, .22, -2.0];
      r.ElbowL[1] = -.35; r.ElbowR[1] = .35; r.Head[0] = .035 + (1 - c) * .018;
      r.Spine[2] = s * .018; lift = (1 - c) * .005;
    } else if (pose === 'Present') {
      r.ArmR[2] = -.34 + s * .018; r.ElbowR[2] = -.16 + s * .02;
      r.HandR[2] = .10 - s * .02; r.ArmL[2] = .10;
      r.Head[1] = -.025 + s * .008; r.Head[2] = -.018;
      r.Spine[2] = s * .006; lift = (1 - c) * .003;
    } else if (pose === 'Invite') {
      r.ArmR[2] = -.24; r.ElbowR[2] = -.12 + s * .018;
      r.ElbowR[0] = .075 + s * .07; r.HandR[0] = -r.ElbowR[0];
      r.HandR[2] = .08; r.ArmL[2] = .10;
      r.Head[2] = -.018 + s * .008; lift = (1 - c) * .003;
    } else if (pose === 'Blow') {
      const breath = (1 - c) * .5;
      r.Spine[0] = .03 + breath * .015; r.Head[0] = .065 + breath * .025;
      r.Head[1] = s * .006; r.Head[2] = 0; r.Tail[1] = s * .045;
    } else if (pose === 'Thanks') {
      const bow = (1 - c) * .5;
      r.Spine[0] = bow * .04; r.Head[0] = .015 + bow * .07;
      r.Head[1] = s * .005; r.Head[2] = 0;
      r.ArmR[2] = -1.30 - bow * .025; r.ArmL[2] = .10 + bow * .015;
      r.Tail[1] = s * .04;
    } else lift = (1 - c) * .005;
    times.push(time); positions.push(rest.x, rest.y + lift, rest.z + z);
    for (const b of bones) { if (pose === 'Hug' && holding.has(b.name)) quaternion.copy(holding.get(b.name)!); else if (pose === 'Blow' && blowing.has(b.name)) quaternion.copy(blowing.get(b.name)!); else quaternion.setFromEuler(new THREE.Euler(...r[b.name])); rotations.get(b.name)!.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w); }
  }
  const tracks: THREE.KeyframeTrack[] = bones.map(b => new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`, times, rotations.get(b.name)!));
  tracks.push(new THREE.VectorKeyframeTrack('Pelvis.position', times, positions));
  const h = pose === 'Hug' ? .36 : .00001;
  tracks.push(new THREE.VectorKeyframeTrack('HeartProp.scale', [0, duration], [h, h, h, h, h, h]));
  return new THREE.AnimationClip(pose, duration, tracks);
}

function groundClip(root: THREE.Group, mesh: THREE.SkinnedMesh, clip: THREE.AnimationClip) {
  const mixer = new THREE.AnimationMixer(root), action = mixer.clipAction(clip).play();
  const track = clip.tracks.find(t => t.name === 'Pelvis.position')!, p = mesh.geometry.attributes.position;
  const v = new THREE.Vector3(), samples: number[] = [], restY = track.values[1];
  for (let i = 0; i < p.count; i++) if (p.getY(i) < .32) samples.push(i);
  for (let frame = 0; frame < track.times.length; frame++) {
    mixer.setTime(track.times[frame]); root.updateMatrixWorld(true); mesh.skeleton.update();
    let min = Infinity;
    for (const i of samples) { v.fromBufferAttribute(p, i); mesh.applyBoneTransform(i, v); min = Math.min(min, v.y); }
    const lift = ['Celebrate', 'Float'].includes(clip.name) ? track.values[frame * 3 + 1] - restY : 0;
    track.values[frame * 3 + 1] += .002 - min + lift;
  }
  action.stop(); mixer.uncacheRoot(root); mesh.skeleton.pose();
  track.values[track.values.length - 2] = track.values[1];
}

export function disposeMonchhichi(root: THREE.Object3D) {
  root.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
}
