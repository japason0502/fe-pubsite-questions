import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questionsPath = path.join(__dirname, "../src/data/questions.json");

const TARGET_IDS = new Set(["q91", "q92", "q93", "q94", "q95", "q96", "q97", "q98"]);

/** 1セル図表: caption を表の外（直後の textCenter）へ。表 caption は図/表で始まるもののみ対象 */
function isSingleCellFigureTable(block) {
  if (block.type !== "table") return false;
  if (!block.caption || !/^[図表]\d*/.test(block.caption)) return false;
  if (block.headers?.length !== 1 || block.headers[0] !== "") return false;
  if (block.rows?.length !== 1 || block.rows[0]?.length !== 1) return false;
  return true;
}

function fixBodyBlocks(blocks) {
  const out = [];
  for (const block of blocks) {
    if (!isSingleCellFigureTable(block)) {
      out.push(block);
      continue;
    }
    const { caption, ...tableRest } = block;
    out.push(tableRest);
    out.push({ type: "textCenter", text: caption });
  }
  return out;
}

const questions = JSON.parse(fs.readFileSync(questionsPath, "utf8"));
let changed = 0;

for (const q of questions) {
  if (!TARGET_IDS.has(q.id) || !q.bodyBlocks) continue;
  const before = JSON.stringify(q.bodyBlocks);
  q.bodyBlocks = fixBodyBlocks(q.bodyBlocks);
  if (JSON.stringify(q.bodyBlocks) !== before) changed++;
}

fs.writeFileSync(questionsPath, JSON.stringify(questions, null, 2) + "\n", "utf8");
console.log(`Updated ${changed} questions.`);
