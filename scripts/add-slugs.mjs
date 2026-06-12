// 各サンプル問題に slug を付与する（questions.json を直接その場で書き換える）。
// slug は埋め込み/ディープリンク (?q=slug) の安定キー。問題番号(qN)が変わっても壊れない。
//
// 付与ロジック（外部の対応表・マップは不要。問題データ自身から決まる）:
//   1) title に「(令和X年度[4月]サンプル問題問N)」が含まれていれば、それを slug にする
//        令和4年度4月サンプル問題問N -> r404-monN
//        令和4年度サンプル問題問N    -> r4-monN   （4月以外は r4）
//        令和5/6/7年度…             -> r5/r6/r7-monN
//      ※ title に「改変」を含む問題は除外（改変版は本物と別物。例: q25=R4問11改変）
//   2) title にラベルが無いが、本物のサンプル問題のもの（数問）は videoId で補完
//
// 実行: node scripts/add-slugs.mjs   （冪等・再実行可）

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const QPATH = join(__dirname, "..", "src", "data", "questions.json");

// title にサンプル問題ラベルが無いが本物のサンプル問題（videoId で補完）
const VID_FALLBACK = {
  "srXR_nf2ZQo": "r4-mon6",   // 令和4 問6（2進数）
  "HBJcpbO0KUw": "r4-mon16",  // 令和4 問16（ビット）
  "z6ckOGIKntg": "r7-mon4",   // 令和7 問4（FORネスト）
};

const VID_RE = /watch\?v=([A-Za-z0-9_-]{11})/;

function slugFromTitle(title) {
  if (!title) return null;
  if (/改変/.test(title)) return null; // 改変版は対象外
  const m = title.match(/令和(\d+)年度\s*(4月|12月)?\s*サンプル問題\s*問(\d+)/);
  if (!m) return null;
  const pref = m[2] === "4月" ? `r${m[1]}04` : `r${m[1]}`;
  return `${pref}-mon${m[3]}`;
}

const data = JSON.parse(readFileSync(QPATH, "utf-8"));
let added = 0, updated = 0, same = 0;
const log = [];

for (const q of data) {
  let slug = slugFromTitle(q.title);
  if (!slug) {
    const vm = (q.videoUrl || "").match(VID_RE);
    if (vm) slug = VID_FALLBACK[vm[1]] || null;
  }
  if (!slug) continue;
  if (q.slug === slug) { same++; continue; }
  if (q.slug) updated++; else added++;
  q.slug = slug;
  log.push(`${q.id} (#${q.number}) -> ${slug}`);
}

writeFileSync(QPATH, JSON.stringify(data, null, 2) + "\n", "utf-8");

console.log("slug 付与:");
for (const s of log.sort()) console.log("  " + s);
console.log(`\n新規 ${added} / 更新 ${updated} / 既存一致 ${same}  （合計 ${added + updated + same} 問にslug）`);
console.log(`questions.json を更新しました。`);
