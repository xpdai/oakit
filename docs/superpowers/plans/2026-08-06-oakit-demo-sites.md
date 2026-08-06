# OAKIT 四產業 Demo 官網 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在現有 OAKIT 上新增餐飲、室內設計、寵物與音樂教室四種全虛構 Demo 官網，維持 `Tenant` 單一資料來源並保留下一階段 LINE Reply bot 串接能力。

**Architecture:** `Tenant.site` 是可選的展示設定；`src/site/render.ts` 負責共用 HTML shell，`src/site/variants.ts` 負責四種產業 presenter，`src/site/html.ts` 集中處理 escaping。服務、價格、FAQ、公告與展示文字繼續從同一份 tenant 輸出到官網與 knowledge builder；LINE webhook 與 Push API 不在本計畫中修改。

**Tech Stack:** Node.js、TypeScript、Vitest、現有 `tsx` CLI、現有 `sharp` rich menu renderer；無框架、無建置工具、無外部資源。

## Global Constraints

- `tenants/<id>.json` 維持為品牌網站、圖文選單與 AI 知識庫的共同來源。
- 輸出仍是單一 HTML 檔，不使用外部字型、CDN、前端框架或遠端圖片。
- 營業時間、地址、電話、價格等精確內容維持走 `ruleReply()`。
- LINE 只使用 Reply API；本計畫不加入 Push API。
- Webhook 的 raw body 驗簽與先回 200 的既有行為不得被改壞。
- 沒有憑證時，`npm run typecheck`、`npm run test`、`npm run build` 與 rich menu 產圖仍須可執行。
- `@anthropic-ai/sdk` 維持 `0.115+`；不在本計畫內更換模型或 SDK。
- 目前 `/Users/dai/Desktop/oakit` 沒有 `.git`；不可假造 commit，也不因本計畫自行執行 `git init`。每個任務仍要留下可獨立驗證的 checkpoint。

---

## 檔案與責任分工

### 會修改的檔案

- `src/tenant.ts`：新增 `SiteContent` 相關型別、`Tenant.site` 與展示欄位 validation；保持既有 tenant 欄位與 `loadTenant()` 相容。
- `src/site/render.ts`：保留共用單檔 HTML shell，改用集中 escaping、variant presenter、頁內導覽與可用的 fallback CTA。
- `src/knowledge.ts`：把 tenant 的展示文字加入 AI knowledge prompt，不把 layout token 當成客服內容。
- `tenants/demo-pet.json`：補上 `site.variant = "pet"` 與寵物服務展示內容，保留既有商業資料。
- `README.md`：記錄四個 Demo ID 與網站驗證指令。
- `HANDOFF.md`：記錄網站階段完成內容與 LINE 階段的下一個邊界。

### 會新增的檔案

- `src/site/html.ts`：唯一的 `escapeHtml()` 實作。
- `src/site/variants.ts`：`getRenderVariant()` 與 `renderVariantSections()`，只負責產業專屬 HTML。
- `tenants/demo-bistro.json`：暮火食堂的餐飲 tenant。
- `tenants/demo-interior.json`：隅光製所的室內設計 tenant。
- `tenants/demo-music.json`：拾音音樂教室的音樂教學 tenant。
- `tests/tenant.test.ts`：資料型別與 validation 測試。
- `tests/site-render.test.ts`：四種 presenter、fallback、escaping 與單檔輸出測試。
- `tests/tenant-fixtures.test.ts`：四個虛構 tenant 的完整載入測試。
- `tests/knowledge.test.ts`：展示內容進 knowledge 與既有 `ruleReply()` 的測試。

---

### Task 1: 建立 `Tenant.site` 資料契約與 validation

**Files:**

- Modify: `src/tenant.ts`
- Create: `tests/tenant.test.ts`

**Interfaces:**

- Produces `BusinessType = 'restaurant' | 'interior' | 'pet' | 'music'`。
- Produces `ShowcaseItem`、`ProcessStep`、`SiteContent`。
- Extends `Tenant` with `site?: SiteContent`。
- Produces `validateTenant(t: Tenant): void`；`loadTenant()` 改呼叫此 exported function。

