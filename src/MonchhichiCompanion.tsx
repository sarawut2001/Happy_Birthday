import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import type { Journey } from './journey';
import { Monchhichi } from './Monchhichi';
import type { MonchhichiPose } from './monchhichi-model';

function cue(j: Journey, small: boolean): { position: [number, number, number]; scale: number; pose: MonchhichiPose } {
  const stage = j.transition?.to ?? j.stage;
  if (stage === 0) return { position: [small ? 1.35 : 1.65, -1.25, 0.35], scale: j.gift === 'locked' ? 0.55 : 0.43, pose: j.gift === 'locked' ? 'Idle' : 'Wave' };
  if (stage === 1) return { position: [-1.5, -1.25, 1.05], scale: 0.54, pose: j.cake === 'out' ? 'Celebrate' : 'Idle' };
  if (stage === 2) return { position: [1.6, -1.24, 0.65], scale: 0.43, pose: 'Celebrate' };
  if (stage === 3) return { position: [1.62, -1.24, 0.38], scale: 0.43, pose: j.envelope === 'closed' ? 'Wave' : 'Idle' };
  if (stage === 4) return { position: [small ? 1.8 : 2.05, -1.28, 0.4], scale: small ? 0.25 : 0.29, pose: 'Idle' };
  if (stage === 5) return { position: [small ? 1.25 : 1.9, -2.36, 1.65], scale: small ? 0.38 : 0.46, pose: 'Wave' };
  return { position: [small ? 1.7 : 2.1, j.finale === 'end' ? 0.35 : -1.3, -22.75], scale: j.finale === 'end' ? 0.46 : 0.4, pose: j.finale === 'end' ? 'Hug' : j.rating > 0 && j.rating < 5 ? 'Shy' : j.rating === 5 ? 'Celebrate' : 'Idle' };
}
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d')!, g = ctx.createRadialGradient(32,32,2,32,32,30);
  g.addColorStop(0,'rgba(70,36,28,.3)');g.addColorStop(1,'rgba(70,36,28,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(c);
}

