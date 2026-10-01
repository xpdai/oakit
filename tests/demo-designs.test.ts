import { describe, expect, it } from 'vitest';
import { loadTenant } from '../src/tenant.js';
import { renderDemoDesign } from '../src/site/demo-designs.js';
import { renderSite } from '../src/site/render.js';
describe('Public industry design concepts', () => {
  it.each([['demo-bistro','restaurant'],['demo-interior','interior'],['demo-pet','pet']])('renders %s without live customer contact', (id, design) => {
    const html=renderSite(loadTenant(id));
    expect(html).toContain(`data-design="${design}"`);
    expect(html).toContain('./assets/');
    expect(html).toContain('AI 原創視覺');
    expect(html).not.toMatch(/href="(?:tel:|https:\/\/line\.me)|<form|<input/);
    expect(html).not.toContain(loadTenant(id).contact.address ?? 'never');
  });
  it('keeps music and unrelated tenants on their existing renderer', () => {
    expect(renderDemoDesign(loadTenant('demo-music'))).toBeUndefined();
    expect(renderDemoDesign({...loadTenant('demo-pet'),id:'customer-pet'})).toBeUndefined();
  });
  it('escapes fixture text before embedding it in the new HTML', () => {
    const tenant=loadTenant('demo-bistro');tenant.brand.name='<script>unsafe()</script>';tenant.services[0].name='<img onerror="unsafe()">';
    const html=renderSite(tenant);expect(html).not.toContain('<script>unsafe()');expect(html).not.toContain('<img onerror=');expect(html).toContain('&lt;script&gt;unsafe()&lt;/script&gt;');
  });
});
