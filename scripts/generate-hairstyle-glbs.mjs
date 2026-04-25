import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hairStyles } from '../src/data/hairStyles.js';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(rootDir, 'public/models/hairstyles');

await mkdir(outputDir, { recursive: true });

for (const style of hairStyles) {
  const glb = buildGlb(style);
  const outputFile = join(outputDir, `${style.id}.glb`);
  await writeFile(outputFile, glb);
  console.log(`wrote ${outputFile} (${Math.round(glb.byteLength / 1024)} KiB)`);
}

function buildGlb(style) {
  const bufferParts = [];
  const bufferViews = [];
  const accessors = [];
  const meshes = [];
  const nodes = [{ name: `${style.id}-root`, children: [] }];
  const materials = createMaterials(style);

  const capPrimitive = createCapPrimitive(style);
  const strandPrimitive = createStrandPrimitive(style, false);
  const highlightPrimitive = createStrandPrimitive(style, true);

  for (const [name, primitive] of [
    ['cap', capPrimitive],
    ['strands', strandPrimitive],
    ['highlights', highlightPrimitive]
  ]) {
    const meshIndex = meshes.length;
    const nodeIndex = nodes.length;
    meshes.push({
      name: `${style.id}-${name}`,
      primitives: [addPrimitive(primitive, bufferParts, bufferViews, accessors)]
    });
    nodes.push({ name: `${style.id}-${name}`, mesh: meshIndex });
    nodes[0].children.push(nodeIndex);
  }

  const binaryBuffer = concatAligned(bufferParts);
  const json = {
    asset: {
      version: '2.0',
      generator: 'opencv-hair-try-on procedural hairstyle generator'
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binaryBuffer.byteLength }]
  };

  return packGlb(json, binaryBuffer);
}

function createMaterials(style) {
  return [
    {
      name: 'cap',
      doubleSided: true,
      pbrMetallicRoughness: {
        baseColorFactor: toFactor(style.material.base, 1),
        metallicFactor: 0,
        roughnessFactor: 0.78
      }
    },
    {
      name: 'strand',
      doubleSided: true,
      pbrMetallicRoughness: {
        baseColorFactor: toFactor(style.material.base, 1),
        metallicFactor: 0,
        roughnessFactor: 0.62
      }
    },
    {
      name: 'highlight',
      doubleSided: true,
      pbrMetallicRoughness: {
        baseColorFactor: toFactor(style.material.highlight, 1),
        metallicFactor: 0,
        roughnessFactor: 0.48
      }
    }
  ];
}

