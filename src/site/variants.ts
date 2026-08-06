import type { BusinessType, ProcessStep, ShowcaseItem, Tenant } from '../tenant.js';
import { escapeHtml } from './html.js';

export function getRenderVariant(t: Tenant): BusinessType | 'default' {
  return t.site?.variant ?? 'default';
}

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

  return `<section class="variant variant-${escapeHtml(variant)}" data-section="${escapeHtml(dataSection)}">${sections}</section>`;
}
