# OAKIT 四產業 Demo 官網設計規格

日期：2026-08-06

狀態：使用者已核准設計，待進入實作計畫

## 1. 目標

在現有 OAKIT 架構上，建立四個全虛構企業 Demo 官網，展示同一份 tenant 資料如何生成不同產業的單頁官網，並為下一階段 LINE 官方帳號串接保留同一個資料來源。

四個 Demo：

- `demo-bistro`：暮火食堂，餐飲
- `demo-interior`：隅光製所，室內設計
- `demo-pet`：小步寵物美容，寵物服務
- `demo-music`：拾音音樂教室，音樂教育

網站第一階段完成後，才進入 LINE Reply bot 的串接；不在本次網站工作中加入真實憑證、Push API、付款或真正預約系統。

## 2. 設計原則

### 單一資料來源

`tenants/<id>.json` 維持為品牌網站、圖文選單與 AI 知識庫的共同來源。

現有欄位繼續承擔所有通用商業資料：品牌、聯絡方式、營業時間、服務、價格、FAQ、公告、主題與 rich menu。新增的展示內容也必須是可供客服回答的商業內容；不在 tenant 中複製 LINE 專用文案。

### 共用 shell、產業 presenter

網站共用文件外殼、導覽、聯絡區、FAQ、頁尾與安全的 HTML escaping。每種產業只負責自己的 hero、重點內容與敘事順序，避免四份獨立 HTML 互相漂移。

### 可攜性優先

輸出仍是單一 HTML 檔，不使用外部字型、CDN、前端框架或遠端圖片。視覺質感以 CSS、內嵌 SVG/裝飾圖形、排版與色彩完成；之後若加入圖片，必須能內嵌或由 tenant 明確提供。

### 內容先於 AI

營業時間、地址、電話、價格等可精確回答的內容維持走 `ruleReply()`。AI 只處理規則未涵蓋的自然語言問題，且無答案時必須明確表示不知道。

## 3. 資料模型方向

在 `src/tenant.ts` 保持向後相容，新增可選的產業與網站展示資料。舊有 `oakit.json` 與既有 tenant 未提供新欄位時，沿用目前的通用版 renderer。

概念結構如下：

```ts
type BusinessType = 'restaurant' | 'interior' | 'pet' | 'music';

interface ShowcaseItem {
  title: string;
  category?: string;
  description: string;
  meta?: string;
}

interface ProcessStep {
  step: string;
  title: string;
  description: string;
}

interface SiteContent {
  variant: BusinessType;
  eyebrow?: string;
  heroNote?: string;
  highlights?: Array<{
    label: string;
    value: string;
    description?: string;
  }>;
  showcase?: ShowcaseItem[];
  process?: ProcessStep[];
}

interface Tenant {
  // existing shared business fields remain unchanged
  site?: SiteContent;
}
```

`variant` 是呈現提示，LINE 不需要理解它；`highlights`、`showcase` 與 `process` 是實際商業內容，之後會被整理進 knowledge prompt。現有 `services` 仍是價格與服務的精確來源，不能用展示卡片取代。

若實作時發現上述欄位造成過多 union 複雜度，優先保留通用的 `showcase` 與 `process`，不要為每個產業建立一套完全獨立的 tenant 型別。

## 4. 共用頁面結構

所有產業都輸出同一個可捲動單頁：

1. 頂部品牌列：品牌名、產業標籤、頁內導覽
2. Hero：品牌主張、簡短說明、主要 CTA
3. 產業專屬主內容
4. 服務／價格區
5. 營業時間與聯絡資訊
6. FAQ 原生 `<details>` 摺疊區
7. 最後 CTA 與頁尾

主要 CTA 使用頁內 anchor，先導向聯絡或預約區，不假裝已接上真實預約服務。LINE 串接完成後，再由 tenant 的聯絡設定替換成實際入口。

## 5. 四種視覺 presenter

### 餐飲：`restaurant`

暮火食堂使用暖橘、深褐與米白，版面偏編輯雜誌感。Hero 先建立用餐情境，接著呈現今日主打／菜單亮點、用餐時段、服務與訂位 CTA。

`showcase` 可呈現招牌菜、季節菜單或用餐方案；`process` 不強制顯示，避免餐飲頁面出現不必要的流程感。

### 室內設計：`interior`

