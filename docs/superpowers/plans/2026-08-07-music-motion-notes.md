# 那莫好聽動態音符 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在那莫好聽的音樂版單頁官網加入「混合音符」視覺動畫：首頁持續漂浮，課程、雲端成發與聯絡區在滑入時明顯出現，不加入聲音。

**Architecture:** 維持現有 tenant JSON → 單一 HTML renderer 架構，只在 `music` variant 輸出音符裝飾與 inline `IntersectionObserver`。動畫只使用 CSS `transform`、`opacity` 與 `@keyframes`，由 `prefers-reduced-motion` 提供靜態 fallback；其他租戶與 default renderer 不輸出音符或腳本。

**Tech Stack:** TypeScript、Vitest、單檔 HTML、inline CSS/JavaScript；不新增依賴、不使用 CDN、外部字型、音檔或遠端圖片。

## Global Constraints

- 主要資料來源維持 `tenants/demo-music.json`，不新增音訊欄位或預約後端。
- 動態只套用 `site.variant === 'music'`，其他三個 Demo 與 default renderer 維持現有輸出。
- 音符裝飾必須 `aria-hidden="true"`、`pointer-events:none`，不可遮住文字、導覽或 CTA。
- `prefers-reduced-motion: reduce` 時保留音符但取消位移與動畫，內容不能因動畫未啟動而隱藏。
- 生成結果仍是單一 HTML，所有新增程式碼需通過既有 escaping、typecheck、test、build。

---

### Task 1: 建立音樂版動態輸出的回歸測試

**Files:**
- Modify: `tests/site-render.test.ts`
- Create: `docs/superpowers/plans/2026-08-07-music-motion-notes.md`

**Interfaces:**
- Consumes: `renderSite(makeTenant('music'))`。
- Produces: 測試要求音樂版輸出 ambient notes、section burst、IntersectionObserver、reduced-motion；非音樂版不得輸出音樂動態。

- [ ] **Step 1: Write the failing test**

在既有 `renderSite variants` describe 區塊新增：

```ts
it('音樂版輸出混合音符動畫，其他版型不輸出音樂腳本', () => {
  const musicHtml = renderSite(makeTenant('music'));
  const defaultHtml = renderSite(makeTenant());

  expect(musicHtml).toContain('class="music-ambient"');
  expect(musicHtml).toContain('class="music-note-burst"');
  expect(musicHtml).toContain('IntersectionObserver');
  expect(musicHtml).toContain('prefers-reduced-motion:reduce');
  expect(musicHtml).toContain('aria-hidden="true"');
  expect(musicHtml).not.toContain('<audio');
  expect(defaultHtml).not.toContain('music-ambient');
  expect(defaultHtml).not.toContain('IntersectionObserver');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/site-render.test.ts`

Expected: 新增測試 FAIL，因為目前 renderer 尚未輸出 `music-ambient`、`music-note-burst` 或 `IntersectionObserver`。

---

### Task 2: 加入音符 markup 與音樂版動態腳本

**Files:**
- Modify: `src/site/variants.ts`
- Modify: `src/site/render.ts`

**Interfaces:**
- `renderMusicAmbient(): string`：輸出 3 個不攔截互動的背景音符。
- `renderMusicNoteBurst(label: string): string`：輸出帶 `data-note-burst` 的段落音符群組。
- 音樂版 renderer 僅輸出 inline script，觀察 `.music-motion-section` 並加入 `.is-visible`。

- [ ] **Step 1: Implement minimal markup helpers**

在 `src/site/variants.ts` 新增受 escaping 保護的固定 markup helper：

```ts
export const renderMusicAmbient = (): string =>
  `<div class="music-ambient" aria-hidden="true"><span>♪</span><span>♫</span><span>♩</span></div>`;

export const renderMusicNoteBurst = (label: string): string =>
  `<div class="music-note-burst" data-note-burst="${escapeHtml(label)}" aria-hidden="true"><span>♪</span><span>♫</span></div>`;
```

讓 music variant 的 variant section、student showcase section、services section、contact section 帶上 `music-motion-section`，並在各自內容旁輸出 burst；hero 只輸出 ambient。

- [ ] **Step 2: Add CSS for visible hybrid motion**

在 `src/site/render.ts` 的 shared CSS 中加入 music-only selectors：

