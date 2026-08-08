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

    expect(html).toContain('class="music-logo-final"');
    expect(html).toMatch(/class="music-logo-final" src="data:image\/png;base64,/);
    expect(html).toContain('alt="那莫好聽 Logo');
  });

  it('音樂版 Logo 會輸出森林、飛鳥與麥克風的開場動畫', () => {
    const musicHtml = renderSite(loadTenant('demo-music'));
    const defaultHtml = renderSite(makeTenant());

    expect(musicHtml).toContain('class="music-logo-animation"');
    for (const layer of ['ring', 'forest-left', 'forest-right', 'microphone', 'bird', 'notes']) {
      expect(musicHtml).toContain(`class="music-logo-layer music-logo-layer-${layer}"`);
      expect(musicHtml).toContain('src="data:image/png;base64,');
    }
    expect(musicHtml).toContain('@keyframes music-logo-forest-left');
    expect(musicHtml).toContain('@keyframes music-logo-forest-right');
    expect(musicHtml).toContain('@keyframes music-logo-bird-flight');
    expect(musicHtml).toContain('@keyframes music-logo-microphone-arrive');
    expect(musicHtml).toContain('class="music-logo-final-frame"');
    expect(musicHtml).toContain('class="music-logo-final"');
    expect(musicHtml).toContain('class="music-logo-layer-stack"');
    expect(musicHtml).toMatch(/class="music-logo-final" src="data:image\/png;base64,/);
    expect(musicHtml).toContain('@keyframes music-logo-final');
    expect(musicHtml).toContain('@keyframes music-logo-layers-exit');
    expect(musicHtml).toContain('scale(1) rotate(0)');
    expect(musicHtml).toContain('.music-logo-final{display:block;width:100%;height:100%;margin:0;object-fit:contain;transform:none;transform-origin:center;');
    expect(musicHtml).not.toContain('music-logo-final{display:block;width:100%;height:100%;margin:0;object-fit:contain;transform:scale(1.05)');
    expect(musicHtml).toContain('.music-logo-layer-stack{position:absolute;inset:0;animation:music-logo-layers-exit 620ms ease-out 4.25s both}');
    expect(musicHtml).toContain('.music-logo-final-frame{position:absolute;inset:0;z-index:7;opacity:0;pointer-events:none;animation:music-logo-final 620ms ease-out 4.25s both}');
    expect(musicHtml).toContain('translate(-17.15%,1.72%) scale(.75)');
    expect(musicHtml).toContain('translate(16.36%,9.23%) scale(.7)');
    expect(musicHtml).toContain('translate(9.23%,3.69%) rotate(0) scale(1.05)');
    expect(musicHtml).toContain('100%{opacity:1;transform:translate(0,0) scale(.9)}');
    expect(musicHtml).not.toContain('100%{opacity:1;transform:translate(0,0) scale(1)}');
    expect(musicHtml).toContain('music-logo-layer-notes{z-index:8;');
    expect(musicHtml).toContain('@keyframes music-logo-notes');
    expect(musicHtml).toContain('transform:translateY(0) scale(1)');
    expect(musicHtml).not.toContain('transform:translateY(0) scale(.92)');
    expect(musicHtml).toContain('.music-logo-layer-forest-right{z-index:0;');
    const forestLeftIndex = musicHtml.indexOf('class="music-logo-layer music-logo-layer-forest-left"');
    const forestRightIndex = musicHtml.indexOf('class="music-logo-layer music-logo-layer-forest-right"');
    const ringIndex = musicHtml.indexOf('class="music-logo-layer music-logo-layer-ring"');
    const notesIndex = musicHtml.indexOf('class="music-logo-layer music-logo-layer-notes"');
    const microphoneIndex = musicHtml.indexOf('class="music-logo-layer music-logo-layer-microphone"');
    const birdIndex = musicHtml.indexOf('class="music-logo-layer music-logo-layer-bird"');
    expect(forestLeftIndex).toBeLessThan(ringIndex);
    expect(ringIndex).toBeLessThan(notesIndex);
    expect(notesIndex).toBeLessThan(microphoneIndex);
    expect(microphoneIndex).toBeLessThan(birdIndex);
    expect(birdIndex).toBeLessThan(forestRightIndex);
    expect(musicHtml).not.toContain('music-logo-slices');
    expect(musicHtml).not.toContain('clip-path:');
    expect(musicHtml).not.toContain('<svg');
    expect(musicHtml).toContain('prefers-reduced-motion:reduce');
    expect(defaultHtml).not.toContain('music-logo-animation');
  });

  it('樹枝完成影格只使用與 combined 相同的等比例平移', () => {
    const musicHtml = renderSite(loadTenant('demo-music'));

    expect(musicHtml).toMatch(/@keyframes music-logo-forest-left\{0%\{opacity:0;transform:translate\(-15\.83%,2\.37%\) scale\(\.48\) rotate\(-12deg\)\}22%\{opacity:1\}100%\{opacity:1;transform:translate\(-17\.15%,1\.72%\) scale\(\.75\)\}\}/);
    expect(musicHtml).toMatch(/@keyframes music-logo-forest-right\{0%\{opacity:0;transform:translate\(15\.83%,2\.37%\) scale\(\.48\) rotate\(12deg\)\}22%\{opacity:1\}100%\{opacity:1;transform:translate\(16\.36%,9\.23%\) scale\(\.7\)\}\}/);
  });

  it('麥克風完成前不會放大超過 combined 的九成比例', () => {
    const musicHtml = renderSite(loadTenant('demo-music'));

    expect(musicHtml).toMatch(/@keyframes music-logo-microphone-arrive\{0%,42%\{opacity:0;transform:translate\(0,2\.37%\) scale\(\.15\)\}72%\{opacity:1;transform:translate\(0,\.40%\) scale\(\.9\)\}100%\{opacity:1;transform:translate\(0,0\) scale\(\.9\)\}\}/);
  });

  it('notes 完成後才以不透明的完成圖交接', () => {
    const musicHtml = renderSite(loadTenant('demo-music'));

    expect(musicHtml).toContain('.music-logo-layer-notes{z-index:2;animation:music-logo-notes 1s ease-out 3.2s both}');
    expect(musicHtml).toMatch(/@keyframes music-logo-notes\{0%\{opacity:0;transform:translateY\(1\.85%\) scale\(\.78\)\}100%\{opacity:1;transform:translateY\(0\) scale\(1\)\}\}/);
    expect(musicHtml).toMatch(/\.music-logo-layer-stack\{position:absolute;inset:0;animation:music-logo-layers-exit 620ms ease-out 4\.25s both\}/);
    expect(musicHtml).toMatch(/\.music-logo-final-frame\{position:absolute;inset:0;z-index:7;opacity:0;pointer-events:none;animation:music-logo-final 620ms ease-out 4\.25s both\}/);
  });

  it('FAQ summary 至少有 44px 互動高度', () => {
    const html = renderSite(makeTenant('pet'));
    expect(html).toMatch(/summary\{[^}]*min-height:44px/);
  });

  it('音樂版有雲端成發導覽與沒有作品時的空狀態', () => {
    const html = renderSite(makeTenant('music'));

    expect(html).toContain('href="#student-showcase">雲端成發</a>');
    expect(html).toContain('<section id="student-showcase"');
    expect(html).toContain('第一首作品準備中');
  });

  it('音樂首頁服務區塊會排在雲端成發之前', () => {
    const html = renderSite(makeTenant('music'));
    const servicesIndex = html.indexOf('<section id="services"');
    const showcaseIndex = html.indexOf('<section id="student-showcase"');
    expect(servicesIndex).toBeGreaterThan(-1);
    expect(showcaseIndex).toBeGreaterThan(-1);
    expect(servicesIndex).toBeLessThan(showcaseIndex);
  });

  it('音樂版移除示意作品後回到雲端成發空狀態', () => {
    const musicHtml = renderSite(loadTenant('demo-music'));
    const musicMarkup = musicHtml.slice(musicHtml.indexOf('</style>'));

    expect(musicHtml).toContain('第一首作品準備中');
    expect(musicHtml).not.toContain('暖色琴房');
    expect(musicMarkup).not.toContain('student-work-media');
    expect(musicMarkup).not.toContain('music-lightbox');
  });

  it('音樂版輸出混合音符動畫，其他版型不輸出音樂腳本', () => {
    const musicHtml = renderSite(makeTenant('music'));
    const defaultHtml = renderSite(makeTenant());

    expect(musicHtml).toContain('class="music-ambient"');
    expect(musicHtml).toContain('class="music-note-burst"');
    expect(musicHtml).toContain('IntersectionObserver');
    expect(musicHtml).toContain('prefers-reduced-motion:reduce');
    expect(musicHtml).toContain('aria-hidden="true"');
    expect(musicHtml).not.toContain('<audio');
    expect(defaultHtml).not.toContain('<div class="music-ambient"');
    expect(defaultHtml).not.toContain('data-note-burst="');
    expect(defaultHtml).not.toContain('IntersectionObserver');
  });

  it('首頁漂浮音符避開最上方聯絡預約按鈕', () => {
    const html = renderSite(loadTenant('demo-music'));

    expect(html).toContain('.music-hero .music-ambient span:nth-child(3){top:42%;bottom:auto;left:22%}');
  });

  it('關於區塊會放大品牌名稱四個字', () => {
    const html = renderSite(loadTenant('demo-music'));

    expect(html).toContain('<p class="about"><span class="about-brand">那莫好聽</span>相信');
    expect(html).toContain('.about-brand{');
    expect(html).not.toContain('.about::first-letter');
  });

  it('音樂版使用年齡分班與課程方式作為區塊標題', () => {
    const musicHtml = renderSite(loadTenant('demo-music'));
    const petHtml = renderSite(makeTenant('pet'));

    expect(musicHtml).toContain('<h3>年齡分班</h3>');
    expect(musicHtml).toContain('<h3>課程方式</h3>');
    expect(musicHtml).not.toContain('精 選 特 色');
    expect(musicHtml).not.toContain('精 選 展 示');
    expect(petHtml).toContain('精 選 特 色');
    expect(petHtml).toContain('精 選 展 示');
  });

  it('年齡分班與課程方式會翻卡，課程方式正面不列價格', () => {
    const html = renderSite(loadTenant('demo-music'));
    const courseSectionStart = html.indexOf('<section class="variant variant-music');
    const courseSectionEnd = html.indexOf('<section id="services"');
    const courseSection = html.slice(courseSectionStart, courseSectionEnd);

    expect(html.match(/class="highlight flip-card"/g)).toHaveLength(4);
    expect(html.match(/class="showcase-item flip-card"/g)).toHaveLength(2);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('rotateY(180deg)');
    expect(html).toContain("event.key !== 'Enter'");
    expect(html).toContain("event.key !== ' '");
    expect(html).toContain('能鞏固基礎和提升程度。每一次都比上一次厲害');
    expect(courseSection).not.toContain('NT$900');
    expect(courseSection).not.toContain('NT$450');
    expect(html).toContain('<span class="svc-price">初階 NT$900／堂');
    expect(html).toContain('<span class="svc-price">NT$450／人／堂</span>');
  });

  it('音樂首頁 CTA 直接說明試上一堂 NT$100', () => {
    const musicHtml = renderSite(loadTenant('demo-music'));
    const defaultHtml = renderSite(makeTenant());
    const heroMarkup = musicHtml.slice(musicHtml.indexOf('<header'), musicHtml.indexOf('</header>'));
    const musicCtas = musicHtml.match(/<a class="cta"[^>]*>試上一堂 NT\$100<\/a>/g) ?? [];

    expect(heroMarkup).not.toContain('class="cta"');
    expect(musicCtas).toHaveLength(1);
    expect(musicHtml).toContain('id="contact"');
    expect(defaultHtml).toContain('href="#contact">聯絡／預約</a>');
  });

  it('音樂首頁移除 Hero 類別文案並顯示到府上課說明', () => {
    const html = renderSite(loadTenant('demo-music'));

    expect(html).not.toContain('一對一與團體音樂課');
    expect(html).toContain('class="contact-note">到府上課需另外酌收相對應距離的交通津貼，歡迎其他區域留言詢問！</p>');
  });

  it('手機版試上課文字會被獨立背景與音符分開', () => {
    const html = renderSite(loadTenant('demo-music'));

    expect(html).toContain('#services .svc{position:relative;z-index:1;background:var(--bg)');
    expect(html).toContain('#services .music-note-burst[data-note-burst=services] span:first-child');
    expect(html).toContain('#services .music-note-burst[data-note-burst=services] span:last-child');
    expect(html).not.toContain('opacity:.86}}@media');
  });

  it('音樂課程將價格與堂數時長分成不同資訊層級', () => {
    const tenant = makeTenant('music');
    tenant.services = [
      { name: '鋼琴一對一', desc: '課程說明', price: 'NT$3,600／4 堂', duration: '每堂 50 分鐘' },
    ];

    const html = renderSite(tenant);

    expect(html).toContain('<span class="svc-price">NT$3,600／4 堂</span>');
    expect(html).toContain('<span class="svc-duration">每堂 50 分鐘</span>');
    expect(html).toContain('body[data-variant=music] .svc-price{');
  });

  it('音樂版團班顯示 50 分鐘，級別價格以換行呈現', () => {
    const html = renderSite(loadTenant('demo-music'));

    expect(html).toContain('<span class="svc-duration">每堂 50 分鐘</span>');
    expect(html).toContain('<span class="svc-duration">每堂 30 分鐘</span>');
    expect(html).toContain('初階 NT$900／堂\n進階 NT$1,200／堂\n高階 NT$1,500／堂');
    expect(html.slice(html.indexOf('</style>'))).not.toContain('showcase-meta');
    expect(html).toMatch(/body\[data-variant=music\] \.svc-price\{[^}]*white-space:pre-line/);
    expect(html).toContain('.variant-music .showcase-meta{white-space:pre-line');
  });

  it('音樂版價格不使用深色橢圓背景', () => {
    const html = renderSite(loadTenant('demo-music'));

    expect(html).toMatch(/body\[data-variant=music\] \.svc-price\{[^}]*background:transparent/);
    expect(html).toMatch(/body\[data-variant=music\] \.svc-price\{[^}]*border-radius:0/);
    expect(html).toMatch(/body\[data-variant=music\] \.svc-price\{[^}]*padding:0/);
  });

  it('音樂版 sticky 導覽會依目前區段標記 active', () => {
    const html = renderSite(makeTenant('music'));

    expect(html).toContain('.site-nav a.is-active{');
    expect(html).toContain('classList.toggle(\'is-active\'');
    expect(html).toContain('const navObserver = new IntersectionObserver');
    expect(html).toContain("threshold: 0, rootMargin: '-35% 0px -55% 0px'");
  });

  it('音樂版互動效果只輸出在音樂版，並尊重 reduced motion', () => {
    const musicHtml = renderSite(loadTenant('demo-music'));
    const defaultHtml = renderSite(makeTenant());
    const musicMarkup = musicHtml.slice(musicHtml.indexOf('</style>'));
    const defaultMarkup = defaultHtml.slice(defaultHtml.indexOf('</style>'));

    expect(musicHtml).toContain('--music-pointer-x');
    expect(musicMarkup).not.toContain('data-lightbox-trigger');
    expect(musicMarkup).not.toContain('music-lightbox');
    expect(musicHtml).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(defaultMarkup).not.toContain('--music-pointer-x');
    expect(defaultMarkup).not.toContain('data-lightbox-trigger');
  });

  it('重新整理頁面時會回到最上方', () => {
    const musicHtml = renderSite(loadTenant('demo-music'));
    const defaultHtml = renderSite(makeTenant());

    for (const html of [musicHtml, defaultHtml]) {
      const head = html.slice(html.indexOf('<head>'), html.indexOf('<style>'));
      expect(head).toContain("history.scrollRestoration = 'manual'");
      expect(html).toContain("history.scrollRestoration = 'manual'");
      expect(html).toContain("window.addEventListener('load', resetAfterBrowserRestore");
      expect(html).toContain("window.addEventListener('pageshow', resetAfterBrowserRestore");
      expect(html).toContain('window.setTimeout(reset, 300)');
      expect(html).toContain("document.documentElement.style.scrollBehavior = 'auto'");
      expect(html).toContain("document.body.style.scrollBehavior = 'auto'");
      expect(html).toContain('document.documentElement.scrollTop = 0');
      expect(html).toContain('window.scrollTo(0,0)');
    }
  });

  it('雲端成發空狀態會呈現作品預告卡', () => {
    const html = renderSite(makeTenant('music'));

    expect(html).toContain('第一首作品準備中');
    expect(html).toContain('class="student-work-placeholder"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('每一段練習都會留下足跡，之後在這裡看見從第一次彈奏到完整演出的成長幅度。');
    expect(html).not.toContain('學生作品整理中');
  });

  it('聯絡區音符收斂成單一小音符，其他分區保留不同節奏設定', () => {
    const html = renderSite(makeTenant('music'));

    expect(html).toContain('data-note-burst="contact" aria-hidden="true"><span>♪</span></div>');
    expect(html).toContain('.music-note-burst[data-note-burst=showcase]');
    expect(html).toContain('.music-note-burst[data-note-burst=contact]');
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
