"use client";

import { useState } from "react";
import EssayForm from "@/components/EssayForm";
import ResultView from "@/components/ResultView";
import { EvaluationResult, GradeBand, WritingType } from "@/lib/types";

const MAX_FREE_REWRITES = 3; // PRD 04 핵심 루프: 무료 재작성은 에세이당 3회까지

interface VersionRecord {
  text: string;
  versionNo: number;
  writingType: WritingType;
  gradeBand: GradeBand;
  topicTitle?: string;
  result: EvaluationResult;
}

type ViewMode = "writing" | "result" | "done";

export default function Home() {
  const [history, setHistory] = useState<VersionRecord[]>([]);
  const [view, setView] = useState<ViewMode>("writing");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = history[history.length - 1];
  const nextVersionNo = history.length + 1;
  const reachedLimit = history.length >= MAX_FREE_REWRITES;

  async function submitEssay(data: {
    studentText: string;
    writingType: WritingType;
    gradeBand: GradeBand;
    topicTitle?: string;
  }) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentText: data.studentText,
          writingType: data.writingType,
          gradeBand: data.gradeBand,
          topicTitle: data.topicTitle,
          versionNo: nextVersionNo,
          previousVersions: history.map((h) => ({
            text: h.text,
            versionNo: h.versionNo,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "알 수 없는 오류가 발생했어요.");
        return;
      }
      setHistory((prev) => [
        ...prev,
        {
          text: data.studentText,
          versionNo: nextVersionNo,
          writingType: data.writingType,
          gradeBand: data.gradeBand,
          topicTitle: data.topicTitle,
          result: body.result as EvaluationResult,
        },
      ]);
      setView("result");
    } catch {
      setError("서버와 통신하는 중 문제가 생겼어요. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  function startNewEssay() {
    setHistory([]);
    setError(null);
    setView("writing");
  }

  if (view === "done") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-heading text-2xl text-growth">오늘 글쓰기 완료!</h1>
        <p className="mt-3 text-ink/70">
          이번 글은 성장 기록에 저장했어요. 다음에 또 써보러 올까요?
        </p>
        <button
          className="mt-6 rounded-full bg-accent px-6 py-2 font-medium text-white"
          onClick={startNewEssay}
        >
          새 글 쓰러 가기
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="font-heading text-2xl text-accent">글자국</h1>
        <p className="mt-1 text-sm text-ink/60">
          네 생각이 자라는 흔적을 함께 살펴봐요.
        </p>
      </header>

      {view === "writing" && (
        <>
          {current && (
            <p className="mb-4 text-center text-sm text-ink/50">
              {nextVersionNo}번째 시도 · 앞의 피드백을 보고 고쳐 써보세요.
            </p>
          )}
          <EssayForm
            initialText={current?.text ?? ""}
            initialWritingType={current?.writingType}
            initialGradeBand={current?.gradeBand}
            initialTopicTitle={current?.topicTitle}
            submitting={submitting}
            submitLabel={current ? "다시 보여주기" : "선생님께 보여주기"}
            onSubmit={submitEssay}
          />
        </>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-warn/10 p-3 text-sm text-warn">{error}</p>
      )}

      {view === "result" && current && (
        <div className="flex flex-col gap-6">
          <p className="text-center text-sm text-ink/50">
            {current.versionNo}번째 시도
            {current.topicTitle ? ` · ${current.topicTitle}` : ""}
          </p>
          <ResultView
            result={current.result}
            canRewrite={!reachedLimit}
            onRewrite={() => setView("writing")}
            onDone={() => setView("done")}
          />
          {reachedLimit && (
            <p className="text-center text-sm text-ink/50">
              오늘은 여기까지 해볼까요? 내일 또 다른 글로 만나요.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
