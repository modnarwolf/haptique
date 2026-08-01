import { FloatType } from "three";

const DEFAULT_RESET_WAVE_AMPLITUDE = 0.14;
const TWO_PI = Math.PI * 2;
const EXR_MAGIC = [0x76, 0x2f, 0x31, 0x01];

export function seededRandom(seed) {
  let value = (seed += 0x6d2b79f5);
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export function applySeededClothVariation(positions, previous, seed, options = {}) {
  const normalizedSeed = Math.max(1, Math.round(Number(seed) || 1));
  const vertexCount = Math.min(positions.length, previous.length) / 3;
  const columns = Math.max(2, Math.round(options.columns || Math.sqrt(vertexCount)));
  const rows = Math.max(2, Math.round(options.rows || vertexCount / columns));
  const amplitude = Math.max(0, Number(options.amplitude) || DEFAULT_RESET_WAVE_AMPLITUDE);
  const angle = seededRandom(normalizedSeed * 11) * TWO_PI;
  const phaseA = seededRandom(normalizedSeed * 17) * TWO_PI;
  const phaseB = seededRandom(normalizedSeed * 23) * TWO_PI;
  const frequencyA = 1.25 + seededRandom(normalizedSeed * 29) * 2.5;
  const frequencyB = 0.75 + seededRandom(normalizedSeed * 31) * 1.75;
  const directionAX = Math.cos(angle);
  const directionAY = Math.sin(angle);
  const directionBX = -directionAY;
  const directionBY = directionAX;

  for (let index = 0; index < vertexCount; index++) {
    const offset = index * 3;
    const column = index % columns;
    const row = Math.floor(index / columns);
    const u = column / Math.max(1, columns - 1);
    const v = row / Math.max(1, rows - 1);
    const centeredU = u - 0.5;
    const centeredV = v - 0.5;
    const alongA = centeredU * directionAX + centeredV * directionAY;
    const alongB = centeredU * directionBX + centeredV * directionBY;
    const edgeEnvelope = 0.45 + 0.55 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
    const primaryWave = Math.sin(TWO_PI * frequencyA * alongA + phaseA);
    const crossWave = Math.sin(TWO_PI * frequencyB * alongB + phaseB);
    const fineVariation = seededRandom(normalizedSeed * 3000 + index) - 0.5;
    const x = amplitude * 0.035 * crossWave;
    const y = amplitude * 0.025 * primaryWave;
    const z =
      amplitude * edgeEnvelope * (primaryWave * 0.72 + crossWave * 0.28) +
      amplitude * 0.035 * fineVariation;

    positions[offset] += x;
    positions[offset + 1] += y;
    positions[offset + 2] += z;
    previous[offset] += x;
    previous[offset + 1] += y;
    previous[offset + 2] += z;
  }
}

export function normalizeSubdivision(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(96, Math.max(16, Math.round(numericValue / 4) * 4));
}

export class OceanWaveField {
  constructor() {
    this.elapsed = 0;
    this.normalScratch = new Float32Array(0);
    this.forceScratch = new Float32Array(0);
  }

  reset() {
    this.elapsed = 0;
  }

  ensureCapacity(vertexCount) {
    if (this.forceScratch.length < vertexCount) {
      this.forceScratch = new Float32Array(vertexCount);
      this.normalScratch = new Float32Array(vertexCount * 3);
    }
  }

  apply(positions, columns, rows, deltaTime, settings) {
    if (!settings?.oceanMotion) return;
    const strength = Math.max(0, Number(settings.oceanStrength) || 0);
    if (strength === 0) return;

    const vertexCount = Math.min(positions.length / 3, columns * rows);
    if (vertexCount < 1) return;
    this.ensureCapacity(vertexCount);
    this.elapsed += deltaTime;

    const seed = Math.max(1, Math.round(Number(settings.seed) || 1));
    const speed = Math.max(0.01, Number(settings.oceanSpeed) || 0.22);
    const scale = Math.max(0.01, Number(settings.oceanScale) || 1.15);
    const complexity = Math.min(1, Math.max(0, Number(settings.oceanComplexity) || 0));
    const angle = ((Number(settings.oceanDirection) || 0) * Math.PI) / 180;
    const directionAX = Math.cos(angle);
    const directionAY = Math.sin(angle);
    const secondAngle = angle + 1.13;
    const directionBX = Math.cos(secondAngle);
    const directionBY = Math.sin(secondAngle);
    const phaseA = seededRandom(seed * 41) * TWO_PI;
    const phaseB = seededRandom(seed * 43) * TWO_PI;
    const phaseC = seededRandom(seed * 47) * TWO_PI;
    const timePhase = this.elapsed * speed * TWO_PI;
    const forces = this.forceScratch;
    let forceTotal = 0;

    for (let index = 0; index < vertexCount; index++) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const u = column / Math.max(1, columns - 1);
      const v = row / Math.max(1, rows - 1);
      const centeredU = u - 0.5;
      const centeredV = v - 0.5;
      const alongA = centeredU * directionAX + centeredV * directionAY;
      const alongB = centeredU * directionBX + centeredV * directionBY;
      const primary = Math.sin(TWO_PI * scale * alongA - timePhase + phaseA);
      const secondary = Math.sin(TWO_PI * scale * 1.7 * alongB - timePhase * 1.31 + phaseB);
      const swell = Math.sin(
        TWO_PI * scale * 0.55 * (centeredU * 0.3 + centeredV) - timePhase * 0.53 + phaseC,
      );
      const edgeEnvelope = 0.4 + 0.6 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
      const normalization = 1 + complexity * 0.3;
      const force =
        (primary * (1 - complexity * 0.45) +
          secondary * complexity * 0.55 +
          swell * complexity * 0.2) /
        normalization;
      forces[index] = force * edgeEnvelope;
      forceTotal += forces[index];
    }

    const meanForce = forceTotal / vertexCount;
    const normals = this.normalScratch;
    for (let index = 0; index < vertexCount; index++) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const left = (row * columns + Math.max(0, column - 1)) * 3;
      const right = (row * columns + Math.min(columns - 1, column + 1)) * 3;
      const up = (Math.max(0, row - 1) * columns + column) * 3;
      const down = (Math.min(rows - 1, row + 1) * columns + column) * 3;
      const tangentUX = positions[right] - positions[left];
      const tangentUY = positions[right + 1] - positions[left + 1];
      const tangentUZ = positions[right + 2] - positions[left + 2];
      const tangentVX = positions[down] - positions[up];
      const tangentVY = positions[down + 1] - positions[up + 1];
      const tangentVZ = positions[down + 2] - positions[up + 2];
      let normalX = tangentUY * tangentVZ - tangentUZ * tangentVY;
      let normalY = tangentUZ * tangentVX - tangentUX * tangentVZ;
      let normalZ = tangentUX * tangentVY - tangentUY * tangentVX;
      const normalLength = Math.hypot(normalX, normalY, normalZ);
      if (normalLength > 1e-9) {
        normalX /= normalLength;
        normalY /= normalLength;
        normalZ /= normalLength;
      } else {
        normalX = 0;
        normalY = 0;
        normalZ = 1;
      }
      const offset = index * 3;
      normals[offset] = normalX;
      normals[offset + 1] = normalY;
      normals[offset + 2] = normalZ;
    }

    const accelerationScale = strength * deltaTime * deltaTime;
    for (let index = 0; index < vertexCount; index++) {
      const offset = index * 3;
      const acceleration = (forces[index] - meanForce) * accelerationScale;
      positions[offset] += normals[offset] * acceleration;
      positions[offset + 1] += normals[offset + 1] * acceleration;
      positions[offset + 2] += normals[offset + 2] * acceleration;
    }
  }
}

