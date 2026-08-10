/**
 * 官網生成：單一 HTML 檔，沒有建置工具、沒有框架、沒有外部資源。
 *
 * 刻意做成單檔，因為交付對象是「不會用 FTP 的店家」——
 * 一個檔案丟上任何靜態主機就能動，出事也只要看一個檔。
 * 內容全部來自 tenant.json，跟 LINE 客服讀的是同一份。
 */

import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { theme, type Tenant } from '../tenant.js';
import { escapeHtml, safeExternalUrl } from './html.js';
import {
  getRenderVariant,
  renderMusicAmbient,
  renderMusicLogoAnimation,
  renderMusicNoteBurst,
  renderStudentShowcase,
  renderVariantSections,
  type MusicLogoLayers,
} from './variants.js';

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const ASSET_ROOT = new URL('../../assets/', import.meta.url);

function embedAsset(relativeAsset: string, className: string, alt: string): string {
  if (!/^[a-z0-9._/-]+$/i.test(relativeAsset) || relativeAsset.includes('..')) return '';

  const assetPath = resolve(ASSET_ROOT.pathname, relativeAsset);
  const rootPath = resolve(ASSET_ROOT.pathname);
  const relativePath = relative(rootPath, assetPath);
  if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) return '';

  const mime = relativeAsset.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  try {
    const data = readFileSync(assetPath).toString('base64');
    return `<img class="${escapeHtml(className)}" src="data:${mime};base64,${data}" alt="${escapeHtml(alt)}">`;
  } catch {
    return '';
  }
}

