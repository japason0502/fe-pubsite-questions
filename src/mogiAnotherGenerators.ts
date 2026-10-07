/**
 * 模擬試験A・B の問題の「値を変えてもう一度」。
 * anotherQuestionGenerators.ts の表に混ぜて使う（キーは模試側の問題 id: m1〜m16 / n1〜n16）。
 *
 * どの生成器も「正解は自分で計算する」「誤答は読み違えたときに実際に出る値で作る」方針。
 * 直前と同じ問題にならないよう、生成器ごとに直前のパターンを覚えておく。
 */
import type { BodyBlock, Choice, Question } from "./types";
import type { GeneratedQuestionPatch } from "./anotherQuestionGenerators";

type Gen = (base: Question) => GeneratedQuestionPatch;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}
/** 全角マイナスの数値表示 */
function num(n: number): string {
  return n < 0 ? `−${-n}` : String(n);
}
const byNumber = (a: string, b: string) => Number(a.replace("−", "-")) - Number(b.replace("−", "-"));

/**
 * 正解と誤答候補から解答群を作る。誤答は重複・正解と同じものを捨て、足りるだけ選ぶ。
 * sort を渡すとその順に並べる（数値の解答群は小さい順にするのが本番の作法）。
 */
function buildChoices(
  correct: string,
  wrongs: string[],
  count: number,
  sort?: (a: string, b: string) => number
): { choices: Choice[]; correctChoiceId: string } {
  const uniq: string[] = [];
  for (const w of wrongs) if (w !== correct && !uniq.includes(w)) uniq.push(w);
  let items = [correct, ...shuffle(uniq).slice(0, count - 1)];
  items = sort ? items.sort(sort) : shuffle(items);
  const choices = items.map((text, i) => ({ id: `c${i + 1}`, text }));
  return { choices, correctChoiceId: choices[items.indexOf(correct)].id };
}

/** 直前と同じ署名なら作り直す（最大 30 回） */
const lastSig: Record<string, string> = {};
function fresh<T>(key: string, make: () => { sig: string; value: T }): T {
  let r = make();
  for (let i = 0; i < 30 && r.sig === lastSig[key]; i += 1) r = make();
  lastSig[key] = r.sig;
  return r.value;
}
/** 直前と違うモードを選ぶ */
const lastMode: Record<string, string> = {};
function nextMode<T extends string>(key: string, modes: T[]): T {
  const cands = modes.filter((m) => m !== lastMode[key]);
  const m = pick(cands.length ? cands : modes);
  lastMode[key] = m;
  return m;
}

/* ==================== 模試A ==================== */

/** A問1 大域変数：g の初期値・各関数の a を変える */
const genM1: Gen = () =>
  fresh("m1", () => {
    let g0 = 0, a1 = 0, a2 = 0, ans = 0, wrongs: number[] = [];
    for (;;) {
      g0 = randomInt(2, 9);
      a1 = randomInt(2, 9);
      a2 = randomInt(2, 9);
      if (a1 === a2) continue;
      ans = g0 * a2 - a1 + a2;
      wrongs = [
        g0 * a2 - a1 + a1, // 最後の ＋a を func1 の a で計算した
        g0 * a2 + a2, // func1 の呼び出しを飛ばした
        (g0 - a1) * a2 + a2, // func1 を先に実行した
        g0 * a2 - a1, // 最後の ＋a を忘れた
        g0 + a2 - a1 + a2 // × を ＋ と読んだ
      ].filter((v) => v > 0 && v !== ans);
      if (ans > 0 && new Set(wrongs).size >= 3) break;
    }
    const { choices, correctChoiceId } = buildChoices(String(ans), wrongs.map(String), 4, byNumber);
    return {
      sig: `${g0},${a1},${a2}`,
      value: {
        pseudoCode: [
          `大域: 整数型: g ← ${g0}`,
          "",
          "○func1()",
          `  整数型: a ← ${a1}`,
          "  g ← g − a",
          "",
          "○func2()",
          `  整数型: a ← ${a2}`,
          "  g ← g × a",
          "  func1()",
          "  g ← g ＋ a",
          "  gの値を出力"
        ],
        choices,
        correctChoiceId,
        anotherTraceLines: [
          `g = ${g0}`,
          `func2: a = ${a2}（func2 の局所変数）, g ← ${g0} × ${a2} = ${g0 * a2}`,
          `func1: a = ${a1}（func1 の局所変数）, g ← ${g0 * a2} − ${a1} = ${g0 * a2 - a1}`,
          `func2 に戻る: g ← ${g0 * a2 - a1} ＋ ${a2} = ${ans}（a は func2 の ${a2}）`,
          `出力は ${ans}`
        ]
      }
    };
  });

