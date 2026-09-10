/**
 * 結果レポートの計算部分（表示なし・副作用なし）。
 *
 * 役割分担:
 *   examReport.ts  … ゾーン分け・ノルマ・ゾーンごとのコメント（従来どおり）
 *   reportRules.ts … 人レベルの診断ルール（文言はここだけ触る）
 *   reportEngine.ts… 上の2つと受験データから、レポートに載せる材料を組み立てる（このファイル）
 *   ResultReport.tsx… 材料を HTML にする
 *
 * 母集団（/population.json）は「あれば載せる」。取れなくてもレポートは成立する。
 */

import type { ExamReport, ReportRow, ZoneReport } from "./examReport";
import type { Rule, RuleWhen, Zone } from "./reportRules";
import { BAND_COMMENTS, MAX_LINES, RULES } from "./reportRules";

/* ==================== 入力 ==================== */

/** 1問ぶんの受験結果＋見出し情報 */
export type ReportQuestion = ReportRow & {
  id: string;
  /** 見るポイントの差し替え（reviewNotes.json）を引くキー */
  slug?: string;
  title: string;
  /** 解説（動画があれば動画、無ければ記事） */
  url?: string;
};

export type ReportInput = {
  /** 模試セット（"1" | "2" | "r4"） */
  set: string;
  /** 見出し用（例: 模擬試験①） */
  setLabel: string;
  date: Date;
  elapsedSec: number;
  /** 試験時間（秒） */
  totalSec: number;
  examCode: string | null;
  questions: ReportQuestion[];
  /** buildExamReport の結果。セット未定義なら null（その場合ゾーン系の節は出ない） */
  report: ExamReport | null;
  /** 問ごとの「見るポイント」の差し替え（キー: 問題の slug）。書かれていない問は自動文。中身は reviewNotes.json */
  reviewNotes?: Record<string, string>;
};

/* ==================== 母集団（/population.json） ==================== */

export type PopulationBand = {
  band: string;
  n: number;
  scoreMean: number;
  questions: Record<string, { ok: number; n: number }>;
};
export type PopulationQuestion = {
  qn: number; n: number;
  rate: number | null; ratePass: number | null; rateFail: number | null;
  medianSec: number | null; reviewRate: number | null; over8min: number | null;
};
export type PopulationSet = { n: number; scoreMedian: number | null; bands: PopulationBand[]; questions: PopulationQuestion[] };
export type Population = { ok: boolean; generatedAt: string; sets: Record<string, PopulationSet> };

/** 得点帯の切り方。Worker（populationJson）と同じ */
export const BAND_CUTS = [600, 700, 800];
/** これ未満の人数の帯は平均を出さない（1〜2人の平均は「傾向」と呼べない） */
export const BAND_MIN_N = 3;
/** これ未満の受験者数なら母集団の節ごと出さない */
export const POPULATION_MIN_N = 5;
/** 母集団がこの人数以下のときは、帯ごとの人数（○人）を出さない。「1人」と晒さないため */
export const BAND_COUNT_HIDE_UNDER_N = 20;

export function bandOf(score: number): string {
  for (let i = 0; i < BAND_CUTS.length; i++) {
    if (score < BAND_CUTS[i]) return i === 0 ? `〜${BAND_CUTS[0] - 1}` : `${BAND_CUTS[i - 1]}〜${BAND_CUTS[i] - 1}`;
  }
  return `${BAND_CUTS[BAND_CUTS.length - 1]}〜`;
}

/** 得点帯の表示順（低い順）。データに無い帯も列として出す */
export const BAND_LABELS = [...BAND_CUTS.map((_, i) => bandOf(i === 0 ? 0 : BAND_CUTS[i - 1])), bandOf(BAND_CUTS[BAND_CUTS.length - 1])];

/**
 * 母集団を取りに行く。失敗・タイムアウトは null（レポートは母集団なしで出す）。
 * 鍵は要らない（集計値だけの公開エンドポイント）。
 */
