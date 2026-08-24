/**
 * 模擬試験の結果レポート（ルールベース・完全ローカル）
 *
 * 採点済みの正誤と滞在秒だけから、時間の使い方と弱点を診断する。
 * AI・サーバー通信は使わない。問番号→ゾーン/ノルマのマッピングはセット別に
 * CONFIG に持ち、未定義のセットはレポート無し（null を返す）。
 *
 * 合格モデル（ノルマ）:
 *   各ゾーンに「最低これだけ取る」ノルマを置く。ノルマの合計は 12問 = 600点
 *   （合格ライン）にぴったり一致する。表示はゾーンごとに
 *   「達成状況 → そのゾーンへのコメント」のひとかたまり。
 */

export type ReportRow = {
  n: number;        // 問番号
  ok: boolean;      // 正解か
  answered: boolean;
  sec: number;      // 滞在秒。計測できなかった場合は 0
};

export type ReportLine = { tone: "good" | "warn" | "info"; text: string };

/** ゾーンごとの達成状況＋コメント（採点画面でひとかたまりに表示する） */
export type ZoneReport = {
  name: string;           // 表示名
  range: string;          // 対象の問（表示用）
  got: number;            // 正答数
  total: number;          // 問数
  quota: number;          // ノルマ
  met: boolean;           // ノルマ達成か
  comments: ReportLine[]; // このゾーンへのコメント（不足時のみ。クセ強のみ達成時も情報あり）
};

export type ExamReport = { time: ReportLine[]; summary: ReportLine[]; zones: ZoneReport[] };

type SetConfig = {
  basicsTrace: number[];                 // 基礎（トレース系）。ノルマ=全問
  basicsReading: number[];               // 基礎（読解系）。ノルマ=全問
  fieldByNumber: Record<number, string>; // クセ強ゾーン
  trace: number[];                       // トレース系（標準）
  reading: number[];                     // 読解系（標準）
  security: number[];                    // 情報セキュリティ
  quotaSecurity: number;
  quotaTrace: number;
  quotaReading: number;
  quotaField: number;
};

const CONFIG: Record<string, SetConfig> = {
  "1": {
    basicsTrace: [1, 2, 3],
    basicsReading: [4, 5],
    fieldByNumber: {
      6: "ビット演算",
      7: "再帰",
      8: "キュー",
      9: "再帰",
      10: "単方向リスト",
      16: "ビット演算"
    },
    trace: [11, 13, 14],
    reading: [12, 15],
    security: [17, 18, 19, 20],
    quotaSecurity: 3, // 4問中3問
    quotaTrace: 2,    // 3問中2問
    quotaReading: 1,  // 2問中1問
    quotaField: 3     // 700点目標の目安は6問中3問（合格だけなら1問でよい）
    // ノルマ合計 = 3+2+3+2+1+1 = 12問 = 600点
  }
};

const OVER_SEC = 480;      // これ以上かけたら「かけすぎ」（8分）
const UNTOUCHED_SEC = 45;  // 未解答かつこれ以下なら「手つかず」
const RUSH_AVG_SEC = 180;  // 基礎ゾーンのミス問題の平均滞在がこれ未満なら「急ぎすぎ」

const min = (s: number) => Math.max(1, Math.round(s / 60));
const nums = (a: number[]) => a.map((n) => `問${n}`).join("・");