/** A問2 条件分岐：引数と各分岐の加算値を変える */
const genM2: Gen = () =>
  fresh("m2", () => {
    const n = randomInt(1, 4);
    let c: number[];
    do c = [randomInt(2, 9), randomInt(2, 9), randomInt(2, 9)];
    while (new Set(c).size < 3);
    const branch = n === 1 ? 0 : n !== 2 ? 1 : 2;
    const ans = n + c[branch];
    const wrongs = [n + c[0], n + c[1], n + c[2], n, n + c[0] + c[1]];
    const { choices, correctChoiceId } = buildChoices(String(ans), wrongs.map(String), 5, byNumber);
    const why = ["n が 1 と等しいので", "n は 1 ではなく，2 と等しくないので", "n は 1 ではなく，2 と等しい（「2と等しくない」は偽）ので"][branch];
    return {
      sig: `${n},${c}`,
      value: {
        bodyText: `関数 add を add(${n}) として呼び出したとき，戻り値は【　】である。`,
        pseudoCode: [
          "○ 整数型: add(整数型: n)",
          "  if (n が 1と等しい)",
          `      n ← n + ${c[0]}`,
          "  elseif (nが2と等しくない)",
          `      n ← n + ${c[1]}`,
          "  else",
          `      n ← n + ${c[2]}`,
          "  endif",
          "  return n"
        ],
        choices,
        correctChoiceId,
        anotherTraceLines: [`n = ${n}`, `${why} n ← ${n} + ${c[branch]} = ${ans}`, `戻り値は ${ans}`]
      }
    };
  });

/** A問3 2次元配列：配列・limit・聞く要素番号を変える */
const genM3: Gen = (base) =>
  fresh("m3", () => {
    const data = [0, 1, 2].map(() => [0, 1, 2].map(() => randomInt(1, 9)));
    const flat = data.flat();
    // k 番目（0始まり, 1〜7）で初めて limit を超えるように limit を決める
    const k = randomInt(1, 7);
    const before = flat.slice(0, k).reduce((s, v) => s + v, 0);
    const limit = randomInt(before, before + flat[k] - 1);
    const row = Math.floor(k / 3) + 1;
    const col = (k % 3) + 1;
    const idx = randomInt(1, 2) as 1 | 2;
    const ans = idx === 1 ? row : col;
    // 解答群は元の問題と同じ {1, 2, 3, 4, −1}
    const texts = base.choices.map((c) => c.text);
    const correct = base.choices[texts.indexOf(String(ans))];
    const arr = `{${data.map((r) => `{${r.join(", ")}}`).join(", ")}}`;
    const sums: string[] = [];
    let s = 0;
    for (let t = 0; t <= k; t += 1) {
      s += flat[t];
      sums.push(`data[${Math.floor(t / 3) + 1}][${(t % 3) + 1}] = ${flat[t]} → sum = ${s}${s > limit ? `（${limit} を超えた）` : ""}`);
    }
    return {
      sig: `${arr},${limit},${idx}`,
      value: {
        bodyText: `関数 findPos を findPos(${arr}, ${limit}) として呼び出したとき，戻り値の配列 の要素番号 ${idx} の値は【　】となる。`,
        choices: base.choices,
        correctChoiceId: correct.id,
        anotherTraceLines: [...sums, `pos = {${row}, ${col}} を返す → 要素番号 ${idx} は ${ans}`]
      }
    };
  });