- [ ] **Step 1: 先寫 validation 失敗測試**

在 `tests/tenant.test.ts` 建立最小合法 tenant，並覆蓋四種 variant、舊 tenant 沒有 `site`、錯誤 variant 三種情況：

```ts
import { describe, expect, it } from 'vitest';
import { validateTenant, type Tenant } from '../src/tenant.js';

const makeTenant = (site?: Tenant['site']): Tenant => ({
  id: 'test',
  brand: { name: '測試店', tagline: '測試標語', about: '測試介紹' },
  contact: {},
  hours: [{ days: '週一', open: '09:00', close: '18:00' }],
  services: [{ name: '測試服務', desc: '測試說明' }],
  faq: [],
  site,
});

describe('Tenant site content', () => {
  it.each(['restaurant', 'interior', 'pet', 'music'] as const)('接受 %s variant', (variant) => {
    expect(() => validateTenant(makeTenant({ variant }))).not.toThrow();
  });

  it('接受沒有 site 的既有 tenant', () => {
    expect(() => validateTenant(makeTenant())).not.toThrow();
  });

  it('拒絕未知 variant', () => {
    const invalid = makeTenant({ variant: 'casino' as never });
    expect(() => validateTenant(invalid)).toThrow('site.variant');
  });
});
```

- [ ] **Step 2: 執行測試確認目前會失敗**

Run: `npx vitest run tests/tenant.test.ts`

Expected: FAIL，因為 `validateTenant` 尚未 exported，且 `Tenant` 尚未有 `site` 型別。

- [ ] **Step 3: 實作最小資料契約與 validation**

在 `src/tenant.ts` 加入下列型別，並讓 `Tenant.site` 為 optional：

```ts
export type BusinessType = 'restaurant' | 'interior' | 'pet' | 'music';

export interface ShowcaseItem {
  title: string;
  category?: string;
  description: string;
  meta?: string;
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
  highlights?: Array<{
    label: string;
    value: string;
    description?: string;
  }>;
  showcase?: ShowcaseItem[];
  process?: ProcessStep[];
}
```

將原本 private 的 `validate()` 改名為 `export function validateTenant(t: Tenant): void`，保留所有既有檢查，再增加 `site.variant` 必須屬於四個 literal 的檢查。錯誤訊息使用 `site.variant 必須是 restaurant、interior、pet 或 music`，讓測試與 CLI 錯誤可讀。

- [ ] **Step 4: 執行測試與型別檢查確認通過**

Run: `npx vitest run tests/tenant.test.ts`

Expected: 6 個測試全部 PASS。

Run: `npm run typecheck`

Expected: TypeScript 以 exit code 0 結束。

- [ ] **Step 5: 記錄 Task 1 checkpoint**

確認 `loadTenant('demo-pet')` 的既有 JSON 仍能載入，並記錄驗證輸出。此 workspace 沒有 Git metadata，因此不執行 commit。

---

### Task 2: 拆出 escaping 與四種網站 presenter

**Files:**

- Create: `src/site/html.ts`
- Create: `src/site/variants.ts`
- Modify: `src/site/render.ts`
- Create: `tests/site-render.test.ts`

**Interfaces:**

- `src/site/html.ts` produces `escapeHtml(value: string): string`。
- `src/site/variants.ts` produces `getRenderVariant(t: Tenant): BusinessType | 'default'`。
- `src/site/variants.ts` produces `renderVariantSections(t: Tenant): string`。
- `src/site/render.ts` continues to produce `renderSite(t: Tenant): string`。

- [ ] **Step 1: 先寫 presenter、fallback 與安全輸出測試**

在 `tests/site-render.test.ts` 建立含有 `site`、`showcase`、`process` 的測試 tenant，鎖定 HTML marker：

