/**
 * 模擬試験の結果レポート（画面表示とダウンロードの両方で使う）。
 *
 * 画面: <ResultReport model={...} /> を採点画面に置く
 * 保存: downloadReport(model) → 同じコンポーネントを renderToStaticMarkup して1枚の HTML に固める
 *
 * 計算は reportEngine.ts、文言のルールは reportRules.ts。ここは見た目だけ。
 * CSS はクラス名を rr- で始めて、サイト側のスタイルと混ざらないようにしている。
 */

import { renderToStaticMarkup } from "react-dom/server";
import type { ReportLine, ZoneReport } from "./examReport";
import {
  FULL_SCORE, GUIDE_SEC, OVER_SEC, PASS_SCORE,
  fmtDate, fmtDelta, fmtSec,
  type DiagnosisLine, type ReportModel, type ReviewItem, type PopulationTable
} from "./reportEngine";

/* ==================== スタイル ==================== */

export const REPORT_CSS = `
.rr{--rr-ink:#1f2937;--rr-muted:#64748b;--rr-line:#e5e7eb;--rr-acc:#1f3864;--rr-blue:#2563eb;--rr-red:#dc2626;--rr-amber:#f59e0b;--rr-soft:#f8fafc;
  color:var(--rr-ink);font-size:15px;line-height:1.7;text-align:left;max-width:820px;margin:0 auto}
.rr *{box-sizing:border-box}
.rr-header{border-bottom:2px solid var(--rr-acc);padding-bottom:12px;margin-bottom:20px;display:flex;flex-wrap:wrap;gap:6px 24px;align-items:baseline}
.rr-header h1{font-size:1.3rem;margin:0;color:var(--rr-acc)}
.rr-meta{color:var(--rr-muted);font-size:.9rem;margin:4px 0}
.rr-meta b{font-family:ui-monospace,Menlo,monospace;letter-spacing:.12em;color:var(--rr-ink)}
.rr h2{font-size:1.05rem;margin:30px 0 10px;padding-left:10px;border-left:4px solid var(--rr-acc)}
.rr-hero{display:grid;grid-template-columns:auto 1fr;gap:16px 28px;align-items:center;background:var(--rr-soft);border:1px solid var(--rr-line);border-radius:12px;padding:18px 22px}
.rr-score{font-size:3rem;font-weight:800;line-height:1;color:var(--rr-acc)}
.rr-score small{font-size:1rem;color:var(--rr-muted);font-weight:400;margin-left:6px}
.rr-kpis{display:flex;flex-wrap:wrap;gap:8px 22px;font-size:.95rem}
.rr-kpis b{font-size:1.15rem}
.rr-line{position:relative;height:14px;background:#e2e8f0;border-radius:7px;margin-top:12px;grid-column:1/-1}
.rr-line .f{position:absolute;left:0;top:0;bottom:0;background:var(--rr-blue);border-radius:7px}
.rr-line .p{position:absolute;top:-5px;bottom:-5px;width:2px;background:var(--rr-red)}
.rr-line .pl{position:absolute;top:16px;transform:translateX(-50%);font-size:.75rem;color:var(--rr-red);white-space:nowrap}
.rr-band{margin:12px 0 0;padding:12px 16px;border-left:4px solid var(--rr-blue);background:#eaf1fe;border-radius:0 8px 8px 0;font-size:.98rem}
.rr-band b{color:var(--rr-acc)}
.rr-band .link{display:block;font-size:.9em;margin-top:4px}
.rr-zone{margin:10px 0}
.rr-zone-head{display:grid;grid-template-columns:1.4em 1fr auto auto;gap:10px;align-items:baseline;font-weight:600}
.rr-zone small{color:var(--rr-muted);font-weight:400;font-size:.85em}
.rr-zscore{font-variant-numeric:tabular-nums}
.rr-zquota{color:var(--rr-muted);font-weight:400;font-size:.85em}
.rr-zone.miss .rr-zone-head{color:var(--rr-red)}
.rr-bar{position:relative;height:10px;background:#e2e8f0;border-radius:5px;margin:4px 0 0 1.9em}
.rr-bar .fill{height:100%;background:var(--rr-blue);border-radius:5px}
.rr-zone.miss .fill{background:var(--rr-amber)}
.rr-bar .quota{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--rr-ink);opacity:.55}
.rr-zcomment{margin:2px 0 0 1.9em;font-size:.92em;color:#334155}
.rr table{border-collapse:collapse;width:100%;font-size:.92rem}
.rr th,.rr td{border-bottom:1px solid var(--rr-line);padding:8px;vertical-align:top;text-align:left}
.rr th{background:var(--rr-soft);font-size:.85rem;color:var(--rr-muted);white-space:nowrap}
.rr td.c,.rr th.c{text-align:center;white-space:nowrap}
.rr td.cm{color:#334155;font-size:.9em}
.rr .sub{color:var(--rr-muted);font-size:.8em}
.rr td.over{color:var(--rr-red);font-weight:700}
.rr a{color:var(--rr-blue);font-weight:600;text-decoration:none}
.rr a:hover{text-decoration:underline}
.rr-tw{overflow-x:auto}
.rr-zp th,.rr-zp td{font-variant-numeric:tabular-nums}
.rr-zp th small,.rr-zp td small{display:block;font-weight:400;color:var(--rr-muted);font-size:.72em}
.rr-zp .me{background:#eaf1fe}
.rr-zp th.me{color:var(--rr-blue)}
.rr-zp td.you{font-weight:800;font-size:1.05em;border-left:2px solid var(--rr-blue)}
.rr-zp th.you{border-left:2px solid var(--rr-blue)}
.rr-zp td.low{color:var(--rr-red)}
.rr-legend{display:flex;flex-wrap:wrap;gap:16px;font-size:.82rem;color:var(--rr-muted);margin:4px 0 0}
.rr-legend i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;margin-right:4px}
.rr-diag{padding-left:1.3em;margin:8px 0}
.rr-diag li{margin:6px 0}
.rr-diag li.good::marker{content:"◎ "}
.rr-diag li.warn::marker{content:"△ "}
.rr-diag li.info::marker{content:"・ "}
.rr-diag .link{display:block;font-size:.9em;margin-top:2px}
.rr-next{background:var(--rr-soft);border:1px solid var(--rr-line);border-radius:12px;padding:14px 20px;margin-top:24px}
.rr-next ol{margin:6px 0 0;padding-left:1.4em}
.rr-footer{margin-top:32px;color:var(--rr-muted);font-size:.8rem;border-top:1px solid var(--rr-line);padding-top:12px}
@media print{ .rr{font-size:12.5px} .rr a::after{content:" (" attr(href) ")";font-size:.75em;color:var(--rr-muted);font-weight:400} .rr h2{break-after:avoid} .rr table,.rr svg,.rr-hero,.rr-next{break-inside:avoid} }
@media (max-width:560px){ .rr-hero{grid-template-columns:1fr} .rr-score{font-size:2.4rem} .rr td.cm{display:none} }
`;

