/**
 * 復習リストの「見るポイント」を、問ごとの手書きコメントで差し替える。
 *
 * 書く場所は src/data/reviewNotes.json だけ。キーは問題の slug（例: "mogi1-19"）。
 * 書かなかった問は、これまでどおり自動生成の文（急ぎすぎ・かけすぎ・ゾーンごとの定型文）が出る。
 *
 * slug をキーにしているのは、書く人が「どの問題か」を読んで分かるため。
 * 内部の id（m19 / n19）は模試①②のどちらか読み取れず、書き間違えても気づけない。
 */

import reviewNotesData from "./data/reviewNotes.json";
import questionsData from "./data/questions.json";
import mogiQuestionsData from "./data/mogiQuestions.json";
import mogi2QuestionsData from "./data/mogi2Questions.json";
import r4ExtraData from "./data/r4Extra.json";

export const REVIEW_NOTES: Record<string, string> = reviewNotesData;

// slug の綴り間違いは黙って無視される＝書いたのに出ない、に気づけない。起動時に一度だけ知らせる
const KNOWN_SLUGS = new Set(
  [
    ...(questionsData as { slug?: string }[]),
    ...(mogiQuestionsData as { slug?: string }[]),
    ...(mogi2QuestionsData as { slug?: string }[]),
    ...(r4ExtraData as { slug?: string }[])
  ]
    .map((q) => q.slug)
    .filter((slug): slug is string => Boolean(slug))
);

const unknownSlugs = Object.keys(REVIEW_NOTES).filter((slug) => !KNOWN_SLUGS.has(slug));
if (unknownSlugs.length > 0) {
  console.warn(`reviewNotes.json: 存在しない slug が書かれています: ${unknownSlugs.join(", ")}`);
}
