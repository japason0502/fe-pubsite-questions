/**
 * 結果レポートの「診断」に出す、人レベルのルール。
 *
 * 1ルール＝1エントリ。文言を直すときも、ルールを足すときも、この表だけを触る。
 * 条件の語彙が足りなくなったときだけ reportEngine.ts を触る。
 *
 * ゾーン名は zones.ts の zone("…") と同じ文字列を使う:
 *   基礎トレース / 基礎読解 / 情報セキュリティ / トレース / 読解 / クセの強い問題
 *
 * 出しすぎ防止:
 *   当たったルールを上から順に最大 MAX_LINES 本だけ出す。上にあるほど優先。
 *   link はその動画のURLを1回だけ載せる（同じURLが2回出ることはない）。
 */

export type Zone = "基礎トレース" | "基礎読解" | "情報セキュリティ" | "トレース" | "読解" | "クセの強い問題";

export type RuleWhen = {
  /** 得点帯 [min, max]（両端を含む） */
  score?: [number, number];
  /** 所要時間（分） */
  elapsedMin?: { min?: number; max?: number };
  /** このゾーンがノルマ未達（zones.ts の met=false）。配列なら「どれか1つでも未達」 */
  zoneUnder?: Zone | Zone[];
  /** 配列の「すべて」が未達。zoneUnder と組み合わせて「AかつBかC」を書ける */
  zoneUnderAll?: Zone | Zone[];
  /** このゾーンの正解数 */
  zoneCount?: { zone: Zone; min?: number; max?: number };
  /** 未回答の数（現在この条件を使うルールは無し。未回答の指摘は zones.ts の「時間の使い方」が出す） */
  unanswered?: { min?: number; max?: number };
};

export type Rule = {
  id: string;
  /** 全部を満たしたときに出す（AND） */
  when: RuleWhen;
  tone: "good" | "warn" | "info";
  text: string;
  /** 動画へのリンク。付けるのは R1・R6 のように「その動画を見てほしい」ルールだけ */
  link?: { label: string; url: string };
};

/** 診断に出す本数の上限。当たったルールを上から順に切る */
export const MAX_LINES = 3;

export const VIDEO = {
  border: { label: "「体感6割」が一番危ない", url: "https://www.youtube.com/watch?v=JlHFfM5Xg0Y" },
  data:   { label: "データから見る合格者の特長", url: "https://www.youtube.com/watch?v=4fIwGF5UsZA" },
  under:  { label: "未達の原因と対策", url: "https://youtu.be/iSZkf72JKhA?si=iAmtDratLU6LOLJU" },
} as const;

/**
 * 得点帯ごとの一言（レポート冒頭・得点の直下に出す）＝このレポートの総評。
 * 上から順に、最初に当たった1つだけ出す。
 * （得点への総評はここだけで言う。zones.ts 側では出さない）
 *
 * link を付けると、その動画へのリンクが一言の下に出る。
 * ここで出した動画URLは、下の診断（RULES）では重複して出さない（同じURLは1回だけ）。
 */
export const BAND_COMMENTS: { score: [number, number]; text: string; link?: { label: string; url: string } }[] = [
  {
    score: [0, 599],
    text:
      "まだ土台づくりの段階です。講座の問題を「解けるようになるまで」繰り返すのが最短ルートです。" +
      "合格基準は12問(600点)、目標は14問(700点)です。",
      link: VIDEO.under,
  },
  {
    score: [600, 699],
    text:
      "合格ラインは超えていますが、本番では合格点に届かない可能性が高いです｡油断せず､鍛錬を｡特にトレースはまだまだ伸びしろがあります｡" +
      "本番で受かる人は模試で700点以上取っています。｡目標の14問(700点)まで、あと1〜2問です。",
    link: VIDEO.border,
  },
  {
    score: [700, 799],
    text: "合格圏ですが､油断しないこと。取れないゾーンを1つ潰すごとに、本番の安心感が変わります。",
    link: VIDEO.border,
  },
  {
    score: [800, 1000],
    text: "余裕を持って合格できる位置にいます｡敵は緊張のみ｡｢5分以内に正解できなかったらおやつ抜き｣など､緊張状態で問題を解くようにしましょう",
  },
];

export const RULES: Rule[] = [
  {
    // 情報セキュリティ未達（4問中2問以上ミス）かつ 読解系（基礎読解・読解）のどれかが未達
    id: "R10-reading-fundamental",
    when: { zoneUnderAll: "情報セキュリティ", zoneUnder: ["基礎読解", "読解"] },
    tone: "warn",
    text:
      "長文読解の力が本質的に足りていないのかもしれません。今の状態のまま問題演習を積んでも、合格点を超えることは厳しいです。" +
      "ネットニュースを要約する、議事録係を積極的に引き受けるなどして、読解スキルを日々鍛えましょう。（対策コンテンツは準備中です）",
  },
  {
    id: "R2-trace-unstable",
    when: { zoneUnder: ["基礎トレース", "トレース"] },
    tone: "warn",
    text:
      "まだまだ､トレースに安定感が足りません｡本番の緊張で一番崩れるのがトレースです。毎日1問、ランダム出題の「トレース系のみ」と" +
      "「値を変えてもう一度」で繰り返してください。",
  },
  {
    id: "R3-heavy-reading-wall",
    when: { score: [600, 799], zoneCount: { zone: "読解", max: 0 } },
    tone: "info",
    text:
      "重めの長文読解が、650点と750点を分けています。ここが取れるとボーダーライン上を突き抜けられます。" +
      "取れないのは実力不足のサインなので、ここは鍛錬です。サンプル問題の｢解法｣を身に付けましょう",
  },
  {
    id: "R4-quirky-plus-one",
    when: { score: [600, 699], zoneCount: { zone: "クセの強い問題", min: 3, max: 4 } },
    tone: "info",
    text: "クセの強い問題をあと1問で700点超え。時間をかければ満点も狙える分野です。",
  },
  {
    id: "R5-high-score-trap",
    when: { score: [700, 849], zoneCount: { zone: "クセの強い問題", min: 5 }, zoneUnder: "トレース" },
    tone: "warn",
    text: "クセの強い問題で稼いだ点です。トレースが不安定だと本番の緊張で崩れます。トレースを磨きましょう。",
  },
  {
    id: "R6-gave-up-early",
    when: { score: [0, 650], elapsedMin: { max: 70 } },
    tone: "warn",
    text:
      "70分未満で終えています。もっと粘り強く解かないと、合格は遠いです。" +
      "分からない問題も2択までは絞りましょう。",
    link: VIDEO.data,
  },
];
