# 音樂課程時長與價格換行 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓音樂版團體班顯示每堂 50 分鐘，並讓一對一初階、進階、高階價格在畫面上各自換行。

**Architecture:** `tenants/demo-music.json` 維持內容唯一來源，使用換行字串表達需要分行的價格資訊。`src/site/render.ts` 只在 `data-variant=music` 的價格與展示資訊區塊啟用 `white-space: pre-line`，因此其他 demo 不會改變。

**Tech Stack:** TypeScript、Vitest、單檔 HTML 產生器、內嵌 CSS、GitHub Pages 部署。

## Global Constraints

- `tenants/demo-music.json` 仍是唯一內容來源。
- 團體班保留「兒童班、成人班、樂齡班」與「3人即開班，最多3人」資訊。
- 其他網站版型與既有價格顯示不受影響。
- 不新增依賴、不使用外部資源、不直接手改生成後的 dist 檔案。
- 完成前必須通過 `npm run typecheck`、`npm test`、`npm run build` 與 `git diff --check`。

---

### Task 1: 建立價格與團班時長的回歸測試

**Files:**
- Modify: `tests/knowledge.test.ts`，更新音樂課程資料的預期文字
- Modify: `tests/site-render.test.ts`，新增音樂版課程資訊的 HTML 與換行樣式斷言

**Interfaces:**
- Consumes: `loadTenant('demo-music')`、`buildKnowledge()`、`renderSite()`。
- Produces: 能在資料與渲染尚未更新時失敗的測試，鎖定團班 50 分鐘與三段價格換行需求。

- [ ] **Step 1: 更新知識庫測試，先要求新的資料內容**

在 `tests/knowledge.test.ts` 的音樂課程測試中，將一對一價格預期改為含換行的三段文字，並加入：

```ts
expect(knowledge).toContain('初階 NT$900／堂\n進階 NT$1,200／堂\n高階 NT$1,500／堂');
expect(knowledge).toContain('團班類別｜流行與古典');
expect(knowledge).toContain('每堂 50 分鐘');
expect(loadTenant('demo-music').site?.showcase?.find((item) => item.title === '團班類別')?.meta)
  .toContain('每堂 50 分鐘');
```

- [ ] **Step 2: 新增渲染回歸測試**

在 `tests/site-render.test.ts` 加入測試，要求音樂版輸出：

```ts
it('音樂版團班顯示 50 分鐘，級別價格以換行呈現', () => {
  const html = renderSite(loadTenant('demo-music'));

  expect(html).toContain('<span class="svc-duration">每堂 50 分鐘</span>');
  expect(html).toContain('初階 NT$900／堂\n進階 NT$1,200／堂\n高階 NT$1,500／堂');
  expect(html).toContain('每堂 50 分鐘\nNT$450／人／堂');
  expect(html).toMatch(/body\[data-variant=music\] \.svc-price\{[^}]*white-space:pre-line/);
  expect(html).toContain('.variant-music .showcase-meta{white-space:pre-line');
});
```

- [ ] **Step 3: 執行針對性測試，確認是預期的 RED**

Run: `npm test -- tests/knowledge.test.ts tests/site-render.test.ts`

Expected: FAIL，失敗原因是現有團班資料尚未含「每堂 50 分鐘」，且現有渲染 CSS 尚未啟用價格換行；不得因 TypeScript 或測試語法錯誤失敗。

- [ ] **Step 4: Commit the failing tests**

```bash
git add tests/knowledge.test.ts tests/site-render.test.ts
git commit -m "test: cover music class duration and tier line breaks"
```

### Task 2: 更新音樂課程資料

**Files:**
- Modify: `tenants/demo-music.json:18-20`，更新一對一價格與團班時長
- Modify: `tenants/demo-music.json:40-41`，更新課程方式展示資訊

**Interfaces:**
- Consumes: Task 1 的資料與渲染回歸測試。
- Produces: `loadTenant('demo-music')` 可讀取的換行價格與團班 50 分鐘資訊。

- [ ] **Step 1: 將一對一價格改為三行資料**

把服務價格改成：

```json
"price": "初階 NT$900／堂\n進階 NT$1,200／堂\n高階 NT$1,500／堂"
```

- [ ] **Step 2: 將團班服務時長改為每堂 50 分鐘**

保留原本描述中的開班規則，將團班服務的 `duration` 設為：

```json
"duration": "每堂 50 分鐘"
```

