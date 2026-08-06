/**
 * 官網生成：單一 HTML 檔，沒有建置工具、沒有框架、沒有外部資源。
 *
 * 刻意做成單檔，因為交付對象是「不會用 FTP 的店家」——
 * 一個檔案丟上任何靜態主機就能動，出事也只要看一個檔。
 * 內容全部來自 tenant.json，跟 LINE 客服讀的是同一份。
 */

import { formatHours, theme, type Tenant } from '../tenant.js';
import { escapeHtml } from './html.js';
import { getRenderVariant, renderVariantSections } from './variants.js';

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function safeExternalUrl(value?: string): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function safeColor(value: string, fallback: string): string {
  return HEX_COLOR.test(value) ? value : fallback;
}

export function renderSite(t: Tenant): string {
  const { accent, bg, ink } = theme(t);
  const colors = {
    accent: safeColor(accent, '#1f6f5c'),
    bg: safeColor(bg, '#faf9f6'),
    ink: safeColor(ink, '#1c1b19'),
  };
  const variant = getRenderVariant(t);

  const notices = t.notices?.length
    ? `<div class="notice">${t.notices.map((notice) => `<p>${escapeHtml(notice)}</p>`).join('')}</div>`
    : '';

  const services = t.services
    .map(
      (service) => `<article class="svc">
      <h3>${escapeHtml(service.name)}</h3>
      <p>${escapeHtml(service.desc)}</p>
      <div class="meta">${[service.price, service.duration]
        .filter(Boolean)
        .map((value) => `<span>${escapeHtml(value!)}</span>`)
        .join('')}</div>
    </article>`,
    )
    .join('');

  const faq = t.faq
    .map((item) => `<details><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`)
    .join('');

  const mapUrl = safeExternalUrl(t.contact.mapUrl);
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
  if (t.contact.email) {
    rows.push(['Email', `<a href="mailto:${escapeHtml(t.contact.email)}">${escapeHtml(t.contact.email)}</a>`]);
  }
  const contactRows = rows.map(([label, value]) => `<div class="row"><dt>${label}</dt><dd>${value}</dd></div>`).join('');

  // LINE 才是主要轉換點 —— 台灣的店家幾乎都是靠 LINE 收單，不是靠表單。
  const lineAddUrl = safeExternalUrl(t.contact.lineAddUrl);
  const cta = lineAddUrl
    ? `<a class="cta" href="${escapeHtml(lineAddUrl)}" target="_blank" rel="noopener">加 LINE 詢問 / 預約</a>`
    : '<a class="cta" href="#contact">聯絡／預約</a>';
  const siteIntro = t.site?.eyebrow ? `<p class="eyebrow">${escapeHtml(t.site.eyebrow)}</p>` : '';
  const heroNote = t.site?.heroNote ? `<p class="hero-note">${escapeHtml(t.site.heroNote)}</p>` : '';
  const navigation = `<nav aria-label="頁面導覽">
    <a href="#about">關於</a><a href="#services">服務</a><a href="#hours">時間</a>${faq ? '<a href="#faq">常見問題</a>' : ''}<a href="#contact">聯絡</a>
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
<style>
:root{--accent:${escapeHtml(colors.accent)};--bg:${escapeHtml(colors.bg)};--ink:${escapeHtml(colors.ink)};--line:rgba(0,0,0,.1)}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font:16px/1.75 'PingFang TC','Noto Sans TC',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
header{padding:64px 0 24px;text-align:center}
h1{font-size:32px;letter-spacing:2px;line-height:1.3}.eyebrow{color:var(--accent);font-size:13px;font-weight:700;letter-spacing:2px}.tagline{margin-top:10px;color:var(--accent);font-weight:600}.hero-note{margin-top:10px;font-size:15px}
nav{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;padding:16px 0 24px;font-size:14px}nav a{display:inline-flex;align-items:center;min-height:44px;padding:10px 5px;text-decoration:none}
.notice{margin:24px 0;padding:14px 18px;border-left:4px solid var(--accent);background:rgba(0,0,0,.04);border-radius:0 8px 8px 0;font-size:14.5px}.notice p+p{margin-top:6px}
section{padding:36px 0;border-top:1px solid var(--line)}h2,h3{font-size:13px;letter-spacing:3px;color:var(--accent);margin-bottom:20px;font-weight:800}.about{font-size:17px;line-height:1.9}
.svc,.showcase-item{padding:18px 0;border-bottom:1px solid var(--line)}.svc:last-child,.showcase-item:last-child{border-bottom:none}.svc h3,.showcase-item h4,.process-step h4{font-size:17px;margin-bottom:4px;color:inherit;letter-spacing:0}.svc p,.showcase-item p,.process-step p{color:var(--ink);opacity:.72;font-size:15px}
.meta{margin-top:8px;display:flex;gap:8px;flex-wrap:wrap}.meta span{font-size:13px;padding:3px 10px;border:1px solid var(--line);border-radius:999px}pre.hours{font:inherit;white-space:pre-wrap}
.variant{margin:20px 0;padding:32px;border-top:0}.variant-block+.variant-block{margin-top:32px}.highlight-list{display:grid;gap:12px}.highlight{padding:16px;border:1px solid var(--line);border-radius:10px}.highlight-label,.showcase-category,.process-number{color:var(--accent)!important;font-size:13px!important;font-weight:700;letter-spacing:1px}.highlight-value{font-size:20px!important;font-weight:700;color:inherit!important}.showcase-meta{margin-top:8px;font-size:13px!important}.process-step{display:flex;gap:16px;padding:16px 0;border-bottom:1px solid var(--line)}.process-step:last-child{border-bottom:none}.process-number{flex:0 0 32px}
.variant-restaurant{border:2px solid var(--accent);border-radius:6px;box-shadow:8px 8px 0 rgba(0,0,0,.07)}.variant-restaurant .highlight{border:0;border-top:4px solid var(--accent);border-radius:0;background:rgba(0,0,0,.035)}.variant-restaurant .showcase{display:grid;gap:0}.variant-restaurant .showcase h3{grid-column:1/-1}.variant-restaurant .showcase-item{padding:18px;border-top:1px solid var(--line);border-bottom:0}.variant-restaurant .showcase-category{display:inline-block;padding:1px 8px;border:1px solid var(--accent);border-radius:999px}
.variant-interior{padding:32px;border:1px solid var(--ink);border-left:10px solid var(--ink);border-radius:0}.variant-interior h3{padding-bottom:12px;border-bottom:1px solid var(--ink)}.variant-interior .showcase{display:grid;gap:0}.variant-interior .showcase h3{grid-column:1/-1}.variant-interior .showcase-item{padding:20px;border:0;border-left:1px solid var(--line)}.variant-interior .showcase-item:nth-of-type(2){border-left:0}.variant-interior .process-number{font:700 22px/1 Georgia,serif}.variant-interior .process-step{align-items:flex-start}
.variant-pet{padding:32px;border:0;border-radius:34px;background:rgba(0,0,0,.045)}.variant-pet .highlight{border:2px solid var(--accent);border-radius:24px 24px 8px 24px;background:var(--bg)}.variant-pet .highlight:nth-child(even){border-radius:24px 24px 24px 8px}.variant-pet .showcase-item{padding:18px 20px;margin-top:12px;border:0;border-radius:18px;background:var(--bg)}.variant-pet .process-step{margin-top:10px;padding:16px 18px;border:0;border-radius:18px;background:var(--bg)}.variant-pet .process-number{display:grid;place-items:center;flex-basis:38px;height:38px;border-radius:50%;background:var(--accent);color:var(--bg)!important}
.variant-music{padding:32px;border-top:5px solid var(--accent);border-bottom:5px solid var(--accent);background:repeating-linear-gradient(to bottom,transparent 0,transparent 27px,rgba(0,0,0,.075) 28px,transparent 29px)}.variant-music .highlight{border:0;border-radius:0;background:var(--bg);box-shadow:4px 4px 0 var(--accent)}.variant-music .showcase{display:grid;gap:14px}.variant-music .showcase h3{grid-column:1/-1}.variant-music .showcase-item{padding:18px;border:1px solid var(--accent);border-left:6px solid var(--accent);background:var(--bg)}.variant-music .process-step{padding:18px;background:var(--bg);border-bottom:1px solid var(--accent)}.variant-music .process-number{font:700 20px/1 Georgia,serif}
body[data-variant=restaurant] h1{font-family:'Songti TC','STSong',serif;font-size:38px}body[data-variant=interior] h1{font-weight:500;letter-spacing:.16em}body[data-variant=pet] h1{font-weight:800;letter-spacing:.08em}body[data-variant=music] h1{font-family:Georgia,'Songti TC',serif;font-style:italic;letter-spacing:.08em}
details{padding:8px 0;border-bottom:1px solid var(--line)}details:last-child{border-bottom:none}summary{display:flex;align-items:center;min-height:44px;cursor:pointer;font-weight:600;list-style:none}summary::-webkit-details-marker{display:none}summary::before{content:'＋ ';flex:0 0 28px;color:var(--accent)}details[open] summary::before{content:'－ '}details p{margin:4px 0 10px 28px;color:var(--ink);opacity:.72;font-size:15px}
.row{display:flex;gap:16px;padding:10px 0;border-bottom:1px solid var(--line)}.row:last-child{border-bottom:none}dt{flex:0 0 64px;font-size:14px;color:var(--ink);opacity:.68}dd{flex:1}a{color:var(--accent)}a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px;border-radius:3px}.cta{display:block;margin:32px 0 8px;padding:18px;background:var(--accent);color:var(--bg);text-align:center;border-radius:12px;font-weight:700;text-decoration:none;letter-spacing:1px}
footer{padding:40px 0 56px;text-align:center;font-size:13px;color:var(--ink);opacity:.68}
@media (min-width:768px){.wrap{padding:0 36px}header{padding-top:88px}h1{font-size:42px}.highlight-list{grid-template-columns:repeat(3,minmax(0,1fr))}.variant-restaurant .showcase,.variant-interior .showcase{grid-template-columns:repeat(3,minmax(0,1fr))}.variant-pet .showcase{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.variant-pet .showcase h3{grid-column:1/-1}.variant-music .highlight-list{grid-template-columns:repeat(4,minmax(0,1fr))}.variant-music .showcase{grid-template-columns:repeat(2,minmax(0,1fr))}.variant-interior .process{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:24px}.variant-interior .process h3{grid-column:1/-1}}
@media (max-width:767px){.wrap{padding:0 18px}.variant{margin:12px 0;padding:24px 18px}.highlight-list,.variant-restaurant .showcase,.variant-interior .showcase,.variant-pet .showcase,.variant-music .showcase,.variant-interior .process{grid-template-columns:1fr}.variant-interior{border-left-width:6px}.variant-interior .showcase-item{border-left:0;border-top:1px solid var(--line)}.variant-music .highlight{box-shadow:3px 3px 0 var(--accent)}}
</style>
</head>
<body data-variant="${escapeHtml(variant)}">
<div class="wrap">
  <header>
    ${siteIntro}
    <h1>${escapeHtml(t.brand.name)}</h1>
    <p class="tagline">${escapeHtml(t.brand.tagline)}</p>
    ${heroNote}
    ${notices}
    ${cta}
  </header>
  ${navigation}

  <section id="about"><h2>關 於</h2><p class="about">${escapeHtml(t.brand.about)}</p></section>
  ${renderVariantSections(t)}
  <section id="services"><h2>服 務 與 價 格</h2>${services}</section>
  <section id="hours"><h2>營 業 時 間</h2><pre class="hours">${escapeHtml(formatHours(t))}</pre></section>
  ${faq ? `<section id="faq"><h2>常 見 問 題</h2>${faq}</section>` : ''}
  <section id="contact"><h2>聯 絡 我 們</h2>${contactRows ? `<dl>${contactRows}</dl>` : ''}${cta}</section>

  <footer>${escapeHtml(t.brand.name)}</footer>
</div>
</body>
</html>`;
}