export async function fetchPopulation(endpoint: string, set: string, timeoutMs = 4000): Promise<PopulationSet | null> {
  if (!endpoint) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${endpoint}/population.json`, { signal: ctl.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as Population;
    return data?.sets?.[set] ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ==================== 基本の数値 ==================== */

export const POINTS_PER_QUESTION = 50;
export const PASS_SCORE = 600;
export const FULL_SCORE = 1000;

/**
 * 序盤に取る問（＝取りやすい問）。問1・2は基礎の入口、問16〜20は知識で取れる。
 * ここと「その他（残り）」で時間の使い方を見る。前半・後半で割っても意味が無いため。
 */
export const OPENING_NUMBERS = [1, 2, 16, 17, 18, 19, 20];
/** 序盤に取る問の目安時間。その他と合わせて試験時間（100分）になるように置く */
export const OPENING_TARGET_SEC = 30 * 60;
export const REST_TARGET_SEC = 70 * 60;

/** examReport.ts と同じしきい値 */
export const OVER_SEC = 480;      // かけすぎ（8分）
export const UNTOUCHED_SEC = 45;  // 誤答かつこれ以下＝手つかず（ほぼ当てずっぽう）
export const RUSH_SEC = 180;      // 誤答かつこれ未満＝急ぎすぎ
export const GUIDE_SEC = 300;     // 1問の目安（5分）

export const scoreOf = (qs: ReportRow[]) => qs.filter((q) => q.ok).length * POINTS_PER_QUESTION;
export const hasTiming = (qs: ReportRow[]) => qs.some((q) => q.sec > 0);

export function fmtSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}秒`;
  return s === 0 ? `${m}分` : `${m}分${s}秒`;
}

/** 目安との差。+ は超過、- は短縮 */
export function fmtDelta(sec: number): string {
  if (sec === 0) return "目安どおり";
  return `${sec > 0 ? "+" : "-"}${fmtSec(Math.abs(sec))}`;
}

/** 問番号の並びを「問1・2＋問16〜20」のように畳んで書く */
export function fmtQuestionNumbers(ns: number[]): string {
  const sorted = [...ns].sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const n of sorted) {
    const last = runs[runs.length - 1];
    if (last && n === last[last.length - 1] + 1) last.push(n);
    else runs.push([n]);
  }
  return runs
    .map((r) =>
      r.length === 1 ? `問${r[0]}` : r.length === 2 ? `問${r[0]}・${r[1]}` : `問${r[0]}〜${r[r.length - 1]}`
    )
    .join("＋");
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/* ==================== 時間ラベル ==================== */

export type TimeLabel = "手つかず" | "急ぎすぎ" | "かけすぎ" | null;

/**
 * 1問の時間の使い方。時間が計測できていない（sec=0）ときは null。
 * 未回答は時間で言い分けない（結果列で「未回答」と分かる。コメントは reviewComment で固定文）。
 */
export function timeLabelOf(q: ReportRow): TimeLabel {
  if (q.sec <= 0 || !q.answered) return null;
  if (q.sec >= OVER_SEC) return "かけすぎ";
  if (!q.ok && q.sec <= UNTOUCHED_SEC) return "手つかず";
  if (!q.ok && q.sec < RUSH_SEC) return "急ぎすぎ";
  return null;
}

/* ==================== ゾーンの参照 ==================== */

export function zoneOfNumber(report: ExamReport | null, n: number): ZoneReport | undefined {
  return report?.zones.find((z) => z.numbers.includes(n));
}

/** ゾーン名 → { got, met }。ルール評価と表に使う */
export function zoneIndex(report: ExamReport | null): Map<string, ZoneReport> {
  return new Map((report?.zones ?? []).map((z) => [z.name, z] as const));
}

/* ==================== 診断ルール ==================== */

export type RuleContext = {
  score: number;
  elapsedMin: number;
  unanswered: number;
  zones: Map<string, ZoneReport>;
};

export type DiagnosisLine = { id: string; tone: Rule["tone"]; text: string; link?: { label: string; url: string } };

const inRange = (v: number, r?: { min?: number; max?: number }) =>
  !r || ((r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max));

const zoneNames = (z: Zone | Zone[]) => (Array.isArray(z) ? z : [z]);

/** 指定ゾーンの「どれか」が未達なら真。存在しないゾーン名は未達扱いしない */
function zoneUnderMatches(ctx: RuleContext, z: Zone | Zone[]): boolean {
  return zoneNames(z).some((name) => ctx.zones.get(name)?.met === false);
}

