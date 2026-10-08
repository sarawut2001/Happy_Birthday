import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

// Inspect the actual exported asset without a browser or image decoder. Shape
// likeness is checked with paired renders; depth alone cannot establish likeness.
const asset = process.argv[2]
  ? pathToFileURL(process.argv[2])
  : new URL('../public/assets/models/monchhichi.glb', import.meta.url);
const bytes = await readFile(asset);
assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'Expected GLB magic');
assert.equal(bytes.readUInt32LE(4), 2, 'Expected GLB version 2');
assert.equal(bytes.readUInt32LE(8), bytes.length, 'GLB byte length mismatch');
let gltf, binary;
for (let offset = 12; offset < bytes.length;) {
  const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
  assert.ok(offset + 8 + length <= bytes.length, 'Chunk exceeds GLB length');
  if (type === 0x4e4f534a) gltf = JSON.parse(bytes.subarray(offset + 8, offset + 8 + length).toString());
  if (type === 0x004e4942) binary = bytes.subarray(offset + 8, offset + 8 + length);
  offset += 8 + length;
}
assert.ok(gltf && binary, 'JSON and binary chunks are required');
assert.equal(gltf.buffers.length, 1, 'Expected one embedded GLB buffer');
assert.equal(gltf.buffers[0].uri, undefined, 'External geometry is not allowed');
assert.ok(gltf.buffers[0].byteLength <= binary.length);
const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
const widths = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16};
const components = {
  5120: [1, 'getInt8', 127], 5121: [1, 'getUint8', 255],
  5122: [2, 'getInt16', 32767], 5123: [2, 'getUint16', 65535],
  5125: [4, 'getUint32', 4294967295], 5126: [4, 'getFloat32', 1],
};
const cache = new Map();
function accessor(index) {
  if (cache.has(index)) return cache.get(index);
  const a = gltf.accessors[index];
  assert.ok(a && !a.sparse && a.bufferView !== undefined, `Unsupported accessor ${index}`);
  const b = gltf.bufferViews[a.bufferView], specification = components[a.componentType];
  assert.ok(b && specification && widths[a.type], `Invalid accessor ${index}`);
  assert.equal(b.buffer, 0);
  const [size, method, maximum] = specification, count = widths[a.type];
  const stride = b.byteStride ?? count * size;
  const start = (b.byteOffset ?? 0) + (a.byteOffset ?? 0);
  assert.ok(a.count > 0 && stride >= count * size);
  assert.ok(start + (a.count - 1) * stride + count * size <= (b.byteOffset ?? 0) + b.byteLength);
  assert.ok((b.byteOffset ?? 0) + b.byteLength <= binary.length);
  const result = Array.from({length: a.count}, (_, i) => Array.from({length: count}, (_, k) => {
    let value = view[method](start + i * stride + k * size, true);
    if (a.normalized && a.componentType !== 5126) value = Math.max(-1, value / maximum);
    assert.ok(Number.isFinite(value), `Non-finite accessor ${index}`);
    return value;
  }));
  cache.set(index, result);
  return result;
}

const expectedJoints = ['Pelvis', 'Spine', 'Head', 'ArmL', 'ElbowL', 'HandL', 'ArmR', 'ElbowR', 'HandR', 'LegL', 'KneeL', 'FootL', 'LegR', 'KneeR', 'FootR', 'Tail'];
assert.ok(gltf.skins?.length, 'Character must have a skin');
const skeletons = gltf.skins.map((skin, i) => {
  const names = skin.joints.map(j => gltf.nodes[j]?.name);
  assert.deepEqual([...names].sort(), [...expectedJoints].sort(), `Skin ${i} must retain all 16 named joints`);
  assert.equal(new Set(skin.joints).size, 16, 'Joint indices must be unique');
  assert.ok(skin.inverseBindMatrices !== undefined, 'Missing inverse bind matrices');
  assert.equal(accessor(skin.inverseBindMatrices).length, 16);
  return names;
});
for (const [index, node] of gltf.nodes.entries()) {
  for (const key of ['matrix', 'translation', 'rotation', 'scale']) {
    if (node[key]) assert.ok(node[key].every(Number.isFinite), `Non-finite node ${index} ${key}`);
  }
  if (node.rotation) assert.ok(Math.abs(Math.hypot(...node.rotation) - 1) < 1e-4, `Node ${index} rotation is not normalized`);
}

