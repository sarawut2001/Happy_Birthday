import * as THREE from 'three';

// Offline authoring. Runtime uses the exported GLB, not a flat image plane.
type Point = [number, number];
type Part = { name: string; parent: string; polygon: Point[]; front: number; curve: number; back: number; color?: string; body?: boolean };
const unit = .009;
const center: Point = [339, 707];
const position = (x: number, y: number, z = 0) => new THREE.Vector3((x - center[0]) * unit, (center[1] - y) * unit, z);
const inside = (x: number, y: number, polygon: Point[]) => {
  let yes = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) yes = !yes;
  }
  return yes;
};
const heartOutline: Point[] = [[221,838],[229,811],[257,791],[292,781],[321,795],[348,816],[376,791],[411,781],[445,798],[470,827],[482,858],[464,899],[420,937],[349,974],[277,937],[241,903],[226,873]];
const parts: Part[] = [
  { name:'CoupleTailLeft',parent:'CoupleSeatLeft',polygon:[[35,890],[85,891],[141,874],[157,915],[112,942],[68,949],[34,935]],front:-.10,curve:.07,back:.09 },
  { name:'CoupleTailRight',parent:'CoupleSeatRight',polygon:[[539,876],[593,898],[642,885],[650,925],[601,951],[541,942]],front:-.10,curve:.07,back:.09 },
  { name:'CoupleBodyLeft',parent:'CoupleSeatLeft',polygon:[[112,783],[157,787],[273,781],[321,824],[330,904],[293,959],[137,961],[104,909],[93,852]],front:0,curve:.22,back:.21,body:true },
  { name:'CoupleBodyRight',parent:'CoupleSeatRight',polygon:[[374,782],[426,781],[553,777],[583,844],[575,903],[555,963],[391,964],[349,912],[348,836]],front:0,curve:.22,back:.21,body:true },
  { name:'CoupleArmLeft',parent:'CoupleWaveLeft',polygon:[[42,769],[72,754],[103,777],[145,808],[152,842],[116,860],[77,839],[42,814]],front:.08,curve:.11,back:.10 },
  { name:'CoupleArmRight',parent:'CoupleSeatRight',polygon:[[490,788],[562,786],[580,818],[576,869],[540,889],[470,884],[464,851]],front:.12,curve:.14,back:.11 },
  { name:'CoupleFootLeftOuter',parent:'CoupleSeatLeft',polygon:[[151,863],[195,866],[208,906],[197,951],[158,953],[143,919]],front:.24,curve:.065,back:.08,color:'#f6d9ac' },
  { name:'CoupleFootLeftInner',parent:'CoupleSeatLeft',polygon:[[253,895],[294,895],[301,926],[280,958],[248,955]],front:.24,curve:.05,back:.06,color:'#f6d9ac' },
  { name:'CoupleFootRightInner',parent:'CoupleSeatRight',polygon:[[392,896],[429,898],[436,945],[413,961],[386,953]],front:.24,curve:.05,back:.06,color:'#f6d9ac' },
  { name:'CoupleFootRightOuter',parent:'CoupleSeatRight',polygon:[[498,880],[533,881],[543,916],[532,958],[494,959],[483,929]],front:.24,curve:.065,back:.08,color:'#f6d9ac' },
  { name:'CoupleHeadLeft',parent:'CoupleHeadPivotLeft',polygon:[[51,522],[303,516],[352,594],[357,743],[334,777],[292,799],[153,801],[105,792],[65,766]],front:.13,curve:.43,back:.36 },
  { name:'CoupleHeadRight',parent:'CoupleHeadPivotRight',polygon:[[340,565],[387,533],[571,532],[630,583],[635,747],[610,780],[571,806],[405,817],[364,790],[340,748]],front:.13,curve:.43,back:.36 },
  { name:'CoupleTuft',parent:'CoupleHeadPivotRight',polygon:[[449,535],[442,502],[464,469],[501,437],[529,465],[544,507],[543,541]],front:.13,curve:.16,back:.15 },
  { name:'CoupleBow',parent:'CoupleBowPivot',polygon:[[432,507],[472,508],[493,529],[521,514],[558,506],[562,556],[548,599],[510,583],[490,572],[460,590],[432,587]],front:.34,curve:.08,back:.07,color:'#ec91b5' },
  { name:'CoupleHeart',parent:'CoupleHeartRig',polygon:heartOutline,front:.49,curve:.28,back:.16,color:'#dc3159' },
  { name:'CoupleGripLeft',parent:'CoupleHeartRig',polygon:[[282,772],[306,768],[326,789],[317,809],[288,804]],front:.76,curve:.04,back:.025,color:'#f6d9ac' },
  { name:'CoupleGripRight',parent:'CoupleHeartRig',polygon:[[365,778],[386,771],[406,787],[401,810],[368,813]],front:.76,curve:.04,back:.025,color:'#f6d9ac' },
  { name:'CoupleGripSide',parent:'CoupleHeartRig',polygon:[[449,835],[480,836],[484,872],[470,891],[444,878]],front:.75,curve:.035,back:.025,color:'#f6d9ac' },
];

