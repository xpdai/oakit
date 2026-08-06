/**
 * 自動回覆。兩段式：先規則、再 AI。
 *
 * ⚠️ 這裡只用 Reply API（回覆使用者的訊息），**永遠不用 Push API**。
 * LINE 的計費規則：Reply 免費不計次，Push 才計入訊息額度。
 * 2025 年免費額度從 25,000 則砍到 6,000 則之後，這個差別直接決定客戶的月成本。
 */

import Anthropic from '@anthropic-ai/sdk';
import { buildKnowledge, ruleReply } from '../knowledge.js';
import type { Tenant } from '../tenant.js';

/** 客服回覆要快，用最低 effort；opus-5 在低 effort 依然表現很好。 */
const MODEL = 'claude-opus-5';

export interface ReplyResult {
  text: string;
  /** 這則回覆是怎麼來的，方便觀察規則命中率。 */
  source: 'rule' | 'ai' | 'fallback';
}

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (client) return client;
  // 沒有金鑰時整條 AI 路徑靜默跳過，規則式回覆仍然可用。
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return null;
  client = new Anthropic();
  return client;
}

function systemPrompt(t: Tenant): string {
  return [
    `你是「${t.brand.name}」的 LINE 客服。用繁體中文、口語、簡短地回答顧客。`,
    '',
    '規則：',
    '- 只根據下面的店家資料回答。資料裡沒有的事情，直接說不確定並請對方留言，不要猜、不要自己編。',
    '- 一般問題兩三句話講完，不要條列一大串。',
    '- 不要承諾折扣、不要報資料以外的價格、不要替店家做決定。',
    '- 顧客想預約或有客訴時，請他留下方便的時間與聯絡方式，說會由專人回覆。',
    '',
    '=== 店家資料 ===',
    buildKnowledge(t),
  ].join('\n');
}

export async function replyTo(text: string, t: Tenant): Promise<ReplyResult> {
  // 1. 規則式：免費、即時、逐字精確。
  const rule = ruleReply(text, t);
  if (rule) return { text: rule, source: 'rule' };

  // 2. AI：規則答不出來的才走這裡。
  const anthropic = getClient();
  if (anthropic) {
    try {
      const res = await anthropic.beta.messages.create({
        model: MODEL,
        max_tokens: 1024,
        // 客服重視反應速度，用最低 effort；答不好再往上調。
        output_config: { effort: 'low' },
        // 安全分類器可能擋下請求；讓伺服器自動改用備援模型，而不是把錯誤丟給顧客。
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: [
          {
            type: 'text',
            text: systemPrompt(t),
            // 店家資料每則訊息都一樣，開快取後只付約十分之一。
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: text }],
      });

      // 被拒絕時 content 可能是空的，不能直接讀 content[0]。
      if (res.stop_reason !== 'refusal') {
        const out = res.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('')
          .trim();
        if (out) return { text: out, source: 'ai' };
      }
    } catch (err) {
      // AI 掛掉不能讓顧客收到錯誤訊息，靜默降級到 fallback。
      console.warn('[reply] AI 回覆失敗，改用預設回覆：', err);
    }
  }

  // 3. 兜底：寧可誠實說不知道，也不要亂答。
  return {
    text:
      t.fallbackReply ??
      `這題我不太確定，已經幫你記下來了，我們營業時間會盡快回覆你。也可以直接打 ${t.contact.phone ?? '店內電話'} 找我們。`,
    source: 'fallback',
  };
}
