/**
 * 指令列進入點。
 *
 *   npm run build   -- <tenant>     生成官網到 dist/<tenant>/index.html
 *   npm run richmenu -- <tenant>    產生圖文選單圖片；有 token 就直接建到 LINE 上
 *   npm run ask     -- <tenant> "問題"   在終端機試自動回覆，不用真的接 LINE
 *   npm run serve                   啟動 webhook 伺服器
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { listTenants, loadTenant } from './tenant.js';
import { renderSite } from './site/render.js';
import { renderImage, publish } from './line/richmenu.js';
import { replyTo } from './line/reply.js';
import { createServer, credentialsFor } from './line/server.js';

const [command, ...args] = process.argv.slice(2);
const OUT = new URL('../dist/', import.meta.url).pathname;

function requireTenantId(): string {
  const id = args[0];
  if (!id) {
    console.error(`要指定租戶。目前有：${listTenants().join(', ')}`);
    process.exit(1);
  }
  return id;
}

async function main() {
  switch (command) {
    case 'build': {
      const ids = args.length ? args : listTenants();
      for (const id of ids) {
        const tenant = loadTenant(id);
        const dir = join(OUT, id);
        mkdirSync(dir, { recursive: true });
        const file = join(dir, 'index.html');
        writeFileSync(file, renderSite(tenant), 'utf8');
        console.log(`✓ 官網  ${file}`);
      }
      break;
    }

    case 'richmenu': {
      const id = requireTenantId();
      const tenant = loadTenant(id);
      const dir = join(OUT, id);
      mkdirSync(dir, { recursive: true });

      const { png, height, cells } = await renderImage(tenant);
      const file = join(dir, 'richmenu.png');
      writeFileSync(file, png);
      console.log(`✓ 選單圖  ${file}  (2500×${height}, ${(png.length / 1024).toFixed(0)} KB, ${cells.length} 格)`);

      const creds = credentialsFor(id);
      if (!creds) {
        console.log('  （沒有 LINE 憑證，只產圖沒有上傳。設好 LINE_TOKEN 再跑一次就會建到 LINE 上。）');
        break;
      }
      const richMenuId = await publish(tenant, creds.accessToken);
      console.log(`✓ 已建立並設為預設選單  ${richMenuId}`);
      break;
    }

    case 'ask': {
      const id = requireTenantId();
      const question = args.slice(1).join(' ');
      if (!question) {
        console.error('用法：npm run ask -- <tenant> "你的問題"');
        process.exit(1);
      }
      const result = await replyTo(question, loadTenant(id));
      console.log(`\n[${result.source}]\n${result.text}\n`);
      break;
    }

    case 'serve': {
      const port = Number(process.env.PORT ?? 3000);
      createServer().listen(port, () => {
        console.log(`webhook 伺服器啟動：http://localhost:${port}`);
        for (const id of listTenants()) {
          const ok = credentialsFor(id) ? '✓' : '✗ 缺憑證';
          console.log(`  ${ok}  /webhook/${id}`);
        }
        console.log('\n對外要有 https 網址，本機開發用 cloudflared 或 ngrok 轉發。');
      });
      break;
    }

    default:
      console.log(`用法：
  npm run build              生成所有租戶的官網
  npm run build    -- <id>   只生成指定租戶
  npm run richmenu -- <id>   產生圖文選單（有憑證就直接上傳到 LINE）
  npm run ask      -- <id> "問題"   在終端機測試自動回覆
  npm run serve              啟動 webhook 伺服器

目前的租戶：${listTenants().join(', ')}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
