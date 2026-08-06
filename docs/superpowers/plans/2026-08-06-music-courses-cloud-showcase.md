# 那莫好聽課程與雲端成發 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 更新那莫好聽的鋼琴課程內容與價格，移除未提供的吉他／樂團／歌唱內容，並新增可由租戶資料驅動的「雲端成發」專區。

**Architecture:** 保持現有單檔 HTML 與租戶設定驅動架構。將學生作品資料加入 `SiteContent.studentShowcase`，由音樂版 renderer 產生獨立區塊；沒有作品時顯示明確空狀態，未來填入安全的 HTTP(S) 連結即可產生作品卡。課程與 FAQ 仍只從 `tenants/demo-music.json` 產生，讓官網與 LINE 知識庫共用內容。

**Tech Stack:** TypeScript、Node.js、Vitest、tsx、單檔 HTML/CSS、JSON tenant 設定。

## Global Constraints

- 只修改 `demo-music` 相關內容，不修改其他 demo。
- 優先修改 `tenants/demo-music.json`，不可只直接修改 `dist/demo-music/index.html`。
- 保持輸出為單一 HTML，不加入 CDN、外部字型、外部圖片或框架。
- 保持 `demo-music` tenant id 與路徑不變。
- 使用繁體中文內容；網站不恢復營業時間區塊。
- 不捏造學生影片、音檔或雲端連結；目前使用空狀態。
- 作品連結只接受 `http:`／`https:`，所有租戶文字仍需 HTML escaping。
- 宣稱完成前必須確認 `npm run typecheck`、`npm test`、`npm run build` 與 `git diff --check` 輸出。

---

### Task 1: 先建立課程與雲端成發的失敗測試

**Files:**
- Modify: `tests/site-render.test.ts`
- Modify: `tests/knowledge.test.ts`

**Interfaces:**
- Consumes: 現有 `renderSite`、`buildKnowledge` 與 `Tenant` 測試 fixture。
- Produces: 對音樂版導覽、空狀態、安全作品連結、知識庫作品資訊與 demo-music 課程內容的回歸測試。

- [ ] **Step 1: 寫出音樂版雲端成發的 failing tests**

在 `tests/site-render.test.ts` 增加：

```ts
it('音樂版有雲端成發導覽與沒有作品時的空狀態', () => {
  const html = renderSite(makeTenant('music'));

  expect(html).toContain('href="#student-showcase">雲端成發</a>');
  expect(html).toContain('<section id="student-showcase"');
  expect(html).toContain('學生作品整理中');
});

it('雲端成發只渲染安全的作品連結', () => {
  const tenant = makeTenant('music');
  tenant.site = {
    ...tenant.site!,
    studentShowcase: [
      { title: '安全作品', description: '作品說明', url: 'https://example.com/student-work' },
      { title: '不安全作品', description: '不應產生連結', url: 'javascript:alert(1)' },
    ],
  } as typeof tenant.site;

  const html = renderSite(tenant);

  expect(html).toContain('href="https://example.com/student-work"');
  expect(html).not.toContain('javascript:');
  expect(html).toContain('不安全作品');
});
```

- [ ] **Step 2: 寫出知識庫與 demo-music 內容的 failing tests**

在 `tests/knowledge.test.ts` 增加：

```ts
it('那莫好聽只保留目前提供的課程與新價格', () => {
  const tenant = loadTenant('demo-music');
  const knowledge = buildKnowledge(tenant);

  expect(knowledge).toContain('鋼琴一對一｜流行與古典');
  expect(knowledge).toContain('NT$3,600／4 堂（每堂 NT$900）');
  expect(knowledge).toContain('成人團體班｜流行與古典');
  expect(knowledge).toContain('NT$450／人／堂');
  expect(knowledge).not.toContain('吉他');
  expect(knowledge).not.toContain('樂團');
  expect(knowledge).not.toContain('歌唱');
});

it('有學生作品時會將雲端成發資料加入知識庫', () => {
  const tenant = loadTenant('demo-music');
  tenant.site = {
    ...tenant.site!,
    studentShowcase: [{ title: '小小演奏家', description: '完成第一首古典曲目。' }],
  } as typeof tenant.site;

  expect(buildKnowledge(tenant)).toContain('小小演奏家：完成第一首古典曲目。');
});
```

