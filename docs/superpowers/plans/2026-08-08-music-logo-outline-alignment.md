# Music Logo Outline And Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保留完整右樹枝獨立素材，校正三顆音符至原圖座標，並替樹枝、音符與小鳥加入一致的暖白外框。

**Architecture:** 將未加工 PNG 放在 `assets/music-logo/source/`，由單一 Sharp 生成腳本輸出網站實際使用的透明 PNG 與 `combined.png`。完整右樹枝在合成時放在圓環後方，由圓環本身遮住上半部，不建立裁切版；素材測試直接檢查透明像素、音符色塊邊界與暖白外框。

**Tech Stack:** Node.js ESM、Sharp、TypeScript、Vitest、既有靜態網站生成器。

## Global Constraints

- 所有素材使用 758 × 758 透明 PNG。
- `forest-right.png` 與 `combined.png` 都必須保留完整樹枝，不能預先或合成時裁掉上半部；完成圖由圓環圖層遮擋上半部。
- `forest-left.png`、`forest-right.png`、`bird.png`、`notes.png` 使用 6px、`#fff7e8` 暖白外框。
- 音符色塊邊界依序為 `199–248 / 313–379`、`566–630 / 137–218`、`633–694 / 195–278`。
- 音符維持最高圖層；完成畫面只顯示 `combined.png`。
- 只修改 `demo-music`，不改其他 demo。

---

### Task 1: 建立素材回歸測試

**Files:**
- Create: `tests/music-logo-assets.test.ts`
- Test: `assets/music-logo/forest-right.png`
- Test: `assets/music-logo/forest-left.png`
- Test: `assets/music-logo/bird.png`
- Test: `assets/music-logo/notes.png`

**Interfaces:**
- Consumes: Sharp 讀取 PNG metadata 與原始 RGBA buffer。
- Produces: 素材完整度、暖白外框與音符座標的自動驗證。

- [ ] **Step 1: 寫出目前會失敗的素材測試**

```ts
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const asset = (name: string) => path.resolve('assets/music-logo', name);

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
```

`tealComponentBounds()` 以 4 向連通元件分析藍綠色實體像素，按 `minX` 排序後回傳三組邊界；colored-body mask 保留所有 alpha 大於 0 的原色像素，外框測試只把 RGB 完全符合目標色的像素視為白框。

- [ ] **Step 2: 執行測試並確認正確失敗**

Run: `npx vitest run tests/music-logo-assets.test.ts`

Expected: FAIL；目前右枝上半部沒有不透明像素、素材沒有 `#fff7e8` 外框、音符邊界也不符合參考圖。

- [ ] **Step 3: 提交失敗測試**

```bash
git add tests/music-logo-assets.test.ts
git commit -m "test: define music logo asset alignment"
```

### Task 2: 建立可重複的 Logo 素材生成流程

**Files:**
- Create: `scripts/generate-music-logo-assets.mjs`
- Create: `assets/music-logo/source/forest-left.png`
- Create: `assets/music-logo/source/forest-right.png`
- Create: `assets/music-logo/source/bird.png`
- Create: `assets/music-logo/source/notes.png`
- Modify: `tests/music-logo-assets.test.ts`
- Modify: `assets/music-logo/forest-left.png`
- Modify: `assets/music-logo/forest-right.png`
- Modify: `assets/music-logo/bird.png`
- Modify: `assets/music-logo/notes.png`
- Modify: `assets/music-logo/combined.png`

**Interfaces:**
- Consumes: 四張 758 × 758 未描邊透明 PNG，以及既有 `ring.png`、`microphone.png`。
- Produces: `addOutline(input, radius, color)`、`placeNotes(input)`、`buildCombined(layers)` 及五張可直接部署的 PNG。

- [ ] **Step 1: 保存未加工來源並恢復完整右樹枝**

將目前未描邊的左枝、小鳥與音符複製到 `assets/music-logo/source/`；從 commit `8bca6e0` 取回完整、未裁切的 `forest-right.png` 作為來源。所有來源檔都維持透明背景與 758 × 758 畫布。

- [ ] **Step 2: 實作暖白外框**

```js
const OUTLINE = { radius: 6, rgb: [255, 247, 232] };

export async function addOutline(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const dilated = dilateAlpha(data, info.width, info.height, OUTLINE.radius);
  const outlined = paintOutlineUnderOriginal(data, dilated, info, OUTLINE.rgb);
  return sharp(outlined, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}
```

`dilateAlpha()` 使用水平、垂直兩次最大值擴張；`paintOutlineUnderOriginal()` 只在原圖 alpha 外側填入暖白色，最後把原圖像素覆蓋回去，避免改變原本顏色。