/** A問6 2進数変換：「上位桁から」と「下位桁から」を入れ替え、例の数も変える（選択肢はそのまま） */
const genM6b: Gen = (base) =>
  fresh("m6b", () => {
    const order = nextMode("m6b", ["upper", "lower"] as const);
    const v = randomInt(1, 99);
    const bits = v.toString(2).padStart(8, "0").split("");
    const shown = order === "upper" ? bits : [...bits].reverse();
    // 解答群: c1 = k を 1 から 8, 2 ／ c5 = k を 8 から 1, 2
    const correctChoiceId = order === "upper" ? "c5" : "c1";
    const label = order === "upper" ? "上位桁" : "下位桁";
    return {
      sig: `${order},${v}`,
      value: {
        bodyText: `関数 toBinary は，引数として与えられた 0 より大きく 100 未満の整数を 8 桁の符号なしの 2 進数に変換し，${label}から順に 1 ビットずつ要素に格納した整数型の配列を返す。例えば，引数として ${v} を与えると，{${shown.join(", ")}} が返る。`,
        choices: base.choices,
        choiceTable: base.choiceTable,
        correctChoiceId,
        anotherTraceLines: [
          "j ÷ 2 の余りは，いちばん下の桁（最下位ビット）から順に求まる",
          order === "upper"
            ? "上位桁から格納する → 最下位ビットは out[8] に入れたい → k を 8 から 1 まで減らす（オ）"
            : "下位桁から格納する → 最下位ビットは out[1] に入れたい → k を 1 から 8 まで増やす（ア）"
        ]
      }
    };
  });

/** A問7 再帰：総和／階乗 × 穴の位置（return の式／終了条件）を切り替える */
const genM7: Gen = (base) => {
  const mode = nextMode("m7", ["sum-cond", "fact-ret", "fact-cond"] as const);
  const fact = mode.startsWith("fact");
  const condHole = mode.endsWith("cond");
  const op = fact ? "×" : "+";
  const word = fact ? "階乗" : "総和";
  const bodyBlocks: BodyBlock[] = [
    { type: "text", text: `関数 f は非負の整数 n を引数にとり，その${word}を返す関数である。` },
    {
      type: "text",
      text: fact
        ? "非負の整数 n の階乗は n が 1 以下のときに 1 になり，それ以外の場合は 1 から n までの整数を全て掛け合わせた数となる。"
        : (base.bodyBlocks?.[1] as { text: string } | undefined)?.text ?? ""
    }
  ];
  const pseudoCode = [
    "○ 整数型: f(整数型: n)",
    `  if (${condHole ? "【　】" : "n ≤ 1"})`,
    "    return 1",
    "  endif",
    "",
    `  return ${condHole ? `n ${op} f(n − 1)` : "【　】"}`
  ];
  const r = condHole
    ? // 階乗では「n ≤ 0」「n ＜ 1」でも結果が同じになるので誤答に使わない
      buildChoices("n ≤ 1", fact ? ["n ≥ 1", "n ＞ 1", "n ≠ 1", "n ≥ 0", "n ＝ 2"] : ["n ≥ 1", "n ＜ 1", "n ＞ 1", "n ≠ 1", "n ≤ 0"], 6)
    : buildChoices(`n ${op} f(n − 1)`, [`(n − 1) ${op} f(n)`, "f(n − 1)", "n", `n ${op} (n − 1)`, `n ${op} f(1)`], 6);
  return {
    bodyBlocks,
    pseudoCode,
    ...r,
    anotherTraceLines: condHole
      ? [`n が 1 以下（0 と 1）のときは 1 を返して再帰を止める`, `「n ＜ 1」だと f(1) が f(0) を呼び，${word}が合わない。「n ≠ 1」だと f(0) で止まらない`]
      : [`f(n) = n ${op} f(n − 1)（n ${fact ? "の階乗は n × (n − 1) の階乗" : "までの総和は n ＋ (n − 1) までの総和"}）`]
  };
};

