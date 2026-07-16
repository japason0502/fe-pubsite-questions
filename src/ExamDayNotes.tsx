/**
 * 試験当日の注意事項（規約原文の表示）
 * 原文は src/examDayNotesText.ts に貼り付ける（出典・使い方はそちらのコメント参照）。
 * 出典: CBT-Solutions「【CBT】IPA試験受験者規約」第1条 2.試験当日に関する事項
 * https://cbt-s.com/page/attention3_ipacbt
 */
import { EXAM_DAY_NOTES_TEXT } from "./examDayNotesText";

export function ExamDayNotes() {
  return (
    <div className="pseudo-ref exam-day-notes">
      <h4 className="pseudo-ref-title">試験当日に関する事項</h4>
      <p className="exam-day-original">{EXAM_DAY_NOTES_TEXT}</p>
      <p className="pseudo-ref-note">
        出典：
        <a href="https://cbt-s.com/page/attention3_ipacbt" target="_blank" rel="noopener noreferrer">
          【CBT】IPA試験受験者規約（CBT-Solutions）
        </a>
        
      </p>
    </div>
  );
}