- [ ] **Step 3: 分離並重排三顆音符**

```js
const NOTE_TARGETS = [
  { left: 199, top: 313, width: 50, height: 67 },
  { left: 566, top: 137, width: 65, height: 82 },
  { left: 633, top: 195, width: 62, height: 84 },
];
```

依來源音符 alpha 的三個 4 向連通元件裁切，按目前位置判定左側、右上第一顆與右上第二顆，分別 resize 至目標大小後合成到透明畫布，再對整張 `notes.png` 加暖白外框。

- [ ] **Step 4: 生成完整獨立元件與裁切後完成圖**

`forest-left.png`、`forest-right.png`、`bird.png` 直接由完整來源加框，並保留來源所有可見 alpha 像素。建立 `combined.png` 時依序合成：完整右枝、圓環、麥克風、小鳥、左枝與音符；右枝不套遮罩，圓環負責遮住上半部，音符最後合成。同步將素材測試的 colored-body 定義改為保留所有 alpha 大於 0 的原色像素。

- [ ] **Step 5: 執行生成器與素材測試**

Run: `node scripts/generate-music-logo-assets.mjs`

Run: `npx vitest run tests/music-logo-assets.test.ts`

Expected: PASS；右枝完整、四種素材含暖白外框、三顆音符邊界符合目標。

- [ ] **Step 6: 提交素材生成流程**

```bash
git add scripts/generate-music-logo-assets.mjs tests/music-logo-assets.test.ts assets/music-logo/source assets/music-logo/forest-left.png assets/music-logo/forest-right.png assets/music-logo/bird.png assets/music-logo/notes.png assets/music-logo/combined.png
git commit -m "feat: align outlined music logo assets"
```

### Task 3: 讓動畫使用校正後音符座標

**Files:**
- Modify: `tests/site-render.test.ts`
- Modify: `src/site/render.ts`
- Modify: `dist/demo-music/index.html`

**Interfaces:**
- Consumes: 已校正座標的 `notes.png` 與完整右枝置於圓環後方的合成素材。
- Produces: 音符最終 transform 為 `translateY(0) scale(1)`，不再把整組縮成 92%。

- [ ] **Step 1: 先增加會失敗的 render 測試**

```ts
expect(musicHtml).toContain('@keyframes music-logo-notes');
expect(musicHtml).toContain('transform:translateY(0) scale(1)');
expect(musicHtml).not.toContain('transform:translateY(0) scale(.92)');
expect(musicHtml).toContain('.music-logo-layer-forest-right{z-index:0;');
```

- [ ] **Step 2: 確認測試因舊縮放值失敗**

Run: `npx vitest run tests/site-render.test.ts`

Expected: FAIL，因為目前完成影格仍使用 `scale(.92)`。

- [ ] **Step 3: 修改音符動畫完成影格**

在 `src/site/render.ts` 的 `@keyframes music-logo-notes` 保留入場 `scale(.78)`，只把 100% 完成狀態改為 `transform:translateY(0) scale(1)`；維持 `z-index:8`，並將完整右枝的動畫圖層設為 `z-index:0`，讓圓環覆蓋其上半部。

- [ ] **Step 4: 驗證並重建網站**

Run: `npx vitest run tests/site-render.test.ts`

Run: `npm run build`

Expected: render 測試通過，`dist/demo-music/index.html` 包含新 transform 與新素材。

- [ ] **Step 5: 提交頁面更新**

```bash
git add src/site/render.ts tests/site-render.test.ts dist/demo-music/index.html
git commit -m "fix: use exact music note placement"
```

### Task 4: 完整驗證與部署

**Files:**
- Verify: `assets/music-logo/*.png`
- Verify: `dist/demo-music/index.html`

**Interfaces:**
- Consumes: 前三個任務的素材與頁面輸出。
- Produces: 通過測試且部署到 GitHub Pages 的音樂網站。

- [ ] **Step 1: 執行完整自動驗證**

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: 全部 exit 0；沒有非音樂 demo 的意外差異。

- [ ] **Step 2: 在本機瀏覽器檢查桌機與 390 × 844 手機尺寸**

確認右樹枝動畫顯示完整元件、最後畫面只顯示裁切後合成圖、三顆音符位置符合原圖、暖白外框清楚但不厚重、無橫向溢出及 console error。

- [ ] **Step 3: 推送並等待 Pages 部署**

```bash
git push origin main
logo_deploy_run_id=$(gh run list --workflow deploy-pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$logo_deploy_run_id" --exit-status
```

- [ ] **Step 4: 驗證線上版本**

以 cache-busted GitHub Pages URL 檢查桌機及手機版，確認最後圖層 opacity、音符 z-index、頁面 overflow 與 console logs。
