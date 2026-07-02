import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const output = fileURLToPath(new URL('../public/models/action-6-inspired/action-6-inspired-study.glb', import.meta.url))

const materials = [
  material('soft graphite body', [0.035, 0.039, 0.043, 1], 0.72, 0.42),
  material('matte black rubber', [0.006, 0.007, 0.008, 1], 0.9, 0.2),
  material('glossy lens glass', [0.04, 0.12, 0.18, 0.72], 0.05, 0.88, true),
  material('screen black glass', [0.002, 0.006, 0.011, 1], 0.08, 0.72),
  material('record button red', [0.95, 0.08, 0.055, 1], 0.35, 0.2),
  material('dark gray trim', [0.12, 0.13, 0.14, 1], 0.62, 0.18),
  material('mount graphite', [0.055, 0.058, 0.062, 1], 0.76, 0.22),
  material('watermark texture', [1, 1, 1, 1], 0.55, 0.1, false, 0),
  material('blue display accent', [0.03, 0.34, 0.72, 1], 0.28, 0.5),
]

const meshes = []
meshes.push(roundedBox('rounded square action camera body', 7.28, 4.72, 3.31, 0.55, 18, 0))
meshes.push(roundedBox('front rubber faceplate', 6.8, 4.28, 0.18, 0.42, 18, 1, [0, 0, 1.75]))
meshes.push(cylinder('outer lens protective ring', 1.16, 0.42, 96, 1, [-1.85, 0.32, 2.02]))
meshes.push(cylinder('knurled lens bevel ring', 0.96, 0.2, 96, 5, [-1.85, 0.32, 2.32]))
meshes.push(cylinder('concave dark inner lens', 0.76, 0.18, 96, 1, [-1.85, 0.32, 2.52]))
meshes.push(cylinder('blue tinted glass element', 0.58, 0.08, 96, 2, [-1.85, 0.32, 2.66]))
meshes.push(cylinder('small central aperture', 0.22, 0.04, 64, 1, [-1.85, 0.32, 2.74]))
meshes.push(roundedBox('front status display glass', 2.12, 1.52, 0.12, 0.15, 12, 3, [1.58, 0.48, 2.05]))
meshes.push(roundedBox('display blue reflection strip', 1.72, 0.18, 0.05, 0.04, 8, 8, [1.58, 0.94, 2.14]))
meshes.push(roundedBox('top red record button', 1.24, 0.22, 0.5, 0.1, 10, 4, [1.6, 2.48, 0.45]))
meshes.push(roundedBox('top dark mode button', 0.82, 0.18, 0.45, 0.08, 10, 5, [-1.62, 2.48, 0.28]))
meshes.push(roundedBox('left waterproof door outline', 0.16, 2.2, 1.36, 0.06, 8, 5, [-3.72, -0.2, 0.2]))
meshes.push(roundedBox('right quick release cover', 0.16, 1.72, 1.2, 0.06, 8, 5, [3.72, -0.25, 0.35]))
meshes.push(roundedBox('bottom magnetic mount left rail', 1.44, 0.34, 0.56, 0.08, 8, 6, [-0.9, -2.56, 0.12]))
meshes.push(roundedBox('bottom magnetic mount right rail', 1.44, 0.34, 0.56, 0.08, 8, 6, [0.9, -2.56, 0.12]))
meshes.push(roundedBox('bottom center latch notch', 0.66, 0.28, 0.42, 0.06, 8, 1, [0, -2.62, 0.48]))
meshes.push(roundedBox('front study watermark plaque', 2.25, 0.58, 0.04, 0.05, 8, 7, [1.55, -1.36, 2.16], true))
meshes.push(roundedBox('diagonal originality mark one', 0.12, 3.8, 0.05, 0.02, 4, 5, [-3.02, -0.12, 2.2], false, Math.PI / 8))
meshes.push(roundedBox('diagonal originality mark two', 0.12, 3.8, 0.05, 0.02, 4, 5, [3.02, -0.12, 2.2], false, -Math.PI / 8))