隅光製所使用米白、炭黑與低飽和中性色，大量留白、細線與大標題，呈現設計工作室作品集。Hero 後呈現設計理念、精選案例、服務流程與諮詢 CTA。

`showcase` 呈現案例名稱、風格／空間類型、簡介與坪數等 meta；`process` 呈現丈量、提案、施工與交付等步驟。

### 寵物：`pet`

小步寵物美容使用薄荷綠、奶油色與柔和圓角卡片，語氣親切但不幼稚。Hero 後呈現美容服務與價格、照護承諾、預約提醒、店家資訊與 FAQ。

既有 `demo-pet.json` 優先沿用，只有在需要時補充 `site` 內容，避免為了新視覺重寫已存在的商業資料。

### 音樂教室：`music`

拾音音樂教室使用深藍、奶油白與珊瑚橘，帶有唱片封面與樂譜排版的節奏感。Hero 後呈現鋼琴、吉他、歌唱、樂團等課程、適合年齡／程度、教學流程與試聽 CTA。

課程價格與上課時段仍放在 `services`、`hours` 等既有欄位；`showcase` 可呈現課程特色或學習成果，不能取代精確學費資料。

## 6. CSS 與互動規格

- 每個 presenter 只提供自己的 CSS token，包含背景、文字、accent、邊框與卡片風格。
- 使用系統字型堆疊，不下載字型。
- 桌面版使用寬版內容區，手機版在窄螢幕改為單欄；不能依賴 hover 才能取得資訊。
- 所有 CTA、FAQ、導覽連結保留清楚的 focus 狀態。
- 可點擊元素至少維持適合觸控的尺寸。
- FAQ 使用原生 `<details>`，不新增前端 JavaScript 狀態管理。
- 所有 tenant 文字都必須經過既有或集中管理的 escape 函式，不能直接拼接未處理的 HTML。

## 7. LINE 第二階段邊界

網站四個 Demo 驗證完成後，再沿用同一批 tenant 做 LINE：

- 關鍵字與精確資料走 `ruleReply()`。
- FAQ 與展示內容整理進 AI knowledge prompt。
- 圖文選單維持既有 2500×1686／2500×843 與 1MB 限制。
- Webhook 維持 raw body 驗簽、先回 200，再非同步處理事件。
- 只用 Reply API，不加入 Push API。
- 初版只處理文字訊息與既有 rich menu；圖片理解、CRM、RAG 同步與真正預約系統延後。

LINE 官方內建 AI Chatbot 可作為沒有客製程式需求時的替代方案，但不納入本次 OAKIT custom bot 的實作驗收。

## 8. 不在本次範圍

- 真實品牌、真實店家資料與正式上線憑證
- 真正的線上訂位、試聽排課、付款或行事曆同步
- CRM、登入、資料庫、後台編輯器與 SaaS 多租戶管理
- Push API 與任何主動通知流程
- 外部圖片、遠端 CDN 或建置工具
- Eastern 專案的 Rust、Supabase、RAG 或 CRM 模組移植

## 9. 驗收條件

網站階段至少要通過：

- 四個 tenant 都能通過現有 validation。
- `npm run typecheck` 成功。
- `npm run test` 成功；至少涵蓋 variant 選擇、舊 tenant fallback、文字 escaping 與 `ruleReply()` 不回傳錯誤產業資料。
- `npm run build` 產出四個 `dist/<id>/index.html`。
- 四個 HTML 不引用外部 CSS、JS、字型或圖片 URL。
- 四個首頁在同一瀏覽器中能清楚辨識為餐飲、室內設計、寵物服務與音樂教室。
- 手機寬度下沒有水平溢出，FAQ 與 CTA 可操作。
- `npm run richmenu -- <id>` 與 `npm run ask -- <id> "營業時間"` 不因新欄位失效。

LINE 階段另行驗收 webhook、簽章與 Reply API，不把真實 LINE E2E 混入網站階段的完成定義。

## 10. 實作順序

1. 擴充 tenant 型別與 validation，保持舊 JSON 可用。
2. 將現有 renderer 拆成共用 shell 與 variant presenter。
3. 新增 `demo-bistro`、`demo-interior`、`demo-music`，調整 `demo-pet` 的展示資料。
4. 補 renderer、validation、escaping 與 fallback 測試。
5. 執行 typecheck、test、build，檢查四份輸出。
6. 網站驗收後，另開 LINE 串接工作，沿用同一份 tenant 資料。
