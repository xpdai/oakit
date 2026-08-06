import { describe, expect, it } from 'vitest';
import { buildKnowledge, ruleReply } from '../src/knowledge.js';
import { loadTenant } from '../src/tenant.js';

describe('site content knowledge', () => {
  it('把室內設計案例與流程放進 knowledge', () => {
    const knowledge = buildKnowledge(loadTenant('demo-interior'));
    expect(knowledge).toContain('松菸日光宅');
    expect(knowledge).toContain('丈量訪談');
    expect(knowledge).toContain('服務與價格');
  });

  it('音樂教室價格仍由 ruleReply 精確回覆', () => {
    const reply = ruleReply('學費多少？', loadTenant('demo-music'));
    expect(reply).toContain('鋼琴一對一');
    expect(reply).toContain('NT$');
  });

  it('那莫好聽只保留目前提供的課程與新價格', () => {
    const tenant = loadTenant('demo-music');
    const knowledge = buildKnowledge(tenant);

    expect(knowledge).toContain('鋼琴一對一｜流行與古典｜18歲以下');
    expect(knowledge).toContain('NT$3,600／4 堂（每堂 NT$900）');
    expect(knowledge).toContain('團班類別｜流行與古典');
    expect(knowledge).toContain('NT$450／人／堂');
    expect(tenant.services.map((service) => service.name).join('\n')).not.toContain('吉他');
    expect(tenant.services.map((service) => service.name).join('\n')).not.toContain('歌唱');
    expect(tenant.services.map((service) => service.name).join('\n')).not.toContain('樂團');
  });

  it('有學生作品時會將雲端成發資料加入知識庫', () => {
    const tenant = loadTenant('demo-music');
    tenant.site = {
      ...tenant.site!,
      studentShowcase: [{ title: '小小演奏家', description: '完成第一首古典曲目。' }],
    } as typeof tenant.site;

    expect(buildKnowledge(tenant)).toContain('小小演奏家：完成第一首古典曲目。');
  });

  it('精選特色使用四組最新班別文字', () => {
    const highlights = loadTenant('demo-music').site?.highlights ?? [];

    expect(highlights).toEqual([
      expect.objectContaining({ label: '個別（18歲以下）', value: '鋼琴一對一' }),
      expect.objectContaining({ label: '兒童（5~10歲）', value: '啟蒙小團班' }),
      expect.objectContaining({ label: '成人（18歲含以上）', value: '精進團班' }),
      expect.objectContaining({ label: '樂齡（65歲含以上）', value: '歡樂團班' }),
    ]);
    expect(highlights.map((item) => item.description)).toEqual([
      '能鞏固基礎和提升程度。每一次都比上一次厲害',
      '讓小孩與好友一同學習',
      '相伴學習、互相鼓勵',
      '人生戰士揪伴回憶心中的美好旋律',
    ]);
    expect(highlights.map((item) => item.description).join('\n')).not.toContain('5~10');
    expect(highlights.map((item) => item.description).join('\n')).not.toContain('65歲');
    expect(loadTenant('demo-music').site?.showcase?.map((item) => item.title)).toContain('團班類別');
  });

  it('團體班涵蓋兒童、成人與樂齡，且維持三人小班', () => {
    const tenant = loadTenant('demo-music');
    const groupService = tenant.services.find((service) => service.name.startsWith('團班類別'));

    expect(groupService?.desc).toBe('團體班有兒童班、成人班、樂齡班。3人即開班，最多3人，維持小班規模，不用擔心品質下降');
    expect(tenant.faq.find((item) => item.q === '團體班怎麼開班？')?.a).toContain('兒童班、成人班、樂齡班');
  });

  it('那莫好聽使用最新品牌標語與首頁說明', () => {
    const tenant = loadTenant('demo-music');

    expect(tenant.brand.tagline).toBe('那麼好玩、那麼有趣');
    expect(tenant.site?.heroNote).toBe('不論初學或進階、不論古典或流行、不論學齡或樂齡');
  });

  it('開店日補充說明同時進入 knowledge 與營業時間規則回覆', () => {
    const tenant = loadTenant('demo-bistro');
    const knowledge = buildKnowledge(tenant);
    const reply = ruleReply('今天營業時間？', tenant);

    expect(knowledge).toContain('週二至週五 11:30–14:30（午間定食供應至 14:00）');
    expect(reply).toContain('週二至週日 17:30–21:30（晚間最後點餐 20:45）');
  });
});
