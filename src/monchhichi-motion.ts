import * as THREE from 'three';
import type { MonchhichiPose } from './monchhichi-model';

const continuous = new Set<MonchhichiPose>(['Idle', 'Walk', 'Float', 'Hug']);
/** Owns action weights; Three's fade envelopes restart at one when interrupted. */
export class CharacterMotion {
  readonly mixer: THREE.AnimationMixer;
  private actions = new Map<MonchhichiPose, THREE.AnimationAction>();
  private start = new Map<THREE.AnimationAction, number>();
  private target: THREE.AnimationAction | undefined;
  private elapsed = 0;
  private duration = 1.15;
  private requested: MonchhichiPose = 'Idle';
  private pendingRest = false;
  private gestureToken = '';
  private settling = 0;
  constructor(private root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    clips.forEach(clip => this.actions.set(clip.name as MonchhichiPose, this.mixer.clipAction(clip)));
    this.target = this.actions.get('Idle');
    this.target?.setEffectiveWeight(1).play();
    root.animations = clips;
  }
  request(pose: MonchhichiPose, token = '', immediate = false) {
    const newGesture = token !== this.gestureToken || !this.target?.isRunning();
    this.gestureToken = token;
    if (pose === this.requested && !newGesture) return;
    this.requested = pose;
    // A bubble can disappear before a bow or wave has finished. Keep its landing.
    if (pose === 'Idle' && this.target && !continuous.has(this.target.getClip().name as MonchhichiPose)
        && this.target.time < this.target.getClip().duration - .6 && !immediate) {
      this.pendingRest = true; return;
    }
    this.blend(pose, immediate);
  }
  private blend(pose: MonchhichiPose, immediate = false) {
    const next = this.actions.get(pose) ?? this.actions.get('Idle');
    if (!next) return;
    this.pendingRest = false;
    this.start.clear();
    this.actions.forEach(action => {
      const weight = action.getEffectiveWeight();
      action.stopFading();
      this.start.set(action, action.isRunning() || action === this.target ? weight : 0);
    });
    if (!next.isRunning()) next.reset();
    next.setLoop(continuous.has(pose) ? THREE.LoopRepeat : THREE.LoopOnce, continuous.has(pose) ? Infinity : 1);
    next.clampWhenFinished = true;
    next.play();
    this.target = next;
    this.elapsed = 0;
    this.duration = immediate ? 0 : pose === 'Blow' ? .45 : 1.15;
    this.settling = 1.3;
    this.weights(immediate ? 1 : 0);
    this.mixer.update(0);
  }
  private weights(t: number) {
    const eased = t * t * t * (t * (t * 6 - 15) + 10);
    this.actions.forEach(action => {
      const weight = THREE.MathUtils.lerp(this.start.get(action) ?? 0, action === this.target ? 1 : 0, eased);
      action.setEffectiveWeight(weight);
      if (t === 1 && action !== this.target) action.stop();
    });
  }
  update(delta: number, speed = 1, paused = false, walkDistance?: number, stride = .24) {
    const dt = Math.min(delta, .15);
    if (paused && this.requested !== 'Idle') this.request('Idle');
    if (paused && this.settling <= 0 && !this.pendingRest) return;
    this.settling -= dt;
    this.elapsed += dt;
    if (this.start.size) this.weights(this.duration ? Math.min(1, this.elapsed / this.duration) : 1);
    // Local locomotion follows distance travelled, rather than a second timer.
    const walk = this.actions.get('Walk');
    if (walk && walkDistance !== undefined && walk.getEffectiveWeight() > 0) {
      walk.time = ((walkDistance / stride) % 1) * walk.getClip().duration;
      walk.setEffectiveTimeScale(0);
    } else walk?.setEffectiveTimeScale(speed);
    this.actions.forEach(a => { if (a !== walk) a.setEffectiveTimeScale(speed); });
    this.mixer.update(dt);
    if (this.target && !continuous.has(this.target.getClip().name as MonchhichiPose)
        && this.target.time >= this.target.getClip().duration - (this.pendingRest ? .5 : .05)) {
      this.requested = 'Idle'; this.blend('Idle');
    }
    this.root.userData.motionWeights = [...this.actions].map(([name,a]) => ({name,weight:a.getEffectiveWeight()})).filter(a=>a.weight>0);
  }
  dispose() { this.mixer.stopAllAction(); this.start.clear(); this.gestureToken="disposed"; }
}
