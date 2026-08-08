import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const asset = (name: string) => path.resolve('assets/music-logo', name);

type Pixel = { x: number; y: number };
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

const tealComponentBounds = async (file: string): Promise<Bounds[]> => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const marked = new Uint8Array(info.width * info.height);
  const isTeal = (offset: number) => {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const alpha = data[offset + 3];
    return alpha > 20 && green >= red + 15 && blue >= red + 15 && Math.abs(green - blue) <= 30;
  };

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = y * info.width + x;
      if (isTeal(index * 4)) marked[index] = 1;
    }
  }

  const components: Bounds[] = [];
  for (let start = 0; start < marked.length; start += 1) {
    if (marked[start] === 0) continue;
    const queue: Pixel[] = [{ x: start % info.width, y: Math.floor(start / info.width) }];
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
        if (x < 0 || x >= info.width || y < 0 || y >= info.height) continue;
        const index = y * info.width + x;
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

const countExactColor = async (file: string, [red, green, blue]: [number, number, number]) => {
  const data = await sharp(file).ensureAlpha().raw().toBuffer();
  let count = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] > 20 && data[offset] === red && data[offset + 1] === green && data[offset + 2] === blue) {
      count += 1;
    }
  }
  return count;
};

describe('music logo assets', () => {
  it('keeps the independent right branch complete', async () => {
    const { data, info } = await sharp(asset('forest-right.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let opaqueAboveCut = 0;
    for (let y = 0; y < 410; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        if (data[(y * info.width + x) * 4 + 3] > 20) opaqueAboveCut += 1;
      }
    }
    expect(opaqueAboveCut).toBeGreaterThan(1000);
  });

  it('places the three teal note bodies at the reference bounds', async () => {
    expect(await tealComponentBounds(asset('notes.png'))).toEqual([
      { minX: 199, maxX: 248, minY: 313, maxY: 379 },
      { minX: 566, maxX: 630, minY: 137, maxY: 218 },
      { minX: 633, maxX: 694, minY: 195, maxY: 278 },
    ]);
  });

  it.each(['forest-left.png', 'forest-right.png', 'bird.png', 'notes.png'])('%s contains the warm white outline', async (name) => {
    expect(await countExactColor(asset(name), [255, 247, 232])).toBeGreaterThan(300);
  });
});