function material(name, baseColorFactor, roughnessFactor, metallicFactor, blend = false, texture = undefined) {
  const mat = {
    name,
    pbrMetallicRoughness: {
      baseColorFactor,
      metallicFactor,
      roughnessFactor,
    },
  }
  if (texture !== undefined) mat.pbrMetallicRoughness.baseColorTexture = { index: texture }
  if (blend) {
    mat.alphaMode = 'BLEND'
    mat.doubleSided = true
  }
  return mat
}

function roundedBox(name, width, height, depth, radius, segments, materialIndex, offset = [0, 0, 0], uv = false, rotation = 0) {
  const perimeter = roundedRect(width, height, radius, segments).map(([x, y]) => rotate2(x, y, rotation))
  const frontZ = depth / 2
  const backZ = -depth / 2
  const positions = []
  const normals = []
  const uvs = []
  const indices = []

  const add = (x, y, z, nx, ny, nz, u = 0, v = 0) => {
    positions.push(x + offset[0], y + offset[1], z + offset[2])
    normals.push(nx, ny, nz)
    if (uv) uvs.push(u, v)
    return positions.length / 3 - 1
  }

  const frontCenter = add(offsetless(0, 0, rotation)[0], offsetless(0, 0, rotation)[1], frontZ, 0, 0, 1, 0.5, 0.5)
  const front = perimeter.map(([x, y]) => add(x, y, frontZ, 0, 0, 1, x / width + 0.5, 0.5 - y / height))
  for (let i = 0; i < front.length; i += 1) indices.push(frontCenter, front[i], front[(i + 1) % front.length])

  const backCenter = add(0, 0, backZ, 0, 0, -1, 0.5, 0.5)
  const back = perimeter.map(([x, y]) => add(x, y, backZ, 0, 0, -1, x / width + 0.5, 0.5 - y / height))
  for (let i = 0; i < back.length; i += 1) indices.push(backCenter, back[(i + 1) % back.length], back[i])

  for (let i = 0; i < perimeter.length; i += 1) {
    const [x1, y1] = perimeter[i]
    const [x2, y2] = perimeter[(i + 1) % perimeter.length]
    const nx = y2 - y1
    const ny = -(x2 - x1)
    const len = Math.hypot(nx, ny) || 1
    const n = [nx / len, ny / len, 0]
    const a = add(x1, y1, frontZ, ...n)
    const b = add(x2, y2, frontZ, ...n)
    const c = add(x2, y2, backZ, ...n)
    const d = add(x1, y1, backZ, ...n)
    indices.push(a, b, c, a, c, d)
  }

  return mesh(name, positions, normals, indices, materialIndex, uv ? uvs : undefined)
}

function offsetless(x, y, rotation) {
  return rotate2(x, y, rotation)
}

function cylinder(name, radius, depth, segments, materialIndex, offset = [0, 0, 0]) {
  const positions = []
  const normals = []
  const indices = []
  const frontZ = depth / 2
  const backZ = -depth / 2
  const add = (x, y, z, nx, ny, nz) => {
    positions.push(x + offset[0], y + offset[1], z + offset[2])
    normals.push(nx, ny, nz)
    return positions.length / 3 - 1
  }
  const fc = add(0, 0, frontZ, 0, 0, 1)
  const bc = add(0, 0, backZ, 0, 0, -1)
  const front = []
  const back = []
  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * Math.PI * 2
    const x = Math.cos(a) * radius
    const y = Math.sin(a) * radius
    front.push(add(x, y, frontZ, 0, 0, 1))
    back.push(add(x, y, backZ, 0, 0, -1))
  }
  for (let i = 0; i < segments; i += 1) {
    const n = (i + 1) % segments
    indices.push(fc, front[i], front[n])
    indices.push(bc, back[n], back[i])
    const a = (i / segments) * Math.PI * 2
    const b = (n / segments) * Math.PI * 2
    const x1 = Math.cos(a) * radius
    const y1 = Math.sin(a) * radius
    const x2 = Math.cos(b) * radius
    const y2 = Math.sin(b) * radius
    const p1 = add(x1, y1, frontZ, Math.cos(a), Math.sin(a), 0)
    const p2 = add(x2, y2, frontZ, Math.cos(b), Math.sin(b), 0)
    const p3 = add(x2, y2, backZ, Math.cos(b), Math.sin(b), 0)
    const p4 = add(x1, y1, backZ, Math.cos(a), Math.sin(a), 0)
    indices.push(p1, p2, p3, p1, p3, p4)
  }
  return mesh(name, positions, normals, indices, materialIndex)
}