/** 指定ゾーンの「すべて」が未達なら真 */
function zoneUnderAllMatches(ctx: RuleContext, z: Zone | Zone[]): boolean {
  const names = zoneNames(z);
  return names.length > 0 && names.every((name) => ctx.zones.get(name)?.met === false);
}

export function ruleMatches(when: RuleWhen, ctx: RuleContext): boolean {
  if (when.score && (ctx.score < when.score[0] || ctx.score > when.score[1])) return false;
  if (when.elapsedMin && !inRange(ctx.elapsedMin, when.elapsedMin)) return false;
  if (when.unanswered && !inRange(ctx.unanswered, when.unanswered)) return false;
  if (when.zoneUnder !== undefined && !zoneUnderMatches(ctx, when.zoneUnder)) return false;
  if (when.zoneUnderAll !== undefined && !zoneUnderAllMatches(ctx, when.zoneUnderAll)) return false;
  if (when.zoneCount) {
    const z = ctx.zones.get(when.zoneCount.zone);
    if (!z) return false;
    if (!inRange(z.got, when.zoneCount)) return false;
  }
  return true;
}

/**
 * 当たったルールを上から順に MAX_LINES 本。同じ動画URLは最初の1回だけ link を付ける。
 * alreadyLinked: 得点帯の一言などで先に出した動画URL（ここでは重ねて出さない）。
 * 所要時間が取れていない（elapsedMin=0）ときは elapsedMin 条件のあるルールは評価しない。
 */
export function evaluateRules(
  ctx: RuleContext,
  rules: Rule[] = RULES,
  maxLines = MAX_LINES,
  alreadyLinked: Iterable<string> = []
): DiagnosisLine[] {
  const out: DiagnosisLine[] = [];
  const seenUrl = new Set<string>(alreadyLinked);
  for (const r of rules) {
    if (out.length >= maxLines) break;
    if (r.when.elapsedMin && ctx.elapsedMin <= 0) continue;
    if (!ruleMatches(r.when, ctx)) continue;
    const line: DiagnosisLine = { id: r.id, tone: r.tone, text: r.text };
    if (r.link && !seenUrl.has(r.link.url)) {
      seenUrl.add(r.link.url);
      line.link = r.link;
    }
    out.push(line);
  }
  return out;
}

export type BandComment = { text: string; link?: { label: string; url: string } };

/** 得点帯の一言。上から順に最初に当たった1つ */
export function bandComment(score: number): BandComment | null {
  const b = BAND_COMMENTS.find((b) => score >= b.score[0] && score <= b.score[1]);
  return b ? { text: b.text, link: b.link } : null;
}

export function buildRuleContext(input: ReportInput): RuleContext {
  return {
    score: scoreOf(input.questions),
    elapsedMin: Math.round(input.elapsedSec / 60),
    unanswered: input.questions.filter((q) => !q.answered).length,
    zones: zoneIndex(input.report)
  };
}

/* ==================== 復習リスト ==================== */

export type ReviewItem = {
  q: ReportQuestion;
  zone?: string;
  result: "誤答" | "未回答" | "正解";
  timeLabel: TimeLabel;
  comment: string;
};

/** ゾーンが未定義（セット未定義など）の問題は末尾へ */
const zoneOrder = (report: ExamReport | null, n: number) => {
  const i = (report?.zones ?? []).findIndex((z) => z.numbers.includes(n));
  return i < 0 ? 99 : i;
};

const ZONE_ADVICE: Record<string, string> = {
  "基礎トレース": "基礎ゾーンは全問正解がノルマです。最優先で解き直してください",
  "基礎読解": "基礎ゾーンは全問正解がノルマです。最優先で解き直してください",
  "情報セキュリティ": "知識で取れる分野。根拠を持って一択に絞る練習を",
  "トレース": "トレース力がもう一歩。「値を変えてもう一度」で繰り返しましょう",
  "読解": "設問の条件を1つずつ本文に当てて確認します",
  "クセの強い問題": "クセ強ゾーン。合格だけなら深追い不要。余裕があれば"
};

export const UNANSWERED_COMMENT = "分からなくても、何かしら選ぶ癖を付けましょう";

