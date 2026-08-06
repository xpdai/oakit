/**
 * 圖文選單：從租戶設定「畫」出圖片並直接建到 LINE 上。
 *
 * 這是整套工具最有感的賣點 —— LINE 後台手動做一個圖文選單，
 * 店家要自己生圖、切版、對座標，做一次要半小時而且改不動。
 * 這裡從設定檔算版位、產圖、上傳、設為預設，全部一行指令。
 */

import { Blob } from 'node:buffer';
import { messagingApi } from '@line/bot-sdk';
import sharp from 'sharp';
import { theme, type RichMenuItem, type Tenant } from '../tenant.js';

/** LINE 允許的版型之一。四格以上用高版，三格以內用矮版。 */
const WIDTH = 2500;
const TALL = 1686;
const SHORT = 843;

interface Cell {
  item: RichMenuItem;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 預設選單：多數店家要的就是這四件事。 */
function defaultItems(t: Tenant): RichMenuItem[] {
  const items: RichMenuItem[] = [
    { label: '營業時間', action: { type: 'message', text: '營業時間' } },
    { label: '服務價格', action: { type: 'message', text: '價格' } },
  ];
  if (t.contact.address) {
    items.push({ label: '店家位置', action: { type: 'message', text: '地址' } });
  }
  if (t.contact.phone) {
    items.push({ label: '打電話', action: { type: 'uri', uri: `tel:${t.contact.phone}` } });
  }
  return items;
}

export function layout(items: RichMenuItem[]): { height: number; cells: Cell[] } {
  const n = items.length;
  // 1–3 格排一列用矮版；4 格 2×2；5–6 格 2×3。
  const cols = n <= 3 ? n : n === 4 ? 2 : 3;
  const rows = n <= 3 ? 1 : 2;
  const height = rows === 1 ? SHORT : TALL;
  const w = Math.floor(WIDTH / cols);
  const h = Math.floor(height / rows);

  const cells: Cell[] = items.map((item, i) => ({
    item,
    x: (i % cols) * w,
    y: Math.floor(i / cols) * h,
    w,
    h,
  }));
  // 最後一欄補滿寬度，避免整數除法留下幾 px 的縫。
  for (let r = 0; r < rows; r++) {
    const last = cells.filter((_, i) => Math.floor(i / cols) === r).pop();
    if (last) last.w = WIDTH - last.x;
  }
  return { height, cells };
}

function svg(t: Tenant, height: number, cells: Cell[]): string {
  const { accent, bg, ink } = theme(t);
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">`,
    `<rect width="${WIDTH}" height="${height}" fill="${bg}"/>`,
  ];

  cells.forEach((c, i) => {
    // 交錯深淺，讓相鄰格子看得出分界，不必畫線。
    const tint = i % 2 === 0 ? accent : shade(accent, -0.12);
    parts.push(`<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${tint}"/>`);
    parts.push(
      `<text x="${c.x + c.w / 2}" y="${c.y + c.h / 2}" fill="${bg}" font-size="${Math.min(c.h * 0.22, 96)}" font-weight="700" font-family="'PingFang TC','Noto Sans TC',sans-serif" text-anchor="middle" dominant-baseline="central" letter-spacing="4">${esc(c.item.label)}</text>`,
    );
  });

  parts.push(`<rect width="${WIDTH}" height="${height}" fill="none" stroke="${ink}" stroke-opacity="0.08" stroke-width="6"/>`);
  parts.push('</svg>');
  return parts.join('');
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 把 hex 顏色調亮或調暗，amount 為 -1~1。 */
function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const mix = (v: number) =>
    Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export async function renderImage(t: Tenant): Promise<{ png: Buffer; height: number; cells: Cell[] }> {
  const items = t.richMenu?.items?.length ? t.richMenu.items : defaultItems(t);
  const { height, cells } = layout(items);
  // LINE 限制圖片 1MB 以內，PNG 壓縮等級拉高比較保險。
  const png = await sharp(Buffer.from(svg(t, height, cells)))
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { png, height, cells };
}

/**
 * 建立圖文選單並設為預設。回傳 richMenuId。
 * 會先刪掉這個帳號既有的選單 —— 重跑指令時才不會越堆越多。
 */
export async function publish(t: Tenant, accessToken: string): Promise<string> {
  const api = new messagingApi.MessagingApiClient({ channelAccessToken: accessToken });
  const blob = new messagingApi.MessagingApiBlobClient({ channelAccessToken: accessToken });

  const existing = await api.getRichMenuList();
  for (const m of existing.richmenus ?? []) {
    await api.deleteRichMenu(m.richMenuId);
  }

  const { png, height, cells } = await renderImage(t);

  const richMenuId = (
    await api.createRichMenu({
      size: { width: WIDTH, height },
      selected: true,
      name: `${t.brand.name} 主選單`,
      chatBarText: '選單',
      areas: cells.map((c) => ({
        bounds: { x: c.x, y: c.y, width: c.w, height: c.h },
        action:
          c.item.action.type === 'uri'
            ? { type: 'uri' as const, label: c.item.label, uri: c.item.action.uri }
            : { type: 'message' as const, label: c.item.label, text: c.item.action.text },
      })),
    })
  ).richMenuId;

  await blob.setRichMenuImage(richMenuId, new Blob([png], { type: 'image/png' }) as unknown as globalThis.Blob);
  await api.setDefaultRichMenu(richMenuId);
  return richMenuId;
}