- [ ] **Step 3: 同步課程方式展示資訊**

將一對一展示 `meta` 改為：

```json
"meta": "每堂 50 分鐘\n初階 NT$900\n進階 NT$1,200\n高階 NT$1,500"
```

將團班展示 `meta` 改為：

```json
"meta": "每堂 50 分鐘\nNT$450／人／堂"
```

- [ ] **Step 4: 先跑資料與渲染測試，確認仍只差 CSS**

Run: `npm test -- tests/knowledge.test.ts tests/site-render.test.ts`

Expected: 資料相關斷言通過；只剩音樂版價格換行 CSS 斷言失敗。

- [ ] **Step 5: Commit the content update**

```bash
git add tenants/demo-music.json
git commit -m "content: add group class duration and tier line breaks"
```

### Task 3: 以音樂版專用 CSS 呈現換行價格

**Files:**
- Modify: `src/site/render.ts:179`，在音樂版價格與展示資訊樣式加入換行規則

**Interfaces:**
- Consumes: Task 2 的換行字串。
- Produces: `renderSite()` 產生的音樂版 HTML 會保留資料中的換行；其他 variant 不套用該樣式。

- [ ] **Step 1: 加入最小音樂版換行樣式**

在既有音樂版樣式中加入：

```css
body[data-variant=music] .svc-price{white-space:pre-line}
.variant-music .showcase-meta{white-space:pre-line;line-height:1.8}
```

保留既有價格徽章的顏色、字級與間距，只增加換行行為。

- [ ] **Step 2: 執行針對性測試確認 GREEN**

Run: `npm test -- tests/knowledge.test.ts tests/site-render.test.ts`

Expected: 通過，且輸出沒有測試錯誤或警告。

- [ ] **Step 3: Commit the rendering update**

```bash
git add src/site/render.ts
git commit -m "style: stack music tier prices"
```

### Task 4: 全量驗證、建置與部署

**Files:**
- Generated: `dist/demo-music/index.html`，由建置流程產生並部署
- Do not modify: 其他 demo 的生成檔，若建置造成無關差異則以既有 HEAD 還原

**Interfaces:**
- Consumes: Task 3 的資料與渲染程式。
- Produces: 通過測試的音樂版靜態頁面、已推送的 GitHub Pages 部署。

- [ ] **Step 1: 執行完整品質檢查**

Run:

```bash
npm run typecheck
npm test
npm run build
git diff --check
```

Expected: TypeScript、所有 Vitest 測試、建置與 whitespace 檢查皆以 exit code 0 完成。

- [ ] **Step 2: 檢查生成內容並還原無關 dist 差異**

Run:

```bash
rg -n '每堂 50 分鐘|初階 NT\$900／堂|進階 NT\$1,200／堂|高階 NT\$1,500／堂|white-space:pre-line' dist/demo-music/index.html
git diff -- dist
```

Expected: 音樂版生成檔包含新內容與換行 CSS；只保留 `dist/demo-music/index.html` 的必要差異。

- [ ] **Step 3: Commit、推送並等待部署**

```bash
git add src/site/render.ts tenants/demo-music.json tests/knowledge.test.ts tests/site-render.test.ts dist/demo-music/index.html
git commit -m "feat: refine music course pricing layout"
git push origin main
gh run list --workflow deploy-pages.yml --limit 1 --json databaseId,status,conclusion,headSha,url
MUSIC_DEPLOY_RUN_ID="$(gh run list --workflow deploy-pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run watch "$MUSIC_DEPLOY_RUN_ID" --exit-status
```

Expected: `deploy-pages.yml` 對應最新 commit 成功完成。

- [ ] **Step 4: 做線上內容驗證**

Run:

```bash
MUSIC_DEPLOY_REV="$(git rev-parse --short HEAD)"
curl -sS -o /tmp/demo-music-live-duration.html -w 'HTTP %{http_code}\n' "https://xpdai.github.io/oakit/demo-music/index.html?rev=$MUSIC_DEPLOY_REV"
rg -o '每堂 50 分鐘|初階 NT\$900／堂|進階 NT\$1,200／堂|高階 NT\$1,500／堂' /tmp/demo-music-live-duration.html | sort | uniq -c
git status --short --branch
```

Expected: HTTP 200，線上頁面有團班 50 分鐘與三段價格文字，且 git working tree clean、分支與 origin/main 同步。
