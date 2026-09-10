/**
 * 問題演習の一覧表示で使う分野分け（表示専用）
 *
 * 出典: 原稿 genko_kihon.md の章立て（## 見出し = タブ / ### 見出し = グループ）
 * 問題データ側は一切変更していない。ここは「見た目の分類」だけを持つ。
 *
 * どの問題がどのグループかは、問題データ側の group で持つ（questions.json の "group"）。
 * ここが持つのは「どのタブに、どのグループを、どの順で並べるか」だけ。
 *
 * 以前は問番号の範囲（from/to）で分類していたが、number は解説画像のファイル名でもあり
 * 変えられない一方、新しい問題を分類するには番号を範囲に合わせるしかなかった。
 * 分類のたびに番号を動かす羽目になるので、分類はデータ側の属性に移した。
 */

/** desc: グループ名の下に出す説明文（任意） */
/** key: 全体で一意な識別子。name は表示名なので、分野をまたいで重複してよい
 *  （例: 情報セキュリティと読解系の両方に「追加演習」を置ける） */
export type Group = { key: string; name: string; desc?: string };
/** サンプル問題タブ用: タイトル先頭の年度表記でグループ分けする */
/** noOrder: 「この順番で出題する」の対象外にする（表示だけしたいグループ用） */
export type SampleGroup = { name: string; prefix: string; noOrder?: boolean };
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
      { key: "trace-vars", name: "変数" },
      { key: "trace-array", name: "配列" },
      { key: "trace-func-basic", name: "関数の基本" },
      { key: "trace-for", name: "繰り返し(for)" },
      { key: "trace-for-array", name: "繰り返し(for)&配列" },
      { key: "trace-branch", name: "条件分岐" },
      { key: "trace-for-nest", name: "繰り返し(for)のネスト" },
      { key: "trace-while", name: "繰り返し(while)" },
      { key: "trace-while-multi", name: "複数のwhile" },
      { key: "trace-funcs", name: "複数の関数" },
      { key: "trace-array2d", name: "二次元配列" }
    ]
  },
  {
    key: "reading",
    label: "読解(穴埋め)系",
    groups: [
      { key: "read-branch", name: "分岐読解" },
      { key: "read-expr", name: "式読解" }
    ]
  },
  {
    key: "hard",
    label: "クセが強い系",
    groups: [
      { key: "hard-recursion", name: "再帰" },
      { key: "hard-binary", name: "2進数･ビット演算" },
      { key: "hard-oop", name: "オブジェクト指向" },
      { key: "hard-stack-queue", name: "スタックとキュー" },
      { key: "hard-linked-list", name: "単方向リスト" },
      { key: "hard-math", name: "数学系" }
    ]
  },
  {
    key: "mixed",
    label: "読解&トレース",
    groups: [
      { key: "mixed-other", name: "読解&トレース(その他の問題)" }
    ]
  },
  {
    key: "security",
    label: "情報セキュリティ",
    groups: [
      { key: "sec-main", name: "情報セキュリティ" },
      {
        key: "sec-extra",
        name: "追加演習",
        desc: "情報セキュリティマネジメント試験の問題です｡追加演習にご利用ください｡"
      }
      // 模擬試験で使っている問題も、模試のグループではなくここ（追加演習）に入れる。
      // 模試で使っているかどうかは分野ではないので、グループにせずバッジで示す（mogiBadgeOf）
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
      { name: "令和7年度", prefix: "R7問" },
      { name: "情報セキュリティマネジメント R5", prefix: "SG R5問", noOrder: true },
      { name: "情報セキュリティマネジメント R6", prefix: "SG R6問", noOrder: true },
      { name: "情報セキュリティマネジメント R7", prefix: "SG R7問", noOrder: true },
      { name: "情報セキュリティマネジメント R8", prefix: "SG R8問", noOrder: true }
    ]
  }
];

/**
 * サンプル問題のタイトルから本来の問番号を取り出す（並び順に使う）
 * 例: "R4(12)問11(著者改編) 要素番号に配列" → 11 / 該当しなければ null
 */
export function sampleNumberOf(title: string, prefix: string): number | null {
  if (!title.startsWith(prefix) || isModified(title)) return null;
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
    if (g.noOrder) continue; // 情報セキュリティマネジメントは「この順番で出題する」の対象外
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
/** label: タブに出す名前（未指定なら「N週目」）。pace が空の週はペース表示を出さない */
export type Week = { week: number; from: number; to: number; pace: string; note?: string; label?: string };

export const WEEKS: Week[] = [
  { week: 1, from: 0,  to: 18, pace: "平日2問・土日4問", note: "内容が軽いので倍速で進めます" },
  { week: 2, from: 19, to: 31, pace: "平日1問・土日4問" },
  { week: 3, from: 32, to: 44, pace: "平日1問・土日4問" },
  { week: 4, from: 45, to: 57, pace: "平日1問・土日4問", note: "読解系(問46〜49)は1日2問で進めてOK" },
  { week: 5, from: 58, to: 68, pace: "平日1問・土日3問" },
  { week: 6, from: 69, to: 79, pace: "平日1問・土日3問" },
  { week: 7, from: 80, to: 90, pace: "平日1問・土日3問" },
  { week: 8, from: 91, to: 97, pace: "平日1問・土日4問", note: "最後に模擬試験①を受けましょう" },
  // 8週の計画には含めない、余力のある人向けの追加ぶん
  // 講座本体は 0〜97。901〜 は学習順に乗らない問題（追加演習・模試で使うもの）の置き場所で、
  // 週の進行には含めないが、週別表示から消えないようこの受け皿に入れておく。
  { week: 9, from: 800, to: 999, pace: "", label: "追加演習" }
];

/** 一覧のボタンに出すバッジ文言（サンプル問題であることだけを示す） */
export const SAMPLE_BADGE = "公開";

/** 模擬試験で使っている問題に付けるバッジ。ref（模試側の slug。例: "mogi1-19"）から模試の回を読む */
export function mogiBadgeOf(ref?: string): string | null {
  if (!ref) return null;
  if (ref.startsWith("mogi1-")) return "模試①";
  if (ref.startsWith("mogi2-")) return "模試②";
  return "模試";
}

/** 出題内容に手を入れた問題（タイトルに「改編」と入れる約束）。公開問題そのものではない */
export function isModified(title: string): boolean {
  return title.includes("改編");
}

/** サンプル問題（IPA公開のサンプル問題）かどうか。改編したものは含めない */
export function isSampleQuestion(title: string): boolean {
  if (isModified(title)) return false;
  const sample = CATEGORIES.find((c) => c.key === "sample");
  return (sample?.sampleGroups ?? []).some((g) => title.startsWith(g.prefix));
}

/** そのグループキーが属するタブのkeyを返す（該当なしは最初のタブ） */
export function categoryOf(group?: string): string {
  if (!group) return CATEGORIES[0].key;
  for (const c of CATEGORIES) {
    if (c.groups.some((g) => g.key === group)) return c.key;
  }
  return CATEGORIES[0].key;
}
