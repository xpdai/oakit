# Music Logo Outline And Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保留完整右樹枝獨立素材，校正三顆音符至原圖座標，並替樹枝、音符與小鳥加入一致的暖白外框。

**Architecture:** 將未加工 PNG 放在 `assets/music-logo/source/`，由單一 Sharp 生成腳本輸出網站實際使用的透明 PNG 與 `combined.png`。完整右樹枝在合成時放在圓環後方，由圓環本身遮住上半部，不建立裁切版；素材測試直接檢查透明像素、音符色塊邊界與暖白外框。

**Tech Stack:** Node.js ESM、Sharp、TypeScript、Vitest、既有靜態網站生成器。

## Global Constraints

- 所有素材使用 758 × 758 透明 PNG。
- `forest-right.png` 與 `combined.png` 都必須保留完整樹枝，不能預先或合成時裁掉上半部；完成圖由圓環圖層遮擋上半部。
- `forest-left.png`、`forest-right.png`、`bird.png`、`notes.png` 使用 6px、`#fff7e8` 暖白外框。
- `ring.png` 內圈必須透明，不得保留白色填色。
- 音符色塊邊界依序為 `62–111 / 166–233`、`565–629 / 44–125`、`666–727 / 176–259`，且不得與其他 Logo 元件重疊。
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

### Task 3: 讓動畫使用校正後音符座標與右枝遮擋

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

### Task 4: 對調音樂首頁的雲端成發與服務區塊

**Files:**
- Modify: `tests/site-render.test.ts`
- Modify: `src/site/render.ts`
- Modify: `dist/demo-music/index.html`

**Interfaces:**
- Consumes: 既有 `renderStudentShowcase(t)` 與 `services` HTML。
- Produces: 音樂首頁 `<section id="services">` 出現在 `<section id="student-showcase">` 之前；其他 demo 區塊順序維持不變。

- [ ] **Step 1: 先增加會失敗的順序測試**

```ts
const servicesIndex = html.indexOf('<section id="services"');
const showcaseIndex = html.indexOf('<section id="student-showcase"');
expect(servicesIndex).toBeGreaterThan(-1);
expect(showcaseIndex).toBeGreaterThan(-1);
expect(servicesIndex).toBeLessThan(showcaseIndex);
```

- [ ] **Step 2: 確認舊順序測試失敗**

Run: `npx vitest run tests/site-render.test.ts`

Expected: FAIL，因為目前雲端成發先於服務區塊輸出。

- [ ] **Step 3: 調整音樂版 main 區塊輸出順序**

在 `src/site/render.ts` 將音樂版的 `services` section 移到 `renderStudentShowcase(t)` 之前；保留 `renderVariantSections(t)`、FAQ 與聯絡區塊的既有順序，非音樂 variant 不改變。

- [ ] **Step 4: 驗證並重建網站**

Run: `npx vitest run tests/site-render.test.ts`

Run: `npm run build`

Expected: 音樂版順序測試通過，其他 render 測試也通過。

- [ ] **Step 5: 提交區塊順序更新**

```bash
git add src/site/render.ts tests/site-render.test.ts dist/demo-music/index.html
git commit -m "fix: reorder music showcase and services"
```

### Task 5: 圓環內圈去背與外圍音符定位

**Files:**
- Create: `assets/music-logo/source/ring.png`
- Modify: `tests/music-logo-assets.test.ts`
- Modify: `scripts/generate-music-logo-assets.mjs`
- Modify: `assets/music-logo/ring.png`
- Modify: `assets/music-logo/notes.png`
- Modify: `assets/music-logo/combined.png`

**Interfaces:**
- Consumes: 完整未加工 `ring.png` 與目前三顆音符來源。
- Produces: 透明內圈的圓環、位於圓環外且不與主體重疊的三顆音符，以及同步更新的完成合成圖。

- [ ] **Step 1: 先增加會失敗的素材測試**