```ts
import { describe, expect, it } from 'vitest';
import { renderSite } from '../src/site/render.js';
import type { BusinessType, Tenant } from '../src/tenant.js';

const makeTenant = (variant?: BusinessType): Tenant => ({
  id: 'render-test',
  brand: {
    name: variant ? `${variant} 測試` : '舊版測試',
    tagline: '一個測試標語',
    about: '一段測試介紹',
  },
  contact: { address: '測試地址' },
  hours: [{ days: '週一', open: '09:00', close: '18:00' }],
  services: [{ name: '測試服務', desc: '測試服務說明', price: 'NT$100' }],
  faq: [{ q: '可以嗎？', a: '可以。' }],
  site: variant
    ? {
        variant,
        eyebrow: '測試標籤',
        heroNote: '測試 Hero 說明',
        highlights: [{ label: '特色', value: '測試值', description: '測試特色' }],
        showcase: [{ title: '展示內容', category: '分類', description: '展示說明', meta: '補充資料' }],
        process: [{ step: '01', title: '第一步', description: '第一步說明' }],
      }
    : undefined,
});

describe('renderSite variants', () => {
  it.each(['restaurant', 'interior', 'pet', 'music'] as const)('輸出 %s marker', (variant) => {
    const html = renderSite(makeTenant(variant));
    expect(html).toContain(`data-variant="${variant}"`);
    expect(html).toContain(`variant-${variant}`);
    expect(html).toContain('展示內容');
  });

  it('沒有 site 時使用 default，不丟失既有內容', () => {
    const html = renderSite(makeTenant());
    expect(html).toContain('data-variant="default"');
    expect(html).toContain('測試服務');
    expect(html).toContain('常 見 問 題');
    expect(html).not.toContain('variant-restaurant');
  });

  it('所有租戶文字都會 escaping，且沒有外部資源標籤', () => {
    const tenant = makeTenant('restaurant');
    tenant.brand.name = '<script>alert("x")</script>';
    const html = renderSite(tenant);
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert');
    expect(html).not.toMatch(/<link[^>]+href=|<script[^>]+src=|@import|url\(/);
  });
});
```

- [ ] **Step 2: 執行測試確認目前會失敗**

Run: `npx vitest run tests/site-render.test.ts`

Expected: FAIL，因為目前 renderer 沒有 `data-variant`、四種 presenter、集中 escaping 與 variant-specific marker。

- [ ] **Step 3: 建立集中 escaping 函式**

在 `src/site/html.ts` 實作：

```ts
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

從 `src/site/render.ts` 移除 local `esc`，所有 tenant 文字、href、title、meta 與 data attribute 都改用 `escapeHtml()`。

- [ ] **Step 4: 實作 variant presenter**

在 `src/site/variants.ts` 實作以下邊界：

```ts
export function getRenderVariant(t: Tenant): BusinessType | 'default' {
  return t.site?.variant ?? 'default';
}

export function renderVariantSections(t: Tenant): string {
  // 只輸出產業專屬 section；共用 header、services、hours、faq、contact 留在 render.ts。
}
```

具體輸出要求：

- `restaurant` 使用 `class="variant-restaurant"` 與 `data-section="menu"`，呈現 `highlights` 與 `showcase`。
- `interior` 使用 `class="variant-interior"` 與 `data-section="projects"`，呈現 `showcase` 與 `process`。
- `pet` 使用 `class="variant-pet"` 與 `data-section="care"`，呈現 `highlights`、`showcase` 與可用的 `process`。
- `music` 使用 `class="variant-music"` 與 `data-section="courses"`，呈現 `highlights`、`showcase` 與 `process`。
- `default` 回傳空字串，讓 `oakit.json` 與沒有 `site` 的既有 tenant 保持原有內容。

每個 presenter 都用相同的 `highlights`、`showcase`、`process` 資料型別，不建立四套 Tenant union。沒有內容的 optional section 不輸出空標題。

- [ ] **Step 5: 將共用 shell 改成新版單頁結構**

在 `src/site/render.ts`：

1. 呼叫 `getRenderVariant(t)`，在 `<body data-variant="...">` 上輸出 variant。
2. 保留 brand、notice、about、services、hours、faq、contact、footer。
3. 在 header 加上頁內導覽，至少包含 `#about`、`#services`、`#hours`、`#contact`；FAQ 有內容時再加 `#faq`。
4. 將 `renderVariantSections(t)` 放在 about 與 services 之間。
5. 將聯絡區加上 `id="contact"`，about、services、hours、faq 也各有固定 id。
6. CTA 有 `lineAddUrl` 時保留外部 LINE 連結；沒有 URL 時使用 `href="#contact"`，文字改為「聯絡／預約」，不產生假的外部連結。
7. 維持 `lang="zh-Hant"`、viewport、meta description、原生 `<details>` FAQ 與無 JavaScript 輸出。

