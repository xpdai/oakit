import { describe, expect, it } from 'vitest';
import { formatHours, validateTenant, type Tenant } from '../src/tenant.js';

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
});
