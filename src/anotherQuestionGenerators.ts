import { BodyBlock, BodyTableCell, Choice, Question } from "./types";

export type GeneratedQuestionPatch = Pick<
  Question,
  | "bodyText"
  | "pseudoCode"
  | "choices"
  | "correctChoiceId"
  | "anotherTraceLines"
  | "bodyBlocks"
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
    const questionLine = `${bits} から上位${n}ビットを取得して ${upperPacked} とするには【　】を行う。`;
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
  const bodyText = `関数 getUpperBitsPacked は 8 ビット型の引数 byte を受け取り，上位${n}ビットを取得して返す。例えば，getUpperBitsPacked(${byteBin}) の戻り値は ${resultBin} となる。\n\n${intro}`;

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

/** q85「値を変えてもう一度」: func(24, 30) または func(24, 128)（後者は 128,24 の入れ替え）。どちらも mod 行は 3 回（イ／b） */
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

const anotherQuestionGenerators: Record<string, AnotherQuestionGenerator> = {
  q23: generateQ23,
  q33: generateQ33,
  q36: generateQ36,
  q37: generateQ37,
  q44: generateQ44MatrixAccess,
  q45: generateQ45Sparse,
  q58: generateQ58,
  q60: generateQ60,
  q61: generateQ61,
  q70: generateQ70,
  q71: generateQ71,
  q85: generateQ86
};

export function generateAnotherQuestion(baseQuestion: Question): GeneratedQuestionPatch | null {
  const generator = anotherQuestionGenerators[baseQuestion.id];
  if (!generator) return null;
  return generator(baseQuestion);
}
