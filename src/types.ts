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
  correctChoiceId?: string;
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

