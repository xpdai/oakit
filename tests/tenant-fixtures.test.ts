import { describe, expect, it } from 'vitest';
import { listTenants, loadTenant } from '../src/tenant.js';

const expected = [
  { id: 'demo-bistro', name: '暮火食堂', variant: 'restaurant' },
  { id: 'demo-interior', name: '隅光製所', variant: 'interior' },
  { id: 'demo-pet', name: '小步寵物美容', variant: 'pet' },
  { id: 'demo-music', name: '那莫 好聽', variant: 'music' },
] as const;

const channel = (hex: string, offset: number): number => Number.parseInt(hex.slice(offset, offset + 2), 16);

const luminance = (hex: string): number => {
  const values = [1, 3, 5].map((offset) => channel(hex, offset) / 255);
  const linear = values.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
};

const contrastRatio = (foreground: string, background: string): number => {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

const richMenuShade = (hex: string): string => {
  const values = [1, 3, 5].map((offset) => Math.round(channel(hex, offset) * 0.88));
  return `#${values.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
};

describe('fictional demo tenants', () => {
  it('列出四個 demo id', () => {
    const ids = listTenants();
    for (const item of expected) expect(ids).toContain(item.id);
  });

  it.each(expected)('載入 $id 並符合 $variant', ({ id, name, variant }) => {
    const tenant = loadTenant(id);
    expect(tenant.brand.name).toBe(name);
    expect(tenant.site?.variant).toBe(variant);
    expect(tenant.services.length).toBeGreaterThan(0);
    expect(tenant.hours.length).toBeGreaterThan(0);
  });

  it.each(expected)('$id 的網站文字與 rich menu 色彩達到 4.5:1', ({ id }) => {
    const tenant = loadTenant(id);
    const accent = tenant.theme?.accent;
    const background = tenant.theme?.bg;
    const ink = tenant.theme?.ink;

    expect(accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(background).toMatch(/^#[0-9a-f]{6}$/i);
    expect(ink).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrastRatio(ink!, background!)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(accent!, background!)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(richMenuShade(accent!), background!)).toBeGreaterThanOrEqual(4.5);
  });
});
