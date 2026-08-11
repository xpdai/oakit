# 那莫好聽付款與上課規則 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 demo-music 新增付款與報名上課須知頁面，並將請假／補課規則只加入 LINE 知識庫。

**Architecture:** 在 `Tenant` 增加可選的結構化付款資料與知識庫專用 FAQ。網站 renderer 只讀付款資料，並在課程價格後輸出獨立付款區塊；`buildKnowledge` 同時讀付款資料與 `knowledgeFaq`，既有網站 FAQ 不會吸收知識庫專用內容。

**Tech Stack:** TypeScript、JSON tenant 設定、Vitest、單檔 HTML/CSS renderer、GitHub Pages deployment。

## Global Constraints

- 付款區塊只顯示在 `demo-music` 音樂版，其他 Demo 不得出現。
- 網站只顯示付款方式與報名／上課須知；請假／補課規則只能進入 `buildKnowledge` 結果。
- 沿用現有米色、深棕色、音樂版進場效果與響應式斷點，不引入新依賴。
- 價格文字使用使用者提供的三級內容：初階 $3,600／期（$900／堂）、進階 $4,800／期（$1,200／堂）、高階 $7,200／期（$1,800／堂）。
- 每個實作步驟都要先有會失敗的測試，再寫最小 production code。

---

### Task 1: 擴充租戶付款與知識庫資料模型

**Files:**
- Modify: `src/tenant.ts`（新增 `PaymentPlan`、`PaymentPolicy`、`Tenant.payment`、`Tenant.knowledgeFaq`）
- Modify: `tenants/demo-music.json`（填入付款資料與請假／補課知識庫 FAQ）
- Test: `tests/tenant.test.ts`、`tests/knowledge.test.ts`

**Interfaces:**
- Produces `Tenant.payment?: PaymentPolicy`，其中包含 `method: string`、`cycleNote: string`、`plans: PaymentPlan[]`、`enrollmentNotes: string[]`。
- Produces `Tenant.knowledgeFaq?: Faq[]`，只供知識庫輸出，不供網站 FAQ renderer 使用。

- [ ] **Step 1: Write the failing tests**

在 `tests/tenant.test.ts` 增加 demo-music 設定驗證：

```ts
it('那莫好聽包含付款週期與三級期費', () => {
  const tenant = loadTenant('demo-music');

  expect(tenant.payment).toEqual({
    method: '轉帳或現金',
    cycleNote: '本院採「預付月繳制」（每期以 4 堂課為單位），依學員學習程度劃分：',
    plans: [
      { level: '初階課程', periodPrice: '$3,600', lessonPrice: '$900' },
      { level: '進階課程', periodPrice: '$4,800', lessonPrice: '$1,200' },
      { level: '高階課程', periodPrice: '$7,200', lessonPrice: '$1,800' },
    ],
    enrollmentNotes: [
      '為維護教學品質與權益，本院採預付報名制，請於開課前完成全額繳費。',
      '每次繳費以 4 堂課為一期，於第 4 堂課結束時續繳下一期學費。',
    ],
  });
});
```

在 `tests/knowledge.test.ts` 增加請假／補課規則存在於 `knowledgeFaq` 的檢查，並確認網站用的 `tenant.faq` 沒有這三項規則。

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/tenant.test.ts tests/knowledge.test.ts -t '付款週期|請假'`

Expected: FAIL because `Tenant` has no `payment` or `knowledgeFaq` data yet.

- [ ] **Step 3: Write the minimal implementation**

在 `src/tenant.ts` 加入：

```ts
export interface PaymentPlan {
  level: string;
  periodPrice: string;
  lessonPrice: string;
}