export function buildExamReport(set: string | null, rows: ReportRow[]): ExamReport | null {
  const cfg = set ? CONFIG[set] : undefined;
  if (!cfg || rows.length === 0) return null;

  const by = new Map(rows.map((r) => [r.n, r]));
  const hasTime = rows.some((r) => r.sec > 0);
  const got = (ns: number[]) => ns.filter((n) => by.has(n) && by.get(n)!.ok).length;
  const miss = (ns: number[]) => ns.filter((n) => by.has(n) && !by.get(n)!.ok);

  /* ---------- 時間の使い方（事実） ---------- */
  const time: ReportLine[] = [];
  if (hasTime) {
    const over = rows
      .filter((r) => r.sec >= OVER_SEC)
      .sort((a, b) => b.sec - a.sec)
      .slice(0, 3);
    for (const r of over) {
      time.push({
        tone: r.ok ? "info" : "warn",
        text: r.ok
          ? `問${r.n}に${min(r.sec)}分かけています。正解できていますが、本番ではほかの問題を圧迫します`
          : `問${r.n}に${min(r.sec)}分かけて不正解です。5分を超えたら一旦離れて、解ける問題を先に取りましょう`
      });
    }

    const untouched = rows.filter((r) => !r.answered && r.sec <= UNTOUCHED_SEC).map((r) => r.n);
    if (untouched.length > 0) {
      time.push({
        tone: "warn",
        text: `${nums(untouched)}はほとんど手をつけられていません。時間切れなら、前半の時間配分を見直しましょう`
      });
    }

    const skipped = rows.filter((r) => !r.answered && r.sec > UNTOUCHED_SEC);
    for (const r of skipped) {
      time.push({
        tone: "info",
        text: `問${r.n}は${min(r.sec)}分考えた上で見送っています。深追いしない判断そのものは正しい動きです`
      });
    }
  }

  /* ---------- ゾーンごとの達成状況＋コメント ---------- */

  /** 基礎ゾーン用: ミス問題の滞在秒から「急ぎすぎ」か「基礎不足」かを言い分ける */
  const basicsComment = (missed: number[], kindName: string, weakName: string): ReportLine => {
    const secs = missed.map((n) => by.get(n)!.sec).filter((s) => s > 0);
    const avg = secs.length > 0 ? secs.reduce((a, b) => a + b, 0) / secs.length : 0;
    if (avg > 0 && avg < RUSH_AVG_SEC) {
      return {
        tone: "warn",
        text: `${kindName}（${nums(missed)}）をミスしていますが、いずれも短時間で答えています。急ぎすぎです。5分たっぷり使って確実に正解しましょう`
      };
    }
    return {
      tone: "warn",
      text: `${kindName}（${nums(missed)}）をミスしています。${weakName}が固まっていない可能性が高いです。ここの復習を最優先にしてください`
    };
  };

  const zone = (name: string, ns: number[], quota: number, comments: ReportLine[]): ZoneReport => {
    const g = got(ns);
    return { name, range: nums(ns), got: g, total: ns.length, quota, met: g >= quota, comments };
  };

  // 基礎トレース（ノルマ=全問）
  const btMiss = miss(cfg.basicsTrace);
  const zBt = zone("基礎トレース", cfg.basicsTrace, cfg.basicsTrace.length,
    btMiss.length > 0 ? [basicsComment(btMiss, "基礎のトレース問題", "トレースの基礎")] : []);

  // 基礎読解（ノルマ=全問）
  const brMiss = miss(cfg.basicsReading);
  const zBr = zone("基礎読解", cfg.basicsReading, cfg.basicsReading.length,
    brMiss.length > 0 ? [basicsComment(brMiss, "基礎の読解問題", "読解の基礎")] : []);

  // 情報セキュリティ
  const sMiss = miss(cfg.security);
  const zSec = zone("情報セキュリティ", cfg.security, cfg.quotaSecurity,
    got(cfg.security) < cfg.quotaSecurity
      ? [{
          tone: "warn" as const,
          text: `${sMiss.length}問（${nums(sMiss)}）ミスしています。知識で取れる分野なので、ここのノルマ${cfg.quotaSecurity}問は確保しましょう`
        }]
      : []);

  // トレース系（標準）
  const tMiss = miss(cfg.trace);
  const zTr = zone("トレース", cfg.trace, cfg.quotaTrace,
    got(cfg.trace) < cfg.quotaTrace
      ? [{
          tone: "warn" as const,
          text: `${tMiss.length}問（${nums(tMiss)}）ミスしています。トレース力がもう一歩です。`
        }]
      : []);

  // 読解系（標準）
  const zRd = zone("読解", cfg.reading, cfg.quotaReading,
    got(cfg.reading) < cfg.quotaReading
      ? [{
          tone: "warn" as const,
          text: `どちらもミスしています。読解問題への対応がもう一歩です｡`
        }]
      : []);

  // クセ強ゾーン
  const fieldNums = Object.keys(cfg.fieldByNumber).map(Number).sort((a, b) => a - b);
  const fieldMiss: Record<string, number[]> = {};
  for (const n of fieldNums) {
    const r = by.get(n);
    if (r && !r.ok) (fieldMiss[cfg.fieldByNumber[n]] ||= []).push(n);
  }
  const parts = Object.keys(fieldMiss)
    .map((f) => `${f}（${nums(fieldMiss[f])}）`)
    .join("、");
  const fieldComments: ReportLine[] = [];
  if (got(fieldNums) < cfg.quotaField) {
    fieldComments.push({
      tone: "warn",
      text: `他が未達の場合､クセ強系は後回しでOK｡基本を固めてから､クセ強い系に望みましょう｡（ミス: ${parts}）`
    });
  } else if (parts.length > 0) {
    // ノルマは達成しているが、復習先の情報として分野を示す
    fieldComments.push({
      tone: "info",
      text: `分野別では ${parts} でミスがあります。ここで取れるようになると､スコアが一気に安定します｡`
    });
  }
  const zField = zone("クセの強い問題", fieldNums, cfg.quotaField, fieldComments);

  // 埋めやすい順（＝復習の優先順位）
  const zones = [zBt, zBr, zSec, zTr, zRd, zField];

  /* ---------- 総評 ---------- */
  const summary: ReportLine[] = [];
  const correct = rows.filter((r) => r.ok).length;
  const quotaSum = zones.reduce((a, z) => a + z.quota, 0); // = 14
  const passLine = 12; // 600点=合格基準

  if (rows.every((r) => r.ok)) {
    summary.push({ tone: "good", text: "全問正解です。文句なしの仕上がりです" });
  } else if (correct >= quotaSum) {
    summary.push({
      tone: "good",
      text: `正答${correct}問。目標の700点超え(合格基準${passLine}問+2問)をクリアしています`
    });
  } else if (correct >= passLine) {
    summary.push({
      tone: "info",
      text: `正答${correct}問。合格基準(${passLine}問=600点)はクリアしています。目標となる700点超え(合格基準${passLine}問+2問)まであと${quotaSum - correct}問です`
    });
  } else {
    summary.push({
      tone: "warn",
      text: `正答${correct}問。目標となる700点超え(合格基準${passLine}問+2問)まであと${quotaSum - correct}問です。不足しているゾーンから埋めていきましょう`
    });
  }

  return { time, summary, zones };
}