/* ---------- 2分木（A問9・B問9 共通） ---------- */
const TREE: number[][] = [[2, 3], [4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14], [], [], [], [], [], [], []];
type TreeOrder = "pre" | "in" | "post";
function traverse(n: number, order: TreeOrder, out: number[] = []): number[] {
  const ch = TREE[n - 1];
  if (order === "pre") out.push(n);
  if (ch[0]) traverse(ch[0], order, out);
  if (order === "in") out.push(n);
  if (ch[1]) traverse(ch[1], order, out);
  if (order === "post") out.push(n);
  return out;
}
function treePseudo(header: string[], order: TreeOrder): string[] {
  const p = "        n を出力";
  return [
    ...header,
    "○order(整数型: n)",
    "    if (tree[n] の要素数 が 2 と等しい)",
    ...(order === "pre" ? [p] : []),
    "        order(tree[n][1])",
    ...(order === "in" ? [p] : []),
    "        order(tree[n][2])",
    ...(order === "post" ? [p] : []),
    "    elseif (tree[n] の要素数 が 1 と等しい)",
    ...(order === "pre" ? [p] : []),
    "        order(tree[n][1])",
    ...(order !== "pre" ? [p] : []),
    "    else",
    "        n を出力",
    "    endif"
  ];
}
const ORDER_NAME: Record<TreeOrder, string> = { pre: "先行順（根→左→右）", in: "中間順（左→根→右）", post: "後行順（左→右→根）" };
function genTree(key: string, modes: TreeOrder[]): Gen {
  return (base) => {
    const order = nextMode(key, modes);
    const seq = traverse(1, order).join(" ");
    const correct = base.choices.find((c) => c.text.trim() === seq);
    if (!correct) throw new Error(`${key}: 解答群に ${seq} が無い`);
    const header = (base.pseudoCode ?? []).slice(0, 4);
    return {
      pseudoCode: treePseudo(header, order),
      choices: base.choices,
      correctChoiceId: correct.id,
      anotherTraceLines: [`「n を出力」の位置が変わり，${ORDER_NAME[order]}の順になる`, `出力: ${seq}`]
    };
  };
}

