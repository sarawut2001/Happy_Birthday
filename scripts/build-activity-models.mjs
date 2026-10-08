// Original, articulated activity props. No downloaded third-party meshes.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdir, writeFile } from 'node:fs/promises';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(buffer).toString('base64'); this.onloadend?.(); }); }
};
const material = (color, metalness = .12, roughness = .32) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
const pink = material('#e891b4', .3, .23), cream = material('#fff1de', .25), gold = material('#d9a571', .65, .27), berry = material('#963960', .3), glass = new THREE.MeshStandardMaterial({ color: '#ffeaf5', transparent: true, opacity: .18, roughness: .18, metalness: .12, depthWrite: false });
function mesh(parent, name, geometry, mat, position = [0,0,0], rotation = [0,0,0]) {
  const object = new THREE.Mesh(geometry, mat); object.name = name; object.position.set(...position); object.rotation.set(...rotation); parent.add(object); return object;
}
const rounded = (w,h,d,r=.12) => new RoundedBoxGeometry(w,h,d,3,r);
function heartGeometry(size, depth) {
  const s = new THREE.Shape(); s.moveTo(0,-.5); s.bezierCurveTo(-.12,-.35,-.6,.02,-.5,.3); s.bezierCurveTo(-.42,.58,-.12,.6,0,.34); s.bezierCurveTo(.12,.6,.42,.58,.5,.3); s.bezierCurveTo(.6,.02,.12,-.35,0,-.5);
  const g = new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3,steps:1,curveSegments:24}); g.scale(size,size,1); g.translate(0,0,-depth/2); return g;
}
function capsule(name, color, radius=.19) {
  const root = new THREE.Group(); root.name = name;
  mesh(root,'upper',new THREE.SphereGeometry(radius,24,12,0,Math.PI*2,0,Math.PI/2),material(color,.2,.22));
  mesh(root,'lower',new THREE.SphereGeometry(radius,24,12,0,Math.PI*2,Math.PI/2,Math.PI/2),cream);
  mesh(root,'seam',new THREE.TorusGeometry(radius,.014,8,40),gold,[0,0,0],[Math.PI/2,0,0]);
  return root;
}
function machine() {
  const root = new THREE.Group(); root.name = 'date-capsule-machine';
  mesh(root,'plinth',new THREE.CylinderGeometry(.7,.77,.16,48),berry,[0,-1.5,0]);
  mesh(root,'foot-gold',new THREE.CylinderGeometry(.71,.71,.055,48),gold,[0,-1.39,0]);
  mesh(root,'lower-body',rounded(1.24,.87,.82,.16),pink,[0,-.96,0]);
  mesh(root,'capsule-tray',rounded(.69,.1,.66,.045),cream,[0,-1.22,.55]);
  mesh(root,'outlet',rounded(.48,.36,.07,.12),berry,[0,-1.1,.43]);
  mesh(root,'neck',new THREE.CylinderGeometry(.5,.59,.37,48),pink,[0,-.23,0]);
  mesh(root,'neck-collar',new THREE.CylinderGeometry(.63,.63,.08,48),gold,[0,0,0]);
  mesh(root,'globe',new THREE.SphereGeometry(.91,40,28),glass,[0,.78,0]);
  mesh(root,'crown',new THREE.CylinderGeometry(.19,.33,.16,40),cream,[0,1.62,0]);
  mesh(root,'crown-heart',heartGeometry(.22,.08),pink,[0,1.8,0]);
  mesh(root,'crank-plate',rounded(.63,.37,.075,.1),cream,[0,-.25,.49]);
  const crank = new THREE.Group(); crank.name='Crank'; crank.position.set(0,-.25,.57); root.add(crank);
  mesh(crank,'hub',new THREE.CylinderGeometry(.1,.1,.11,24),gold,[0,0,0],[Math.PI/2,0,0]);
  mesh(crank,'arm',rounded(.4,.065,.09,.03),gold,[.14,0,.04]);
  mesh(crank,'handle',heartGeometry(.21,.1),berry,[.34,0,.1]);
  const colors=['#f29abd','#c6b5e8','#f3cf88','#aedccf','#f9b6bc'];
  for(let i=0;i<13;i++) {
    const c=capsule('Stock-'+i,colors[i%5],.19); const a=i*2.4;
    c.position.set(Math.cos(a)*(i<7?.47:.3),.49+Math.floor(i/5)*.26,Math.sin(a)*(i<7?.47:.3)); c.rotation.set(i*.3,i*.6,.2); root.add(c);
  }
  // The visible curved chute makes the selected capsule's travel readable.
  const points=Array.from({length:70},(_,i)=>{const t=i/69,a=t*Math.PI*2;return new THREE.Vector3(Math.sin(a)*.31,-.5-t*.65,.45+Math.cos(a)*.12);});
  mesh(root,'chute',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),70,.025,8,false),gold);
  const result=capsule('Dispensed',colors[0],.22); result.position.set(0,-1.07,.57); root.add(result);
  for(let i=0;i<5;i++)mesh(root,'wish-light-'+i,new THREE.SphereGeometry(.025,12,8),gold,[(i-2)*.13,-.73,.434]);
  return root;
}
function puzzleShape() {
  const s=new THREE.Shape();s.moveTo(-.5,-.5);s.lineTo(.5,-.5);s.lineTo(.5,-.18);s.bezierCurveTo(.36,-.21,.27,-.1,.27,0);s.bezierCurveTo(.27,.1,.36,.21,.5,.18);s.lineTo(.5,.5);s.lineTo(.18,.5);s.bezierCurveTo(.22,.64,.1,.75,0,.75);s.bezierCurveTo(-.1,.75,-.22,.64,-.18,.5);s.lineTo(-.5,.5);s.lineTo(-.5,.18);s.bezierCurveTo(-.64,.22,-.75,.1,-.75,0);s.bezierCurveTo(-.75,-.1,-.64,-.22,-.5,-.18);s.closePath();return s;
}
function puzzle() {
  const root=new THREE.Group();root.name='memory-puzzle-model';
  const colors=['#f0a7c3','#fff1de','#c6b5e8'];
  for(let i=0;i<3;i++) {
    const g=new THREE.ExtrudeGeometry(puzzleShape(),{depth:.13,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:3,steps:1,curveSegments:16});
    // Front/back UVs are normalized for the real memory photo at runtime.
    const positions=g.getAttribute('position'),uv=g.getAttribute('uv');for(let k=0;k<uv.count;k++)uv.setXY(k,(positions.getX(k)+.78)/1.56,(positions.getY(k)+.54)/1.32);
    const object=mesh(root,'Piece-'+i,g,[material(colors[i],.08,.43),gold],i===0?[-.53,-.12,.12]:i===1?[.47,-.13,0]:[.19,.9,-.09],[0,i===0?-.15:.12,(i-1)*.13]);
    object.scale.setScalar(i===2?.68:.87);
  }
  return root;
}
const out=new URL('../public/assets/models/',import.meta.url);await mkdir(out,{recursive:true});
for(const [filename,object]of[['date-capsule-machine.glb',machine()],['memory-puzzle.glb',puzzle()]]) {
  const buffer=await new GLTFExporter().parseAsync(object,{binary:true});await writeFile(new URL(filename,out),Buffer.from(buffer));console.log(filename,buffer.byteLength+' bytes');
}
