# Music demo page polish plan

## Goal

讓「那莫好聽」首頁的資訊層級、導覽回饋與動畫節奏更精緻，同時維持單檔輸出、無外部資源與現有 tenant 內容。

## Execution order

1. 將首頁 CTA 改成「免費試上 30 分鐘」。
2. 將課程價格提升為主要視覺資訊，堂數／時長降為輔助資訊。
3. 為 sticky 導覽加入目前所在區段的 active 狀態。
4. 保留既有放大的品牌名稱，補強關於區塊的版面一致性。
5. 將「雲端成發」空狀態整理成具有期待感的作品預告卡。
6. 讓分區音符有不同節奏與密度，聯絡區只保留一個小音符，並維持 reduced-motion 支援。

## Verification

- 先以 render regression tests 鎖定新 CTA、價格 markup、active nav、作品空狀態與音符節奏。
- 執行 `npm run typecheck`、`npm test`、`npm run build` 與 `git diff --check`。
- 檢查手機與桌面輸出，確認 CTA、導覽 active 狀態與空狀態在瀏覽器中可見且沒有水平溢出。