function readAsciiLine(bytes, cursor) {
  const start = cursor.offset;
  while (cursor.offset < bytes.length && bytes[cursor.offset] !== 10) cursor.offset++;
  const end = cursor.offset;
  if (cursor.offset < bytes.length) cursor.offset++;
  const line = new TextDecoder("ascii").decode(bytes.subarray(start, end));
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}

function decodeScanline(bytes, cursor, width) {
  if (cursor.offset + 4 > bytes.length) throw new Error("Unexpected end of HDR pixel data.");
  const marker0 = bytes[cursor.offset++];
  const marker1 = bytes[cursor.offset++];
  const marker2 = bytes[cursor.offset++];
  const marker3 = bytes[cursor.offset++];
  const encodedWidth = (marker2 << 8) | marker3;
  if (marker0 !== 2 || marker1 !== 2 || encodedWidth !== width) {
    throw new Error("Unsupported legacy HDR scanline encoding.");
  }

  const scanline = new Uint8Array(width * 4);
  for (let channel = 0; channel < 4; channel++) {
    let column = 0;
    while (column < width) {
      if (cursor.offset >= bytes.length) throw new Error("Unexpected end of HDR RLE data.");
      const code = bytes[cursor.offset++];
      if (code > 128) {
        const count = code - 128;
        if (count === 0 || column + count > width || cursor.offset >= bytes.length) {
          throw new Error("Invalid HDR RLE run.");
        }
        const value = bytes[cursor.offset++];
        scanline.fill(value, channel * width + column, channel * width + column + count);
        column += count;
      } else {
        const count = code;
        if (count === 0 || column + count > width || cursor.offset + count > bytes.length) {
          throw new Error("Invalid HDR RLE literal.");
        }
        scanline.set(bytes.subarray(cursor.offset, cursor.offset + count), channel * width + column);
        cursor.offset += count;
        column += count;
      }
    }
  }
  return scanline;
}

