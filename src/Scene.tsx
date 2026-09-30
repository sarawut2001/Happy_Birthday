import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float, Image, RoundedBox, Sparkles, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { content } from './content';

type Props = { stage: number; memory: number; giftOpen: boolean; reduced: boolean; finished: boolean; onGift: () => void; onMemory: (index: number) => void; onReady: () => void };
const colors = { paper: '#fff8fb', rose: '#d97c9c', pink: '#c33e73', wine: '#542238' };

function Heart({ position = [0,0,0], scale = 1, color = colors.rose }: { position?: [number,number,number]; scale?: number; color?: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0,-0.5); shape.bezierCurveTo(-0.2,-0.3,-0.6,0,-0.6,0.3);
    shape.bezierCurveTo(-0.6,0.65,-0.18,0.7,0,0.35); shape.bezierCurveTo(0.18,0.7,0.6,0.65,0.6,0.3);
    shape.bezierCurveTo(0.6,0,0.2,-0.3,0,-0.5);
    return new THREE.ExtrudeGeometry(shape,{depth:0.15,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:0.075,bevelThickness:0.07,curveSegments:16});
  }, []);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh position={position} scale={scale} geometry={geometry} castShadow><meshStandardMaterial color={color} roughness={0.38} metalness={0.12}/></mesh>;
}

