/**
 * 知識庫：把租戶設定壓成一段給 AI 讀的純文字。
 *
 * 重點是「官網顯示什麼，AI 就知道什麼」—— 同一份 tenant.json，
 * 所以不會出現官網寫十點開門、LINE 客服說九點的情況。
 * 這段文字會放進 system prompt 並開快取，每次回覆只付約十分之一的價格。
 */

import { formatHours, type Tenant } from './tenant.js';

export function buildKnowledge(t: Tenant): string {
  const lines: string[] = [];

  lines.push(`# ${t.brand.name}`);
  lines.push(t.brand.tagline);
  lines.push('');
  lines.push('## 關於我們');
  lines.push(t.brand.about);
  lines.push('');

  lines.push('## 營業時間');
  lines.push(formatHours(t));
  lines.push('');

  if (t.contact.address || t.contact.phone) {
    lines.push('## 聯絡方式');
    if (t.contact.address) lines.push(`地址：${t.contact.address}`);
    if (t.contact.phone) lines.push(`電話：${t.contact.phone}`);
    if (t.contact.email) lines.push(`Email：${t.contact.email}`);
    lines.push('');
  }

  lines.push('## 服務與價格');
  for (const s of t.services) {
    const bits = [s.name];
    if (s.price) bits.push(`價格 ${s.price}`);
    if (s.duration) bits.push(`約 ${s.duration}`);
    lines.push(`- ${bits.join('｜')}：${s.desc}`);
  }
  lines.push('');

  if (t.notices?.length) {
    lines.push('## 目前公告（最優先，若與其他資訊衝突以此為準）');
    for (const n of t.notices) lines.push(`- ${n}`);
    lines.push('');
  }

  if (t.site) {
    lines.push('## 網站重點');
    lines.push(`類型：${t.site.variant}`);
    if (t.site.eyebrow) lines.push(`定位：${t.site.eyebrow}`);
    if (t.site.heroNote) lines.push(`首頁說明：${t.site.heroNote}`);
    for (const item of t.site.highlights ?? []) {
      lines.push(`- ${item.label}｜${item.value}${item.description ? `：${item.description}` : ''}`);
    }
    for (const item of t.site.showcase ?? []) {
      lines.push(`- ${item.title}${item.category ? `｜${item.category}` : ''}${item.meta ? `｜${item.meta}` : ''}：${item.description}`);
    }
    for (const step of t.site.process ?? []) {
      lines.push(`${step.step}. ${step.title}：${step.description}`);
    }
    lines.push('');
  }

  if (t.faq.length) {
    lines.push('## 常見問題');
    for (const f of t.faq) {
      lines.push(`Q：${f.q}`);
      lines.push(`A：${f.a}`);
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

/**
 * 規則式回覆：能用關鍵字答掉的就別動用 AI。
 *
 * 這不只是省錢 —— 營業時間、地址、電話這類問題佔了實際訊息的大宗，
 * 而且答案必須逐字精確，交給規則比交給模型更安全也更快。
 * 回傳 null 表示「規則答不出來」，再往上交給 AI。
 */
export function ruleReply(text: string, t: Tenant): string | null {
  const q = text.trim().toLowerCase();
  const has = (...words: string[]) => words.some((w) => q.includes(w));

  if (has('營業', '幾點', '開到', '開門', '休息', '公休', '時間')) {
    const notice = t.notices?.length ? `\n\n【公告】${t.notices.join('\n')}` : '';
    return `我們的營業時間：\n${formatHours(t)}${notice}`;
  }

  if (has('地址', '在哪', '怎麼去', '位置', '停車')) {
    if (!t.contact.address) return null;
    const map = t.contact.mapUrl ? `\n地圖：${t.contact.mapUrl}` : '';
    return `我們的地址：${t.contact.address}${map}`;
  }

  if (has('電話', '聯絡', '打給')) {
    if (!t.contact.phone) return null;
    return `電話：${t.contact.phone}\n營業時間內都可以直接打給我們。`;
  }

  if (has('價格', '價錢', '多少錢', '學費', '費用', '收費', '報價')) {
    const list = t.services
      .map((s) => `・${s.name}${s.price ? `：${s.price}` : ''}`)
      .join('\n');
    return `我們的服務與價格：\n${list}\n\n實際價格會依情況調整，想問特定項目可以直接跟我說。`;
  }

  return null;
}
