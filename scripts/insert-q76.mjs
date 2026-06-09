import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questionsPath = path.join(__dirname, "../src/data/questions.json");

const newQ76 = {
  id: "q76",
  number: 76,
  title: "クラスを使った単方向リスト",
  questionText:
    "次のプログラム中の【　　　】に入れる正しい答えを，解答群の中から選べ。",
  bodyBlocks: [
    {
      type: "text",
      text: "関数 makeArray は，クラス ListElement を使って単方向リストを表現している。クラス ListElement の説明を表に示す。ListElement 型の変数はクラス ListElement のインスタンスの参照を格納するものとする。大域変数 listHead は，単方向リストの先頭の要素の参照を格納する。リストが空のときは，listHead は未定義である。次の初期状態のとき，makeArray の戻り値の配列の中身は【　　　】である。"
    },
    {
      type: "table",
      caption: "クラス ListElement のメンバ変数",
      headers: ["メンバ変数", "型", "説明"],
      rows: [
        ["val", "文字型", "リストに格納する文字。"],
        [
          "next",
          "ListElement",
          "リストの次の文字を保持するインスタンスの参照。初期状態は未定義である。"
        ]
      ]
    },
    {
      type: "table",
      caption: "クラス ListElement のコンストラクタ",
      headers: ["コンストラクタ", "説明"],
      rows: [["ListElement（文字型：qVal）", "引数 qVal でメンバ変数 val を初期化する。"]]
    },
    {
      type: "table",
      caption: "初期状態",
      headers: ["", "インスタンス", "インスタンス", "インスタンス"],
      rows: [
        ["val", "公園", "図書館", "学校"],
        ["next", "→", "→", "未定義"],
        ["listHead", { text: "↓", align: "center" }, "", ""]
      ]
    }
  ],
  pseudoCode: [
    "大域：ListElement：listHead  // リストの先頭要素の参照が格納されている",
    "",
    "○ 文字型の配列: makeArray()",
    "  文字型の配列: out ← { }   // 要素数0の配列",
    "  ListElement: curr",
    "",
    "  curr ← listHead",
    "",
    "  while (curr.next が 未定義 でない)",
    "    out の末尾に curr.val を追加する",
    "    curr ← curr.next",
    "  endwhile",
    "",
    "  out の末尾に curr.val を追加する",
    "",
    "  return out"
  ],
  choices: [
    { id: "a", text: "{公園, 図書館, 学校}" },
    { id: "b", text: "{公園, 学校, 図書館}" },
    { id: "c", text: "{学校, 公園, 図書館}" },
    { id: "d", text: "{学校, 図書館, 公園}" }
  ],
  videoUrl: "",
  correctChoiceId: "a",
  hitokoto: "講義のあとに，値を変えながら何度も解こう!",
  hintVideoUrl: "",
  lessonUrl: "",
  another: 1
};

const data = JSON.parse(fs.readFileSync(questionsPath, "utf8"));
const insertAt = data.findIndex((q) => q.id === "q76");
if (insertAt < 0) throw new Error("q76 not found");

for (let i = data.length - 1; i >= insertAt; i--) {
  const q = data[i];
  if (Number.isInteger(q.number) && q.number >= 76) {
    q.number += 1;
    q.id = `q${q.number}`;
  }
}

data.splice(insertAt, 0, newQ76);
fs.writeFileSync(questionsPath, JSON.stringify(data, null, 2) + "\n", "utf8");

const nums = data.filter((q) => q.number >= 76 && q.number <= 90).map((q) => `${q.number}:${q.id}`);
console.log("Inserted q76. Renumbered:", nums.join(", "));
