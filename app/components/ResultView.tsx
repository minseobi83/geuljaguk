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

// 섹션 머리표 — 잡지 지면의 소제목처럼 검은 띠 + 영문 키커로 통일한다.
function SectionTag({ en, ko }: { en: string; ko: string }) {
  return (
    <p className="bg-ink px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-white">
      {en} · {ko}
    </p>
  );
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
    <div className="flex flex-col gap-10">
      {result.safety.concern && (
        <section className="border-l-4 border-warn bg-warn/5 px-4 py-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-warn">
            Notice · 잠깐, 이것도 알아두세요
          </p>
          <p className="mt-3 break-keep leading-7 text-ink/80">
            혹시 지금 힘들거나 무서운 일이 있다면, 언제든 부모님이나 선생님한테 이야기해도
            괜찮아요. 말하기 어려우면 청소년상담1388(전화·문자 1388)에 물어봐도 돼요.
          </p>
        </section>
      )}

      {/* 총평 */}
      <section>
        <SectionTag en="Summary" ko="총평" />
        <p className="mt-4 break-keep text-lg leading-9 text-ink/85">{result.summary}</p>
        {isUncertain && (
          <p className="mt-3 break-keep border-l-2 border-warn pl-3 text-sm text-warn">
            이번 글만으로는 정확히 판단하기 어려운 부분이 있어요. 다음 글도 함께 보면 더 잘 알 수 있어요.
          </p>
        )}
        {result.understanding.intent_unclear && (
          <p className="mt-3 break-keep border-l-2 border-ink/20 pl-3 text-sm text-ink/55">
            하고 싶은 말이 조금 더 분명해지면 좋을 것 같아요.
          </p>
        )}
      </section>

      {/* 지표 */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TierBadge label="사고력" tier={result.scores.사고력} />
        <TierBadge label="논리력" tier={result.scores.논리력} />
        <TierBadge label="표현력" tier={result.scores.표현력} />
        <TierBadge label="구성력" tier={result.scores.구성력} />
      </section>

      {/* 잘한 점 */}
      <section>
        <SectionTag en="Strengths" ko="잘한 점" />
        <ul className="mt-2">
          {result.strengths.map((s, i) => (
            <li key={i} className="flex gap-4 border-b border-ink/15 py-4">
              <span className="shrink-0 bg-growth/15 px-2 py-1 text-[11px] font-bold tracking-widest text-growth">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="break-keep leading-7 text-ink/80">{s}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 우선 개선점 */}
      <section>
        <SectionTag en="One Fix" ko={`다음에 이것만 · ${result.priority_issue.category}`} />
        <p className="mt-4 break-keep border-l-4 border-ink pl-4 leading-8 text-ink/80">
          {result.priority_issue.note}
        </p>
      </section>

      {/* 문단별 */}
      {result.paragraph_feedback.length > 0 && (
        <section>
          <SectionTag en="Line Edits" ko="문단별로 살펴보기" />
          <p className="mt-3 break-keep text-xs text-ink/45">
            강조된 표현은 고쳐볼 만한 부분이에요. 질문에 대한 내 생각도 적어보세요.
          </p>
          <div className="mt-2">
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
          </div>
        </section>
      )}

      {/* 표현·맞춤법 */}
      {result.mechanics_table.length > 0 && (
        <section>
          <SectionTag en="Proofreading" ko="표현·맞춤법" />
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y-2 border-ink text-left">
                  <th className="py-2 pr-3 text-[10px] uppercase tracking-[0.2em] text-ink/50">
                    원문
                  </th>
                  <th className="py-2 pr-3 text-[10px] uppercase tracking-[0.2em] text-ink/50">
                    고친 표현
                  </th>
                  <th className="py-2 text-[10px] uppercase tracking-[0.2em] text-ink/50">
                    이유
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.mechanics_table.map((row, i) => (
                  <tr key={i} className="border-b border-ink/15 align-top">
                    <td className="py-3 pr-3 font-mono text-ink/60 line-through">
                      {row.original}
                    </td>
                    <td className="py-3 pr-3 font-mono font-bold text-ink">
                      {row.revised}
                    </td>
                    <td className="break-keep py-3 leading-6 text-ink/70">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 스스로 고쳐쓰기 질문 */}
      <section>
        <SectionTag en="Questions" ko="스스로 고쳐 쓸 때 생각해볼 질문" />
        <ul className="mt-2">
          {result.self_revision_questions.map((q, i) => (
            <li key={i} className="flex gap-4 border-b border-ink/15 py-4">
              <span className="shrink-0 font-mono text-sm text-ink/35">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="break-keep leading-7 text-ink/80">{q}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 다음 학습 과제 */}
      <section className="bg-ink p-6 text-white">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">
          Next Assignment · 다음 학습 과제
        </p>
        <p className="mt-4 break-keep text-lg font-extrabold tracking-tight">
          {result.next_task.skill}
        </p>
        <p className="mt-2 break-keep leading-7 text-white/70">{result.next_task.prompt}</p>
      </section>

      <div className="flex flex-wrap justify-end gap-3 border-t-2 border-ink pt-6">
        {canCompare && (
          <button
            onClick={onCompare}
            className="border-2 border-ink px-6 py-3 text-sm font-bold tracking-wide text-ink transition hover:bg-ink hover:text-white"
          >
            이전 글과 비교하기
          </button>
        )}
        {canRewrite && (
          <button
            onClick={onRewrite}
            className="border-2 border-ink px-6 py-3 text-sm font-bold tracking-wide text-ink transition hover:bg-ink hover:text-white"
          >
            다시 써보기
          </button>
        )}
        <button
          onClick={onDone}
          className="bg-ink px-6 py-3 text-sm font-bold tracking-wide text-white transition hover:bg-accent"
        >
          여기까지 완료로 저장
        </button>
      </div>
    </div>
  );
}
