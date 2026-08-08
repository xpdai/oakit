# 那莫好聽 Logo 獨立元件動畫 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以 6 個獨立生成的 PNG 元件合成目前「那莫好聽」Logo，並完成樹枝靠近、小鳥穿梭、麥克風由遠到近的開場動畫。

**Architecture:** 生成的 PNG 都使用相同的正方形透明畫布，網站以 `embedMusicLogoLayers()` 將素材嵌入單檔 HTML，再由 `renderMusicLogoAnimation(layers, fallbackLogo)` 輸出獨立 `<img>` 圖層。動畫只操作各圖層的 `opacity`、`transform` 與 `animation`，不使用現有 JPG 的裁切、`clip-path` 或 SVG 重繪。

**Tech Stack:** Built-in ImageGen、`remove_chroma_key.py`、TypeScript、Vitest、CSS keyframes、現有 `tsx` 靜態建置流程、瀏覽器視覺驗證。

## Global Constraints

- 原本的 `assets/na-mo-logo.jpg` 只作為風格、比例與構圖參考，不再用它的局部內容做動畫裁切。
- 動畫使用 6 個獨立素材：圓環與內圈、左側樹枝、右側樹枝、中央麥克風、右側小鳥、周圍音符。
- 每個素材都使用相同的正方形畫布基準與透明背景。
- 合成順序為：背景 → 圓環 → 左右樹枝 → 音符 → 麥克風 → 小鳥。
- `prefers-reduced-motion: reduce` 時直接顯示完成後的靜態元件合成。
- 只影響 `demo-music`，不修改其他 demo 的 Logo 或版面。
- 建置時將素材納入靜態網站輸出，部署後不依賴本機路徑。

---

### Task 1: 生成並驗證獨立 Logo 素材

**Files:**
- Create: `assets/music-logo/ring.png`
- Create: `assets/music-logo/forest-left.png`
- Create: `assets/music-logo/forest-right.png`
- Create: `assets/music-logo/microphone.png`
- Create: `assets/music-logo/bird.png`
- Create: `assets/music-logo/notes.png`
- Reference: `assets/na-mo-logo.jpg`

**Interfaces:**
- Consumes: `assets/na-mo-logo.jpg` as a style and composition reference.
- Produces: six independent PNG assets on the same square transparent canvas.

- [ ] **Step 1: Generate the six assets with the built-in ImageGen tool**

Use one separate generation call per asset, always referencing `/Users/dai/Desktop/oakit/assets/na-mo-logo.jpg`. Use this shared constraint in every prompt:

```text
Use the reference image only for the existing hand-drawn visual language, proportions, line weight, and color palette. Create only the requested Logo component on a perfectly flat solid #00ff00 chroma-key background. Use a square canvas matching the reference composition, keep the subject centered in the same relative position, and leave generous padding. Preserve the warm cream, dark brown, olive green, orange, and muted teal palette. No text, no watermark, no extra characters, no shadows, no gradients, no texture outside the subject, and do not redesign the other Logo components.
```

Use these component-specific prompts:

```text
Component: the patterned circular outer ring and cream inner ring only. Keep the microphone, bird, branches, and musical notes completely absent.
Component: the left leafy branch only, curved upward in the same position as the reference. Keep the ring, microphone, bird, and musical notes completely absent.
Component: the right leafy branch only, curved upward in the same position as the reference. Keep the ring, microphone, bird, and musical notes completely absent.
Component: the smiling retro microphone only, centered in the same position as the reference, including its stand and warm orange-brown grille. Keep the ring, bird, branches, and musical notes completely absent.
Component: the small orange bird only, facing left toward the microphone and positioned at the same right-side location as the reference. Keep the ring, microphone, branches, and musical notes completely absent.
Component: the muted teal musical notes only, placed in the same relative positions as the reference. Keep the ring, microphone, bird, and branches completely absent.
```

- [ ] **Step 2: Convert each chroma-key result to alpha PNG**

Copy each selected ImageGen output into its target path, then run the installed helper once per asset:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input tmp/imagegen/ring-source.png \
  --out assets/music-logo/ring.png \
  --auto-key border --soft-matte --transparent-threshold 12 \
  --opaque-threshold 220 --despill
