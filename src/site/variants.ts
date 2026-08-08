import type { BusinessType, ProcessStep, ShowcaseItem, Tenant } from '../tenant.js';
import { escapeHtml, safeExternalUrl } from './html.js';

export function getRenderVariant(t: Tenant): BusinessType | 'default' {
  return t.site?.variant ?? 'default';
}

export const renderMusicAmbient = (): string =>
  '<div class="music-ambient" aria-hidden="true"><span>♪</span><span>♫</span><span>♩</span></div>';

export const renderMusicLogoAnimation = (finalLogo: string): string => `<div class="music-logo-animation">
  <div class="music-logo-scene" aria-hidden="true">
    <div class="music-logo-forest music-logo-forest-back"><svg viewBox="0 0 200 200" aria-hidden="true">
      <path d="M31 198C33 153 41 101 65 46M170 198C166 146 157 100 138 47" fill="none" stroke="#5a3927" stroke-width="5" stroke-linecap="round"/>
      <g fill="#889b4e">
        <ellipse cx="49" cy="137" rx="17" ry="8" transform="rotate(-35 49 137)"/><ellipse cx="42" cy="111" rx="16" ry="8" transform="rotate(28 42 111)"/>
        <ellipse cx="55" cy="83" rx="15" ry="7" transform="rotate(-36 55 83)"/><ellipse cx="61" cy="59" rx="13" ry="7" transform="rotate(24 61 59)"/>
        <ellipse cx="151" cy="137" rx="17" ry="8" transform="rotate(35 151 137)"/><ellipse cx="158" cy="111" rx="16" ry="8" transform="rotate(-28 158 111)"/>
        <ellipse cx="145" cy="83" rx="15" ry="7" transform="rotate(36 145 83)"/><ellipse cx="139" cy="59" rx="13" ry="7" transform="rotate(-24 139 59)"/>
      </g>
    </svg></div>
    <div class="music-logo-forest music-logo-forest-near"><svg viewBox="0 0 200 200" aria-hidden="true">
      <path d="M20 205C23 151 31 112 58 67M180 205C177 151 169 112 142 67" fill="none" stroke="#5a3927" stroke-width="7" stroke-linecap="round"/>
      <g fill="#718c42">
        <ellipse cx="42" cy="153" rx="23" ry="10" transform="rotate(-35 42 153)"/><ellipse cx="34" cy="126" rx="21" ry="10" transform="rotate(28 34 126)"/>
        <ellipse cx="49" cy="99" rx="20" ry="9" transform="rotate(-36 49 99)"/><ellipse cx="57" cy="73" rx="18" ry="9" transform="rotate(24 57 73)"/>
        <ellipse cx="158" cy="153" rx="23" ry="10" transform="rotate(35 158 153)"/><ellipse cx="166" cy="126" rx="21" ry="10" transform="rotate(-28 166 126)"/>
        <ellipse cx="151" cy="99" rx="20" ry="9" transform="rotate(36 151 99)"/><ellipse cx="143" cy="73" rx="18" ry="9" transform="rotate(-24 143 73)"/>
      </g>
    </svg></div>
    <div class="music-logo-bird"><svg viewBox="0 0 90 60" aria-hidden="true">
      <path d="M8 34C17 17 41 11 59 23C66 28 72 36 80 35C72 48 54 50 39 43C28 38 20 32 8 34Z" fill="#e88432"/>
      <path d="M39 26C48 7 67 7 78 15C67 20 62 29 57 36C50 31 46 28 39 26Z" fill="#f4aa41"/>
      <circle cx="64" cy="24" r="3" fill="#5a3927"/><path d="M78 35L88 30L82 41Z" fill="#e88432"/>
    </svg></div>
    <div class="music-logo-microphone"><svg viewBox="0 0 100 140" aria-hidden="true">
      <rect x="31" y="12" width="38" height="76" rx="19" fill="#d49a58" stroke="#5a3927" stroke-width="6"/>
      <path d="M20 68V81C20 111 80 111 80 81V68M50 111V130M31 130H69" fill="none" stroke="#5a3927" stroke-width="7" stroke-linecap="round"/>
      <path d="M39 30V55M50 25V60M61 30V55" fill="none" stroke="#8d5a35" stroke-width="5" stroke-linecap="round"/>
    </svg></div>
  </div>
  <div class="music-logo-final">${finalLogo}</div>
</div>`;

