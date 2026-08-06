import { describe, expect, it } from 'vitest';
import { renderSite } from '../src/site/render.js';
import { loadTenant, type BusinessType, type Tenant } from '../src/tenant.js';

const makeTenant = (variant?: BusinessType): Tenant => ({
  id: 'render-test',
  brand: {
    name: variant ? `${variant} 測試` : '舊版測試',
    tagline: '一個測試標語',
    about: '一段測試介紹',
  },
  contact: { address: '測試地址' },
  hours: [{ days: '週一', open: '09:00', close: '18:00' }],
  services: [{ name: '測試服務', desc: '測試服務說明', price: 'NT$100' }],
  faq: [{ q: '可以嗎？', a: '可以。' }],
  site: variant
    ? {
        variant,
        eyebrow: '測試標籤',
        heroNote: '測試 Hero 說明',
        highlights: [{ label: '特色', value: '測試值', description: '測試特色' }],
        showcase: [{ title: '展示內容', category: '分類', description: '展示說明', meta: '補充資料' }],
        process: [{ step: '01', title: '第一步', description: '第一步說明' }],
      }
    : undefined,
});

describe('renderSite variants', () => {
  it.each(['restaurant', 'interior', 'pet', 'music'] as const)('輸出 %s marker', (variant) => {
    const html = renderSite(makeTenant(variant));
    expect(html).toContain(`data-variant="${variant}"`);
    expect(html).toContain(`variant-${variant}`);
    expect(html).toContain('展示內容');
  });

  it.each([
    ['restaurant', 'menu'],
    ['interior', 'projects'],
    ['pet', 'care'],
    ['music', 'courses'],
  ] as const)('%s 使用 data-section=%s', (variant, section) => {
    const html = renderSite(makeTenant(variant));
    expect(html).toContain(`data-section="${section}"`);
  });

  it('輸出四種 presenter CSS 與桌機、手機 responsive layout', () => {
    const html = renderSite(makeTenant('restaurant'));

    for (const variant of ['restaurant', 'interior', 'pet', 'music']) {
      expect(html).toContain(`.variant-${variant}`);
    }
    expect(html).toContain('@media (min-width:768px)');
    expect(html).toContain('@media (max-width:767px)');
    expect(html).toMatch(/@media \(min-width:768px\)[^{]*\{[\s\S]*grid-template-columns/);
    expect(html).toMatch(/@media \(max-width:767px\)[^{]*\{[\s\S]*grid-template-columns:1fr/);
  });

  it('共用 shell 保留語意 main、可見 focus 與 reduced-motion 支援', () => {
    const html = renderSite(makeTenant('music'));

    expect(html).toContain('<main>');
    expect(html).toContain('</main>');
    expect(html).toContain('class="site-nav"');
    expect(html).toContain('a:focus-visible,summary:focus-visible,.cta:focus-visible');
    expect(html).toContain('@media (prefers-reduced-motion:reduce)');
  });

  it('那莫好聽會將品牌 Logo 內嵌在單檔官網', () => {
    const html = renderSite(loadTenant('demo-music'));

    expect(html).toContain('class="brand-logo"');
    expect(html).toContain('src="data:image/jpeg;base64,');
    expect(html).toContain('alt="那莫好聽 Logo');
  });

  it('FAQ summary 至少有 44px 互動高度', () => {
    const html = renderSite(makeTenant('pet'));
    expect(html).toMatch(/summary\{[^}]*min-height:44px/);
  });

  it('音樂版有雲端成發導覽與沒有作品時的空狀態', () => {
    const html = renderSite(makeTenant('music'));

    expect(html).toContain('href="#student-showcase">雲端成發</a>');
    expect(html).toContain('<section id="student-showcase"');
    expect(html).toContain('學生作品整理中');
  });

  it('雲端成發只渲染安全的作品連結', () => {
    const tenant = makeTenant('music');
    tenant.site = {
      ...tenant.site!,
      studentShowcase: [
        { title: '安全作品', description: '作品說明', url: 'https://example.com/student-work' },
        { title: '不安全作品', description: '不應產生連結', url: 'javascript:alert(1)' },
      ],
    } as typeof tenant.site;

    const html = renderSite(tenant);

    expect(html).toContain('href="https://example.com/student-work"');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('不安全作品');
  });

  it('雲端成發使用最新成長文案', () => {
    const html = renderSite(makeTenant('music'));

    expect(html).toContain('記錄成長,督促自己,也激勵別人!');
    expect(html).not.toContain('把課堂裡練好的曲子留下來');
  });

  it('網站先隱藏營業時間區塊，客服資料仍由 tenant 保留', () => {
    const tenant = makeTenant('restaurant');
    tenant.hours = [
      { days: '週二至週五', open: '11:30', close: '14:30', note: '午間定食供應至 14:00' },
      { days: '週一', note: '公休' },
    ];

    const html = renderSite(tenant);

    expect(html).not.toContain('id="hours"');
    expect(html).not.toContain('營 業 時 間');
    expect(html).not.toContain('href="#hours"');
  });

  it('沒有 site 時使用 default，不丟失既有內容', () => {
    const html = renderSite(makeTenant());
    expect(html).toContain('data-variant="default"');
    expect(html).toContain('測試服務');
    expect(html).toContain('常 見 問 題');
    expect(html).not.toContain('<section class="variant');
  });

  it('所有租戶文字都會 escaping，且沒有外部資源標籤', () => {
    const tenant = makeTenant('restaurant');
    tenant.brand.name = '<script>alert("x")</script>';
    const html = renderSite(tenant);
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert');
    expect(html).not.toMatch(/<link[^>]+href=|<script[^>]+src=|@import|url\(/);
  });

  it('拒絕不安全的地圖與 LINE URL，改用安全 fallback', () => {
    const tenant = makeTenant();
    tenant.contact.mapUrl = 'javascript:alert(1)';
    tenant.contact.lineAddUrl = 'javascript:alert(2)';

    const html = renderSite(tenant);

    expect(html).not.toContain('javascript:');
    expect(html).toContain('<dd>測試地址</dd>');
    expect(html).toContain('href="#contact">聯絡／預約</a>');
  });

  it('拒絕會注入宣告的 theme 值並回退到預設色彩', () => {
    const tenant = makeTenant();
    tenant.theme = {
      accent: '#123456; background:url(https://example.test/evil)',
      bg: '#fff} body { visibility:collapse',
      ink: 'url(https://example.test/evil)',
    };

    const html = renderSite(tenant);

    expect(html).not.toContain('url(');
    expect(html).not.toContain('visibility:collapse');
    expect(html).toContain(':root{--accent:#1f6f5c;--bg:#faf9f6;--ink:#1c1b19;');
  });
});
