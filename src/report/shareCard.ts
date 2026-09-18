/**
 * 結果レポートの「シェア用カード」を canvas に描いて PNG で書き出す。
 *
 * レポート本体（View.tsx）は本人向けの長い診断なので、そのまま画像にしても
 * 他人には読めないし読ませるものでもない。ここでは SNS に貼る前提で
 * 「点数・ゾーンの達成状況・時間」だけを 1 枚に切り出す。
 *
 * 外部ライブラリは使わない（html2canvas はフォントと CSS の再現でズレるため）。
 * 文字は端末のフォントで描くので、環境によって多少の幅の差は出る。
 */

import { FULL_SCORE, PASS_SCORE, fmtSec, type ReportModel } from "./model";

/* ==================== 見た目の設定 ==================== */

/** 論理サイズ（16:9）。X のタイムラインで切れずに出る比率 */
const W = 1200;
const H = 675;
/** 実際の PNG はこの倍率。文字をくっきりさせるためだけの値 */
const SCALE = 2;

const PAD = 56;

/** View.tsx の CSS 変数と同じ色 */
const C = {
  ink: "#1f2937",
  muted: "#64748b",
  line: "#e5e7eb",
  acc: "#1f3864",
  blue: "#2563eb",
  red: "#dc2626",
  soft: "#f8fafc",
  tint: "#eaf1fe",
  white: "#ffffff"
};

const FONT = '"Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",-apple-system,"Segoe UI",sans-serif';
const font = (size: number, weight: number | string = 400) => `${weight} ${size}px ${FONT}`;

/** フッターの署名。増減しやすいようにここだけ見ればいいようにしておく */
const SITE_NAME = "基本情報技術者試験 科目B 演習サイト";
const SITE_HANDLE = "@japacojp";

/* ==================== 小道具 ==================== */

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function text(
  g: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  opt: { size?: number; weight?: number | string; color?: string; align?: CanvasTextAlign } = {}
): number {
  g.font = font(opt.size ?? 20, opt.weight ?? 400);
  g.fillStyle = opt.color ?? C.ink;
  g.textAlign = opt.align ?? "left";
  g.textBaseline = "alphabetic";
  g.fillText(s, x, y);
  return g.measureText(s).width;
}

/* ==================== 描画 ==================== */

export function drawShareCard(m: ReportModel): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = W * SCALE;
  cv.height = H * SCALE;
  const g = cv.getContext("2d");
  if (!g) return cv;
  g.scale(SCALE, SCALE);

  // 背景
  g.fillStyle = C.white;
  g.fillRect(0, 0, W, H);
  // 上端のアクセント帯
  g.fillStyle = C.acc;
  g.fillRect(0, 0, W, 10);

  /* --- ヘッダ --- */
  const setTitle = `${m.input.setLabel} 結果`;
  text(g, setTitle, PAD, 82, { size: 30, weight: 700, color: C.acc });
  text(g, fmtDate(m.input.date), W - PAD, 82, { size: 20, color: C.muted, align: "right" });
  g.fillStyle = C.line;
  g.fillRect(PAD, 102, W - PAD * 2, 2);

  /* --- 左カラム：点数 --- */
  const LX = PAD;
  g.font = font(118, 800);
  g.fillStyle = C.acc;
  g.textAlign = "left";
  g.fillText(String(m.score), LX, 235);
  const scoreW = g.measureText(String(m.score)).width;
  text(g, `/ ${FULL_SCORE}点`, LX + scoreW + 14, 235, { size: 28, color: C.muted });

  // 合格ラインとの差。届いていないときは「あと何点」の方が次の行動に繋がる
  const diff = m.score - PASS_SCORE;
  const pass = diff >= 0;
  {
    const head = pass ? "合格ライン " : "合格まであと ";
    const value = pass ? `+${diff}` : String(-diff);
    const w0 = text(g, head, LX, 282, { size: 20, color: C.muted });
    const w1 = text(g, value, LX + w0, 282, { size: 24, weight: 700, color: pass ? C.blue : C.red });
    text(g, "点", LX + w0 + w1, 282, { size: 20, color: C.muted });
  }

  // スコアバー（合格ラインのマーカー付き）
  const barX = LX;
  const barY = 308;
  const barW = 470;
  const barH = 18;
  g.fillStyle = C.line;
  roundRect(g, barX, barY, barW, barH, barH / 2);
  g.fill();
  const fillW = Math.max(0, Math.min(1, m.score / FULL_SCORE)) * barW;
  if (fillW > 0) {
    g.fillStyle = pass ? C.blue : C.acc;
    roundRect(g, barX, barY, Math.max(fillW, barH), barH, barH / 2);
    g.fill();
  }
  const passX = barX + (PASS_SCORE / FULL_SCORE) * barW;
  g.fillStyle = C.red;
  g.fillRect(passX - 1.5, barY - 7, 3, barH + 14);
  text(g, `合格ライン ${PASS_SCORE}`, passX, barY + barH + 26, { size: 15, color: C.red, align: "center" });

  // 内訳
  const kpi = `正答 ${m.correct} / ${m.input.questions.length}　　誤答 ${m.wrong}　　未回答 ${m.unanswered}`;
  text(g, kpi, LX, 412, { size: 22, weight: 600 });

  // 所要時間
  const total = m.input.totalSec > 0 ? ` / ${fmtSec(m.input.totalSec)}` : "";
  text(g, `所要時間 ${fmtSec(m.input.elapsedSec)}${total}`, LX, 450, { size: 20, color: C.muted });

  const zones = m.input.report?.zones ?? [];

  /* --- 左カラム：伸びしろ --- */
  // シェアされたときに「どこで詰まったか」が一目で伝わるようにする（shareText と同じ情報）
  const under = zones.filter((z) => !z.met).map((z) => z.name);
  const allMet = zones.length > 0 && under.length === 0;
  const boxY = 488;
  g.fillStyle = allMet ? C.tint : C.soft;
  roundRect(g, LX, boxY, 470, 48, 8);
  g.fill();
  if (zones.length > 0) {
    if (allMet) {
      text(g, "すべてのゾーンでノルマ達成", LX + 16, boxY + 31, { size: 19, weight: 700, color: C.blue });
    } else {
      const wl = text(g, "伸びしろ ", LX + 16, boxY + 31, { size: 17, color: C.muted });
      // 4つ以上あると入りきらないので、先頭3つ＋残り件数にまとめる
      const names = under.slice(0, 3).join(" / ") + (under.length > 3 ? ` ほか${under.length - 3}` : "");
      text(g, names, LX + 16 + wl, boxY + 31, { size: 19, weight: 700, color: C.ink });
    }
  }

  /* --- 右カラム：ゾーン別 --- */
  const RX = 640;
  const RW = W - PAD - RX;
  if (zones.length > 0) {
    text(g, "ゾーン別の達成状況", RX, 148, { size: 20, weight: 700, color: C.acc });
    const rowH = Math.min(62, Math.floor(372 / zones.length));
    let y = 172;
    for (const z of zones) {
      g.fillStyle = z.met ? C.tint : C.soft;
      roundRect(g, RX, y, RW, rowH - 8, 8);
      g.fill();
      const cy = y + (rowH - 8) / 2 + 7;
      text(g, z.met ? "◎" : "△", RX + 16, cy, { size: 22, weight: 700, color: z.met ? C.blue : C.red });
      text(g, z.name, RX + 52, cy, { size: 19, weight: 600 });
      text(g, `${z.got}/${z.total}`, RX + RW - 92, cy, { size: 19, weight: 700, align: "right" });
      text(g, `ノルマ${z.quota}`, RX + RW - 16, cy, { size: 15, color: C.muted, align: "right" });
      y += rowH;
    }
  }

  /* --- フッター --- */
  g.fillStyle = C.line;
  g.fillRect(PAD, H - 88, W - PAD * 2, 2);
  if (m.input.examCode) {
    const w = text(g, "受験コード ", PAD, H - 50, { size: 17, color: C.muted });
    g.font = font(19, 700);
    g.fillStyle = C.ink;
    g.fillText(m.input.examCode, PAD + w, H - 50);
  }
  text(g, SITE_NAME, W - PAD, H - 54, { size: 17, weight: 600, color: C.acc, align: "right" });
  text(g, SITE_HANDLE, W - PAD, H - 30, { size: 15, color: C.muted, align: "right" });

  return cv;
}