function embedBrandLogo(logo: Tenant['brand']['logo'], className = 'brand-logo'): string {
  if (!logo || !/^[a-z0-9._/-]+$/i.test(logo.src) || logo.src.includes('..')) return '';

  const relativeAsset = logo.src.replace(/^assets\//, '');
  return embedAsset(relativeAsset, className, logo.alt ?? '品牌 Logo');
}

const MUSIC_LOGO_ASSETS = {
  ring: 'music-logo/ring.png',
  forestLeft: 'music-logo/forest-left.png',
  forestRight: 'music-logo/forest-right.png',
  microphone: 'music-logo/microphone.png',
  bird: 'music-logo/bird.png',
  notes: 'music-logo/notes.png',
} as const;
const MUSIC_FINAL_LOGO_ASSET = 'music-logo/combined.png';

function embedMusicLogoLayers(): MusicLogoLayers | null {
  const layers = {
    ring: embedAsset(MUSIC_LOGO_ASSETS.ring, 'music-logo-layer music-logo-layer-ring', ''),
    forestLeft: embedAsset(MUSIC_LOGO_ASSETS.forestLeft, 'music-logo-layer music-logo-layer-forest-left', ''),
    forestRight: embedAsset(MUSIC_LOGO_ASSETS.forestRight, 'music-logo-layer music-logo-layer-forest-right', ''),
    microphone: embedAsset(MUSIC_LOGO_ASSETS.microphone, 'music-logo-layer music-logo-layer-microphone', ''),
    bird: embedAsset(MUSIC_LOGO_ASSETS.bird, 'music-logo-layer music-logo-layer-bird', ''),
    notes: embedAsset(MUSIC_LOGO_ASSETS.notes, 'music-logo-layer music-logo-layer-notes', ''),
  };

  return Object.values(layers).every(Boolean) ? layers : null;
}

function safeColor(value: string, fallback: string): string {
  return HEX_COLOR.test(value) ? value : fallback;
}

function renderAbout(t: Tenant): string {
  const brandName = t.brand.name;
  if (!brandName || !t.brand.about.startsWith(brandName)) return escapeHtml(t.brand.about);

  return `<span class="about-brand">${escapeHtml(brandName)}</span>${escapeHtml(t.brand.about.slice(brandName.length))}`;
}

export function renderSite(t: Tenant): string {
  const { accent, bg, ink } = theme(t);
  const colors = {
    accent: safeColor(accent, '#1f6f5c'),
    bg: safeColor(bg, '#faf9f6'),
    ink: safeColor(ink, '#1c1b19'),
  };
  const variant = getRenderVariant(t);
  const brandLogo = embedBrandLogo(t.brand.logo);
  const musicMotionEnabled = variant === 'music';
  const musicLogoLayers = musicMotionEnabled ? embedMusicLogoLayers() : null;
  const musicFinalLogo = musicMotionEnabled
    ? embedAsset(MUSIC_FINAL_LOGO_ASSET, 'music-logo-final', t.brand.logo?.alt ?? '品牌 Logo')
    : '';
  const heroLogo = musicLogoLayers && musicFinalLogo ? renderMusicLogoAnimation(musicLogoLayers, musicFinalLogo) : brandLogo;
  const about = renderAbout(t);

  const notices = t.notices?.length
    ? `<div class="notice">${t.notices.map((notice) => `<p>${escapeHtml(notice)}</p>`).join('')}</div>`
    : '';

  const services = t.services
    .map(
      (service) => `<article class="svc">
      <h3>${escapeHtml(service.name)}</h3>
      <p>${escapeHtml(service.desc)}</p>
      <div class="meta">${service.price ? `<span class="svc-price">${escapeHtml(service.price)}</span>` : ''}${service.duration ? `<span class="svc-duration">${escapeHtml(service.duration)}</span>` : ''}</div>
    </article>`,
    )
    .join('');

  const faq = t.faq
    .map((item) => `<details><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`)
    .join('');

  const mapUrl = safeExternalUrl(t.contact.mapUrl);
  const lineAddUrl = safeExternalUrl(t.contact.lineAddUrl);
  const rows: Array<[string, string]> = [];
  if (t.contact.address) {
    rows.push([
      '地址',
      mapUrl
        ? `<a href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener">${escapeHtml(t.contact.address)}</a>`
        : escapeHtml(t.contact.address),
    ]);
  }
  if (t.contact.phone) {
    rows.push(['電話', `<a href="tel:${escapeHtml(t.contact.phone)}">${escapeHtml(t.contact.phone)}</a>`]);
  }
  if (t.contact.lineId) {
    const lineId = escapeHtml(t.contact.lineId);
    rows.push([
      'LINE ID',
      lineAddUrl
        ? `<a href="${escapeHtml(lineAddUrl)}" target="_blank" rel="noopener">${lineId}</a>`
        : lineId,
    ]);
  }
  if (t.contact.email) {
    rows.push(['Email', `<a href="mailto:${escapeHtml(t.contact.email)}">${escapeHtml(t.contact.email)}</a>`]);
  }
  const contactRows = rows.map(([label, value]) => `<div class="row"><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  const contactNote = t.contact.note ? `<p class="contact-note">${escapeHtml(t.contact.note)}</p>` : '';

  // LINE 才是主要轉換點 —— 台灣的店家幾乎都是靠 LINE 收單，不是靠表單。
  const ctaLabel = musicMotionEnabled ? '試上一堂 NT$100' : '聯絡／預約';
  const cta = lineAddUrl
    ? `<a class="cta" href="${escapeHtml(lineAddUrl)}" target="_blank" rel="noopener">${musicMotionEnabled ? '試上一堂 NT$100' : '加 LINE 詢問 / 預約'}</a>`
    : `<a class="cta" href="#contact">${ctaLabel}</a>`;
  const heroCta = musicMotionEnabled ? '' : cta;
  const siteIntro = t.site?.eyebrow ? `<p class="eyebrow">${escapeHtml(t.site.eyebrow)}</p>` : '';
  const heroNote = t.site?.heroNote ? `<p class="hero-note">${escapeHtml(t.site.heroNote)}</p>` : '';
  const studentShowcaseNav = variant === 'music' ? '<a href="#student-showcase">雲端成發</a>' : '';
  const musicAmbient = musicMotionEnabled ? renderMusicAmbient() : '';
  const musicLogoCss = musicMotionEnabled
    ? `.music-logo-animation{position:relative;display:block;width:min(190px,45vw);aspect-ratio:1;margin:0 auto 24px}.music-logo-composite{position:absolute;inset:0}.music-logo-layer-stack{position:absolute;inset:0;animation:music-logo-layers-exit 620ms ease-out 4.25s both}.music-logo-layer{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;transform-origin:center;pointer-events:none}.music-logo-layer-ring{z-index:1;animation:music-logo-ring 1.1s ease-out .05s both}.music-logo-layer-forest-left{z-index:4;animation:music-logo-forest-left 1.3s cubic-bezier(.2,.8,.2,1) both}.music-logo-layer-forest-right{z-index:0;animation:music-logo-forest-right 1.3s cubic-bezier(.2,.8,.2,1) both}.music-logo-layer-bird{z-index:5;animation:music-logo-bird-flight 2.9s cubic-bezier(.2,.75,.25,1) .7s both}.music-logo-layer-microphone{z-index:3;animation:music-logo-microphone-arrive 2s cubic-bezier(.2,.85,.25,1) 1.8s both}.music-logo-layer-notes{z-index:2;animation:music-logo-notes 1s ease-out 3.2s both}.music-logo-final-frame{position:absolute;inset:0;z-index:7;opacity:0;pointer-events:none;animation:music-logo-final 620ms ease-out 4.25s both}.music-logo-final{display:block;width:100%;height:100%;margin:0;object-fit:contain;transform:none;transform-origin:center;border:0;border-radius:0;box-shadow:none}@keyframes music-logo-ring{0%{opacity:0;transform:scale(.78) rotate(-5deg)}100%{opacity:1;transform:scale(1) rotate(0)}}@keyframes music-logo-forest-left{0%{opacity:0;transform:translate(-15.83%,2.37%) scale(.48) rotate(-12deg)}22%{opacity:1}100%{opacity:1;transform:translate(-17.15%,1.72%) scale(.75)}}@keyframes music-logo-forest-right{0%{opacity:0;transform:translate(15.83%,2.37%) scale(.48) rotate(12deg)}22%{opacity:1}100%{opacity:1;transform:translate(16.36%,9.23%) scale(.7)}}@keyframes music-logo-bird-flight{0%{opacity:0;transform:translate(-18.47%,5.80%) rotate(-10deg) scale(.62)}22%{opacity:1}52%{transform:translate(-4.22%,-1.32%) rotate(6deg) scale(.92)}78%{transform:translate(2.90%,.26%) rotate(-2deg) scale(1.05)}100%{opacity:1;transform:translate(9.23%,3.69%) rotate(0) scale(1.05)}}@keyframes music-logo-microphone-arrive{0%,42%{opacity:0;transform:translate(0,2.37%) scale(.15)}72%{opacity:1;transform:translate(0,.40%) scale(.9)}100%{opacity:1;transform:translate(0,0) scale(.9)}}@keyframes music-logo-notes{0%{opacity:0;transform:translateY(1.85%) scale(.78)}100%{opacity:1;transform:translateY(0) scale(1)}}@keyframes music-logo-layers-exit{0%{opacity:1}100%{opacity:0}}@keyframes music-logo-final{0%{opacity:0}100%{opacity:1}}`
    : '';
  const musicCardCss = musicMotionEnabled
    ? '.music-card-price{margin-top:6px;padding:0;background:transparent;color:var(--bg);border-radius:0;font-size:clamp(14px,1.8vw,22px);font-weight:900;line-height:1.4;white-space:pre-line}.music-card-duration{margin-top:4px;color:var(--bg);font-size:13px;line-height:1.35;opacity:.86}@media (max-width:767px){.music-card-price{font-size:16px;line-height:1.4}.music-card-duration{margin-top:6px;font-size:14px;line-height:1.4}}'
    : '';
  const musicLogoLayerOrderCss = musicMotionEnabled ? '.music-logo-layer-notes{z-index:8;}' : '';
  const extraCss = `${musicLogoCss}${musicLogoLayerOrderCss}${musicCardCss}.contact-note{margin:20px 0 0;padding:14px 16px;border-left:3px solid var(--accent);background:var(--surface);color:var(--ink);font-size:14px;line-height:1.7;opacity:.86}`;
  const scrollRestorationHeadScript = `<script>if ('scrollRestoration' in history) history.scrollRestoration = 'manual';</script>`;
  const reloadScrollScript = `<script>(() => {
  const reset = () => {
    const htmlScrollBehavior = document.documentElement.style.scrollBehavior;
    const bodyScrollBehavior = document.body.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0,0);
    document.documentElement.style.scrollBehavior = htmlScrollBehavior;
    document.body.style.scrollBehavior = bodyScrollBehavior;
  };
  const resetAfterBrowserRestore = () => {
    reset();
    window.setTimeout(reset, 300);
  };
  resetAfterBrowserRestore();
  window.addEventListener('load', resetAfterBrowserRestore, { once: true });
  window.addEventListener('pageshow', resetAfterBrowserRestore, { once: true });
})();</script>`;
  const musicMotionScript = musicMotionEnabled
    ? `<script>(() => {
  const sections = document.querySelectorAll('.music-motion-section');
  const show = (section) => section.classList.add('is-visible');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const musicHero = document.querySelector('.music-hero');
  const resetPointer = () => {
    if (!musicHero) return;
    musicHero.style.removeProperty('--music-pointer-x');
    musicHero.style.removeProperty('--music-pointer-y');
    musicHero.style.removeProperty('--music-shift-x');
    musicHero.style.removeProperty('--music-shift-y');
  };
  if (musicHero && !reducedMotion.matches) {
    musicHero.addEventListener('pointermove', (event) => {
      const rect = musicHero.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
      musicHero.style.setProperty('--music-pointer-x', x + '%');
      musicHero.style.setProperty('--music-pointer-y', y + '%');
      musicHero.style.setProperty('--music-shift-x', ((x - 50) * 0.08).toFixed(2) + 'px');
      musicHero.style.setProperty('--music-shift-y', ((y - 50) * 0.05).toFixed(2) + 'px');
     });
     musicHero.addEventListener('pointerleave', resetPointer);
   }
  const flipCards = document.querySelectorAll('.flip-card');
  const toggleFlipCard = (card) => {
    const flipped = card.classList.toggle('is-flipped');
    card.setAttribute('aria-expanded', String(flipped));
  };
  flipCards.forEach((card) => {
    card.addEventListener('click', () => toggleFlipCard(card));
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleFlipCard(card);
    });
  });
  const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
  const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter((section) => section);
  const setActiveNav = (id) => {
    navLinks.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === '#' + id));
  };
  if (navSections[0]) setActiveNav(navSections[0].id);
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
  const navObserver = new IntersectionObserver((entries) => {
    const current = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (current) setActiveNav(current.target.id);
  }, { threshold: 0, rootMargin: '-35% 0px -55% 0px' });
  navSections.forEach((section) => navObserver.observe(section));
})();</script>`
    : '';
  const musicMotionSectionClass = musicMotionEnabled ? ' class="music-motion-section"' : '';
  const musicContactBurst = musicMotionEnabled ? renderMusicNoteBurst('contact') : '';
  const servicesSection = `<section id="services"${musicMotionSectionClass}><h2>服 務 與 價 格</h2>${services}</section>`;
  const primaryNav = musicMotionEnabled ? '<a href="#courses">課程</a>' : '<a href="#services">服務</a>';
  const navigation = `<nav class="site-nav" aria-label="頁面導覽">
    <a href="#about">關於</a>${primaryNav}${studentShowcaseNav}${faq ? '<a href="#faq">常見問題</a>' : ''}<a href="#contact">聯絡</a>
  </nav>`;

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escapeHtml(t.brand.name)}｜${escapeHtml(t.brand.tagline)}</title>
<meta name="description" content="${escapeHtml(t.brand.tagline)}　${escapeHtml(t.brand.about.slice(0, 80))}">
<meta property="og:title" content="${escapeHtml(t.brand.name)}">
<meta property="og:description" content="${escapeHtml(t.brand.tagline)}">
${scrollRestorationHeadScript}
<style>
:root{--accent:${escapeHtml(colors.accent)};--bg:${escapeHtml(colors.bg)};--ink:${escapeHtml(colors.ink)};--line:rgba(0,0,0,.12);--surface:rgba(0,0,0,.035);--shadow:0 18px 50px rgba(0,0,0,.08)}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{min-width:320px;background:var(--bg);color:var(--ink);font:16px/1.75 'PingFang TC','Noto Sans TC',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.hero{position:relative;padding:76px 0 38px;text-align:center}.hero::before{content:'';display:block;width:48px;height:4px;margin:0 auto 26px;background:var(--accent);border-radius:999px}.hero>*{max-width:780px;margin-left:auto;margin-right:auto}.brand-logo{display:block;width:min(190px,45vw);aspect-ratio:1;margin:0 auto 24px;object-fit:cover;border:4px solid var(--accent);border-radius:50%;box-shadow:0 8px 0 var(--surface)}
h1{font-size:clamp(32px,5vw,52px);letter-spacing:.08em;line-height:1.2}.eyebrow{color:var(--accent);font-size:13px;font-weight:800;letter-spacing:.2em}.tagline{margin-top:14px;color:var(--accent);font-weight:700;font-size:clamp(17px,2vw,21px)}.hero-note{margin-top:10px;font-size:15px;color:var(--ink);opacity:.78}
.site-nav{position:sticky;top:0;z-index:5;display:flex;justify-content:center;gap:8px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--bg);font-size:14px}.site-nav a{display:inline-flex;align-items:center;min-height:44px;padding:9px 14px;color:var(--ink);text-decoration:none;border-radius:999px;transition:background 160ms ease,color 160ms ease}.site-nav a:hover{background:var(--surface);color:var(--accent)}.site-nav a.is-active{color:var(--accent);background:var(--surface);font-weight:800;box-shadow:inset 0 -2px 0 var(--accent)}
.notice{margin:24px auto;padding:14px 18px;border-left:4px solid var(--accent);background:var(--surface);border-radius:0 12px 12px 0;font-size:14.5px;text-align:left}.notice p+p{margin-top:6px}
main>section{padding:64px 0;border-top:1px solid var(--line)}h2,h3{font-size:13px;letter-spacing:.24em;color:var(--accent);margin-bottom:20px;font-weight:800}.about{max-width:780px;font-size:18px;line-height:1.95}.about-brand{display:inline-block;margin-right:.12em;color:var(--accent);font-size:1.55em;font-weight:900;letter-spacing:.04em;line-height:1.1}body[data-variant=music] .about{max-width:720px;font-size:clamp(18px,2vw,20px)}
.svc,.showcase-item{padding:22px 0;border-bottom:1px solid var(--line)}.svc:last-child,.showcase-item:last-child{border-bottom:none}.svc h3,.showcase-item h4,.process-step h4{font-size:18px;margin-bottom:5px;color:inherit;letter-spacing:0}.svc p,.showcase-item p,.process-step p{color:var(--ink);opacity:.76;font-size:15px}.svc{transition:padding 160ms ease}.svc:hover{padding-left:10px}
.meta{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap}.meta span{font-size:13px;padding:4px 11px;border:1px solid var(--line);border-radius:999px}
.variant{margin:24px 0;padding:38px;border-top:0}.variant-block+.variant-block{margin-top:42px}.highlight-list{display:grid;gap:16px}.highlight{padding:20px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}.highlight-label,.showcase-category,.process-number{color:var(--accent)!important;font-size:13px!important;font-weight:800;letter-spacing:.12em}.highlight-value{font-size:21px!important;font-weight:800;color:inherit!important}.showcase-meta{margin-top:9px;font-size:13px!important}.process-step{display:flex;gap:18px;padding:18px 0;border-bottom:1px solid var(--line)}.process-step:last-child{border-bottom:none}.process-number{flex:0 0 34px}
.student-showcase{padding:64px 0;border-top:1px solid var(--line)}.student-showcase-intro{max-width:720px;color:var(--ink);opacity:.76;font-size:16px}.student-showcase-list{display:grid;gap:16px;margin-top:24px}.student-work{padding:24px;border:1px solid var(--accent);border-radius:16px;background:var(--surface)}.student-work h3{font-size:20px;color:inherit;letter-spacing:0;margin-bottom:6px}.student-work p{color:var(--ink);opacity:.76;font-size:15px}.student-work-category,.student-showcase-kicker{color:var(--accent)!important;font-size:13px!important;font-weight:800;letter-spacing:.12em}.student-work-meta{margin-top:9px;font-size:13px!important}.student-showcase-empty{margin-top:24px;padding:28px;border:1px dashed var(--accent);border-radius:16px;background:var(--surface)}.student-work-placeholder{display:flex;align-items:center;gap:14px;margin:20px 0;padding:16px;border:1px solid var(--accent);border-radius:12px;background:var(--bg)}.student-work-placeholder-note{flex:0 0 auto;color:var(--accent);font:italic 36px/1 Georgia,serif}.student-work-placeholder-copy{display:grid;gap:2px}.student-work-placeholder-copy strong{font-size:16px}.student-work-placeholder-copy small{font-size:13px;opacity:.7}.student-work-link{display:inline-flex;align-items:center;min-height:44px;margin-top:18px;padding:8px 14px;border:1px solid var(--accent);border-radius:999px;text-decoration:none;font-weight:800}
.variant-restaurant{border:2px solid var(--accent);border-radius:18px;box-shadow:10px 10px 0 var(--surface);background:linear-gradient(135deg,var(--surface),transparent 58%)}.variant-restaurant .highlight{border:0;border-top:5px solid var(--accent);border-radius:12px 12px 4px 4px;background:var(--bg)}.variant-restaurant .showcase{display:grid;gap:0}.variant-restaurant .showcase h3{grid-column:1/-1}.variant-restaurant .showcase-item{padding:22px;border-top:1px solid var(--line);border-bottom:0}.variant-restaurant .showcase-category{display:inline-block;padding:2px 10px;border:1px solid var(--accent);border-radius:999px}
.variant-interior{padding:42px 44px;border:1px solid var(--ink);border-left:8px solid var(--ink);border-radius:0;background:linear-gradient(90deg,var(--surface),transparent 28%)}.variant-interior h3{padding-bottom:14px;border-bottom:1px solid var(--ink)}.variant-interior .showcase{display:grid;gap:0}.variant-interior .showcase h3{grid-column:1/-1}.variant-interior .showcase-item{padding:24px;border:0;border-left:1px solid var(--line)}.variant-interior .showcase-item:nth-of-type(2){border-left:0}.variant-interior .process-number{font:700 24px/1 Georgia,serif}.variant-interior .process-step{align-items:flex-start}
.variant-pet{padding:38px;border:0;border-radius:32px;background:var(--surface);box-shadow:var(--shadow)}.variant-pet .highlight{border:2px solid var(--accent);border-radius:26px 26px 10px 26px;background:var(--bg)}.variant-pet .highlight:nth-child(even){border-radius:26px 26px 26px 10px}.variant-pet .showcase-item{padding:20px 22px;margin-top:12px;border:0;border-radius:20px;background:var(--bg);box-shadow:0 4px 0 var(--surface)}.variant-pet .process-step{margin-top:12px;padding:18px 20px;border:0;border-radius:20px;background:var(--bg)}.variant-pet .process-number{display:grid;place-items:center;flex-basis:40px;height:40px;border-radius:50%;background:var(--accent);color:var(--bg)!important}
.variant-music{position:relative;overflow:hidden;padding:40px;border-top:6px solid var(--accent);border-bottom:6px solid var(--accent);background:repeating-linear-gradient(to bottom,transparent 0,transparent 31px,rgba(90,57,39,.1) 32px,transparent 33px)}.variant-music::before{content:'♪  ♫  ♪';position:absolute;top:24px;right:28px;color:var(--accent);font:italic 40px/1 Georgia,serif;opacity:.18}.variant-music>*{position:relative}.variant-music .highlight{border:0;border-radius:4px;background:var(--bg);box-shadow:5px 5px 0 var(--accent)}.variant-music .showcase{display:grid;gap:16px}.variant-music .showcase h3{grid-column:1/-1}.variant-music .showcase-item{padding:20px;border:1px solid var(--accent);border-left:7px solid var(--accent);background:var(--bg)}.variant-music .process-step{padding:20px;background:var(--bg);border-bottom:1px solid var(--accent)}.variant-music .process-number{font:700 22px/1 Georgia,serif}.music-motion-section .meta{align-items:center}.variant-music .showcase-meta{white-space:pre-line;line-height:1.8}body[data-variant=music] .svc-price{display:inline-block;padding:0;border:0;border-radius:0;background:transparent;color:var(--ink);font-size:17px;font-weight:900;letter-spacing:.02em;white-space:pre-line}body[data-variant=music] .svc-duration{padding-left:2px;border-color:transparent;background:transparent;font-size:12px;opacity:.76}
.music-motion-section .highlight,.music-motion-section .showcase-item,.music-motion-section .student-work{transition:opacity 420ms ease,transform 420ms ease,box-shadow 220ms ease}.music-motion-section:not(.is-visible) .highlight,.music-motion-section:not(.is-visible) .showcase-item,.music-motion-section:not(.is-visible) .student-work{opacity:0;transform:translateY(16px)}.music-motion-section.is-visible .highlight,.music-motion-section.is-visible .showcase-item,.music-motion-section.is-visible .student-work{opacity:1;transform:none}.music-motion-section.is-visible .highlight:nth-child(2),.music-motion-section.is-visible .showcase-item:nth-of-type(2),.music-motion-section.is-visible .student-work:nth-child(2){transition-delay:80ms}.music-motion-section.is-visible .highlight:nth-child(3),.music-motion-section.is-visible .showcase-item:nth-of-type(3),.music-motion-section.is-visible .student-work:nth-child(3){transition-delay:160ms}.music-motion-section.is-visible .highlight:nth-child(4){transition-delay:240ms}.music-lightbox[hidden]{display:none}.music-lightbox{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:24px;background:rgba(63,43,33,.78);opacity:0;visibility:hidden;transition:opacity 180ms ease,visibility 180ms ease}.music-lightbox.is-open{opacity:1;visibility:visible}.music-lightbox-image{display:block;max-width:min(92vw,1000px);max-height:82vh;width:auto;border:6px solid var(--bg);border-radius:12px;box-shadow:0 20px 70px rgba(0,0,0,.28)}.music-lightbox-close{position:absolute;top:18px;right:18px;min-width:72px;min-height:44px;padding:8px 14px;border:1px solid var(--bg);border-radius:999px;background:var(--bg);color:var(--ink);font:inherit;font-weight:800;cursor:pointer}.music-lightbox-close:hover{background:var(--accent);color:var(--bg)}body.music-lightbox-open{overflow:hidden}.music-hero,.music-motion-section{position:relative;overflow:hidden}.music-hero::after{content:'';position:absolute;inset:-20%;z-index:0;pointer-events:none;background:radial-gradient(circle at var(--music-pointer-x,50%) var(--music-pointer-y,50%),rgba(255,255,255,.48),transparent 34%);opacity:.45;transition:background 180ms ease}.music-hero>*:not(.music-ambient),.music-motion-section>*:not(.music-note-burst){position:relative;z-index:1}.music-hero>*:not(.music-ambient){transform:translate3d(var(--music-shift-x,0px),var(--music-shift-y,0px),0);transition:transform 180ms ease}.music-ambient{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}.music-ambient span{position:absolute;color:var(--accent);font:italic 44px/1 Georgia,serif;opacity:.48;animation:music-float 7s ease-in-out infinite;will-change:transform,opacity}.music-ambient span:nth-child(1){top:13%;left:9%;animation-delay:-1.4s}.music-ambient span:nth-child(2){top:25%;right:12%;font-size:58px;animation-delay:-4.1s}.music-ambient span:nth-child(3){bottom:13%;left:22%;font-size:32px;animation-delay:-2.7s}.music-hero .music-ambient span:nth-child(3){top:42%;bottom:auto;left:22%}.music-note-burst{position:absolute;inset:0;pointer-events:none;overflow:hidden;opacity:0;transform:translateY(18px);transition:opacity 420ms ease,transform 420ms ease;z-index:0}.music-motion-section.is-visible .music-note-burst{opacity:1;transform:none}.music-note-burst span{position:absolute;color:var(--accent);font:italic 36px/1 Georgia,serif;animation:music-note-pop 900ms cubic-bezier(.2,.8,.2,1) both;will-change:transform,opacity}.music-note-burst span:first-child{right:8%;top:18%;transform:rotate(12deg)}.music-note-burst span:last-child{right:18%;bottom:15%;font-size:28px;animation-delay:120ms;transform:rotate(-10deg)}.music-note-burst[data-note-burst=showcase] span:first-child{right:12%;top:12%;font-size:44px;animation-duration:1.1s}.music-note-burst[data-note-burst=showcase] span:last-child{right:20%;bottom:18%;font-size:24px;animation-delay:240ms}.music-note-burst[data-note-burst=services] span:first-child{right:6%;top:24%;font-size:30px;animation-duration:.78s}.music-note-burst[data-note-burst=services] span:last-child{right:14%;bottom:22%;font-size:22px;animation-delay:180ms}.music-note-burst[data-note-burst=contact]{transform:translateY(8px)}.music-note-burst[data-note-burst=contact] span{right:10%;top:16%;font-size:24px;animation-duration:.7s;animation-delay:0s}.music-note-burst[data-note-burst=courses] span:first-child{right:7%;top:14%;animation-duration:1s}.music-note-burst[data-note-burst=courses] span:last-child{right:18%;bottom:22%;animation-delay:160ms}@keyframes music-float{0%,100%{transform:translate3d(0,0,0) rotate(-8deg)}50%{transform:translate3d(0,-18px,0) rotate(9deg)}}@keyframes music-note-pop{0%{opacity:0;transform:translate3d(-12px,14px,0) scale(.68) rotate(-12deg)}100%{opacity:.72;transform:translate3d(0,0,0) scale(1) rotate(8deg)}}
body[data-variant=restaurant] h1{font-family:'Songti TC','STSong',serif}body[data-variant=interior] h1{font-weight:500;letter-spacing:.16em}body[data-variant=pet] h1{font-weight:800;letter-spacing:.08em}body[data-variant=music] h1{font-family:Georgia,'Songti TC',serif;font-style:italic;letter-spacing:.08em}body[data-variant=interior] .hero{text-align:left}body[data-variant=restaurant] .hero{text-align:left}
details{padding:8px 0;border-bottom:1px solid var(--line)}details:last-child{border-bottom:none}summary{display:flex;align-items:center;min-height:44px;padding:4px 0;cursor:pointer;font-weight:700;list-style:none}summary::-webkit-details-marker{display:none}summary::before{content:'＋ ';flex:0 0 28px;color:var(--accent)}details[open] summary::before{content:'－ '}details p{margin:4px 0 12px 28px;color:var(--ink);opacity:.76;font-size:15px}
.row{display:flex;gap:18px;padding:12px 0;border-bottom:1px solid var(--line)}.row:last-child{border-bottom:none}dt{flex:0 0 64px;font-size:14px;color:var(--ink);opacity:.7}dd{flex:1}a{color:var(--accent);text-underline-offset:3px}a:focus-visible,summary:focus-visible,.cta:focus-visible,.student-work-media:focus-visible,.music-lightbox-close:focus-visible{outline:3px solid var(--ink);outline-offset:4px;box-shadow:0 0 0 7px var(--bg);border-radius:4px}.cta{display:block;width:min(100%,560px);margin:30px auto 8px;padding:18px 22px;background:var(--accent);color:var(--bg);text-align:center;border-radius:14px;font-weight:800;text-decoration:none;letter-spacing:.08em;box-shadow:0 8px 0 var(--surface);transition:transform 160ms ease,box-shadow 160ms ease}.cta:hover{transform:translateY(-2px);box-shadow:0 10px 0 var(--surface)}
footer{padding:54px 0 64px;text-align:center;font-size:13px;color:var(--ink);opacity:.68}
@media (min-width:768px){.wrap{padding:0 36px}.hero{padding-top:104px}.site-nav{margin:0 -36px;padding-left:36px;padding-right:36px}.highlight-list{grid-template-columns:repeat(3,minmax(0,1fr))}.student-showcase-list{grid-template-columns:repeat(2,minmax(0,1fr))}.variant-restaurant .showcase,.variant-interior .showcase{grid-template-columns:repeat(3,minmax(0,1fr))}.variant-pet .showcase{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.variant-pet .showcase h3{grid-column:1/-1}.variant-music .highlight-list{grid-template-columns:repeat(2,minmax(0,1fr))}.variant-music .showcase{grid-template-columns:repeat(2,minmax(0,1fr))}.variant-interior .process{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:28px}.variant-interior .process h3{grid-column:1/-1}}
@media (max-width:767px){.wrap{padding:0 18px}.hero{padding-top:56px}.site-nav{margin:0 -18px;padding-left:18px;padding-right:18px;justify-content:flex-start;overflow-x:auto;flex-wrap:nowrap}.site-nav a{flex:0 0 auto}.variant{margin:16px 0;padding:26px 20px}.student-showcase{padding:48px 0}.student-showcase-list,.highlight-list,.variant-restaurant .showcase,.variant-interior .showcase,.variant-pet .showcase,.variant-music .showcase,.variant-interior .process{grid-template-columns:1fr}.variant-interior{border-left-width:6px;padding:28px 22px}.variant-interior .showcase-item{border-left:0;border-top:1px solid var(--line)}.variant-music{padding:28px 20px}.variant-music::before{font-size:30px;top:18px;right:18px}.variant-pet{padding:26px 20px}.row{align-items:flex-start}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}.music-ambient span,.music-note-burst,.music-note-burst span{animation:none!important;transition:none!important;transform:none!important}.music-ambient span{opacity:.48}.music-motion-section .music-note-burst{opacity:1}.music-note-burst span{opacity:.72}}
.flip-card{position:relative;min-height:180px;perspective:1000px;cursor:pointer}.flip-card:focus-visible{outline:3px solid var(--ink);outline-offset:5px}.flip-card-inner{position:relative;min-height:180px;height:100%;transform-style:preserve-3d;transition:transform 520ms cubic-bezier(.2,.7,.2,1)}.flip-card.is-flipped .flip-card-inner{transform:rotateY(180deg)}.flip-card-face{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;backface-visibility:hidden;padding:20px}.flip-card-back{transform:rotateY(180deg);align-items:center;text-align:center;background:var(--accent);color:var(--bg)}.flip-card-back p{color:var(--bg)!important;opacity:1!important}.variant-music .highlight.flip-card,.variant-music .showcase-item.flip-card{padding:0;background:transparent}.variant-music .highlight.flip-card .flip-card-front,.variant-music .showcase-item.flip-card .flip-card-front{background:var(--bg)}@media (prefers-reduced-motion:reduce){.flip-card-inner{transition:none!important}}
${extraCss}
@media (prefers-reduced-motion:reduce){.music-logo-layer-stack{opacity:0;animation:none}.music-logo-layer{opacity:0;transform:none;animation:none}.music-logo-final-frame{opacity:1;animation:none}}
</style>
</head>
<body data-variant="${escapeHtml(variant)}">
<div class="wrap">
  <header class="hero${musicMotionEnabled ? ' music-hero' : ''}">
${heroLogo}
${siteIntro}
    <h1>${escapeHtml(t.brand.name)}</h1>
    <p class="tagline">${escapeHtml(t.brand.tagline)}</p>
${heroNote}
${notices}
${heroCta}
${musicAmbient}
  </header>
  ${navigation}

  <main>
    <section id="about"><h2>關 於</h2><p class="about">${about}</p></section>
${renderVariantSections(t)}
${renderStudentShowcase(t)}
${musicMotionEnabled ? '' : servicesSection}
${faq ? `<section id="faq"><h2>常 見 問 題</h2>${faq}</section>` : ''}
    <section id="contact"${musicMotionSectionClass}><h2>聯 絡 我 們</h2>${musicContactBurst}${contactRows ? `<dl>${contactRows}</dl>` : ''}${contactNote}${cta}</section>
  </main>

  <footer>${escapeHtml(t.brand.name)}</footer>
</div>
${musicMotionScript}
${reloadScrollScript}
</body>
</html>`;
}