- [ ] **Step 3: 執行測試確認先失敗**

Run: `npm test -- --run tests/site-render.test.ts tests/knowledge.test.ts`

Expected: FAIL，因為目前沒有 `studentShowcase` renderer、導覽、空狀態與知識庫作品輸出，且 demo-music 仍包含舊課程資料。

- [ ] **Step 4: Commit 測試**

```bash
git add tests/site-render.test.ts tests/knowledge.test.ts
git commit -m "test: define music course and showcase expectations"
```

### Task 2: 建立學生作品資料型別與安全渲染器

**Files:**
- Modify: `src/tenant.ts`
- Modify: `src/site/html.ts`
- Modify: `src/site/variants.ts`
- Modify: `src/site/render.ts`

**Interfaces:**
- Consumes: Task 1 的 `studentShowcase` render tests，以及現有 `SiteContent`、`renderVariantSections` 與 HTML escaping。
- Produces: `StudentShowcaseItem` 型別、`SiteContent.studentShowcase`、安全的 `safeExternalUrl` helper，以及音樂版專用 `renderStudentShowcase(t)`。

- [ ] **Step 1: 新增學生作品資料型別**

在 `src/tenant.ts` 新增：

```ts
export interface StudentShowcaseItem {
  title: string;
  category?: string;
  description: string;
  meta?: string;
  url?: string;
}
```

並在 `SiteContent` 加上 `studentShowcase?: StudentShowcaseItem[]`。

- [ ] **Step 2: 抽出可共用的安全外部 URL 檢查**

在 `src/site/html.ts` 新增 `safeExternalUrl(value?: string): string | undefined`，只回傳主機名稱存在且 protocol 為 `http:` 或 `https:` 的 URL；從 `src/site/render.ts` 移除同名 private function，改為 import，不改變既有地址地圖與 LINE 連結的安全行為。

- [ ] **Step 3: 實作音樂版學生作品 renderer**

在 `src/site/variants.ts` 新增 `renderStudentShowcase(t: Tenant): string`：只有音樂 variant 輸出獨立 `<section id="student-showcase">`；無作品時輸出「學生作品整理中」與分享課堂完成曲子成長的說明；有作品時輸出 title、可選 category、description、meta；URL 經 `safeExternalUrl` 後才輸出 `target="_blank" rel="noopener"` 的「觀看作品」連結；所有文字使用 `escapeHtml`。

- [ ] **Step 4: 將區塊放入官網與音樂版導覽**

在 `src/site/render.ts` 的 navigation 中，只對 `variant === 'music'` 加上 `<a href="#student-showcase">雲端成發</a>`；在 `<main>` 中於 `renderVariantSections(t)` 後、`#services` 前呼叫 `renderStudentShowcase(t)`。其他 variant 與 default tenant 不產生該區塊。

- [ ] **Step 5: 補上專區樣式並驗證 Task 1 測試轉綠**

在 `src/site/render.ts` 的既有 `<style>` 新增 `.student-showcase`、`.student-showcase-list`、`.student-work`、`.student-showcase-empty` 樣式：桌面版兩欄、手機版單欄，沿用現有色彩、邊框與 focus-visible；不新增外部資源。

Run: `npm test -- --run tests/site-render.test.ts tests/knowledge.test.ts`

Expected: 兩個測試檔 PASS。

- [ ] **Step 6: Commit renderer**

```bash
git add src/tenant.ts src/site/html.ts src/site/variants.ts src/site/render.ts
git commit -m "feat: add music student showcase section"
```

### Task 3: 同步 LINE 知識庫的學生作品資料

**Files:**
- Modify: `src/knowledge.ts`
- Modify: `tests/knowledge.test.ts`

**Interfaces:**
- Consumes: `Tenant.site.studentShowcase` 與 Task 1 的作品知識庫測試。
- Produces: `buildKnowledge` 在有作品時輸出作品標題與說明；空陣列不輸出虛構作品。

- [ ] **Step 1: 在網站重點區加入學生作品**

在 `buildKnowledge` 的 `if (t.site)` 區塊中，接在既有 `showcase` 迴圈後加入：

