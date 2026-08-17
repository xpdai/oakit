import { describe, expect, it } from 'vitest';
import { formatHours, loadTenant, validateTenant, type Tenant } from '../src/tenant.js';

const makeTenant = (site?: Tenant['site']): Tenant => ({
  id: 'test',
  brand: { name: '測試店', tagline: '測試標語', about: '測試介紹' },
  contact: {},
  hours: [{ days: '週一', open: '09:00', close: '18:00' }],
  services: [{ name: '測試服務', desc: '測試說明' }],
  faq: [],
  site,
});

describe('Tenant site content', () => {
  it.each(['restaurant', 'interior', 'pet', 'music'] as const)('接受 %s variant', (variant) => {
    expect(() => validateTenant(makeTenant({ variant }))).not.toThrow();
  });

  it('接受沒有 site 的既有 tenant', () => {
    expect(() => validateTenant(makeTenant())).not.toThrow();
  });

  it('拒絕未知 variant', () => {
    const invalid = makeTenant({ variant: 'casino' as never });
    expect(() => validateTenant(invalid)).toThrow('site.variant');
  });

  it('營業時段與 note 同時存在時全部保留，公休日格式不變', () => {
    const tenant = makeTenant();
    tenant.hours = [
      { days: '週二至週五', open: '11:30', close: '14:30', note: '午間定食供應至 14:00' },
      { days: '週一', note: '公休' },
    ];

    expect(formatHours(tenant)).toBe('週二至週五 11:30–14:30（午間定食供應至 14:00）\n週一 公休');
  });

  it('那莫好聽包含付款週期與三級期費', () => {
    const tenant = loadTenant('demo-music');

    expect(tenant.payment).toEqual({
      method: '轉帳或現金',
      cycleNote: '本院採「預付月繳制」（每期以 4 堂課為單位），依學員學習程度劃分：',
      plans: [
        { level: '初階課程', periodPrice: '$3,600', lessonPrice: '$900' },
        { level: '進階課程', periodPrice: '$4,800', lessonPrice: '$1,200' },
        { level: '高階課程', periodPrice: '$7,200', lessonPrice: '$1,800' },
      ],
      groupCourse: '團班課程 $1,800／期（$450／堂）',
      enrollmentNotes: [
        '為維護教學品質與權益，本院採預付報名制，請於開課前完成全額繳費。',
        '每次繳費以 4 堂課為一期，於第 4 堂課結束時續繳下一期學費。',
      ],
    });
  });
});
