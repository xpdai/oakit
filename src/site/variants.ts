import type { BusinessType, ProcessStep, ShowcaseItem, Tenant } from '../tenant.js';
import { escapeHtml, safeExternalUrl } from './html.js';

export function getRenderVariant(t: Tenant): BusinessType | 'default' {
  return t.site?.variant ?? 'default';
}

export const renderMusicAmbient = (): string =>
  '<div class="music-ambient" aria-hidden="true"><span>♪</span><span>♫</span><span>♩</span></div>';

export const renderMusicNoteBurst = (label: string): string =>
  `<div class="music-note-burst" data-note-burst="${escapeHtml(label)}" aria-hidden="true"><span>♪</span><span>♫</span></div>`;

const renderHighlights = (t: Tenant): string => {
  const highlights = t.site?.highlights;
  if (!highlights?.length) return '';

  return `<div class="variant-block highlights"><h3>精 選 特 色</h3><div class="highlight-list">${highlights
    .map(
      (item) => `<article class="highlight">
        <p class="highlight-label">${escapeHtml(item.label)}</p>
        <p class="highlight-value">${escapeHtml(item.value)}</p>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
      </article>`,
    )
    .join('')}</div></div>`;
};

const renderShowcase = (items?: ShowcaseItem[]): string => {
  if (!items?.length) return '';

  return `<div class="variant-block showcase"><h3>精 選 展 示</h3>${items
    .map(
      (item) => `<article class="showcase-item">
        ${item.category ? `<p class="showcase-category">${escapeHtml(item.category)}</p>` : ''}
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.description)}</p>
        ${item.meta ? `<p class="showcase-meta">${escapeHtml(item.meta)}</p>` : ''}
      </article>`,
    )
    .join('')}</div>`;
};

const renderProcess = (items?: ProcessStep[]): string => {
  if (!items?.length) return '';

  return `<div class="variant-block process"><h3>服 務 流 程</h3>${items
    .map(
      (item) => `<article class="process-step">
        <p class="process-number">${escapeHtml(item.step)}</p>
        <div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.description)}</p></div>
      </article>`,
    )
    .join('')}</div>`;
};

export const renderStudentShowcase = (t: Tenant): string => {
  if (t.site?.variant !== 'music') return '';

  const items = t.site.studentShowcase ?? [];
  const content = items.length
    ? `<div class="student-showcase-list">${items
        .map((item) => {
          const url = safeExternalUrl(item.url);
          return `<article class="student-work">
            ${item.category ? `<p class="student-work-category">${escapeHtml(item.category)}</p>` : ''}
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            ${item.meta ? `<p class="student-work-meta">${escapeHtml(item.meta)}</p>` : ''}
            ${url ? `<a class="student-work-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">觀看作品</a>` : ''}
          </article>`;
        })
        .join('')}</div>`
    : `<div class="student-showcase-empty"><p class="student-showcase-kicker">學生作品整理中</p><p>之後會在這裡分享學生在課堂上練好的一首曲子，讓你看見每一次練習累積出的成長。</p></div>`;

  return `<section id="student-showcase" class="student-showcase music-motion-section"><h2>雲 端 成 發</h2><p class="student-showcase-intro">記錄成長,督促自己,也激勵別人!</p>${renderMusicNoteBurst('showcase')}${content}</section>`;
};

export function renderVariantSections(t: Tenant): string {
  const variant = getRenderVariant(t);
  if (variant === 'default') return '';

  const sections = {
    restaurant: [renderHighlights(t), renderShowcase(t.site?.showcase)],
    interior: [renderShowcase(t.site?.showcase), renderProcess(t.site?.process)],
    pet: [renderHighlights(t), renderShowcase(t.site?.showcase), renderProcess(t.site?.process)],
    music: [renderHighlights(t), renderShowcase(t.site?.showcase), renderProcess(t.site?.process)],
  }[variant].join('');

  if (!sections) return '';

  const dataSection = {
    restaurant: 'menu',
    interior: 'projects',
    pet: 'care',
    music: 'courses',
  }[variant];

  return `<section class="variant variant-${escapeHtml(variant)}${variant === 'music' ? ' music-motion-section' : ''}" data-section="${escapeHtml(dataSection)}">${variant === 'music' ? renderMusicNoteBurst('courses') : ''}${sections}</section>`;
}
