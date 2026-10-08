import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { MonchhichiPose } from './monchhichi-model';
import { CharacterMotion } from './monchhichi-motion';
import { useRef, type MutableRefObject } from 'react';
import { CharacterFace } from './monchhichi-face';
import type { FacePerformance } from './guide-speech';

export function Monchhichi({ pose = 'Idle', reduced = false, paused = false, speed = 1, name = 'monchhichi-model', gestureToken = '', travel, settleWhenPaused = false, performance }: { performance?: MutableRefObject<FacePerformance>; settleWhenPaused?: boolean; gestureToken?: string; travel?: MutableRefObject<number>; pose?: MonchhichiPose; reduced?: boolean; paused?: boolean; speed?: number; name?: string }) {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}assets/models/monchhichi.glb`);
  const { root, materials } = useMemo(() => {
    const root = clone(gltf.scene), materials = new Map<THREE.Material, THREE.Material>();
    root.traverse(o => { if (o instanceof THREE.Mesh) {
      const own = (original: THREE.Material) => { let copy=materials.get(original); if(!copy){copy=original.clone(); materials.set(original,copy);} return copy; };
      o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);
    } });
    return { root, materials: [...materials.values()] };
  }, [gltf.scene]);
  const face = useRef<CharacterFace | null>(null);
  useEffect(() => {
    if (!performance) return;
    const own = new CharacterFace(root); face.current = own;
    return () => { own.dispose(); face.current = null; };
  }, [root, performance]);
  const clips = gltf.animations;
  const motion = useMemo(() => new CharacterMotion(root, clips), [root, clips]);
  useEffect(() => {
    motion.request(reduced ? pose : paused && settleWhenPaused ? 'Idle' : pose, gestureToken, reduced || paused && !settleWhenPaused);
    root.userData.pose = pose;
    root.updateMatrixWorld(true);
  }, [pose, paused, reduced, settleWhenPaused, gestureToken, motion, root]);
  useFrame((_, delta) => {
    if (document.hidden) return;
    if (performance) face.current?.update(delta, performance.current, reduced, paused);
    if (reduced || paused && !settleWhenPaused) return;
    for (let parent: THREE.Object3D | null = root; parent; parent = parent.parent) if (!parent.visible) return;
    motion.update(delta, speed, paused, travel?.current);
  });
  useEffect(() => () => { motion.dispose(); materials.forEach(m => m.dispose()); root.traverse(o => { if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose(); }); }, [root, motion, materials]);
  return <group name={name} userData={{ pose, reduced, speed }}><primitive object={root} dispose={null} /></group>;
}