function createCapPrimitive(style) {
  const positions = [];
  const normals = [];
  const indices = [];
  const rings = 10;
  const segments = 30;
  const radiusX = style.volume.width * 0.52;
  const radiusY = style.volume.height * 0.72;
  const radiusZ = style.volume.depth;
  const topY = style.volume.centerY - style.volume.height * 0.58;
  const lowerY = style.volume.lowerY;

  for (let ringIndex = 0; ringIndex <= rings; ringIndex += 1) {
    const ringProgress = ringIndex / rings;
    const y = topY + (lowerY - topY) * ringProgress;
    const profile = Math.sin((0.18 + ringProgress * 0.78) * Math.PI * 0.5);
    const xRadius = radiusX * profile;
    const zRadius = radiusZ * (0.22 + profile * 0.78);

    for (let segmentIndex = 0; segmentIndex <= segments; segmentIndex += 1) {
      const theta = (segmentIndex / segments) * Math.PI * 2;
      const x = Math.cos(theta) * xRadius;
      const z = Math.sin(theta) * zRadius;
      positions.push(x, y, z);
      const normal = normalize([x / radiusX, (y - style.volume.centerY) / radiusY, z / radiusZ]);
      normals.push(...normal);
    }
  }

  const rowSize = segments + 1;
  for (let ringIndex = 0; ringIndex < rings; ringIndex += 1) {
    for (let segmentIndex = 0; segmentIndex < segments; segmentIndex += 1) {
      const first = ringIndex * rowSize + segmentIndex;
      const second = first + rowSize;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    positions,
    normals,
    indices,
    material: 0
  };
}

function createStrandPrimitive(style, highlightOnly) {
  const positions = [];
  const normals = [];
  const indices = [];
  const totalCount = style.strands.count;
  const bangCount = style.strands.bangs;

  for (let index = 0; index < totalCount; index += 1) {
    const tone = hashToUnit(`${style.id}:tone:${index}`);
    if (highlightOnly && tone < 0.64) continue;
    if (!highlightOnly && tone >= 0.92) continue;

    const strand = createStrand(style, index, totalCount, bangCount);
    appendStrandRibbon({
      positions,
      normals,
      indices,
      strand,
      widthScale: highlightOnly ? 0.38 : 1,
      zOffset: highlightOnly ? 0.008 : 0
    });
  }

  return {
    positions,
    normals,
    indices,
    material: highlightOnly ? 2 : 1
  };
}

function createStrand(style, index, totalCount, bangCount) {
  const seed = hashToUnit(`${style.id}:${index}`);
  const row = index % style.strands.rows;
  const rowProgress = row / Math.max(1, style.strands.rows - 1);
  const spreadNoise = hashToUnit(`${style.id}:spread:${index}`) - 0.5;
  const arcProgress = (index + 0.5) / totalCount;
  const side = index % 2 === 0 ? -1 : 1;
  const sideProgress = (arcProgress * 2 - 1) * style.strands.spread + spreadNoise * 0.12;
  const rootX = clamp(sideProgress, -0.96, 0.96) * style.volume.width * 0.5;
  const rootZ = Math.cos(clamp(sideProgress, -0.98, 0.98) * Math.PI * 0.5) * style.volume.depth;
  const rootY =
    style.volume.centerY -
    style.volume.height * (0.28 + rowProgress * 0.28) +
    (seed - 0.5) * 0.08;
  const length =
    style.strands.length *
    (0.68 + rowProgress * 0.42 + hashToUnit(`${style.id}:len:${index}`) * 0.26);
  const isFront = index < bangCount || row === 0;
  const sweep = style.strands.sweep + (hashToUnit(`${style.id}:sweep:${index}`) - 0.5) * 0.18;
  const curl = style.strands.curl * (0.65 + hashToUnit(`${style.id}:curl:${index}`) * 0.7);
  const lift = style.strands.lift * (0.72 + hashToUnit(`${style.id}:lift:${index}`) * 0.44);
  const thickness = style.strands.thickness * (0.72 + hashToUnit(`${style.id}:thick:${index}`) * 0.72);
  const sideBend = side * curl * 0.16;
  const tipY = rootY + length + (isFront ? style.volume.height * 0.08 : style.volume.height * 0.22);

  return {
    thickness,
    points: [
      { x: rootX, y: rootY, z: rootZ },
      {
        x: rootX + sweep * 0.18 + sideBend * 0.3,
        y: rootY + length * 0.22 - lift,
        z: rootZ * 0.72
      },
      {
        x: rootX + sweep * 0.42 + sideBend,
        y: rootY + length * 0.64,
        z: rootZ * 0.42 - Math.abs(curl) * 0.06
      },
      {
        x: rootX + sweep * 0.62 + sideBend * 1.22,
        y: clamp(tipY, -0.42, style.volume.lowerY + length * 0.9),
        z: rootZ * 0.18
      }
    ]
  };
}

function appendStrandRibbon({ positions, normals, indices, strand, widthScale, zOffset }) {
  const sampleCount = 8;
  const baseIndex = positions.length / 3;
  const sampledPoints = [];

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    sampledPoints.push(sampleBezier(strand.points, sampleIndex / (sampleCount - 1)));
  }

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const previous = sampledPoints[Math.max(0, sampleIndex - 1)];
    const next = sampledPoints[Math.min(sampleCount - 1, sampleIndex + 1)];
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const length = Math.hypot(tangentX, tangentY) || 1;
    const normalX = -tangentY / length;
    const normalY = tangentX / length;
    const taper = 1 - sampleIndex / (sampleCount - 1);
    const width = strand.thickness * widthScale * (0.34 + taper * 0.66);
    const point = sampledPoints[sampleIndex];

    positions.push(point.x + normalX * width, point.y + normalY * width, point.z + zOffset);
    positions.push(point.x - normalX * width, point.y - normalY * width, point.z + zOffset);
    normals.push(0, 0, 1, 0, 0, 1);
  }

  for (let sampleIndex = 0; sampleIndex < sampleCount - 1; sampleIndex += 1) {
    const leftA = baseIndex + sampleIndex * 2;
    const rightA = leftA + 1;
    const leftB = leftA + 2;
    const rightB = leftA + 3;
    indices.push(leftA, leftB, rightA);
    indices.push(rightA, leftB, rightB);
  }
}

function sampleBezier(points, t) {
  const inverse = 1 - t;
  const a = inverse ** 3;
  const b = 3 * inverse ** 2 * t;
  const c = 3 * inverse * t ** 2;
  const d = t ** 3;

  return {
    x: points[0].x * a + points[1].x * b + points[2].x * c + points[3].x * d,
    y: points[0].y * a + points[1].y * b + points[2].y * c + points[3].y * d,
    z: points[0].z * a + points[1].z * b + points[2].z * c + points[3].z * d
  };
}

