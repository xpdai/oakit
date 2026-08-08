import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SIZE = 758;
const OUTLINE = { radius: 6, rgb: [255, 247, 232] };
const INNER_RING = { centerX: 379, centerY: 363, radius: 204 };
const NOTE_TARGETS = [
  { left: 62, top: 166, width: 50, height: 68 },
  { left: 565, top: 44, width: 65, height: 82 },
  { left: 666, top: 176, width: 62, height: 84 },
];

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const assetsDirectory = path.resolve(scriptDirectory, '../assets/music-logo');
const sourceDirectory = path.join(assetsDirectory, 'source');

const assetPath = (name) => path.join(assetsDirectory, name);
const sourcePath = (name) => path.join(sourceDirectory, name);

function dilateAlpha(data, width, height, radius) {
  const horizontal = new Uint8Array(width * height);
  const dilated = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let maximum = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleX = x + offset;
        if (sampleX >= 0 && sampleX < width) {
          const alpha = data[(y * width + sampleX) * 4 + 3];
          maximum = Math.max(maximum, alpha);
        }
      }
      horizontal[y * width + x] = maximum;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let maximum = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleY = y + offset;
        if (sampleY >= 0 && sampleY < height) maximum = Math.max(maximum, horizontal[sampleY * width + x]);
      }
      dilated[y * width + x] = maximum;
    }
  }

  return dilated;
}

function paintOutlineUnderOriginal(data, dilated, info, color) {
  const outlined = Buffer.alloc(data.length);
  for (let index = 0; index < info.width * info.height; index += 1) {
    const offset = index * 4;
    if (data[offset + 3] > 0) {
      data.copy(outlined, offset, offset, offset + 4);
    } else if (dilated[index] > 0) {
      outlined[offset] = color[0];
      outlined[offset + 1] = color[1];
      outlined[offset + 2] = color[2];
      outlined[offset + 3] = dilated[index];
    }
  }
  return outlined;
}

export async function addOutline(input, radius = OUTLINE.radius, color = OUTLINE.rgb) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const dilated = dilateAlpha(data, info.width, info.height, radius);
  const outlined = paintOutlineUnderOriginal(data, dilated, info, color);
  return sharp(outlined, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

export async function clearRingInterior(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (Math.hypot(x - INNER_RING.centerX, y - INNER_RING.centerY) < INNER_RING.radius) {
        data[(y * info.width + x) * 4 + 3] = 0;
      }
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

function alphaComponents(data, width, height) {
  const marked = new Uint8Array(width * height);
  for (let index = 0; index < marked.length; index += 1) marked[index] = data[index * 4 + 3] > 20 ? 1 : 0;

  const components = [];
  for (let start = 0; start < marked.length; start += 1) {
    if (marked[start] === 0) continue;
    const queue = [start];
    marked[start] = 0;
    let head = 0;
    let minX = start % width;
    let maxX = minX;
    let minY = Math.floor(start / width);
    let maxY = minY;
    let size = 0;

    while (head < queue.length) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      size += 1;

      for (const [deltaX, deltaY] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const neighborX = x + deltaX;
        const neighborY = y + deltaY;
        if (neighborX < 0 || neighborX >= width || neighborY < 0 || neighborY >= height) continue;
        const neighbor = neighborY * width + neighborX;
        if (marked[neighbor] === 1) {
          marked[neighbor] = 0;
          queue.push(neighbor);
        }
      }
    }

    if (size > 100) components.push({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
  }
  return components.sort((first, second) => first.left - second.left);
}

export async function placeNotes(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const components = alphaComponents(data, info.width, info.height);
  if (components.length !== NOTE_TARGETS.length) throw new Error(`Expected ${NOTE_TARGETS.length} note components, found ${components.length}`);

  const notes = await Promise.all(components.map(async (component, index) => {
    const target = NOTE_TARGETS[index];
    const image = await sharp(input)
      .extract(component)
      .resize(target.width, target.height, { kernel: 'nearest' })
      .png()
      .toBuffer();
    return { input: image, left: target.left, top: target.top };
  }));

  const placed = await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(notes).png().toBuffer();
  return addOutline(placed);
}

export async function buildCombined(layers) {
  const orderedLayers = [layers.forestRight, layers.ring, layers.microphone, layers.bird, layers.forestLeft, layers.notes]
    .map((input) => ({ input, left: 0, top: 0 }));
  return sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(orderedLayers).png().toBuffer();
}

export async function generateMusicLogoAssets() {
  const [forestLeft, forestRight, bird, notes, ring] = await Promise.all([
    addOutline(sourcePath('forest-left.png')),
    addOutline(sourcePath('forest-right.png')),
    addOutline(sourcePath('bird.png')),
    placeNotes(sourcePath('notes.png')),
    clearRingInterior(sourcePath('ring.png')),
  ]);
  const combined = await buildCombined({
    ring,
    microphone: assetPath('microphone.png'),
    bird,
    forestLeft,
    forestRight,
    notes,
  });

  await Promise.all([
    sharp(forestLeft).toFile(assetPath('forest-left.png')),
    sharp(forestRight).toFile(assetPath('forest-right.png')),
    sharp(bird).toFile(assetPath('bird.png')),
    sharp(notes).toFile(assetPath('notes.png')),
    sharp(ring).toFile(assetPath('ring.png')),
    sharp(combined).toFile(assetPath('combined.png')),
  ]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await generateMusicLogoAssets();
