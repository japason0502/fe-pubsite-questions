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
export const ROOT_IS_TRIAL = true;
/** 有料版の案内先（LP） */
export const LP_URL = "https://mos.japason.co.jp/fe-lp/";

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
export const MOGI_REQUIRES_REGISTRATION = true;
/* ===== 模擬試験の版（set_rev） =====
 * 問題を直したら、そのセットの数字を1つ上げる。集計はこの値で前後を分ける。
 *
 *   セット全体の指標（所要時間の中央値・得点分布・合格率）を改訂の前後で比べるためのもの。
 *   問題ごとの前後は q_id で分かれる（中身を作り替えた問題には新しい id を振るルール）。
 *   例外は q_id を据え置いた問題（問11）で、そこは set_rev だけが頼り。
 *
 * 履歴:
 *   模試1  v1 = 公開時 / v2 = 2026-09-18 問5・問6・問11・問12 を改訂
 *   模試2  v1 = 公開時
 */
export const SET_REV: Record<string, number> = { "1": 2, "2": 1, "r4": 1 };

/** 受験日登録フォーム / 照合APIのURL（末尾スラッシュなし） */
export const MAIL_ENDPOINT = "https://fe-mail.japason.workers.dev";

/** URL変更のお知らせを出した日（お知らせ一覧に表示する） */
export const ANNOUNCE_POSTED_DATE = "2026/9/8";

/**
 * お知らせ一覧に出す一般のお知らせ。**新しいものを配列の先頭に足す**。
 * body は改行がそのまま画面の改行になる。
 * URL変更のお知らせはここには書かない（ANNOUNCE_ENABLED が true の間、自動で一覧の先頭に入る）。
 */
export type Notice = {
  id: string;
  /** 画面に出す日付。表示用なので書式は自由 */
  date: string;
  title: string;
  /** 改行はそのまま画面の改行になる */
  body: string;
  /** 表示をやめる日（YYYY-MM-DD・その日いっぱいまで表示）。省略すると消えない */
  until?: string;
  /** 本文の左に小さく出す画像（public/ からの相対パス。例 "media/fe-book-cover.jpg"） */
  image?: string;
  /** 本文の下に出すボタン。期間限定の案内などで使う */
  link?: { url: string; label: string };
  /**
   * モード選択画面の上に細いバナーを出す（link が必要）。
   * ベルの中は自分から押した人しか見ないので、告知したいものだけ true にする。
   * 出しっぱなしにすると効かなくなるので、必ず until とセットで使うこと。
   */
  banner?: string;
};

export const NOTICES: Notice[] = [
  {
    id: "2026-09-kindle",
    date: "2026/9/18",
    title: "Kindle本を出版しました",
    // ↓ 価格の書き方に注意。「通常1,650円のところ」は、実際に1,650円で
    //   販売した実績が無いと二重価格表示(景品表示法)に当たるおそれがある。
    //   「10月以降は1,650円になります」という値上げの予告なら問題ない。
    //   ただし実際に10月に値上げすること。
    body: `97問動画の書籍版をKindleで発売開始しました｡
本は一度に入る情報量が圧倒的に多く､復習に向いています｡
動画で話しているポイントや補足も､よりわかりやすく整理し直しました｡動画と合わせてご利用ください｡

9/27まで 250円 でご提供します（28日以降は 1,650円 になります）｡

※運用テストを兼ねた特別価格です｡本の内容は随時アップデートしていきます｡`,
    image: "media/fe-book-cover.jpg",
    until: "2026-09-27",
    link: { url: "https://amzn.to/4izfYAg", label: "詳細をチェック" },
    banner: "【9/27まで特別価格】Kindle本を出版しました｡",
  },
  // 例:
  // {
  //   id: "2026-10-01-mogi3",
  //   date: "2026/10/1",
  //   title: "模擬試験3回目を追加しました",
  //   body: "モード選択の「模擬試験」から受験できます｡\n所要100分です｡",
  //   until: "2026-10-31",
  //   link: { url: "https://example.com/", label: "詳しく見る" },
  // },
];
