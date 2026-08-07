# 音樂版互動與示意作品 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保留奶油色品牌視覺，加入聚光視差、卡片揭示、hover focus 與作品 lightbox，並以 GPT 生成三張明確標示為示意素材的圖片。

**Architecture:** 內容仍由 `tenants/demo-music.json` 驅動，示意作品沿用 `site.studentShowcase`，新增可選圖片欄位。建置時把 `assets/music/` 圖片嵌入單一 HTML；音樂版互動集中在既有的音樂 CSS 與 inline script，其他 demo 不輸出音樂圖片、lightbox 或 pointer effect。

**Tech Stack:** TypeScript、Vitest、單檔 HTML、內嵌 CSS/JavaScript、內嵌 PNG 資產、GitHub Pages。

## Global Constraints

- 保留 `#f8e8c8` 奶油背景、深棕文字與現有 Logo。
- 圖片與作品先用 GPT 生成，卡片必須標示「示意素材｜非真實學生作品」。
- 不使用外部 CDN、不新增依賴、不改其他 demo 的視覺或內容。
- 所有互動都支援鍵盤 focus；`prefers-reduced-motion: reduce` 時停用位移與轉場。
- Lightbox 可用 Escape 關閉，開啟時禁止背景頁面滾動。
- 完成前必須通過 `npm run typecheck`、`npm test`、`npm run build` 與 `git diff --check`。

---

### Task 1: 生成並保存音樂示意圖片

**Files:**
- Create: `assets/music/music-room-demo.png`
- Create: `assets/music/piano-practice-demo.png`
- Create: `assets/music/studio-performance-demo.png`

**Interfaces:**
- Consumes: 已確認的奶油色品牌方向與音樂教室主題。
- Produces: 三張可嵌入單檔 HTML 的本機 PNG；圖片不含文字、Logo、真實姓名或可辨識的真實學生。

- [ ] **Step 1: Generate the music room image with built-in imagegen**

Use case: `photorealistic-natural`  
Asset type: 音樂教室首頁互動背景圖  
Primary request: 溫暖、自然、有生活感的小型鋼琴教室空間，畫面留有可放文字的留白。  
Scene/backdrop: 白天的暖色琴房，木質鋼琴、譜架、幾張樂譜與自然窗光。  
Style/medium: editorial interior photography, natural texture, not a stock photo.  
Composition/framing: 16:10 landscape, wide shot, quiet negative space.  
Color palette: cream, walnut brown, muted orange, dusty sage.  
Constraints: no visible text, no logo, no watermark, no identifiable people.

- [ ] **Step 2: Generate the piano practice image with built-in imagegen**

Use case: `photorealistic-natural`  
Asset type: 雲端成發示意作品卡  
Primary request: 一位學生在溫暖琴房練習鋼琴的局部紀錄，不露臉、不辨識身分。  
Scene/backdrop: 木質鋼琴鍵盤、譜架、手部與柔和午後光線。  
Style/medium: candid editorial photography, tactile and honest.  
Composition/framing: 4:3 landscape, close crop, piano keys and hands as focus.  
Color palette: cream, dark brown, burnt orange, soft green.  
Constraints: no visible sheet-music text, no logo, no watermark, no identifiable face.

- [ ] **Step 3: Generate the studio performance image with built-in imagegen**

Use case: `photorealistic-natural`  
Asset type: 雲端成發示意作品卡  
Primary request: 小型音樂教室裡的鋼琴演奏示意，一位演奏者背影與觀眾模糊在背景。  
Scene/backdrop: 小型暖色教室、鋼琴、簡單燈光、幾位模糊陪伴者。  
Style/medium: intimate documentary photography, understated and authentic.  
Composition/framing: 4:3 landscape, performer off-center, usable detail.  
Color palette: cream, walnut, amber, charcoal.  
Constraints: no visible text, no logo, no watermark, no identifiable faces.

- [ ] **Step 4: Inspect each generated image and copy the selected outputs into `assets/music/`**

Check that each image has the requested subject, no text/watermark, and a cohesive warm palette. Copy the final selected files with exactly these names:

