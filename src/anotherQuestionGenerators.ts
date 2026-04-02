import { Choice, Question } from "./types";

export type GeneratedQuestionPatch = Pick<Question, "bodyText" | "pseudoCode" | "choices" | "correctChoiceId" | "anotherTraceLines">;
type AnotherQuestionGenerator = (baseQuestion: Question) => GeneratedQuestionPatch;

const CHOICE_IDS = ["a", "b", "c", "d", "e", "f", "g"];
let lastQ58Mode: 0 | 1 | null = null;

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
    bodyText: "次の手続 sort は，大域の整数型の配列 data の，引数 first で与えられた要素番号から引数 last で与えられた要素番号までの要素を昇順に整列する。ここで，first < last とする。手続 sort を sort(1, 5) として呼び出すと，/*** a ***/ の行を最初に実行したときの出力は「【　】」となる。",
    pseudoCode,
    choices: baseQuestion.choices,
    correctChoiceId,
    anotherTraceLines: [
      `初期data = {${sourceData.join(", ")}}`,
      `while(true) の反復回数 = ${loopCount}`,
      `/*** a ***/ 最初の出力 = ${answerText}`
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

const anotherQuestionGenerators: Record<string, AnotherQuestionGenerator> = {
  q23: generateQ23,
  q33: generateQ33,
  q36: generateQ36,
  q37: generateQ37,
  q44: generateQ44MatrixAccess,
  q45: generateQ45Sparse,
  q58: generateQ58
};

export function generateAnotherQuestion(baseQuestion: Question): GeneratedQuestionPatch | null {
  const generator = anotherQuestionGenerators[baseQuestion.id];
  if (!generator) return null;
  return generator(baseQuestion);
}