function roundedRect(width, height, radius, segments) {
  const pts = []
  const hw = width / 2 - radius
  const hh = height / 2 - radius
  const corners = [
    [hw, hh, 0],
    [-hw, hh, Math.PI / 2],
    [-hw, -hh, Math.PI],
    [hw, -hh, (Math.PI * 3) / 2],
  ]
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= segments; i += 1) {
      const a = start + (i / segments) * Math.PI / 2
      pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius])
    }
  }
  return pts
}

function rotate2(x, y, a) {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [x * c - y * s, x * s + y * c]
}

function mesh(name, positions, normals, indices, materialIndex, uvs) {
  return { name, positions, normals, indices, materialIndex, uvs }
}

function buildGlb(sourceMeshes, sourceMaterials, imagePng) {
  const json = {
    asset: { version: '2.0', generator: 'ai-website action-6-inspired teaching model' },
    scene: 0,
    scenes: [{ nodes: sourceMeshes.map((_, i) => i) }],
    nodes: sourceMeshes.map((m, i) => ({ name: m.name, mesh: i })),
    meshes: [],
    materials: sourceMaterials,
    buffers: [{ byteLength: 0 }],
    bufferViews: [],
    accessors: [],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    images: [{ mimeType: 'image/png', bufferView: 0 }],
    textures: [{ sampler: 0, source: 0 }],
  }
  const chunks = []
  const addBufferView = (typed, target) => {
    const buffer = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength)
    const padding = (4 - (buffer.length % 4)) % 4
    const offset = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    chunks.push(buffer, Buffer.alloc(padding))
    const view = { buffer: 0, byteOffset: offset, byteLength: buffer.length }
    if (target) view.target = target
    json.bufferViews.push(view)
    return json.bufferViews.length - 1
  }
  const addAccessor = (typed, componentType, type, target, minMaxSource) => {
    const bufferView = addBufferView(typed, target)
    const accessor = {
      bufferView,
      componentType,
      count: typed.length / componentCount(type),
      type,
    }
    if (minMaxSource) {
      const { min, max } = minMax(minMaxSource, componentCount(type))
      accessor.min = min
      accessor.max = max
    }
    json.accessors.push(accessor)
    return json.accessors.length - 1
  }

  const imageView = addBufferView(new Uint8Array(imagePng), undefined)
  json.images[0].bufferView = imageView

  for (const source of sourceMeshes) {
    const positionAccessor = addAccessor(new Float32Array(source.positions), 5126, 'VEC3', 34962, source.positions)
    const normalAccessor = addAccessor(new Float32Array(source.normals), 5126, 'VEC3', 34962)
    const indexAccessor = addAccessor(new Uint16Array(source.indices), 5123, 'SCALAR', 34963)
    const attributes = { POSITION: positionAccessor, NORMAL: normalAccessor }
    if (source.uvs) attributes.TEXCOORD_0 = addAccessor(new Float32Array(source.uvs), 5126, 'VEC2', 34962)
    json.meshes.push({
      name: source.name,
      primitives: [{ attributes, indices: indexAccessor, material: source.materialIndex }],
    })
  }

  const bin = Buffer.concat(chunks)
  json.buffers[0].byteLength = bin.length
  const jsonBuffer = Buffer.from(JSON.stringify(json))
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4
  const binPadding = (4 - (bin.length % 4)) % 4
  const totalLength = 12 + 8 + jsonBuffer.length + jsonPadding + 8 + bin.length + binPadding
  const out = Buffer.alloc(totalLength)
  let offset = 0
  out.writeUInt32LE(0x46546c67, offset)
  offset += 4
  out.writeUInt32LE(2, offset)
  offset += 4
  out.writeUInt32LE(totalLength, offset)
  offset += 4
  out.writeUInt32LE(jsonBuffer.length + jsonPadding, offset)
  offset += 4
  out.writeUInt32LE(0x4e4f534a, offset)
  offset += 4
  jsonBuffer.copy(out, offset)
  offset += jsonBuffer.length
  out.fill(0x20, offset, offset + jsonPadding)
  offset += jsonPadding
  out.writeUInt32LE(bin.length + binPadding, offset)
  offset += 4
  out.writeUInt32LE(0x004e4942, offset)
  offset += 4
  bin.copy(out, offset)
  return out
}