```text
assets/music/music-room-demo.png
assets/music/piano-practice-demo.png
assets/music/studio-performance-demo.png
```

### Task 2: Add image-aware student showcase data and renderer tests

**Files:**
- Modify: `src/tenant.ts`，新增 `StudentShowcaseItem.image` 與 `imageAlt`
- Modify: `tenants/demo-music.json`，加入三張示意作品資料
- Modify: `src/site/variants.ts`，嵌入本機圖片與 lightbox markup
- Test: `tests/site-render.test.ts`、`tests/knowledge.test.ts`

**Interfaces:**
- Consumes: Task 1 的三個 `assets/music/*.png` 檔案。
- Produces: `renderStudentShowcase(loadTenant('demo-music'))` 輸出三個有 alt 的圖片卡與一個可關閉的 lightbox；非 music variant 不輸出圖片互動。

- [ ] **Step 1: Write the failing renderer tests**

Add tests that assert the music page contains three sample image cards, the disclaimer, image alt text, and lightbox accessibility markup; also assert a non-music page contains none of these markers:

```ts
it('音樂版示意作品輸出圖片卡與可關閉的 lightbox', () => {
  const musicHtml = renderSite(loadTenant('demo-music'));
  const petHtml = renderSite(makeTenant('pet'));

  expect(musicHtml.match(/class="student-work-media"/g)).toHaveLength(3);
  expect(musicHtml).toContain('示意素材｜非真實學生作品');
  expect(musicHtml).toContain('class="music-lightbox"');
  expect(musicHtml).toContain('aria-modal="true"');
  expect(musicHtml).toContain('Escape');
  expect(petHtml).not.toContain('student-work-media');
  expect(petHtml).not.toContain('music-lightbox');
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/site-render.test.ts tests/knowledge.test.ts`

Expected: FAIL because the tenant type/data and renderer do not yet include the three sample images or lightbox markup.

- [ ] **Step 3: Add optional image fields to the tenant model**

Extend `StudentShowcaseItem` with:

```ts
image?: string;
imageAlt?: string;
```

Do not make either field required so future real student entries can remain text-only.

- [ ] **Step 4: Add the three explicitly labelled sample entries**

Populate `site.studentShowcase` with titles that do not claim real student identity, use category `示意素材｜非真實學生作品`, point to the three asset paths, and provide descriptive `imageAlt` values.

- [ ] **Step 5: Implement safe local image embedding and lightbox markup**

In `src/site/variants.ts`, validate image paths against the existing assets directory, read approved local PNG files as base64 data URLs, and render each image inside a `button.student-work-media` with `type="button"`, an accessible `aria-label`, and an `img` whose `src` is the embedded data URL and whose `alt` comes from `imageAlt`.

Append one `.music-lightbox` dialog-like container with `role="dialog"`, `aria-modal="true"`, close button, and a large image target. Keep the empty-state branch unchanged for music tenants with no showcase entries.

- [ ] **Step 6: Run the focused tests and verify GREEN**

Run: `npm test -- tests/site-render.test.ts tests/knowledge.test.ts`

Expected: all focused tests pass, including the new music-only image and lightbox assertions.

- [ ] **Step 7: Commit the data and renderer slice**

```bash
git add assets/music src/tenant.ts tenants/demo-music.json src/site/variants.ts tests/site-render.test.ts tests/knowledge.test.ts
git commit -m "feat: add music showcase sample images"
```

### Task 3: Add music interactions and responsive visual states

