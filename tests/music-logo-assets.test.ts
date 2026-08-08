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
  const distanceFromWarmWhite = Math.hypot(data[offset] - warmWhite[0], data[offset + 1] - warmWhite[1], data[offset + 2] - warmWhite[2]);
  return data[offset + 3] > 20 && distanceFromWarmWhite > 30;
};

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

const distanceFromMask = (mask: Uint8Array, width: number, height: number) => {
  const distances = new Int16Array(width * height);
  distances.fill(-1);
  const queue: number[] = [];
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === 1) {
      distances[index] = 0;
      queue.push(index);
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head];
    const x = index % width;
    const y = Math.floor(index / width);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
      const next = nextY * width + nextX;
      if (distances[next] === -1) {
        distances[next] = distances[index] + 1;
        queue.push(next);
      }
    }
  }
  return distances;
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

const outlineDistanceStats = async (file: string) => {
  const { data, width, height } = await readRawAsset(file);
  const body = new Uint8Array(width * height);
  const outline = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = pixelOffset(x, y, width);
      if (isColoredBody(data, offset)) body[index] = 1;
      if (data[offset + 3] > 20 && data[offset] === warmWhite[0] && data[offset + 1] === warmWhite[1] && data[offset + 2] === warmWhite[2]) outline[index] = 1;
    }
  }

  const bodyDistances = distanceFromMask(body, width, height);
  const outlineDistances = distanceFromMask(outline, width, height);
  const whiteDistances: number[] = [];
  for (let index = 0; index < outline.length; index += 1) {
    if (outline[index] === 1) whiteDistances.push(bodyDistances[index]);
  }
  const boundaryCoverage = [];
  for (let index = 0; index < body.length; index += 1) {
    if (body[index] !== 1) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    const hasNonBodyNeighbor = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => {
      const nextX = x + dx;
      const nextY = y + dy;
      return nextX < 0 || nextX >= width || nextY < 0 || nextY >= height || body[nextY * width + nextX] === 0;
    });
    if (hasNonBodyNeighbor) boundaryCoverage.push(outlineDistances[index]);
  }
  return { whiteDistances, boundaryCoverage };
};

describe('music logo assets', () => {
  it.each(assetNames)('%s has the expected PNG metadata', async (name) => {
    const metadata = await sharp(asset(name)).metadata();
    expect(metadata).toMatchObject({ width: 758, height: 758, hasAlpha: true, channels: 4 });
  });

  it('keeps the independent right branch complete', async () => {
    const { data, width, height } = await readRawAsset(asset('forest-right.png'));
    const body = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (isColoredBody(data, pixelOffset(x, y, width))) body[index] = 1;
      }
    }
    expect(maskBounds(body, width, height)).toEqual({ minX: 439, maxX: 658, minY: 187, maxY: 605, count: 27178 });
  });

  it('places the three teal note bodies at the reference bounds', async () => {
    expect(await tealComponentBounds(asset('notes.png'))).toEqual([
      { minX: 199, maxX: 248, minY: 313, maxY: 379 },
      { minX: 566, maxX: 630, minY: 137, maxY: 218 },
      { minX: 633, maxX: 694, minY: 195, maxY: 278 },
    ]);
  });

  it.each(assetNames)('%s contains a six-pixel warm white outline around its colored body', async (name) => {
    const { whiteDistances, boundaryCoverage } = await outlineDistanceStats(asset(name));
    expect(whiteDistances.length).toBeGreaterThan(0);
    expect(Math.min(...whiteDistances)).toBe(1);
    expect(Math.max(...whiteDistances)).toBe(6);
    for (let distance = 1; distance <= 6; distance += 1) {
      expect(whiteDistances.filter((value) => value === distance).length).toBeGreaterThan(0);
    }
    expect(Math.max(...boundaryCoverage)).toBeLessThanOrEqual(6);
  });
});