/** A問11 出現回数：目標の戻り値を変える */
const genM11: Gen = () =>
  fresh("m11", () => {
    let cnt: number[];
    do cnt = [randomInt(1, 3), randomInt(1, 3), randomInt(1, 3)];
    while (new Set(cnt).size < 2);
    const arrOf = (c: number[]) => shuffle(c.flatMap((k, i) => Array(k).fill(i + 1)));
    const fmt = (a: number[]) => `{${a.join(", ")}}`;
    const correct = fmt(arrOf(cnt));
    const key = cnt.join(",");
    // 誤答: 個数の並びを入れ替えたもの／どれか1個ずれたもの
    const cands = new Set<string>();
    const perms = [[0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    for (const p of shuffle(perms)) {
      const c2 = p.map((i) => cnt[i]);
      if (c2.join(",") !== key) cands.add(fmt(arrOf(c2)));
    }
    for (let i = 0; i < 3; i += 1) {
      const c2 = [...cnt];
      c2[i] += c2[i] < 3 ? 1 : -1;
      cands.add(fmt(arrOf(c2)));
    }
    const { choices, correctChoiceId } = buildChoices(correct, [...cands], 4);
    return {
      sig: key + correct,
      value: {
        bodyText: `関数 count は，各要素が 1 以上 3 以下の整数である整数型の配列 data を引数にとり，要素数 3 の整数型の配列を返す。関数 count を count(【　】) として呼び出すと，戻り値は {${key.replace(/,/g, ", ")}} となる。`,
        choices,
        correctChoiceId,
        anotherTraceLines: [
          `戻り値 {${key.replace(/,/g, ", ")}} は「1 が ${cnt[0]} 個，2 が ${cnt[1]} 個，3 が ${cnt[2]} 個」の意味`,
          `正解 ${correct}`
        ]
      }
    };
  });

/** A問14 バブルソート：data を変える／降順に変える（α が真になる回数＝入れ替えの回数） */
const genM14: Gen = () =>
  fresh("m14", () => {
    const desc = randomInt(0, 2) === 0;
    let data: number[], inv: number;
    do {
      data = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 5);
      inv = 0;
      for (let i = 0; i < 5; i += 1) for (let j = i + 1; j < 5; j += 1) if (data[i] > data[j]) inv += 1;
      if (desc) inv = 10 - inv;
    } while (inv < 2 || inv > 8);
    const wrongs = [inv - 1, inv + 1, inv + 2, inv - 2, 10, 10 - inv].filter((v) => v >= 0);
    const { choices, correctChoiceId } = buildChoices(String(inv), wrongs.map(String), 4, byNumber);
    return {
      sig: `${desc},${data}`,
      value: {
        bodyText: `次の手続 bubble は，大域の整数型の配列 data を${desc ? "降順" : "昇順"}に整列する。手続 bubble を呼び出したとき，\`/*** α ***/\` の条件式が真となる回数は【　】回である。`,
        pseudoCode: [
          `大域: 整数型の配列: data ← {${data.join(", ")}}`,
          "",
          "○ bubble()",
          "    整数型: n ← data の要素数",
          "    整数型: i, j, tmp",
          "    for (i を 1 から n − 1 まで 1 ずつ増やす)",
          "        for (j を n から i ＋ 1 まで 1 ずつ減らす)",
          `            if (data[j] ${desc ? ">" : "<"} data[j − 1])     /*** α ***/`,
          "                tmp ← data[j]",
          "                data[j] ← data[j − 1]",
          "                data[j − 1] ← tmp",
          "            endif",
          "        endfor",
          "    endfor"
        ],
        choices,
        correctChoiceId,
        anotherTraceLines: [
          "α が真になる＝隣どうしを入れ替える。入れ替えの回数は「順番が逆になっている組」の数と同じ",
          `{${data.join(", ")}} で${desc ? "降順" : "昇順"}に対して逆になっている組は ${inv} 組 → ${inv} 回`,
          "（条件式を評価する回数は 4＋3＋2＋1 ＝ 10 回で，データによらない）"
        ]
      }
    };
  });

/* ==================== 模試B ==================== */

/** B問1 手続の呼び出し順：proc1・proc3 の中の順番を組み替える */
const genN1: Gen = () =>
  fresh("n1", () => {
    type Step = "A" | "B" | "C" | "p1" | "p2";
    const p1: Step[] = shuffle(["p2", "A"] as Step[]);
    const p3: Step[] = shuffle(["C", "p1", "p2"] as Step[]);
    const run = (body: Step[], p1b: Step[]): string[] =>
      body.flatMap((s) => (s === "p1" ? run(p1b, p1b) : s === "p2" ? ["B"] : [s]));
    const out = run(p3, p1);
    const fmt = (a: string[]) => a.map((x) => `"${x}"`).join(", ");
    const correct = fmt(out);
    // 誤答: 他の組み方の出力／proc1 の中身を展開し忘れ（"A"だけ）／呼び出しを無視
    const wrongs: string[] = [];
    for (const q1 of [["p2", "A"], ["A", "p2"]] as Step[][])
      for (const q3 of [["C", "p1", "p2"], ["C", "p2", "p1"], ["p1", "C", "p2"], ["p1", "p2", "C"], ["p2", "C", "p1"], ["p2", "p1", "C"]] as Step[][])
        wrongs.push(fmt(run(q3, q1)));
    wrongs.push(fmt(p3.flatMap((s) => (s === "p1" ? ["A"] : s === "p2" ? ["B"] : [s]))));
    wrongs.push(fmt(["C", "B", "A"])); // proc2 の2回目を数え忘れ
    const { choices, correctChoiceId } = buildChoices(correct, wrongs, 8);
    const line = (s: Step) => (s === "p1" ? "  proc1()" : s === "p2" ? "  proc2()" : `  "${s}" を出力する`);
    return {
      sig: `${p1}|${p3}`,
      value: {
        pseudoCode: ["○ proc1()", ...p1.map(line), "", "○ proc2()", '  "B" を出力する', "", "○ proc3()", ...p3.map(line)],
        choices,
        correctChoiceId,
        anotherTraceLines: [
          `proc1 は ${fmt(run(p1, p1))} を出力する`,
          `proc3 は ${p3.map((s) => (s === "p1" ? "proc1" : s === "p2" ? "proc2" : `"${s}"`)).join(" → ")} の順`,
          `出力: ${correct}`
        ]
      }
    };
  });

/** B問4 減算法：引数と α の位置を変える */
const genN4: Gen = () =>
  fresh("n4", () => {
    let a0 = 0, b0 = 0, ca = 0, cb = 0;
    const alphaOnA = randomInt(0, 1) === 1;
    const trace: string[] = [];
    for (;;) {
      const g = randomInt(2, 15);
      a0 = g * randomInt(1, 12);
      b0 = g * randomInt(1, 12);
      if (a0 === b0 || a0 > 150 || b0 > 150) continue;
      let a = a0, b = b0;
      ca = 0; cb = 0;
      trace.length = 0;
      while (a !== b) {
        if (a > b) { a -= b; ca += 1; trace.push(`a ← ${a + b} − ${b} = ${a}`); }
        else { b -= a; cb += 1; trace.push(`b ← ${b + a} − ${a} = ${b}${alphaOnA ? "" : "   ← α"}`); }
        if (alphaOnA && trace[trace.length - 1].startsWith("a")) trace[trace.length - 1] += "   ← α";
      }
      const c = alphaOnA ? ca : cb;
      if (c >= 2 && c <= 6 && ca + cb <= 9) break;
    }
    const ans = alphaOnA ? ca : cb;
    const other = alphaOnA ? cb : ca;
    const { choices, correctChoiceId } = buildChoices(
      String(ans),
      [ans - 1, ans + 1, ans + 2, other, ca + cb].filter((v) => v > 0).map(String),
      4,
      byNumber
    );
    return {
      sig: `${a0},${b0},${alphaOnA}`,
      value: {
        bodyText: `関数 gcdをgcd(${a0}, ${b0}) として呼び出したとき，\`/*** α ***/\` の行は【　】回実行される｡`,
        pseudoCode: [
          "○整数型: gcd(整数型: a, 整数型: b)",
          "    while (a ≠ b)",
          "        if (a ＞ b)",
          `            a ← a − b${alphaOnA ? "     /*** α ***/" : ""}`,
          "        else",
          `            b ← b − a${alphaOnA ? "" : "     /*** α ***/"}`,
          "        endif",
          "    endwhile",
          "    return a"
        ],
        choices,
        correctChoiceId,
        anotherTraceLines: [`a = ${a0}, b = ${b0}`, ...trace, `α の行は ${ans} 回`]
      }
    };
  });

/** B問7 互除法（再帰）：引数を変える。答えは最大公約数 */
function gcd(x: number, y: number): number {
  return y === 0 ? x : gcd(y, x % y);
}
const genN7: Gen = () =>
  fresh("n7", () => {
    let x = 0, y = 0, g = 0;
    for (;;) {
      g = randomInt(3, 40);
      const p = randomInt(5, 30), q = randomInt(5, 30);
      if (p === q || gcd(p, q) !== 1) continue;
      x = g * p; y = g * q;
      if (x < 1000 && y < 1000) break;
    }
    const trace: string[] = [];
    let a = x, b = y;
    while (b !== 0) {
      trace.push(`func(${a}, ${b}) → func(${b}, ${a} mod ${b} = ${a % b})`);
      [a, b] = [b, a % b];
    }
    trace.push(`func(${a}, 0) → ${a} を返す`);
    const mid = Math.max(x, y) % Math.min(x, y);
    const { choices, correctChoiceId } = buildChoices(String(g), ["0", String(x), String(y), String(mid), String(Math.abs(x - y))], 5, byNumber);
    return {
      sig: `${x},${y}`,
      value: {
        bodyText: `次のプログラム中の関数 func を func(${x}, ${y}) として呼び出したとき，戻り値は【　】となる。`,
        choices,
        correctChoiceId,
        anotherTraceLines: trace
      }
    };
  });

/** B問10 リストへの挿入：穴の位置を変える（解答群はそのまま） */
const genN10: Gen = (base) => {
  const mode = nextMode("n10", ["link", "head-next", "head"] as const);
  const src = base.pseudoCode ?? [];
  const lines = src.map((l) => (l.includes("prev.next ← 【　】") ? l.replace("【　】", "curr") : l));
  const target = { link: "    curr.next ← prev.next", "head-next": "    curr.next ← listHead", head: "    listHead ← curr" }[mode];
  const i = lines.indexOf(target);
  if (i < 0) throw new Error(`n10: ${target} が見つからない`);
  const [lhs, ans] = target.split(" ← ");
  lines[i] = `${lhs} ← 【　】`;
  const correct = base.choices.find((c) => c.text === ans);
  if (!correct) throw new Error(`n10: 解答群に ${ans} が無い`);
  const why = {
    link: "新しい要素 curr の次を，挿入位置の直前の要素 prev の次（prev.next）にしてから，prev の次を curr にする。順番を逆にすると prev.next が先に curr で上書きされて失われる",
    "head-next": "先頭に挿入するので，curr の次を今の先頭 listHead にする",
    head: "先頭に挿入したので，listHead を curr に付け替える"
  }[mode];
  return { pseudoCode: lines, choices: base.choices, correctChoiceId: correct.id, anotherTraceLines: [why, `正解は ${ans}`] };
};

/** B問11 バケットソート：選択肢を作り直す（正解は十の位が 1〜5 で全部ちがう） */
const genN11: Gen = () =>
  fresh("n11", () => {
    const make = (tens: number[]) => {
      const used = new Set<number>();
      return tens.map((t) => {
        let v: number;
        do v = t * 10 + randomInt(0, 9);
        while (used.has(v));
        used.add(v);
        return v;
      });
    };
    const fmt = (a: number[]) => `{${a.join(", ")}}`;
    const correctArr = shuffle(make([1, 2, 3, 4, 5]));
    const correct = fmt(correctArr);
    const wrongs: string[] = [];
    while (wrongs.length < 6) {
      // どれか一つの十の位を，別の十の位とかぶらせる（＝どこかが未定義のまま残る）
      const tens = [1, 2, 3, 4, 5];
      const drop = randomInt(0, 4);
      let dup: number;
      do dup = randomInt(1, 5);
      while (dup === tens[drop]);
      tens[drop] = dup;
      const w = fmt(shuffle(make(tens)));
      if (!wrongs.includes(w)) wrongs.push(w);
    }
    const { choices, correctChoiceId } = buildChoices(correct, wrongs, 4);
    return {
      sig: correct,
      value: {
        choices,
        correctChoiceId,
        anotherTraceLines: [
          "data[i] ÷ 10 の商（十の位）の位置に入れるので，十の位が 1〜5 で全部ちがえば，slot[1]〜slot[5] が全部埋まって昇順になる",
          `正解 ${correct}`
        ]
      }
    };
  });

/** B問12 ペア置換暗号：text を変える */
const TBL = ["GALNT", "BWKES", "OFUIY", "MRCXD", "PJVHQ"];
const posOf = (ch: string): [number, number] => {
  const r = TBL.findIndex((row) => row.includes(ch));
  return [r, TBL[r].indexOf(ch)];
};
const at = (r: number, c: number) => TBL[r][c];
function encPair(a: string, b: string, shift = 1): string[] {
  const [r1, c1] = posOf(a);
  const [r2, c2] = posOf(b);
  if (r1 === r2) return [at(r1, (c1 + shift + 5) % 5), at(r2, (c2 + shift + 5) % 5)];
  return [at(r2, c1), at(r1, c2)];
}
const genN12: Gen = (base) =>
  fresh("n12", () => {
    let text: string[], out: string[], wrongs: string[];
    for (;;) {
      // 同じ行の組と，ちがう行の組を一つずつ（並びはランダム）
      const r = randomInt(0, 4);
      const [x, y] = shuffle([0, 1, 2, 3, 4]).slice(0, 2);
      const same = [TBL[r][x], TBL[r][y]];
      let r2a: number, r2b: number;
      do { r2a = randomInt(0, 4); r2b = randomInt(0, 4); } while (r2a === r2b);
      const diff = [TBL[r2a][randomInt(0, 4)], TBL[r2b][randomInt(0, 4)]];
      const pairs = randomInt(0, 1) ? [same, diff] : [diff, same];
      text = pairs.flat();
      if (new Set(text).size < 4) continue;
      const e1 = encPair(text[0], text[1]);
      const e2 = encPair(text[2], text[3]);
      out = [...e1, ...e2];
      const left1 = encPair(text[0], text[1], -1);
      const left2 = encPair(text[2], text[3], -1);
      wrongs = [
        [...e1, text[2], text[3]], // 2組目を置き換え忘れ
        [text[0], text[1], ...e2], // 1組目を置き換え忘れ
        [...left1, ...left2], // 同じ行で左隣にした
        [...e2, ...e1], // 組の順番を逆にした
        [...e1, ...e2.slice().reverse()] // 行の交換で文字の順を逆にした
      ].map((a) => a.join(","));
      if (new Set([out.join(","), ...wrongs]).size >= 5) break;
    }
    const fmt = (s: string) => `{${s.split(",").map((c) => `"${c}"`).join(", ")}}`;
    const { choices, correctChoiceId } = buildChoices(fmt(out.join(",")), wrongs.map(fmt), 5);
    const blocks = (base.bodyBlocks ?? []).map((b) =>
      b.type === "text" && b.text.includes("encrypt({")
        ? { ...b, text: `関数 encrypt を encrypt({${text.map((c) => `"${c}"`).join(", ")}}, tbl) として呼び出したとき，戻り値は【　　　】である。` }
        : b
    );
    const desc = (a: string, b: string) => {
      const [r1, c1] = posOf(a), [r2, c2] = posOf(b);
      return r1 === r2
        ? `${a}(${r1 + 1}行${c1 + 1}列),${b}(${r2 + 1}行${c2 + 1}列)は同じ行 → 右隣 → ${encPair(a, b).join(",")}`
        : `${a}(${r1 + 1}行${c1 + 1}列),${b}(${r2 + 1}行${c2 + 1}列)は別の行 → 行を交換 → ${encPair(a, b).join(",")}`;
    };
    return {
      sig: text.join(""),
      value: {
        bodyBlocks: blocks,
        choices,
        correctChoiceId,
        anotherTraceLines: [desc(text[0], text[1]), desc(text[2], text[3]), `戻り値 ${fmt(out.join(","))}`]
      }
    };
  });

/** B問14 選択ソート：配列と「j が○と出力された直後」を変える */
const genN14: Gen = () =>
  fresh("n14", () => {
    let arr: number[], j: number, states: number[][];
    for (;;) {
      arr = shuffle([1, 2, 3, 4, 5]);
      j = randomInt(1, 3);
      states = [arr.slice()];
      const w = arr.slice();
      for (let k = 0; k < 4; k += 1) {
        let m = k;
        for (let t = k + 1; t < 5; t += 1) if (w[t] < w[m]) m = t;
        [w[k], w[m]] = [w[m], w[k]];
        states.push(w.slice());
      }
      // 直前・直後と区別できる配列にする
      const s = states.map((x) => x.join(","));
      if (s[j] !== s[j - 1] && s[j] !== s[j + 1] && s[j] !== "1,2,3,4,5") break;
    }
    const f = (a: number[]) => a.join(",");
    const wrongs = [f(states[j - 1]), f(states[j + 1]), "1,2,3,4,5", "5,4,3,2,1", f(states[Math.min(j + 2, 4)])];
    const { choices, correctChoiceId } = buildChoices(f(states[j]), wrongs, 4);
    return {
      sig: `${arr},${j}`,
      value: {
        bodyText: `手続 sort は，要素数が 2 以上の整数型の配列を引数 numberArray で受け取り，その要素を昇順に並べ替えた結果を出力する。手続 sort の動作確認のために，処理の途中で j の値と workArray の全ての要素を出力する。配列 numberArray を {${arr.join("，")}} とし，手続 sort を sort(numberArray) として呼び出したとき，j の値が ${j} と出力された直後の workArray の全ての要素の出力は【　】である。`,
        choices,
        correctChoiceId,
        anotherTraceLines: [
          `初め: ${f(states[0])}`,
          ...states.slice(1, j + 1).map((s, i) => `j = ${i + 1}: ${f(s)}`),
          `→ j が ${j} と出力された直後は ${f(states[j])}`
        ]
      }
    };
  });

export const mogiAnotherGenerators: Record<string, Gen> = {
  m1: genM1,
  m2: genM2,
  m3: genM3,
  m6b: genM6b,
  m7: genM7,
  m9: genTree("m9", ["pre", "in"]),
  m11: genM11,
  m14: genM14,
  n1: genN1,
  n4: genN4,
  n7: genN7,
  n9: genTree("n9", ["in", "post"]),
  n10: genN10,
  n11: genN11,
  n12: genN12,
  n14: genN14
};