// Persistent actor: GSAP owns travel, the mixer owns the rig, a nested group owns reactions.
export function MonchhichiCompanion({ journey: j, reduced, rejection, ratingReaction }: { journey: Journey; reduced: boolean; rejection: number; ratingReaction: number }) {
  const { size } = useThree(), small = size.width < 600;
  const first = useRef(cue(j, small)), root = useRef<THREE.Group>(null), reaction = useRef<THREE.Group>(null);
  const [pose, setPose] = useState<MonchhichiPose>(first.current.pose), [walkSpeed, setWalkSpeed] = useState(1);
  const map = useMemo(shadowTexture, []), animatedCue = useRef(false), transient = useRef(false);
  const previousReject = useRef(rejection), previousRating = useRef(ratingReaction), elapsed = useRef(0);
  const route = `${j.stage}/${j.transition?.kind ?? '-'}/${j.gift}/${j.cake}/${j.envelope}/${j.world}/${j.worldPhase}/${j.finale}/${j.rating}`;
  const visible = j.stage < 5 || j.transition?.kind === 'paper-door' || (j.stage === 5 && (j.world === 'entry' || ['opening','suction'].includes(j.worldPhase))) || (j.stage === 6 && ['rating','sealing','end'].includes(j.finale));
  useEffect(() => {
    if (!root.current) return;
    const object = root.current, next = cue(j, small);
    const source = object.position.clone(), destination = new THREE.Vector3(...next.position);
    const returning = j.stage === 6 && j.finale === 'rating';
    if (returning && object.position.z > -10) { object.position.set(0, 1.1, -24); object.scale.setScalar(0.015); source.copy(object.position); }
    const distance = source.distanceTo(destination), moving = distance > 0.08 && visible;
    const walking = moving && j.stage < 5 && !['letter-paper','paper-door'].includes(j.transition?.kind ?? '') && Math.abs(source.z - destination.z) < 2;
    const duration = reduced ? 0 : moving ? j.transition ? 2.7 : j.stage === 6 ? 1.65 : 1.5 : 0.8;
    animatedCue.current = moving;
    if (walking) { setPose('Walk'); setWalkSpeed(THREE.MathUtils.clamp(distance / Math.max(duration * 0.4 * next.scale, 0.01), 0.7, 2.2)); }
    else if (!transient.current) { setPose(next.pose); setWalkSpeed(1); }
    const t = gsap.timeline({ onComplete: () => { animatedCue.current = false; if (!transient.current) setPose(next.pose); setWalkSpeed(1); } });
    if (walking) t.to(object.rotation, { y: Math.atan2(destination.x-source.x, destination.z-source.z), duration: reduced ? 0 : 0.35, ease:'sine.inOut' },0);
    // Linear distance keeps foot speed consistent; the clip fades at the beginning and end.
    t.to(object.position,{x:destination.x,y:destination.y,z:destination.z,duration,ease:walking?'none':'sine.inOut'},0);
    t.to(object.scale,{x:next.scale,y:next.scale,z:next.scale,duration:reduced?0:1.1,ease:'sine.inOut'},0);
    t.to(object.rotation,{y:0,duration:reduced?0:0.45,ease:'sine.inOut'},Math.max(0,duration-0.45));
    const visibility=()=>t.paused(document.hidden);document.addEventListener('visibilitychange',visibility);visibility();
    return ()=>{t.kill();document.removeEventListener('visibilitychange',visibility);animatedCue.current=false};
    // The route key describes all story state used by cue(). Pose changes must not restart travel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[route,reduced,small,visible]);
  useEffect(() => {
    const changed = rejection !== previousReject.current; previousReject.current = rejection;
    if (!changed || !rejection || j.stage !== 0) return;
    transient.current = true; setPose('Shy');
    if (reduced || !reaction.current) { transient.current=false;setPose(cue(j,small).pose);return; }
    const object=reaction.current,t=gsap.timeline({onComplete:()=>{transient.current=false;setPose(cue(j,small).pose)}});
    t.to(object.rotation,{z:-0.07,duration:.25,ease:'sine.inOut'}).to(object.rotation,{z:.05,duration:.3,ease:'sine.inOut'}).to(object.rotation,{z:0,duration:.45,ease:'sine.inOut'});
    const visibility=()=>t.paused(document.hidden);document.addEventListener('visibilitychange',visibility);visibility();
    return()=>{t.kill();document.removeEventListener('visibilitychange',visibility);transient.current=false;object.rotation.z=0};
  },[rejection,reduced,j.stage,small]);
  useEffect(()=>{
    const changed=ratingReaction!==previousRating.current;previousRating.current=ratingReaction;
    if(!changed||j.stage!==6||j.finale!=='rating'||reduced||!reaction.current)return;
    const object=reaction.current,t=gsap.to(object.rotation,{z:j.rating<5?-.06:.06,duration:.3,yoyo:true,repeat:1,ease:'sine.inOut'});
    return()=>{t.kill();object.rotation.z=0};
  },[ratingReaction,j.stage,j.finale,j.rating,reduced]);
  useFrame((_,delta)=>{
    if(!root.current||!reaction.current)return;elapsed.current+=Math.min(delta,.05);
    if(!animatedCue.current&&!transient.current)reaction.current.rotation.y=reduced?0:Math.sin(elapsed.current*.5)*.035;
    root.current.userData.walking=animatedCue.current&&pose==='Walk';root.current.userData.visible=visible;
  });
  useEffect(()=>()=>map.dispose(),[map]);
  return <group ref={root} name="story-monchhichi" position={first.current.position} scale={first.current.scale} visible={visible} userData={{ route }}>
    <group ref={reaction}><Monchhichi pose={pose} reduced={reduced || j.stage === 4} speed={walkSpeed} name="companion-rig" /></group>
    {j.stage<4||j.stage===5&&j.world==='entry'?<mesh rotation={[-Math.PI/2,0,0]} position={[0,.003,0]}><planeGeometry args={[1.5,1.3]}/><meshBasicMaterial map={map} transparent depthWrite={false}/></mesh>:null}
  </group>;
}
