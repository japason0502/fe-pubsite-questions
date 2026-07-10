import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import questionsData from "./data/questions.json";
import mogiQuestionsData from "./data/mogiQuestions.json";
import r4ExtraData from "./data/r4Extra.json";
import { BodyBlock, BodyTable, BodyTableCell, ExamState, Question } from "./types";
import { generateAnotherQuestion } from "./anotherQuestionGenerators";

const STORAGE_KEY = "exam-state";
const MOGI_STORAGE_KEY = "exam-state-mogi"; // 模擬試験は保存キーを分けて通常演習の状態を汚さない
const MOGI_R4_STORAGE_KEY = "exam-state-mogi-r4"; // R4サンプル模試用
const REVIEW_MODE_KEY = "review-mode-mogi"; // 模試の復習モード（今すぐ採点・解説動画ボタン表示）ON/OFF
// R4サンプル模試: 令和4年度12月サンプル問題の20問を本試験の順（問1〜20）で出題。
// バンク(questions.json)のidを本試験順に並べたもの。問17のみバンク未収録のためr4Extra.jsonで補完。
const R4_SAMPLE_ORDER = [
  "q0", "q49", "q23", "q82", "q79", "q63", "q56", "q74", "q58", "q78",
  "q88", "q51", "q89", "q42", "q87", "q65", "r4x17", "q92", "q93", "q94"
];
const DEFAULT_TIME = 30 * 60; // 30 分
const MOGI_TIME = 100 * 60; // 模擬試験 100 分（本番と同じ計測）
const PER_QUESTION_TIME = 5 * 60; // 5 分
const MIN_ZOOM = 0.5; // 50%
const MAX_ZOOM = 1.5; // 150%
const CHOICE_LABELS = ["ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ", "サ", "シ", "ス"];

function formatQuestionNumber(n: number) {
  return Number.isInteger(n) ? `問${n}` : `問${Math.floor(n)}#`;
}

function questionNumberToImageKey(n: number) {
  // 例: 4 -> "4", 4.1 -> "4_1"
  return Number.isInteger(n) ? String(n) : String(n).replace(".", "_");
}

function getQuestionImageSrc(n: number) {
  // GitHub Pages など base パス配下でも壊れないように BASE_URL を使う
  return `${import.meta.env.BASE_URL}question-images/${questionNumberToImageKey(n)}.png`;
}

