"use client";

import { EvaluationResult, Tier } from "@/lib/types";

const TIER_STYLE: Record<Tier, string> = {
  능숙: "bg-growth/10 text-growth border-growth/30",
  보통: "bg-accent/10 text-accent border-accent/30",
  도움필요: "bg-warn/10 text-warn border-warn/30",
};

function ScoreBadge({ label, tier }: { label: string; tier: Tier }) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-xl border px-4 py-3 ${TIER_STYLE[tier]}`}
    >
      <span className="text-xs text-ink/60">{label}</span>
      <span className="font-heading text-lg">{tier}</span>
    </div>
  );
}

interface Props {
  result: EvaluationResult;
  canRewrite: boolean;
  onRewrite: () => void;
  onDone: () => void;
}

export default function ResultView({
  result,
  canRewrite,
  onRewrite,
  onDone,
}: Props) {
  const isUncertain = result.scores.confidence === "판단하기 어려움";

  return (
    <div className="flex flex-col gap-6">
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
        <ScoreBadge label="사고력" tier={result.scores.사고력} />
        <ScoreBadge label="논리력" tier={result.scores.논리력} />
        <ScoreBadge label="표현력" tier={result.scores.표현력} />
        <ScoreBadge label="구성력" tier={result.scores.구성력} />
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
          {result.paragraph_feedback.map((p) => (
            <div
              key={p.paragraph_no}
              className="rounded-lg border border-ink/10 bg-white p-4"
            >
              <p className="text-xs font-mono text-ink/50">
                {p.paragraph_no}번째 문단 · {p.role}
              </p>
              <p className="mt-1">{p.good}</p>
              <p className="mt-2 text-accent">{p.question}</p>
            </div>
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

      <div className="flex justify-end gap-3">
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