**Files:**
- Modify: `src/site/render.ts:112-137`，擴充現有 music inline script
- Modify: `src/site/render.ts:179-187`，加入 music-only interaction CSS
- Test: `tests/site-render.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `.student-work-media`、`.music-lightbox` 與 music variant markup。
- Produces: pointer spotlight/parallax, staggered reveal, hover/focus states, lightbox open/close behavior, and reduced-motion-safe CSS/JS.

- [ ] **Step 1: Write failing interaction markup tests**

Assert music output contains the interaction hooks and reduced-motion guard while default output remains free of them:

```ts
expect(musicHtml).toContain('--music-pointer-x');
expect(musicHtml).toContain('data-lightbox-trigger');
expect(musicHtml).toContain('matchMedia(\'(prefers-reduced-motion: reduce)\')');
expect(defaultHtml).not.toContain('--music-pointer-x');
expect(defaultHtml).not.toContain('data-lightbox-trigger');
```

- [ ] **Step 2: Run the focused renderer tests and verify RED**

Run: `npm test -- tests/site-render.test.ts`

Expected: FAIL because the interaction CSS and script hooks are not yet present.

- [ ] **Step 3: Add restrained music interaction CSS**

Implement music-only rules for:

```css
body[data-variant=music] .music-hero::before { /* pointer-following soft spotlight */ }
body[data-variant=music] .highlight,
body[data-variant=music] .showcase-item,
body[data-variant=music] .student-work { /* focusable lift and border emphasis */ }
body[data-variant=music] .student-work-media { /* image crop and hover zoom */ }
body[data-variant=music] .music-lightbox { /* fixed backdrop and centered image */ }
@media (prefers-reduced-motion:reduce) { /* disable transforms and transitions */ }
```

Use the existing cream, brown, and accent tokens. Do not add a second theme or broad global selector.

- [ ] **Step 4: Extend the existing music inline script**

Add guarded pointer tracking on `.music-hero` that updates `--music-pointer-x` and `--music-pointer-y` only when reduced motion is not requested. Add lightbox open on `[data-lightbox-trigger]`, copy the clicked image source/alt, lock body overflow, close on the close button, backdrop click, and Escape, then restore the previously focused trigger.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- tests/site-render.test.ts`

Expected: all renderer tests pass with no warnings.

- [ ] **Step 6: Commit the interaction slice**

```bash
git add src/site/render.ts tests/site-render.test.ts
git commit -m "feat: add music page interactions"
```

### Task 4: Full verification, visual QA, and deployment

**Files:**
- Generated: `dist/demo-music/index.html`
- Do not modify: unrelated generated demo files

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: verified and deployed music page with local embedded sample images and interactive states.

- [ ] **Step 1: Run full quality checks**

Run:

```bash
npm run typecheck
npm test
npm run build
git diff --check
```

Expected: TypeScript, all tests, build, and whitespace checks exit successfully.

- [ ] **Step 2: Keep only the music generated output**

After the build, restore these unrelated files if they changed:

```bash
git restore --source=HEAD -- dist/demo-bistro/index.html dist/demo-interior/index.html dist/demo-pet/index.html dist/oakit/index.html
```

Confirm `dist/demo-music/index.html` contains three embedded `data:image/png;base64` assets, `.music-lightbox`, and the sample disclaimer.

- [ ] **Step 3: Run local visual QA**

Open `dist/demo-music/index.html` in the local browser and verify:

1. Hero pointer spotlight stays subtle and does not cover the CTA.
2. Cards lift on hover and focus, with no horizontal overflow at mobile width.
3. Clicking each sample image opens the correct enlarged image; Escape and backdrop close both restore focus and page scrolling.
4. Reduced-motion mode removes forced movement and still leaves content readable.

- [ ] **Step 4: Commit, push, and wait for deployment**

```bash
git add dist/demo-music/index.html
git commit -m "build: publish music interaction showcase"
git push origin main
MUSIC_DEPLOY_RUN_ID="$(gh run list --workflow deploy-pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run watch "$MUSIC_DEPLOY_RUN_ID" --exit-status
```

- [ ] **Step 5: Verify the live page and clean working tree**

```bash
MUSIC_DEPLOY_REV="$(git rev-parse --short HEAD)"
curl -sS -o /tmp/demo-music-live-interaction.html -w 'HTTP %{http_code}\n' "https://xpdai.github.io/oakit/demo-music/index.html?rev=$MUSIC_DEPLOY_REV"
rg -o 'student-work-media|music-lightbox|示意素材｜非真實學生作品|data:image/png;base64' /tmp/demo-music-live-interaction.html | sort | uniq -c
git status --short --branch
```

Expected: HTTP 200, all interaction/image markers present, and `main` clean and synchronized with `origin/main`.