/* ==================== 部品 ==================== */

const pct = (v: number, max: number) => `${Math.max(0, Math.min(100, (v / max) * 100)).toFixed(1)}%`;
const marker = (tone: ReportLine["tone"]) => tone; // クラス名 = tone

function Hero({ m }: { m: ReportModel }) {
  const diff = m.score - PASS_SCORE;
  return (
    <div className="rr-hero">
      <div className="rr-score">
        {m.score}
        <small>/ {FULL_SCORE}点</small>
      </div>
      <div className="rr-kpis">
        <span>
          合格ライン {PASS_SCORE}点まで{" "}
          <b style={{ color: diff >= 0 ? "var(--rr-blue)" : "var(--rr-red)" }}>
            {diff >= 0 ? `+${diff}` : `${diff}`}
          </b>
        </span>
        <span>
          正答 <b>{m.correct}</b> / {m.input.questions.length}
        </span>
        <span>
          誤答 <b>{m.wrong}</b>
        </span>
        <span>
          未回答 <b>{m.unanswered}</b>
        </span>
      </div>
      <div className="rr-line">
        <div className="f" style={{ width: pct(m.score, FULL_SCORE) }} />
        <div className="p" style={{ left: pct(PASS_SCORE, FULL_SCORE) }} />
        <div className="pl" style={{ left: pct(PASS_SCORE, FULL_SCORE) }}>合格ライン {PASS_SCORE}</div>
      </div>
    </div>
  );
}

