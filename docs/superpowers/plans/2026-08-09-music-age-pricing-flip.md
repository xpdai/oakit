# Music Age Pricing Flip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge music age classes and prices into one set of flip cards, move course methods above them, add a trial lesson card, and remove the standalone music services section from the website.

**Architecture:** Keep `Tenant.services` as the single source for prices used by LINE knowledge and the music age-card renderer. Extend the existing music variant renderer so age-card fronts contain the current descriptions and backs contain the matching service price and duration; render the existing showcase cards first and suppress only the music website services section.

**Tech Stack:** TypeScript, Vitest, JSON tenant data, single-file HTML generation, GitHub Pages.

## Global Constraints

- The music page must keep the existing accessible flip-card interaction (`tabindex`, `role="button"`, `aria-expanded`, Enter/Space support).
- `課程方式` appears before `年齡分班與價格`.
- The course-method trial card back shows `NT$100／堂` and `30 分鐘`.
- Age-card prices come from the existing `services` data; do not create a second price source.
- The music website must not render the standalone `id="services"` section, while LINE knowledge still includes services and prices.
- Preserve all non-music demo output and existing phone/LINE/contact behavior.

---

### Task 1: Lock the new music card contract with tests

**Files:**
- Modify: `tests/site-render.test.ts`
- Modify: `tests/knowledge.test.ts`

**Interfaces:**
- Consumes: `renderSite(loadTenant('demo-music'))` and `buildKnowledge(loadTenant('demo-music'))`.
- Produces: assertions for card count, section order, front descriptions, price backs, trial-card pricing, and preserved knowledge prices.

- [ ] **Step 1: Add failing render assertions**

Extend the existing music course test to assert:

```ts
const coursesStart = html.indexOf('<section class="variant variant-music');
const servicesStart = html.indexOf('<section id="services"');
const courseSection = html.slice(coursesStart, servicesStart === -1 ? html.indexOf('<section id="student-showcase"') : servicesStart);

expect(courseSection).toContain('<h3>課程方式</h3>');
expect(courseSection).toContain('<h3>年齡分班與價格</h3>');
expect(courseSection.indexOf('<h3>課程方式</h3>')).toBeLessThan(courseSection.indexOf('<h3>年齡分班與價格</h3>'));
expect(courseSection.match(/class="showcase-item flip-card"/g)).toHaveLength(3);
expect(courseSection.match(/class="highlight flip-card"/g)).toHaveLength(4);
expect(courseSection).toContain('試上一堂');
expect(courseSection).toContain('NT$100／堂');
expect(courseSection).toContain('每堂 30 分鐘');
expect(courseSection).toContain('初階 NT$900／堂');
expect(courseSection).toContain('NT$450／人／堂');
expect(html).not.toContain('<section id="services"');
```

Also assert that the age-card front contains `能鞏固基礎和提升程度。每一次都比上一次厲害` and the price backs contain `svc-price`-style pre-line markup.

- [ ] **Step 2: Add a failing knowledge regression assertion**

Keep the existing `buildKnowledge` price assertions and add an assertion that the trial service still appears with `NT$100／堂` and `每堂 30 分鐘`, proving that hiding the website section does not remove LINE data.

- [ ] **Step 3: Run focused tests and verify the expected failure**

Run:

```bash
npx vitest run tests/site-render.test.ts tests/knowledge.test.ts
```

Expected: the current title/order/card-count/standalone-services assertions fail before implementation.

### Task 2: Implement the music renderer and tenant card

**Files:**
- Modify: `src/site/variants.ts`
- Modify: `src/site/render.ts`
- Modify: `tenants/demo-music.json`

**Interfaces:**
- Consumes: `Tenant.services`, `SiteContent.highlights`, `SiteContent.showcase`, and existing `renderFlipCard`.
- Produces: ordered music course cards and price backs with escaped text and pre-line formatting.

- [ ] **Step 1: Add a music service lookup helper**

In `src/site/variants.ts`, add a private helper that selects the existing service data without duplicating prices:

```ts
const getMusicService = (t: Tenant, kind: 'individual' | 'group' | 'trial') =>
  t.services.find((service) =>
    kind === 'individual'
      ? service.name.includes('鋼琴一對一')
      : kind === 'group'
        ? service.name.includes('團班類別')
        : service.name === '試上一堂課',
  );
```

Render a price back with the service price and duration, using a fallback paragraph when either field is absent. Escape both values before inserting them into HTML.

- [ ] **Step 2: Move age descriptions to the front and prices to the back**

Change the music branch of `renderHighlights` to compose:

```ts
const front = `<p class="highlight-label">...</p><p class="highlight-value">...</p>${item.description ? `<p class="highlight-description">...</p>` : ''}`;
const service = item.value === '鋼琴一對一' ? getMusicService(t, 'individual') : getMusicService(t, 'group');
const back = renderMusicPriceBack(service);
```

Use the title `年齡分班與價格` for music. Non-music highlight rendering stays unchanged.

- [ ] **Step 3: Add the trial lesson to course methods**

Append this item to `tenants/demo-music.json` `site.showcase`:

```json
{
  "title": "試上一堂",
  "category": "課程體驗",
  "description": "用一堂課認識學習方向與課堂方式，再一起討論適合的課程安排。"
}
```

Update music showcase rendering so the trial card back includes the matching `Tenant.services` price and duration while other course-method cards retain their existing descriptions. Do not duplicate the price in `site.showcase`.

- [ ] **Step 4: Swap music section order and suppress the standalone services section**

In `renderVariantSections`, order music sections as `renderShowcase(..., '課程方式')` then `renderHighlights(t)`. In `renderSite`, do not insert `servicesSection` for `musicMotionEnabled`; continue rendering it for non-music variants.

- [ ] **Step 5: Run focused tests and verify they pass**

Run:

```bash
npx vitest run tests/site-render.test.ts tests/knowledge.test.ts
```

Expected: all focused tests pass, including the new order and card assertions.

### Task 3: Validate, build, and publish

**Files:**
- Generated: `dist/demo-music/index.html`
- Verify: all modified source and test files

**Interfaces:**
- Consumes: the passing renderer and tenant data from Task 2.
- Produces: the deployed music page with three course-method cards and four age-price cards.

- [ ] **Step 1: Run the full verification suite**

Run:

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: all tests pass, typecheck succeeds, build completes, and only `dist/demo-music/index.html` changes among generated demo pages.

- [ ] **Step 2: Restore unrelated generated pages if the build refreshes them**

Keep only `dist/demo-music/index.html` from generated output; restore `dist/demo-bistro/index.html`, `dist/demo-interior/index.html`, `dist/demo-pet/index.html`, and `dist/oakit/index.html` when their diffs contain unrelated synchronization changes.

- [ ] **Step 3: Commit and push**

```bash
git add src/site/variants.ts src/site/render.ts tenants/demo-music.json tests/site-render.test.ts tests/knowledge.test.ts dist/demo-music/index.html
git commit -m "feat: merge music age classes with prices"
git push origin main
```

- [ ] **Step 4: Verify the live mobile page**

Open the deployed music page at `https://xpdai.github.io/oakit/demo-music/index.html?rev=<commit>` and check at 390px width:

```ts
expect(document.querySelectorAll('.showcase-item.flip-card')).toHaveLength(3);
expect(document.querySelectorAll('.highlight.flip-card')).toHaveLength(4);
expect(document.querySelector('#services')).toBeNull();
expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);
```

Also confirm the trial card back contains `NT$100／堂` and `每堂 30 分鐘`, the age-card front contains the existing descriptions, and the browser console has no warnings or errors.
