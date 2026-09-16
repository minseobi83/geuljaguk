"use client";

import { EvaluationResult } from "@/lib/types";
import TierBadge from "./TierBadge";
import ParagraphFeedbackCard from "./ParagraphFeedbackCard";
import { splitParagraphs } from "@/lib/highlight";

interface Props {
  result: EvaluationResult;
  studentText: string;
  paragraphAnswers: Record<number, string>;
  onParagraphAnswerChange: (paragraphNo: number, value: string) => void;
  canRewrite: boolean;
  onRewrite: () => void;
  onDone: () => void;
  canCompare: boolean;
  onCompare: () => void;
}

export default function ResultView({
  result,
  studentText,
  paragraphAnswers,
  onParagraphAnswerChange,
  canRewrite,
  onRewrite,
  onDone,
  canCompare,
  onCompare,
}: Props) {
  const isUncertain = result.scores.confidence === "판단하기 어려움";
  const paragraphs = splitParagraphs(studentText);

  return (
    <div className="flex flex-col gap-6">
      {result.safety.concern && (
        <section className="rounded-xl border border-warn/40 bg-warn/10 p-5">
          <h3 className="font-heading text-base text-warn">잠깐, 이것도 알아두세요</h3>
          <p className="mt-2 leading-7">
            혹시 지금 힘들거나 무서운 일이 있다면, 언제든 부모님이나 선생님한테 이야기해도
            괜찮아요. 말하기 어려우면 청소년상담1388(전화·문자 1388)에 물어봐도 돼요.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-ink/10 bg-white p-5">
        <h2 className="font-heading text-lg text-accent">총평</h2>
        <p className="mt-2 leading-7">{result.summary}</p>
        {isUncertain && (
          <p className="mt-2 text-sm text-warn">
            이번 글만으로는 정확히 판단하기 어려운 부분이 있어요. 다음 글도 함께 보면 더 잘 알 수 있어요.
          </p>
        )}
        {result.understanding.intent_unclear && (
          <p className="mt-2 text-sm text-ink/60">
            하고 싶은 말이 조금 더 분명해지면 좋을 것 같아요.
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TierBadge label="사고력" tier={result.scores.사고력} />
        <TierBadge label="논리력" tier={result.scores.논리력} />
        <TierBadge label="표현력" tier={result.scores.표현력} />
        <TierBadge label="구성력" tier={result.scores.구성력} />
      </section>

      <section className="rounded-xl border border-growth/20 bg-growth/5 p-5">
        <h3 className="font-heading text-base text-growth">잘한 점</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {result.strengths.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-warn/20 bg-warn/5 p-5">
        <h3 className="font-heading text-base text-warn">
          다음에 이것만 고쳐볼까요? · {result.priority_issue.category}
        </h3>
        <p className="mt-2 leading-7">{result.priority_issue.note}</p>
      </section>

      {result.paragraph_feedback.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="font-heading text-base">문단별로 살펴보기</h3>
          <p className="text-xs text-ink/50">
            강조된 표현은 고쳐볼 만한 부분이에요. 질문에 대한 내 생각도 적어보세요.
          </p>
          {result.paragraph_feedback.map((p) => (
            <ParagraphFeedbackCard
              key={p.paragraph_no}
              feedback={p}
              paragraphText={paragraphs[p.paragraph_no - 1]}
              mechanicsTable={result.mechanics_table}
              answer={paragraphAnswers[p.paragraph_no] ?? ""}
              onAnswerChange={(value) => onParagraphAnswerChange(p.paragraph_no, value)}
            />
          ))}
        </section>
      )}

      {result.mechanics_table.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-heading text-base">표현·맞춤법 살펴보기</h3>
          <div className="overflow-x-auto rounded-lg border border-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-ink/5 text-left">
                <tr>
                  <th className="p-2">원문</th>
                  <th className="p-2">고친 표현</th>
                  <th className="p-2">이유</th>
                </tr>
              </thead>
              <tbody>
                {result.mechanics_table.map((row, i) => (
                  <tr key={i} className="border-t border-ink/10">
                    <td className="p-2 font-mono">{row.original}</td>
                    <td className="p-2 font-mono">{row.revised}</td>
                    <td className="p-2">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-ink/10 bg-white p-5">
        <h3 className="font-heading text-base">스스로 고쳐 쓸 때 생각해볼 질문</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {result.self_revision_questions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-accent/20 bg-accent/5 p-5">
        <h3 className="font-heading text-base text-accent">
          다음 학습 과제 · {result.next_task.skill}
        </h3>
        <p className="mt-2 leading-7">{result.next_task.prompt}</p>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        {canCompare && (
          <button
            onClick={onCompare}
            className="rounded-full border border-ink/20 px-6 py-2 font-medium text-ink/70"
          >
            이전 글과 비교하기
          </button>
        )}
        {canRewrite && (
          <button
            onClick={onRewrite}
            className="rounded-full border border-accent px-6 py-2 font-medium text-accent"
          >
            다시 써보기
          </button>
        )}
        <button
          onClick={onDone}
          className="rounded-full bg-growth px-6 py-2 font-medium text-white"
        >
          여기까지 완료로 저장
        </button>
      </div>
    </div>
  );
}
