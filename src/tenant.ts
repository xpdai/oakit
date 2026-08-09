/**
 * 租戶設定 —— 整個產品的核心。
 *
 * 官網、LINE 圖文選單、LINE 自動回覆的知識庫，三者都是從這一份長出來的。
 * 這就是「官網 + LINE 整合」的實質：改一次營業時間，兩邊同時更新。
 * 既有的 LINE 工具商做不到，因為客戶的官網不是他們的。
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export type BusinessType = 'restaurant' | 'interior' | 'pet' | 'music';

export interface ShowcaseItem {
  title: string;
  category?: string;
  description: string;
  meta?: string;
}

export interface StudentShowcaseItem {
  title: string;
  category?: string;
  description: string;
  meta?: string;
  url?: string;
}

export interface ProcessStep {
  step: string;
  title: string;
  description: string;
}

export interface SiteContent {
  variant: BusinessType;
  eyebrow?: string;
  heroNote?: string;
  highlights?: Array<{ label: string; value: string; description?: string }>;
  showcase?: ShowcaseItem[];
  studentShowcase?: StudentShowcaseItem[];
  process?: ProcessStep[];
}

export interface Hours {
  /** 例：「週一至週五」「週六、週日」 */
  days: string;
  /** 24 小時制。公休日把 open/close 留空。 */
  open?: string;
  close?: string;
  /** 公休或特殊說明 */
  note?: string;
}

export interface Service {
  name: string;
  desc: string;
  /** 顯示用字串，例：「NT$800 起」。刻意不用數字 —— 店家常有「起」「依評估」。 */
  price?: string;
  duration?: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface RichMenuItem {
  /** 選單上的文字 */
  label: string;
  /** 點下去做什麼 */
  action:
    | { type: 'uri'; uri: string }
    /** 傳一段文字給機器人，等同使用者自己打這句話 —— 會走自動回覆，不計費。 */
    | { type: 'message'; text: string };
}

export interface Tenant {
  id: string;
  brand: {
    name: string;
    /** 一句話說明這家店在做什麼 */
    tagline: string;
    /** 較長的介紹，官網與 AI 客服都會用到 */
    about: string;
    /** 品牌 Logo；官網會將本機素材內嵌成單檔 HTML */
    logo?: { src: string; alt?: string };
  };
  contact: {
    phone?: string;
    lineId?: string;
    address?: string;
    /** 聯絡區補充說明，例如到府服務的交通費提醒 */
    note?: string;
    /** LINE 加好友連結，例：https://line.me/R/ti/p/@xxxxx */
    lineAddUrl?: string;
    mapUrl?: string;
    email?: string;
  };
  hours: Hours[];
  services: Service[];
  faq: Faq[];
  /** 臨時公告（連假、店休、活動）。會同時出現在官網頂部與 AI 客服的知識庫。 */
  notices?: string[];
  theme?: {
    accent?: string;
    bg?: string;
    ink?: string;
  };
  site?: SiteContent;
  richMenu?: {
    /** 最多 6 格（LINE 的 2×3 版型）。留空就用預設的四格。 */
    items: RichMenuItem[];
  };
  /** 自動回覆答不出來時的收尾句 */
  fallbackReply?: string;
}

const TENANT_DIR = new URL('../tenants/', import.meta.url).pathname;

export function loadTenant(id: string): Tenant {
  const raw = readFileSync(join(TENANT_DIR, `${id}.json`), 'utf8');
  const tenant = JSON.parse(raw) as Tenant;
  validateTenant(tenant);
  return tenant;
}

export function listTenants(): string[] {
  return readdirSync(TENANT_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

/**
 * 驗證要在生成之前擋下來 —— 店家自己填的設定檔，錯字很常見，
 * 讓它在 build 時就爆掉，比上線後客戶打電話來好。
 */
export function validateTenant(t: Tenant): void {
  const problems: string[] = [];
  if (!t.id) problems.push('缺少 id');
  if (!t.brand?.name) problems.push('缺少 brand.name');
  if (!t.brand?.tagline) problems.push('缺少 brand.tagline');
  if (!t.hours?.length) problems.push('至少要有一組營業時間');
  if (!t.services?.length) problems.push('至少要有一項服務');

  for (const h of t.hours ?? []) {
    const hasOpen = Boolean(h.open);
    const hasClose = Boolean(h.close);
    if (hasOpen !== hasClose) {
      problems.push(`營業時間「${h.days}」的 open / close 要嘛都填、要嘛都留空（公休）`);
    }
  }
  if ((t.richMenu?.items?.length ?? 0) > 6) {
    problems.push('圖文選單最多 6 格（LINE 的 2×3 版型上限）');
  }
  if (t.site && !['restaurant', 'interior', 'pet', 'music'].includes(t.site.variant)) {
    problems.push('site.variant 必須是 restaurant、interior、pet、music 其中之一');
  }
  if (problems.length) {
    throw new Error(`租戶設定有問題：\n  - ${problems.join('\n  - ')}`);
  }
}

// ---------------------------------------------------------------- 常用衍生值

export function formatHours(t: Tenant): string {
  return t.hours
    .map((h) => {
      if (!h.open || !h.close) return `${h.days} ${h.note ?? '公休'}`;
      const note = h.note ? `（${h.note}）` : '';
      return `${h.days} ${h.open}–${h.close}${note}`;
    })
    .join('\n');
}

export const theme = (t: Tenant) => ({
  accent: t.theme?.accent ?? '#1f6f5c',
  bg: t.theme?.bg ?? '#faf9f6',
  ink: t.theme?.ink ?? '#1c1b19',
});
