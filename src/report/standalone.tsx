/**
 * 採点レポートの再生成ページ（report.html）。
 *
 * 単独で開いても何も表示しない。親ウィンドウ（集計レポートの管理画面）から
 * postMessage で受験データを渡されたときだけ、受験者が見たのと同じレポートを描く。
 *
 * ＝ 認証は親（管理画面）側で済んでいる前提。このページ自身は鍵もAPIも持たない。
 *
 * やりとり:
 *   親 → ここ : { type:"report:data", head, answers, setLabel? }
 *   ここ → 親 : { type:"report:height", height }  … iframe の高さ合わせ用
 *   ここ → 親 : { type:"report:ready" }           … データを送っていいタイミングの通知
 */

import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { REPORT_CSS, ResultReport } from "./View";
import { buildReportModel, fetchPopulation, type ReportModel, type ReportQuestion } from "./model";
import { REVIEW_NOTES } from "./notes";
import { buildExamReport } from "./zones";
import type { Question } from "../types";
import questionsData from "../data/questions.json";
import mogiQuestionsData from "../data/mogiQuestions.json";
import mogi2QuestionsData from "../data/mogi2Questions.json";
import r4ExtraData from "../data/r4Extra.json";

/** 母集団の取得先。App.tsx の STATS_ENDPOINT と同じ（population.json は認証不要） */
const STATS_ENDPOINT = "https://fe-mogi-stats.japason.workers.dev";

/** 模試の試験時間（秒）。App.tsx の MOGI_TIME と同じ */
const MOGI_TIME = 100 * 60;

/* ==================== 受け取るデータ ==================== */

type Head = {
  session_id?: string;
  client_id?: string;
  set_id: string;
  attempt?: number;
  elapsed_sec?: number;
  received_at?: string;
  set_rev?: number;
};

type Answer = {
  q_index: number;
  q_id?: string;
  q_number?: number;
  selected?: string;
  correct_id?: string;
  ok?: number;
  answered?: number;
  sec?: number;
  review?: number;
  overridden?: number;
};

type Payload = { type: string; head: Head; answers: Answer[] };

/* ==================== 問題の見出しを引く ==================== */

/**
 * q_id → 問題（見出し・解説リンク）。
 * どのセットの問題かを気にせず id だけで引けるよう、全部まとめて1つの Map にする。
 * 出題順・問番号は DB 側（q_index / q_number）が持っているので、ここでは並びを作らない。
 */
const BY_ID: Map<string, Question> = (() => {
  const m = new Map<string, Question>();
  const all = [
    ...(questionsData as Question[]),
    ...(r4ExtraData as Question[]),
    ...(mogi2QuestionsData as Question[]),
    ...(mogiQuestionsData as Question[])
  ];
  for (const q of all) m.set(q.id, q);
  return m;
})();

function setLabelOf(set: string): string {
  if (set === "2") return "模擬試験②";
  if (set === "r4") return "R4サンプル模試";
  return "模擬試験①";
}

/* ==================== 組み立て ==================== */

function buildModel(p: Payload, pop: Parameters<typeof buildReportModel>[1]): ReportModel {
  const rows = [...p.answers].sort((a, b) => a.q_index - b.q_index);

  const questions: ReportQuestion[] = rows.map((a) => {
    const meta = a.q_id ? BY_ID.get(a.q_id) : undefined;
    const n = Math.floor(a.q_number ?? a.q_index);
    return {
      id: a.q_id || `q${a.q_index}`,
      slug: meta?.slug,
      n,
      // 改訂前の q_id は今の問題データに無い。そのときは問番号だけ出す
      title: meta?.title || `問${n}`,
      ok: a.ok === 1,
      answered: a.answered === 1,
      sec: a.sec || 0,
      url: meta?.videoUrl || meta?.explanationUrl
    };
  });

  const report = buildExamReport(
    p.head.set_id,
    questions.map((q) => ({ n: q.n, ok: q.ok, answered: q.answered, sec: q.sec }))
  );

  return buildReportModel(
    {
      set: p.head.set_id,
      setLabel: setLabelOf(p.head.set_id),
      date: p.head.received_at ? new Date(p.head.received_at) : new Date(),
      elapsedSec: p.head.elapsed_sec || 0,
      totalSec: MOGI_TIME,
      // 受験者が見る画面と同じく、受験コード（client_id の先頭8桁）を載せる
      examCode: (p.head.client_id || "").slice(0, 8) || null,
      questions,
      report,
      reviewNotes: REVIEW_NOTES
    },
    pop
  );
}

/* ==================== 画面 ==================== */

function App() {
  const [model, setModel] = useState<ReportModel | null>(null);
  const [rev, setRev] = useState<number | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data as Payload;
      if (!d || d.type !== "report:data" || !d.head || !Array.isArray(d.answers)) return;
      setRev(typeof d.head.set_rev === "number" ? d.head.set_rev : null);
      // 母集団は「あれば載せる」。取れなくてもレポートは成立する
      setModel(buildModel(d, null));
      fetchPopulation(STATS_ENDPOINT, d.head.set_id).then((pop) => {
        if (pop) setModel(buildModel(d, pop));
      });
    };
    window.addEventListener("message", onMessage);
    // 親がまだデータを送っていない場合に備えて、こちらから準備完了を知らせる
    try {
      window.parent?.postMessage({ type: "report:ready" }, "*");
    } catch {
      /* 単独で開かれたときは親がいない */
    }
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // 描画のたびに高さを親へ返す（iframe のスクロールバーを出さないため）
  useEffect(() => {
    if (!model) return;
    const send = () => {
      const h = document.documentElement.scrollHeight;
      try {
        window.parent?.postMessage({ type: "report:height", height: h }, "*");
      } catch {
        /* 親がいなければ何もしない */
      }
    };
    send();
    const t = setTimeout(send, 300);
    return () => clearTimeout(t);
  }, [model]);

  if (!model) {
    return (
      <p style={{ padding: "40px", color: "#64748b", fontFamily: "sans-serif" }}>
        このページは管理画面から受験データを渡されたときだけ表示されます。
      </p>
    );
  }

  return (
    <div style={{ padding: "24px 18px 48px" }}>
      <style>{REPORT_CSS}</style>
      {rev !== null && (
        <p style={{ maxWidth: 820, margin: "0 auto 12px", color: "#64748b", fontSize: "0.85rem", fontFamily: "sans-serif" }}>
          受験時の版: v{rev}
          {" ／ "}
          問題文・解説リンクは現在の版のものを表示しています。
        </p>
      )}
      {/* forScreen=false: 採点直後にだけ出すメッセージや保存ボタンは管理画面には要らない */}
      <ResultReport model={model} forScreen={false} />
    </div>
  );
}

const el = document.getElementById("root");
if (el) createRoot(el).render(<App />);
