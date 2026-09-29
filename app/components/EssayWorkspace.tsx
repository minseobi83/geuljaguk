"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import EssayForm from "@/components/EssayForm";
import ResultView from "@/components/ResultView";
import VersionCompare from "@/components/VersionCompare";
import { formatDateShort } from "@/lib/format";
import { splitByTone } from "@/lib/tone";
import { Topic } from "@/lib/topics";
import { DifficultyRecommendation } from "@/lib/difficulty";
import TopNav from "@/components/TopNav";
import { createClient } from "@/lib/supabase/client";
import { saveParagraphAnswers } from "@/lib/supabase/queries";
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
  // DB에 저장된 이 시도 행의 id. 문단별 답변을 이 행에 저장한다 (저장에 실패한 시도면 null).
  versionId: string | null;
  // AI가 그 시도에서 실제로 반환한 원문 텍스트. 다음 시도를 채점할 때 대화 턴으로
  // 다시 보내서(멀티턴 프롬프트 캐싱) 매번 이전 글 전체를 새 토큰으로 청구하지 않게 한다.
  rawResponseText: string;
}

type ViewMode = "writing" | "result" | "done" | "compare";
type AnswerSaveState = "idle" | "saving" | "saved" | "error";

// 답변을 적는 동안 이 시간만큼 손을 멈추면 자동 저장한다.
const ANSWER_SAVE_DELAY_MS = 1200;

function toAnswerList(answers: Record<number, string>): ParagraphAnswer[] {
  return Object.entries(answers)
    .filter(([, answer]) => answer.trim().length > 0)
    .map(([paragraphNo, answer]) => ({
      paragraph_no: Number(paragraphNo),
      answer: answer.trim(),
    }));
}

interface Props {
  child: ChildProfile;
  allChildren: ChildProfile[];
  recentEssays: RecentEssay[];
  // 관리자가 관리하는 글감 목록. 서버에서 DB를 읽어 내려주고, 읽지 못했으면 코드의 기본 목록이 온다.
  topics: Topic[];
  recommendation?: DifficultyRecommendation;
}

