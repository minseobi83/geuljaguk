"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EssayForm from "@/components/EssayForm";
import ResultView from "@/components/ResultView";
import VersionCompare from "@/components/VersionCompare";
import { createClient } from "@/lib/supabase/client";
import { formatDateShort } from "@/lib/format";
import TopNav from "@/components/TopNav";
import {
  ChildProfile,
  EvaluationResult,
  GradeBand,
  ParagraphAnswer,
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
  paragraphAnswers?: ParagraphAnswer[];
  // AI가 그 시도에서 실제로 반환한 원문 텍스트. 다음 시도를 채점할 때 대화 턴으로
  // 다시 보내서(멀티턴 프롬프트 캐싱) 매번 이전 글 전체를 새 토큰으로 청구하지 않게 한다.
  rawResponseText: string;
}

type ViewMode = "writing" | "result" | "done" | "compare";

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
  const [progressChars, setProgressChars] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [paragraphAnswers, setParagraphAnswers] = useState<Record<number, string>>({});

  const current = history[history.length - 1];
  const previous = history[history.length - 2];
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
    setProgressChars(0);
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
            writingType: h.writingType,
            gradeBand: h.gradeBand,
            topicTitle: h.topicTitle,
            paragraphAnswers: h.paragraphAnswers,
            rawResponseText: h.rawResponseText,
          })),
        }),
      });

      // 실패(로그인 필요/입력 오류/글감 한도 등)는 예전과 똑같이 상태 코드가 있는 JSON.
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "알 수 없는 오류가 발생했어요.");
        return;
      }
      if (!res.body) {
        setError("서버 응답을 받지 못했어요. 다시 시도해 주세요.");
        return;
      }

      // 성공(200)은 NDJSON 스트림: 채점이 진행되는 동안 progress 이벤트로 진행 상황을 받고,
      // 끝나면 done(성공) 또는 error(실패) 이벤트를 받는다.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let doneEvent: {
        result: EvaluationResult;
        rawResponseText: string;
        essayId: string | null;
        topicAttempt: TopicAttempt | null;
      } | null = null;
      let streamErrorMessage: string | null = null;

      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;
          const event = JSON.parse(line);
          if (event.type === "progress") {
            setProgressChars(event.chars);
          } else if (event.type === "done") {
            doneEvent = event;
          } else if (event.type === "error") {
            streamErrorMessage = event.error;
          }
        }
      }

      if (streamErrorMessage) {
        setError(streamErrorMessage);
        return;
      }
      if (!doneEvent) {
        setError("피드백을 받지 못했어요. 다시 시도해 주세요.");
        return;
      }

      if (doneEvent.essayId) setEssayId(doneEvent.essayId);
      setTopicAttempt(doneEvent.topicAttempt ?? null);
      setHistory((prev) => [
        ...prev,
        {
          text: data.studentText,
          versionNo: nextVersionNo,
          writingType: data.writingType,
          gradeBand: data.gradeBand,
          topicTitle: data.topicTitle,
          result: doneEvent.result,
          rawResponseText: doneEvent.rawResponseText,
        },
      ]);
      setParagraphAnswers({});
      setView("result");
    } catch {
      setError("서버와 통신하는 중 문제가 생겼어요. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
      setProgressChars(0);
    }
  }

  function handleParagraphAnswerChange(paragraphNo: number, value: string) {
    setParagraphAnswers((prev) => ({ ...prev, [paragraphNo]: value }));
  }

  function handleRewrite() {
    // 지금까지 적은 문단별 답변을 이번 시도 기록에 붙여둔다 - 다음 채점 때 아이 생각을 참고하도록.
    const answers: ParagraphAnswer[] = Object.entries(paragraphAnswers)
      .filter(([, answer]) => answer.trim().length > 0)
      .map(([paragraphNo, answer]) => ({
        paragraph_no: Number(paragraphNo),
        answer: answer.trim(),
      }));
    if (answers.length > 0) {
      setHistory((prev) =>
        prev.map((h, i) => (i === prev.length - 1 ? { ...h, paragraphAnswers: answers } : h))
      );
    }
    setView("writing");
  }

  function startNewEssay() {
    setHistory([]);
    setEssayId(null);
    setTopicAttempt(null);
    setError(null);
    setParagraphAnswers({});
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
    <>
      <TopNav />
      <div className="mb-8 flex items-start justify-between">
        <p className="text-sm text-ink/60">
          네 생각이 자라는 흔적을 함께 살펴봐요.
        </p>
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
          <button onClick={handleLogout} className="text-ink/40 underline">
            로그아웃
          </button>
        </div>
      </div>
    </>
  );

  if (view === "done") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center lg:max-w-3xl">
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
    <main className="mx-auto max-w-2xl px-4 py-10 lg:max-w-4xl xl:max-w-5xl">
      {header}

      {view === "writing" && (
        <div className="lg:flex lg:items-start lg:gap-8">
          <div className="lg:max-w-2xl lg:flex-1">
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
            {submitting && (
              <p className="mt-3 text-center text-xs text-ink/40">
                {progressChars > 0
                  ? `선생님이 벌써 ${progressChars}자 정도 써주고 있어요...`
                  : "글을 읽고 있어요..."}
              </p>
            )}
            {error && (
              <p className="mt-4 rounded-md bg-warn/10 p-3 text-sm text-warn">{error}</p>
            )}
          </div>

          {!current && recentEssays.length > 0 && (
            <section className="mt-10 lg:mt-0 lg:w-72 lg:shrink-0">
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
        </div>
      )}

      {view === "result" && current && (
        <div className="flex flex-col gap-6 lg:mx-auto lg:max-w-2xl">
          <p className="text-center text-sm text-ink/50">
            {current.versionNo}번째 시도
            {current.topicTitle ? ` · ${current.topicTitle}` : ""}
            {topicAttempt ? ` (이 글감 ${topicAttempt.used}/${topicAttempt.max}회)` : ""}
          </p>
          <ResultView
            result={current.result}
            studentText={current.text}
            paragraphAnswers={paragraphAnswers}
            onParagraphAnswerChange={handleParagraphAnswerChange}
            canRewrite={!reachedLimit}
            onRewrite={handleRewrite}
            onDone={() => setView("done")}
            canCompare={Boolean(previous)}
            onCompare={() => setView("compare")}
          />
          {reachedLimit && (
            <p className="text-center text-sm text-ink/50">
              이 글감은 오늘 {topicAttempt?.max}번 다 써봤어요. 다른 글감으로 새 글을
              써볼까요?
            </p>
          )}
        </div>
      )}

      {view === "compare" && current && previous && (
        <div className="lg:mx-auto lg:max-w-2xl">
          <VersionCompare
            before={{ text: previous.text, versionNo: previous.versionNo }}
            after={{ text: current.text, versionNo: current.versionNo }}
            onClose={() => setView("result")}
          />
        </div>
      )}
    </main>
  );
}
