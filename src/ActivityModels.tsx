import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { content } from './content';
import { fitCanvasText } from './canvas-text';
import type { CapsuleMotion, CapsuleState } from './date-machine';
import type { ScreenRect } from './story-layout';

const asset = (name: string) => `${import.meta.env.BASE_URL}assets/models/${name}.glb`;
useGLTF.preload(asset('date-capsule-machine')); useGLTF.preload(asset('memory-puzzle'));
const colors = ['#f29abd','#c6b5e8','#f3cf88','#aedccf','#f9b6bc'];
function ActivityLabel({ title, visible }: { title: string; visible: boolean }) {
  const [source] = useMemo(() => {
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=210;
    const context=canvas.getContext('2d')!;context.textAlign='center';context.textBaseline='middle';context.fillStyle='#ffdeee';
    const block=fitCanvasText(context,title,{width:710,fontSize:55,minFontSize:48,maxLines:2});context.font=`500 ${block.size}px "Noto Sans Thai",sans-serif`;
    block.lines.forEach((line,i)=>context.fillText(line,384,105+(i-(block.lines.length-1)/2)*block.size*1.4));
    return [new THREE.CanvasTexture(canvas)];
  },[title]);
  useEffect(()=>()=>source.dispose(),[source]);
  return <Billboard visible={visible} position={[0,-1.02,.15]}><mesh><planeGeometry args={[2.25,.61]} /><meshBasicMaterial map={source} transparent depthWrite={false} toneMapped={false}/></mesh></Billboard>;
}

