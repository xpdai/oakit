import type { BusinessType, ProcessStep, Service, ShowcaseItem, Tenant } from '../tenant.js';
import { escapeHtml, safeExternalUrl } from './html.js';

export function getRenderVariant(t: Tenant): BusinessType | 'default' {
  return t.site?.variant ?? 'default';
}

export const renderMusicAmbient = (): string =>
  '<div class="music-ambient" aria-hidden="true"><span>♪</span><span>♫</span><span>♩</span></div>';

export type MusicLogoLayers = {
  ring: string;
  forestLeft: string;
  forestRight: string;
  microphone: string;
  bird: string;
  notes: string;
};

export const renderMusicLogoAnimation = (layers: MusicLogoLayers, fallbackLogo: string): string => `<div class="music-logo-animation">
  <div class="music-logo-composite" aria-hidden="true">
    <div class="music-logo-layer-stack">
      ${layers.forestLeft}
      ${layers.ring}
      ${layers.notes}
      ${layers.microphone}
      ${layers.bird}
      ${layers.forestRight}
    </div>
    <div class="music-logo-final-frame">${fallbackLogo}</div>
  </div>
  <noscript>${fallbackLogo}</noscript>
</div>`;

export const renderMusicNoteBurst = (label: string): string => {
  const notes = label === 'contact' ? '<span>♪</span>' : '<span>♪</span><span>♫</span>';
  return `<div class="music-note-burst" data-note-burst="${escapeHtml(label)}" aria-hidden="true">${notes}</div>`;
};

const renderFlipCard = (className: string, front: string, back: string): string =>
  `<article class="${className} flip-card" tabindex="0" role="button" aria-expanded="false"><div class="flip-card-inner"><div class="flip-card-face flip-card-front">${front}</div><div class="flip-card-face flip-card-back">${back}</div></div></article>`;

const getMusicService = (t: Tenant, kind: 'individual' | 'group' | 'trial'): Service | undefined =>
  t.services.find((service) =>
    kind === 'individual'
      ? service.name.includes('鋼琴一對一')
      : kind === 'group'
        ? service.name.includes('團班類別')
        : service.name === '試上一堂課',
  );

const renderMusicServiceBack = (service?: Service): string =>
  `${service?.price ? `<p class="music-card-price">${escapeHtml(service.price)}</p>` : '<p>價格準備中</p>'}${service?.duration ? `<p class="music-card-duration">${escapeHtml(service.duration)}</p>` : ''}`;

const renderHighlights = (t: Tenant): string => {
  const highlights = t.site?.highlights;
  if (!highlights?.length) return '';
  const isMusic = t.site?.variant === 'music';
  const title = isMusic ? '年齡分班與價格' : '精 選 特 色';

  return `<div class="variant-block highlights"><h3>${title}</h3><div class="highlight-list">${highlights
    .map((item) => {
      const front = `<p class="highlight-label">${escapeHtml(item.label)}</p><p class="highlight-value">${escapeHtml(item.value)}</p>${isMusic && item.description ? `<p class="highlight-description">${escapeHtml(item.description)}</p>` : ''}`;
      const back = isMusic
        ? renderMusicServiceBack(item.value.includes('一對一') ? getMusicService(t, 'individual') : getMusicService(t, 'group'))
        : item.description
          ? `<p>${escapeHtml(item.description)}</p>`
          : '<p>課程簡介準備中</p>';
      return isMusic
        ? renderFlipCard('highlight', front, back)
        : `<article class="highlight">${front}${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}</article>`;
    })
    .join('')}</div></div>`;
};

const renderShowcase = (
  items?: ShowcaseItem[],
  title = '精 選 展 示',
  options?: { flip?: boolean; hideMeta?: boolean; flipBack?: (item: ShowcaseItem) => string },
): string => {
  if (!items?.length) return '';

  return `<div class="variant-block showcase"><h3>${title}</h3>${items
    .map((item) => {
      const front = `${item.category ? `<p class="showcase-category">${escapeHtml(item.category)}</p>` : ''}<h4>${escapeHtml(item.title)}</h4>`;
      const back = options?.flipBack ? options.flipBack(item) : `<p>${escapeHtml(item.description)}</p>`;
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
    music: [
      renderShowcase(t.site?.showcase, '課程方式', {
        flip: true,
        hideMeta: true,
        flipBack: (item) =>
          item.title === '試上一堂'
            ? `<p>${escapeHtml(item.description)}</p>${renderMusicServiceBack(getMusicService(t, 'trial'))}`
            : `<p>${escapeHtml(item.description)}</p>`,
      }),
      renderHighlights(t),
      renderProcess(t.site?.process),
    ],
  }[variant].join('');

  if (!sections) return '';

  const dataSection = {
    restaurant: 'menu',
    interior: 'projects',
    pet: 'care',
    music: 'courses',
  }[variant];

  return `<section class="variant variant-${escapeHtml(variant)}${variant === 'music' ? ' music-motion-section' : ''}"${variant === 'music' ? ' id="courses"' : ''} data-section="${escapeHtml(dataSection)}">${variant === 'music' ? renderMusicNoteBurst('courses') : ''}${sections}</section>`;
}
