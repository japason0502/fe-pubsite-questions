/* ===== 体験版・有料化まわりの設定（変えるのはここだけ） =====
 * App.tsx（画面）と vite.config.ts（ビルド）の両方から読む。
 * ブラウザ専用のもの（window 等）はここに書かない。
 *
 * 体験版は「問題を隠す」のではなく「メニューは全問見せて、上限より先をロックする」方式。
 * ロックの判定は App.tsx の isLocked() 1箇所に集約してあるので、上限を変えるときは
 * TRIAL_MAX_NUMBER を書き換えるだけでよい。
 *
 * URLの種類（GitHub Pages）:
 *   /            … 既存URL。ROOT_IS_TRIAL=false ならフル版＋移行のお知らせ、true なら体験版
 *   /trial/      … 体験版（テスト用、秘密ではない）
 *   /<秘密パス>/ … フル版。GitHub Secrets の FULL_PATHS にカンマ区切りで登録する
 *                  1個目 = 既存者向け（年内）。ROOT_IS_TRIAL=false の間だけ、お知らせ用にJSへ埋め込まれる
 *                  2個目以降 = 購入者向け（恒久）。JSには一切入らない
 *
 * 10/1 の作業: ROOT_IS_TRIAL を true にして push（お知らせと1個目の埋め込みは自動で消える）
 * 年明けの作業: Secret FULL_PATHS から1個目を消して push
 *
 * ローカルで試すとき（Secret は手元に来ないので環境変数で代用）:
 *   PowerShell: $env:FULL_PATHS="testpath,dummy"; npm run dev
 */

/** 体験版で解ける上限の問番号（枝番 4.1 / 16.1 等も、この値以下なら解ける） */
export const TRIAL_MAX_NUMBER = 33;
/** 体験版として振る舞うパス（前方一致） */
export const TRIAL_PATHS = ["/trial/"];
/** ルート（既存URL）を体験版にするか。10/1 に true へ切り替える */
export const ROOT_IS_TRIAL = false;
/** 有料版の案内先（LP）。仮URL */
export const LP_URL = "https://example.com/fe-kamokub/";

/**
 * ルート（既存URL）に移行のお知らせを出すか。
 * false の間は誰にも出ないが、**?notice=preview を付けて開くと自分だけ見られる**。
 * 手順: false のまま push → 本番URLに ?notice=preview を付けて見え方を確認 → true にして push
 */
export const ANNOUNCE_ENABLED = true;
/** ルートに出す移行のお知らせの文面に使う日付 */
export const ANNOUNCE_SWITCH_DATE = "9月末";
export const ANNOUNCE_VALID_UNTIL = "2026/12/31";
/* ===== 受験日登録による模擬試験のアンロック =====
 * worker-mail(fe-mail)で受験日を登録し、確認メールのリンクを踏んだ人に模試を開放する。
 *
 * 流れ:
 *   確認メールのリンク → /confirm → 「模擬試験を開く」ボタン
 *   → このサイトを ?unlock=<トークン> で開く
 *   → /verify で有効性を確かめて localStorage に保存（以後はその端末で開いたまま）
 *
 * MOGI_REQUIRES_REGISTRATION が false の間は、アンロックの記録だけして誰も締め出さない。
 * 10/1 に true にすると、未登録の人は模試を開くときに登録案内が出るようになる。
 */
/** 模試に受験日登録を必須にするか。10/1 に true へ */
export const MOGI_REQUIRES_REGISTRATION = false;
/** 受験日登録フォーム / 照合APIのURL（末尾スラッシュなし） */
export const MAIL_ENDPOINT = "https://fe-mail.japason.workers.dev";

/** URL変更のお知らせを出した日（お知らせ一覧に表示する） */
export const ANNOUNCE_POSTED_DATE = "2026/9/8";

/**
 * お知らせ一覧に出す一般のお知らせ。**新しいものを配列の先頭に足す**。
 * body は改行がそのまま画面の改行になる。
 * URL変更のお知らせはここには書かない（ANNOUNCE_ENABLED が true の間、自動で一覧の先頭に入る）。
 */
export const NOTICES: { id: string; date: string; title: string; body: string }[] = [
  // 例:
  // {
  //   id: "2026-10-01-mogi3",
  //   date: "2026/10/1",
  //   title: "模擬試験3回目を追加しました",
  //   body: "モード選択の「模擬試験」から受験できます｡\n所要100分です｡",
  // },
];