```

Repeat the command with `tmp/imagegen/forest-left-source.png` → `assets/music-logo/forest-left.png`, `tmp/imagegen/forest-right-source.png` → `assets/music-logo/forest-right.png`, `tmp/imagegen/microphone-source.png` → `assets/music-logo/microphone.png`, `tmp/imagegen/bird-source.png` → `assets/music-logo/bird.png`, and `tmp/imagegen/notes-source.png` → `assets/music-logo/notes.png`; do not overwrite `assets/na-mo-logo.jpg`.

- [ ] **Step 3: Validate dimensions and alpha coverage**

Run:

```bash
node --input-type=module -e "import sharp from 'sharp'; const files=['ring','forest-left','forest-right','microphone','bird','notes']; for (const name of files) { const m=await sharp('assets/music-logo/'+name+'.png').metadata(); if (m.width !== 758 || m.height !== 758 || !m.hasAlpha) throw new Error(name+' must be 758x758 RGBA'); console.log(name, m.width+'x'+m.height, m.hasAlpha); }"
```

Inspect all six images visually and regenerate only the affected asset if it contains extra elements, a visible green fringe, incorrect palette, or a non-transparent corner.

- [ ] **Step 4: Commit the asset set**

```bash
git add assets/music-logo
git commit -m "feat: add independent music logo components"
```

### Task 2: Add failing render tests for independent layers

**Files:**
- Modify: `tests/site-render.test.ts`
- Test: `tests/site-render.test.ts`

**Interfaces:**
- Consumes: `renderSite(loadTenant('demo-music'))`.
- Produces: regression expectations for six independent PNG layer elements and the absence of the old slicing implementation.

- [ ] **Step 1: Replace the old slice assertions with layer assertions**

Update the music Logo test to require:

```ts
for (const layer of ['ring', 'forest-left', 'forest-right', 'microphone', 'bird', 'notes']) {
  expect(musicHtml).toContain(`class="music-logo-layer music-logo-layer-${layer}"`);
  expect(musicHtml).toContain('src="data:image/png;base64,');
}
expect(musicHtml).toContain('@keyframes music-logo-forest-left');
expect(musicHtml).toContain('@keyframes music-logo-forest-right');
expect(musicHtml).toContain('@keyframes music-logo-bird-flight');
expect(musicHtml).toContain('@keyframes music-logo-microphone-arrive');
expect(musicHtml).not.toContain('music-logo-slices');
expect(musicHtml).not.toContain('clip-path:');
expect(musicHtml).not.toContain('<svg');
```

- [ ] **Step 2: Run the focused test and verify it fails for the old implementation**

Run: `npm test -- --run tests/site-render.test.ts`  
Expected: FAIL because the current HTML still contains `music-logo-slices` and does not contain the six independent PNG layer classes.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/site-render.test.ts
git commit -m "test: require independent music logo layers"
```

### Task 3: Implement asset embedding and independent composition markup

**Files:**
- Modify: `src/site/variants.ts`
- Modify: `src/site/render.ts`

**Interfaces:**
- `src/site/variants.ts` produces:

```ts
export type MusicLogoLayers = {
  ring: string;
  forestLeft: string;
  forestRight: string;
  microphone: string;
  bird: string;
  notes: string;
};

export function renderMusicLogoAnimation(layers: MusicLogoLayers, fallbackLogo: string): string;
```

- `src/site/render.ts` produces `MusicLogoLayers | null` through `embedMusicLogoLayers()` and passes it to the renderer only for the music variant.

- [ ] **Step 1: Add a reusable safe asset embedder in `src/site/render.ts`**

Refactor the current local asset-reading logic into a helper with this behavior:

```ts
function embedAsset(relativeAsset: string, className: string, alt: string): string {
  // Accept only assets under assets/, reject .. and absolute paths,
  // read the file as base64, and return an <img> with the requested class.
  // Return an empty string when validation or reading fails.
}
```

Keep `embedBrandLogo()` behavior unchanged for existing tenants, including JPEG MIME detection and alt text escaping.

- [ ] **Step 2: Add `embedMusicLogoLayers()` with the six fixed asset names**

Use the exact map:

```ts
const MUSIC_LOGO_ASSETS = {
  ring: 'music-logo/ring.png',
  forestLeft: 'music-logo/forest-left.png',
  forestRight: 'music-logo/forest-right.png',
  microphone: 'music-logo/microphone.png',
  bird: 'music-logo/bird.png',
  notes: 'music-logo/notes.png',
} as const;
```

Return `null` unless all six `embedAsset()` calls produce non-empty markup. This guarantees that a partial asset set never creates a broken Logo; `renderSite()` will use the existing `brandLogo` as fallback.

- [ ] **Step 3: Replace `renderMusicLogoAnimation()` markup**

Render one `.music-logo-composite` containing six independent `<img>` elements in this order:

```html
<div class="music-logo-animation">
  <div class="music-logo-composite" aria-hidden="true">
    ${layers.ring}
    ${layers.forestLeft}
    ${layers.forestRight}
    ${layers.notes}
    ${layers.microphone}
    ${layers.bird}
  </div>
</div>
```

If the layer map is unavailable, return `fallbackLogo` directly instead of emitting an incomplete animation.

- [ ] **Step 4: Run the focused test and verify the new markup passes its assertions**

Run: `npm test -- --run tests/site-render.test.ts`  
Expected: the asset-class assertions pass; CSS keyframe assertions may remain red until Task 4 is complete.

- [ ] **Step 5: Commit the independent composition markup**

```bash
git add src/site/render.ts src/site/variants.ts tests/site-render.test.ts
git commit -m "feat: compose music logo from independent layers"
```

### Task 4: Replace slicing CSS with layer animation CSS

**Files:**
- Modify: `src/site/render.ts`
- Test: `tests/site-render.test.ts`