function bodyAssetSrc(src: string) {
  const path = src.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${path}`;
}

function bodyTableCellText(cell: BodyTableCell): string {
  return typeof cell === "string" ? cell : cell.text;
}

function bodyTableCellShaded(cell: BodyTableCell): boolean {
  return typeof cell === "object" && cell.shaded === true;
}

function bodyTableCellAlign(cell: BodyTableCell): "center" | undefined {
  return typeof cell === "object" && cell.align === "center" ? "center" : undefined;
}

function BodyTableView({ bt }: { bt?: BodyTable }) {
  if (!bt) return null;
  const ok =
    bt.headers.length > 0 &&
    bt.rows.length > 0 &&
    bt.rows.every((row) => row.length === bt.headers.length);
  if (!ok) return null;
  const hideHeader = bt.headers.every((h) => !h.trim());
  return (
    <div className="body-table-block">
      {bt.caption ? <p className="body-table-caption">{bt.caption}</p> : null}
      <div className="choice-table-wrap">
        <table
          className={
            "choice-table body-table" +
            (hideHeader ? " body-table--no-header" : "") +
            (bt.equalDataColumnWidths ? " body-table--equal-data-cols" : "")
          }
        >
          {!hideHeader ? (
            <thead>
              <tr>
                {bt.headers.map((h, hi) => (
                  <th key={hi} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {bt.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const shaded = bodyTableCellShaded(cell);
                  const align = bodyTableCellAlign(cell);
                  const textContent = bodyTableCellText(cell) || (shaded ? "\u00a0" : "");
                  const cellStyle =
                    align || textContent.includes("\n")
                      ? {
                          ...(align ? { textAlign: align as const } : {}),
                          ...(textContent.includes("\n") ? { whiteSpace: "pre-line" as const } : {})
                        }
                      : undefined;
                  return (
                    <td
                      key={ci}
                      className={shaded ? "body-table-cell-shaded" : undefined}
                      style={cellStyle}
                    >
                      {textContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderBodyBlock(block: BodyBlock, idx: number) {
  switch (block.type) {
    case "text":
      return (
        <p key={idx} className="question-body-text">
          {block.text}
        </p>
      );
    case "textCenter":
      return (
        <p key={idx} className="question-body-text-center">
          {block.text}
        </p>
      );
    case "textSub":
      return (
        <p key={idx} className="question-body-text">
          {block.parts.map((p, pi) =>
            p.kind === "s" ? (
              <span key={pi}>{p.text}</span>
            ) : (
              <span key={pi} className="body-with-sub">
                {p.base}
                <sub className="body-sub">{p.script}</sub>
              </span>
            )
          )}
        </p>
      );
    case "table": {
      const { type: _table, ...tableRest } = block;
      return <BodyTableView key={idx} bt={tableRest} />;
    }
    case "formula": {
      const html = katex.renderToString(block.text, {
        displayMode: true,
        throwOnError: false,
        strict: "ignore",
      });
      return (
        <div
          key={idx}
          className="body-formula"
          role="math"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    case "html":
      return (
        <div
          key={idx}
          className="question-body-html"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    case "image":
      return (
        <div key={idx} className="body-image-block">
          <img
            src={bodyAssetSrc(block.src)}
            alt={block.alt ?? ""}
            className="body-inline-image"
            style={block.width ? { width: block.width } : undefined}
            loading="lazy"
          />
        </div>
      );
    default:
      return null;
  }
}

const initialState: ExamState = {
  answers: {},
  reviewFlags: {},
  currentIndex: 0,
  remainingSeconds: DEFAULT_TIME,
  practiceMode: false,
  zoom: 1,
  mode: null,
  hideTimer: false,
  perQuestionGrading: false,
  perQuestionTimer: false,
  perQuestionTimerAlert: false,
  perQuestionRemainingSeconds: {},
  perQuestionTimerPaused: false,
  instructorMode: false
};

function loadState(key: string): ExamState {
  const raw = localStorage.getItem(key);
  if (!raw) return initialState;
  try {
    const parsed = JSON.parse(raw) as Partial<ExamState>;
    return { ...initialState, ...parsed };
  } catch {
    return initialState;
  }
}

function saveState(key: string, state: ExamState) {
  localStorage.setItem(key, JSON.stringify(state));
}

function secondsToClock(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function App() {
  // --- 埋め込み / ディープリンク / 模擬試験用 URL パラメータ ---
  // ?q=<問題idまたはnumber> でその問題を初期表示。?embed=1 で埋め込みモード
  // （モード選択をスキップ・ヘッダー/フッターを隠して1問に固定・localStorage非汚染）。
  // ?mock=1 で模擬試験（問題セット・保存キー・タイマーを切り替え。URL直接指定でも起動可能）。
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const qParam = urlParams.get("q");
  const embed = urlParams.get("embed") === "1";
  const mockParam = urlParams.get("mock");
  // ?mock=1（模試1回目）／?mock=r4（R4サンプル20問）。それ以外の値は通常演習扱い
  const mogiSet = mockParam === "1" || mockParam === "r4" ? mockParam : null;
  const isMogi = mogiSet !== null;

  const questions = useMemo<Question[]>(() => {
    if (mogiSet === "1") return mogiQuestionsData as Question[];
    if (mogiSet === "r4") {
      const byId = new Map<string, Question>();
      (questionsData as Question[]).forEach((q) => byId.set(q.id, q));
      (r4ExtraData as Question[]).forEach((q) => byId.set(q.id, q));
      // 本試験の順に並べ、表示番号を問1〜20に振り直す（元データは変更しない）
      return R4_SAMPLE_ORDER.map((id, i) => {
        const q = byId.get(id);
        if (!q) throw new Error(`R4サンプルの問題が見つかりません: ${id}`);
        return { ...q, number: i + 1 };
      });
    }
    return questionsData as Question[];
  }, [mogiSet]);
  const storageKey = mogiSet === "r4" ? MOGI_R4_STORAGE_KEY : isMogi ? MOGI_STORAGE_KEY : STORAGE_KEY;
  const examDefaultTime = isMogi ? MOGI_TIME : DEFAULT_TIME;
  const deepLinkIndex = useMemo(() => {
    if (!qParam) return -1;
    // slug 優先（?q=r6-mon1）→ id（?q=q49）→ number（?q=49）の順でマッチ
    let i = questions.findIndex((x) => x.slug === qParam);
    if (i < 0) i = questions.findIndex((x) => x.id === qParam);
    if (i < 0) i = questions.findIndex((x) => String(x.number) === qParam);
    return i;
  }, [questions, qParam]);

  // 模擬試験ページではタブタイトルを変える
  useEffect(() => {
    if (isMogi) document.title = "科目B 模擬試験";
  }, [isMogi]);

  const [questionOverrides, setQuestionOverrides] = useState<Record<string, Partial<Question>>>({});
  const [state, setState] = useState<ExamState>(() => {
    const base = embed ? { ...initialState } : loadState(storageKey);
    const next: ExamState = { ...base };
    // q または embed があれば、モード選択オーバーレイを飛ばして演習モードで開始
    if ((embed || qParam) && !next.mode) {
      next.mode = "practice";
      next.hideTimer = true;
      next.practiceMode = false;
      next.perQuestionGrading = true;
    }
    // 模擬試験（?mock=1）はモード選択を挟まず、開いた時点で試験モード＋ガイダンス表示
    // （URLを直接渡す運用でも一本道になる。計測はガイダンスの「試験開始」から）
    if (isMogi && !embed && !qParam && !next.mode) {
      next.mode = "exam";
      next.hideTimer = false;
      next.practiceMode = false;
      next.perQuestionGrading = false;
      next.perQuestionTimer = false;
      next.perQuestionTimerAlert = false;
      next.remainingSeconds = MOGI_TIME;
      next.instructorMode = urlParams.get("instructor") === "1";
    }
    if (deepLinkIndex >= 0) next.currentIndex = deepLinkIndex;
    return next;
  });
  const [showList, setShowList] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  // 模擬試験のガイダンス画面（表示中はタイマーを動かさない）
  // 模試ページを新規に開いた場合（＝保存済みの試験が無い場合）は最初からガイダンスを表示する
  const [showGuidance, setShowGuidance] = useState<boolean>(() => {
    if (!isMogi || embed || qParam) return false;
    return !loadState(storageKey).mode;
  });
  // 保存済みの試験がある場合は「前回の続きから再開しますか?」を確認する（表示中はタイマー停止）
  const [showResumePrompt, setShowResumePrompt] = useState<boolean>(() => {
    if (!isMogi || embed || qParam) return false;
    return Boolean(loadState(storageKey).mode);
  });
  const [showPerQuestionTimeUp, setShowPerQuestionTimeUp] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [referenceTab, setReferenceTab] = useState<"notes" | "materials">("notes");
  const [paneRatio, setPaneRatio] = useState(0.55); // 左ペイン幅割合
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 769);
  const [mobilePane, setMobilePane] = useState<"question" | "choices">("question");
  const [showResult, setShowResult] = useState(false);
  const [resultSummary, setResultSummary] = useState<{ correct: number; total: number; unanswered: number }>({
    correct: 0,
    total: questions.length,
    unanswered: questions.length
  });
  const [resultDetails, setResultDetails] = useState<{ number: number; status: "correct" | "incorrect" | "unanswered" }[]>([]);
  const [gradeNowResult, setGradeNowResult] = useState<{
    questionId: string;
    questionNumber: number;
    questionTitle: string;
    status: "correct" | "incorrect" | "unanswered";
    correctLabel?: string;
    correctText?: string;
    selectedLabel?: string;
    selectedText?: string;
    videoUrl?: string;
    imageSrc: string;
    traceLines?: string[];
  } | null>(null);
  const [gradeNowImageError, setGradeNowImageError] = useState(false);
  // 模試の復習モード: ONで各問に「今すぐ採点」「解説へ」を表示。ページを閉じても保持。
  const [reviewMode, setReviewMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(REVIEW_MODE_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(REVIEW_MODE_KEY, reviewMode ? "1" : "0");
    } catch {
      /* localStorage 不可でも無視 */
    }
  }, [reviewMode]);
  const dividerRef = useRef<HTMLDivElement | null>(null);

  // state 永続化（埋め込みモードでは保存しない＝通常サイトの state を汚さない）
  useEffect(() => {
    if (embed) return;
    saveState(storageKey, state);
  }, [state, embed, storageKey]);

  // タイマー（全体）※100分数えないのときは計測しない。ガイダンス・再開確認の表示中も計測しない
  useEffect(() => {
    if (showGuidance || showResumePrompt) return;
    if (state.hideTimer) return;
    if (state.practiceMode) return;
    if (state.remainingSeconds <= 0) return;
    const id = window.setInterval(() => {
      setState((prev) => {
        if (prev.practiceMode || prev.remainingSeconds <= 0) return prev;
        const next = prev.remainingSeconds - 1;
        if (next <= 0) {
          setShowTimeUp(true);
          return { ...prev, remainingSeconds: 0, practiceMode: true };
        }
        return { ...prev, remainingSeconds: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.hideTimer, state.practiceMode, state.remainingSeconds, showGuidance, showResumePrompt]);

  // タイマー（問題ごと）
  useEffect(() => {
    if (showGuidance || showResumePrompt) return;
    if (!state.perQuestionTimer) return;
    if (state.practiceMode) return;
    if (state.perQuestionTimerPaused) return;
    const currentQuestionId = questions[state.currentIndex]?.id;
    if (!currentQuestionId) return;
    const questionTime = state.perQuestionRemainingSeconds[currentQuestionId];
    if (questionTime === undefined) return;
    
    const id = window.setInterval(() => {
      setState((prev) => {
        if (prev.perQuestionTimerPaused) return prev;
        const currentQId = questions[prev.currentIndex]?.id;
        if (!currentQId) return prev;
        const currentTime = prev.perQuestionRemainingSeconds[currentQId];
        if (currentTime === undefined) return prev;
        const next = currentTime - 1;
        const updated = {
          ...prev.perQuestionRemainingSeconds,
          [currentQId]: next
        };
        if (next === 0 && prev.perQuestionTimerAlert) {
          setShowPerQuestionTimeUp(true);
        }
        return { ...prev, perQuestionRemainingSeconds: updated };
        return { ...prev, perQuestionRemainingSeconds: updated };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.perQuestionTimer, state.practiceMode, state.perQuestionTimerPaused, state.currentIndex, state.perQuestionRemainingSeconds, questions, showGuidance, showResumePrompt]);

  // Ctrl + ホイールでズーム
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setState((prev) => {
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom + delta));
        return { ...prev, zoom };
      });
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  // リサイズドラッグ（PC）
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 769);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobilePane("question");
    }
  }, [isMobile]);

  // リサイズドラッグ（PC）
  useEffect(() => {
    const divider = dividerRef.current;
    if (!divider) return;
    let dragging = false;

    const onDown = (e: MouseEvent) => {
      if (window.innerWidth < 769) return; // モバイルでは無効
      dragging = true;
      e.preventDefault();
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const ratio = e.clientX / window.innerWidth;
      setPaneRatio(Math.min(0.8, Math.max(0.2, ratio)));
    };
    const onUp = () => {
      dragging = false;
    };

    divider.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      divider.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const currentQuestion = useMemo(() => {
    const baseQuestion = questions[state.currentIndex];
    if (!baseQuestion) return baseQuestion;
    const override = questionOverrides[baseQuestion.id];
    return override ? { ...baseQuestion, ...override } : baseQuestion;
  }, [questions, state.currentIndex, questionOverrides]);

  // 模試ではヒントになる「一言」は出さない
  const hitokotoDisplay = isMogi ? "" : currentQuestion?.hitokoto?.trim() ?? "";
  const lessonUrlDisplay = currentQuestion?.lessonUrl?.trim() ?? "";
  const hintVideoUrlDisplay = currentQuestion?.hintVideoUrl?.trim() ?? "";

  const handleAnswer = (choiceId: string) => {
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [currentQuestion.id]: choiceId }
    }));
  };

  const handleReviewToggle = () => {
    setState((prev) => ({
      ...prev,
      reviewFlags: {
        ...prev.reviewFlags,
        [currentQuestion.id]: !prev.reviewFlags[currentQuestion.id]
      }
    }));
  };

  const navigate = (offset: number) => {
    setState((prev) => {
      const nextIndex = prev.currentIndex + offset;
      if (nextIndex < 0 || nextIndex >= questions.length) return prev;
      const nextQuestionId = questions[nextIndex]?.id;
      const updated = { ...prev, currentIndex: nextIndex, perQuestionTimerPaused: false };
      
      // 問題ごとのタイマーが有効で、次の問題のタイマーが未初期化の場合、5分で初期化
      if (prev.perQuestionTimer && nextQuestionId && prev.perQuestionRemainingSeconds[nextQuestionId] === undefined) {
        updated.perQuestionRemainingSeconds = {
          ...prev.perQuestionRemainingSeconds,
          [nextQuestionId]: PER_QUESTION_TIME
        };
      }
      
      return updated;
    });
  };

  const jumpTo = (index: number) => {
    setState((prev) => {
      const nextQuestionId = questions[index]?.id;
      const updated = { ...prev, currentIndex: index, perQuestionTimerPaused: false };
      
      // 問題ごとのタイマーが有効で、次の問題のタイマーが未初期化の場合、5分で初期化
      if (prev.perQuestionTimer && nextQuestionId && prev.perQuestionRemainingSeconds[nextQuestionId] === undefined) {
        updated.perQuestionRemainingSeconds = {
          ...prev.perQuestionRemainingSeconds,
          [nextQuestionId]: PER_QUESTION_TIME
        };
      }
      
      return updated;
    });
    setShowList(false);
  };

  const resetZoom = () => setState((prev) => ({ ...prev, zoom: 1 }));

  const markPracticeMode = () => {
    setShowTimeUp(false);
    setState((prev) => ({ ...prev, practiceMode: true, remainingSeconds: 0 }));
  };

  const gradeExam = () => {
    const total = questions.length;
    let correct = 0;
    let unanswered = 0;
    const details: { number: number; status: "correct" | "incorrect" | "unanswered" }[] = [];
    questions.forEach((baseQuestion) => {
      const override = questionOverrides[baseQuestion.id];
      const q = override ? { ...baseQuestion, ...override } : baseQuestion;
      const ans = state.answers[q.id];
      if (!ans) {
        unanswered += 1;
        details.push({ number: q.number, status: "unanswered" });
        return;
      }
      if (q.correctChoiceId && ans === q.correctChoiceId) {
        correct += 1;
        details.push({ number: q.number, status: "correct" });
      } else {
        details.push({ number: q.number, status: "incorrect" });
      }
    });
    setResultSummary({ correct, total, unanswered });
    setResultDetails(details.sort((a, b) => a.number - b.number));
    setShowResult(true);
    setState((prev) => ({
      ...prev,
      answers: {},
      reviewFlags: {},
      currentIndex: 0
    }));
  };

  const handleFinish = () => {
    const ok = window.confirm("終了して採点しますか？");
    if (!ok) return;
    gradeExam();
  };

  const startMode = (mode: "practice" | "exam", hideTimer: boolean, perQuestionGrading: boolean, perQuestionTimer: boolean, perQuestionTimerAlert: boolean, instructorMode: boolean) => {
    setQuestionOverrides({});
    // 模擬試験は開始前にガイダンス画面を挟む（閉じるまでタイマーは動かない）
    if (isMogi) setShowGuidance(true);
    setState((prev) => {
      const newState = {
        ...initialState,
        ...prev,
        mode,
        hideTimer,
        practiceMode: false,
        remainingSeconds: examDefaultTime,
        perQuestionGrading,
        perQuestionTimer,
        perQuestionTimerAlert,
        perQuestionRemainingSeconds: {},
        perQuestionTimerPaused: false,
        instructorMode
      };
      
      // 問題ごとのタイマーが有効な場合、最初の問題のタイマーを初期化
      if (perQuestionTimer && questions.length > 0) {
        const firstQuestionId = questions[0]?.id;
        if (firstQuestionId) {
          newState.perQuestionRemainingSeconds = {
            [firstQuestionId]: PER_QUESTION_TIME
          };
        }
      }
      
      return newState;
    });
  };

  const togglePerQuestionTimerPause = () => {
    setState((prev) => ({
      ...prev,
      perQuestionTimerPaused: !prev.perQuestionTimerPaused
    }));
  };

  const resetPerQuestionTimer = () => {
    setState((prev) => {
      const currentQuestionId = questions[prev.currentIndex]?.id;
      if (!currentQuestionId) return prev;
      return {
        ...prev,
        perQuestionRemainingSeconds: {
          ...prev.perQuestionRemainingSeconds,
          [currentQuestionId]: PER_QUESTION_TIME
        },
        perQuestionTimerPaused: false
      };
    });
  };

  const handleGradeNow = () => {
    setGradeNowImageError(false);
    const q = currentQuestion;
    const traceLines = q.anotherTraceLines?.length ? q.anotherTraceLines : undefined;
    const correctId = q.correctChoiceId;
    if (!correctId) {
      window.alert("この問題には正解が設定されていません。");
      return;
    }
    const selectedId = state.answers[q.id];
    if (!selectedId) {
      setGradeNowResult({
        questionId: q.id,
        questionNumber: q.number,
        questionTitle: q.title,
        status: "unanswered",
        correctLabel: CHOICE_LABELS[q.choices.findIndex((c) => c.id === correctId)] ?? "",
        correctText: q.choices.find((c) => c.id === correctId)?.text ?? "",
        videoUrl: q.videoUrl,
        imageSrc: isMogi
          ? `${import.meta.env.BASE_URL}question-images/mogi/${questionNumberToImageKey(q.number)}.png`
          : getQuestionImageSrc(q.number),
        traceLines
      });
      return;
    }
    const correctLabel = CHOICE_LABELS[q.choices.findIndex((c) => c.id === correctId)] ?? "";
    const selectedLabel = CHOICE_LABELS[q.choices.findIndex((c) => c.id === selectedId)] ?? "";
    const correctText = q.choices.find((c) => c.id === correctId)?.text ?? "";
    const selectedText = q.choices.find((c) => c.id === selectedId)?.text ?? "";
    const status = selectedId === correctId ? "correct" : "incorrect";
    setGradeNowResult({
      questionId: q.id,
      questionNumber: q.number,
      questionTitle: q.title,
      status,
      correctLabel,
      correctText,
      selectedLabel,
      selectedText,
      videoUrl: q.videoUrl,
      imageSrc: isMogi
        ? `${import.meta.env.BASE_URL}question-images/mogi/${questionNumberToImageKey(q.number)}.png`
        : getQuestionImageSrc(q.number),
      traceLines
    });
  };

  const handleAnotherRun = () => {
    if (!currentQuestion || currentQuestion.another !== 1) return;
    const baseQuestion = questions[state.currentIndex];
    if (!baseQuestion) return;
    const generated = generateAnotherQuestion(baseQuestion);
    if (!generated) {
      window.alert("この問題の再生成ロジックは未設定です。");
      return;
    }
    setQuestionOverrides((prev) => ({
      ...prev,
      [currentQuestion.id]: { ...prev[currentQuestion.id], ...generated }
    }));
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [currentQuestion.id]: null }
    }));
  };

  const handleAnotherReset = () => {
    if (!currentQuestion || currentQuestion.another !== 1) return;
    setQuestionOverrides((prev) => {
      if (!prev[currentQuestion.id]) return prev;
      const next = { ...prev };
      delete next[currentQuestion.id];
      return next;
    });
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [currentQuestion.id]: null }
    }));
  };

  const paneStyle = useMemo(() => {
    if (isMobile) {
      return { gridTemplateRows: "1fr", gridTemplateColumns: "1fr" };
    }
    return {
      gridTemplateColumns: `${paneRatio * 100}% 6px ${(1 - paneRatio) * 100}%`
    };
  }, [paneRatio, isMobile]);

  const isAnotherOverridden = Boolean(currentQuestion && questionOverrides[currentQuestion.id]);

  return (
    <div className={embed ? "app app--embed" : "app"}>
      <header className="top-bar">
        <div className="left-controls">
          <span className="zoom-percent" aria-label={`ズーム倍率 ${Math.round(state.zoom * 100)}%`}>
            {Math.round(state.zoom * 100)}%
          </span>
          <input
            className="zoom-slider"
            type="range"
            min={50}
            max={150}
            step={1}
            value={Math.round(state.zoom * 100)}
            onChange={(e) => {
              const next = Number(e.target.value) / 100;
              setState((p) => ({ ...p, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)) }));
            }}
          />
          <button className="zoom-step" onClick={() => setState((p) => ({ ...p, zoom: Math.min(MAX_ZOOM, p.zoom + 0.1) }))}>
            ＋
          </button>
          <button className="zoom-step" onClick={() => setState((p) => ({ ...p, zoom: Math.max(MIN_ZOOM, p.zoom - 0.1) }))}>
            −
          </button>
          <button onClick={resetZoom}>リセット</button>
        </div>
        <div className="right-controls">
          <div className="right-top">
            {!state.hideTimer && (
              <span className="timer">
                残り時間: {state.practiceMode ? "練習モード" : secondsToClock(state.remainingSeconds)}
              </span>
            )}
            {state.hideTimer && <span className="timer">残り時間: 非表示</span>}
            {state.perQuestionTimer && !state.practiceMode && (
              <div className="per-question-timer-controls">
                <span className="timer per-question-timer">
                  問題時間: {(() => {
                    const currentQuestionId = currentQuestion?.id;
                    const questionTime = currentQuestionId ? state.perQuestionRemainingSeconds[currentQuestionId] : undefined;
                    if (questionTime === undefined) return "未開始";
                    if (questionTime >= 0) return secondsToClock(questionTime);
                    return `+${secondsToClock(Math.abs(questionTime))}`;
                  })()}
                  {state.perQuestionTimerPaused && " (一時停止)"}
                </span>
                <button
                  className="outline small"
                  onClick={togglePerQuestionTimerPause}
                  title={state.perQuestionTimerPaused ? "再開" : "一時停止"}
                >
                  {state.perQuestionTimerPaused ? "▶" : "⏸"}
                </button>
                <button className="outline small" onClick={resetPerQuestionTimer} title="リセット">
                  ↻
                </button>
              </div>
            )}
          </div>
          <div className="right-bottom">
            <button
              className="outline"
              onClick={() => {
                setReferenceTab("notes");
                setShowReference(true);
              }}
            >
              参考資料
            </button>
            <button className="outline" onClick={handleFinish}>
              終了
            </button>
          </div>
        </div>
      </header>

      {!state.mode && (
        <div className="overlay">
          <div className="overlay-content overlay-content--mode-select">
            <h3>{isMogi ? "模擬試験" : "モード選択"}</h3>
            <p>{isMogi ? "本番形式の模擬試験です。" : "開始するモードとオプションを選んでください。"}</p>
            <ModePicker isMogi={isMogi} onStart={startMode} />
            <a href="https://docs.google.com/document/d/1ZeSTp8iQiQnJuN79rt70V2k_TZDqRG-LwSipn162PPo/edit?usp=sharing" target="_blank" className="usage-link">サイトの使い方はこちら</a>
          </div>
        </div>
      )}

      {showGuidance && (
        <div className="overlay">
          <div className="overlay-content">
            <h3>ガイダンス</h3>
            <p>これから模擬試験{mogiSet === "r4" ? "（R4サンプル問題）" : "（1回目）"}を開始します。</p>
            <ul className="guidance-list" style={{ textAlign: "left", lineHeight: 1.8 }}>
              <li>問題数は{mogiSet === "r4" ? "20問（アルゴリズム16問＋情報セキュリティ4問）" : "アルゴリズム16問"}です。</li>
              <li>「試験開始」を押すと100分の計測が始まります。</li>
              <li>画面下の「一覧へ」で問題間を移動できます。迷った問題は「あとで見返す」に登録できます。</li>
              <li>解き終えたら右上の「終了」を押してください。採点結果が表示されます。</li>
              <li>途中でブラウザを閉じても、解答状況は保存されます。</li>
            </ul>
            <label
              style={{ display: "block", margin: "8px 0 16px", cursor: "pointer", fontSize: "0.9em" }}
            >
              <input
                type="checkbox"
                checked={reviewMode}
                onChange={(e) => setReviewMode(e.target.checked)}
              />{" "}
              復習モード（各問に「今すぐ採点」「解説へ」ボタンを表示）
            </label>
            <button onClick={() => setShowGuidance(false)}>試験開始</button>
            <button
              className="outline"
              onClick={() => {
                // 通常ページ（モード選択）へ戻る。開始前なので保存状態も残さない
                localStorage.removeItem(storageKey);
                window.location.href = window.location.pathname;
              }}
            >
              モード選択に戻る
            </button>
          </div>
        </div>
      )}

      {showResumePrompt && (
        <div className="overlay">
          <div className="overlay-content">
            <h3>前回の続きがあります</h3>
            <p>前回の模擬試験の解答状況が保存されています。続きから再開しますか？</p>
            <button onClick={() => setShowResumePrompt(false)}>続きから再開</button>
            <button
              className="outline"
              onClick={() => {
                // 最初からやり直す: 解答・残り時間をリセットしてガイダンスから
                setQuestionOverrides({});
                setState((prev) => ({
                  ...prev,
                  answers: {},
                  reviewFlags: {},
                  currentIndex: 0,
                  practiceMode: false,
                  remainingSeconds: MOGI_TIME,
                  mode: "exam"
                }));
                setShowResumePrompt(false);
                setShowGuidance(true);
              }}
            >
              最初からやり直す
            </button>
          </div>
        </div>
      )}

      <main className="layout" style={paneStyle}>
        {isMobile && (
          <div className="mobile-toggle">
            <button
              className={mobilePane === "question" ? "" : "outline"}
              onClick={() => setMobilePane("question")}
            >
              問題文
            </button>
            <button
              className={mobilePane === "choices" ? "" : "outline"}
              onClick={() => setMobilePane("choices")}
            >
              選択肢
            </button>
          </div>
        )}

        <section
          className={`pane question ${isMobile && mobilePane !== "question" ? "mobile-hidden" : ""}`}
          style={{
            fontSize: `${state.zoom}rem`,
            userSelect: state.instructorMode ? "text" : "none"
          }}
        >
          <div className="question-title-row">
            <h2>{isMogi && !state.instructorMode ? formatQuestionNumber(currentQuestion.number) : state.instructorMode ? currentQuestion.title : (Number.isInteger(currentQuestion.number) ? `${currentQuestion.number}問: ${currentQuestion.title}` : `${Math.floor(currentQuestion.number)}#問: ${currentQuestion.title}`)}</h2>
            {hitokotoDisplay ? <p className="hitokoto">{hitokotoDisplay}</p> : null}
          </div>
          {currentQuestion.questionText && <p>{currentQuestion.questionText}</p>}
          {currentQuestion.bodyBlocks && currentQuestion.bodyBlocks.length > 0 ? (
            <div className="question-body-html">
              {currentQuestion.bodyBlocks.map((block, idx) => renderBodyBlock(block, idx))}
            </div>
          ) : (
            <>
              {currentQuestion.bodyText && <p className="question-body-text">{currentQuestion.bodyText}</p>}
              {!currentQuestion.bodyText && currentQuestion.body && <p>{currentQuestion.body}</p>}
            </>
          )}
          {!currentQuestion.bodyBlocks?.length && <BodyTableView bt={currentQuestion.bodyTable} />}
          {currentQuestion.pseudoCode && (
            <div className="pseudo" key={currentQuestion.pseudoCode.join("\n")}>
              <div className="pseudo-header">
                <p className="pseudo-label">[プログラム]</p>
              </div>
              {currentQuestion.pseudoCode.map((line, idx) => (
                <div key={idx} className="pseudo-line">
                  <pre>{line}</pre>
                </div>
              ))}
            </div>
          )}
          {currentQuestion.choices?.length > 0 && (
            <div className="answer-group" aria-label="解答群">
              <p className="answer-group-title">[解答群]</p>
              {(() => {
                const ct = currentQuestion.choiceTable;
                const useTable =
                  ct &&
                  ct.headers.length > 0 &&
                  ct.rows.length === currentQuestion.choices.length &&
                  ct.rows.every((row) => row.length === ct.headers.length);
                if (useTable && ct) {
                  return (
                    <div className="choice-table-wrap">
                      <table className="choice-table">
                        <thead>
                          <tr>
                            <th scope="col" className="choice-table-corner" aria-hidden />
                            {ct.headers.map((h, hi) => (
                              <th key={hi} scope="col">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {currentQuestion.choices.map((c, idx) => {
                            const head = CHOICE_LABELS[idx] ?? "";
                            const row = ct.rows[idx];
                            return (
                              <tr key={c.id}>
                                <th scope="row" className="choice-table-rowhead">
                                  {head}
                                </th>
                                {row.map((cell, ci) => (
                                  <td key={ci}>{cell}</td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                return (
                  <ul className="answer-group-list">
                    {currentQuestion.choices.map((c, idx) => {
                      const head = CHOICE_LABELS[idx] ?? "";
                      return (
                        <li key={c.id} className="answer-group-item">
                          <span className="answer-group-label">{head}</span>
                          <span className="answer-group-text">{c.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>
          )}
        </section>

        <div className={`divider ${isMobile ? "mobile-hidden" : ""}`} ref={dividerRef} />

        <section className={`pane choices ${isMobile && mobilePane !== "choices" ? "mobile-hidden" : ""}`}>
          <div className="choices-header">
            {/* 講義・ヒントは通常演習のみ（模試では非表示） */}
            {state.perQuestionGrading && !isMogi && (
              <>
                {lessonUrlDisplay && (
                  <button
                    type="button"
                    className="outline lesson-link-btn"
                    onClick={() => window.open(lessonUrlDisplay, "_blank", "noopener,noreferrer")}
                  >
                    講義
                  </button>
                )}
                {hintVideoUrlDisplay && (
                  <button
                    type="button"
                    className="outline"
                    onClick={() => window.open(hintVideoUrlDisplay, "_blank", "noopener,noreferrer")}
                  >
                    ヒント
                  </button>
                )}
              </>
            )}
            {/* 今すぐ採点・解説へ: 通常演習、または模試の復習モードON時に表示 */}
            {((state.perQuestionGrading && !isMogi) || (isMogi && reviewMode)) && (
              <>
                <button className="outline" onClick={handleGradeNow}>
                  今すぐ採点
                </button>
                <button
                  type="button"
                  className="outline"
                  disabled={!(currentQuestion.videoUrl || currentQuestion.explanationUrl)}
                  onClick={() => {
                    // 動画ファースト: videoUrl があれば動画、無ければ解説記事へ
                    const url = currentQuestion.videoUrl || currentQuestion.explanationUrl;
                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  解説へ
                </button>
              </>
            )}
            {currentQuestion.another === 1 && (
              <>
                <button type="button" className="outline" onClick={handleAnotherRun}>
                  値を変えてもう一度
                </button>
                <button type="button" className="outline" onClick={handleAnotherReset} disabled={!isAnotherOverridden}>
                  元に戻す
                </button>
              </>
            )}
          </div>
          <div className={`choices-list ${state.reviewFlags[currentQuestion.id] ? "review-on" : ""}`}>
            {currentQuestion.choices.map((c, idx) => {
              const selected = state.answers[currentQuestion.id] === c.id;
              const head = CHOICE_LABELS[idx] ?? "";
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`choice-btn ${selected ? "selected" : ""}`}
                  onClick={() => handleAnswer(c.id)}
                  aria-pressed={selected}
                  aria-label={head ? `${head}: ${c.text}` : c.text}
                >
                  {head}
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="bottom-bar" aria-label="操作ボタン">
        <div className="bottom-bar-inner">
          <button type="button" className="outline" onClick={() => setShowList(true)}>
            一覧へ
          </button>
          <button
            type="button"
            onClick={handleReviewToggle}
            className={`${state.reviewFlags[currentQuestion.id] ? "outline active" : "outline"} review-btn`}
          >
            あとで見返す
          </button>
          <div className="nav-buttons">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="outline"
              disabled={state.currentIndex <= 0}
            >
              前へ
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              disabled={state.currentIndex >= questions.length - 1}
            >
              次へ
            </button>
          </div>
        </div>
      </footer>

      {showList && (
        <div className="overlay">
          <div className="overlay-content overlay-content--question-list">
            <div className="overlay-header">
              <h3>問題一覧</h3>
              <button className="outline" onClick={() => setShowList(false)}>
                閉じる
              </button>
            </div>
            <div className="question-list-scroll" role="region" aria-label="問題番号一覧">
              <div className="grid">
                {questions.map((q, idx) => {
                  const answered = Boolean(state.answers[q.id]);
                  const review = Boolean(state.reviewFlags[q.id]);
                  return (
                    <button
                      key={q.id}
                      onClick={() => jumpTo(idx)}
                      className={`grid-item ${idx === state.currentIndex ? "current" : ""} ${
                        answered ? "answered" : "unanswered"
                      } ${review ? "review" : ""}`}
                    >
                      {Number.isInteger(q.number) ? `問${q.number}` : `問${Math.floor(q.number)}#`}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="legend">
              <div className="legend-item">
                <span className="chip unanswered" />
                <span>未回答</span>
              </div>
              <div className="legend-item">
                <span className="chip answered" />
                <span>回答済み</span>
              </div>
              <div className="legend-item">
                <span className="chip review" />
                <span>あとで見返す</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReference && (
        <div className="overlay">
          <div className="overlay-content">
            <div className="overlay-header">
              <h3>参考資料</h3>
              <button className="outline" onClick={() => setShowReference(false)}>
                閉じる
              </button>
            </div>
            <div className="tabs" role="tablist" aria-label="参考資料タブ">
              <button
                type="button"
                role="tab"
                aria-selected={referenceTab === "notes"}
                className={`tab ${referenceTab === "notes" ? "active" : ""}`}
                onClick={() => setReferenceTab("notes")}
              >
                注意事項
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={referenceTab === "materials"}
                className={`tab ${referenceTab === "materials" ? "active" : ""}`}
                onClick={() => setReferenceTab("materials")}
              >
                資料
              </button>
            </div>
            <div className="tab-panel" role="tabpanel">
              {/* 中身は後で追加 */}
            </div>
          </div>
        </div>
      )}

      {showTimeUp && (
        <div className="overlay">
          <div className="overlay-content">
            <h3>時間切れです</h3>
            <p>「続ける」を押すとタイマー停止したまま練習モードで続行します。</p>
            <button onClick={markPracticeMode}>続ける（練習モード）</button>
          </div>
        </div>
      )}

      {showPerQuestionTimeUp && (
        <div className="overlay">
          <div className="overlay-content">
            <h3>5分経過しました</h3>
            <p>この問題の制限時間（5分）が経過しました。</p>
            <button onClick={() => setShowPerQuestionTimeUp(false)}>閉じる</button>
          </div>
        </div>
      )}

      {showResult && (
        <div className="overlay">
          <div className="overlay-content">
            <h3>採点結果</h3>
            {isMogi && (
              <p
                className="result-score"
                style={{ fontSize: "1.5em", fontWeight: "bold", margin: "0.2em 0 0.4em" }}
              >
                {resultSummary.correct * 50}点
                <span style={{ fontSize: "0.55em", fontWeight: "normal" }}> / 1000点（1問50点）</span>
              </p>
            )}
            <p>
              正答 {resultSummary.correct} / {resultSummary.total}
            </p>
            <p>未回答 {resultSummary.unanswered}</p>
            <div className="result-detail">
              {Array.from({ length: Math.ceil(resultDetails.length / 10) }, (_, row) => (
                <div
                  key={row}
                  className="result-row"
                  style={{ whiteSpace: "nowrap", lineHeight: 1.9 }}
                >
                  {resultDetails
                    .slice(row * 10, row * 10 + 10)
                    .map((d) => {
                      const mark =
                        d.status === "correct" ? "○" : d.status === "incorrect" ? "×" : "－";
                      return `問${d.number}${mark}`;
                    })
                    .join("　")}
                </div>
              ))}
            </div>
            <p className="result-note">※採点結果は記録されません。スクリーンショット等で保存してください（例: Windows+Shift+S）。</p>
            {mogiSet === "1" && (
              <div className="result-review">
                <a
                  className="result-review-link"
                  href="https://docs.google.com/document/d/1MNhQlraRNPBOnf-PFMSzMU5GPUkxLmxhEb8YyysK6ag/edit?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  (受けた後に読んでください)全体の振り返り
                </a>
              </div>
            )}
            <button
              className="outline"
              onClick={() => {
                setShowResult(false);
                if (isMogi) {
                  // 模擬試験はモード選択に戻らず、次の受験に備えてガイダンスからやり直し
                  setQuestionOverrides({});
                  setState((prev) => ({
                    ...prev,
                    mode: "exam",
                    practiceMode: false,
                    remainingSeconds: MOGI_TIME
                  }));
                  setShowGuidance(true);
                } else {
                  setState((prev) => ({ ...prev, mode: null }));
                }
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {gradeNowResult && (
        <div className="overlay">
          <div className="overlay-content">
            <h3>この問題の結果</h3>
            <p className="grade-now-question">
              {formatQuestionNumber(gradeNowResult.questionNumber)}: {gradeNowResult.questionTitle}
            </p>
            <div className="grade-now-image">
              {!gradeNowImageError ? (
                <img
                  src={gradeNowResult.imageSrc}
                  alt={`${formatQuestionNumber(gradeNowResult.questionNumber)}の画像`}
                  onError={() => setGradeNowImageError(true)}
                  loading="lazy"
                />
              ) : (
                <p className="grade-now-missing">（画像が見つかりません: {gradeNowResult.imageSrc}）</p>
              )}
            </div>
            {gradeNowResult.status === "correct" && <p>正解です！</p>}
            {gradeNowResult.status === "incorrect" && (
              <p>
                不正解。あなたの選択: {gradeNowResult.selectedLabel && `${gradeNowResult.selectedLabel}  ` }
                {gradeNowResult.selectedText}
              </p>
            )}
            {gradeNowResult.status === "unanswered" && <p>未回答です。</p>}
            <p>
              正解: {gradeNowResult.correctLabel && `${gradeNowResult.correctLabel}  `}
              {gradeNowResult.correctText}
            </p>
            {gradeNowResult.traceLines && gradeNowResult.traceLines.length > 0 && (
              <div className="grade-now-trace">
                <p>トレース結果</p>
                <pre>{gradeNowResult.traceLines.join("\n")}</pre>
              </div>
            )}
            <button className="outline" onClick={() => setGradeNowResult(null)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type ModePickerProps = {
  /** 模擬試験ページ（?mock=1）かどうか */
  isMogi?: boolean;
  onStart: (mode: "practice" | "exam", hideTimer: boolean, perQuestionGrading: boolean, perQuestionTimer: boolean, perQuestionTimerAlert: boolean, instructorMode: boolean) => void;
};

function ModePicker({ isMogi = false, onStart }: ModePickerProps) {
  const [mode, setMode] = useState<"practice" | "exam">(isMogi ? "exam" : "practice");
  const [hideTimer, setHideTimer] = useState(false);
  const [perQuestionGrading, setPerQuestionGrading] = useState(!isMogi);
  const [perQuestionTimer, setPerQuestionTimer] = useState(!isMogi);
  const [perQuestionTimerAlert, setPerQuestionTimerAlert] = useState(false);
  const [instructorMode, setInstructorMode] = useState(false);

  const isPractice = mode === "practice";
  const effectiveHideTimer = isPractice ? true : hideTimer;
  const effectivePerQuestionGrading = perQuestionGrading;
  const effectivePerQuestionTimer = perQuestionTimer;

  // 模擬試験は別URL（?mock=r4 / ?mock=1）で切り替える。モード選択からも相互に行き来できる
  const [showMogiMenu, setShowMogiMenu] = useState(false);
  const goMogi = (set: string) => {
    // 講師モードのチェックはURLパラメータで模試ページへ引き継ぐ
    window.location.href = `${window.location.pathname}?mock=${set}${instructorMode ? "&instructor=1" : ""}`;
  };
  const goPractice = () => {
    window.location.href = window.location.pathname;
  };

  return (
    <div className="mode-picker">
      <div className="mode-buttons">
        <button
          className={!isMogi && mode === "practice" ? "" : "outline"}
          onClick={() => {
            if (isMogi) {
              goPractice();
            } else {
              setMode("practice");
              setShowMogiMenu(false);
            }
          }}
        >
          問題演習
        </button>
        <button
          className={isMogi || showMogiMenu ? "" : "outline"}
          onClick={() => (isMogi ? undefined : setShowMogiMenu((v) => !v))}
        >
          模擬試験
        </button>
      </div>
      {!isMogi && showMogiMenu && (
        <div className="mode-buttons mogi-set-buttons" style={{ marginTop: "0.5em" }}>
          <button className="outline" onClick={() => goMogi("r4")}>
            R4サンプル
          </button>
          <button className="outline" onClick={() => goMogi("1")}>
            1回目
          </button>
          <button className="outline" disabled title="準備中">
            2回目(準備中)
          </button>
        </div>
      )}
      {!isMogi && !showMogiMenu ? (
        <div className="mode-options">
          <label className={isPractice ? "mode-option-fixed" : ""}>
            <input
              type="checkbox"
              checked={effectiveHideTimer}
              onChange={(e) => setHideTimer(e.target.checked)}
              disabled={isPractice}
            />{" "}
            100分数えない
          </label>
          <label>
            <input
              type="checkbox"
              checked={perQuestionGrading}
              onChange={(e) => setPerQuestionGrading(e.target.checked)}
            />{" "}
            問題ごとに採点
          </label>
          <label>
            <input
              type="checkbox"
              checked={perQuestionTimer}
              onChange={(e) => setPerQuestionTimer(e.target.checked)}
            />{" "}
            問題ごとに5分計る
          </label>
          {perQuestionTimer && (
            <label className="mode-option-indent">
              <input
                type="checkbox"
                checked={perQuestionTimerAlert}
                onChange={(e) => setPerQuestionTimerAlert(e.target.checked)}
              />{" "}
              5分経過をウィンドウで知らせる
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={instructorMode}
              onChange={(e) => setInstructorMode(e.target.checked)}
            />{" "}
            講師モード
          </label>
        </div>
      ) : (
        <div className="mode-options">
          <label>
            <input
              type="checkbox"
              checked={instructorMode}
              onChange={(e) => setInstructorMode(e.target.checked)}
            />{" "}
            講師モード
          </label>
        </div>
      )}
      {!(showMogiMenu && !isMogi) && (
        <button
          onClick={() =>
            onStart(
              isMogi ? "exam" : mode,
              isMogi ? false : effectiveHideTimer,
              isMogi ? false : effectivePerQuestionGrading,
              isMogi ? false : effectivePerQuestionTimer,
              isMogi ? false : perQuestionTimerAlert,
              instructorMode
            )
          }
        >
          開始
        </button>
      )}
      {(isMogi || showMogiMenu) && (
        <p className="mogi-note" style={{ fontSize: "0.85em", marginTop: "0.75em", textAlign: "left" }}>
          ※最初にガイダンス画面が表示されます｡試験開始ボタンを押した後､試験が開始され､100分の計測が始まります｡
        </p>
      )}
    </div>
  );
}