```ts
for (const item of t.site.studentShowcase ?? []) {
  lines.push(`- ${item.title}${item.category ? `｜${item.category}` : ''}${item.meta ? `｜${item.meta}` : ''}：${item.description}`);
}
```

- [ ] **Step 2: 執行知識庫測試**

Run: `npm test -- --run tests/knowledge.test.ts`

Expected: `tests/knowledge.test.ts` PASS。

- [ ] **Step 3: Commit knowledge sync**

```bash
git add src/knowledge.ts tests/knowledge.test.ts
git commit -m "feat: sync student showcase to knowledge"
```

### Task 4: 更新那莫好聽租戶內容

**Files:**
- Modify: `tenants/demo-music.json`

**Interfaces:**
- Consumes: Task 2 的 tenant 型別與 Task 3 的知識庫輸出。
- Produces: 只包含目前實際提供的鋼琴／成人團體班／免費試上課內容，並保留可供未來填入的空 `studentShowcase`。

- [ ] **Step 1: 更新品牌與首頁文案**

刪除 `brand.about`、`site.heroNote`、`site.highlights`、`site.showcase`、`site.process` 中吉他、樂團、歌唱與不適用的演出描述，改為只談鋼琴、流行／古典方向與小班學習。保留品牌名稱、Logo、地址、電話與米色／棕色主題。

- [ ] **Step 2: 更新 services 與 FAQ**

把 `services` 改為三項：鋼琴一對一｜流行與古典（NT$3,600／4 堂、每堂 50 分鐘）、成人團體班｜流行與古典（NT$450／人／堂，成人限定、3 人即開班、最多 3 人）、免費試上課（免費、約 30 分鐘）。FAQ 同步保留／新增免費試上課 30 分鐘、團體班成人限定、3 人即開班與最多 3 人的規則，以及鋼琴學習相關問題；移除吉他、樂團、歌唱的年齡與課程說明。

- [ ] **Step 3: 加入空的學生作品資料**

在 `site` 中加入 `"studentShowcase": []`，不填入虛構 title、影片、音檔或雲端 URL。

- [ ] **Step 4: 執行租戶與知識庫測試**

Run: `npm test -- --run tests/tenant-fixtures.test.ts tests/knowledge.test.ts`

Expected: PASS，且 `demo-music` 通過租戶驗證，知識庫不含吉他、樂團、歌唱舊內容。

- [ ] **Step 5: Commit tenant content**

```bash
git add tenants/demo-music.json
git commit -m "content: update Na Mo music courses"
```

### Task 5: 全量驗證與產出 demo-music HTML

**Files:**
- Modify: `dist/demo-music/index.html` (generated by build; do not edit manually)

**Interfaces:**
- Consumes: Tasks 1–4 的測試、renderer、知識庫與租戶資料。
- Produces: 可部署的 `dist/demo-music/index.html`，以及可核對的驗證輸出。

- [ ] **Step 1: 執行型別檢查與完整測試**

Run: `npm run typecheck && npm test`

Expected: typecheck 無錯誤，Vitest 全部 PASS。

- [ ] **Step 2: 重新建置所有 demo**

Run: `npm run build`

Expected: build 成功；只檢查 `dist/demo-music/index.html` 的本次內容。

- [ ] **Step 3: 核對產出內容與舊文案清除**

Run: `rg -n "那莫 好聽|吉他|樂團|歌唱|雲端成發|學生作品整理中|鋼琴一對一|NT\\$3,600|NT\\$450|營業時間|#hours" tenants/demo-music.json src tests dist/demo-music`

Expected: 找到「那莫好聽」、更新後課程、價格與「雲端成發」；不應找到吉他、樂團、歌唱或官網營業時間區塊。租戶內保留的營業時間資料是刻意設計，不視為錯誤。

- [ ] **Step 4: 執行 diff 檢查與確認產出標記**

Run: `git diff --check`，再執行 `grep -n '那莫好聽\\|student-showcase\\|雲端成發\\|0907459987' dist/demo-music/index.html`

Expected: `git diff --check` 無輸出；產出 HTML 含品牌名稱、`student-showcase`、雲端成發與正確電話。

- [ ] **Step 5: Commit generated output**

```bash
git add dist/demo-music/index.html
git commit -m "build: regenerate Na Mo music site"
```