export interface PaymentPolicy {
  method: string;
  cycleNote: string;
  plans: PaymentPlan[];
  enrollmentNotes: string[];
}
```

在 `Tenant` 加入 `payment?: PaymentPolicy;` 與 `knowledgeFaq?: Faq[];`，再把對應 JSON 寫入 `tenants/demo-music.json`。請假／補課內容使用三筆明確問答：請假時間、補課期限、無故缺席。

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/tenant.test.ts tests/knowledge.test.ts -t '付款週期|請假'`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/tenant.ts tenants/demo-music.json tests/tenant.test.ts tests/knowledge.test.ts
git commit -m "feat: add music payment policy data"
```

### Task 2: 將付款與知識庫專用規則輸出到正確位置

**Files:**
- Modify: `src/knowledge.ts`（輸出付款與 `knowledgeFaq`）
- Modify: `tests/knowledge.test.ts`

**Interfaces:**
- Consumes: `Tenant.payment` 與 `Tenant.knowledgeFaq`。
- Produces: `buildKnowledge(t)` 中的「付款方式與上課須知」及「知識庫補充」段落。

- [ ] **Step 1: Write the failing tests**

在 `tests/knowledge.test.ts` 增加：

```ts
it('把付款方式與請假補課規則放進 LINE 知識庫', () => {
  const knowledge = buildKnowledge(loadTenant('demo-music'));

  expect(knowledge).toContain('付款方式：轉帳或現金');
  expect(knowledge).toContain('$3,600／期（$900／堂）');
  expect(knowledge).toContain('請最晚於課前 2 小時前告知');
  expect(knowledge).toContain('請於 30 天內完成補課');
  expect(knowledge).toContain('該堂課將視同已授課');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/knowledge.test.ts -t '付款方式與請假補課'`

Expected: FAIL because `buildKnowledge` does not yet read either new field.

- [ ] **Step 3: Write minimal implementation**

在 `buildKnowledge` 的服務與價格段落後加入付款輸出，逐項輸出付款級距與報名須知；在既有 FAQ 段落後加入：

```ts
if (t.knowledgeFaq?.length) {
  lines.push('## 知識庫補充');
  for (const f of t.knowledgeFaq) {
    lines.push(`Q：${f.q}`);
    lines.push(`A：${f.a}`);
    lines.push('');
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/knowledge.test.ts -t '付款方式與請假補課'`

Expected: PASS，且既有價格與 LINE 回覆測試仍通過。

- [ ] **Step 5: Commit**

```bash
git add src/knowledge.ts tests/knowledge.test.ts
git commit -m "feat: include music payment rules in knowledge"
```

### Task 3: 在音樂版網站新增付款與報名須知區塊

**Files:**
- Modify: `src/site/variants.ts`（新增 `renderMusicPaymentPolicy`）
- Modify: `src/site/render.ts`（導覽、區塊插入、付款區塊 CSS）
- Modify: `tests/site-render.test.ts`

**Interfaces:**
- Consumes: `Tenant.payment`。
- Produces: `<section id="payment">`，位於課程區塊後、`student-showcase` 前；其他版型不輸出。

- [ ] **Step 1: Write the failing tests**

在 `tests/site-render.test.ts` 增加：

```ts
it('音樂版在課程與雲端成發之間顯示付款須知', () => {
  const musicHtml = renderSite(loadTenant('demo-music'));
  const petHtml = renderSite(makeTenant('pet'));
  const courseIndex = musicHtml.indexOf('<section class="variant variant-music');
  const paymentIndex = musicHtml.indexOf('<section id="payment"');
  const showcaseIndex = musicHtml.indexOf('<section id="student-showcase"');

  expect(courseIndex).toBeLessThan(paymentIndex);
  expect(paymentIndex).toBeLessThan(showcaseIndex);
  expect(musicHtml).toContain('付款方式');
  expect(musicHtml).toContain('轉帳或現金');
  expect(musicHtml).toContain('$7,200／期（$1,800／堂）');
  expect(musicHtml).toContain('報名與上課須知');
  expect(musicHtml).not.toContain('請最晚於課前 2 小時前告知');
  expect(musicHtml).not.toContain('補課期限');
  expect(petHtml).not.toContain('id="payment"');
});
```

另驗證導覽有 `href="#payment">付款須知</a>`，且付款區塊使用現有音樂版 class／responsive CSS。

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/site-render.test.ts -t '付款須知'`

Expected: FAIL because no payment section or payment navigation exists.

- [ ] **Step 3: Write minimal implementation**

在 `src/site/variants.ts` 新增 `renderMusicPaymentPolicy(t)`：

- `t.site?.variant !== 'music'` 或沒有 `t.payment` 時回傳空字串。
- 用 `escapeHtml` 輸出付款方式、週期說明、三張付款級距卡與兩項報名須知。
- 使用 `<section id="payment" class="music-payment music-motion-section">`，不使用翻牌結構。

在 `src/site/render.ts`：

- import `renderMusicPaymentPolicy`。
- 音樂版導覽在課程後加入付款須知連結。
- 在 `${renderVariantSections(t)}` 後、`${renderStudentShowcase(t)}` 前插入付款區塊。
- 加入三欄桌面、單欄手機的 `.music-payment` CSS，使用現有色彩和區塊進場效果。

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/site-render.test.ts -t '付款須知'`

Expected: PASS，其他既有音樂版區塊順序與導覽測試也通過。

- [ ] **Step 5: Commit**

```bash
git add src/site/variants.ts src/site/render.ts tests/site-render.test.ts
git commit -m "feat: add music payment policy section"
```

### Task 4: 完整驗證與部署

**Files:**
- Modify: `dist/demo-music/index.html`（由 build 產生）

- [ ] **Step 1: Run the full verification suite**

Run: `npm test && npm run typecheck && npm run build && git diff --check`

Expected: 所有測試通過、型別檢查成功、build 成功、沒有 diff whitespace 錯誤。

- [ ] **Step 2: Restore unrelated generated files**

```bash
git restore --worktree -- dist/demo-bistro/index.html dist/demo-interior/index.html dist/demo-pet/index.html dist/oakit/index.html
```

- [ ] **Step 3: Inspect the generated music page**

確認 `dist/demo-music/index.html` 包含付款區塊、導覽連結與三級期費，且不包含請假／補課文字。

- [ ] **Step 4: Commit and deploy**

```bash
git add dist/demo-music/index.html
git commit -m "build: update music demo payment policy"
git push origin main
gh run list --repo xpdai/oakit --workflow 'Deploy demo sites' --limit 1 --json databaseId,status,conclusion,headSha,url
RUN_ID="$(gh run list --repo xpdai/oakit --workflow 'Deploy demo sites' --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run watch "$RUN_ID" --repo xpdai/oakit --exit-status
```

- [ ] **Step 5: Verify responsive layout in the live page**

使用桌面寬度確認付款區塊為三欄、手機寬度確認為單欄，並確認：

- `#payment` 位於課程後、雲端成發前。
- 付款文字完整顯示。
- 網站沒有請假／補課規則。
- LINE knowledge output 有請假／補課規則。
- 沒有水平溢出、console error 或 warning。
