"use client";

import { useState, useTransition } from "react";
import { formatDateShort } from "@/lib/format";
import { PromptVersion } from "@/lib/supabase/promptQueries";
import {
  ERROR_STAGE_LABELS,
  ErrorOverview,
  ErrorStage,
  REVIEW_ISSUES,
  REVIEW_VERDICTS,
  ReviewQueueItem,
  ReviewVerdict,
  VersionQualitySummary,
} from "@/lib/supabase/qualityQueries";
import { ActionResult, saveEvaluationReview, setErrorResolved } from "@/app/admin/actions";
import ResultView from "./ResultView";

// 관리자 3차분(2026-09-24): "품질 검토" · "오류" 탭. AdminConsole.tsx가 커져서 따로 뺐다.

const noop = () => {};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${formatDateShort(iso)} ${hh}:${mi}`;
}

function versionLabel(id: string | null, versions: PromptVersion[]): string {
  if (!id) return "코드 기본값";
  return versions.find((v) => v.id === id)?.label ?? "(삭제된 버전)";
}

const VERDICT_STYLE: Record<ReviewVerdict, string> = {
  적절: "border-growth text-growth",
  아쉬움: "border-ink/40 text-ink/70",
  부적절: "border-warn text-warn",
};

// ---------------------------------------------------------------------------
// 품질 검토
// ---------------------------------------------------------------------------

export function ReviewTab({
  items,
  error,
  summaries,
  summaryError,
  versions,
  currentUserId,
  onDone,
}: {
  items: ReviewQueueItem[];
  error: string | null;
  summaries: VersionQualitySummary[];
  summaryError: string | null;
  versions: PromptVersion[];
  currentUserId: string;
  onDone: (r: ActionResult) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [onlyPending, setOnlyPending] = useState(true);

  if (error) {
    return (
      <EmptyNotice
        title="검토할 첨삭을 읽지 못했어요"
        body={`아직 schema.sql(관리자 3차분)을 실행하지 않았을 수 있어요. (${error})`}
      />
    );
  }

  const pendingCount = items.filter((i) => i.reviews.length === 0).length;
  const shown = onlyPending ? items.filter((i) => i.reviews.length === 0) : items;

  return (
    <>
      <section className="mt-8">
        <SectionLabel>Quality · 평가기준 버전별 검토 결과</SectionLabel>
        <p className="mt-3 break-keep text-xs leading-6 text-ink/45">
          관리자가 남긴 판정을 채점에 쓰인 평가기준 버전별로 모았어요. 버전을 바꾼 뒤 &lsquo;적절&rsquo;
          비율이 올라갔는지 확인해보세요.
        </p>
        {summaryError ? (
          <p className="mt-4 text-sm text-warn">{summaryError}</p>
        ) : summaries.length === 0 ? (
          <p className="mt-4 text-sm text-ink/50">아직 검토한 첨삭이 없어요.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-y-2 border-ink text-left text-[10px] uppercase tracking-[0.2em] text-ink/50">
                  <th className="py-2 pr-3">평가기준 버전</th>
                  <th className="py-2 pr-3 text-right">검토</th>
                  <th className="py-2 pr-3 text-right">적절</th>
                  <th className="py-2 pr-3 text-right">아쉬움</th>
                  <th className="py-2 pr-3 text-right">부적절</th>
                  <th className="py-2">자주 나온 문제</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.promptVersionId ?? "code"} className="border-b border-ink/15 align-top">
                    <td className="break-keep py-3 pr-3 font-bold text-ink">
                      {versionLabel(s.promptVersionId, versions)}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono">{s.total}</td>
                    <td className="py-3 pr-3 text-right font-mono font-bold text-growth">
                      {Math.round((s.counts.적절 / s.total) * 100)}%
                    </td>
                    <td className="py-3 pr-3 text-right font-mono">{s.counts.아쉬움}</td>
                    <td className="py-3 pr-3 text-right font-mono text-warn">{s.counts.부적절}</td>
                    <td className="break-keep py-3 text-xs leading-5 text-ink/60">
                      {s.topIssues.length === 0
                        ? "-"
                        : s.topIssues.map((t) => `${t.issue} ${t.count}`).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-12">
        <SectionLabel>Review · 첨삭 검토 (미검토 {pendingCount}건)</SectionLabel>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="break-keep text-xs leading-6 text-ink/45">
            최근 첨삭 중 아직 검토하지 않은 것부터, 그중에서도 안전 신호·가드레일·판단하기
            어려움이 붙은 것을 먼저 보여줘요.
          </p>
          <label className="flex items-center gap-2 text-xs text-ink/60">
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
            />
            미검토만 보기
          </label>
        </div>

        {shown.length === 0 ? (
          <p className="mt-6 text-sm text-ink/50">
            {onlyPending ? "검토를 기다리는 첨삭이 없어요." : "아직 첨삭 기록이 없어요."}
          </p>
        ) : (
          <ul className="mt-4">
            {shown.map((item) => {
              const open = openId === item.evaluationId;
              const mine = item.reviews.find((r) => r.reviewerId === currentUserId);
              return (
                <li key={item.evaluationId} className="border-b border-ink/15">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : item.evaluationId)}
                    className="flex w-full flex-wrap items-baseline justify-between gap-2 py-4 text-left"
                  >
                    <span className="flex flex-wrap items-baseline gap-2">
                      <span className="break-keep text-base font-bold tracking-tight text-ink">
                        {item.childNickname} ({item.childGrade}학년) ·{" "}
                        {item.topicTitle ?? item.writingType}
                      </span>
                      <span className="text-xs text-ink/45">{item.versionNo}번째 시도</span>
                      {item.flags.map((f) => (
                        <span
                          key={f}
                          className="border border-warn px-1.5 py-0.5 text-[10px] font-bold text-warn"
                        >
                          {f}
                        </span>
                      ))}
                    </span>
                    <span className="flex items-baseline gap-3 font-mono text-xs text-ink/45">
                      {item.reviews.map((r) => (
                        <span
                          key={r.reviewerId}
                          className={`border px-1.5 py-0.5 font-body text-[10px] font-bold ${VERDICT_STYLE[r.verdict]}`}
                        >
                          {r.verdict}
                        </span>
                      ))}
                      <span>{formatDateTime(item.createdAt)}</span>
                    </span>
                  </button>

                  {open && (
                    <div className="pb-8">
                      <p className="text-xs text-ink/45">
                        채점 기준: {versionLabel(item.promptVersionId, versions)}
                      </p>
                      <div className="mt-4 grid gap-8 lg:grid-cols-2">
                        <div>
                          <FieldLabel>학생이 쓴 글</FieldLabel>
                          <p className="mt-2 whitespace-pre-wrap break-keep border border-ink/15 bg-ink/[0.02] p-4 font-heading text-base leading-8 text-ink/85">
                            {item.studentText}
                          </p>
                        </div>
                        <div>
                          <FieldLabel>AI 첨삭</FieldLabel>
                          <div className="mt-2 max-h-[70vh] overflow-y-auto border border-ink/15 p-4">
                            <ResultView
                              result={item.result}
                              studentText={item.studentText}
                              paragraphAnswers={{}}
                              onParagraphAnswerChange={noop}
                              canRewrite={false}
                              onRewrite={noop}
                              onDone={noop}
                              canCompare={false}
                              onCompare={noop}
                              readOnly
                            />
                          </div>
                        </div>
                      </div>

                      {item.reviews
                        .filter((r) => r.reviewerId !== currentUserId)
                        .map((r) => (
                          <p
                            key={r.reviewerId}
                            className="mt-4 break-keep border-l-2 border-ink/20 pl-3 text-xs leading-6 text-ink/60"
                          >
                            다른 관리자 판정: <b>{r.verdict}</b>
                            {r.issues.length > 0 && ` · ${r.issues.join(", ")}`}
                            {r.note && ` — ${r.note}`}
                          </p>
                        ))}

                      <ReviewForm
                        key={`${item.evaluationId}-${mine?.updatedAt ?? "new"}`}
                        evaluationId={item.evaluationId}
                        initial={mine}
                        onDone={onDone}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function ReviewForm({
  evaluationId,
  initial,
  onDone,
}: {
  evaluationId: string;
  initial?: { verdict: ReviewVerdict; issues: string[]; note: string | null };
  onDone: (r: ActionResult) => void;
}) {
  const [verdict, setVerdict] = useState<ReviewVerdict | null>(initial?.verdict ?? null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-6 border-t-2 border-ink pt-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => onDone(await saveEvaluationReview(fd)));
      }}
    >
      <input type="hidden" name="evaluation_id" value={evaluationId} />
      <FieldLabel>이 첨삭은</FieldLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {REVIEW_VERDICTS.map((v) => (
          <label
            key={v}
            className={`cursor-pointer border-2 px-4 py-1.5 text-sm font-bold transition ${
              verdict === v ? `${VERDICT_STYLE[v]} bg-ink/[0.03]` : "border-ink/15 text-ink/40"
            }`}
          >
            <input
              type="radio"
              name="verdict"
              value={v}
              checked={verdict === v}
              onChange={() => setVerdict(v)}
              className="sr-only"
            />
            {v}
          </label>
        ))}
      </div>

      <div className="mt-5">
        <FieldLabel>문제 유형 (여러 개 선택 가능)</FieldLabel>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {REVIEW_ISSUES.map((issue) => (
            <label key={issue} className="flex items-center gap-1.5 text-sm text-ink/70">
              <input
                type="checkbox"
                name="issues"
                value={issue}
                defaultChecked={initial?.issues.includes(issue)}
              />
              {issue}
            </label>
          ))}
        </div>
      </div>

      <label className="mt-5 block">
        <FieldLabel>메모</FieldLabel>
        <input
          name="note"
          defaultValue={initial?.note ?? ""}
          placeholder="예) 근거가 하나뿐인데 논리력을 능숙으로 줌"
          className="mt-1 w-full border-b-2 border-ink bg-transparent pb-1 text-sm outline-none placeholder:text-ink/30"
        />
      </label>

      <button
        type="submit"
        disabled={pending || !verdict}
        className="mt-5 bg-ink px-6 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-accent disabled:opacity-40"
      >
        {initial ? "검토 고쳐 저장" : "검토 저장"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// 오류
// ---------------------------------------------------------------------------

const STAGE_ORDER: ErrorStage[] = ["persist", "evaluate", "guardrail", "quick_screen"];

// meta 중 화면에 보여줄 만한 것만 한 줄로. (본문은 애초에 저장하지 않는다)
function describeMeta(meta: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof meta.writingType === "string") parts.push(meta.writingType);
  if (typeof meta.gradeBand === "string") parts.push(`${meta.gradeBand}학년`);
  if (typeof meta.versionNo === "number") parts.push(`${meta.versionNo}번째 시도`);
  if (typeof meta.textLength === "number") parts.push(`${meta.textLength}자`);
  if (typeof meta.note === "string") parts.push(meta.note);
  return parts.join(" · ");
}

export function ErrorsTab({
  overview,
  error,
  onDone,
}: {
  overview: ErrorOverview | null;
  error: string | null;
  onDone: (r: ActionResult) => void;
}) {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [pending, startTransition] = useTransition();

  if (error || !overview) {
    return (
      <EmptyNotice
        title="오류 기록을 읽지 못했어요"
        body={`아직 schema.sql(관리자 3차분)을 실행하지 않았을 수 있어요. (${error ?? "알 수 없음"})`}
      />
    );
  }

  const { byStage, submissions } = overview.last7Days;
  // 학생이 피드백을 못 받았거나 기록이 사라진 경우만 "실패"로 센다. 사전 검사 실패는
  // 본분석이 그대로 진행되므로 빼고, 첨삭·가드레일 실패는 저장이 안 돼 제출 수에도 안 잡히니
  // 분모에 더해준다.
  const lost = byStage.evaluate + byStage.guardrail;
  const failed = lost + byStage.persist;
  const attempts = submissions + lost;
  const rate = attempts > 0 ? (failed / attempts) * 100 : 0;

  const shown = onlyOpen ? overview.rows.filter((r) => !r.resolved) : overview.rows;

  function toggle(id: string, resolved: boolean) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("resolved", String(resolved));
    startTransition(async () => onDone(await setErrorResolved(fd)));
  }

  return (
    <>
      <section className="mt-8">
        <SectionLabel>Last 7 days · 최근 7일</SectionLabel>
        <div className="mt-4 grid grid-cols-2 gap-px bg-ink/15 sm:grid-cols-4">
          {STAGE_ORDER.map((stage) => (
            <div key={stage} className="bg-white p-5 text-center">
              <p
                className={`text-3xl font-black tracking-tight ${
                  byStage[stage] > 0 && stage !== "quick_screen" ? "text-warn" : "text-ink"
                }`}
              >
                {byStage[stage]}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink/45">
                {ERROR_STAGE_LABELS[stage].label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 break-keep text-sm leading-6 text-ink/70">
          제출 시도 약 {attempts}건 중 {failed}건이 실패했어요 (
          <b className={rate >= 5 ? "text-warn" : "text-ink"}>{rate.toFixed(1)}%</b>).
        </p>
        <ul className="mt-3 flex flex-col gap-1">
          {STAGE_ORDER.map((stage) => (
            <li key={stage} className="break-keep text-xs leading-5 text-ink/45">
              <b className="text-ink/60">{ERROR_STAGE_LABELS[stage].label}</b> —{" "}
              {ERROR_STAGE_LABELS[stage].help}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <SectionLabel>Log · 최근 오류</SectionLabel>
        <div className="mt-3 flex justify-end">
          <label className="flex items-center gap-2 text-xs text-ink/60">
            <input
              type="checkbox"
              checked={onlyOpen}
              onChange={(e) => setOnlyOpen(e.target.checked)}
            />
            미처리만 보기
          </label>
        </div>
        {shown.length === 0 ? (
          <p className="mt-6 text-sm text-ink/50">
            {onlyOpen ? "처리할 오류가 없어요." : "기록된 오류가 없어요."}
          </p>
        ) : (
          <ul className="mt-2">
            {shown.map((r) => (
              <li
                key={r.id}
                className={`border-b border-ink/15 py-4 ${r.resolved ? "opacity-50" : ""}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span
                      className={`border px-1.5 py-0.5 text-[10px] font-bold ${
                        r.stage === "quick_screen"
                          ? "border-ink/25 text-ink/60"
                          : "border-warn text-warn"
                      }`}
                    >
                      {ERROR_STAGE_LABELS[r.stage]?.label ?? r.stage}
                    </span>
                    {r.childNickname && (
                      <span className="text-sm font-bold text-ink">{r.childNickname}</span>
                    )}
                    <span className="text-xs text-ink/45">{describeMeta(r.meta)}</span>
                  </span>
                  <span className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-ink/40">
                      {formatDateTime(r.createdAt)}
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggle(r.id, !r.resolved)}
                      className="text-xs text-ink/50 underline underline-offset-4 disabled:opacity-40"
                    >
                      {r.resolved ? "미처리로 되돌리기" : "처리 완료"}
                    </button>
                  </span>
                </div>
                <p className="mt-2 break-all font-mono text-[11px] leading-5 text-ink/65">
                  {r.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// 공통 조각 (AdminConsole.tsx와 같은 모양)
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-ink px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-white">
      {children}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.25em] text-ink/45">{children}</span>
  );
}

function EmptyNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6 border-l-4 border-ink/30 pl-5">
      <p className="break-keep text-base font-bold tracking-tight text-ink">{title}</p>
      <p className="mt-2 break-keep text-sm leading-6 text-ink/55">{body}</p>
    </div>
  );
}
