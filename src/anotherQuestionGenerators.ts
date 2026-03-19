import { Choice, Question } from "./types";

export type GeneratedQuestionPatch = Pick<Question, "bodyText" | "choices" | "correctChoiceId">;
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

const anotherQuestionGenerators: Record<string, AnotherQuestionGenerator> = {
  q23: generateQ23
};

export function generateAnotherQuestion(baseQuestion: Question): GeneratedQuestionPatch | null {
  const generator = anotherQuestionGenerators[baseQuestion.id];
  if (!generator) return null;
  return generator(baseQuestion);
}