function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const a=points[0],b=points.at(-1)!,dx=b[0]-a[0],dy=b[1]-a[1];let largest=0,at=0;
  for(let i=1;i<points.length-1;i++) {const p=points[i],t=THREE.MathUtils.clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1),0,1),d=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);if(d>largest){largest=d;at=i;}}
  return largest>tolerance?[...simplify(points.slice(0,at+1),tolerance).slice(0,-1),...simplify(points.slice(at),tolerance)]:[a,b];
}

function silhouette(part: Part, pixels: ImageData) {
  const w=Math.ceil(pixels.width/2),h=Math.ceil(pixels.height/2),mask=new Uint8Array(w*h),queue=new Int32Array(w*h),seen=new Uint8Array(w*h);
  for(let row=0;row<h;row++)for(let col=0;col<w;col++){const x=col*2+1,y=row*2+1;if(y<pixels.height&&x<pixels.width&&inside(x,y,part.polygon)&&pixels.data[(y*pixels.width+x)*4+3]>48)mask[row*w+col]=1;}
  let largest:number[]=[];
  for(let i=0;i<mask.length;i++)if(mask[i]&&!seen[i]){let start=0,end=1;queue[0]=i;seen[i]=1;while(start<end){const j=queue[start++],x=j%w;for(const n of [x?j-1:-1,x<w-1?j+1:-1,j>=w?j-w:-1,j<mask.length-w?j+w:-1])if(n>=0&&mask[n]&&!seen[n]){seen[n]=1;queue[end++]=n;}}if(end>largest.length)largest=Array.from(queue.subarray(0,end));}
  mask.fill(0);largest.forEach(i=>{mask[i]=1;});
  const edges=new Map<number,number[]>(),key=(x:number,y:number)=>y*(w+1)+x;
  const edge=(a:number,b:number)=>{const list=edges.get(a)??[];list.push(b);edges.set(a,list);};
  for(const i of largest){const x=i%w,y=Math.floor(i/w);if(!y||!mask[i-w])edge(key(x,y),key(x+1,y));if(x===w-1||!mask[i+1])edge(key(x+1,y),key(x+1,y+1));if(y===h-1||!mask[i+w])edge(key(x+1,y+1),key(x,y+1));if(!x||!mask[i-1])edge(key(x,y+1),key(x,y));}
  let longest:Point[]=[];
  while(edges.size){const first=edges.keys().next().value!,loop:Point[]=[];let at=first,guard=0;do{loop.push([(at%(w+1))*2,Math.floor(at/(w+1))*2]);const list=edges.get(at);if(!list?.length)break;const next=list.pop()!;if(!list.length)edges.delete(at);at=next;}while(at!==first&&guard++<mask.length*2);if(loop.length>longest.length)longest=loop;}
  if(longest.length<3)throw new Error(`Empty couple part: ${part.name}`);
  const middle=Math.floor(longest.length/2),points=[...simplify(longest.slice(0,middle+1),1.05).slice(0,-1),...simplify([...longest.slice(middle),longest[0]],1.05).slice(0,-1)];
  // Pixel Y points down; world Y points up.
  if(!THREE.ShapeUtils.isClockWise(points.map(p=>new THREE.Vector2(...p))))points.reverse();
  return points;
}