function PopulationSection({ t }: { t: PopulationTable }) {
  const bands = t.rows[0]?.cells ?? [];
  const lows = t.rows.filter((r) => r.low).map((r) => r.zone.name);
  return (
    <>
      <h2>得点帯ごとの正解数 — あなたはどこにいるか</h2>
      <p className="rr-meta">
        受験者{t.n}人を得点帯に分けて、ゾーンごとの平均正解数を並べたもの。色付きの列があなたの帯、右端があなた。
        <b>帯の平均より低いゾーン</b>が赤字＝そこが伸びしろ。
      </p>
      <div className="rr-tw">
        <table className="rr-zp">
          <thead>
            <tr>
              <th>ゾーン</th>
              {bands.map((c) => (
                <th key={c.band} className={`c${c.band === t.myBand ? " me" : ""}`}>
                  {c.band}
                  {t.showBandCounts && <small>{c.n}人</small>}
                </th>
              ))}
              <th className="c me you">あなた</th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r) => (
              <tr key={r.zone.name}>
                <td>
                  {r.zone.name}
                  <small>{r.zone.total}問</small>
                </td>
                {r.cells.map((c) => (
                  <td key={c.band} className={`c${c.band === t.myBand ? " me" : ""}`}>
                    {c.avg === null ? "—" : c.avg.toFixed(1)}
                  </td>
                ))}
                <td className={`c me you${r.low ? " low" : ""}`}>{r.you}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!t.myBandComparable && (
        <p className="rr-meta">
          あなたの得点帯（{t.myBand}点）は、まだ人数が少ないため比較を省略しています。
        </p>
      )}
      {lows.length > 0 && (
        <p className="rr-meta">
          同じ得点帯の平均を下回っているのは <b>{lows.join("・")}</b>。ここを埋めると帯が一つ上がります。
        </p>
      )}
      <p className="rr-meta">※「—」は、まだ人数が少なく平均を出していない得点帯です。</p>
    </>
  );
}

