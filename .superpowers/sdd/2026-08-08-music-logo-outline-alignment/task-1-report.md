# Task 1：建立素材回歸測試報告

## 結果

已新增素材回歸測試，刻意維持目前 RED 狀態；未修改 production image assets 或 render code。

## RED evidence

focused test：

```text
npx vitest run tests/music-logo-assets.test.ts
```

第二次（修正測試 helper 的 Buffer 解構錯誤後）結果：

```text
❯ tests/music-logo-assets.test.ts (6 tests | 6 failed)
× keeps the independent right branch complete
  → expected 0 to be greater than 1000
× places the three teal note bodies at the reference bounds
  → expected [ Array(3) ] to deeply equal [ Array(3) ]
× forest-left.png contains the warm white outline
  → expected 0 to be greater than 300
× forest-right.png contains the warm white outline
  → expected 0 to be greater than 300
× bird.png contains the warm white outline
  → expected 0 to be greater than 300
× notes.png contains the warm white outline
  → expected 0 to be greater than 300
Test Files  1 failed (1)
Tests  6 failed (6)
```

音符邊界的現況值為 `(153–223, 405–499)`、`(433–529, 100–216)`、`(534–623, 182–302)`，與 brief 要求的參考邊界不同。

## Commands and relevant output

```text
npx vitest run tests/music-logo-assets.test.ts
```

結果：6 failed，且 failure 均為預期的 assertion failure。

```text
npm test
```

結果：既有測試 62 passed；素材回歸測試 6 failed；總計 68 tests，符合目前 production 尚未修正的 RED 預期。

## Files changed

- `tests/music-logo-assets.test.ts`：新增 Sharp raw PNG 讀取、右枝完整度、藍綠色 4 向連通元件邊界，以及暖白色 `[255, 247, 232]` 像素計數測試。
- `.superpowers/sdd/2026-08-08-music-logo-outline-alignment/task-1-report.md`：本報告。

## Commits

- `0aa594b` — `test: define music logo asset alignment`

## Self-review

- 測試只讀取指定的四張既有 PNG，沒有寫入或修改素材。
- 沒有修改 `src/`、render code 或 production logic。
- 參考座標、alpha 門檻、右枝 cut、outline 顏色與像素門檻均依 brief 使用。
- 初次 focused run 發現測試 helper 將 Sharp Buffer 錯誤解構；已修正後重跑，確認剩下的都是素材 assertion failure。

## Concerns

- 測試目前應保持 RED，直到後續任務修正素材；因此完整 suite 非 0 exit code 是刻意且符合本任務 acceptance 的結果。
- 藍綠色辨識使用 `green >= red + 15`、`blue >= red + 15`、`|green - blue| <= 30`，並以元件大小大於 100 過濾雜訊；若後續素材的色彩模型改變，需同步調整測試分類條件。
