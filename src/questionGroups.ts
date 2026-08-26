/**
 * 問題演習の一覧表示で使う分野分け（表示専用）
 *
 * 出典: 原稿 genko_kihon.md の章立て（## 見出し = タブ / ### 見出し = グループ）
 * 問題データ側は一切変更していない。ここは「見た目の分類」だけを持つ。
 *
 * from/to は問番号の範囲（小数の枝番 4.1 などは直前の整数のグループに入る）。
 * 問題を増減したときはこの表だけ直せばよい。
 */

export type Group = { name: string; from: number; to: number };
/** サンプル問題タブ用: タイトル先頭の年度表記でグループ分けする */
export type SampleGroup = { name: string; prefix: string };
export type Category = {
  key: string;
  label: string;
  groups: Group[];
  /** これが入っているタブは「番号範囲」ではなく「年度」でグループ分けする */
  sampleGroups?: SampleGroup[];
};

export const CATEGORIES: Category[] = [
  {
    key: "trace",
    label: "トレース系",
    groups: [
      { name: "変数", from: 0, to: 4.99 },
      { name: "配列", from: 5, to: 16.09 },
      { name: "関数の基本", from: 16.1, to: 16.99 },
      { name: "繰り返し(for)", from: 17, to: 18 },
      { name: "繰り返し(for)&配列", from: 19, to: 25 },
      { name: "条件分岐", from: 26, to: 30 },
      { name: "繰り返し(for)のネスト", from: 31, to: 33 },
      { name: "繰り返し(while)", from: 34, to: 35 },
      { name: "複数のwhile", from: 36, to: 37 },
      { name: "複数の関数", from: 38, to: 43 },
      { name: "二次元配列", from: 44, to: 45 }
    ]
  },
  {
    key: "reading",
    label: "読解(穴埋め)系",
    groups: [
      { name: "分岐読解", from: 46, to: 49 },
      { name: "式読解", from: 50, to: 53 }
    ]
  },
  {
    key: "hard",
    label: "クセが強い系",
    groups: [
      { name: "再帰", from: 54, to: 58 },
      { name: "2進数･ビット演算", from: 59, to: 65 },
      { name: "オブジェクト指向", from: 66, to: 69 },
      { name: "スタックとキュー", from: 70, to: 74 },
      { name: "単方向リスト", from: 75, to: 78 },
      { name: "数学系", from: 79, to: 82 }
    ]
  },
  {
    key: "mixed",
    label: "読解&トレース",
    groups: [
      { name: "読解&トレース(その他の問題)", from: 83, to: 90 }
    ]
  },
  {
    key: "security",
    label: "情報セキュリティ",
    groups: [
      { name: "情報セキュリティ", from: 91, to: 97 }
    ]
  }
  ,
  {
    key: "sample",
    label: "(サンプル問題のみ)",
    groups: [],
    sampleGroups: [
      { name: "令和4年度 4月", prefix: "R4(04)問" },
      { name: "令和4年度 12月", prefix: "R4(12)問" },
      { name: "令和5年度", prefix: "R5問" },
      { name: "令和6年度", prefix: "R6問" },
      { name: "令和7年度", prefix: "R7問" }
    ]
  }
];

/**
 * サンプル問題のタイトルから本来の問番号を取り出す（並び順に使う）
 * 例: "R4(12)問11(著者改編) 要素番号に配列" → 11 / 該当しなければ null
 */
export function sampleNumberOf(title: string, prefix: string): number | null {
  if (!title.startsWith(prefix)) return null;
  const m = title.slice(prefix.length).match(/^\d+/);
  return m ? Number(m[0]) : null;
}

/**
 * サンプル問題を「年度 → 本番の問番号」順に並べたリストを作る。
 * 中身は固定（乱数を使わない）ので、呼び出し側でモジュール定数として1回だけ作れば足りる。
 */
export function buildSampleOrder<T extends { id: string; title?: string }>(
  all: T[]
): { id: string; year: string; qno: number }[] {
  const sample = CATEGORIES.find((c) => c.key === "sample");
  const out: { id: string; year: string; qno: number }[] = [];
  for (const g of sample?.sampleGroups ?? []) {
    const items: { id: string; year: string; qno: number }[] = [];
    for (const q of all) {
      const n = sampleNumberOf(q.title ?? "", g.prefix);
      if (n !== null) items.push({ id: q.id, year: g.name, qno: n });
    }
    items.sort((a, b) => a.qno - b.qno);
    out.push(...items);
  }
  return out;
}

/**
 * 学習スケジュール（8週）。問題演習の一覧を「スケジュール別」で見るときに使う。
 * ペース配分の考え方:
 *   - 1週目は内容が軽いので倍速（毎日開く習慣づけを優先）
 *   - 5〜7週目は再帰・ビット演算・データ構造・数学系で重いので土日を減らす
 *   - 8週目は模擬試験①のぶん問題数を抑える
 */
export type Week = { week: number; from: number; to: number; pace: string; note?: string };

export const WEEKS: Week[] = [
  { week: 1, from: 0,  to: 18, pace: "平日2問・土日4問", note: "内容が軽いので倍速で進めます" },
  { week: 2, from: 19, to: 31, pace: "平日1問・土日4問" },
  { week: 3, from: 32, to: 44, pace: "平日1問・土日4問" },
  { week: 4, from: 45, to: 57, pace: "平日1問・土日4問", note: "読解系(問46〜49)は1日2問で進めてOK" },
  { week: 5, from: 58, to: 68, pace: "平日1問・土日3問" },
  { week: 6, from: 69, to: 79, pace: "平日1問・土日3問" },
  { week: 7, from: 80, to: 90, pace: "平日1問・土日3問" },
  { week: 8, from: 91, to: 97, pace: "平日1問・土日4問", note: "最後に模擬試験①を受けましょう" }
];

/** 一覧のボタンに出すバッジ文言（サンプル問題であることだけを示す） */
export const SAMPLE_BADGE = "公開";

/** サンプル問題（IPA公開のサンプル問題）かどうか */
export function isSampleQuestion(title: string): boolean {
  const sample = CATEGORIES.find((c) => c.key === "sample");
  return (sample?.sampleGroups ?? []).some((g) => title.startsWith(g.prefix));
}

/** その問番号が属するタブのkeyを返す（該当なしは最初のタブ） */
export function categoryOf(num: number): string {
  for (const c of CATEGORIES) {
    for (const g of c.groups) {
      if (num >= g.from && num <= g.to) return c.key;
    }
  }
  return CATEGORIES[0].key;
}
