import { BodyBlock, BodyTableCell, Choice, Question } from "./types";

export type GeneratedQuestionPatch = Pick<
  Question,
  | "bodyText"
  | "pseudoCode"
  | "choices"
  | "correctChoiceId"
  | "anotherTraceLines"
  | "bodyBlocks"
  | "bodyTable"
  | "choiceTable"
>;
type AnotherQuestionGenerator = (baseQuestion: Question) => GeneratedQuestionPatch;

const CHOICE_IDS = ["a", "b", "c", "d", "e", "f", "g"];
let lastQ58Mode: 0 | 1 | null = null;
let lastQ60Mode: 0 | 1 | 2 | null = null;
let lastQ61Mode: 0 | 1 | null = null;
let lastQ70Mode: 0 | 1 | null = null;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/** 3択をランダムな順にし、id を a,b,c に振り直して正解 id を返す（アイウの並び対応） */
function shuffleThreeChoices(correctText: string, wrong1: string, wrong2: string): { choices: Choice[]; correctChoiceId: string } {
  const items = shuffle([
    { text: correctText, correct: true },
    { text: wrong1, correct: false },
    { text: wrong2, correct: false }
  ]);
  const choices: Choice[] = items.map((item, index) => ({
    id: CHOICE_IDS[index] ?? "a",
    text: item.text
  }));
  const correctIndex = items.findIndex((x) => x.correct);
  const correctChoiceId = CHOICE_IDS[correctIndex] ?? "a";
  return { choices, correctChoiceId };
}

/** 4択をランダムな順にし、id を a〜d に振り直して正解 id を返す */
function shuffleFourChoices(
  correctText: string,
  wrong1: string,
  wrong2: string,
  wrong3: string
): { choices: Choice[]; correctChoiceId: string } {
  const items = shuffle([
    { text: correctText, correct: true },
    { text: wrong1, correct: false },
    { text: wrong2, correct: false },
    { text: wrong3, correct: false }
  ]);
  const choices: Choice[] = items.map((item, index) => ({
    id: CHOICE_IDS[index] ?? "a",
    text: item.text
  }));
  const correctIndex = items.findIndex((x) => x.correct);
  const correctChoiceId = CHOICE_IDS[correctIndex] ?? "a";
  return { choices, correctChoiceId };
}

function toBin8Byte(v: number): string {
  return (v & 0xff).toString(2).padStart(8, "0");
}

function generateQ23(baseQuestion: Question): GeneratedQuestionPatch {
  const args = Array.from({ length: 6 }, () => randomInt(1, 9));
  const out: number[] = [args[0]];
  for (let i = 1; i < args.length; i += 1) {
    const tail = out[out.length - 1];
    out.push(tail + args[i]);
  }
  const correctValue = out[4];

  const candidates = new Set<number>([correctValue]);
  while (candidates.size < CHOICE_IDS.length) {
    const delta = randomInt(-10, 10);
    if (delta === 0) continue;
    const value = correctValue + delta;
    if (value >= 1) candidates.add(value);
  }

  const ordered = shuffle(Array.from(candidates));
  const choices: Choice[] = CHOICE_IDS.map((id, index) => ({
    id,
    text: String(ordered[index])
  }));
  const correctIndex = ordered.findIndex((value) => value === correctValue);
  const correctChoiceId = CHOICE_IDS[correctIndex] ?? "a";

  return {
    bodyText: `関数 makeNewArray をmakeNewArray({${args.join(", ")}})として呼び出したとき，戻り値の配列の要素番号 5 の値は【　】となる。`,
    choices,
    correctChoiceId,
    anotherTraceLines: [
      `in = {${args.join(", ")}}`,
      `out[1] = in[1] = ${out[0]}`,
      ...out.slice(1).map((value, index) => `out[${index + 2}] = out[${index + 1}] + in[${index + 2}] = ${value}`),
      `戻り値 out = {${out.join(", ")}}`,
      `要素番号5の値 = ${correctValue}`
    ]
  };
}

function randomCharArray(length: number): string[] {
  const pool = ["a", "b", "c"];
  return Array.from({ length }, () => pool[randomInt(0, pool.length - 1)]);
}

function countQ33BetaTrue(data: string[], key: string[]): number {
  let count = 0;
  const lenData = data.length;
  const lenKey = key.length;
  for (let i = 0; i <= lenData - lenKey; i += 1) {
    for (let j = 0; j < lenKey; j += 1) {
      if (data[i + j] === key[j]) {
        count += 1;
      } else {
        break;
      }
    }
  }
  return count;
}

function formatStringArrayLiteral(values: string[]): string {
  return `{${values.map((v) => `"${v}"`).join(",")}}`;
}

function generateQ33(baseQuestion: Question): GeneratedQuestionPatch {
  let data: string[] = [];
  let key: string[] = [];
  let betaTrueCount = 0;

  // 既存の選択肢(1〜10)に収まるケースのみ採用
  do {
    data = randomCharArray(randomInt(6, 8));
    key = randomCharArray(randomInt(2, 3));
    betaTrueCount = countQ33BetaTrue(data, key);
  } while (betaTrueCount < 1 || betaTrueCount > 10);

  const correctChoiceId = baseQuestion.choices.find((c) => c.text === String(betaTrueCount))?.id ?? "";
  if (!correctChoiceId) {
    return {
      bodyText: baseQuestion.bodyText,
      choices: baseQuestion.choices,
      correctChoiceId: baseQuestion.correctChoiceId
    };
  }

  return {
    bodyText: `関数 search は，二つの文字型の配列を引数 data 及び key で受け取り，data から key の並びと同じ並びを全て探し，その先頭の要素番号を格納した配列を返す。関数 search を search(${formatStringArrayLiteral(data)}, ${formatStringArrayLiteral(key)}) として呼び出すと，β の行の条件式が真となる回数は【　】回である。`,
    choices: baseQuestion.choices,
    correctChoiceId,
    anotherTraceLines: [
      `data = ${formatStringArrayLiteral(data)}`,
      `key = ${formatStringArrayLiteral(key)}`,
      `βが真になった回数 = ${betaTrueCount}`
    ]
  };
}

function createSortedNumberArray(length: number, min: number, max: number): number[] {
  const values = new Set<number>();
  while (values.size < length) {
    values.add(randomInt(min, max));
  }
  return Array.from(values).sort((a, b) => a - b);
}