CSS 以現有 tenant `theme()` 的三個 token 為底，再加入 `.variant-restaurant`、`.variant-interior`、`.variant-pet`、`.variant-music` 的排版與卡片差異。保留系統字型、手機單欄、focus 狀態、觸控尺寸與 dark-mode 可讀性；不可加入 `<link>`、遠端 `@import`、`url(http...)` 或外部 script。

- [ ] **Step 6: 執行 renderer 測試與型別檢查**

Run: `npx vitest run tests/site-render.test.ts`

Expected: 四種 marker、default fallback、escaping 與外部資源檢查全部 PASS。

Run: `npm run typecheck`

Expected: exit code 0，沒有 unused import 或 implicit type error。

- [ ] **Step 7: 記錄 Task 2 checkpoint**

以 `renderSite()` 直接渲染一個四種 variant 的 tenant，確認輸出為完整 `<!doctype html>` 且仍只有單一檔案。此 workspace 沒有 Git metadata，因此不執行 commit。

---

### Task 3: 建立四個全虛構 tenant fixture

**Files:**

- Create: `tenants/demo-bistro.json`
- Create: `tenants/demo-interior.json`
- Create: `tenants/demo-music.json`
- Modify: `tenants/demo-pet.json`
- Create: `tests/tenant-fixtures.test.ts`

**Interfaces:**

- Consumes the `Tenant` schema and `validateTenant()` from Task 1。
- Produces four loadable tenant IDs for `listTenants()`、`build`、`richmenu`、`ask`。

- [ ] **Step 1: 先寫 fixture 載入失敗測試**

在 `tests/tenant-fixtures.test.ts` 鎖定四個 ID、名稱與 variant：

```ts
import { describe, expect, it } from 'vitest';
import { listTenants, loadTenant } from '../src/tenant.js';

const expected = [
  { id: 'demo-bistro', name: '暮火食堂', variant: 'restaurant' },
  { id: 'demo-interior', name: '隅光製所', variant: 'interior' },
  { id: 'demo-pet', name: '小步寵物美容', variant: 'pet' },
  { id: 'demo-music', name: '拾音音樂教室', variant: 'music' },
] as const;

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
});
```

- [ ] **Step 2: 執行測試確認新 fixture 尚不存在**

Run: `npx vitest run tests/tenant-fixtures.test.ts`

Expected: FAIL，因為 `demo-bistro.json`、`demo-interior.json`、`demo-music.json` 尚未存在，且 `demo-pet` 尚未有 `site`。

- [ ] **Step 3: 建立暮火食堂 tenant**

建立 `tenants/demo-bistro.json`，使用以下不可替換的品牌方向與資料：

- `id`：`demo-bistro`
- `brand.name`：`暮火食堂`
- `brand.tagline`：`把下班後的好心情，放進一碗熱飯裡`
- `site.variant`：`restaurant`
- `site.eyebrow`：`台北・日常食堂`
- `site.heroNote`：`以炭火、米飯與當季蔬菜，做一桌不需要盛裝也能好好吃飯的晚餐。`
- `site.highlights`：午間定食、晚間炭火料理、每日一款季節小菜
- `site.showcase`：炭火雞腿飯、味噌奶油鮭魚、季節小菜盤
- `contact.address`：`台北市中山區禾光街 18 號 1 樓`
- `contact.phone`：`02-2512-4068`
- `theme`：`accent #c55b36`、`bg #fff7ed`、`ink #2a1d18`
- services 至少包含「炭火雞腿定食」「味噌奶油鮭魚」「包場晚餐」並有價格或依內容詢價說明
- rich menu 使用「今日菜單」「營業時間」「訂位」「店家地址」四個 message actions

FAQ 至少回答是否需要訂位、素食選項、外帶方式與包場詢問；所有內容保持虛構。

- [ ] **Step 4: 建立隅光製所 tenant**

建立 `tenants/demo-interior.json`：