/** 見るポイント: 手書きコメント → 未回答の固定文 → 時間ラベル → ゾーンの定型文の順 */
export function reviewComment(
  q: ReportQuestion,
  zone: string | undefined,
  label: TimeLabel,
  reviewNotes?: Record<string, string>
): string {
  const written = q.slug ? reviewNotes?.[q.slug] : undefined;
  if (written) return written;
  if (!q.answered) return UNANSWERED_COMMENT;
  switch (label) {
    case "手つかず":
      return `${fmtSec(q.sec)}で誤答。ほとんど手をつけずに答えています。復習では時間を気にせず解いてみてください`;
    case "急ぎすぎ":
      return zone === "情報セキュリティ"
        ? `${fmtSec(q.sec)}で誤答。急ぎすぎです。本文を最後まで読んで、根拠を持って一択に絞ってください`
        : `${fmtSec(q.sec)}で誤答。急ぎすぎです。手を動かして値を追ってから選んでください`;
    case "かけすぎ":
      return q.ok
        ? `${fmtSec(q.sec)}かけて正解。正解できていますが、本番ではほかの問題を圧迫します。8分を超えたら一度飛ばして、最後に戻る癖を`
        : `${fmtSec(q.sec)}かけて誤答。8分を超えたら一度飛ばして、最後に戻る癖をつけましょう`;
    default:
      return (zone && ZONE_ADVICE[zone]) || "解説を見て、どこで判断を誤ったかを確認してください";
  }
}

/**
 * 復習リスト。
 *   前半: 間違えた問題・未回答を、埋めやすい順（examReport のゾーン順＝基礎→セキュリティ→トレース→読解→クセ強）。同じゾーン内は問番号順
 *   後半: 正解だが時間をかけすぎた問題（8分超）。正解でも本番ではほかの問題を圧迫するので載せる
 */
export function buildReviewList(input: ReportInput): ReviewItem[] {
  const { report, reviewNotes } = input;
  const toItem = (q: ReportQuestion): ReviewItem => {
    const zone = zoneOfNumber(report, q.n);
    const timeLabel = timeLabelOf(q);
    return {
      q,
      zone: zone?.name,
      result: q.ok ? "正解" : q.answered ? "誤答" : "未回答",
      timeLabel,
      comment: reviewComment(q, zone?.name, timeLabel, reviewNotes)
    };
  };
  const byZone = (a: ReviewItem, b: ReviewItem) =>
    zoneOrder(report, a.q.n) - zoneOrder(report, b.q.n) || a.q.n - b.q.n;
  const missed = input.questions.filter((q) => !q.ok).map(toItem).sort(byZone);
  const slow = input.questions.filter((q) => q.ok && q.sec >= OVER_SEC).map(toItem).sort((a, b) => a.q.n - b.q.n);
  return [...missed, ...slow];
}

/* ==================== 母集団との比較表 ==================== */

export type PopulationCell = { band: string; n: number; avg: number | null };
export type PopulationRow = { zone: ZoneReport; cells: PopulationCell[]; you: number; low: boolean };
export type PopulationTable = {
  n: number;
  myBand: string;
  rows: PopulationRow[];
  /** 帯ごとの人数（○人）を表示してよいか。母集団が少ないうちは出さない */
  showBandCounts: boolean;
  /** 自分の得点帯に十分な人数があり、比較できるか（できないときは表に「—」が並ぶ） */
  myBandComparable: boolean;
};

/**
 * 得点帯 × ゾーンの平均正解数。人数 BAND_MIN_N 未満の帯は avg=null。
 * 「あなた」が自分の帯の平均を下回るゾーンに low を付ける。
 */
export function buildPopulationTable(input: ReportInput, pop: PopulationSet | null | undefined): PopulationTable | null {
  if (!pop || !input.report || pop.n < POPULATION_MIN_N) return null;
  const myBand = bandOf(scoreOf(input.questions));
  const byBand = new Map(pop.bands.map((b) => [b.band, b] as const));
  const rows = input.report.zones.map((zone) => {
    const cells = BAND_LABELS.map((band) => {
      const b = byBand.get(band);
      if (!b || b.n < BAND_MIN_N) return { band, n: b?.n ?? 0, avg: null };
      const ok = zone.numbers.reduce((a, n) => a + (b.questions[String(n)]?.ok ?? 0), 0);
      return { band, n: b.n, avg: Math.round((ok / b.n) * 10) / 10 };
    });
    const mine = cells.find((c) => c.band === myBand)?.avg ?? null;
    return { zone, cells, you: zone.got, low: mine !== null && zone.got < mine };
  });
  const myBandComparable = rows.some((r) => r.cells.some((c) => c.band === myBand && c.avg !== null));
  return { n: pop.n, myBand, rows, showBandCounts: pop.n > BAND_COUNT_HIDE_UNDER_N, myBandComparable };
}

