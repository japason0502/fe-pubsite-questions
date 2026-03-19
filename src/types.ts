export type Choice = {
  id: string;
  text: string;
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