- `id`：`demo-interior`
- `brand.name`：`隅光製所`
- `brand.tagline`：`讓空間，回到真正適合生活的樣子`
- `site.variant`：`interior`
- `site.eyebrow`：`住宅與商業空間設計`
- `site.heroNote`：`從生活習慣、光線與收納開始，替每一個空間找到剛好的秩序。`
- `site.highlights`：住宅改造、商業空間、軟裝顧問
- `site.showcase`：`松菸日光宅`、`河岸旁的兩人住宅`、`留白茶室`
- `site.process`：丈量訪談、概念提案、細節設計、工程交付
- `contact.address`：`台北市松山區靜巷 7 號 3 樓`
- `contact.phone`：`02-2768-1932`
- `theme`：`accent #5b625b`、`bg #f4f1eb`、`ink #242621`
- services 至少包含「住宅整體規劃」「商業空間設計」「軟裝顧問」；價格使用「依坪數與需求估價」等精確可回答的字串
- rich menu 使用「作品案例」「服務流程」「預約諮詢」「工作室地址」四個 message actions

FAQ 至少回答服務區域、初次諮詢、設計費與工期估算。

- [ ] **Step 5: 補強小步寵物美容 tenant**

保留 `tenants/demo-pet.json` 既有品牌、服務、FAQ、公告、價格與 rich menu，只加入：

- `site.variant`：`pet`
- `site.eyebrow`：`一對一寵物美容`
- `site.heroNote`：`每個時段只照顧一個孩子，洗完吹乾就回家，不讓牠在籠子裡等待。`
- `site.highlights`：一次一隻、不關籠、怕生與高齡犬照護
- `site.showcase`：基礎洗澡、全身美容、高齡犬洗澡

- [ ] **Step 6: 建立拾音音樂教室 tenant**

建立 `tenants/demo-music.json`：

- `id`：`demo-music`
- `brand.name`：`拾音音樂教室`
- `brand.tagline`：`從第一個音開始，找到自己的節奏`
- `site.variant`：`music`
- `site.eyebrow`：`一對一與團體音樂課`
- `site.heroNote`：`不論是第一次摸琴，還是想重新唱回喜歡的歌，都能從適合自己的速度開始。`
- `site.highlights`：鋼琴一對一、吉他入門、歌唱課、樂團共學
- `site.showcase`：成人鋼琴、木吉他入門、流行歌唱、週末樂團
- `site.process`：選擇方向、安排試聽、建立練習、上台分享
- `contact.address`：`台北市文山區星河街 32 號 2 樓`
- `contact.phone`：`02-2936-7150`
- `theme`：`accent #e46f58`、`bg #fbf4e7`、`ink #17212b`
- services 至少包含「鋼琴一對一」「木吉他入門」「流行歌唱」「週末樂團」並附上虛構學費與課程時間
- rich menu 使用「課程介紹」「學費」「預約試聽」「教室地址」四個 message actions

FAQ 至少回答適合年齡、需不需要自備樂器、試聽方式與請假規則。

- [ ] **Step 7: 執行 fixture 測試與型別檢查**

Run: `npx vitest run tests/tenant-fixtures.test.ts`

Expected: 四個 fixture 載入測試全部 PASS。

Run: `npm run typecheck`

Expected: exit code 0。

- [ ] **Step 8: 記錄 Task 3 checkpoint**

執行 `node -e "console.log(require('node:fs').readdirSync('tenants').filter((f) => f.endsWith('.json')).sort())"`，確認四個 Demo JSON 與 `oakit.json` 同時存在；此 workspace 沒有 Git metadata，因此不執行 commit。

---

### Task 4: 將展示內容接進 knowledge builder，保留 ruleReply 優先順序

**Files:**

- Modify: `src/knowledge.ts`
- Create: `tests/knowledge.test.ts`

**Interfaces:**

- `buildKnowledge(t: Tenant): string` 仍是既有 public function，新增 `site` 文字區段。
- `ruleReply(text: string, t: Tenant): string | null` signature 不變。

- [ ] **Step 1: 先寫 knowledge 與 ruleReply 測試**

在 `tests/knowledge.test.ts` 加入：