```css
.music-hero{position:relative;overflow:hidden}
.music-ambient{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}
.music-ambient span{position:absolute;color:var(--accent);font:italic 44px/1 Georgia,serif;opacity:.48;animation:music-float 7s ease-in-out infinite;will-change:transform,opacity}
.music-ambient span:nth-child(1){top:13%;left:9%;animation-delay:-1.4s}
.music-ambient span:nth-child(2){top:25%;right:12%;font-size:58px;animation-delay:-4.1s}
.music-ambient span:nth-child(3){bottom:13%;left:22%;font-size:32px;animation-delay:-2.7s}
.music-note-burst{position:absolute;inset:0;pointer-events:none;overflow:hidden;opacity:0;transform:translateY(18px);transition:opacity 420ms ease,transform 420ms ease}
.music-motion-section.is-visible .music-note-burst{opacity:1;transform:none}
.music-note-burst span{position:absolute;color:var(--accent);font:italic 36px/1 Georgia,serif;animation:music-note-pop 900ms cubic-bezier(.2,.8,.2,1) both;will-change:transform,opacity}
.music-note-burst span:first-child{right:8%;top:18%;transform:rotate(12deg)}
.music-note-burst span:last-child{right:18%;bottom:15%;font-size:28px;animation-delay:120ms;transform:rotate(-10deg)}
@keyframes music-float{0%,100%{transform:translate3d(0,0,0) rotate(-8deg)}50%{transform:translate3d(0,-18px,0) rotate(9deg)}}
@keyframes music-note-pop{0%{opacity:0;transform:translate3d(-12px,14px,0) scale(.68) rotate(-12deg)}100%{opacity:.72;transform:translate3d(0,0,0) scale(1) rotate(8deg)}}
@media (prefers-reduced-motion:reduce){.music-ambient span,.music-note-burst,.music-note-burst span{animation:none!important;transition:none!important;transform:none!important}.music-ambient span,.music-motion-section .music-note-burst{opacity:.48}.music-motion-section .music-note-burst span{opacity:.72}}
```

- [ ] **Step 3: Add the minimal observer script**

只對 music variant 輸出：

```js
(() => {
  const sections = document.querySelectorAll('.music-motion-section');
  const show = (section) => section.classList.add('is-visible');
  if (!('IntersectionObserver' in window)) {
    sections.forEach(show);
    return;
  }
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      show(entry.target);
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  sections.forEach((section) => observer.observe(section));
})();
```

- [ ] **Step 4: Run targeted tests to verify it passes**

Run: `npm test -- tests/site-render.test.ts`

Expected: targeted render tests PASS。

---

### Task 3: 完整驗證與實際瀏覽器檢查

**Files:**
- Generated: `dist/demo-music/index.html` via `npm run build`

**Interfaces:**
- Consumes: `tenants/demo-music.json`、updated renderer。
- Produces: 單檔 demo site with visible hybrid note animation and no external assets.

- [ ] **Step 1: Run the full validation suite**

Run: `npm run typecheck && npm test && npm run build && git diff --check`

Expected: typecheck exit 0、所有 Vitest tests pass、四個 demo build 成功、diff check 無輸出。

- [ ] **Step 2: Verify generated HTML contracts**

確認 `dist/demo-music/index.html` 包含 `music-ambient`、`music-note-burst`、`IntersectionObserver`、`prefers-reduced-motion:reduce`，且 `dist/demo-bistro/index.html` 不包含 `music-ambient` 或 `IntersectionObserver`。

- [ ] **Step 3: Verify live browser behavior**

在瀏覽器開啟生成的 music demo，確認首頁音符持續漂浮；滾動到課程、雲端成發與聯絡區後，對應音符 burst 出現；設定 reduced motion 時內容仍可見且沒有位移動畫。

- [ ] **Step 4: Commit and deploy**

```bash
git add src/site/render.ts src/site/variants.ts tests/site-render.test.ts docs/superpowers/plans/2026-08-07-music-motion-notes.md dist/demo-music/index.html
git commit -m "feat: add animated music notes to demo site"
git push origin main
```

確認 GitHub Pages workflow 成功，並以帶 revision query 的 demo URL 驗證 HTTP 200 與新動態 markup。