function ZoneSection({ zones }: { zones: ZoneReport[] }) {
  const quotaSum = zones.reduce((a, z) => a + z.quota, 0);
  return (
    <>
      <h2>ゾーン別の達成度</h2>
      <p className="rr-meta">
        ノルマ（縦線）は「合格ライン{PASS_SCORE}点を安定して超えるための目安」。合計{quotaSum}問＝{quotaSum * 50}点。
      </p>
      {zones.map((z) => (
        <div key={z.name} className={`rr-zone ${z.met ? "met" : "miss"}`}>
          <div className="rr-zone-head">
            <span>{z.met ? "◎" : "△"}</span>
            <span>
              {z.name} <small>{z.range}</small>
            </span>
            <span className="rr-zscore">
              {z.got}/{z.total}
            </span>
            <span className="rr-zquota">ノルマ {z.quota}</span>
          </div>
          <div className="rr-bar">
            <div className="fill" style={{ width: pct(z.got, z.total) }} />
            <div className="quota" style={{ left: pct(z.quota, z.total) }} />
          </div>
          {z.comments.map((c, i) => (
            <div key={i} className="rr-zcomment">
              {c.text}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function ReviewSection({ items, hasTime }: { items: ReviewItem[]; hasTime: boolean }) {
  return (
    <>
      <h2>復習リスト — 間違えた問題・未回答・時間をかけすぎた問題</h2>
      <p className="rr-meta">上から順に。基礎ゾーンの取りこぼしが最優先、クセの強い問題は余裕があれば。正解でも8分を超えた問題は末尾に載せています。</p>
      <table>
        <thead>
          <tr>
            <th className="c">問</th>
            <th>問題</th>
            <th className="c">結果</th>
            {hasTime && <th className="c">所要</th>}
            <th>見るポイント</th>
            <th className="c">解説</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.q.id}>
              <td className="c">問{it.q.n}</td>
              <td>
                {it.q.title}
                {it.zone && <div className="sub">{it.zone}</div>}
              </td>
              <td className="c">{it.result}</td>
              {hasTime && <td className={`c${it.q.sec >= OVER_SEC ? " over" : ""}`}>{it.q.sec > 0 ? fmtSec(it.q.sec) : "—"}</td>}
              <td className="cm">{it.comment}</td>
              <td className="c">
                {it.q.url ? (
                  <a href={it.q.url} target="_blank" rel="noopener noreferrer">
                    解説 ›
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** 各問の所要時間の棒グラフ（SVG）。青=正解 / 橙=誤答 / 灰=未回答 / 赤=8分超 */
function TimeChart({ m }: { m: ReportModel }) {
  const qs = m.input.questions;
  const BAR = 22, GAP = 10, LEFT = 16, TOP = 12, BASE = 150, LABEL_Y = 166, H = 190;
  const RIGHT = 96; // 目安ラインのラベル置き場
  const W = LEFT + qs.length * (BAR + GAP) + RIGHT;
  const maxSec = Math.max(OVER_SEC * 1.25, ...qs.map((q) => q.sec));
  const yOf = (sec: number) => BASE - (sec / maxSec) * (BASE - TOP);
  const color = (q: (typeof qs)[number]) =>
    q.sec >= OVER_SEC ? "#dc2626" : !q.answered ? "#cbd5e1" : q.ok ? "#2563eb" : "#f59e0b";
  return (
    <>
      <h2>各問の所要時間</h2>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="各問の所要時間">
        <line x1={LEFT - 4} x2={W - 4} y1={yOf(GUIDE_SEC)} y2={yOf(GUIDE_SEC)} stroke="#94a3b8" strokeDasharray="4 4" />
        <text x={W - 6} y={yOf(GUIDE_SEC) - 4} textAnchor="end" fontSize="11" fill="#64748b">
          5分（目安）
        </text>
        <line x1={LEFT - 4} x2={W - 4} y1={yOf(OVER_SEC)} y2={yOf(OVER_SEC)} stroke="#dc2626" strokeDasharray="4 4" />
        <text x={W - 6} y={yOf(OVER_SEC) - 4} textAnchor="end" fontSize="11" fill="#dc2626">
          8分（かけすぎ）
        </text>
        {qs.map((q, i) => {
          const x = LEFT + i * (BAR + GAP);
          const y = yOf(q.sec);
          return (
            <g key={q.id}>
              <rect x={x} y={y} width={BAR} height={Math.max(2, BASE - y)} rx="3" fill={color(q)} />
              {q.sec >= OVER_SEC && (
                <text x={x + BAR / 2} y={y - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#dc2626">
                  {Math.round(q.sec / 6) / 10}分
                </text>
              )}
              <text x={x + BAR / 2} y={LABEL_Y} textAnchor="middle" fontSize="11" fill="#475569">
                {q.n}
              </text>
            </g>
          );
        })}
        <line x1={LEFT - 4} x2={W - 4} y1={BASE} y2={BASE} stroke="#cbd5e1" />
      </svg>
      <div className="rr-legend">
        <span><i style={{ background: "#2563eb" }} />正解</span>
        <span><i style={{ background: "#f59e0b" }} />誤答</span>
        <span><i style={{ background: "#cbd5e1" }} />未回答</span>
        <span><i style={{ background: "#dc2626" }} />8分超</span>
      </div>
    </>
  );
}

function DiagnosisSection({ m }: { m: ReportModel }) {
  // 得点そのものへの総評は得点帯の一言（BAND_COMMENTS）が担当。ここはルールの診断だけ
  const lines = m.diagnosis;
  if (lines.length === 0) return null;
  return (
    <>
      <h2>診断</h2>
      <ul className="rr-diag">
        {lines.map((l, i) => (
          <li key={i} className={marker(l.tone)}>
            {l.text}
            {"link" in l && l.link && (
              <a className="link" href={l.link.url} target="_blank" rel="noopener noreferrer">
                ▶ 動画: {l.link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function TimeUsageSection({ m }: { m: ReportModel }) {
  const time = m.input.report?.time ?? [];
  const split = m.timeSplit;
  if (time.length === 0 && !split) return null;
  return (
    <>
      <h2>時間の使い方</h2>
      <ul className="rr-diag">
        {time.map((l, i) => (
          <li key={i} className={marker(l.tone)}>
            {l.text}
          </li>
        ))}
        {split && (
          <li className="info">
            序盤に取る問（{split.openingLabel}）に {fmtSec(split.openingSec)}
            （目安{fmtSec(split.openingTargetSec)}に対して {fmtDelta(split.openingSec - split.openingTargetSec)}）、
            その他（{split.restLabel}）に {fmtSec(split.restSec)}
            （目安{fmtSec(split.restTargetSec)}に対して {fmtDelta(split.restSec - split.restTargetSec)}）。
          </li>
        )}
      </ul>
    </>
  );
}

/* ==================== 本体 ==================== */

/** withStyle: 画面表示では CSS を同梱する。buildReportHtml は <head> に入れるので false */
export function ResultReport({ model: m, withStyle = true }: { model: ReportModel; withStyle?: boolean }) {
  const { input } = m;
  return (
    <div className="rr">
      {withStyle && <style>{REPORT_CSS}</style>}
      <div className="rr-header">
        <h1>基本情報 科目B {input.setLabel} 結果レポート</h1>
        <span className="rr-meta">
          受験日 {fmtDate(input.date)}
          {m.hasTime && <>　所要 {fmtSec(input.elapsedSec)} / {Math.round(input.totalSec / 60)}分</>}
          {input.examCode && <>　受験コード <b>{input.examCode}</b></>}
        </span>
      </div>

      <Hero m={m} />
      {m.bandComment && (
        <div className="rr-band">
          <b>{m.score}点のあなたへ：</b>{m.bandComment.text}
          {m.bandComment.link && (
            <a className="link" href={m.bandComment.link.url} target="_blank" rel="noopener noreferrer">
              ▶ 動画: {m.bandComment.link.label}
            </a>
          )}
        </div>
      )}

      <DiagnosisSection m={m} />
      {m.population && <PopulationSection t={m.population} />}
      {input.report && <ZoneSection zones={input.report.zones} />}
      {m.review.length > 0 && <ReviewSection items={m.review} hasTime={m.hasTime} />}
      {m.hasTime ? (
        <TimeChart m={m} />
      ) : (
        <>
          <h2>各問の所要時間</h2>
          <p className="rr-meta">所要時間が記録されていないため、時間の分析は省略しています。</p>
        </>
      )}
      <TimeUsageSection m={m} />

      {m.nextSteps.length > 0 && (
        <div className="rr-next">
          <b>次にやること</b>
          <ol>
            {m.nextSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="rr-footer">
        このレポートはお使いのブラウザで生成されたもので、サーバーには保存されていません。
        受験コードは合格報告フォームに記入していただくと、模擬試験と本番の点数を突き合わせた分析ができます。　科目B 演習サイト
      </div>
    </div>
  );
}

/* ==================== ダウンロード ==================== */

/** 1枚の HTML として書き出す（画面と同じコンポーネント・同じ CSS） */
export function buildReportHtml(model: ReportModel): string {
  const title = `${model.input.setLabel} 結果レポート ${fmtDate(model.input.date)}`;
  const body = renderToStaticMarkup(<ResultReport model={model} withStyle={false} />);
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body{margin:0;background:#fff;font-family:-apple-system,"Segoe UI","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif}
.rr{padding:36px 22px 72px}
@media print{.rr{padding:0}}
${REPORT_CSS}
</style></head><body>${body}</body></html>`;
}

export function reportFileName(model: ReportModel): string {
  const d = fmtDate(model.input.date).replace(/\//g, "");
  return `${model.input.setLabel}_結果レポート_${d}_${model.score}点.html`;
}

/** ブラウザに保存させる */
export function downloadReport(model: ReportModel): void {
  const blob = new Blob([buildReportHtml(model)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = reportFileName(model);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** 別タブで開く（印刷や PDF 保存向け） */
export function openReport(model: ReportModel): void {
  const blob = new Blob([buildReportHtml(model)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
