# OAKIT

**官網 + LINE 官方帳號，一份設定一次生成。**

一份 `tenants/<id>.json`，同時產出：

- 官網（單一 HTML 檔，無框架、無外部資源，丟到任何靜態主機就能跑）
- LINE 圖文選單（自動算版位、產圖、上傳、設為預設）
- LINE 自動回覆的知識庫（**跟官網讀同一份資料**）

最後那一點是整個產品的立足點：改一次營業時間，官網和 LINE 客服同時更新。
LINE 工具商做不到（客戶的官網不是他們的），建站工具不碰 LINE。中間這塊沒人做。

---

## 快速開始

```bash
npm install
npm run build                      # 生成所有租戶的官網 → dist/<id>/index.html
npm run richmenu -- demo-pet       # 產生圖文選單圖片（有 LINE 憑證就直接上傳）
npm run ask -- demo-pet "你們幾點開門"   # 在終端機測自動回覆，不用接 LINE
npm run serve                      # 啟動 webhook 伺服器
```

沒有任何憑證也能跑 —— 官網照生、選單圖照產、規則式回覆照答，
只有 AI 回覆和上傳 LINE 需要金鑰。未設定 LINE 憑證時，`richmenu` 只會產生
`dist/<id>/richmenu.png`，不會上傳到 LINE。

## Demo sites

四個虛構 Demo 的 ID：`demo-bistro`、`demo-interior`、`demo-pet`、`demo-music`。
每個官網輸出在 `dist/<id>/index.html`。

GitHub Pages 展示入口：<https://xpdai.github.io/oakit/>。

```bash
npm run build
npm run build -- demo-bistro
npm run richmenu -- demo-music
npm run ask -- demo-interior "服務流程"
```

---

## 設定

複製 `.env.example` 成 `.env`：

| 變數 | 用途 | 沒設會怎樣 |
|---|---|---|
| `LINE_TOKEN` / `LINE_SECRET` | 單一租戶的 Channel 憑證 | 選單只產圖不上傳；webhook 回 500 |
| `LINE_<ID>_TOKEN` / `_SECRET` | 多租戶用（id 大寫、連字號轉底線） | 同上 |
| `ANTHROPIC_API_KEY` | AI 自動回覆 | 只剩規則式回覆 + 兜底句 |

---

## 自動回覆是兩段式的

1. **規則式**（`src/knowledge.ts` 的 `ruleReply`）——營業時間、地址、電話、價格。
   免費、即時、逐字精確。這幾類問題佔實際訊息的大宗，交給規則比交給模型安全。
2. **AI**（`src/line/reply.ts`）——規則答不出來的才走。只讀 `tenant.json` 生成的知識庫，
   資料裡沒有的就說不知道。
3. **兜底**——AI 也不行（沒金鑰、掛掉、被拒絕）就回一句誠實的話，不亂答。

---

## 費用上的關鍵決定

**只用 Reply API，永遠不用 Push API。**

LINE 的計費是算主動推播；回覆使用者訊息不計次。2025 年免費額度從 25,000 則
砍到 6,000 則（輕用量方案只剩 200 則、加購 $0.2/則起）之後，這個差別
直接決定客戶的月成本。`src/line/server.ts` 一律走 `replyMessage`。

⚠️ 另一個要跟客戶講清楚的坑：**開啟 Webhook 之後，真人客服在後台的一對一回覆
會被算成 Push API 計費。** 沒先講，帳單出來會吵架。

---

## 目錄

```
tenants/<id>.json      一個客戶一份設定（產品的核心資料模型）
src/tenant.ts          型別、讀取、驗證
src/knowledge.ts       設定 → AI 知識庫；規則式回覆
src/site/render.ts     官網 HTML
src/line/richmenu.ts   圖文選單（SVG → PNG via sharp → LINE API）
src/line/reply.ts      回覆邏輯
src/line/server.ts     webhook（多租戶靠路徑分流 /webhook/:tenantId）
src/cli.ts             指令列進入點
```

商業脈絡、路線規劃、下一步請看 [`HANDOFF.md`](./HANDOFF.md)。