function countQ36AlphaExecutions(data1: number[], data2: number[]): number {
  let i = 0;
  let j = 0;
  const n1 = data1.length;
  const n2 = data2.length;

  while (i < n1 && j < n2) {
    if (data1[i] <= data2[j]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  // 最後の while (j ≤ n2) で α 行が実行される回数
  return n2 - j;
}

function formatNumberArrayLiteral(values: number[]): string {
  return `{${values.join(", ")}}`;
}

function generateQ36(baseQuestion: Question): GeneratedQuestionPatch {
  let data1: number[] = [];
  let data2: number[] = [];
  let alphaCount = 0;

  // 選択肢 (0〜3回) に収まるケースを採用
  do {
    const len1 = randomInt(2, 3);
    const len2 = randomInt(2, 3);
    data1 = createSortedNumberArray(len1, 1, 30);
    data2 = createSortedNumberArray(len2, 1, 30);
    alphaCount = countQ36AlphaExecutions(data1, data2);
  } while (alphaCount < 0 || alphaCount > 3);

  const correctChoiceId =
    alphaCount === 0 ? "a" : alphaCount === 1 ? "b" : alphaCount === 2 ? "c" : "d";

  return {
    bodyText: `関数 merge は，昇順に整列された整数型の配列 data1 及び data2 を受け取り，これらを併合してできる昇順に整列された整数型の配列を返す。関数 merge を merge(${formatNumberArrayLiteral(data1)}, ${formatNumberArrayLiteral(data2)}) として呼び出すと，αの行は【　】。`,
    choices: baseQuestion.choices,
    correctChoiceId,
    anotherTraceLines: [
      `data1 = ${formatNumberArrayLiteral(data1)}`,
      `data2 = ${formatNumberArrayLiteral(data2)}`,
      `α行の実行回数 = ${alphaCount}`
    ]
  };
}

function generatePermutation1to5(): number[] {
  return shuffle([1, 2, 3, 4, 5]);
}

function simulateQ37FirstPrint(inputData: number[]): { data: number[]; loopCount: number } {
  const data = [...inputData];
  let first = 0;
  let last = data.length - 1;
  const pivot = data[Math.floor((first + last) / 2)];
  let i = first;
  let j = last;
  let loopCount = 0;

  while (true) {
    loopCount += 1;
    while (data[i] < pivot) i += 1;
    while (pivot < data[j]) j -= 1;
    if (i >= j) break;
    [data[i], data[j]] = [data[j], data[i]];
    i += 1;
    j -= 1;
  }
  return { data, loopCount };
}

function toChoiceTextFromNumbers(values: number[]): string {
  return values.join("　");
}

function generateQ37(baseQuestion: Question): GeneratedQuestionPatch {
  const validChoiceTextSet = new Set(baseQuestion.choices.map((c) => c.text));

  let sourceData: number[] = [];
  let firstPrintedData: number[] = [];
  let answerText = "";
  let loopCount = 0;

  do {
    sourceData = generatePermutation1to5();
    const sim = simulateQ37FirstPrint(sourceData);
    firstPrintedData = sim.data;
    loopCount = sim.loopCount;
    answerText = toChoiceTextFromNumbers(firstPrintedData);
  } while (loopCount > 3 || !validChoiceTextSet.has(answerText));

  const correctChoiceId = baseQuestion.choices.find((c) => c.text === answerText)?.id ?? "";
  if (!correctChoiceId) {
    return {
      bodyText: baseQuestion.bodyText,
      pseudoCode: baseQuestion.pseudoCode,
      choices: baseQuestion.choices,
      correctChoiceId: baseQuestion.correctChoiceId
    };
  }

  const pseudoCode = (baseQuestion.pseudoCode ?? []).map((line) =>
    line.startsWith("大域: 整数型の配列: data ←")
      ? `大域: 整数型の配列: data ← {${sourceData.join(", ")}}`
      : line
  );

  return {
    bodyText: "次の手続 sort は，大域の整数型の配列 data の，引数 first で与えられた要素番号から引数 last で与えられた要素番号までの要素を昇順に整列する。ここで，first < last とする。手続 sort を sort(1, 5) として呼び出すと，/*** α ***/ の行を最初に実行したときの出力は「【　】」となる。",
    pseudoCode,
    choices: baseQuestion.choices,
    correctChoiceId,
    anotherTraceLines: [
      `初期data = {${sourceData.join(", ")}}`,
      `while(true) の反復回数 = ${loopCount}`,
      `/*** α ***/ 最初の出力 = ${answerText}`
    ]
  };
}

function toFullWidthCommaJoined(values: number[]): string {
  return values.join("，");
}

/** 問44: 二次元配列 matrix[i,j]（1始まり）の値 */
function generateQ44MatrixAccess(_baseQuestion: Question): GeneratedQuestionPatch {
  const flat = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const matrix = [
    [flat[0], flat[1], flat[2]],
    [flat[3], flat[4], flat[5]],
    [flat[6], flat[7], flat[8]]
  ];
  const row = randomInt(1, 3);
  const col = randomInt(1, 3);
  const correctValue = matrix[row - 1][col - 1];
  const wrongPool = flat.filter((v) => v !== correctValue);
  const wrongPicked = shuffle(wrongPool).slice(0, 4);
  const choiceValues = shuffle([correctValue, ...wrongPicked]);
  const choices: Choice[] = choiceValues.map((value, index) => ({
    id: CHOICE_IDS[index],
    text: String(value)
  }));
  const correctIndex = choiceValues.findIndex((v) => v === correctValue);
  const correctChoiceId = CHOICE_IDS[correctIndex] ?? "a";
  const literal = matrixToQ44Literal(matrix);

  return {
    bodyText: "次のプログラムを実行したとき出力される値は【　】である。",
    pseudoCode: [
      "整数型の二次元配列: matrix",
      `matrix ← ${literal}`,
      `matrix[${row},${col}] の値を出力する`
    ],
    choices,
    correctChoiceId,
    anotherTraceLines: [`matrix = ${literal}`, `matrix[${row}，${col}]（${row}行${col}列目）→ ${correctValue}`]
  };
}

function createQ44MatrixFromValues(values: number[]): number[][] {
  return [
    [values[0], 0, 0, 0, 0],
    [0, values[1], values[2], 0, 0],
    [0, 0, 0, values[3], values[4]],
    [0, 0, 0, values[5], 0],
    [0, 0, 0, 0, values[6]]
  ];
}

function matrixToQ44Literal(matrix: number[][]): string {
  const rows = matrix.map((row) => `{${toFullWidthCommaJoined(row)}}`);
  return `{${rows.join("，")}}`;
}

function valuesToQ44ChoiceText(values: number[]): string {
  return `a={1，2，2，3，3，4，5}, b={1，2，3，4，5，4，5}, c={${toFullWidthCommaJoined(values)}}`;
}

function generateQ45Sparse(_baseQuestion: Question): GeneratedQuestionPatch {
  // 非0要素数は7個のまま、1/2/3 の出現位置だけ変える
  const bag = [1, 1, 2, 2, 2, 3, 3];
  let correctValues: number[] = [...bag];

  const original = [2, 3, 1, 2, 1, 3, 2];
  do {
    correctValues = shuffle([...bag]);
  } while (correctValues.every((v, i) => v === original[i]));

  const matrixLiteral = matrixToQ44Literal(createQ44MatrixFromValues(correctValues));

  const candidates = new Set<string>();
  candidates.add(correctValues.join(","));
  while (candidates.size < 4) {
    const candidate = shuffle([...bag]);
    const key = candidate.join(",");
    if (key !== correctValues.join(",")) candidates.add(key);
  }

  const ordered = shuffle(Array.from(candidates));
  const choices: Choice[] = CHOICE_IDS.slice(0, 4).map((id, index) => {
    const values = ordered[index].split(",").map(Number);
    return {
      id,
      text: valuesToQ44ChoiceText(values)
    };
  });

  const correctIndex = ordered.findIndex((value) => value === correctValues.join(","));
  const correctChoiceId = CHOICE_IDS[correctIndex] ?? "a";

  return {
    bodyText: `要素の多くが 0 の行列を疎行列という。次のプログラムは，二次元配列に格納された行列のデータ量を削減するために，疎行列の格納に適したデータ構造に変換する。関数 transformSparseMatrix は，引数 matrix で二次元配列として与えられた行列を，整数型配列の配列に変換して返す。関数 transformSparseMatrix を transformSparseMatrix(${matrixLiteral}) として呼び出したときの戻り値は，{{【 a 】}，{【 b 】}，{【 c 】}} である。`,
    choices,
    correctChoiceId,
    anotherTraceLines: [
      `matrix = ${matrixLiteral}`,
      `a(行番号) = {1，2，2，3，3，4，5}`,
      `b(列番号) = {1，2，3，4，5，4，5}`,
      `c(値) = {${toFullWidthCommaJoined(correctValues)}}`
    ]
  };
}

function generateQ58(baseQuestion: Question): GeneratedQuestionPatch {
  let mode = randomInt(0, 1) as 0 | 1; // 0:イ(前順), 1:エ(後順)
  if (lastQ58Mode !== null && mode === lastQ58Mode) {
    mode = (1 - mode) as 0 | 1;
  }
  lastQ58Mode = mode;
  const src = baseQuestion.pseudoCode ?? [];
  let pseudoCode = [...src];

  if (mode === 0) {
    // イ: 前順（根→左→右）
    pseudoCode = src.map((line, index, arr) => {
      // 2子: left, n, right -> n, left, right
      if (line === "    order(tree[n][1])" && arr[index + 1] === "    n を出力" && arr[index + 2] === "    order(tree[n][2])") {
        return "    n を出力";
      }
      if (line === "    n を出力" && arr[index - 1] === "    order(tree[n][1])" && arr[index + 1] === "    order(tree[n][2])") {
        return "    order(tree[n][1])";
      }
      // 1子: left, n -> n, left
      if (line === "    order(tree[n][1])" && arr[index + 1] === "    n を出力" && arr[index - 1]?.includes("要素数 が 1")) {
        return "    n を出力";
      }
      if (line === "    n を出力" && arr[index - 1] === "    order(tree[n][1])" && arr[index - 2]?.includes("要素数 が 1")) {
        return "    order(tree[n][1])";
      }
      return line;
    });
    return {
      pseudoCode,
      choices: baseQuestion.choices,
      correctChoiceId: "b",
      anotherTraceLines: ["走査順を前順（preorder: 根→左→右）に変更", "正解はイ"]
    };
  }

  // エ: 後順（左→右→根）
  pseudoCode = src.map((line, index, arr) => {
    if (line === "    n を出力" && arr[index - 1] === "    order(tree[n][1])" && arr[index + 1] === "    order(tree[n][2])") {
      return "    order(tree[n][2])";
    }
    if (line === "    order(tree[n][2])" && arr[index - 1] === "    n を出力" && arr[index - 2] === "    order(tree[n][1])") {
      return "    n を出力";
    }
    return line;
  });
  return {
    pseudoCode,
    choices: baseQuestion.choices,
    correctChoiceId: "d",
    anotherTraceLines: ["走査順を後順（postorder: 左→右→根）に変更", "正解はエ"]
  };
}

function randomBits8(): string {
  return Array.from({ length: 8 }, () => (randomInt(0, 1) ? "1" : "0")).join("");
}

/** 0: 上位 n ビットを右詰め、1: 下位 n ビットを右詰め、2: 固定例（00001101→11010000）正解は << 4 か ×16 をランダム（同値のため同時出題しない） */
function generateQ60(_baseQuestion: Question): GeneratedQuestionPatch {
  let mode = randomInt(0, 2) as 0 | 1 | 2;
  if (lastQ60Mode !== null && mode === lastQ60Mode) {
    const alts = ([0, 1, 2] as const).filter((m) => m !== lastQ60Mode);
    mode = alts[randomInt(0, alts.length - 1)]!;
  }
  lastQ60Mode = mode;

  const operatorNote =
    "なお､演算子 >> は論理右シフト，演算子 << は論理左シフトを表す。例えば，value >> n は value の値を n ビットだけ右に論理シフトし，value << n は value の値を n ビットだけ左に論理シフトする。";
  const divisionNote =
    "ここで､除算の余り､商を取得する際は､ビットを2進数とみなして整数に変換した上で計算を行い､2進数変換して再度ビットに戻すものとする｡";

  function buildQ60Body(questionLine: string): string {
    return `${questionLine}\n\n${operatorNote}\n\n${divisionNote}`;
  }

  if (mode === 0) {
    const bits = randomBits8();
    const n = randomInt(2, 6);
    const k = 8 - n;
    const byteVal = parseInt(bits, 2);
    const upperPacked = toBin8Byte(byteVal >> k);
    const upperBitsStr = bits.slice(0, n);
    const pow2k = 1 << k;
    const questionLine = `${bits} から上位${n}ビットを取り出し，右詰めにして ${upperPacked} とするには【　】を行う。`;
    const bodyText = buildQ60Body(questionLine);
    const wrongShift = `<< ${k}`;
    const wrongMod = `÷${pow2k}の余りを取得`;
    const useShiftAsCorrect = randomInt(0, 1) === 1;
    const quotientSymbolic = randomInt(0, 1) === 1;
    const correctText = useShiftAsCorrect
      ? `>> ${k}`
      : quotientSymbolic
        ? `÷(2の${k}乗)の商を取得`
        : `÷${pow2k}の商を取得`;
    const { choices, correctChoiceId } = shuffleThreeChoices(correctText, wrongShift, wrongMod);
    const traceSuffix = useShiftAsCorrect
      ? [`正解: >> ${k}`]
      : [
          `2の${k}乗 = ${pow2k}`,
          quotientSymbolic ? `正解: ÷(2の${k}乗)の商` : `正解: ÷${pow2k}の商`
        ];
    return {
      bodyText,
      choices,
      correctChoiceId,
      anotherTraceLines: [
        `モード: 上位${n}ビットを右詰め（<<・余り・>> か ÷商 のいずれか1つ）`,
        `ビット列 = ${bits}`,
        `上位${n}ビット = ${upperBitsStr} → 右詰め8bit = ${upperPacked}`,
        ...traceSuffix
      ]
    };
  }

  if (mode === 1) {
    const bits = randomBits8();
    const n = randomInt(2, 6);
    const k = 8 - n;
    const byteVal = parseInt(bits, 2);
    const lowerBitsStr = bits.slice(8 - n);
    const lowerPacked = toBin8Byte(byteVal & ((1 << n) - 1));
    const pow2n = 1 << n;
    const questionLine = `${bits} から下位${n}ビットを取得して ${lowerPacked} とするには【　】を行う。`;
    const bodyText = buildQ60Body(questionLine);
    const lower = shuffleThreeChoices(`÷${pow2n}の余りを取得`, `>> ${k}`, `<< ${k}`);
    return {
      bodyText,
      choices: lower.choices,
      correctChoiceId: lower.correctChoiceId,
      anotherTraceLines: [
        `モード: 下位${n}ビットを右詰め`,
        `ビット列 = ${bits}`,
        `下位${n}ビット = ${lowerBitsStr} → 右詰め8bit = ${lowerPacked}`,
        `正解: ÷${pow2n}の余り（mod ${pow2n}）`
      ]
    };
  }

  const questionLineShift = `00001101 を 11010000 にするには【　】を行う。`;
  const bodyTextShift = buildQ60Body(questionLineShift);
  const useMultiplyAsCorrect = randomInt(0, 1) === 1;
  if (useMultiplyAsCorrect) {
    const mulPat = shuffleThreeChoices(`×16`, `>> 4`, `÷16の余りを取得`);
    return {
      bodyText: bodyTextShift,
      choices: mulPat.choices,
      correctChoiceId: mulPat.correctChoiceId,
      anotherTraceLines: ["モード: ×16（<< 4 と同値のため片方のみ出題）", "正解: ×16"]
    };
  }
  const shiftPat = shuffleThreeChoices(`<< 4`, `>> 4`, `÷16の余りを取得`);
  return {
    bodyText: bodyTextShift,
    choices: shiftPat.choices,
    correctChoiceId: shiftPat.correctChoiceId,
    anotherTraceLines: ["モード: << 4（×16 と同値のため片方のみ出題）", "正解: << 4"]
  };
}

/** A: 下位 n ビット（正解 byte ∧ 下位マスク）、B: 上位 n ビットを右詰め（正解 byte >> (8−n)） */
function generateQ61(_baseQuestion: Question): GeneratedQuestionPatch {
  let mode = randomInt(0, 1) as 0 | 1;
  if (lastQ61Mode !== null && mode === lastQ61Mode) {
    mode = (1 - mode) as 0 | 1;
  }
  lastQ61Mode = mode;

  const n = randomInt(2, 6);
  const k = 8 - n;
  const maskLower = (1 << n) - 1;
  const maskUpper = (maskLower << k) & 0xff;
  const maskLowerBin = toBin8Byte(maskLower);
  const maskUpperBin = toBin8Byte(maskUpper);

  const intro =
    "なお，演算子 ∧ はビット単位の論理積，演算子 ∨ はビット単位の論理和，演算子 >> は論理右シフト，演算子 << は論理左シフトを表す。例えば，value >> n は value の値を n ビットだけ右に論理シフトし，value << n は value の値を n ビットだけ左に論理シフトする。";

  const pseudoLower = [
    "○ 8ビット型: getLowerBits(8ビット型: byte)",
    "    8ビット型: r ← 00000000",
    "        【　】",
    "    return r"
  ];
  const pseudoUpperPacked = [
    "○ 8ビット型: getUpperBitsPacked(8ビット型: byte)",
    "    8ビット型: r ← 00000000",
    "        【　】",
    "    return r"
  ];

  if (mode === 0) {
    let byteVal = 0;
    let resultVal = 0;
    do {
      byteVal = randomInt(1, 254);
      resultVal = byteVal & maskLower;
    } while (resultVal === 0 || resultVal === byteVal);
    const byteBin = toBin8Byte(byteVal);
    const resultBin = toBin8Byte(resultVal);
    const bodyText = `関数 getLowerBits は 8 ビット型の引数 byte を受け取り，下位${n}ビットを返す。例えば，getLowerBits(${byteBin}) の戻り値は ${resultBin} となる。\n\n${intro}`;

    const correct = `r ← (byte ∧ ${maskLowerBin})`;
    // 誤答に >> は入れない（誤答が別解に見えるのを防ぐ）
    const four = shuffleFourChoices(
      correct,
      `r ← (byte ∨ ${maskLowerBin})`,
      `r ← (byte ∧ ${maskUpperBin})`,
      `r ← (byte << ${k})`
    );
    return {
      bodyText,
      pseudoCode: pseudoLower,
      choices: four.choices,
      correctChoiceId: four.correctChoiceId,
      anotherTraceLines: [
        `パターンA: 下位${n}ビット`,
        `マスク（下位n桁が1）= ${maskLowerBin}`,
        `例: ${byteBin} → ${resultBin}`,
        `正解: ${correct}`
      ]
    };
  }

  let byteVal = 0;
  let resultVal = 0;
  do {
    byteVal = randomInt(1, 254);
    resultVal = (byteVal >> k) & maskLower;
  } while (
    resultVal === 0 ||
    resultVal === (byteVal & maskLower) ||
    resultVal === (byteVal & maskUpper) ||
    resultVal === ((byteVal << k) & 0xff)
  );
  const byteBin = toBin8Byte(byteVal);
  const resultBin = toBin8Byte(resultVal);
  const bodyText = `関数 getUpperBitsPacked は 8 ビット型の引数 byte を受け取り，上位${n}ビットを取り出し，右詰めにして返す。例えば，getUpperBitsPacked(${byteBin}) の戻り値は ${resultBin} となる。\n\n${intro}`;

  const correct = `r ← (byte >> ${k})`;
  const four = shuffleFourChoices(
    correct,
    `r ← (byte ∧ ${maskUpperBin})`,
    `r ← (byte ∧ ${maskLowerBin})`,
    `r ← (byte ∨ ${maskUpperBin})`,
    `r ← (byte << ${k})`
  );
  return {
    bodyText,
    pseudoCode: pseudoUpperPacked,
    choices: four.choices,
    correctChoiceId: four.correctChoiceId,
    anotherTraceLines: [
      `パターンB: 上位${n}ビットを右詰め`,
      `シフト量 8−${n} = ${k}`,
      `例: ${byteBin} → ${resultBin}`,
      `正解: ${correct}`
    ]
  };
}

/** 値を変えてもう一度: 初期 stack / stackPos をランダム化。正解は a=stackPos+1, b=未定義の値(後ろの方) */
function generateQ70(_baseQuestion: Question): GeneratedQuestionPatch {
  let mode = randomInt(0, 1) as 0 | 1; // 0: 既存（代入穴埋め）, 1: if 条件穴埋め
  if (lastQ70Mode !== null && mode === lastQ70Mode) {
    mode = (1 - mode) as 0 | 1;
  }
  lastQ70Mode = mode;

  const stackPos = randomInt(2, 4);
  const vals = Array.from({ length: Math.max(0, stackPos - 1) }, () => randomInt(1, 9));
  const stackLiteralParts: string[] = [];
  for (let j = 1; j <= 4; j += 1) {
    if (j < stackPos) stackLiteralParts.push(String(vals[j - 1] ?? ""));
    else stackLiteralParts.push("未定義の値");
  }

  const stackRow: BodyTableCell[] = ["stack"];
  for (let j = 1; j <= 4; j += 1) {
    if (j < stackPos) {
      stackRow.push(String(vals[j - 1] ?? ""));
    } else {
      stackRow.push({ text: "", shaded: true });
    }
  }

  const arrowColIndex = Math.min(stackPos, 4);
  const arrowRow: BodyTableCell[] = ["", "", "", "", ""].map((_, i) => {
    if (i === arrowColIndex) {
      return { text: "↑\nstackPos", align: "center" as const };
    }
    return "";
  });

  const bodyBlocks: BodyBlock[] = [
    {
      type: "text",
      text: "関数 push は，引数で与えられた整数をスタックに格納する。格納できる場合は true を返し，格納できなかった場合は false を返す。"
    },
    {
      type: "text",
      text: "関数 pop は，スタックから値を取り出して返す。スタックが空のときは未定義の値を返す。"
    },
    {
      type: "text",
      text: "スタックを，要素数が 4 である大域の整数型の配列 stack，及び次に値を格納する位置を示す大域の変数 stackPos で表現する。スタックの初期状態を図に示す。プログラムでは，配列の領域外を参照してはならないものとする。"
    },
    {
      type: "table",
      equalDataColumnWidths: true,
      caption: "図　スタックの初期状態",
      headers: ["要素番号", "1", "2", "3", "4"],
      rows: [stackRow, arrowRow]
    },
    {
      type: "text",
      text: "注記　網掛けはその要素が未定義であることを示す。"
    }
  ];

  if (mode === 1) {
    const globals: string[] = [
      `大域：整数型：stackPos ← ${stackPos}`,
      `大域：整数型の配列：stack ← {${stackLiteralParts.join(", ")}}`
    ];
    const pseudoCode = [
      ...globals,
      "",
      "○ 論理型：push(整数型：inputData)",
      "    if (【 a 】)",
      "        stack[stackPos] ← inputData",
      "        stackPos ← stackPos + 1",
      "        return true",
      "    else",
      "        return false",
      "    endif",
      "",
      "○ 整数型：pop()",
      "    整数型：popData ← 未定義の値",
      "    if (【 b 】)",
      "        stackPos ← stackPos − 1",
      "        popData ← stack[stackPos]",
      "        stack[stackPos] ← 未定義の値",
      "    endif",
      "    return popData"
    ];

    const combos = shuffle([
      { a: "stackPos ≤ stack の要素数", b: "stackPos > 1", correct: true as boolean },
      { a: "stackPos < stack の要素数", b: "stackPos > 1", correct: false },
      { a: "stackPos ≤ stack の要素数", b: "stackPos ≥ 1", correct: false },
      { a: "stackPos < stack の要素数", b: "stackPos ≥ 1", correct: false }
    ]);
    const choices: Choice[] = combos.map((c, index) => ({
      id: CHOICE_IDS[index] ?? "a",
      text: `a=${c.a}, b=${c.b}`
    }));
    const correctChoiceId = CHOICE_IDS[combos.findIndex((c) => c.correct)] ?? "a";

    return {
      bodyBlocks,
      pseudoCode,
      choices,
      correctChoiceId,
      choiceTable: {
        headers: ["a", "b"],
        rows: combos.map((c) => [c.a, c.b])
      },
      anotherTraceLines: [
        `初期: stackPos ← ${stackPos}`,
        `stack ← {${stackLiteralParts.join(", ")}}`,
        "パターン: if条件穴埋め",
        "正解: a は stackPos ≤ stack の要素数, b は stackPos > 1"
      ]
    };
  }

  /** 常に push→pop の順。
   * pushPattern 0:【a】は添字 stack【 a 】 / pushPattern 1:【a】は stackPos ← 【 a 】（正解 a=stackPos + 1）
   * holeLayout 0:【b】は stackPos 行 / 1:【b】は stack[stackPos] 代入行 */
  const pushPattern = randomInt(0, 1);
  const holeLayout = randomInt(0, 1);

  const globals: string[] = [
    `大域：整数型：stackPos ← ${stackPos}`,
    `大域：整数型の配列：stack ← {${stackLiteralParts.join(", ")}}`
  ];

  const pushBlockIndexA = [
    "○ 論理型：push(整数型：inputData)",
    "    if (stackPos ≤ stack の要素数)",
    "        stack[ 【 a 】 ] ← inputData",
    "        stackPos ← stackPos + 1",
    "        return true",
    "    else",
    "        return false",
    "    endif"
  ];

  const pushBlockStackPosA = [
    "○ 論理型：push(整数型：inputData)",
    "    if (stackPos ≤ stack の要素数)",
    "        stack[stackPos] ← inputData",
    "        stackPos ← 【 a 】",
    "        return true",
    "    else",
    "        return false",
    "    endif"
  ];

  const popBlockStandard = [
    "○ 整数型：pop()",
    "    整数型：popData ← 未定義の値",
    "    if (stackPos > 1)",
    "        stackPos ← 【 b 】",
    "        popData ← stack[stackPos]",
    "        stack[stackPos] ← 未定義の値",
    "    endif",
    "    return popData"
  ];

  const popBlockBLast = [
    "○ 整数型：pop()",
    "    整数型：popData ← 未定義の値",
    "    if (stackPos > 1)",
    "        stackPos ← stackPos − 1",
    "        popData ← stack[stackPos]",
    "        stack[stackPos] ← 【 b 】",
    "    endif",
    "    return popData"
  ];

  const pushBlock = pushPattern === 0 ? pushBlockIndexA : pushBlockStackPosA;
  const pseudoCode =
    holeLayout === 0
      ? [...globals, "", ...pushBlock, "", ...popBlockStandard]
      : [...globals, "", ...pushBlock, "", ...popBlockBLast];

  const combos = shuffle([
    { a: "stackPos + 1", b: "未定義の値", correct: true as boolean },
    { a: "stackPos", b: "stackPos − 1", correct: false },
    { a: "stackPos", b: "stackPos + 1", correct: false },
    { a: "stackPos − 1", b: "stackPos − 1", correct: false }
  ]);
  const choices: Choice[] = combos.map((c, index) => ({
    id: CHOICE_IDS[index] ?? "a",
    text: `a=${c.a}, b=${c.b}`
  }));
  const correctChoiceId = CHOICE_IDS[combos.findIndex((c) => c.correct)] ?? "a";
  const choiceTable = {
    headers: ["a", "b"],
    rows: combos.map((c) => [c.a, c.b])
  };

  const layoutLabelA =
    pushPattern === 0 ? "【a】は stack【 a 】（添字）" : "【a】は stackPos ← 【 a 】（右辺＝stackPos + 1）";
  const layoutLabelB = holeLayout === 0 ? "【b】は stackPos 行" : "【b】は stack[stackPos] 代入行";

  return {
    bodyBlocks,
    pseudoCode,
    choices,
    correctChoiceId,
    choiceTable,
    anotherTraceLines: [
      `初期: stackPos ← ${stackPos}`,
      `stack ← {${stackLiteralParts.join(", ")}}`,
      `穴の配置: ${layoutLabelA} / ${layoutLabelB}`,
      "正解: a は stackPos + 1, b は 未定義の値(後ろの方)"
    ]
  };
}

/** q71「値を変えてもう一度」: 図・初期値はベースのまま。a は tail/head、b は 等しい/等しくない（4択）。 */
function generateQ71(_baseQuestion: Question): GeneratedQuestionPatch {
  const globals: string[] = [
    "大域：整数型：tail ← 5",
    "大域：整数型：head ← 3",
    "大域：整数型の配列：queue ← {未定義の値, 未定義の値, 3, 4, 未定義の値, 未定義の値}"
  ];

  const pseudoCode = [
    ...globals,
    "",
    "○ 論理型：enqueue(整数型：inputData)",
    "    if (【 a 】 > queue の要素数)",
    "        return false",
    "    else",
    "        queue[tail] ← inputData",
    "        tail ← tail + 1",
    "        return true",
    "    endif",
    "",
    "○ 整数型：dequeue()",
    "    整数型：deqData ← 未定義の値",
    "    if (head と tail が【 b 】)",
    "",
    "    else",
    "        deqData ← queue[head]",
    "        queue[head] ← 未定義の値",
    "        head ← head + 1",
    "    endif",
    "    return deqData"
  ];

  const combos = [
    { a: "tail", b: "等しい" },
    { a: "tail", b: "等しくない" },
    { a: "head", b: "等しい" },
    { a: "head", b: "等しくない" }
  ];
  const choices: Choice[] = combos.map((c, index) => ({
    id: CHOICE_IDS[index] ?? "a",
    text: `a=${c.a}, b=${c.b}`
  }));
  const correctChoiceId = "a";

  return {
    pseudoCode,
    choices,
    correctChoiceId,
    choiceTable: {
      headers: ["a", "b"],
      rows: combos.map((c) => [c.a, c.b])
    },
    anotherTraceLines: ["正解: a は tail、b は 等しい（空キューのとき）"]
  };
}

const Q76_CHAINS = [
  ["公園", "図書館", "学校"],
  ["A", "B", "C"],
  ["北", "東", "南"],
  ["1", "2", "3"]
];

function formatListLiteral(vals: string[]): string {
  return `{${vals.join(", ")}}`;
}

function q76InitialStateRows(chain: [string, string, string]): BodyTableCell[][] {
  return [
    ["val", `"${chain[0]}"`, "", `"${chain[1]}"`, "", `"${chain[2]}"`],
    [
      "next",
      `${chain[1]}のインスタンスを参照`,
      "",
      `${chain[2]}のインスタンスを参照`,
      "",
      "未定義"
    ],
    [
      "listHeadの参照先",
      { text: "↑", align: "center" as const },
      "",
      "",
      "",
      ""
    ]
  ];
}

/** q76「値を変えてもう一度」: 3 要素の単方向リスト（クラス）の val を別セットに差し替え */
function generateQ76(baseQuestion: Question): GeneratedQuestionPatch {
  const chain = Q76_CHAINS[randomInt(0, Q76_CHAINS.length - 1)] as [string, string, string];
  const correctText = formatListLiteral(chain);
  const wrongTexts = [
    formatListLiteral([chain[0], chain[2], chain[1]]),
    formatListLiteral([chain[2], chain[0], chain[1]]),
    formatListLiteral([chain[2], chain[1], chain[0]])
  ];
  const { choices, correctChoiceId } = shuffleFourChoices(
    correctText,
    wrongTexts[0],
    wrongTexts[1],
    wrongTexts[2]
  );

  const bodyBlocks = baseQuestion.bodyBlocks?.map((block) => {
    if (block.type === "table" && block.caption === "初期状態") {
      return {
        ...block,
        rows: q76InitialStateRows(chain)
      };
    }
    return block;
  });

  return {
    bodyBlocks,
    choices,
    correctChoiceId,
    anotherTraceLines: [
      `listHead からの順: ${chain.join(" → ")}`,
      `戻り値 out = ${correctText}`
    ]
  };
}

/** q81「値を変えてもう一度」: func(24, 30) または func(24, 128)（後者は 128,24 の入れ替え）。どちらも mod 行は 3 回（イ／b） */
function generateQ86(_baseQuestion: Question): GeneratedQuestionPatch {
  const swapped = randomInt(0, 1) === 1;
  if (!swapped) {
    return {
      bodyText:
        "関数 func は，2つの正の整数 a, b を引数として受け取り，それらの最大公約数を返す関数である｡関数 func(24, 30) を実行したとき，/*** α ***/ の行の処理が実行される回数は【　】回である。",
      correctChoiceId: "b",
      anotherTraceLines: [
        "func(24, 30)：p, q でトレース",
        "(p, q) = (24, 30) → temp = 24 mod 30 = 24",
        "(p, q) = (30, 24) → temp = 30 mod 24 = 6",
        "(p, q) = (24, 6) → temp = 24 mod 6 = 0",
        "/*** α ***/ の実行回数 = 3（イ）"
      ]
    };
  }
  return {
    bodyText:
      "関数 func は，2つの正の整数 a, b を引数として受け取り，それらの最大公約数を返す関数である｡関数 func(24, 128) を実行したとき，/*** α ***/ の行の処理が実行される回数は【　】回である。",
    correctChoiceId: "b",
    anotherTraceLines: [
      "func(24, 128)（128, 24 を入れ替え）：p, q でトレース",
      "(p, q) = (24, 128) → temp = 24 mod 128 = 24",
      "(p, q) = (128, 24) → temp = 128 mod 24 = 8",
      "(p, q) = (24, 8) → temp = 24 mod 8 = 0",
      "/*** α ***/ の実行回数 = 3（イ）"
    ]
  };
}

/** 問42(R4(12)問14): 丸め方と要素数を変えて出題する。
 *  ① 小数点以下を「切り上げ」/「切り捨て」  ② sortedData の要素数(6/8/10)
 *  要素数が4や5だと p×(要素数−1) が割り切れて丸めが起きないので使わない。 */
let lastQ42Key: string | null = null;

function q42Format(v: number): string {
  return v === 1 ? "1" : v.toFixed(1);
}

/** p = 0, 0.25, 0.5, 0.75, 1 を「4分の1」の整数比で扱い、誤差なしで丸める */
function q42Ranks(span: number, roundUp: boolean): number[] {
  return [0, 1, 2, 3, 4].map((num) => {
    const total = num * span;
    const q = Math.floor(total / 4);
    return roundUp && total % 4 !== 0 ? q + 1 : q;
  });
}

/** ranks(=i) から戻り値の配列表記を作る。offset=1 が本来の sortedData[i + 1] */
function q42Answer(n: number, ranks: number[], offset: number): string {
  const values = ranks.map((i) => q42Format(Math.min(Math.max(i + offset, 1), n) / 10));
  return `{${values.join(", ")}}`;
}

/** 要素番号が端で頭打ちして同じ値が並ぶか（誤答としては不自然なので優先度を下げる） */
function q42HasDuplicate(n: number, ranks: number[], offset: number): boolean {
  const idx = ranks.map((i) => Math.min(Math.max(i + offset, 1), n));
  return new Set(idx).size !== idx.length;
}

function generateQ42(baseQuestion: Question): GeneratedQuestionPatch {
  let n = 10;
  let roundUp = true;
  do {
    n = [6, 8, 10][randomInt(0, 2)];
    roundUp = randomInt(0, 1) === 1;
  } while (`${n}-${roundUp}` === lastQ42Key);
  lastQ42Key = `${n}-${roundUp}`;

  const ranks = q42Ranks(n - 1, roundUp);
  const correct = q42Answer(n, ranks, 1);

  // 誤答は実際にやりがちな取り違えから作る。
  // 端で頭打ちして同じ値が並んだものは見た目で浮くので、後回しにする。
  const candidates: { ranks: number[]; offset: number }[] = [
    { ranks: q42Ranks(n - 1, !roundUp), offset: 1 },  // 丸め方が逆
    { ranks, offset: 0 },                             // sortedData[i + 1] の +1 を忘れた
    { ranks: q42Ranks(n, roundUp), offset: 1 },       // 要素数 − 1 の −1 を忘れた
    { ranks: q42Ranks(n - 1, !roundUp), offset: 0 },  // 丸めも +1 も取り違えた
    { ranks, offset: 2 },                             // 1つ後ろへずれた
    { ranks: ranks.map((i) => i - 1), offset: 1 }     // 1つ前へずれた
  ];
  const clean: string[] = [];
  const clamped: string[] = [];
  candidates.forEach((c) => {
    const text = q42Answer(n, c.ranks, c.offset);
    if (text === correct || clean.includes(text) || clamped.includes(text)) return;
    (q42HasDuplicate(n, c.ranks, c.offset) ? clamped : clean).push(text);
  });
  const wrongs = [...clean, ...clamped];

  const { choices, correctChoiceId } = shuffleFourChoices(correct, wrongs[0], wrongs[1], wrongs[2]);
  const data = Array.from({ length: n }, (_, k) => q42Format((k + 1) / 10));
  const roundLabel = roundUp ? "切り上げた" : "切り捨てた";

  return {
    bodyText: `要素数が 1 以上で，昇順に整列済みの配列を基に，配列を特徴づける五つの値を返すプログラムである。関数 summarize を summarize({${data.join(", ")}}) として呼び出すと，戻り値は〔　　　〕である。`,
    pseudoCode: (baseQuestion.pseudoCode ?? []).map((line) =>
      line.replace("切り上げた値", `${roundLabel}値`)
    ),
    choices,
    correctChoiceId,
    anotherTraceLines: [
      `sortedData の要素数 = ${n}（要素数 − 1 = ${n - 1}）`,
      `小数点以下は${roundUp ? "切り上げ" : "切り捨て"}`,
      `i = ${ranks.join(", ")}  →  参照する要素番号 = ${ranks.map((i) => i + 1).join(", ")}`
    ]
  };
}

/** 問43(R5問4 mod): test() が add に渡す3つの値を変えて出題する。
 *  mode 0 … 3つとも格納できる（原問と同じ形）
 *  mode 1 … 1つが calcHash1 も calcHash2 も埋まっていて格納できず、配列に現れない
 *  どちらも「calcHash2 に救われる add」を最低1回含める。含まないと衝突の練習にならない。 */
const Q43_SIZE = 5;
const Q43_MINUS = "\u2212";
let lastQ43Mode: 0 | 1 | null = null;

type Q43Step = { value: number; first: number; second: number | null; stored: number | null };

function q43Hash1(value: number): number {
  return (value % Q43_SIZE) + 1;
}

function q43Hash2(value: number, offset: number): number {
  return ((value + offset) % Q43_SIZE) + 1;
}

/** 1回分の test() を回す。overwrite/offset を変えると誤答用の「間違った解き方」になる */
function q43Run(
  values: number[],
  opts: { overwrite?: boolean; offset?: number } = {}
): { slots: number[]; steps: Q43Step[]; rescued: number; failed: number } {
  const slots = new Array<number>(Q43_SIZE).fill(-1);
  const steps: Q43Step[] = [];
  let rescued = 0;
  let failed = 0;
  values.forEach((value) => {
    const first = q43Hash1(value);
    if (slots[first - 1] === -1) {
      slots[first - 1] = value;
      steps.push({ value, first, second: null, stored: first });
      return;
    }
    if (opts.overwrite) {
      slots[first - 1] = value;
      steps.push({ value, first, second: null, stored: first });
      return;
    }
    const second = q43Hash2(value, opts.offset ?? 3);
    if (slots[second - 1] === -1) {
      slots[second - 1] = value;
      rescued += 1;
      steps.push({ value, first, second, stored: second });
    } else {
      failed += 1;
      steps.push({ value, first, second, stored: null });
    }
  });
  return { slots, steps, rescued, failed };
}

function q43Format(slots: number[]): string {
  return `{${slots.map((v) => (v === -1 ? `${Q43_MINUS}1` : String(v))).join(", ")}}`;
}

function q43TraceLine(step: Q43Step): string {
  const head = `add(${step.value}): calcHash1 → 要素番号${step.first}`;
  if (step.second === null) return `${head} が空き → ${step.value} を格納`;
  if (step.stored === null) {
    return `${head} は使用中 → calcHash2 → 要素番号${step.second} も使用中 → 格納できず false`;
  }
  return `${head} は使用中 → calcHash2 → 要素番号${step.second} が空き → ${step.value} を格納`;
}

function generateQ43(baseQuestion: Question): GeneratedQuestionPatch {
  const mode: 0 | 1 = lastQ43Mode === 0 ? 1 : lastQ43Mode === 1 ? 0 : (randomInt(0, 1) as 0 | 1);
  lastQ43Mode = mode;

  let values: number[] = [];
  let result = q43Run([]);
  let wrongs: string[] = [];
  for (let attempt = 0; attempt < 400; attempt += 1) {
    values = [randomInt(2, 30), randomInt(2, 30), randomInt(2, 30)];
    if (new Set(values).size < 3) continue;
    // 2桁を2つ以上入れる。1桁ばかりだと mod の計算が自明になってしまう
    if (values.filter((v) => v >= 10).length < 2) continue;
    result = q43Run(values);
    if (result.rescued < 1) continue;                       // 衝突なしはただの代入練習
    if (mode === 0 ? result.failed !== 0 : result.failed !== 1) continue;

    const correctText = q43Format(result.slots);
    const shifted = [...result.slots.slice(1), result.slots[0]];  // 要素番号が1つずれた
    const candidates = [
      q43Format(shifted),
      q43Format(q43Run(values, { overwrite: true }).slots),        // 衝突しても上書きした
      q43Format(q43Run([...values].reverse()).slots),              // 呼び出し順を取り違えた
      q43Format(q43Run(values, { offset: Q43_SIZE - 3 }).slots)    // calcHash2 の +3 を −3 と読んだ
    ];
    wrongs = [];
    candidates.forEach((text) => {
      if (text !== correctText && !wrongs.includes(text)) wrongs.push(text);
    });
    if (wrongs.length >= 4) break;
  }

  // 抽選が続けて外れたとき用の保険（条件を満たすことを確認済みの組）
  if (wrongs.length < 4) {
    values = mode === 0 ? [9, 23, 19] : [11, 21, 6];
    result = q43Run(values);
    const fallbackText = q43Format(result.slots);
    const shifted = [...result.slots.slice(1), result.slots[0]];
    wrongs = [];
    [
      q43Format(shifted),
      q43Format(q43Run(values, { overwrite: true }).slots),
      q43Format(q43Run([...values].reverse()).slots),
      q43Format(q43Run(values, { offset: Q43_SIZE - 3 }).slots)
    ].forEach((text) => {
      if (text !== fallbackText && !wrongs.includes(text)) wrongs.push(text);
    });
  }

  const correctText = q43Format(result.slots);
  const items = shuffle([
    { text: correctText, correct: true },
    ...wrongs.slice(0, 4).map((text) => ({ text, correct: false }))
  ]);
  const choices: Choice[] = items.map((item, index) => ({
    id: CHOICE_IDS[index] ?? "a",
    text: item.text
  }));
  const correctChoiceId = CHOICE_IDS[items.findIndex((x) => x.correct)] ?? "a";

  let addIndex = 0;
  const pseudoCode = (baseQuestion.pseudoCode ?? []).map((line) => {
    const matched = line.match(/^(\s*)add\(\d+\)$/);
    if (!matched) return line;
    const value = values[addIndex] ?? 0;
    addIndex += 1;
    return `${matched[1]}add(${value})`;
  });

  return {
    pseudoCode,
    choices,
    correctChoiceId,
    anotherTraceLines: [
      `calcHash1(value) = (value mod ${Q43_SIZE}) + 1 ／ calcHash2(value) = ((value + 3) mod ${Q43_SIZE}) + 1`,
      ...result.steps.map(q43TraceLine)
    ]
  };
}

/** 問48(R4(04)問1 以上/以下): 境界の年齢と、穴埋めの位置を変えて出題する。
 *  mode 0 … 原問と同じく elseif が穴。直前の if で下限は済んでいる、が論点
 *  mode 1 … 最初の if が穴。引数が「0以上の整数」と保証されている、が論点
 *  料金(100/300/500)は変えない。トレースに影響せず、変えても練習にならないため。 */
let lastQ48Key: string | null = null;

/** 解答群は原問の並びを踏襲する（複合条件3つ → 単純条件4つ）。
 *  単純条件のほうだけ並びを入れ替え、正解の位置を覚えられないようにする。 */
function q48Choices(compound: string[], simple: string[], correctText: string) {
  const items = [...compound, ...shuffle(simple)];
  const choices: Choice[] = items.map((text, index) => ({
    id: CHOICE_IDS[index] ?? "a",
    text
  }));
  const correctChoiceId = CHOICE_IDS[items.indexOf(correctText)] ?? "a";
  return { choices, correctChoiceId };
}

function generateQ48(_baseQuestion: Question): GeneratedQuestionPatch {
  let b1 = 3;
  let b2 = 9;
  let mode: 0 | 1 = 0;
  do {
    b1 = randomInt(2, 5);                 // 第1区分の上限
    b2 = b1 + randomInt(3, 8);            // 第2区分の上限（区間が狭すぎないように）
    mode = randomInt(0, 1) as 0 | 1;
  } while (`${b1}-${b2}-${mode}` === lastQ48Key || (b1 === 3 && b2 === 9));
  lastQ48Key = `${b1}-${b2}-${mode}`;

  const bodyText =
    `ある施設の入場料は､0歳から${b1}歳までは100円､${b1 + 1}歳から${b2}歳までは300円､` +
    `${b2 + 1}歳以上は500円である。関数 fee は､年齢を表す0以上の整数を引数として受け取り､入場料を返す。`;

  const head = "○ 整数型: fee(整数型: age)";
  const blank = "【　　　　】";
  const pseudoCode =
    mode === 0
      ? [
          head, "  整数型: ret",
          `  if (age が ${b1} 以下)`, "    ret ← 100",
          `  elseif (${blank})`, "    ret ← 300",
          "  else", "    ret ← 500", "  endif", "  return ret"
        ]
      : [
          head, "  整数型: ret",
          `  if (${blank})`, "    ret ← 100",
          `  elseif (age が ${b2} 以下)`, "    ret ← 300",
          "  else", "    ret ← 500", "  endif", "  return ret"
        ];

  let compound: string[];
  let simple: string[];
  let correctText: string;
  let why: string;

  if (mode === 0) {
    const lo = b1 + 1;
    correctText = `age が ${b2} 以下`;
    compound = [
      `(age が ${lo} 以上) and (age が ${b2} より小さい)`,
      `(age が ${lo} と等しい) or (age が ${b2} と等しい)`,
      `(age が ${lo} より大きい) and (age が ${b2} 以下)`
    ];
    simple = [`age が ${lo} 以上`, `age が ${lo} より大きい`, correctText, `age が ${b2} より小さい`];
    why =
      `直前の if で ${b1} 以下は 100 円になっているので、elseif に来る時点で age は ${lo} 以上が確定している。` +
      `下限を書く必要はなく、上限の「${b2} 以下」だけでよい。`;
  } else {
    correctText = `age が ${b1} 以下`;
    compound = [
      `(age が 0 より大きい) and (age が ${b1} 以下)`,
      `(age が 0 と等しい) or (age が ${b1} と等しい)`,
      `(age が 0 以上) and (age が ${b1} より小さい)`
    ];
    simple = [correctText, `age が ${b1} より小さい`, `age が ${b1} と等しい`, `age が ${b1 + 1} 以下`];
    why =
      `age は「0以上の整数」と問題文で保証されているので、下限を書く必要はない。` +
      `0歳から${b1}歳までが 100 円なので「${b1} 以下」。${b1} も含むので「より小さい」は誤り。`;
  }

  const picked = q48Choices(compound, simple, correctText);
  return {
    bodyText,
    pseudoCode,
    choices: picked.choices,
    correctChoiceId: picked.correctChoiceId,
    anotherTraceLines: [
      `区分: 0〜${b1}歳=100円 ／ ${b1 + 1}〜${b2}歳=300円 ／ ${b2 + 1}歳以上=500円`,
      `穴埋めの位置: ${mode === 0 ? "elseif（2番目の分岐）" : "if（最初の分岐）"}`,
      `正解: ${correctText}`,
      why
    ]
  };
}

/** 問84(R4(04)問2 配列&繰り返し): 配列の中身と、swap の書き方の向きを変えて出題する。
 *  mode 0 … 原問と同じ tmp ← array[right] から始める形（【b】= array[left]）
 *  mode 1 … tmp ← array[left] から始める形（【b】= array[right]）
 *  解答群は原問のまま。同じ4択で正解だけが入れ替わるので、答えを覚えていると外す。 */
let lastQ84Key: string | null = null;

function generateQ84(baseQuestion: Question): GeneratedQuestionPatch {
  let n = 5;
  let mode: 0 | 1 = 0;
  do {
    n = randomInt(5, 7);
    mode = randomInt(0, 1) as 0 | 1;
  } while (`${n}-${mode}` === lastQ84Key);
  lastQ84Key = `${n}-${mode}`;

  // 入れ替わったことが目で見て分かるよう、重複しない値を散らす
  const values: number[] = [];
  while (values.length < n) {
    const v = randomInt(1, 30);
    if (!values.includes(v)) values.push(v);
  }
  const reversed = [...values].reverse();
  const loops = Math.floor(n / 2);

  const swapLines =
    mode === 0
      ? ["  tmp ← array[right]", "  array[right] ← array[left]", "  【 b 】 ← tmp"]
      : ["  tmp ← array[left]", "  array[left] ← array[right]", "  【 b 】 ← tmp"];

  const pseudoCode = [
    `整数型の配列：array ← {${values.join(", ")}}`,
    "整数型：right, left",
    "整数型：tmp",
    "",
    "for（left を 1 から（array の要素数 ÷ 2 の商）まで 1 ずつ増やす）",
    "  right ← 【 a 】",
    ...swapLines,
    "endfor"
  ];

  // a=要素数−left+1 は共通。b は tmp を最初にどちらから退避したかで決まる
  const correctChoiceId = mode === 0 ? "c" : "d";

  return {
    pseudoCode,
    choices: baseQuestion.choices,
    correctChoiceId,
    anotherTraceLines: [
      `array = {${values.join(", ")}}（要素数 ${n}）`,
      `繰り返し回数 = ${n} ÷ 2 の商 = ${loops} 回` + (n % 2 === 1 ? "（真ん中の1つは動かさなくてよい）" : ""),
      `tmp に先に退避するのは array[${mode === 0 ? "right" : "left"}] → 最後に tmp を入れる先は array[${mode === 0 ? "left" : "right"}]`,
      `結果 = {${reversed.join(", ")}}`
    ]
  };
}

/** 問51(R4(12)問12 分岐): 例に使う単語と、数える対象（一致 / 一致しない）を変えて出題する。
 *  mode 0 … 一致する組を数える simRatio（正解は s1[i] = s2[i]）
 *  mode 1 … 一致しない組を数える diffRatio（正解は s1[i] ≠ s2[i]）
 *  解答群は原問のまま。本文の「一致する / 一致しない」を読み飛ばすと必ず外す。 */
const Q51_WORDS = [
  { base: "apple", partial: "april", zero: "melon", short: "pen" },
  { base: "water", partial: "wafer", zero: "bingo", short: "cat" },
  { base: "music", partial: "magic", zero: "tenth", short: "sun" },
  { base: "stone", partial: "store", zero: "plaid", short: "cup" },
  { base: "green", partial: "greed", zero: "black", short: "ink" }
];
let lastQ51Key: string | null = null;

/** 要素番号が同じ位置で文字が一致した個数 */
function q51Matches(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < a.length && i < b.length; i++) if (a[i] === b[i]) n += 1;
  return n;
}

/** 配列リテラル { "a", "p", ... } の形にする */
function q51Literal(word: string): string {
  return `{ ${word.split("").map((c) => `"${c}"`).join(", ")} }`;
}

/** 0.4 のような値は小数1桁、割り切れる値は整数で書く */
function q51Num(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function generateQ51(baseQuestion: Question): GeneratedQuestionPatch {
  let idx = 0;
  let mode: 0 | 1 = 0;
  do {
    idx = randomInt(0, Q51_WORDS.length - 1);
    mode = randomInt(0, 1) as 0 | 1;
  } while (`${idx}-${mode}` === lastQ51Key || (idx === 0 && mode === 0));
  lastQ51Key = `${idx}-${mode}`;

  const w = Q51_WORDS[idx];
  const n = w.base.length;
  const fn = mode === 0 ? "simRatio" : "diffRatio";
  const count = (other: string) => {
    const m = q51Matches(w.base, other);
    return mode === 0 ? m / n : (n - m) / n;
  };

  const bodyText =
    mode === 0
      ? `関数${fn}は，引数として与えられた要素数1以上の二つの文字型の配列s1とs2を比較し，要素数が等しい場合は，配列の並びがどの程度似ているかを示す指標として，（要素番号が同じ要素の文字同士が一致する要素の組の個数 ÷ s1の要素数）を返す。すべて一致すれば戻り値は1，一致しなければ0，要素数が異なる場合は−1を返す。`
      : `関数${fn}は，引数として与えられた要素数1以上の二つの文字型の配列s1とs2を比較し，要素数が等しい場合は，配列の並びがどの程度違っているかを示す指標として，（要素番号が同じ要素の文字同士が一致しない要素の組の個数 ÷ s1の要素数）を返す。すべて一致すれば戻り値は0，一致しなければ1，要素数が異なる場合は−1を返す。`;

  const bodyTable = {
    caption: `表 関数 ${fn} に与える s1，s2 及び戻り値の例`,
    headers: ["s1", "s2", "戻り値"],
    rows: [
      [q51Literal(w.base), q51Literal(w.base), q51Num(count(w.base))],
      [q51Literal(w.base), q51Literal(w.partial), q51Num(count(w.partial))],
      [q51Literal(w.base), q51Literal(w.zero), q51Num(count(w.zero))],
      [q51Literal(w.base), q51Literal(w.short), "−1"]
    ]
  };

  const pseudoCode = (baseQuestion.pseudoCode ?? []).map((line) =>
    line.replace("simRatio", fn)
  );

  const matched = q51Matches(w.base, w.partial);
  return {
    bodyText,
    bodyTable,
    pseudoCode,
    choices: baseQuestion.choices,
    correctChoiceId: mode === 0 ? "d" : "b",
    anotherTraceLines: [
      `数える対象: ${mode === 0 ? "一致する組（= で数える）" : "一致しない組（≠ で数える）"}`,
      `${w.base} と ${w.partial}: 同じ位置で一致したのは ${matched} 文字 → 一致しないのは ${n - matched} 文字`,
      `戻り値 = ${mode === 0 ? matched : n - matched} ÷ ${n} = ${q51Num(count(w.partial))}`,
      `cnt は「数えたい組の個数」。何を数えるかは本文の1行で決まる`
    ]
  };
}

/** 問83(R7問5 予防接種・理論度数): 表1の集計結果だけを差し替える。
 *  理論度数 a,b が整数になり、誤答7つが重複しない組合せをあらかじめ検証して持っている。
 *  （行和×列和÷総和 が割り切れる表は多くないため、乱数で作らず固定の候補から選ぶ） */
const Q83_TABLES: number[][] = [
  // [受けた・かからなかった, 受けた・かかった, 受けていない・かからなかった, 受けていない・かかった]
  [89, 13, 61, 17],
  [118, 8, 64, 6],
  [114, 14, 54, 10],
  [78, 2, 42, 6],
  [101, 11, 55, 15],
  [119, 7, 41, 13],
  [109, 11, 45, 11],
  [117, 11, 79, 17]
];
let lastQ83Index: number | null = null;

function generateQ83(_baseQuestion: Question): GeneratedQuestionPatch {
  let idx = 0;
  do {
    idx = randomInt(0, Q83_TABLES.length - 1);
  } while (idx === lastQ83Index);
  lastQ83Index = idx;

  const [d11, d12, d21, d22] = Q83_TABLES[idx];
  const t = d11 + d12 + d21 + d22;
  const r1 = d11 + d12;
  const r2 = d21 + d22;
  const c1 = d11 + d21;
  const c2 = d12 + d22;
  const a = (r1 * c1) / t; // 理論度数（1行1列）
  const b = (r2 * c2) / t; // 理論度数（2行2列）

  // 誤答は実際にやりがちな取り違えから作る
  const pairs: number[][] = [
    [a, b],                  // 正解
    [a, d22],                // b を集計結果の生値のままにした
    [d11, b],                // a を集計結果の生値のままにした
    [d21, d22],              // 2行目をそのまま書き写した
    [r1 / 2, r2 / 2],        // 行の和を列数で割った（行平均）
    [c1 / 2, c2 / 2],        // 列の和を行数で割った（列平均）
    [(r2 * c1) / t, b]       // a で行を取り違えた
  ];
  pairs.sort((x, y) => (x[0] - y[0]) || (x[1] - y[1]));
  const choices: Choice[] = pairs.map((pv, i) => ({
    id: CHOICE_IDS[i] ?? "a",
    text: `a=${pv[0]}, b=${pv[1]}`
  }));
  const correctChoiceId = CHOICE_IDS[pairs.findIndex((pv) => pv[0] === a && pv[1] === b)] ?? "a";
  // この問題は解答群を表で出すので choiceTable も一緒に差し替える（choices だけだと表が元のまま残る）
  const choiceTable = {
    headers: ["a", "b"],
    rows: pairs.map((pv) => [String(pv[0]), String(pv[1])])
  };

  const shaded = { text: "", shaded: true };
  const bodyBlocks: BodyBlock[] = [
    {
      type: "text",
      text: "予防接種の病気 X に対する予防効果を調査するために集めたデータの集計結果を基に，病気 X にかかるかどうかが，予防接種の有無に影響されないと仮定した場合の人数を計算する。この人数を理論度数という。表 1 に集計結果の例を示し，表 2 に表 1 を基に計算した理論度数を示す。関数 f は，引数 data で受け取った集計結果を基に計算した理論度数を返す。引数と戻り値は二次元配列で，その行が表の行，その列が表の列に対応する。"
    },
    {
      type: "table",
      caption: "表1　集計結果の例（単位　人）",
      headers: ["", "病気Xにかからなかった", "病気Xにかかった"],
      rows: [
        ["予防接種を受けた", String(d11), String(d12)],
        ["予防接種を受けていない", String(d21), String(d22)]
      ]
    },
    {
      type: "table",
      caption: "表2　表1を基に計算した理論度数（単位　人）",
      headers: ["", "病気Xにかからなかった", "病気Xにかかった"],
      rows: [
        ["予防接種を受けた", "a", shaded],
        ["予防接種を受けていない", shaded, "b"]
      ]
    },
    { type: "text", text: "注記　網掛けの部分は数値を表示していない。" }
  ];

  return {
    bodyBlocks,
    choices,
    choiceTable,
    correctChoiceId,
    anotherTraceLines: [
      `総和 t = ${t}`,
      `行の和: 1行目 = ${r1} ／ 2行目 = ${r2}`,
      `列の和: 1列目 = ${c1} ／ 2列目 = ${c2}`,
      `a = ${r1} × ${c1} ÷ ${t} = ${a}`,
      `b = ${r2} × ${c2} ÷ ${t} = ${b}`
    ]
  };
}

const anotherQuestionGenerators: Record<string, AnotherQuestionGenerator> = {
  q23: generateQ23,
  q33: generateQ33,
  q36: generateQ36,
  q37: generateQ37,
  q42: generateQ42,
  q43: generateQ43,
  q44: generateQ44MatrixAccess,
  q45: generateQ45Sparse,
  q48: generateQ48,
  q51: generateQ51,
  q58: generateQ58,
  q60: generateQ60,
  q63: generateQ61,
  q70: generateQ70,
  q71: generateQ71,
  q76: generateQ76,
  q83: generateQ83,
  q84: generateQ84,
  q81: generateQ86
};

export function generateAnotherQuestion(baseQuestion: Question): GeneratedQuestionPatch | null {
  const generator = anotherQuestionGenerators[baseQuestion.id];
  if (!generator) return null;
  return generator(baseQuestion);
}