function subdivide(contour: Point[]) {
  const points=contour.slice();let indices=THREE.ShapeUtils.triangulateShape(contour.map(([x,y])=>new THREE.Vector2(x,-y)),[]).flat();
  const key=(a:number,b:number)=>a<b?`${a}:${b}`:`${b}:${a}`;
  for(let pass=0;pass<9;pass++) {
    const split=new Map<string,number>();
    for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){const a=indices[i+k],b=indices[i+(k+1)%3];if(Math.hypot(points[a][0]-points[b][0],points[a][1]-points[b][1])>9&&!split.has(key(a,b))){split.set(key(a,b),points.length);points.push([(points[a][0]+points[b][0])/2,(points[a][1]+points[b][1])/2]);}}
    if(!split.size)break;const next:number[]=[];
    for(let i=0;i<indices.length;i+=3){const[a,b,c]=indices.slice(i,i+3),ab=split.get(key(a,b)),bc=split.get(key(b,c)),ca=split.get(key(c,a));if(ab!==undefined&&bc!==undefined&&ca!==undefined)next.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);else if(ab!==undefined&&bc!==undefined)next.push(a,ab,c,ab,bc,c,ab,b,bc);else if(bc!==undefined&&ca!==undefined)next.push(b,bc,a,bc,ca,a,bc,c,ca);else if(ca!==undefined&&ab!==undefined)next.push(c,ca,b,ca,ab,b,ca,a,ab);else if(ab!==undefined)next.push(a,ab,c,ab,b,c);else if(bc!==undefined)next.push(b,bc,a,bc,c,a);else if(ca!==undefined)next.push(c,ca,b,ca,a,b);else next.push(a,b,c);}indices=next;
  }
  const edges=new Map<string,{a:number;b:number;count:number}>();
  for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){const a=indices[i+k],b=indices[i+(k+1)%3],id=key(a,b),e=edges.get(id);if(e)e.count++;else edges.set(id,{a,b,count:1});}
  return {points,indices,boundary:[...edges.values()].filter(e=>e.count===1)};
}

function distance(x:number,y:number,contour:Point[]) {
  let nearest=Infinity;
  for(let i=0;i<contour.length;i++){const a=contour[i],b=contour[(i+1)%contour.length],dx=b[0]-a[0],dy=b[1]-a[1],t=THREE.MathUtils.clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);nearest=Math.min(nearest,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));}
  return nearest;
}
function bulge(d:number,r:number){return Math.sqrt(Math.max(0,1-(1-Math.min(1,d/r))**2));}
const bump=(x:number,y:number,cx:number,cy:number,rx:number,ry:number)=>Math.exp(-2*(((x-cx)/rx)**2+((y-cy)/ry)**2));

