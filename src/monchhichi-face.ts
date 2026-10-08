import * as THREE from 'three';
import type { FacePerformance } from './guide-speech';

type Feature = { name: string; rect: [number, number, number, number]; mesh: THREE.Mesh; canvas: HTMLCanvasElement; base: HTMLCanvasElement; ink: HTMLCanvasElement; texture: THREE.CanvasTexture; };
const clamp = THREE.MathUtils.clamp;
/** Small curved facial surfaces preserve the reference artwork and follow Head.
 * The source GLB/atlas are shared and never edited. Only this actor owns the patches. */
export class CharacterFace {
  private features: Feature[] = [];
  private elapsed = 0;
  private blinkAt = 5.8;
  private blinkStart = -10;
  private open = 0;
  private round = 0;
  private refresh = 0;
  private lastSignature = '';
  constructor(private root: THREE.Object3D) {
    const family = root.getObjectByName('Monchhichi-textured-body');
    const meshes: THREE.SkinnedMesh[] = [];
    family?.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(object as THREE.SkinnedMesh); });
    const body = meshes.find(mesh => (mesh.material as THREE.Material).name === 'reference-artwork-skin') ?? meshes[0];
    const head = root.getObjectByName('Head');
    if (!body || !head) return;
    const original = (Array.isArray(body.material) ? body.material[0] : body.material) as THREE.MeshStandardMaterial;
    const image = original.map?.image as CanvasImageSource & { width: number; height: number };
    if (!image?.width) return;
    const source = document.createElement('canvas'); source.width = image.width; source.height = image.height;
    const ctx = source.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, source.width, source.height);
    const position = body.geometry.attributes.position, uv = body.geometry.attributes.uv;
    const skin = body.geometry.attributes.skinIndex;
    const indices = meshes.map(mesh => mesh.geometry.index!).filter(Boolean);
    const headIndex = body.skeleton.bones.indexOf(head as THREE.Bone);
    root.updateMatrixWorld(true);
    const triangles: { ids: number[]; minU: number; maxU: number; minV: number; maxV: number }[] = [];
    for (const index of indices) for (let i = 0; i < index.count; i += 3) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      if (!ids.every(id => skin.getX(id) === headIndex && position.getZ(id) > 0)) continue;
      triangles.push({ ids, minU: Math.min(...ids.map(id => uv.getX(id))), maxU: Math.max(...ids.map(id => uv.getX(id))), minV: Math.min(...ids.map(id => uv.getY(id))), maxV: Math.max(...ids.map(id => uv.getY(id))) });
    }
    const surface = (u: number, v: number) => {
      let found: THREE.Vector3 | null = null;
      for (const t of triangles) {
        if (u < t.minU - 1e-6 || u > t.maxU + 1e-6 || v < t.minV - 1e-6 || v > t.maxV + 1e-6) continue;
        const [a, b, c] = t.ids, ax = uv.getX(a), ay = uv.getY(a), bx = uv.getX(b), by = uv.getY(b), cx = uv.getX(c), cy = uv.getY(c);
        const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
        if (Math.abs(denominator) < 1e-12) continue;
        const A = ((by - cy) * (u - cx) + (cx - bx) * (v - cy)) / denominator;
        const B = ((cy - ay) * (u - cx) + (ax - cx) * (v - cy)) / denominator, C = 1 - A - B;
        if (Math.min(A, B, C) < -1e-5) continue;
        const p = new THREE.Vector3(position.getX(a) * A + position.getX(b) * B + position.getX(c) * C, position.getY(a) * A + position.getY(b) * B + position.getY(c) * C, position.getZ(a) * A + position.getZ(b) * B + position.getZ(c) * C);
        if (!found || p.z > found.z) found = p;
      }
      if (!found) throw new Error('Facial patch falls outside the reference head');
      found.z += .003;
      return found.applyMatrix4(body.bindMatrix).applyMatrix4(body.skeleton.boneInverses[headIndex]);
    };
    for (const { name, rect } of [
      { name: 'mouth', rect: [568, 934, 216, 122] as [number, number, number, number] },
      { name: 'eye-left', rect: [431, 1070, 139, 187] as [number, number, number, number] },
      { name: 'eye-right', rect: [732, 1116, 145, 184] as [number, number, number, number] },
    ]) {
      const [x, y, w, h] = rect, canvas = document.createElement('canvas'), base = document.createElement('canvas'), ink = document.createElement('canvas');
      canvas.width = base.width = ink.width = w; canvas.height = base.height = ink.height = h;
      const baseContext = base.getContext('2d')!, inkContext = ink.getContext('2d')!;
      const background = baseContext.createImageData(w, h), foreground = inkContext.createImageData(w, h);
      const glyphMask = new Uint8Array(w * h);
      for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
        const at = ((y + row) * source.width + x + col) * 4, R = pixels.data[at], G = pixels.data[at + 1], B = pixels.data[at + 2];
        const glyph = R < 210 || (name === 'mouth' ? R > 190 && G < 190 && B < 179 : R > 236 && G > 224 && B > 197);
        if (!glyph) continue;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
          const X = col + dx, Y = row + dy;
          if (X >= 0 && X < w && Y >= 0 && Y < h) glyphMask[Y * w + X] = 1;
        }
      }
      for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
        const i = (row * w + col) * 4, from = ((y + row) * source.width + x + col) * 4;
        // Feathered skin interpolation removes the old painted feature below
        // the animated artwork, while leaving the patch's outer pixels exact.
        const margin = Math.min(col, w - 1 - col, row, h - 1 - row);
        const alpha = glyphMask[row * w + col] ? THREE.MathUtils.smoothstep(margin, 0, 3) : 0;
        const left = ((y + row) * source.width + x - 18) * 4, right = ((y + row) * source.width + x + w + 18) * 4;
        for (let k = 0; k < 3; k++) {
          const skinColor = THREE.MathUtils.lerp(pixels.data[left + k], pixels.data[right + k], col / (w - 1));
          background.data[i + k] = THREE.MathUtils.lerp(pixels.data[from + k], skinColor, alpha);
          foreground.data[i + k] = pixels.data[from + k];
        }
        background.data[i + 3] = 255; foreground.data[i + 3] = Math.round(alpha * 255);
      }
      baseContext.putImageData(background, 0, 0); inkContext.putImageData(foreground, 0, 0);
      const vertices: number[] = [], textureUV: number[] = [], indices: number[] = [], mouthOpen: number[] = [], mouthRound: number[] = [];
      const columns = 24, rows = 20;
      for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
        const s = col / columns, t = row / rows;
        const p = surface((x + s * w) / source.width, (y + t * h) / source.height);
        vertices.push(p.x, p.y, p.z); textureUV.push(s, 1 - t);
        const influence = Math.sin(Math.PI * s) ** 2 * Math.sin(Math.PI * t) ** 2;
        mouthOpen.push(0, name === 'mouth' ? -.012 * influence : 0, name === 'mouth' ? .005 * influence : 0);
        mouthRound.push(name === 'mouth' ? (.5 - s) * .012 * influence : 0, 0, name === 'mouth' ? .012 * influence : 0);
      }
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
        const a = row * (columns + 1) + col, b = a + 1, c = a + columns + 1, d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(textureUV, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
      if (name === 'mouth') { geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(mouthOpen, 3), new THREE.Float32BufferAttribute(mouthRound, 3)]; geometry.morphTargetsRelative = true; }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const material = original.clone(); material.map = texture; material.vertexColors = false; material.side = THREE.DoubleSide; material.polygonOffset = true; material.polygonOffsetFactor = -1; material.polygonOffsetUnits = -1;
      const mesh = new THREE.Mesh(geometry, material); mesh.name = `face-${name}`; mesh.renderOrder = 2; mesh.frustumCulled = false; head.add(mesh);
      this.features.push({ name, rect, mesh, canvas, base, ink, texture });
    }
    this.paint(1, .75, 0);
  }
  private paint(eye: number, mouth: number, round: number) {
    for (const f of this.features) {
      const ctx = f.canvas.getContext('2d')!, w = f.canvas.width, h = f.canvas.height;
      ctx.clearRect(0, 0, w, h); ctx.drawImage(f.base, 0, 0);
      const isMouth = f.name === 'mouth', sx = isMouth ? 1 - round * .40 : 1, sy = isMouth ? mouth : eye;
      ctx.save(); ctx.globalAlpha = isMouth ? 1 - THREE.MathUtils.smoothstep(round, .6, .92) : 1; ctx.translate(w / 2, h * (isMouth ? .62 : .49)); ctx.scale(sx, sy); ctx.drawImage(f.ink, -w / 2, -h * (isMouth ? .62 : .49)); ctx.restore();
      if (isMouth && round > .6) { ctx.save(); ctx.globalAlpha = THREE.MathUtils.smoothstep(round, .6, .92); ctx.fillStyle = '#51402a'; ctx.beginPath(); ctx.ellipse(w * .5, h * .52, w * .10, h * .19, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e7a086'; ctx.beginPath(); ctx.ellipse(w * .5, h * .52, w * .065, h * .115, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      f.texture.needsUpdate = true;
      if (f.mesh.morphTargetInfluences) { f.mesh.morphTargetInfluences[0] = clamp((mouth - .3) / .8, 0, 1); f.mesh.morphTargetInfluences[1] = round; }
    }
  }
  update(delta: number, state: FacePerformance, reduced: boolean, paused: boolean) {
    if (document.hidden || !this.features.length) return;
    const dt = Math.min(delta, .1);
    if (!paused && !reduced) {
      this.elapsed += dt;
      if (this.elapsed > this.blinkAt) { this.blinkStart = this.elapsed; this.blinkAt = this.elapsed + 5.4 + Math.sin(this.elapsed * .7) * 1.2; }
    }
    const age = this.elapsed - this.blinkStart, blink = !reduced && age >= 0 && age < .32 ? Math.sin(age / .32 * Math.PI) ** 2 : 0;
    const expression = state.expression;
    const rest = expression === 'excited' ? 1 : expression === 'shy' ? .45 : expression === 'happy' ? .86 : .75;
    const desired = expression === 'blow' ? .55 : state.talking ? .26 + state.mouth * .83 : rest;
    this.open = THREE.MathUtils.damp(this.open, reduced ? .75 : desired, 12, dt);
    this.round = THREE.MathUtils.damp(this.round, reduced ? 0 : expression === 'blow' ? 1 : state.round, 10, dt);
    const softEyes = expression === 'shy' ? .84 : expression === 'thanks' ? .88 : expression === 'excited' ? 1.04 : 1;
    const eye = reduced ? 1 : Math.max(.08, softEyes * (1 - blink * .94));
    this.refresh += dt;
    const signature = `${eye.toFixed(2)}:${this.open.toFixed(2)}:${this.round.toFixed(2)}`;
    if (signature !== this.lastSignature && this.refresh >= .045) { this.refresh = 0; this.lastSignature = signature; this.paint(eye, this.open, this.round); }
    this.root.userData.face = { expression, mouth: this.open, round: this.round, blink, talking: state.talking, patches: this.features.length };
  }
  dispose() { this.features.forEach(f => { f.mesh.removeFromParent(); f.mesh.geometry.dispose(); (f.mesh.material as THREE.Material).dispose(); f.texture.dispose(); }); this.features = []; }
}