/** The same prop travels from its orbit into the activity's screen-space frame. */
export function ActivityModel({ kind, focused, reduced, state, motion }: { kind:'promise'|'puzzle'; focused:boolean; reduced:boolean; state:CapsuleState; motion:MutableRefObject<CapsuleMotion> }) {
  const { scene: original } = useGLTF(asset(kind==='promise'?'date-capsule-machine':'memory-puzzle'));
  const photo=useTexture(content.puzzle.image);
  const object=useMemo(()=>{
    const clone=original.clone(true), materials=new Map<THREE.Material,THREE.Material>();
    clone.traverse(o=>{if(o instanceof THREE.Mesh){const copy=(m:THREE.Material)=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m)!;};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);}});
    return clone;
  },[original]);
  useEffect(()=>()=>{const materials=new Set<THREE.Material>();object.traverse(o=>{if(o instanceof THREE.Mesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});materials.forEach(m=>m.dispose());},[object]);
  const parts=useMemo(()=>{
    const crank=object.getObjectByName('Crank'), result=object.getObjectByName('Dispensed');
    const stock=Array.from({length:13},(_,i)=>object.getObjectByName('Stock-'+i)).filter((o):o is THREE.Object3D=>!!o).map(o=>({object:o,position:o.position.clone(),rotation:o.rotation.clone()}));
    const puzzle=Array.from({length:3},(_,i)=>object.getObjectByName('Piece-'+i)).filter((o):o is THREE.Object3D=>!!o).map(o=>({object:o,position:o.position.clone(),rotation:o.rotation.clone()}));
    return {crank,result,upper:result?.children.find(o=>o.name.startsWith('upper')),lower:result?.children.find(o=>o.name.startsWith('lower')),stock,puzzle};
  },[object]);
  useEffect(()=>{
    if(kind!=='puzzle')return;
    photo.colorSpace=THREE.SRGBColorSpace;
    parts.puzzle.slice(0,2).forEach(({object})=>object.traverse(child=>{if(!(child instanceof THREE.Mesh))return;for(const front of Array.isArray(child.material)?child.material:[child.material])if(front instanceof THREE.MeshStandardMaterial&&front.metalness<.4){front.map=photo;front.color.set('#fff7ef');front.needsUpdate=true;}}));
  },[kind,parts,photo]);
  useEffect(()=>{const upper=parts.upper as THREE.Mesh|undefined;if(upper)(upper.material as THREE.MeshStandardMaterial).color.set(colors[(state.chosen??0)%5]);},[state.chosen,parts]);
  const root=useRef<THREE.Group>(null), rect=useRef<ScreenRect|null>(null), {camera,size}=useThree();
  const scratch=useMemo(()=>({world:new THREE.Vector3(),normal:new THREE.Vector3(),direction:new THREE.Vector3(),plane:new THREE.Plane(),ray:new THREE.Ray(),local:new THREE.Vector3()}),[]);
  const elapsed=useRef(0);
  useEffect(()=>{const receive=(event:Event)=>{rect.current=(event as CustomEvent<ScreenRect>).detail;};window.addEventListener('hbd:capsule-layout',receive);const anchor=document.querySelector('.capsule-model-anchor');if(anchor){const r=anchor.getBoundingClientRect();rect.current={x:r.x,y:r.y,width:r.width,height:r.height};}return()=>window.removeEventListener('hbd:capsule-layout',receive);},[]);
  useFrame((_,delta)=>{
    if(!root.current)return;
    const dt=Math.min(delta,.08), base=kind==='promise'?.55:.65;
    let scale=base;scratch.local.set(0,0,0);
    if(focused&&rect.current&&root.current.parent){
      const r=rect.current;camera.getWorldDirection(scratch.normal);
      scratch.plane.setFromNormalAndCoplanarPoint(scratch.normal,new THREE.Vector3(0,0,-21.5));
      scratch.direction.set((r.x+r.width/2)/size.width*2-1,1-(r.y+r.height/2)/size.height*2,.5).unproject(camera).sub(camera.position).normalize();
      scratch.ray.set(camera.position,scratch.direction);
      if(scratch.ray.intersectPlane(scratch.plane,scratch.world)){
        scratch.local.copy(scratch.world);root.current.parent.worldToLocal(scratch.local);
        const distance=camera.position.distanceTo(scratch.world), worldHeight=2*distance*Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov/2));
        scale=worldHeight*(r.height/size.height)*.9/3.48;
      }
    }
    root.current.position.lerp(scratch.local,reduced?1:1-Math.exp(-3*dt));
    root.current.scale.setScalar(reduced?scale:THREE.MathUtils.damp(root.current.scale.x,scale,3,dt));
    root.current.rotation.y=THREE.MathUtils.damp(root.current.rotation.y,focused?0:.24,3,dt);
    if(!reduced&&!document.hidden)elapsed.current+=dt;
    if(kind==='puzzle')parts.puzzle.forEach(({object,position,rotation},i)=>{object.position.y=position.y+(reduced?0:Math.sin(elapsed.current*.5+i*2)*.045);object.rotation.z=rotation.z+(reduced?0:Math.sin(elapsed.current*.32+i)*.025);});
    if(kind!=='promise')return;
    const t=focused?motion.current.time:0, p=THREE.MathUtils.smoothstep(t,0,1.3);
    if(parts.crank)parts.crank.rotation.z=-Math.PI*2*p;
    parts.stock.forEach(({object,position,rotation},i)=>{const flutter=t>0&&t<1.9?Math.sin(Math.PI*Math.min(1,t/1.9))*.065:0;object.position.set(position.x+Math.sin(t*4+i)*flutter,position.y+Math.sin(t*5+i*1.7)*flutter,position.z);object.rotation.z=rotation.z+Math.sin(t*4+i)*flutter;});
    if(!parts.result)return;
    const result=parts.result;
    result.visible=focused&&['spinning','capsule','opening'].includes(state.phase)&&t>=1.3;
    const travel=THREE.MathUtils.smoothstep(t,1.3,2.85),angle=travel*Math.PI*2;
    result.position.set(Math.sin(angle)*.31*(1-travel),THREE.MathUtils.lerp(.46,-1.07,travel),.5+Math.cos(angle)*.12);
    if(t>=2.85){const landing=THREE.MathUtils.clamp((t-2.85)/.55,0,1);result.position.set(0,-1.07+Math.sin(landing*Math.PI*2)*.065*(1-landing),.62);}
    const opening=focused?motion.current.opening:0, spread=THREE.MathUtils.smoothstep(opening,0,.65);
    result.position.y+=spread*.75;result.position.z+=spread*.5;
    result.scale.setScalar((1+spread*.35)*(1-THREE.MathUtils.smoothstep(opening,.7,1)));
    result.rotation.z=Math.sin(travel*Math.PI)*.4;
    if(parts.upper){parts.upper.position.set(spread*.16,spread*.34,0);parts.upper.rotation.z=-spread*.55;}
    if(parts.lower)parts.lower.position.y=-spread*.09;
  });
  return <><group ref={root} name={kind==='promise'?'capsule-focus-model':'puzzle-orbit-model'} scale={kind==='promise'?.55:.65}><primitive object={object} dispose={null}/>{focused&&state.phase==='opening'&&<pointLight position={[0,-.2,.7]} color="#ffc7e2" intensity={1.5} distance={2}/>}</group><ActivityLabel title={content.activityTitles[kind]} visible={!focused}/></>;
}