```ts
import { describe, expect, it } from 'vitest';
import { buildKnowledge, ruleReply } from '../src/knowledge.js';
import { loadTenant } from '../src/tenant.js';

describe('site content knowledge', () => {
  it('把室內設計案例與流程放進 knowledge', () => {
    const knowledge = buildKnowledge(loadTenant('demo-interior'));
    expect(knowledge).toContain('松菸日光宅');
    expect(knowledge).toContain('丈量訪談');
    expect(knowledge).toContain('服務與價格');
  });

  it('音樂教室價格仍由 ruleReply 精確回覆', () => {
    const reply = ruleReply('學費多少？', loadTenant('demo-music'));
    expect(reply).toContain('鋼琴一對一');
    expect(reply).toContain('NT$');
  });
});
```

- [ ] **Step 2: 執行測試確認展示文字目前未進 knowledge**

Run: `npx vitest run tests/knowledge.test.ts`

Expected: 第一個測試 FAIL，因為 `buildKnowledge()` 目前只輸出 brand、contact、services、notices、faq。

- [ ] **Step 3: 實作 site knowledge 區段**

在 `buildKnowledge()` 的 FAQ 區段之前加入 `## 網站重點`，依固定順序輸出：variant、eyebrow、heroNote、highlights、showcase、process。使用純文字，不插入 HTML：

```ts
if (t.site) {
  lines.push('## 網站重點');
  lines.push(`類型：${t.site.variant}`);
  if (t.site.eyebrow) lines.push(`定位：${t.site.eyebrow}`);
  if (t.site.heroNote) lines.push(`首頁說明：${t.site.heroNote}`);
  for (const item of t.site.highlights ?? []) {
    lines.push(`- ${item.label}｜${item.value}${item.description ? `：${item.description}` : ''}`);
  }
  for (const item of t.site.showcase ?? []) {
    lines.push(`- ${item.title}${item.category ? `｜${item.category}` : ''}${item.meta ? `｜${item.meta}` : ''}：${item.description}`);
  }
  for (const step of t.site.process ?? []) {
    lines.push(`${step.step}. ${step.title}：${step.description}`);
  }
  lines.push('');
}
```

不要改變 `ruleReply()` 的規則順序與 `null` fallback 行為；價格、營業時間、地址與電話仍先在規則層結束。

- [ ] **Step 4: 執行 knowledge 測試、全量測試與型別檢查**

Run: `npx vitest run tests/knowledge.test.ts`

Expected: 2 個測試 PASS。

Run: `npm test`

Expected: Task 1–4 的所有測試 PASS，且沒有需要 Anthropic 或 LINE credentials 的測試。

Run: `npm run typecheck`

Expected: exit code 0。

- [ ] **Step 5: 記錄 Task 4 checkpoint**

執行 `npm run ask -- demo-music "價格"` 與 `npm run ask -- demo-interior "營業時間"`，確認輸出來源為 rule，而不是 AI。此 workspace 沒有 Git metadata，因此不執行 commit。

---

### Task 5: 建置四份輸出、rich menu 產圖與文件交接

**Files:**

- Modify: `README.md`
- Modify: `HANDOFF.md`
- Generated/verify: `dist/demo-bistro/index.html`
- Generated/verify: `dist/demo-interior/index.html`
- Generated/verify: `dist/demo-pet/index.html`
- Generated/verify: `dist/demo-music/index.html`
- Generated/verify: `dist/<id>/richmenu.png`

**Interfaces:**

- Consumes all tenant fixtures and renderer/knowledge code from Tasks 1–4。
- Produces four standalone HTML files and four local rich menu PNGs without credentials。

- [ ] **Step 1: 更新 README 的使用範例**

在 `README.md` 的 tenant/build 說明加入四個 Demo ID，並保留既有指令格式：

```bash
npm run build
npm run build -- demo-bistro
npm run richmenu -- demo-music
npm run ask -- demo-interior "服務流程"
```

明確寫出輸出位置 `dist/<id>/index.html`，以及沒有 LINE 憑證時 `richmenu` 只產圖不上傳。

- [ ] **Step 2: 更新 HANDOFF 的進度與下一階段**

