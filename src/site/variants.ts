import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import type { BusinessType, ProcessStep, ShowcaseItem, Tenant } from '../tenant.js';
import { escapeHtml, safeExternalUrl } from './html.js';

const MUSIC_ASSET_ROOT = new URL('../../assets/', import.meta.url);

function embedMusicImage(src: string, alt: string): string {
  if (!/^[a-z0-9._/-]+$/i.test(src) || src.includes('..')) return '';

  const relativeAsset = src.replace(/^assets\//, '');
  const assetPath = resolve(MUSIC_ASSET_ROOT.pathname, relativeAsset);
  const rootPath = resolve(MUSIC_ASSET_ROOT.pathname);
  const relativePath = relative(rootPath, assetPath);
  if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) return '';

  const lowerAsset = relativeAsset.toLowerCase();
  const mime = lowerAsset.endsWith('.png') ? 'image/png' : lowerAsset.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  try {
    const data = readFileSync(assetPath).toString('base64');
    return `<button class="student-work-media" type="button" data-lightbox-trigger aria-label="放大查看示意作品"><img class="student-work-image" src="data:${mime};base64,${data}" alt="${escapeHtml(alt)}" loading="lazy"></button>`;
  } catch {
    return '';
  }
}

export function getRenderVariant(t: Tenant): BusinessType | 'default' {
  return t.site?.variant ?? 'default';
}

export const renderMusicAmbient = (): string =>
  '<div class="music-ambient" aria-hidden="true"><span>♪</span><span>♫</span><span>♩</span></div>';

export const renderMusicNoteBurst = (label: string): string => {
  const notes = label === 'contact' ? '<span>♪</span>' : '<span>♪</span><span>♫</span>';
  return `<div class="music-note-burst" data-note-burst="${escapeHtml(label)}" aria-hidden="true">${notes}</div>`;
};

const renderHighlights = (t: Tenant): string => {
  const highlights = t.site?.highlights;
  if (!highlights?.length) return '';
  const title = t.site?.variant === 'music' ? '年齡分班' : '精 選 特 色';

  return `<div class="variant-block highlights"><h3>${title}</h3><div class="highlight-list">${highlights
    .map(
      (item) => `<article class="highlight">
        <p class="highlight-label">${escapeHtml(item.label)}</p>
        <p class="highlight-value">${escapeHtml(item.value)}</p>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
      </article>`,
    )
    .join('')}</div></div>`;
};

const renderShowcase = (items?: ShowcaseItem[], title = '精 選 展 示'): string => {
  if (!items?.length) return '';

  return `<div class="variant-block showcase"><h3>${title}</h3>${items
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
          const image = item.image ? embedMusicImage(item.image, item.imageAlt ?? item.title) : '';
          return `<article class="student-work">
            ${image}
            ${item.category ? `<p class="student-work-category">${escapeHtml(item.category)}</p>` : ''}
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            ${item.meta ? `<p class="student-work-meta">${escapeHtml(item.meta)}</p>` : ''}${url ? `<a class="student-work-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">觀看作品</a>` : ''}
          </article>`;
        })
        .join('')}</div>`
    : `<div class="student-showcase-empty"><p class="student-showcase-kicker">第一首作品準備中</p><div class="student-work-placeholder" aria-hidden="true"><span class="student-work-placeholder-note">♪</span><div class="student-work-placeholder-copy"><strong>學生演奏紀錄</strong><small>完成第一首曲子後，將在這裡留下成長足跡</small></div></div><p>每一段練習都會留下足跡，之後在這裡看見從第一次彈奏到完整演出的成長幅度。</p></div>`;

  return `<section id="student-showcase" class="student-showcase music-motion-section"><h2>雲 端 成 發</h2><p class="student-showcase-intro">記錄成長,督促自己,也激勵別人!</p>${renderMusicNoteBurst('showcase')}${content}<div class="music-lightbox" hidden role="dialog" aria-modal="true" aria-label="作品放大檢視"><button class="music-lightbox-close" type="button" aria-label="關閉作品放大檢視">關閉</button><img class="music-lightbox-image" alt=""></div></section>`;
};

export function renderVariantSections(t: Tenant): string {
  const variant = getRenderVariant(t);
  if (variant === 'default') return '';

  const sections = {
    restaurant: [renderHighlights(t), renderShowcase(t.site?.showcase)],
    interior: [renderShowcase(t.site?.showcase), renderProcess(t.site?.process)],
    pet: [renderHighlights(t), renderShowcase(t.site?.showcase), renderProcess(t.site?.process)],
    music: [renderHighlights(t), renderShowcase(t.site?.showcase, '課程方式'), renderProcess(t.site?.process)],
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