function addPrimitive(primitive, bufferParts, bufferViews, accessors) {
  const positionAccessor = addAccessor({
    array: new Float32Array(primitive.positions),
    type: 'VEC3',
    componentType: 5126,
    target: 34962,
    bufferParts,
    bufferViews,
    accessors,
    minMaxSource: primitive.positions
  });
  const normalAccessor = addAccessor({
    array: new Float32Array(primitive.normals),
    type: 'VEC3',
    componentType: 5126,
    target: 34962,
    bufferParts,
    bufferViews,
    accessors
  });
  const indexAccessor = addAccessor({
    array: new Uint16Array(primitive.indices),
    type: 'SCALAR',
    componentType: 5123,
    target: 34963,
    bufferParts,
    bufferViews,
    accessors
  });

  return {
    attributes: {
      POSITION: positionAccessor,
      NORMAL: normalAccessor
    },
    indices: indexAccessor,
    material: primitive.material
  };
}

function addAccessor({ array, type, componentType, target, bufferParts, bufferViews, accessors, minMaxSource }) {
  const byteOffset = bufferParts.reduce((sum, part) => sum + part.byteLength, 0);
  const alignedOffset = align4(byteOffset);
  if (alignedOffset > byteOffset) {
    bufferParts.push(Buffer.alloc(alignedOffset - byteOffset));
  }

  const buffer = Buffer.from(array.buffer);
  const bufferViewIndex = bufferViews.length;
  bufferViews.push({
    buffer: 0,
    byteOffset: alignedOffset,
    byteLength: buffer.byteLength,
    target
  });
  bufferParts.push(buffer);

  const accessor = {
    bufferView: bufferViewIndex,
    byteOffset: 0,
    componentType,
    count: array.length / componentCount(type),
    type
  };

  if (minMaxSource) {
    const { min, max } = getMinMax(minMaxSource, componentCount(type));
    accessor.min = min;
    accessor.max = max;
  }

  const accessorIndex = accessors.length;
  accessors.push(accessor);
  return accessorIndex;
}

function concatAligned(parts) {
  const totalLength = align4(parts.reduce((sum, part) => sum + part.byteLength, 0));
  const output = Buffer.alloc(totalLength);
  let offset = 0;

  for (const part of parts) {
    part.copy(output, offset);
    offset += part.byteLength;
  }

  return output;
}

function packGlb(json, binaryBuffer) {
  const jsonBuffer = padBuffer(Buffer.from(JSON.stringify(json)), 0x20);
  const binaryChunk = padBuffer(binaryBuffer, 0x00);
  const totalLength = 12 + 8 + jsonBuffer.byteLength + 8 + binaryChunk.byteLength;
  const output = Buffer.alloc(totalLength);
  let offset = 0;

  output.writeUInt32LE(0x46546c67, offset);
  offset += 4;
  output.writeUInt32LE(2, offset);
  offset += 4;
  output.writeUInt32LE(totalLength, offset);
  offset += 4;
  output.writeUInt32LE(jsonBuffer.byteLength, offset);
  offset += 4;
  output.writeUInt32LE(0x4e4f534a, offset);
  offset += 4;
  jsonBuffer.copy(output, offset);
  offset += jsonBuffer.byteLength;
  output.writeUInt32LE(binaryChunk.byteLength, offset);
  offset += 4;
  output.writeUInt32LE(0x004e4942, offset);
  offset += 4;
  binaryChunk.copy(output, offset);

  return output;
}

function padBuffer(buffer, padByte) {
  const paddedLength = align4(buffer.byteLength);
  if (paddedLength === buffer.byteLength) return buffer;
  const output = Buffer.alloc(paddedLength, padByte);
  buffer.copy(output);
  return output;
}

function componentCount(type) {
  return type === 'SCALAR' ? 1 : 3;
}

function getMinMax(values, size) {
  const min = Array.from({ length: size }, () => Number.POSITIVE_INFINITY);
  const max = Array.from({ length: size }, () => Number.NEGATIVE_INFINITY);

  for (let index = 0; index < values.length; index += size) {
    for (let componentIndex = 0; componentIndex < size; componentIndex += 1) {
      const value = values[index + componentIndex];
      min[componentIndex] = Math.min(min[componentIndex], value);
      max[componentIndex] = Math.max(max[componentIndex], value);
    }
  }

  return { min, max };
}

function toFactor(hex, alpha) {
  const color = hexToRgb(hex);
  return [color.red / 255, color.green / 255, color.blue / 255, alpha];
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const number = Number.parseInt(normalized, 16);

  return {
    red: (number >> 16) & 0xff,
    green: (number >> 8) & 0xff,
    blue: number & 0xff
  };
}

function hashToUnit(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function normalize(vector) {
  const length = Math.hypot(...vector) || 1;
  return vector.map((value) => value / length);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function align4(value) {
  return (value + 3) & ~3;
}
