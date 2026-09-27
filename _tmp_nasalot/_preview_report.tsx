// レポートの見た目確認用。静的HTMLを1枚吐くだけ（本番コードからは参照されない）
import { buildReportModel, type ReportQuestion } from "./src/report/model";
import { buildExamReport } from "./src/report/zones";
import { buildReportHtml } from "./src/report/View";
import { REVIEW_NOTES } from "./src/report/notes";
import mogi from "./src/data/mogiQuestions.json";
import * as fs from "node:fs";

const qs = (mogi as any[]).slice().sort((a, b) => a.number - b.number);
const OK = [1, 2, 3, 6, 7, 9, 11, 12, 14, 18, 19];   // 正解した問
const SEC: Record<number, number> = { 1: 94, 2: 46, 3: 280, 4: 141, 5: 190, 6: 130, 7: 57, 8: 274, 9: 182, 10: 195, 11: 180, 12: 200, 13: 241, 14: 311, 15: 299, 16: 174, 17: 162, 18: 105, 19: 164, 20: 227 };

const questions: ReportQuestion[] = qs.map((q) => ({
  id: q.id, slug: q.slug, n: q.number, title: q.title,
  ok: OK.includes(q.number), answered: q.number !== 15, sec: SEC[q.number] || 120,
  url: q.videoUrl || q.explanationUrl
}));

const report = buildExamReport("1", questions.map((q) => ({ n: q.n, ok: q.ok, answered: q.answered, sec: q.sec })));
const model = buildReportModel({
  set: "1", setLabel: "模擬試験①", date: new Date("2026-09-18"),
  elapsedSec: 82 * 60, totalSec: 100 * 60, examCode: "K7M2QX4B",
  questions, report, reviewNotes: REVIEW_NOTES
}, null);

fs.writeFileSync("_tmp_nasalot/report_preview.html", buildReportHtml(model));
console.log("score", model.score, "/ written");
