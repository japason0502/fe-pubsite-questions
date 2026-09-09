## 画像の置き場所（今すぐ採点）

`src/data/questions.json` の各問題には `number` があり、**「今すぐ採点」ウィンドウ内で `number` に対応する画像**を表示します。

画像はこのフォルダに置いてください。

### ファイル名ルール

- `number` が整数のとき: `<number>.png`
  - 例: `number: 4` → `4.png`
- `number` が小数（例: 4.1）のとき: `.` を `_` に置換して `<number>.png`
  - 例: `number: 4.1` → `4_1.png`

### 参照パス

アプリからは次のURLで参照されます。

- `/question-images/<上記ファイル名>`

