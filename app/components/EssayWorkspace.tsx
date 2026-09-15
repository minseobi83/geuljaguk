"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EssayForm from "@/components/EssayForm";
import ResultView from "@/components/ResultView";
import { createClient } from "@/lib/supabase/client";
import { formatDateShort } from "@/lib/format";
import {
  ChildProfile,
  EvaluationResult,
  GradeBand,
  RecentEssay,
  WritingType,
} from "@/lib/types";

interface TopicAttempt {
  used: number;
  max: number;
}

interface VersionRecord {
  text: string;
  versionNo: number;
  writingType: WritingType;
  gradeBand: GradeBand;
  topicTitle?: string;
  result: EvaluationResult;
}

type ViewMode = "writing" | "result" | "done";

interface Props {
  child: ChildProfile;
  allChildren: ChildProfile[];
  recentEssays: RecentEssay[];
}

export default function EssayWorkspace({ child, allChildren, recentEssays }: Props) {
  const router = useRouter();
  const [history, setHistory] = useState<VersionRecord[]>([]);
  const [essayId, setEssayId] = useState<string | null>(null);
  const [topicAttempt, setTopicAttempt] = useState<TopicAttempt | null>(null);
  const [view, setView] = useState<ViewMode>("writing");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = history[history.length - 1];
  const nextVersionNo = history.length + 1;
  // 글감이 있는 글만 제한한다 (직접 정한 자유 주제는 topicAttempt가 없어 제한 없음).
  const reachedLimit = Boolean(topicAttempt && topicAttempt.used >= topicAttempt.max);

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
          childId: child.id,
          essayId,
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
      if (body.essayId) setEssayId(body.essayId);
      setTopicAttempt(body.topicAttempt ?? null);
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
    setEssayId(null);
    setTopicAttempt(null);
    setError(null);
    setView("writing");
    router.refresh(); // 최근에 쓴 글 목록에 방금 저장한 글이 반영되도록
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const header = (
    <header className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="font-heading text-2xl text-accent">글자국</h1>
        <p className="mt-1 text-sm text-ink/60">
          네 생각이 자라는 흔적을 함께 살펴봐요.
        </p>
      </div>
      <div className="flex flex-col items-end gap-2 text-sm">
        {allChildren.length > 1 ? (
          <select
            className="rounded-md border border-ink/20 bg-white px-2 py-1"
            value={child.id}
            onChange={(e) => router.push(`/?child=${e.target.value}`)}
          >
            {allChildren.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nickname} ({c.grade_band}학년)
              </option>
            ))}
          </select>
        ) : (
          <span className="text-ink/70">
            {child.nickname} ({child.grade_band}학년)
          </span>
        )}
        <a href={`/dashboard?child=${child.id}`} className="text-accent underline">
          보호자 대시보드
        </a>
        <button onClick={handleLogout} className="text-ink/40 underline">
          로그아웃
        </button>
      </div>
    </header>
  );

  if (view === "done") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        {header}
        <h2 className="font-heading text-2xl text-growth">오늘 글쓰기 완료!</h2>
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
      {header}

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
            initialGradeBand={current?.gradeBand ?? child.grade_band}
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
            {topicAttempt ? ` (이 글감 ${topicAttempt.used}/${topicAttempt.max}회)` : ""}
          </p>
          <ResultView
            result={current.result}
            canRewrite={!reachedLimit}
            onRewrite={() => setView("writing")}
            onDone={() => setView("done")}
          />
          {reachedLimit && (
            <p className="text-center text-sm text-ink/50">
              이 글감은 오늘 {topicAttempt?.max}번 다 써봤어요. 다른 글감으로 새 글을
              써볼까요?
            </p>
          )}
        </div>
      )}

      {view === "writing" && !current && recentEssays.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-ink/60">
            {child.nickname}가 최근에 쓴 글
          </h2>
          <ul className="flex flex-col gap-2">
            {recentEssays.map((essay) => (
              <li
                key={essay.id}
                className="rounded-lg border border-ink/10 bg-white p-3 text-sm"
              >
                <p className="font-medium">
                  {essay.topic_title ?? essay.writing_type}
                  <span className="ml-2 text-xs text-ink/40">
                    {formatDateShort(essay.created_at)}
                  </span>
                </p>
                {essay.latest_summary && (
                  <p className="mt-1 text-ink/60">{essay.latest_summary}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