type Surface = { mesh: THREE.Mesh; z: (x:number,y:number)=>number; pivot: THREE.Vector3; contour: Point[] };
export async function createCouple(image: HTMLImageElement) {
  const original=document.createElement('canvas');original.width=image.width;original.height=image.height;
  const ctx=original.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height);
  const atlas=document.createElement('canvas');atlas.width=image.width;atlas.height=image.height;const ink=atlas.getContext('2d')!;ink.drawImage(image,0,0);
  const eyes=[
    {name:'CoupleEyeLeftOuter',parent:'CoupleHeadPivotLeft',head:'CoupleHeadLeft',rect:[158,709,35,45]},
    {name:'CoupleEyeLeftInner',parent:'CoupleHeadPivotLeft',head:'CoupleHeadLeft',rect:[231,704,37,45]},
    {name:'CoupleEyeRightInner',parent:'CoupleHeadPivotRight',head:'CoupleHeadRight',rect:[421,710,38,45]},
    {name:'CoupleEyeRightOuter',parent:'CoupleHeadPivotRight',head:'CoupleHeadRight',rect:[495,717,34,45]},
  ];
  const eyeTextures=new Map<string,THREE.CanvasTexture>();
  for(const eye of eyes){
    const[x,y,w,h]=eye.rect,glyph=document.createElement('canvas');glyph.width=w;glyph.height=h;const gc=glyph.getContext('2d')!,data=gc.createImageData(w,h),skin=ink.getImageData(x,y,w,h),mask=new Uint8Array(w*h);
    for(let row=0;row<h;row++)for(let col=0;col<w;col++){const at=((y+row)*image.width+x+col)*4,R=pixels.data[at],G=pixels.data[at+1],B=pixels.data[at+2];if(R<235||R>235&&G>225&&B>200)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=col+dx,Y=row+dy;if(X>=0&&X<w&&Y>=0&&Y<h)mask[Y*w+X]=1;}}
    for(let row=0;row<h;row++)for(let col=0;col<w;col++){const i=(row*w+col)*4,at=((y+row)*image.width+x+col)*4,amount=mask[row*w+col]*THREE.MathUtils.smoothstep(Math.min(col,w-1-col,row,h-1-row),0,2);for(let k=0;k<3;k++){const left=eye.name.includes('EyeLeft'),L=((left?708:710)*image.width+(left?213:474))*4+k,R=((left?760:770)*image.width+(left?270:530))*4+k;skin.data[i+k]=THREE.MathUtils.lerp(pixels.data[at+k],THREE.MathUtils.lerp(pixels.data[L],pixels.data[R],row/(h-1)),amount);data.data[i+k]=pixels.data[at+k];}data.data[i+3]=Math.round(amount*255);}
    ink.putImageData(skin,x,y);gc.putImageData(data,0,0);const texture=new THREE.CanvasTexture(glyph);texture.colorSpace=THREE.SRGBColorSpace;texture.name=eye.name+'Artwork';eyeTextures.set(eye.name,texture);
  }
  const texture=new THREE.CanvasTexture(atlas);texture.colorSpace=THREE.SRGBColorSpace;texture.name='CoupleReferenceFront';
  // Hidden chest areas are fur, so a slight turn never exposes a second red heart.
  const bodyCanvas=document.createElement('canvas');bodyCanvas.width=image.width;bodyCanvas.height=image.height;const bc=bodyCanvas.getContext('2d')!;bc.drawImage(atlas,0,0);bc.beginPath();heartOutline.forEach(([x,y],i)=>i?bc.lineTo(x,y):bc.moveTo(x,y));bc.closePath();bc.fillStyle='#5b442b';bc.fill();
  // A foreground hand must not remain painted onto the occluded chest.
  const grips=parts.filter(part=>part.name.startsWith('CoupleGrip'));
  const paintGrip=(context:CanvasRenderingContext2D,part:Part,fill:string|CanvasGradient)=>{
    context.beginPath();part.polygon.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));context.closePath();context.fillStyle=fill;context.fill();
  };
  grips.forEach(part=>paintGrip(bc,part,'#5b442b'));
  const headCanvas=document.createElement('canvas');headCanvas.width=image.width;headCanvas.height=image.height;const hc=headCanvas.getContext('2d')!;hc.drawImage(atlas,0,0);grips.forEach(part=>paintGrip(hc,part,'#f6d9ac'));
  const headTexture=new THREE.CanvasTexture(headCanvas);headTexture.colorSpace=THREE.SRGBColorSpace;headTexture.name='CoupleCleanCheeks';
  const heartCanvas=document.createElement('canvas');heartCanvas.width=image.width;heartCanvas.height=image.height;const heartContext=heartCanvas.getContext('2d')!;heartContext.drawImage(atlas,0,0);
  const heartColor=heartContext.createRadialGradient(355,858,3,355,858,165);heartColor.addColorStop(0,'#ed2149');heartColor.addColorStop(1,'#d7193e');grips.forEach(part=>paintGrip(heartContext,part,heartColor));
  const heartTexture=new THREE.CanvasTexture(heartCanvas);heartTexture.colorSpace=THREE.SRGBColorSpace;heartTexture.name='CoupleCleanHeldHeart';
  const bodyTexture=new THREE.CanvasTexture(bodyCanvas);bodyTexture.colorSpace=THREE.SRGBColorSpace;bodyTexture.name='CoupleCoveredChest';
  const root=new THREE.Group();root.name='MonchhichiCouple';
  const groups=new Map<string,THREE.Group>(),origins=new Map<string,THREE.Vector3>();
  const group=(name:string,parent:THREE.Object3D,x:number,y:number)=>{const g=new THREE.Group(),world=position(x,y);g.name=name;g.position.copy(world).sub(origins.get(parent.name)??new THREE.Vector3());parent.add(g);groups.set(name,g);origins.set(name,world);return g;};
  const left=group('CoupleSeatLeft',root,211,897),right=group('CoupleSeatRight',root,479,897);
  group('CoupleHeadPivotLeft',left,212,793);const rightHead=group('CoupleHeadPivotRight',right,480,793);
  group('CoupleWaveLeft',left,131,817);group('CoupleBowPivot',rightHead,496,561);group('CoupleHeartRig',root,350,867);
  const surfaces=new Map<string,Surface>();
  for(const part of parts){
    const contour=silhouette(part,pixels),cap=subdivide(contour),ds=cap.points.map(([x,y])=>distance(x,y,contour)),radius=Math.max(...ds),pivot=origins.get(part.parent)!;
    const z=(x:number,y:number)=>{const d=distance(x,y,contour);let detail=0;if(part.name==='CoupleHeadLeft')detail=.075*bump(x,y,214,748,20,16)+.026*(bump(x,y,163,761,30,22)+bump(x,y,271,761,30,22));if(part.name==='CoupleHeadRight')detail=.075*bump(x,y,474,755,20,16)+.026*(bump(x,y,423,767,30,22)+bump(x,y,530,767,30,22));return part.front+.003+part.curve*bulge(d,radius)+detail*THREE.MathUtils.smoothstep(d,0,5);};
    const vertices:number[]=[],uv:number[]=[],indices:number[]=[],N=cap.points.length;
    const add=(x:number,y:number,Z:number)=>{const v=position(x,y,Z).sub(pivot);vertices.push(v.x,v.y,v.z);uv.push(x/image.width,1-y/image.height);};
    cap.points.forEach(([x,y])=>add(x,y,z(x,y)));cap.points.forEach(([x,y],i)=>add(x,y,part.front-.006-part.back*bulge(ds[i],radius)));
    indices.push(...cap.indices);for(let i=0;i<cap.indices.length;i+=3){const[a,b,c]=cap.indices.slice(i,i+3);indices.push(N+c,N+b,N+a);}const frontCount=cap.indices.length;
    for(const {a,b}of cap.boundary)indices.push(a,N+a,N+b,a,N+b,b);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.addGroup(0,frontCount,0);geometry.addGroup(frontCount,indices.length-frontCount,1);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const material=new THREE.MeshStandardMaterial({map:part.name.startsWith('CoupleHead')?headTexture:part.name==='CoupleHeart'?heartTexture:part.body||part.name==='CoupleArmRight'?bodyTexture:texture,roughness:part.name==='CoupleHeart'?.4:.82,metalness:0});material.name=part.name+'Front';
    const shell=new THREE.MeshStandardMaterial({color:part.color??'#5b442b',roughness:.84});shell.name=part.name+'Shell';
    const mesh=new THREE.Mesh(geometry,[material,shell]);mesh.name=part.name;mesh.userData={closed:true,referenceFront:true,curvature:part.curve};mesh.castShadow=true;mesh.receiveShadow=true;groups.get(part.parent)!.add(mesh);surfaces.set(part.name,{mesh,z,pivot,contour});
  }
  for(const eye of eyes){
    const surface=surfaces.get(eye.head)!,[x,y,w,h]=eye.rect,pivot=origins.get(eye.parent)!,vertices:number[]=[],uv:number[]=[],closed:number[]=[],indices:number[]=[];
    const cols=8,rows=12,cy=y+h*.53;
    for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){const u=col/cols,v=row/rows,X=x+u*w,Y=y+v*h,p=position(X,Y,surface.z(X,Y)+.009).sub(pivot),targetY=cy+(Y-cy)*.04-Math.sin(u*Math.PI)*2.5,target=position(X,targetY,surface.z(X,targetY)+.014).sub(pivot);vertices.push(p.x,p.y,p.z);closed.push(target.x,target.y,target.z);uv.push(u,1-v);}
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const a=row*(cols+1)+col,b=a+1,c=a+cols+1,d=c+1;indices.push(a,c,b,b,c,d);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(closed,3)];geometry.computeVertexNormals();
    const material=new THREE.MeshStandardMaterial({map:eyeTextures.get(eye.name),transparent:true,depthWrite:false,roughness:.82,polygonOffset:true,polygonOffsetFactor:-1});material.name=eye.name+'Material';
    const mesh=new THREE.Mesh(geometry,material);mesh.name=eye.name;mesh.morphTargetDictionary={Blink:0};mesh.updateMorphTargets();mesh.userData={blinkSide:eye.name.includes('EyeLeft')?'left':'right'};mesh.frustumCulled=false;groups.get(eye.parent)!.add(mesh);
  }
  const clips:THREE.AnimationClip[]=[];
  const times=Array.from({length:97},(_,i)=>i/96*6.4),tracks:THREE.KeyframeTrack[]=[];
  for(const [name,phase,sign]of [['CoupleSeatLeft',0,1],['CoupleSeatRight',.7,-1],['CoupleHeadPivotLeft',.2,1],['CoupleHeadPivotRight',1.1,-1],['CoupleBowPivot',.8,-1],['CoupleTailLeft',.4,1],['CoupleTailRight',1.2,-1]] as const){
    const node=groups.get(name)??surfaces.get(name)?.mesh;if(!node)continue;
    const values:number[]=[],rotations:number[]=[];
    for(const t of times){const a=t/6.4*Math.PI*2;values.push(node.position.x,node.position.y+Math.sin(a+phase)*.012,node.position.z);const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,Math.sin(a+phase)*.009,Math.sin(a+phase)*.012*sign));rotations.push(q.x,q.y,q.z,q.w);}
    // Start and finish with identical transforms, including the phase offset.
    values.splice(values.length-3,3,...values.slice(0,3));rotations.splice(rotations.length-4,4,...rotations.slice(0,4));
    tracks.push(new THREE.VectorKeyframeTrack(name+'.position',times,values),new THREE.QuaternionKeyframeTrack(name+'.quaternion',times,rotations));
  }
  clips.push(new THREE.AnimationClip('CoupleIdle',6.4,tracks));
  for(const [side,start,duration]of [['Left',4.0,10.8],['Right',6.0,13.2]] as const){
    const t=[0,start,start+.11,start+.18,start+.34,duration],v=[0,0,1,1,0,0];
    clips.push(new THREE.AnimationClip('CoupleBlink'+side,duration,eyes.filter(e=>e.name.includes('Eye'+side)).map(e=>new THREE.NumberKeyframeTrack(e.name+'.morphTargetInfluences',t,v))));
  }
  const together:THREE.KeyframeTrack[]=[];
  for(const [name,sign]of [['CoupleHeadPivotLeft',-1],['CoupleHeadPivotRight',1],['CoupleWaveLeft',1]] as const){const t=[0,1.6,3.3,4.8,6.5],angles=name==='CoupleWaveLeft'?[0,.035,-.035,.02,0]:[0,.022*sign,.025*sign,.018*sign,0],v:number[]=[];for(const a of angles){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,a));v.push(q.x,q.y,q.z,q.w);}together.push(new THREE.QuaternionKeyframeTrack(name+'.quaternion',t,v));}
  const heart=groups.get('CoupleHeartRig')!,rest=heart.position,t=[0,1.3,2.8,4.6,6.5];together.push(new THREE.VectorKeyframeTrack('CoupleHeartRig.position',t,t.flatMap((_,i)=>[rest.x,rest.y+([0,.035,.05,.025,0][i]),rest.z])));
  // Keep portable absolute keys in the GLB; the website layers a cloned clip.
  clips.push(new THREE.AnimationClip('CoupleTogether',6.5,together));
  root.animations=clips;root.userData={source:'User supplied _ (2) Background Removed.png',method:'closed curved relief volumes with projected artwork; independent four-eye morph targets; shared heart and grip rig',referenceBounds:[36,442,642,971],width:5.454,height:4.761,front:'+Z',limitedView:true};
  return {root,clips};
}