// Weld by position, including neighboring cells, before counting edges. glTF
// duplicates vertices at UV, normal, and material seams; those are not holes.
// Analyze all primitives of a mesh together so a material split is also closed.
function topology(primitives) {
  const rawPositions = [], rawTriangles = [];
  for (const primitive of primitives) {
    const positions = accessor(primitive.attributes.POSITION), base = rawPositions.length;
    for (const position of positions) rawPositions.push(position);
    const indices = primitive.indices === undefined
      ? positions.map((_, i) => i)
      : accessor(primitive.indices).flat();
    assert.equal(indices.length % 3, 0, 'Triangle index count must be divisible by 3');
    for (let i = 0; i < indices.length; i += 3) {
      const triangle = indices.slice(i, i + 3);
      assert.ok(triangle.every(v => Number.isInteger(v) && v >= 0 && v < positions.length), 'Triangle index exceeds vertex count');
      rawTriangles.push(triangle.map(v => v + base));
    }
  }
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of rawPositions) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], p[axis]); max[axis] = Math.max(max[axis], p[axis]);
  }
  const diagonal = Math.hypot(...max.map((v, i) => v - min[i]));
  const tolerance = Math.max(diagonal * 1e-6, 1e-7), squaredTolerance = tolerance * tolerance;
  const cells = new Map(), welded = [], aliases = [];
  for (const position of rawPositions) {
    const cell = position.map(v => Math.floor(v / tolerance));
    let found;
    search: for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      for (const candidate of cells.get(`${cell[0] + dx},${cell[1] + dy},${cell[2] + dz}`) ?? []) {
        const p = welded[candidate];
        if (p.reduce((sum, v, i) => sum + (v - position[i]) ** 2, 0) <= squaredTolerance) {
          found = candidate; break search;
        }
      }
    }
    if (found === undefined) {
      found = welded.length; welded.push(position);
      const key = cell.join(',');
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(found);
    }
    aliases.push(found);
  }
  const edges = new Map(); let degenerateTriangles = 0;
  for (const raw of rawTriangles) {
    const t = raw.map(i => aliases[i]);
    if (new Set(t).size < 3) { degenerateTriangles++; continue; }
    for (let i = 0; i < 3; i++) {
      const a = t[i], b = t[(i + 1) % 3], key = a < b ? `${a},${b}` : `${b},${a}`;
      if (!edges.has(key)) edges.set(key, {a, b, count: 0, orientation: 0, length: Math.hypot(...welded[a].map((v, k) => v - welded[b][k]))});
      const edge = edges.get(key); edge.count++; edge.orientation += a < b ? 1 : -1;
    }
  }
  const boundary = [...edges.values()].filter(e => e.count === 1);
  const nonManifold = [...edges.values()].filter(e => e.count > 2);
  const winding = [...edges.values()].filter(e => e.count === 2 && e.orientation !== 0);
  const samples = list => list.slice(0, 8).map(e => ({from: welded[e.a], to: welded[e.b], count: e.count}));
  return {
    vertices: rawPositions.length, weldedVertices: welded.length, triangles: rawTriangles.length,
    boundaryEdges: boundary.length, boundaryLength: boundary.reduce((sum, e) => sum + e.length, 0),
    boundarySamples: samples(boundary), nonManifoldEdges: nonManifold.length,
    nonManifoldSamples: samples(nonManifold), inconsistentWindingEdges: winding.length,
    windingSamples: samples(winding),
    degenerateTriangles, weldTolerance: tolerance, bounds: {min, max},
  };
}

let skinnedVertices = 0, skinnedPrimitives = 0, frontArtworkVertices = 0;
const meshResults = [];
for (const [meshIndex, mesh] of gltf.meshes.entries()) {
  const nodes = gltf.nodes.filter(n => n.mesh === meshIndex);
  for (const primitive of mesh.primitives) {
    assert.equal(primitive.mode ?? 4, 4, 'Character primitives must contain triangles');
    const positions = accessor(primitive.attributes.POSITION);
    assert.ok(positions.every(p => p.length === 3));
    for (const key of ['NORMAL', 'TEXCOORD_0']) if (primitive.attributes[key] !== undefined) {
      assert.equal(accessor(primitive.attributes[key]).length, positions.length, `${key} count mismatch`);
    }
    const material = gltf.materials[primitive.material];
    if (material?.name === 'reference-artwork-front') {
      const factor = material.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1];
      assert.ok(factor.every(v => Math.abs(v - 1) < 1e-6), 'Front artwork must not be tinted by its material');
      assert.ok(material.pbrMetallicRoughness?.baseColorTexture, 'Front artwork needs its reference texture');
      const colors = primitive.attributes.COLOR_0 === undefined ? undefined : accessor(primitive.attributes.COLOR_0);
      if (colors) {
        const referenced = primitive.indices === undefined ? positions.map((_, i) => i) : [...new Set(accessor(primitive.indices).flat())];
        assert.ok(referenced.every(i => colors[i].every(v => Math.abs(v - 1) < 1e-6)), 'Front artwork COLOR_0 must stay white; glTF multiplies vertex colors with the texture');
        frontArtworkVertices += referenced.length;
      }
    }
    for (const node of nodes.filter(n => n.skin !== undefined)) {
      const attributes = primitive.attributes, skin = gltf.skins[node.skin];
      assert.ok(attributes.JOINTS_0 !== undefined && attributes.WEIGHTS_0 !== undefined, `Missing skin data in ${node.name}`);
      const joints = accessor(attributes.JOINTS_0), weights = accessor(attributes.WEIGHTS_0);
      assert.equal(joints.length, positions.length); assert.equal(weights.length, positions.length);
      assert.ok(weights.every(w => w.length === 4 && w.every(v => v >= 0 && v <= 1) && Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-5), `Invalid weights in ${node.name}`);
      assert.ok(joints.every(j => j.length === 4 && j.every(v => Number.isInteger(v) && v >= 0 && v < skin.joints.length)), `Invalid joint index in ${node.name}`);
      skinnedVertices += positions.length; skinnedPrimitives++;
    }
  }
  const result = topology(mesh.primitives);
  const name = mesh.name ?? nodes[0]?.name ?? `Mesh ${meshIndex}`;
  // The reconstructed character is made from closed volumes. Enforce this for
  // every skinned mesh even if its exported extras are accidentally omitted.
  const closed = nodes.some(n => n.skin !== undefined) || [mesh.extras, ...mesh.primitives.map(p => p.extras), ...nodes.map(n => n.extras)].some(e => e?.topology === 'closed');
  if (closed) {
    assert.equal(result.boundaryEdges, 0, `${name}: closed geometry has ${result.boundaryEdges} uncapped edges ${JSON.stringify(result.boundarySamples)}`);
    assert.equal(result.nonManifoldEdges, 0, `${name}: non-manifold geometry ${JSON.stringify(result.nonManifoldSamples)}`);
    assert.equal(result.inconsistentWindingEdges, 0, `${name}: inconsistent triangle winding ${JSON.stringify(result.windingSamples)}`);
  }
  meshResults.push({name, closed, ...result});
}
assert.ok(skinnedPrimitives > 0, 'No skinned mesh primitives were exported');