export const renderMusicNoteBurst = (label: string): string => {
  const notes = label === 'contact' ? '<span>♪</span>' : '<span>♪</span><span>♫</span>';
  return `<div class="music-note-burst" data-note-burst="${escapeHtml(label)}" aria-hidden="true">${notes}</div>`;
};

const renderFlipCard = (className: string, front: string, back: string): string =>
  `<article class="${className} flip-card" tabindex="0" role="button" aria-expanded="false"><div class="flip-card-inner"><div class="flip-card-face flip-card-front">${front}</div><div class="flip-card-face flip-card-back">${back}</div></div></article>`;

const renderHighlights = (t: Tenant): string => {
  const highlights = t.site?.highlights;
  if (!highlights?.length) return '';
  const title = t.site?.variant === 'music' ? '年齡分班' : '精 選 特 色';

  return `<div class="variant-block highlights"><h3>${title}</h3><div class="highlight-list">${highlights
    .map((item) => {
      const front = `<p class="highlight-label">${escapeHtml(item.label)}</p><p class="highlight-value">${escapeHtml(item.value)}</p>`;
      const back = item.description ? `<p>${escapeHtml(item.description)}</p>` : '<p>課程簡介準備中</p>';
      return t.site?.variant === 'music'
        ? renderFlipCard('highlight', front, back)
        : `<article class="highlight">${front}${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}</article>`;
    })
    .join('')}</div></div>`;
};

const renderShowcase = (items?: ShowcaseItem[], title = '精 選 展 示', options?: { flip?: boolean; hideMeta?: boolean }): string => {
  if (!items?.length) return '';

  return `<div class="variant-block showcase"><h3>${title}</h3>${items
    .map((item) => {
      const front = `${item.category ? `<p class="showcase-category">${escapeHtml(item.category)}</p>` : ''}<h4>${escapeHtml(item.title)}</h4>`;
      const back = `<p>${escapeHtml(item.description)}</p>`;
      if (options?.flip) return renderFlipCard('showcase-item', front, back);
      return `<article class="showcase-item">${front}${back}${!options?.hideMeta && item.meta ? `<p class="showcase-meta">${escapeHtml(item.meta)}</p>` : ''}</article>`;
    })
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
            ${item.meta ? `<p class="student-work-meta">${escapeHtml(item.meta)}</p>` : ''}${url ? `<a class="student-work-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">觀看作品</a>` : ''}
          </article>`;
        })
        .join('')}</div>`
    : `<div class="student-showcase-empty"><p class="student-showcase-kicker">第一首作品準備中</p><div class="student-work-placeholder" aria-hidden="true"><span class="student-work-placeholder-note">♪</span><div class="student-work-placeholder-copy"><strong>學生演奏紀錄</strong><small>完成第一首曲子後，將在這裡留下成長足跡</small></div></div></div>`;

  return `<section id="student-showcase" class="student-showcase music-motion-section"><h2>雲 端 成 發</h2><p class="student-showcase-intro">記錄成長,督促自己,也激勵別人!</p>${renderMusicNoteBurst('showcase')}${content}</section>`;
};

export function renderVariantSections(t: Tenant): string {
  const variant = getRenderVariant(t);
  if (variant === 'default') return '';

  const sections = {
    restaurant: [renderHighlights(t), renderShowcase(t.site?.showcase)],
    interior: [renderShowcase(t.site?.showcase), renderProcess(t.site?.process)],
    pet: [renderHighlights(t), renderShowcase(t.site?.showcase), renderProcess(t.site?.process)],
    music: [renderHighlights(t), renderShowcase(t.site?.showcase, '課程方式', { flip: true, hideMeta: true }), renderProcess(t.site?.process)],
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