**Interfaces:**
- Consumes: `.music-logo-composite` and six `.music-logo-layer-*` elements from Task 3.
- Produces: one-time load animation and reduced-motion static state.

- [ ] **Step 1: Add shared absolute-layer geometry**

The generated images all fill the same wrapper:

```css
.music-logo-animation{position:relative;display:block;width:min(190px,45vw);aspect-ratio:1;margin:0 auto 24px}
.music-logo-composite{position:absolute;inset:0}
.music-logo-layer{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;transform-origin:center;pointer-events:none}
```

- [ ] **Step 2: Add the approved motion sequence**

Use these timing targets:

```css
.music-logo-layer-ring{animation:music-logo-ring 1.1s ease-out .05s both}
.music-logo-layer-forest-left{animation:music-logo-forest-left 1.3s cubic-bezier(.2,.8,.2,1) both}
.music-logo-layer-forest-right{animation:music-logo-forest-right 1.3s cubic-bezier(.2,.8,.2,1) both}
.music-logo-layer-bird{animation:music-logo-bird-flight 2.9s cubic-bezier(.2,.75,.25,1) .7s both}
.music-logo-layer-microphone{animation:music-logo-microphone-arrive 2s cubic-bezier(.2,.85,.25,1) 1.8s both}
.music-logo-layer-notes{animation:music-logo-notes 1s ease-out 3.2s both}
```

The forest keyframes move the branches inward with a small sway; the bird travels from left to right and settles at the reference position; the microphone starts at `scale(.15)` and grows to `scale(1)` at center; the notes fade and rise slightly; the ring fades and scales from `.86` to `1`.

- [ ] **Step 3: Add reduced-motion handling and remove old selectors**

Replace all `.music-logo-slices`, `.music-logo-slice`, `.music-logo-final`, and `music-logo-slices-fade` rules with:

```css
@media (prefers-reduced-motion:reduce){
  .music-logo-layer{opacity:1;transform:none;animation:none}
}
```

Confirm `src/site/render.ts` and generated music HTML contain neither `clip-path:` nor `music-logo-slices`.

- [ ] **Step 4: Run all tests and typecheck**

Run: `npm test && npm run typecheck`  
Expected: all tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit the animation CSS**

```bash
git add src/site/render.ts tests/site-render.test.ts
git commit -m "feat: animate generated music logo layers"
```

### Task 5: Build, visual QA, and deploy

**Files:**
- Modify: `dist/demo-music/index.html` through the build command only.
- Preserve: `dist/demo-bistro/index.html`, `dist/demo-interior/index.html`, `dist/demo-pet/index.html`, `dist/oakit/index.html` from `HEAD`.

**Interfaces:**
- Consumes: six PNG assets and the completed renderer.
- Produces: verified static output at `dist/demo-music/index.html` and the deployed page `https://xpdai.github.io/oakit/demo-music/`.

- [ ] **Step 1: Build the static sites**

Run: `npm run build`  
Expected: all five demo HTML files are generated without errors.

- [ ] **Step 2: Restore unrelated generated files and check the diff**

Run:

```bash
git restore --source=HEAD -- dist/demo-bistro/index.html dist/demo-interior/index.html dist/demo-pet/index.html dist/oakit/index.html
git diff --check
git status --short
```

Expected: only the music demo output, source files, tests, plan/spec docs, and six new assets are changed.

- [ ] **Step 3: Verify local desktop and mobile behavior in the browser**

Open the local music page and inspect at approximately 1.2 seconds and 6 seconds after reload. Confirm the first state shows independent ring, branches, bird, microphone, and notes entering, and the later state shows the six layers aligned as the current Logo. Set a mobile viewport and repeat; confirm no layer escapes the Logo container or covers the top contact CTA. Read browser error logs and require an empty error/warning result.

- [ ] **Step 4: Verify the reduced-motion state**

Use a browser context with `prefers-reduced-motion: reduce` and confirm every `.music-logo-layer` has computed opacity `1`, no active animation, and the composite is complete immediately.

- [ ] **Step 5: Run the final verification suite**

Run:

```bash
npm test
npm run typecheck
npm run build
git restore --source=HEAD -- dist/demo-bistro/index.html dist/demo-interior/index.html dist/demo-pet/index.html dist/oakit/index.html
git diff --check
```

Expected: all tests pass, typecheck/build succeed, unrelated demo outputs remain unchanged, and the diff has no whitespace errors.

- [ ] **Step 6: Commit and deploy the verified result**

```bash
git add assets/music-logo src/site/render.ts src/site/variants.ts tests/site-render.test.ts dist/demo-music/index.html docs/superpowers/specs/2026-08-08-music-logo-components-design.md docs/superpowers/plans/2026-08-08-music-logo-components-plan.md
git commit -m "feat: build music logo from generated components"
git push origin main
run_id=$(gh run list --workflow deploy-pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$run_id" --exit-status
```

After deployment, request the live page with the new commit hash as a cache-buster and verify HTTP 200, six `data:image/png` layers, no `clip-path`, no `music-logo-slices`, and no browser console errors.
