import { SavedParagraphAnswer } from "@/lib/supabase/queries";

interface Props {
  answers: SavedParagraphAnswer[];
  // 보는 사람에 따라 제목을 바꾼다 (보호자 화면: "아이의 생각", 아이 화면: "내 생각").
  label: string;
}

// 첨삭의 문단별 질문에 아이가 적은 답변을 질문과 함께 보여준다 (읽기 전용).
export default function SavedAnswerList({ answers, label }: Props) {
  if (answers.length === 0) return null;
  const multipleVersions = new Set(answers.map((a) => a.versionNo)).size > 1;

  return (
    <div className="mt-3 border-l-2 border-accent/40 pl-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink/35">{label}</p>
      <ul className="mt-1 flex flex-col gap-2">
        {answers.map((a) => (
          <li key={`${a.versionNo}-${a.paragraphNo}`} className="break-keep text-xs leading-6">
            <p className="text-ink/45">
              <span className="mr-1 font-mono">
                {multipleVersions ? `${a.versionNo}차 · ` : ""}
                {a.paragraphNo}문단
              </span>
              {a.question}
            </p>
            <p className="text-ink/80">→ {a.answer}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
