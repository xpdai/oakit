import crypto from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const asset = (name: string) => path.resolve('assets/music-logo', name);

type Pixel = { x: number; y: number };
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
type RawAsset = { data: Buffer; width: number; height: number };

const assetNames = ['forest-left.png', 'forest-right.png', 'bird.png', 'notes.png'] as const;
const warmWhite = [255, 247, 232] as const;

const readRawAsset = async (file: string): Promise<RawAsset> => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
};

const pixelOffset = (x: number, y: number, width: number) => (y * width + x) * 4;

const isColoredBody = (data: Buffer, offset: number) => {
  const isWarmWhite = data[offset] === warmWhite[0] && data[offset + 1] === warmWhite[1] && data[offset + 2] === warmWhite[2];
  return data[offset + 3] > 20 && !isWarmWhite;
};

const coloredBodyMask = (data: Buffer, width: number, height: number) => {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isColoredBody(data, pixelOffset(x, y, width))) mask[y * width + x] = 1;
    }
  }
  return mask;
};

const maskDigest = (mask: Uint8Array) => crypto.createHash('sha256').update(mask).digest('hex');

const maskBounds = (mask: Uint8Array, width: number, height: number): Bounds & { count: number } => {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let count = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) continue;
      count += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, maxX, minY, maxY, count };
};

const tealComponentBounds = async (file: string): Promise<Bounds[]> => {
  const { data, width, height } = await readRawAsset(file);
  const marked = new Uint8Array(width * height);
  const isTeal = (offset: number) => {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const alpha = data[offset + 3];
    return alpha > 20 && green >= red + 15 && blue >= red + 15 && Math.abs(green - blue) <= 30;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (isTeal(index * 4)) marked[index] = 1;
    }
  }

  const components: Bounds[] = [];
  for (let start = 0; start < marked.length; start += 1) {
    if (marked[start] === 0) continue;
    const queue: Pixel[] = [{ x: start % width, y: Math.floor(start / width) }];
    marked[start] = 0;
    let minX = queue[0].x;
    let maxX = queue[0].x;
    let minY = queue[0].y;
    let maxY = queue[0].y;
    let size = 0;

    while (queue.length > 0) {
      const pixel = queue.pop()!;
      size += 1;
      minX = Math.min(minX, pixel.x);
      maxX = Math.max(maxX, pixel.x);
      minY = Math.min(minY, pixel.y);
      maxY = Math.max(maxY, pixel.y);

      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const x = pixel.x + dx;
        const y = pixel.y + dy;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        const index = y * width + x;
        if (marked[index] === 1) {
          marked[index] = 0;
          queue.push({ x, y });
        }
      }
    }

    if (size > 100) components.push({ minX, maxX, minY, maxY });
  }

  return components.sort((a, b) => a.minX - b.minX);
};

const outlineMaskDiff = async (file: string) => {
  const { data, width, height } = await readRawAsset(file);
  const body = coloredBodyMask(data, width, height);
  const expectedOutline = new Uint8Array(width * height);
  const outline = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = pixelOffset(x, y, width);
      if (data[offset + 3] > 20 && data[offset] === warmWhite[0] && data[offset + 1] === warmWhite[1] && data[offset + 2] === warmWhite[2]) outline[index] = 1;
      if (body[index] === 1) {
        for (let dy = -6; dy <= 6; dy += 1) {
          for (let dx = -6; dx <= 6; dx += 1) {
            const nextX = x + dx;
            const nextY = y + dy;
            if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
              const next = nextY * width + nextX;
              if (body[next] === 0) expectedOutline[next] = 1;
            }
          }
        }
      }
    }
  }

  let missing = 0;
  let extra = 0;
  for (let index = 0; index < outline.length; index += 1) {
    if (expectedOutline[index] === 1 && outline[index] === 0) missing += 1;
    if (expectedOutline[index] === 0 && outline[index] === 1) extra += 1;
  }
  return { missing, extra, expectedCount: expectedOutline.reduce((sum, value) => sum + value, 0), actualCount: outline.reduce((sum, value) => sum + value, 0) };
};

describe('music logo assets', () => {
  it.each(assetNames)('%s has the expected PNG metadata', async (name) => {
    const metadata = await sharp(asset(name)).metadata();
    expect(metadata).toMatchObject({ width: 758, height: 758, hasAlpha: true, channels: 4 });
  });

  it('keeps the independent right branch complete', async () => {
    const { data, width, height } = await readRawAsset(asset('forest-right.png'));
    const body = coloredBodyMask(data, width, height);
    expect(maskBounds(body, width, height)).toEqual({ minX: 439, maxX: 658, minY: 187, maxY: 605, count: 27178 });
    expect(maskDigest(body)).toBe('d251a1760d08d768b8f118257319744f90e77257f7851d7ca15e0455465acfdd');
  });

  it('places the three teal note bodies at the reference bounds', async () => {
    expect(await tealComponentBounds(asset('notes.png'))).toEqual([
      { minX: 199, maxX: 248, minY: 313, maxY: 379 },
      { minX: 566, maxX: 630, minY: 137, maxY: 218 },
      { minX: 633, maxX: 694, minY: 195, maxY: 278 },
    ]);
  });

  it.each(assetNames)('%s contains a six-pixel warm white outline around its colored body', async (name) => {
    const { missing, extra, expectedCount, actualCount } = await outlineMaskDiff(asset(name));
    expect(expectedCount).toBeGreaterThan(0);
    expect(actualCount).toBe(expectedCount);
    expect(missing).toBe(0);
    expect(extra).toBe(0);
  });
});