記錄：四個虛構 Demo 已完成、tenant 是單一來源、網站輸出與 knowledge 已驗證；LINE 真實 webhook E2E、Reply bot 串接與 native LINE AI 的取捨仍是下一個獨立工作，不宣稱已完成。

- [ ] **Step 3: 執行完整靜態驗證**

依序執行：

```bash
npm run typecheck
npm test
npm run build
```

Expected：三個指令都以 exit code 0 結束，`dist/` 下有四個 Demo 的 `index.html`。

- [ ] **Step 4: 產出四份 rich menu 圖片**

執行：

```bash
npm run richmenu -- demo-bistro
npm run richmenu -- demo-interior
npm run richmenu -- demo-pet
npm run richmenu -- demo-music
```

Expected：每次都產出 `dist/<id>/richmenu.png`，沒有憑證時只顯示產圖提示，不發出 LINE API 上傳要求；每張圖片維持既有允許尺寸與 1MB 上限。

- [ ] **Step 5: 驗證 HTML 沒有外部資源依賴**

執行：

```bash
rg -n '<link[^>]+href=|<script[^>]+src=|@import|url\(https?://' dist/demo-bistro/index.html dist/demo-interior/index.html dist/demo-pet/index.html dist/demo-music/index.html
```

Expected：沒有輸出。`mapUrl` 或 `lineAddUrl` 這類 tenant 聯絡連結可以存在，但 HTML 不得有外部 CSS、JavaScript、字型或圖片依賴。

- [ ] **Step 6: 做桌面與手機視覺 QA**

用可見瀏覽器依序開啟四份 `dist/<id>/index.html`，各檢查桌面寬度與手機寬度：

- 暮火食堂呈現暖橘餐飲、菜單亮點與訂位 CTA。
- 隅光製所呈現留白作品集、案例與流程。
- 小步寵物美容呈現柔和圓角、服務價格與照護內容。
- 拾音音樂教室呈現深藍／珊瑚橘、課程與試聽 CTA。
- 所有頁面沒有水平溢出，頁內導覽、FAQ、聯絡／預約 CTA 可操作。

- [ ] **Step 7: 執行最終驗證並交接**

再執行一次 `npm run typecheck && npm test && npm run build`，確認輸出後才回報完成；回報中列出四個 HTML 路徑、rich menu 產圖結果與尚未納入的 LINE 範圍。此 workspace 沒有 Git metadata，因此不執行 commit。

---

## 計畫自我審查

### Spec coverage

- Spec 目標與四個虛構 Demo：Task 3、Task 5。
- 單一 `Tenant` 來源與向後相容：Task 1、Task 4。
- 共用 shell、四種 presenter、單檔 HTML、CSS 與 accessibility 基線：Task 2。
- 餐飲、室內、寵物、音樂的內容與視覺差異：Task 2、Task 3、Task 5。
- `ruleReply()` 優先與 knowledge 整合：Task 4。
- Reply-only、raw webhook、LINE 第二階段邊界：Global Constraints 與 Task 5 文件交接；本計畫不改 webhook。
- typecheck、test、build、rich menu、HTML 資源與視覺驗收：Task 5。
- Eastern、CRM、RAG、Push、付款與真實預約排除：Global Constraints 與 Task 5 文件交接。

### Placeholder scan

完成本計畫文件後，使用文字搜尋工具檢查常見的暫留字樣、未定義工作與「請自行決定」類句子。

Expected：沒有命中。每個步驟都有實際檔案、函式名稱、測試命令與預期結果。

### Type consistency

- `Tenant.site?: SiteContent` 由 Task 1 定義，Task 2–4 都以 optional 方式消費。
- `BusinessType` 四個 literal 在 Task 1 定義，Task 2 的 `getRenderVariant()` 與 Task 3 fixture variant 使用相同名稱。
- `escapeHtml(value: string): string` 只由 Task 2 的 renderer 使用。
- `renderVariantSections(t: Tenant): string` 只輸出變體區塊；`renderSite(t: Tenant): string` 保持 CLI 既有入口。
- `buildKnowledge(t: Tenant): string` 與 `ruleReply(text: string, t: Tenant): string | null` signature 在 Task 4 不變。