export default function EssayWorkspace({
  child,
  allChildren,
  recentEssays,
  topics,
  recommendation,
}: Props) {
  const router = useRouter();
  const [history, setHistory] = useState<VersionRecord[]>([]);
  const [essayId, setEssayId] = useState<string | null>(null);
  const [topicAttempt, setTopicAttempt] = useState<TopicAttempt | null>(null);
  const [view, setView] = useState<ViewMode>("writing");
  const [submitting, setSubmitting] = useState(false);
  const [progressChars, setProgressChars] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [paragraphAnswers, setParagraphAnswers] = useState<Record<number, string>>({});
  const [answerSaveState, setAnswerSaveState] = useState<AnswerSaveState>("idle");
  const answerSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 자동 저장을 기다리는 중인 답변. 그 사이 창을 닫으면 이 값을 sendBeacon으로 보낸다.
  const pendingAnswers = useRef<{ versionId: string; answers: ParagraphAnswer[] } | null>(null);

  // 창을 닫거나(pagehide) 다른 앱·탭으로 넘어갈 때(visibilitychange → hidden) 저장을 기다리던
  // 답변을 바로 보낸다. 일반 요청은 페이지가 닫히며 끊길 수 있어, 전송이 보장되는 sendBeacon을 쓴다.
  // (모바일에서는 탭을 닫기 전에 hidden 상태를 거치는 경우가 많아 두 이벤트를 모두 본다.)
  useEffect(() => {
    function takePending() {
      const pending = pendingAnswers.current;
      if (!pending) return null;
      if (answerSaveTimer.current) {
        clearTimeout(answerSaveTimer.current);
        answerSaveTimer.current = null;
      }
      pendingAnswers.current = null;
      return pending;
    }

    // 창이 정말 닫힐 때: 응답을 기다릴 수 없으니 전송만 보장한다.
    function sendOnUnload() {
      const pending = takePending();
      if (!pending) return;
      const body = new Blob([JSON.stringify(pending)], { type: "text/plain" });
      if (!navigator.sendBeacon?.("/api/paragraph-answers", body)) {
        void fetch("/api/paragraph-answers", { method: "POST", body, keepalive: true });
      }
    }

    // 다른 탭·앱으로 넘어갈 때: 페이지는 살아 있으니 결과를 받아 저장 상태 문구도 갱신한다.
    // keepalive라 그 사이 탭이 닫혀도 요청은 끝까지 간다.
    function sendOnHidden() {
      const pending = takePending();
      if (!pending) return;
      setAnswerSaveState("saving");
      fetch("/api/paragraph-answers", {
        method: "POST",
        body: JSON.stringify(pending),
        keepalive: true,
      })
        .then((res) => setAnswerSaveState(res.ok ? "saved" : "error"))
        .catch(() => setAnswerSaveState("error"));
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") sendOnHidden();
    }
    window.addEventListener("pagehide", sendOnUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", sendOnUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      // 앱 안에서 다른 화면으로 이동해 이 화면이 사라질 때도 남은 답변을 보낸다.
      sendOnUnload();
    };
  }, []);
  // 첨삭 노트가 길면 접어두고, 누르면 펼친다.
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

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
        versionId: string | null;
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
          versionId: doneEvent.versionId ?? null,
          rawResponseText: doneEvent.rawResponseText,
        },
      ]);
      setParagraphAnswers({});
      setAnswerSaveState("idle");
      setView("result");
    } catch {
      setError("서버와 통신하는 중 문제가 생겼어요. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
      setProgressChars(0);
    }
  }

  async function persistAnswers(versionId: string | null, answers: ParagraphAnswer[]) {
    pendingAnswers.current = null;
    if (!versionId) return; // 이 시도 자체가 저장되지 못했으면 답변도 붙일 곳이 없다.
    setAnswerSaveState("saving");
    const { ok } = await saveParagraphAnswers(createClient(), versionId, answers);
    setAnswerSaveState(ok ? "saved" : "error");
  }

  function handleParagraphAnswerChange(paragraphNo: number, value: string) {
    const next = { ...paragraphAnswers, [paragraphNo]: value };
    setParagraphAnswers(next);
    // 적는 동안 잠깐 멈추면 자동 저장 - 새로고침하거나 창을 닫아도 답변이 남도록.
    if (answerSaveTimer.current) clearTimeout(answerSaveTimer.current);
    const versionId = current?.versionId ?? null;
    pendingAnswers.current = versionId ? { versionId, answers: toAnswerList(next) } : null;
    answerSaveTimer.current = setTimeout(() => {
      answerSaveTimer.current = null;
      void persistAnswers(versionId, toAnswerList(next));
    }, ANSWER_SAVE_DELAY_MS);
  }

  // 자동 저장을 기다리는 중인 답변이 있으면 바로 저장한다 (화면을 떠나기 전에 호출).
  function flushAnswerSave() {
    if (!answerSaveTimer.current) return;
    clearTimeout(answerSaveTimer.current);
    answerSaveTimer.current = null;
    void persistAnswers(current?.versionId ?? null, toAnswerList(paragraphAnswers));
  }

  function handleDone() {
    flushAnswerSave();
    setView("done");
  }

  function handleRewrite() {
    flushAnswerSave();
    // 지금까지 적은 문단별 답변을 이번 시도 기록에 붙여둔다 - 다음 채점 때 아이 생각을 참고하도록.
    const answers = toAnswerList(paragraphAnswers);
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
    setAnswerSaveState("idle");
    setView("writing");
    router.refresh(); // 최근에 쓴 글 목록에 방금 저장한 글이 반영되도록
  }

  // 잡지 지면의 "발행인 정보" 줄처럼 쓰는 메타 행 (모든 상태에서 공통).
  // 로그아웃은 상단 내비게이션(TopNav)으로 옮겼다 - 대시보드·성장기록 같은 다른 화면에서는
  // 로그아웃할 방법이 아예 없었기 때문.
  const metaRow = (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 py-4 text-[10px] uppercase tracking-[0.25em] text-ink/45">
      <span className="break-keep">네 생각이 자라는 흔적을 함께 살펴봐요</span>
      <div className="flex items-center gap-4">
        {allChildren.length > 1 ? (
          <select
            className="border-b border-ink/30 bg-transparent pb-0.5 text-[10px] uppercase tracking-[0.2em] text-ink outline-none"
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
            {child.nickname} · {child.grade_band}학년
          </span>
        )}
      </div>
    </div>
  );

  const pageFooter = (
    <footer className="mt-16 bg-ink py-6 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 text-[10px] uppercase tracking-[0.3em] text-white/50 lg:px-10">
        <span>글자국 · 오늘의 원고</span>
      </div>
    </footer>
  );

  if (view === "done") {
    return (
      <>
        <TopNav />
        <main className="mx-auto max-w-6xl px-5 lg:px-10">
          {metaRow}
          <div className="py-20 text-center">
            <span className="bg-ink px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white">
              Printed · 발행 완료
            </span>
            <h2 className="mt-6 break-keep text-4xl font-black tracking-[-0.03em] text-ink sm:text-5xl">
              오늘 글쓰기 완료!
            </h2>
            <p className="mt-4 break-keep text-sm text-ink/60">
              이번 글은 성장 기록에 저장했어요. 다음에 또 써보러 올까요?
            </p>
            <button
              className="mt-8 bg-ink px-8 py-3 text-sm font-bold tracking-wide text-white transition hover:bg-accent"
              onClick={startNewEssay}
            >
              새 글 쓰러 가기
            </button>
          </div>
        </main>
        {pageFooter}
      </>
    );
  }

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-6xl px-5 lg:px-10">
        {metaRow}

      {view === "writing" && (
        <>
          <header className="border-b-2 border-ink py-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="bg-ink px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white">
                Today’s Manuscript · 오늘의 원고
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45">
                No. {String(nextVersionNo).padStart(2, "0")} — {nextVersionNo}번째 시도
              </span>
            </div>
            <h1 className="mt-6 break-keep text-3xl font-black leading-tight tracking-[-0.03em] text-ink sm:text-5xl">
              {current ? "피드백을 보고 고쳐 써볼까요?" : "오늘은 무엇을 써볼까요?"}
            </h1>
          </header>

        <div className="grid gap-10 py-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-8">
            <EssayForm
              topics={topics}
              recommendation={recommendation}
              initialText={current?.text ?? ""}
              initialWritingType={current?.writingType}
              initialGradeBand={current?.gradeBand ?? child.grade_band}
              initialTopicTitle={current?.topicTitle}
              submitting={submitting}
              submitLabel={current ? "다시 보여주기" : "선생님께 보여주기"}
              onSubmit={submitEssay}
            />
            {submitting && (
              <p className="mt-3 font-mono text-xs text-ink/45">
                {progressChars > 0
                  ? `선생님이 벌써 ${progressChars}자 정도 써주고 있어요...`
                  : "글을 읽고 있어요..."}
              </p>
            )}
            {error && (
              <p className="mt-4 break-keep border-l-4 border-warn bg-warn/5 px-4 py-3 text-sm text-warn">
                {error}
              </p>
            )}
          </div>

          {recentEssays.length > 0 && (
            <aside className="lg:col-span-4">
              <p className="bg-ink px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-white">
                Editor’s Note · 선생님 첨삭 노트
              </p>
              <ul>
                {recentEssays.map((essay) => {
                  const expanded = expandedNoteId === essay.id;
                  const segments = essay.latest_summary
                    ? splitByTone(essay.latest_summary)
                    : [];
                  const isLong = Boolean(
                    essay.latest_summary && essay.latest_summary.length > 90
                  );
                  return (
                    <li key={essay.id} className="border-b border-ink/15 py-3">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="shrink-0 font-mono text-xs text-ink/40">
                          {formatDateShort(essay.created_at)}
                        </span>
                        <span className="break-keep text-base font-bold tracking-tight text-ink">
                          {essay.topic_title ?? essay.writing_type}
                        </span>
                        {essay.priority_category && (
                          <span className="shrink-0 border border-warn px-1.5 py-0.5 text-[10px] font-bold text-warn">
                            보완 · {essay.priority_category}
                          </span>
                        )}
                      </div>
                      {segments.length > 0 && (
                        <>
                          {/* 보완이 필요한 어투의 문장만 진하게 */}
                          <p
                            className={`mt-1 break-keep text-sm leading-6 text-ink/55 ${
                              expanded ? "" : "line-clamp-4"
                            }`}
                          >
                            {segments.map((seg, i) =>
                              seg.improvement ? (
                                <strong key={i} className="font-bold text-ink">
                                  {seg.text}{" "}
                                </strong>
                              ) : (
                                <span key={i}>{seg.text} </span>
                              )
                            )}
                          </p>
                          {isLong && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedNoteId(expanded ? null : essay.id)
                              }
                              className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink/45 underline underline-offset-4"
                            >
                              {expanded ? "접기" : "전체 보기"}
                            </button>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </aside>
          )}
        </div>
        </>
      )}

      {view === "result" && current && (
        <div className="flex flex-col gap-6 py-10 lg:mx-auto lg:max-w-3xl">
          <div className="border-b-2 border-ink pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="bg-ink px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white">
                Editor’s Note · 첨삭
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45">
                No. {String(current.versionNo).padStart(2, "0")}
                {topicAttempt ? ` · ${topicAttempt.used}/${topicAttempt.max}회` : ""}
              </span>
            </div>
            {current.topicTitle && (
              <p className="mt-4 break-keep text-2xl font-black tracking-tight text-ink">
                {current.topicTitle}
              </p>
            )}
          </div>
          {answerSaveState !== "idle" && (
            <p
              className={`-mt-3 text-right font-mono text-[11px] ${
                answerSaveState === "error" ? "text-warn" : "text-ink/40"
              }`}
            >
              {answerSaveState === "saving" && "답변 저장 중..."}
              {answerSaveState === "saved" && "답변을 저장했어요"}
              {answerSaveState === "error" && "답변을 저장하지 못했어요. 조금 뒤 다시 적어볼까요?"}
            </p>
          )}
          <ResultView
            result={current.result}
            studentText={current.text}
            paragraphAnswers={paragraphAnswers}
            onParagraphAnswerChange={handleParagraphAnswerChange}
            canRewrite={!reachedLimit}
            onRewrite={handleRewrite}
            onDone={handleDone}
            canCompare={Boolean(previous)}
            onCompare={() => setView("compare")}
          />
          {reachedLimit && (
            <p className="break-keep border-l-4 border-ink pl-4 text-sm text-ink/60">
              이 글감은 오늘 {topicAttempt?.max}번 다 써봤어요. 다른 글감으로 새 글을
              써볼까요?
            </p>
          )}
        </div>
      )}

      {view === "compare" && current && previous && (
        <div className="py-10 lg:mx-auto lg:max-w-3xl">
          <VersionCompare
            before={{ text: previous.text, versionNo: previous.versionNo }}
            after={{ text: current.text, versionNo: current.versionNo }}
            onClose={() => setView("result")}
          />
        </div>
      )}
      </main>
      {pageFooter}
    </>
  );
}
