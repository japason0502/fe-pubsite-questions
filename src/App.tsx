import { useEffect, useMemo, useRef, useState } from "react";
import questionsData from "./data/questions.json";
import { ExamState, Question } from "./types";
import { generateAnotherQuestion } from "./anotherQuestionGenerators";

const STORAGE_KEY = "exam-state";
const DEFAULT_TIME = 30 * 60; // 30 分
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

function loadState(): ExamState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;
  try {
    const parsed = JSON.parse(raw) as Partial<ExamState>;
    return { ...initialState, ...parsed };
  } catch {
    return initialState;
  }
}

function saveState(state: ExamState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  const questions = useMemo<Question[]>(() => questionsData as Question[], []);
  const [questionOverrides, setQuestionOverrides] = useState<Record<string, Partial<Question>>>({});
  const [state, setState] = useState<ExamState>(() => loadState());
  const [showList, setShowList] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
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
  const dividerRef = useRef<HTMLDivElement | null>(null);

  // state 永続化
  useEffect(() => {
    saveState(state);
  }, [state]);

  // タイマー（全体）※100分数えないのときは計測しない
  useEffect(() => {
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
  }, [state.hideTimer, state.practiceMode, state.remainingSeconds]);

  // タイマー（問題ごと）
  useEffect(() => {
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
  }, [state.perQuestionTimer, state.practiceMode, state.perQuestionTimerPaused, state.currentIndex, state.perQuestionRemainingSeconds, questions]);

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
    setState((prev) => {
      const newState = {
        ...initialState,
        ...prev,
        mode,
        hideTimer,
        practiceMode: false,
        remainingSeconds: DEFAULT_TIME,
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
        imageSrc: getQuestionImageSrc(q.number),
        traceLines: q.anotherTraceLines
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
      imageSrc: getQuestionImageSrc(q.number),
      traceLines: q.anotherTraceLines
    });
  };

  const handleAnotherRun = () => {
    if (!currentQuestion || currentQuestion.another !== 1) return;
    const generated = generateAnotherQuestion(currentQuestion);
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
    <div className="app">
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
            <h3>モード選択</h3>
            <p>開始するモードとオプションを選んでください。</p>
            <ModePicker onStart={startMode} />
            <a href="https://docs.google.com/document/d/1ZeSTp8iQiQnJuN79rt70V2k_TZDqRG-LwSipn162PPo/edit?usp=sharing" target="_blank" className="usage-link">サイトの使い方はこちら</a>
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
            <h2>{state.instructorMode ? currentQuestion.title : (Number.isInteger(currentQuestion.number) ? `${currentQuestion.number}問: ${currentQuestion.title}` : `${Math.floor(currentQuestion.number)}#問: ${currentQuestion.title}`)}</h2>
            {currentQuestion.hitokoto && (
              <p className="hitokoto">{currentQuestion.hitokoto}</p>
            )}
          </div>
          {currentQuestion.questionText && currentQuestion.bodyText ? (
            <>
              <p>{currentQuestion.questionText}</p>
              <p>{currentQuestion.bodyText}</p>
            </>
          ) : (
            currentQuestion.body && <p>{currentQuestion.body}</p>
          )}
          {currentQuestion.pseudoCode && (
            <div className="pseudo">
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
            </div>
          )}
        </section>

        <div className={`divider ${isMobile ? "mobile-hidden" : ""}`} ref={dividerRef} />

        <section className={`pane choices ${isMobile && mobilePane !== "choices" ? "mobile-hidden" : ""}`}>
          <div className="choices-header">
            {state.perQuestionGrading && (
              <>
                {currentQuestion.hintVideoUrl && (
                  <button
                    type="button"
                    className="outline"
                    onClick={() => window.open(currentQuestion.hintVideoUrl, "_blank", "noopener,noreferrer")}
                  >
                    ヒント
                  </button>
                )}
                <button className="outline" onClick={handleGradeNow}>
                  今すぐ採点
                </button>
                <button
                  type="button"
                  className="outline"
                  disabled={!currentQuestion.videoUrl}
                  onClick={() => currentQuestion.videoUrl && window.open(currentQuestion.videoUrl, "_blank", "noopener,noreferrer")}
                >
                  解説動画へ
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
          <div className="overlay-content">
            <div className="overlay-header">
              <h3>問題一覧</h3>
              <button className="outline" onClick={() => setShowList(false)}>
                閉じる
              </button>
            </div>
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
            <p>
              正答 {resultSummary.correct} / {resultSummary.total}
            </p>
            <p>未回答 {resultSummary.unanswered}</p>
            <p className="result-detail">
              {resultDetails.map((d) => {
                const mark = d.status === "correct" ? "○" : d.status === "incorrect" ? "×" : "";
                return `問${d.number}${mark}`;
              }).join(" ")}
            </p>
            <p className="result-note">※採点結果は記録されません。スクリーンショット等で保存してください（例: Windows+Shift+S）。</p>
            <button
              className="outline"
              onClick={() => {
                setShowResult(false);
                setState((prev) => ({ ...prev, mode: null }));
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
  onStart: (mode: "practice" | "exam", hideTimer: boolean, perQuestionGrading: boolean, perQuestionTimer: boolean, perQuestionTimerAlert: boolean, instructorMode: boolean) => void;
};

function ModePicker({ onStart }: ModePickerProps) {
  const [mode, setMode] = useState<"practice" | "exam">("practice");
  const [hideTimer, setHideTimer] = useState(false);
  const [perQuestionGrading, setPerQuestionGrading] = useState(true);
  const [perQuestionTimer, setPerQuestionTimer] = useState(true);
  const [perQuestionTimerAlert, setPerQuestionTimerAlert] = useState(false);
  const [instructorMode, setInstructorMode] = useState(false);

  const isPractice = mode === "practice";
  const effectiveHideTimer = isPractice ? true : hideTimer;
  const effectivePerQuestionGrading = perQuestionGrading;
  const effectivePerQuestionTimer = perQuestionTimer;

  return (
    <div className="mode-picker">
      <div className="mode-buttons">
        <button className={mode === "practice" ? "" : "outline"} onClick={() => setMode("practice")}>
          問題演習
        </button>
        {/* <button className={mode === "exam" ? "" : "outline"} onClick={() => setMode("exam")}>
          模擬試験
        </button> */}
      </div>
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
      <button onClick={() => onStart(mode, effectiveHideTimer, effectivePerQuestionGrading, effectivePerQuestionTimer, perQuestionTimerAlert, instructorMode)}>開始</button>
    </div>
  );
}