/* ==================== 書き出し ==================== */

function fmtDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export function shareCardFileName(m: ReportModel): string {
  const d = fmtDate(m.input.date).replace(/\//g, "");
  return `${m.input.setLabel}_${d}_${m.score}点.png`;
}

/** PNG として保存させる */
export function downloadShareCard(m: ReportModel): void {
  const cv = drawShareCard(m);
  cv.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = shareCardFileName(m);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, "image/png");
}

/**
 * カード画像をクリップボードへ入れる。
 *
 * X の投稿画面は本文を URL で渡せるが画像は渡せない（intent が text/url/hashtags しか取らない）ので、
 * 画像だけクリップボードに置いて、投稿欄で貼り付けてもらう。本文とは経路が別なので競合しない。
 *
 * ClipboardItem には Blob ではなく Promise<Blob> を渡すこと。
 * await してから write すると、Safari が「ユーザー操作の外」とみなして拒否する。
 */
export function copyShareCardImage(m: ReportModel): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") return Promise.resolve(false);
    const blob = new Promise<Blob>((resolve, reject) => {
      drawShareCard(m).toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    });
    return navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(
      () => true,
      () => false // 画像のコピーに対応していないブラウザ。本文だけで投稿はできる
    );
  } catch {
    return Promise.resolve(false);
  }
}

/** この端末で「共有」が使えそうか。押したあとの実判定は shareCardNative がやる */
export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * OS の共有シートを開いて、カード画像とひとことを一緒に渡す。
 * X・LINE・メールなど、その端末に入っているアプリにそのまま送れる。
 *
 * 返り値:
 *   "shared"      … 共有した
 *   "cancelled"   … 共有シートを閉じた（何もしなくていい）
 *   "unsupported" … 画像付きの共有に対応していない（呼び出し側で保存に切り替える）
 */
export async function shareCardNative(m: ReportModel, text: string): Promise<"shared" | "cancelled" | "unsupported"> {
  if (!canNativeShare()) return "unsupported";
  try {
    const cv = drawShareCard(m);
    const blob: Blob | null = await new Promise((res) => cv.toBlob(res, "image/png"));
    if (!blob) return "unsupported";
    const file = new File([blob], shareCardFileName(m), { type: "image/png" });
    const data: ShareData = { files: [file], text };
    if (navigator.canShare && !navigator.canShare(data)) return "unsupported";
    await navigator.share(data);
    return "shared";
  } catch (e) {
    // ユーザーが閉じた場合は AbortError。それ以外は端末側の非対応とみなす
    return (e as Error)?.name === "AbortError" ? "cancelled" : "unsupported";
  }
}
