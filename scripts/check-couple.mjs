import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const binary = readFileSync(new URL('../public/assets/models/monchhichi-couple.glb', import.meta.url));
assert.equal(binary.readUInt32LE(0), 0x46546c67);
const jsonLength = binary.readUInt32LE(12);
const gltf = JSON.parse(binary.subarray(20, 20 + jsonLength));
const data = binary.subarray(28 + jsonLength);
const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function values(index) {
  const accessor = gltf.accessors[index], view = gltf.bufferViews[accessor.bufferView];
  const bytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
  const read = { 5121: 'readUInt8', 5123: 'readUInt16LE', 5125: 'readUInt32LE', 5126: 'readFloatLE' }[accessor.componentType];
  const count = components[accessor.type], stride = view.byteStride ?? bytes * count;
  return Array.from({ length: accessor.count * count }, (_, i) => data[read]((view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + Math.floor(i / count) * stride + i % count * bytes));
}
const closed = [];
let triangles = 0;
for (const node of gltf.nodes.filter(node => node.mesh !== undefined)) {
  const mesh = gltf.meshes[node.mesh], edges = new Map();
  for (const primitive of mesh.primitives) {
    const vertices = values(primitive.attributes.POSITION), indices = values(primitive.indices);
    assert(vertices.every(Number.isFinite));
    triangles += indices.length / 3;
    if (node.name.startsWith('CoupleEye')) continue;
    for (let i = 0; i < indices.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const a = indices[i + k], b = indices[i + (k + 1) % 3];
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        const edge = edges.get(key) ?? { count: 0, winding: 0 };
        edge.count++; edge.winding += a < b ? 1 : -1; edges.set(key, edge);
      }
    }
  }
  if (!node.name.startsWith('CoupleEye')) {
    const invalid = [...edges.values()].filter(edge => edge.count !== 2 || edge.winding !== 0);
    assert.equal(invalid.length, 0, `${node.name} must be a closed, consistently wound volume`);
    closed.push(node.name);
  }
}
const rig = gltf.nodes.find(node => node.name === 'CoupleHeartRig');
assert.deepEqual(rig.children.map(index => gltf.nodes[index].name).sort(), ['CoupleGripLeft', 'CoupleGripRight', 'CoupleGripSide', 'CoupleHeart']);
assert.equal(gltf.nodes.filter(node => node.name.startsWith('CoupleEye')).length, 4);
for (const eye of gltf.nodes.filter(node => node.name.startsWith('CoupleEye'))) {
  const primitive = gltf.meshes[eye.mesh].primitives[0];
  assert.equal(primitive.targets.length, 1);
  assert.equal(gltf.materials[primitive.material].alphaMode, 'BLEND');
}
for (const animation of gltf.animations) {
  for (const sampler of animation.samplers) {
    const keys = values(sampler.output), width = components[gltf.accessors[sampler.output].type];
    assert(keys.every(Number.isFinite));
    for (let i = 0; i < width; i++) assert(Math.abs(keys[i] - keys[keys.length - width + i]) < 1e-6, `${animation.name} must return to its starting pose`);
  }
}
assert(gltf.images.every(image => image.bufferView !== undefined), 'Textures must be embedded for static hosting');
const greeting = gltf.animations.find(animation => animation.name === 'CoupleTogether');
const lift = greeting.channels.find(channel => channel.target.path === 'translation');
const liftKeys = values(greeting.samplers[lift.sampler].output);
assert(liftKeys.slice(0, 3).every((value, i) => Math.abs(value - rig.translation[i]) < 1e-6), 'Standalone greeting must start at the held heart position');
const result = { passed: true, bytes: binary.length, triangles, closedVolumes: closed.length, eyes: 4, clips: gltf.animations.map(animation => animation.name), texturesEmbedded: gltf.images.length, sharedGripRig: true };
writeFileSync(new URL('../docs/couple-model-check.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
