# OAKIT Demo Sites Frontend Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the four generated demo sites into four recognizably different, accessible brand experiences while preserving the single-file renderer and the `demo-music` brand rename to 「那莫好聽」.

**Architecture:** Keep `src/site/render.ts` as the shared HTML/CSS shell and `src/site/variants.ts` as the content presenter boundary. Add visual tokens, responsive spacing, focus/motion rules, and variant-specific treatments inside the generated inline stylesheet; do not add a framework, CDN, font, image, or runtime dependency.

**Tech Stack:** Node + TypeScript, Vitest, inline HTML/CSS, GitHub Pages artifact under `dist/`.

## Global Constraints

- Generated websites remain a single HTML file with no external resources.
- `tenants/<id>.json` remains the source for website, rich menu, and knowledge data.
- Keep existing HTML escaping, HTTP(S)-only URL validation, CSS color allowlist, and default-tenant fallback.
- All interactive targets remain at least 44px and visibly focusable.
- Respect `prefers-reduced-motion`; never introduce autoplay or distracting motion.
- Preserve the `demo-music` path while rendering the brand name `那莫好聽`.

---

### Task 1: Shared shell and accessibility polish

**Files:**
- Modify: `src/site/render.ts`
- Test: `tests/site-render.test.ts`

**Interfaces:**
- Consumes the existing `Tenant` and `theme()` values.
- Produces the same `renderSite(t: Tenant): string` interface and generated section structure.

- [ ] Add deliberate shell tokens for content width, section rhythm, surface colors, and focus rings; refine Hero, nav, CTA, section headings, contact rows, and FAQ spacing without changing data rendering.
- [ ] Add keyboard-visible focus treatment, `prefers-reduced-motion: reduce`, `color-scheme`-safe surfaces, and responsive rules for 390px through desktop widths.
- [ ] Add tests asserting reduced-motion CSS, 44px controls, variant selectors, responsive breakpoints, and the absence of external resources.
- [ ] Run `npm test` and `npm run typecheck`.

### Task 2: Four brand-specific visual systems

**Files:**
- Modify: `src/site/render.ts`
- Possibly modify: `src/site/variants.ts`
- Test: `tests/site-render.test.ts`

**Interfaces:**
- Keeps the existing `variant-*` classes and `data-section` markers.
- Keeps all presenter content and tenant data unchanged.

- [ ] Refine restaurant styling around a compact menu-board rhythm, clear category labels, and warm service CTA.
- [ ] Refine interior styling around editorial case-study columns, quiet borders, and generous negative space.
- [ ] Refine pet styling around soft rounded care cards, clear one-pet-at-a-time promise, and friendly process steps.
- [ ] Refine music styling around a restrained score-line motif, strong course hierarchy, and a prominent trial-lesson CTA; keep the name `那莫好聽`.
- [ ] Confirm each variant remains one-column on mobile and intentionally multi-column only where content supports it on desktop.
- [ ] Run the site render tests and scan generated HTML for external resources.

### Task 3: Rename, regenerate, and verify

**Files:**
- Modify: `tenants/demo-music.json`, `tests/tenant-fixtures.test.ts`, `HANDOFF.md`, `dist/index.html`
- Generate: `dist/demo-*/index.html`

**Interfaces:**
- Keeps `demo-music` as the tenant ID and URL path.
- Exposes `brand.name = "那莫好聽"` to website, knowledge, and generated metadata.

- [ ] Assert the renamed tenant still loads as the music variant and all existing knowledge/ruleReply tests pass.
- [ ] Run `npm run build` and verify all four generated HTML files contain the intended brand and visual CSS.
- [ ] Run the browser audit at 1280×720 and 390×844: no horizontal overflow, correct variant markers, all internal anchors resolve, FAQ opens, and no console errors.
- [ ] Run `git diff --check`, commit the completed polish, push `main`, and verify the GitHub Pages URLs return HTTP 200.
