import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questionsPath = path.join(__dirname, "../src/data/questions.json");

const TARGET_IDS = new Set(["q91", "q92", "q93", "q94", "q95", "q96", "q97", "q98"]);

function questionPromptBlock(text) {
  return { type: "text", text: `設問　${text}` };
}

const questions = JSON.parse(fs.readFileSync(questionsPath, "utf8"));

for (const q of questions) {
  if (!TARGET_IDS.has(q.id) || !q.questionText || !q.bodyBlocks) continue;

  const block = questionPromptBlock(q.questionText);

  if (q.id === "q93") {
    const idx = q.bodyBlocks.findIndex(
      (b) => b.type === "text" && b.text.includes("BYOD")
    );
    if (idx < 0) throw new Error(`${q.id}: BYOD paragraph not found`);
    q.bodyBlocks.splice(idx + 1, 0, block);
  } else {
    q.bodyBlocks.push(block);
  }

  delete q.questionText;
}

fs.writeFileSync(questionsPath, JSON.stringify(questions, null, 2) + "\n", "utf8");
console.log("Moved 設問 into bodyBlocks for q91–q98.");
