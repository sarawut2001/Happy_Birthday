import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

type Props = { reduced: boolean; phase?: 'hidden' | 'sealing' | 'end'; reveal?: MutableRefObject<{ value:number }>; blinkPreview?: number; debug?: boolean };

/** A single shared grip rig keeps both sets of hands in contact with the heart. */
export function EndingCouple({ reduced, phase = 'end', reveal, blinkPreview, debug = false }: Props) {
  const gltf=useGLTF(`${import.meta.env.BASE_URL}assets/models/monchhichi-couple.glb`);
  const {root,materials,eyes,rest}=useMemo(()=>{
    const root=gltf.scene.clone(true),materials:{material:THREE.Material;alpha:number;heart:boolean;transparent:boolean;depthWrite:boolean}[]=[],eyes:THREE.Mesh[]=[],rest=new Map<THREE.Object3D,{p:THREE.Vector3;q:THREE.Quaternion}>();
    root.traverse(o=>{
      rest.set(o,{p:o.position.clone(),q:o.quaternion.clone()});
      if(o instanceof THREE.Mesh){
        const part = o.parent?.name || o.name;
        const copy=(m:THREE.Material)=>{const material=m.clone();materials.push({material,alpha:m.opacity,heart:part==='CoupleHeart'||part.startsWith('CoupleGrip'),transparent:m.transparent,depthWrite:m.depthWrite});return material;};
        o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
        if(o.name.startsWith('CoupleEye'))eyes.push(o);
      }
    });
    return {root,materials,eyes,rest};
  },[gltf.scene]);
  const mixer=useMemo(()=>new THREE.AnimationMixer(root),[root]);
  const gesture=useRef<THREE.AnimationAction|null>(null),elapsed=useRef(0),greeted=useRef(false),lastOpacity=useRef(-1);
  useEffect(()=>{
    for(const clip of gltf.animations)if(clip.name!=='CoupleTogether')mixer.clipAction(clip).setLoop(THREE.LoopRepeat,Infinity).play();
    const together=gltf.animations.find(c=>c.name==='CoupleTogether');
    // Preserve portable GLB keys, then layer the greeting over breathing.
    if(together){const additive=THREE.AnimationUtils.makeClipAdditive(together.clone());gesture.current=mixer.clipAction(additive,root,THREE.AdditiveAnimationBlendMode);gesture.current.setLoop(THREE.LoopOnce,1);gesture.current.clampWhenFinished=true;}
    return()=>{mixer.stopAllAction();mixer.uncacheRoot(root);};
  },[gltf.animations,mixer,root]);
  useEffect(()=>{
    elapsed.current=0;greeted.current=false;gesture.current?.stop();
    if(phase==='hidden'||reduced){mixer.setTime(0);rest.forEach(({p,q},node)=>{node.position.copy(p);node.quaternion.copy(q);});eyes.forEach(eye=>{if(eye.morphTargetInfluences)eye.morphTargetInfluences[0]=0;});}
  },[phase,reduced,mixer,root,rest,eyes]);
  const frame=useRef<THREE.Group>(null);
  useFrame((_,delta)=>{
    const amount=phase==='hidden'?0:reveal?.current.value??1;
    root.visible=amount>.001;
    if(lastOpacity.current!==amount){
      lastOpacity.current=amount;
      for(const {material,alpha,heart,transparent:originalTransparent,depthWrite}of materials){
        const opacity=alpha*THREE.MathUtils.smoothstep(amount,heart?0:.18,heart?.65:1);
        const transparent=opacity<.999||originalTransparent;
        if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}
        material.opacity=opacity;material.depthWrite=opacity>.98&&depthWrite;
      }
    }
    if(!reduced&&phase!=='hidden'&&!document.hidden){
      const dt=Math.min(delta,.075);mixer.update(dt);elapsed.current+=dt;
      if(phase==='end'&&!greeted.current&&elapsed.current>3.6){greeted.current=true;gesture.current?.reset().setEffectiveWeight(1).play();}
    }
    if(blinkPreview!==undefined)eyes.forEach(eye=>{if(eye.morphTargetInfluences)eye.morphTargetInfluences[0]=blinkPreview;});
    if(frame.current&&!reduced&&phase!=='hidden'){
      frame.current.position.y=Math.sin(elapsed.current*Math.PI*2/7.2)*.018;
      frame.current.rotation.y=Math.sin(elapsed.current*Math.PI*2/11)*.022;
    }else if(frame.current){frame.current.position.y=0;frame.current.rotation.y=0;}
    root.userData.animation={phase,amount,elapsed:elapsed.current,blinkLeft:eyes.find(e=>e.name==='CoupleEyeLeftOuter')?.morphTargetInfluences?.[0]??0,blinkRight:eyes.find(e=>e.name==='CoupleEyeRightOuter')?.morphTargetInfluences?.[0]??0,greeted:greeted.current};
    if(debug&&frame.current)frame.current.userData.animation=root.userData.animation;
  });
  useEffect(()=>()=>{materials.forEach(({material})=>material.dispose());},[materials]);
  return <group ref={frame} name="couple-performance"><primitive object={root} dispose={null}/></group>;
}
