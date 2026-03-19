import { Choice, Question } from "./types";

export type GeneratedQuestionPatch = Pick<Question, "bodyText" | "pseudoCode" | "choices" | "correctChoiceId">;
type AnotherQuestionGenerator = (baseQuestion: Question) => GeneratedQuestionPatch;

const CHOICE_IDS = ["a", "b", "c", "d", "e", "f", "g"];

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
  const correctValue = args.slice(0, 5).reduce((sum, value) => sum + value, 0);

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
    correctChoiceId
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
    correctChoiceId
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
    correctChoiceId
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
    correctChoiceId
  };
}

const anotherQuestionGenerators: Record<string, AnotherQuestionGenerator> = {
  q23: generateQ23,
  q33: generateQ33,
  q36: generateQ36,
  q37: generateQ37
};

export function generateAnotherQuestion(baseQuestion: Question): GeneratedQuestionPatch | null {
  const generator = anotherQuestionGenerators[baseQuestion.id];
  if (!generator) return null;
  return generator(baseQuestion);
}
