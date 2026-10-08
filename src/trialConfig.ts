/* ===== 体験版・有料化まわりの設定（変えるのはここだけ） =====
 * App.tsx（画面）と vite.config.ts（ビルド）の両方から読む。
 * ブラウザ専用のもの（window 等）はここに書かない。
 *
 * 体験版は「問題を隠す」のではなく「メニューは全問見せて、上限より先をロックする」方式。
 * ロックの判定は App.tsx の isLocked() 1箇所に集約してあるので、上限を変えるときは
 * TRIAL_MAX_NUMBER を書き換えるだけでよい。
 *
 * URLの種類（GitHub Pages）: 下の「版（エディション）」の表を参照
 *   /            … ROOT_IS_TRIAL=true なら体験版、false ならフル版＋移行のお知らせ
 *   /trial/      … 体験版（テスト用、秘密ではない）
 *   /<秘密パス>/ … Secret SITE_PATHS_LEGACY / SITE_PATHS_COURSE / SITE_PATHS_KINDLE に登録したパス
 *
 * 年明けの作業: 無料で配った人向けを閉じるなら SITE_PATHS_LEGACY から該当パスを消して push
 *              （ただし、これまでのKindle本に載せたURLも同じパスなので、閉じる前に本の差し替えを済ませること）
 *
 * ローカルで試すとき（Secret は手元に来ないので環境変数で代用）:
 *   PowerShell: $env:SITE_PATHS_LEGACY="testpath"; npm run dev
 *   Kindle版の見え方: index.html の <head> に <meta name="fe-edition" content="kindle"> を一時的に足して npm run dev
 */

/* ===== 版（エディション）=====
 * どの版かは URL のパスで決まる。パスの中身は GitHub Secrets だけが持つ（JSには入れない）。
 *
 *   Secret 名            | 誰向け                                        | 版
 *   ---------------------+-----------------------------------------------+--------
 *   SITE_PATHS_LEGACY    | 無料で配った人向け＋これまでのKindle本に載せたURL | フル版
 *   SITE_PATHS_COURSE    | 本講座（有料）の購入者向け                      | フル版
 *   SITE_PATHS_KINDLE    | Kindle本（新しい版から載せるURL）               | Kindle版
 *   （/trial/ と、ROOT_IS_TRIAL=true のときのルートは体験版）
 *
 * Kindle版は今はフル版と同じ中身。あとで絞りたくなったら KINDLE_LIMITS を書き換えるだけでよい。
 * 絞るときは体験版のような「ロック」ではなく「出さない」（本の読者に足りないものを見せないため）。
 */
export const KINDLE_LIMITS = {
  /** この番号より大きい問題を出さない（Infinity＝絞らない）。例: 97 にすると本の97問だけになる */
  maxNumber: Infinity as number,
  /** 出さない問題グループのキー（questionGroups.ts のキー）。例: ["sec-extra"] */
  hideGroups: [] as string[],
  /** 出さない模試のID（"1" "2" "3" "r4"）。?mock= で直接来ても通常演習として開く */
  hideMogi: [] as string[],
};

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
/**
 * 体験版でも「URLを直接開いたときだけ」受けられる模試のID（例: 記事から ?mock=3 で来た人）。
 * メニューからは開けない（ロックのまま）。受験日の登録も不要＝誰でも受けられる。
 * 受験後の採点結果に、体験版（ルート）への案内を出す。
 * 体験版から受けた回は集計で plan="trial" になるので、レポートの「区分」で切り分けられる。
 */
export const TRIAL_DIRECT_MOGI: string[] = ["3"];

/**
 * 体験版から直接URLで模試を受けた人に、採点結果を「閉じる」と別ウィンドウで出す案内（CTA）。文言を直すときはここだけ。
 * フル版・Kindle版をこの端末で開いたことがある人（＝購入者）には出さない。
 * body の改行はそのまま画面の改行になる。
 */
export const TRIAL_MOGI_CTA = {
  title: "模擬試験を受けたあなたに､特別なご案内",
  body: `サンプル問題は応用ばかり｡学習には不向きで､非効率です｡
段階的に学べるオリジナル問題を加えた学習専用サイトを､無料(33問分)でプレゼント中です｡`,
  /** ボタンの上に出す小さなバッジ。空文字なら出さない */
  badge: "33問を無料でゲットするチャンス!",
  button: "アンケートに答えて無料で受け取る",
  url: "https://forms.gle/yV65VyLZkq792Lwz8",
};
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
export const SET_REV: Record<string, number> = { "1": 2, "2": 1, "3": 1, "r4": 1 };

/** 受験日登録フォーム / 照合APIのURL（末尾スラッシュなし） */
export const MAIL_ENDPOINT = "https://fe-mail.japason.workers.dev";

/**
 * 有料版（SITE_PATHS_COURSE_KEY のパス）で専用URL（?k=キー）を必須にするか。LicenseGate.tsx。
 * キーの発行・停止は fe-mail Worker（Teachable の Webhook）。Worker が不調のときは false にして push すれば外れる。
 */
export const LICENSE_REQUIRED = true;

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
   * モード選択画面の上に細いバナーを出す。お知らせの入口はこのバーだけ（ベルは 2026-10-07 に廃止）。
   * banner が無いお知らせは画面に出ないので、出したいものには必ず書く。
   * 出しっぱなしにすると効かなくなるので、必ず until とセットで使うこと。
   */
  banner?: string;
};

export const NOTICES: Notice[] = [
  {
    id: "2026-10-07-mogi3",
    date: "2026/10/7",
    title: "模擬試験Cを追加しました",
    body: `模擬試験Cを追加しました｡モード選択の「模擬試験」から受験できます｡所要100分です｡

あわせて､模擬試験の名前を変更しました｡
1回目 → A､2回目 → B です｡内容は変わっていません｡`,
    until: "2026-11-07",
    banner: "模擬試験Cを追加しました｡",
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

/* ===== 模擬試験の名前と並び順 =====
 * 中のIDは "1" "2" のまま（URLの ?mock=1、受験途中の保存データ、集計の set_id はどれも変わらない）。
 * 画面に出る名前だけを A・B…にしている。
 * 模試メニューは上に置いたものほど先に受けられる＝データが集まる。定期的にここの並びを入れ替える。 */
export const MOGI_NAMES: Record<string, string> = { "1": "A", "2": "B", "3": "C" };
export const MOGI_MENU_ORDER: string[] = ["2", "1", "3"];
/**
 * 模試を選ぶボタンの下に出す注意書き。1行ずつ。空配列にすれば何も出ない。
 */
export const MOGI_MENU_NOTES: string[] = [
  "※データ集計のため、表示順を不定期で変更しています。左から順に受験いただけると助かります。"
];
/**
 * 模試ボタンの名前の下に小さく出す補足（2026/10/7 に 1→A、2→B へ改名したことを示す）。不要になったら消す。
 */
export const MOGI_SUBLABELS: Record<string, string> = { "1": "(旧1回目)", "2": "(旧2回目)" };
