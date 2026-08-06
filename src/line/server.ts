/**
 * Webhook 伺服器。
 *
 * 多租戶靠路徑分流：/webhook/:tenantId
 * 每個客戶一個 LINE channel、一組憑證、一條 webhook 路徑，彼此不互相干擾。
 */

import express from 'express';
import { messagingApi, validateSignature, type WebhookEvent } from '@line/bot-sdk';
import { loadTenant, type Tenant } from '../tenant.js';
import { replyTo } from './reply.js';

interface Credentials {
  accessToken: string;
  channelSecret: string;
}

/**
 * 憑證從環境變數取，命名慣例 LINE_<TENANT>_TOKEN / _SECRET（租戶 id 大寫、連字號轉底線）。
 * 只有一個租戶時可以直接用 LINE_TOKEN / LINE_SECRET。
 */
export function credentialsFor(tenantId: string): Credentials | null {
  const key = tenantId.toUpperCase().replace(/-/g, '_');
  const accessToken = process.env[`LINE_${key}_TOKEN`] ?? process.env.LINE_TOKEN;
  const channelSecret = process.env[`LINE_${key}_SECRET`] ?? process.env.LINE_SECRET;
  if (!accessToken || !channelSecret) return null;
  return { accessToken, channelSecret };
}

async function handleEvent(
  event: WebhookEvent,
  tenant: Tenant,
  api: messagingApi.MessagingApiClient,
): Promise<void> {
  // 只處理文字訊息。貼圖、圖片、加好友等事件先略過，之後要再加。
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const { text, source } = { text: event.message.text, source: event.source };
  const result = await replyTo(text, tenant);
  console.log(`[${tenant.id}] ${source.type} 「${text}」→ ${result.source}`);

  // 一律用 replyMessage：Reply API 免費不計次，Push API 才會吃掉客戶的訊息額度。
  await api.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: 'text', text: result.text }],
  });
}

export function createServer(): express.Express {
  const app = express();

  // 簽章驗證要用原始 bytes，所以這裡收 raw 而不是 express.json()。
  app.post('/webhook/:tenantId', express.raw({ type: '*/*' }), async (req, res) => {
    const tenantId = req.params.tenantId;

    let tenant: Tenant;
    try {
      tenant = loadTenant(tenantId);
    } catch {
      res.status(404).send('unknown tenant');
      return;
    }

    const creds = credentialsFor(tenantId);
    if (!creds) {
      console.error(`[${tenantId}] 找不到憑證，請設定 LINE_${tenantId.toUpperCase()}_TOKEN / _SECRET`);
      res.status(500).send('missing credentials');
      return;
    }

    const body = req.body as Buffer;
    const signature = req.get('x-line-signature') ?? '';
    if (!validateSignature(body, creds.channelSecret, signature)) {
      // 沒驗簽等於任何人都能假冒 LINE 打你的 webhook。
      res.status(401).send('bad signature');
      return;
    }

    // 先回 200 再處理：LINE 對 webhook 有逾時限制，處理慢了會被判失敗並重送。
    res.status(200).end();

    const api = new messagingApi.MessagingApiClient({ channelAccessToken: creds.accessToken });
    const events = (JSON.parse(body.toString('utf8')) as { events: WebhookEvent[] }).events ?? [];
    for (const event of events) {
      try {
        await handleEvent(event, tenant, api);
      } catch (err) {
        console.error(`[${tenantId}] 處理事件失敗：`, err);
      }
    }
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}
