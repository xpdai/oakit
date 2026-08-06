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

  it('開店日補充說明同時進入 knowledge 與營業時間規則回覆', () => {
    const tenant = loadTenant('demo-bistro');
    const knowledge = buildKnowledge(tenant);
    const reply = ruleReply('今天營業時間？', tenant);

    expect(knowledge).toContain('週二至週五 11:30–14:30（午間定食供應至 14:00）');
    expect(reply).toContain('週二至週日 17:30–21:30（晚間最後點餐 20:45）');
  });
});
