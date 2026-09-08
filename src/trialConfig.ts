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
 * false なら新URLの埋め込みごと無くなる（JSに1個目のパスも入らない）。
 * 手順: false で push → 各URLの動作確認 → true にして push
 */
export const ANNOUNCE_ENABLED = false;
/** ルートに出す移行のお知らせの文面に使う日付 */
export const ANNOUNCE_SWITCH_DATE = "9月末";
export const ANNOUNCE_VALID_UNTIL = "2026/12/31";
