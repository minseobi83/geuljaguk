import { MechanicsRow } from "@/lib/types";
import { highlightParagraph, splitParagraphs } from "@/lib/highlight";

interface Props {
  text: string;
  mechanicsTable: MechanicsRow[];
  className?: string;
}

// 글쓰기 화면(ParagraphFeedbackCard)에서 고쳐볼 표현을 강조하던 것과 같은 방식을,
// 쓴 글 히스토리(학부모 대시보드·성장 기록)에서도 그대로 쓰기 위한 공용 컴포넌트.
export default function HighlightedEssayText({ text, mechanicsTable, className }: Props) {
  const paragraphs = splitParagraphs(text);
  return (
    <p className={className}>
      {paragraphs.map((paragraph, pi) => {
        const { segments } = highlightParagraph(paragraph, mechanicsTable);
        return (
          <span key={pi}>
            {segments.map((seg, si) =>
              seg.highlighted ? (
                <mark
                  key={si}
                  title={seg.reason}
                  className="bg-warn/25 px-0.5 text-ink underline decoration-warn decoration-2 underline-offset-4"
                >
                  {seg.text}
                </mark>
              ) : (
                <span key={si}>{seg.text}</span>
              )
            )}
            {pi < paragraphs.length - 1 ? "\n\n" : null}
          </span>
        );
      })}
    </p>
  );
}