const expectedClips = ['Idle', 'Walk', 'Wave', 'Celebrate', 'Shy', 'Float', 'Hug', 'Present', 'Invite', 'Blow', 'Thanks'];
assert.deepEqual(gltf.animations.map(c => c.name).sort(), [...expectedClips].sort());
const loops = gltf.animations.map(clip => {
  assert.ok(clip.channels.length > 1, `${clip.name} has no useful animation channels`);
  let maxDifference = 0, duration = 0;
  for (const channel of clip.channels) {
    const sampler = clip.samplers[channel.sampler];
    const times = accessor(sampler.input).flat(), output = accessor(sampler.output);
    assert.ok(gltf.nodes[channel.target.node], `Missing animation target in ${clip.name}`);
    assert.equal(times[0], 0, `${clip.name} must begin at zero`);
    assert.ok(times.at(-1) > 0 && times.every((t, i) => !i || t > times[i - 1]), `${clip.name} has invalid key times`);
    assert.ok(['LINEAR', 'STEP', 'CUBICSPLINE'].includes(sampler.interpolation ?? 'LINEAR'));
    const cubic = sampler.interpolation === 'CUBICSPLINE';
    assert.equal(output.length, times.length * (cubic ? 3 : 1), `${clip.name} sampler value count mismatch`);
    const values = cubic ? output.filter((_, i) => i % 3 === 1) : output;
    const first = values[0], last = values.at(-1), path = channel.target.path;
    assert.ok(['translation', 'rotation', 'scale'].includes(path), `Unsupported animation path ${path}`);
    assert.ok(values.every(v => v.length === (path === 'rotation' ? 4 : 3)));
    let difference;
    if (path === 'rotation') {
      assert.ok(values.every(v => Math.abs(Math.hypot(...v) - 1) < 1e-4), `${clip.name} has invalid rotation quaternions`);
      // q and -q represent the same orientation and are valid loop endpoints.
      difference = Math.min(Math.max(...first.map((v, i) => Math.abs(v - last[i]))), Math.max(...first.map((v, i) => Math.abs(v + last[i]))));
    } else difference = Math.max(...first.map((v, i) => Math.abs(v - last[i])));
    maxDifference = Math.max(maxDifference, difference); duration = Math.max(duration, times.at(-1));
  }
  assert.ok(maxDifference < 1e-5, `Non-looping clip ${clip.name}`);
  return {name: clip.name, duration, maxDifference};
});
assert.ok(gltf.images?.length, 'Missing embedded character texture');
for (const image of gltf.images) {
  assert.ok(image.bufferView !== undefined && image.uri === undefined, 'Textures must be embedded');
  assert.ok(gltf.bufferViews[image.bufferView]?.byteLength > 0, 'Empty embedded texture');
  assert.ok(['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType), 'Unsupported texture format');
}
assert.ok(gltf.materials.some(m => m.pbrMetallicRoughness?.baseColorTexture !== undefined));
for (const texture of gltf.textures) assert.ok(gltf.images[texture.source], 'Texture refers to a missing image');
console.log(JSON.stringify({
  bytes: bytes.length, triangles: meshResults.reduce((sum, r) => sum + r.triangles, 0),
  bones: skeletons, skinnedVertices, skinnedPrimitives, frontArtworkVertices, meshes: meshResults,
  loops, embeddedImages: gltf.images.length,
}, null, 2));