// Preserve the chosen model's silhouette and ribbon. Separate its original lid
// triangles so it opens without replacing the model with a different gift.
function Gift({ open, reduced, onClick }: { open: boolean; reduced: boolean; onClick: () => void }) {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}assets/models/present.glb`);
  const lid = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const parts = useMemo(() => {
    const body = new THREE.Group(), top = new THREE.Group();
    gltf.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const geo = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      const positions = geo.getAttribute('position'), normals = geo.getAttribute('normal');
      const arrays = [{p:[] as number[],n:[] as number[]},{p:[] as number[],n:[] as number[]}];
      for(let i=0; i<positions.count; i+=3) {
        const isLid = Math.min(positions.getY(i),positions.getY(i+1),positions.getY(i+2)) >= 0.505;
        const target = arrays[isLid ? 1 : 0];
        for(let k=0;k<3;k++){ target.p.push(positions.getX(i+k),positions.getY(i+k),positions.getZ(i+k)); target.n.push(normals.getX(i+k),normals.getY(i+k),normals.getZ(i+k)); }
      }
      arrays.forEach((a,index)=>{
        if(!a.p.length)return;
        const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(a.p,3)); geometry.setAttribute('normal',new THREE.Float32BufferAttribute(a.n,3));
        const material = new THREE.MeshStandardMaterial({color:(object.material as THREE.Material).name === 'Second' ? colors.pink : '#f2b5ca',roughness:0.42,metalness:0.04,side:THREE.DoubleSide});
        const mesh=new THREE.Mesh(geometry,material); mesh.castShadow=true; mesh.receiveShadow=true; (index?top:body).add(mesh);
      }); geo.dispose();
    });
    return {body,top};
  },[gltf.scene]);
  useEffect(() => {
    if(!lid.current) return;
    const timeline=gsap.timeline();
    timeline.to(lid.current.position,{y:open?0.27:0,z:open?-0.12:0,duration:reduced?0:1.1,ease:'power3.inOut'});
    timeline.to(lid.current.rotation,{x:open?-0.5:0,z:open?-0.14:0,duration:reduced?0:1.1,ease:'power3.inOut'},0);
    return ()=>{timeline.kill();};
  },[open,reduced]);
  useEffect(()=>()=>{[parts.body,parts.top].forEach(g=>g.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}}));},[parts]);
  return <group ref={root} rotation={[0,-0.35,0]} position={[0,-0.28,0]} scale={3.8} onClick={onClick}>
    <primitive object={parts.body}/><group ref={lid}><primitive object={parts.top}/></group>
    {open && <group position={[0,0.55,0]} scale={0.23}><Heart color="#fff2f7"/></group>}
  </group>;
}

function Envelope({ reduced }: {reduced:boolean}) {
  const letter=useRef<THREE.Group>(null);
  const fold=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-1.325,0.65);s.lineTo(0,-0.5);s.lineTo(1.325,0.65);s.closePath();return new THREE.ShapeGeometry(s);},[]);
  useEffect(()=>()=>fold.dispose(),[fold]);
  useEffect(()=>{if(!letter.current)return; const t=gsap.fromTo(letter.current.position,{y:0},{y:0.65,duration:reduced?0:1.4,delay:reduced?0:0.25,ease:'power3.out'});return()=>{t.kill();};},[reduced]);
  return <group rotation={[-0.12,-0.15,0.08]} position={[0,0.5,0]}>
    <RoundedBox args={[2.6,1.75,0.1]} radius={0.07}><meshStandardMaterial color="#df91ae" roughness={0.7}/></RoundedBox>
    <group ref={letter} position={[0,0,0.025]}><RoundedBox args={[2.2,1.65,0.03]} radius={0.025}><meshStandardMaterial color={colors.paper}/></RoundedBox>
      {[0.42,0.2,-0.02,-0.24].map((y,i)=><mesh key={y} position={[-0.1,y,0.025]}><boxGeometry args={[i===3?1:1.5,0.015,0.008]}/><meshStandardMaterial color="#d3a6b7"/></mesh>)}
      <Heart position={[0.65,0.56,0.03]} scale={0.18} color={colors.pink}/>
    </group>
    <mesh position={[0,-0.23,0.11]}><boxGeometry args={[2.65,1.3,0.055]}/><meshStandardMaterial color="#efb4c9"/></mesh>
    <mesh position={[0,0,0.155]} geometry={fold}><meshStandardMaterial color="#f5c4d5" side={THREE.DoubleSide}/></mesh>
    <Heart position={[0,-0.35,0.2]} scale={0.3} color={colors.pink}/>
  </group>;
}

function Photo({ index, target, rotation, reduced, onClick, scale=1 }: {index:number;target:[number,number,number];rotation:[number,number,number];reduced:boolean;onClick:()=>void;scale?:number}) {
  const ref=useRef<THREE.Group>(null);
  const initialPosition=useRef(target), initialRotation=useRef(rotation);
  useEffect(()=>{
    if(!ref.current)return; const t=gsap.timeline();
    t.to(ref.current.position,{x:target[0],y:target[1],z:target[2],duration:reduced?0:1.1,ease:'power3.inOut'});
    t.to(ref.current.rotation,{x:rotation[0],y:rotation[1],z:rotation[2],duration:reduced?0:1.1,ease:'power3.inOut'},0);
    t.to(ref.current.scale,{x:scale,y:scale,z:scale,duration:reduced?0:1.1},0);
    return()=>{t.kill();};
  },[target[0],target[1],target[2],rotation[0],rotation[1],rotation[2],reduced,scale]);
  return <group ref={ref} position={initialPosition.current} rotation={initialRotation.current} onClick={onClick}>
    <RoundedBox args={[1.85,2.15,0.055]} radius={0.018} castShadow><meshStandardMaterial color={colors.paper} roughness={0.75}/></RoundedBox>
    <Image url={content.memories[index].image} position={[0,0.17,0.04]} scale={[1.62,1.62]} transparent={false} toneMapped={false}/>
    <mesh position={[-0.25,-0.85,0.035]}><planeGeometry args={[0.95,0.022]}/><meshBasicMaterial color="#c797a9"/></mesh>
    <Heart position={[0.62,-0.82,0.038]} scale={0.1}/>
  </group>;
}

function Memories({ wall, memory, reduced, onMemory }: {wall:boolean;memory:number;reduced:boolean;onMemory:(i:number)=>void}) {
  const columns=Math.ceil(content.memories.length/2);
  return <group position={[0,0.55,0]}>
    {content.memories.map((_,i)=>{
      const distance=i-memory;
      const row=Math.floor(i/columns), column=i%columns-(columns-1)/2;
      const target:[number,number,number]=wall?[column*1.88,0.98-row*2.16,-Math.abs(column)*0.6]:[distance*2.1,Math.sin(distance*0.55)*0.5,-Math.abs(distance)*1.15];
      const rotation:[number,number,number]=wall?[0,-column*0.17,(i%2?1:-1)*0.055]:[0,-distance*0.18,distance*0.05];
      return <Photo key={i} index={i} target={target} rotation={rotation} reduced={reduced} onClick={()=>onMemory(i)} scale={wall?0.83:distance===0?1.3:0.92}/>;
    })}
  </group>;
}

function Camera({stage,reduced,giftOpen}:{stage:number;reduced:boolean;giftOpen:boolean}) {
  const {camera,size}=useThree();
  useEffect(()=>{
    const mobile=size.width<640;
    const wallDistance=content.memories.length>6?13:10;
    const target=stage===4?[0,2.2,mobile?wallDistance+1.4:wallDistance]:stage===5?[0,1.8,mobile?10:9.5]:stage===3?[0,1.8,mobile?8.5:7.5]:stage===2?[2,2.6,mobile?8.3:7.8]:[3.2,3.7,giftOpen?9:mobile?8.4:7.8];
    const t=gsap.to(camera.position,{x:target[0],y:target[1],z:target[2],duration:reduced?0:1.25,ease:'power3.inOut',onUpdate:()=>camera.lookAt(0,stage<2?1.05:0.6,0)});
    return()=>{t.kill();};
  },[stage,size.width,camera,reduced,giftOpen]);
  return null;
}

function Confetti() {
  const mesh=useRef<THREE.InstancedMesh>(null), elapsed=useRef(0);
  const dummy=useMemo(()=>new THREE.Object3D(),[]);
  const particles=useMemo(()=>Array.from({length:48},(_,i)=>({x:Math.sin(i*2.4)*1.5,y:1.7+(i%7)*0.16,z:Math.cos(i*1.8)*0.9,r:i*0.78})),[]);
  useEffect(()=>{if(!mesh.current)return; particles.forEach((_,i)=>mesh.current!.setColorAt(i,new THREE.Color(['#c33e73','#edb5ca','#fff5de','#dca855'][i%4])));mesh.current.instanceColor!.needsUpdate=true;},[particles]);
  useFrame((_,delta)=>{
    if(!mesh.current)return;elapsed.current=Math.min(elapsed.current+delta,5);
    const t=elapsed.current;
    particles.forEach((p,i)=>{
      dummy.position.set(p.x*t*0.64,0.85+p.y*t-0.75*t*t,p.z*t);
      dummy.rotation.set(p.r+t*2,p.r+t,p.r+t*0.8);
      dummy.scale.set(0.055,0.09,1);dummy.updateMatrix();mesh.current!.setMatrixAt(i,dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate=true;
    mesh.current.visible=t<5;
  });
  return <instancedMesh ref={mesh} args={[undefined,undefined,48]} frustumCulled={false}><planeGeometry args={[1,1]}/><meshBasicMaterial side={THREE.DoubleSide}/></instancedMesh>;
}

function World(props:Props) {
  const {stage,memory,giftOpen,reduced,finished,onGift,onMemory,onReady}=props;
  const group=useRef<THREE.Group>(null);
  useEffect(()=>{onReady();},[onReady]);
  useFrame((state)=>{if(group.current&&!reduced)group.current.rotation.y=Math.sin(state.clock.elapsedTime*0.18)*0.035;});
  return <>
    <Camera stage={stage} reduced={reduced} giftOpen={giftOpen}/>
    <ambientLight intensity={1.6}/><hemisphereLight args={['#fff8f4','#ba6e93',1.4]}/>
    <directionalLight position={[-4,6,4]} intensity={3.1} color="#fff7eb"/>
    <pointLight position={[4,2,-2]} color="#f9a2c4" intensity={14}/>
    <group ref={group}>
      {stage<2 && <Gift open={giftOpen} reduced={reduced} onClick={onGift}/>}
      {stage===2 && <Envelope reduced={reduced}/>}
      {(stage===3||stage===4) && <Memories wall={stage===4} memory={memory} reduced={reduced} onMemory={onMemory}/>}
      {stage===5 && <group position={[0,0.55,0]}><RoundedBox args={[3.6,2.3,0.12]} radius={0.12}><meshStandardMaterial color="#b26a87"/></RoundedBox><RoundedBox args={[3.4,2.1,0.035]} position={[0,0,0.09]} radius={0.08}><meshStandardMaterial color="#f7d7e4"/></RoundedBox><Heart position={[0,0,0.18]} scale={finished?1.15:0.62} color={colors.pink}/></group>}
      {stage===5&&<><Photo index={0} target={[-2.45,0.9,-0.8]} rotation={[0,0.2,-0.15]} reduced={reduced} onClick={()=>onMemory(0)} scale={0.48}/><Photo index={content.memories.length-1} target={[2.45,0.9,-0.8]} rotation={[0,-0.2,0.15]} reduced={reduced} onClick={()=>onMemory(content.memories.length-1)} scale={0.48}/></>}
      {finished&&!reduced&&<Confetti/>}
    </group>
    {stage<3&&<><mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.33,0]}><circleGeometry args={[2.7,80]}/><meshStandardMaterial color="#edb5cb" roughness={0.9}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.37,0]}><ringGeometry args={[2.7,2.74,80]}/><meshBasicMaterial color="#ce8eaa" transparent opacity={0.5} side={THREE.DoubleSide}/></mesh>
    <ContactShadows position={[0,-0.31,0]} opacity={0.3} scale={14} blur={2.5} far={5} resolution={256}/></>}
    <Float speed={reduced?0:1.3} rotationIntensity={reduced?0:0.25} floatIntensity={reduced?0:0.35}><Heart position={[-2.35,2.1,-0.7]} scale={0.38} color="#e29ab5"/></Float>
    <Float speed={reduced?0:1.1} rotationIntensity={reduced?0:0.2} floatIntensity={reduced?0:0.4}><Heart position={[2.5,1.65,-1.1]} scale={0.25} color="#f5c9da"/></Float>
    {!reduced&&<Sparkles count={finished?65:18} scale={[8,4,5]} size={finished?5:2} speed={0.25} color="#fff4db" opacity={0.6}/>}
  </>;
}

export default function Scene(props:Props) {
  return <Canvas dpr={[1,1.5]} camera={{position:[3.3,2.3,7],fov:36,near:0.1,far:60}} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}}>
    <Suspense fallback={null}><World {...props}/></Suspense>
  </Canvas>;
}