function componentCount(type) {
  return { SCALAR: 1, VEC2: 2, VEC3: 3 }[type]
}

function minMax(values, stride) {
  const min = Array(stride).fill(Infinity)
  const max = Array(stride).fill(-Infinity)
  for (let i = 0; i < values.length; i += stride) {
    for (let j = 0; j < stride; j += 1) {
      min[j] = Math.min(min[j], values[i + j])
      max[j] = Math.max(max[j], values[i + j])
    }
  }
  return { min, max }
}

function makeWatermarkPng(width, height) {
  const pixels = Buffer.alloc(width * height * 4, 0)
  fillRect(pixels, width, height, 0, 0, width, height, [26, 30, 34, 245])
  drawText(pixels, width, height, 32, 26, 'STUDY MODEL', 8, [255, 255, 255, 255])
  drawText(pixels, width, height, 34, 82, 'NOT DJI', 6, [136, 202, 255, 255])
  for (let x = 0; x < width; x += 24) {
    fillRect(pixels, width, height, x, 0, 6, height, [255, 255, 255, 22])
  }
  const rawRows = []
  for (let y = 0; y < height; y += 1) {
    rawRows.push(Buffer.from([0]))
    rawRows.push(pixels.subarray(y * width * 4, (y + 1) * width * 4))
  }
  const raw = Buffer.concat(rawRows)
  const chunks = [
    pngChunk('IHDR', Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])])),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks])
}

function drawText(pixels, width, height, x, y, text, scale, color) {
  let cursor = x
  for (const char of text) {
    const glyph = FONT[char] ?? FONT[' ']
    for (let gy = 0; gy < glyph.length; gy += 1) {
      for (let gx = 0; gx < glyph[gy].length; gx += 1) {
        if (glyph[gy][gx] === '1') fillRect(pixels, width, height, cursor + gx * scale, y + gy * scale, scale - 1, scale - 1, color)
      }
    }
    cursor += 6 * scale
  }
}

function fillRect(pixels, width, height, x, y, w, h, color) {
  for (let yy = Math.max(0, y); yy < Math.min(height, y + h); yy += 1) {
    for (let xx = Math.max(0, x); xx < Math.min(width, x + w); xx += 1) {
      const i = (yy * width + xx) * 4
      pixels[i] = color[0]
      pixels[i + 1] = color[1]
      pixels[i + 2] = color[2]
      pixels[i + 3] = color[3]
    }
  }
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type)
  return Buffer.concat([u32(data.length), typeBuffer, data, u32(crc32(Buffer.concat([typeBuffer, data])))])
}

function u32(value) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32BE(value >>> 0)
  return buffer
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

const FONT = {
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
}

const png = makeWatermarkPng(512, 128)
const glb = buildGlb(meshes, materials, png)

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, glb)
console.log(output)
