"use client";

import { MechanicsRow, ParagraphFeedback } from "@/lib/types";
import { highlightParagraph } from "@/lib/highlight";

interface Props {
  feedback: ParagraphFeedback;
  paragraphText?: string;
  mechanicsTable: MechanicsRow[];
  answer: string;
  onAnswerChange: (value: string) => void;
  readOnly?: boolean;
}

export default function ParagraphFeedbackCard({
  feedback,
  paragraphText,
  mechanicsTable,
  answer,
  onAnswerChange,
  readOnly = false,
}: Props) {
  const highlight = paragraphText
    ? highlightParagraph(paragraphText, mechanicsTable)
    : null;
  const hasHighlight = Boolean(highlight && highlight.matchedRows.length > 0);

  return (
    <div className="border-b border-ink/15 py-6">
      <div className="flex items-center gap-3">
        <span className="bg-ink px-2 py-1 text-[11px] font-bold tracking-widest text-white">
          {String(feedback.paragraph_no).padStart(2, "0")}
        </span>
        <span className="text-[10px] uppercase tracking-[0.25em] text-ink/45">
          {feedback.role}
        </span>
      </div>

      {highlight && (
        <p className="mt-4 break-keep font-heading text-lg leading-9 text-ink/85">
          {highlight.segments.map((seg, i) =>
            seg.highlighted ? (
              <mark
                key={i}
                title={seg.reason}
                className="bg-warn/25 px-0.5 text-ink underline decoration-warn decoration-2 underline-offset-4"
              >
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
        </p>
      )}

      {hasHighlight && (
        <div className="mt-4 border-l-4 border-warn pl-4">
          <p className="text-[10px] uppercase tracking-[0.25em] text-warn">
            이 부분을 수정해볼까요?
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {highlight!.matchedRows.map((row, i) => (
              <li key={i} className="break-keep text-sm leading-6 text-ink/70">
                — {row.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 break-keep leading-7 text-ink/70">{feedback.good}</p>
      <p className="mt-2 break-keep font-bold leading-7 text-ink">{feedback.question}</p>

      {!readOnly && (
        <textarea
          className="mt-3 w-full border border-ink/20 bg-ink/[0.02] p-3 text-sm leading-7 outline-none focus:border-ink"
          placeholder="이 질문에 대한 내 생각을 적어보세요"
          rows={2}
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
        />
      )}
    </div>
  );
}