/* ==================== 次にやること ==================== */

export function buildNextSteps(input: ReportInput, review: ReviewItem[], diagnosis: DiagnosisLine[]): string[] {
  const steps: string[] = [];
  const top = review.filter((r) => r.result !== "正解").slice(0, 3).map((r) => `問${r.q.n}`);
  if (top.length > 0) steps.push(`復習リストの上${top.length}問（${top.join("・")}）を、時間を気にせず解き直す`);

  const under = (input.report?.zones ?? []).filter((z) => !z.met);
  if (under.length > 0) {
    const z = under[0];
    steps.push(`${z.name}のノルマ（${z.quota}問）まであと${z.quota - z.got}問。同じゾーンの講座問題で反復する`);
  }
  if (hasTiming(input.questions) && input.questions.some((q) => q.sec >= OVER_SEC)) {
    steps.push("次回の模試では「8分で飛ばす」を1回は実行する");
  } else if (input.questions.filter((q) => !q.answered).length >= 2) {
    steps.push("分からなくても2択まで絞ってマークする");
  }
  const video = diagnosis.find((d) => d.link);
  if (video?.link) steps.push(`動画（${video.link.label}）を見る`);
  return steps.slice(0, 3);
}

/* ==================== まとめて組み立て ==================== */

export type ReportModel = {
  input: ReportInput;
  score: number;
  correct: number;
  wrong: number;
  unanswered: number;
  hasTime: boolean;
  /** 前半・後半（問数で半分に割る）の所要秒 */
  /** 「先に取る問」とその他に分けた所要時間。時間が取れていなければ null */
  timeSplit: {
    openingSec: number;
    restSec: number;
    openingLabel: string;
    restLabel: string;
    openingTargetSec: number;
    restTargetSec: number;
  } | null;
  /** 得点帯の一言（冒頭） */
  bandComment: BandComment | null;
  diagnosis: DiagnosisLine[];
  review: ReviewItem[];
  population: PopulationTable | null;
  nextSteps: string[];
};

export function buildReportModel(input: ReportInput, pop?: PopulationSet | null): ReportModel {
  const qs = input.questions;
  const correct = qs.filter((q) => q.ok).length;
  const unanswered = qs.filter((q) => !q.answered).length;
  const hasTime = hasTiming(qs);
  const opening = qs.filter((q) => OPENING_NUMBERS.includes(q.n));
  const rest = qs.filter((q) => !OPENING_NUMBERS.includes(q.n));
  const sum = (list: ReportQuestion[]) => list.reduce((a, q) => a + q.sec, 0);
  const timeSplit =
    hasTime && opening.length > 0 && rest.length > 0
      ? {
          openingSec: sum(opening),
          restSec: sum(rest),
          openingLabel: fmtQuestionNumbers(opening.map((q) => q.n)),
          restLabel: fmtQuestionNumbers(rest.map((q) => q.n)),
          openingTargetSec: OPENING_TARGET_SEC,
          restTargetSec: REST_TARGET_SEC
        }
      : null;
  const band = bandComment(correct * POINTS_PER_QUESTION);
  // 得点帯の一言で出した動画は、診断では重ねて出さない（URLは1回だけ）
  const diagnosis = evaluateRules(buildRuleContext(input), RULES, MAX_LINES, band?.link ? [band.link.url] : []);
  const review = buildReviewList(input);
  return {
    input,
    score: correct * POINTS_PER_QUESTION,
    correct,
    wrong: qs.length - correct - unanswered,
    unanswered,
    hasTime,
    timeSplit,
    bandComment: band,
    diagnosis,
    review,
    population: buildPopulationTable(input, pop),
    nextSteps: buildNextSteps(input, review, diagnosis)
  };
}
