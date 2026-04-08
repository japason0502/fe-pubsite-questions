export type Choice = {
  id: string;
  text: string;
};

/** 解答群を表形式で持つ場合（例: 組合せ問題）。choices と行は同じ順序 */
export type ChoiceTable = {
  headers: string[];
  rows: string[][];
};

/** 本文表の1セル。文字列のほか { text, shaded } で網掛け表示可 */
export type BodyTableCell = string | { text: string; shaded?: boolean };

/** 本文中の補足表（例: 関数の引数と戻り値の例）。choiceTable とは別 */
export type BodyTable = {
  caption?: string;
  headers: string[];
  rows: BodyTableCell[][];
};

/** textSub: 通常文字列と下付き（小さな文字）の交互。kind "s"=そのまま、"sub"=base の直後に script を下付きで */
export type BodyTextPart =
  | { kind: "s"; text: string }
  | { kind: "sub"; base: string; script: string };

/** 本文を表・数式・画像で分割表示するとき（bodyText / bodyTable の代わりに使用） */
export type BodyBlock =
  | { type: "text"; text: string }
  | { type: "textCenter"; text: string }
  | { type: "textSub"; parts: BodyTextPart[] }
  | { type: "table"; caption?: string; headers: string[]; rows: BodyTableCell[][] }
  | { type: "formula"; text: string }
  /** public からの相対パス（例: question-images/52_formula.png） */
  | { type: "image"; src: string; alt?: string };

export type Question = {
  id: string;
  number: number;
  title: string;
  body?: string; // 後方互換性のため残す
  questionText?: string; // ・問題文
  bodyText?: string; // ・本文
  /** 設定時は bodyText・bodyTable に代わりこの順に表示 */
  bodyBlocks?: BodyBlock[];
  /** 本文と疑似コードの間に表示する補足表 */
  bodyTable?: BodyTable;
  pseudoCode?: string[];
  choices: Choice[];
  /** 設定時は問題文側の解答群を表で表示（choices は採点・ボタン用に同順で維持） */
  choiceTable?: ChoiceTable;
  videoUrl?: string;
  /** 講義URL（記載がある場合のみボタン表示） */
  lessonUrl?: string;
  /** ヒント動画URL（記載がある場合のみボタン表示） */
  hintVideoUrl?: string;
  /** 値を変えてもう一度ボタン表示フラグ（1:表示, 0:非表示） */
  another?: number;
  /** another再生成時に表示する補助トレース */
  anotherTraceLines?: string[];
  correctChoiceId?: string;
  /** 一言（記載がある場合のみ表示） */
  hitokoto?: string;
};

export type ExamState = {
  answers: Record<string, string | null>;
  reviewFlags: Record<string, boolean>;
  currentIndex: number;
  remainingSeconds: number;
  practiceMode: boolean;
  zoom: number;
  mode: "practice" | "exam" | null;
  hideTimer: boolean;
  perQuestionGrading: boolean;
  perQuestionTimer: boolean;
  perQuestionTimerAlert: boolean;
  perQuestionRemainingSeconds: Record<string, number>;
  perQuestionTimerPaused: boolean;
  instructorMode: boolean;
};

