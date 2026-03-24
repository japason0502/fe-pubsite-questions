export type Choice = {
  id: string;
  text: string;
};

/** 解答群を表形式で持つ場合（例: 組合せ問題）。choices と行は同じ順序 */
export type ChoiceTable = {
  headers: string[];
  rows: string[][];
};

export type Question = {
  id: string;
  number: number;
  title: string;
  body?: string; // 後方互換性のため残す
  questionText?: string; // ・問題文
  bodyText?: string; // ・本文
  pseudoCode?: string[];
  choices: Choice[];
  /** 設定時は問題文側の解答群を表で表示（choices は採点・ボタン用に同順で維持） */
  choiceTable?: ChoiceTable;
  videoUrl?: string;
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