```ts
expect(await innerRingOpaquePixels(asset('ring.png'))).toBe(0);
expect(await tealComponentBounds(asset('notes.png'))).toEqual([
  { minX: 62, maxX: 111, minY: 166, maxY: 233 },
  { minX: 565, maxX: 629, minY: 44, maxY: 125 },
  { minX: 666, maxX: 727, minY: 176, maxY: 259 },
]);
expect(await noteBodyOverlapCount(asset('notes.png'), asset('ring.png'))).toBe(0);
```

- [ ] **Step 2: 確認舊素材測試失敗**

Run: `npx vitest run tests/music-logo-assets.test.ts`

Expected: FAIL，因為目前圓環內圈仍有不透明填色，音符仍在舊座標。

- [ ] **Step 3: 生成透明內圈與外圍音符**

在生成器中保存未加工 `ring.png`，以圓環內徑遮罩清除內圈 alpha；將 `NOTE_TARGETS` 更新為新的三組外圍座標，重新生成音符、所有描邊素材與 `combined.png`。保留完整右枝位於圓環後方的合成順序。

- [ ] **Step 4: 執行素材測試與完整測試**

Run: `node scripts/generate-music-logo-assets.mjs`

Run: `npx vitest run tests/music-logo-assets.test.ts`

Run: `npm test`

Expected: 素材測試與完整測試全部通過。

- [ ] **Step 5: 提交 Logo 素材校正**

```bash
git add tests/music-logo-assets.test.ts scripts/generate-music-logo-assets.mjs assets/music-logo/source/ring.png assets/music-logo/ring.png assets/music-logo/notes.png assets/music-logo/combined.png
git commit -m "fix: clear logo center and move notes outside"
```

### Task 6: 完整驗證與部署

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

### Task 7: 對齊動畫與最後合成圖比例

**Files:**
- Modify: `src/site/render.ts`
- Modify: `tests/site-render.test.ts`
- Verify: `dist/demo-music/index.html`

**Interfaces:**
- Consumes: 動畫元件目前的 CSS transform 與 `combined.png` 最後定格圖。
- Produces: 動畫最後圓環與合成圖保持一致比例，不在切換時縮小或跳動。

- [ ] **Step 1: 先增加會失敗的比例回歸測試**

確認最後合成圖的 CSS 必須沿用圓環動畫完成時的 `scale(1.05)`，並保留動畫層淡出與最後圖層淡入的行為。

- [ ] **Step 2: 確認舊 CSS 測試失敗**

Run: `npx vitest run tests/site-render.test.ts`

Expected: FAIL，因為 `.music-logo-final` 目前沒有與圓環動畫一致的完成比例。

- [ ] **Step 3: 對齊最後定格比例**

在最後合成圖套用與圓環完成狀態相同的 `scale(1.05)`，以同一個中心點縮放，不改變音符與其他元件在合成圖內的相對位置；同步確認手機版不產生頁面橫向溢出。

- [ ] **Step 4: 驗證與部署**

Run: `npx vitest run tests/site-render.test.ts`

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

Run: `git diff --check`

Expected: 全部通過，只有 `dist/demo-music/index.html` 需要同步時保留，其他 demo 輸出還原；推送後 GitHub Pages 部署成功。

- [ ] **Step 5: 提交比例修正**

```bash
git add src/site/render.ts tests/site-render.test.ts dist/demo-music/index.html
git commit -m "fix: keep final music logo scale"
```

### Task 8: 依原始參考圖校正 Logo 元件比例與位置

**Files:**
- Modify: `scripts/generate-music-logo-assets.mjs`
- Modify: `src/site/render.ts`
- Modify: `tests/music-logo-assets.test.ts`
- Modify: `tests/site-render.test.ts`
- Verify: `assets/music-logo/combined.png`, `dist/demo-music/index.html`

**Interfaces:**
- Consumes: `assets/na-mo-logo.jpg` 作為構圖參考，以及目前獨立 Logo 元件。
- Produces: 左右樹枝、小鳥、圓圈、麥克風與音符維持原始相對比例與位置；動畫收尾與最後合成圖一致。

