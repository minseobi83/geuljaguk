"use client";

import { MechanicsRow, ParagraphFeedback } from "@/lib/types";
import { highlightParagraph } from "@/lib/highlight";

interface Props {
  feedback: ParagraphFeedback;
  paragraphText?: string;
  mechanicsTable: MechanicsRow[];
  answer: string;
  onAnswerChange: (value: string) => void;
}

export default function ParagraphFeedbackCard({
  feedback,
  paragraphText,
  mechanicsTable,
  answer,
  onAnswerChange,
}: Props) {
  const highlight = paragraphText
    ? highlightParagraph(paragraphText, mechanicsTable)
    : null;
  const hasHighlight = Boolean(highlight && highlight.matchedRows.length > 0);

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <p className="text-xs font-mono text-ink/50">
        {feedback.paragraph_no}번째 문단 · {feedback.role}
      </p>

      {highlight && (
        <p className="mt-2 leading-7">
          {highlight.segments.map((seg, i) =>
            seg.highlighted ? (
              <mark
                key={i}
                title={seg.reason}
                className="rounded bg-warn/25 px-0.5 text-ink underline decoration-warn decoration-2 underline-offset-2"
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
        <div className="mt-2 rounded-md bg-warn/5 p-3 text-xs text-warn">
          <p className="font-medium">✏️ 이 부분을 수정해볼까요?</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {highlight!.matchedRows.map((row, i) => (
              <li key={i}>{row.reason}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-2">{feedback.good}</p>
      <p className="mt-2 text-accent">{feedback.question}</p>

      <textarea
        className="mt-2 w-full rounded-md border border-ink/15 bg-paper/60 p-2 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-accent/30"
        placeholder="이 질문에 대한 내 생각을 적어보세요"
        rows={2}
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
      />
    </div>
  );
}