export function decodeRadianceHDR(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const cursor = { offset: 0 };
  const signature = readAsciiLine(bytes, cursor);
  if (!signature.startsWith("#?")) throw new Error("The selected file is not a Radiance HDR image.");

  let format = "";
  for (;;) {
    const line = readAsciiLine(bytes, cursor);
    if (!line) break;
    if (line.startsWith("FORMAT=")) format = line.slice(7);
  }
  if (format && format !== "32-bit_rle_rgbe") {
    throw new Error(`Unsupported HDR encoding: ${format}.`);
  }

  const resolution = readAsciiLine(bytes, cursor);
  const match = /^([+-])Y\s+(\d+)\s+([+-])X\s+(\d+)$/.exec(resolution);
  if (!match) throw new Error("Unsupported HDR resolution layout.");
  const [, yDirection, heightText, xDirection, widthText] = match;
  const width = Number(widthText);
  const height = Number(heightText);
  if (width < 8 || width > 32767 || height < 1) {
    throw new Error("Unsupported HDR dimensions.");
  }

  const data = new Float32Array(width * height * 4);
  for (let sourceY = 0; sourceY < height; sourceY++) {
    const scanline = decodeScanline(bytes, cursor, width);
    const targetY = yDirection === "-" ? height - 1 - sourceY : sourceY;
    for (let sourceX = 0; sourceX < width; sourceX++) {
      const targetX = xDirection === "+" ? sourceX : width - 1 - sourceX;
      const exponent = scanline[3 * width + sourceX];
      const scale = exponent === 0 ? 0 : Math.pow(2, exponent - 136);
      const target = (targetY * width + targetX) * 4;
      data[target] = scanline[sourceX] * scale;
      data[target + 1] = scanline[width + sourceX] * scale;
      data[target + 2] = scanline[2 * width + sourceX] * scale;
      data[target + 3] = 1;
    }
  }
  return { kind: "hdr", data, width, height };
}

export async function decodeOpenEXR(arrayBuffer) {
  const { EXRLoader } = await import("three/addons/loaders/EXRLoader.js");
  const loader = new EXRLoader().setDataType(FloatType);
  const { data, width, height } = loader.parse(arrayBuffer);
  if (!(data instanceof Float32Array) || !width || !height) {
    throw new Error("The selected file is not a supported OpenEXR image.");
  }
  return { kind: "exr", data, width, height };
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ kind: "image", image });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected environment image could not be decoded."));
    };
    image.src = objectUrl;
  });
}

export async function readEnvironmentFile(file) {
  if (!file) throw new Error("No environment file was selected.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();
  const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const isRadiance = signature[0] === 0x23 && signature[1] === 0x3f;
  const isOpenEXR = EXR_MAGIC.every((value, index) => signature[index] === value);

  if (extension === "hdr" || mimeType === "image/vnd.radiance" || isRadiance) {
    return decodeRadianceHDR(await file.arrayBuffer());
  }
  if (
    extension === "exr" ||
    mimeType === "image/x-exr" ||
    mimeType === "image/exr" ||
    mimeType === "application/exr" ||
    isOpenEXR
  ) {
    return decodeOpenEXR(await file.arrayBuffer());
  }
  return readImageFile(file);
}