- [ ] **Step 1: 先增加會失敗的構圖回歸測試**

測試合成圖的主要元件 alpha bounds 與目前參考圖的相對位置：左枝在圓圈外、右枝在圓圈後方且尾巴露出，小鳥位於圓圈右側；同時測試最後圖層不再額外套用與原圖不一致的整體放大。

- [ ] **Step 2: 依參考圖重建合成位置**

在生成器中以既有 758 × 758 畫布對樹枝與小鳥做等比例縮放及平移，不拉伸、不裁切；合成順序維持完整右樹枝 → 圓圈 → 麥克風 → 小鳥 → 左樹枝 → 音符。圓圈、麥克風、小鳥與音符各自維持原始比例。

- [ ] **Step 3: 讓動畫完成狀態對齊合成圖**

同步調整 CSS 動畫最後的 translate/scale，使各獨立圖層在淡出前與 `combined.png` 的相對位置一致；移除造成圓圈或整體 Logo 跳動的額外 `scale(1.05)`。

- [ ] **Step 4: 驗證、建置與部署**

Run: `node scripts/generate-music-logo-assets.mjs`

Run: `npx vitest run tests/music-logo-assets.test.ts tests/site-render.test.ts`

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

Run: `git diff --check`

Expected: 素材、render、完整測試與部署均通過；手機頁面根節點不橫向溢出，其他 demo 的 dist 差異還原。

- [ ] **Step 5: 提交構圖校正**

```bash
git add scripts/generate-music-logo-assets.mjs src/site/render.ts tests/music-logo-assets.test.ts tests/site-render.test.ts assets/music-logo/combined.png dist/demo-music/index.html
git commit -m "fix: align music logo composition"
```

### Task 9: 將麥克風縮入圓圈內

**Files:**
- Modify: `scripts/generate-music-logo-assets.mjs`
- Modify: `src/site/render.ts`
- Modify: `tests/music-logo-assets.test.ts`
- Modify: `tests/site-render.test.ts`
- Verify: `assets/music-logo/combined.png`, `dist/demo-music/index.html`

**Interfaces:**
- Consumes: 目前獨立 `microphone.png`、透明 `ring.png` 與 Task 8 合成構圖。
- Produces: 麥克風等比例縮放、置中於圓圈內，與圓圈內框保留明顯間距；動畫與最後合成一致。

- [ ] **Step 1: 先增加會失敗的麥克風內縮測試**

測試合成時麥克風使用固定等比例縮放，且麥克風可見 alpha 不與圓圈 alpha 重疊；同時鎖定完成動畫使用相同比例。

- [ ] **Step 2: 將麥克風等比例縮放並置中**

在生成器的 758 × 758 合成畫布中以中心為基準將麥克風縮放至 `0.9`，不拉伸、不裁切、不改寫獨立來源 PNG；保留既有圖層順序。

- [ ] **Step 3: 對齊動畫完成狀態**

將麥克風完成 keyframe 的 scale 改為 `0.9`，中段動畫也不得在完成前超過最後尺寸；確保淡出前與 `combined.png` 完全一致。

- [ ] **Step 4: 驗證、建置與部署**

Run: `node scripts/generate-music-logo-assets.mjs`

Run: `npx vitest run tests/music-logo-assets.test.ts tests/site-render.test.ts`

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

Run: `git diff --check`

Expected: 麥克風與圓圈沒有 alpha 重疊，所有測試與 GitHub Pages 部署通過，其他 demo dist 差異還原。

- [ ] **Step 5: 提交麥克風比例修正**

```bash
git add scripts/generate-music-logo-assets.mjs src/site/render.ts tests/music-logo-assets.test.ts tests/site-render.test.ts assets/music-logo/combined.png dist/demo-music/index.html
git commit -m "fix: fit music microphone inside ring"
```
