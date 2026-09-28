"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { formatDateShort } from "@/lib/format";
import { GradeBand } from "@/lib/types";
import {
  AdminChildDetail,
  AdminChildRow,
  AuditLogEntry,
} from "@/lib/supabase/adminQueries";
import {
  ActionResult,
  deleteStudent,
  deleteStudentEssay,
  exportStudentData,
  loadStudentDetail,
  updateStudentProfile,
} from "@/app/admin/actions";
import TierBadge from "./TierBadge";
import { EmptyNotice, FieldLabel, SectionLabel, formatDateTime } from "./AdminQualityTabs";
import SummaryNote from "./SummaryNote";

// 관리자 5차분(2026-09-28): "학생별" 탭 - 학생 찾기, 학습 데이터 요약·상세, 정보 수정,
// 내보내기, 삭제. 수정·내보내기·삭제는 모두 관리 기록(admin_audit_log)에 남는다.

const GRADES: GradeBand[] = ["4", "5", "6"];

type SortKey = "recent" | "joined" | "essays";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "최근 활동순",
  joined: "가입 최신순",
  essays: "글 많은 순",
};

export default function StudentsTab({
  childRows,
  error,
  auditEntries,
  auditError,
  currentUserId,
  onDone,
}: {
  childRows: AdminChildRow[];
  error: string | null;
  auditEntries: AuditLogEntry[];
  auditError: string | null;
  currentUserId: string;
  onDone: (r: ActionResult) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState<GradeBand | "all">("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = childRows.filter(
      (c) =>
        (grade === "all" || c.gradeBand === grade) &&
        (!q || c.nickname.toLowerCase().includes(q) || c.parentId.startsWith(q))
    );
    const key = (c: AdminChildRow) =>
      sort === "recent" ? c.lastActivityAt ?? "" : sort === "joined" ? c.joinedAt : "";
    return [...rows].sort((a, b) =>
      sort === "essays" ? b.essayCount - a.essayCount : key(b).localeCompare(key(a))
    );
  }, [childRows, search, grade, sort]);

  if (error) {
    return <EmptyNotice title="학생 목록을 읽지 못했어요" body={error} />;
  }

  return (
    <>
      <section className="mt-8">
        <SectionLabel>Students · 학생 {childRows.length}명</SectionLabel>
        <p className="mt-3 break-keep text-xs leading-6 text-ink/45">
          별명만 저장하고 실명은 받지 않아요. 학생을 누르면 학습 데이터 요약과 쓴 글 전체가
          펼쳐지고, 정보 수정·내보내기·삭제를 할 수 있어요.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="별명 또는 보호자 계정 ID로 찾기"
            className="min-w-0 flex-1 border-b border-ink/30 bg-transparent py-1 outline-none focus:border-ink"
          />
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value as GradeBand | "all")}
            className="border-b border-ink/30 bg-transparent py-1 text-xs outline-none"
          >
            <option value="all">전체 학년</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}학년
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="border-b border-ink/30 bg-transparent py-1 text-xs outline-none"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>

        {childRows.length === 0 ? (
          <p className="mt-6 text-sm text-ink/50">
            아직 등록된 학생이 없어요. 보호자가 온보딩에서 자녀를 등록하면 여기에 나타나요.
          </p>
        ) : shown.length === 0 ? (
          <p className="mt-6 text-sm text-ink/50">조건에 맞는 학생이 없어요.</p>
        ) : (
          <ul className="mt-4">
            {shown.map((c) => {
              const open = openId === c.id;
              return (
                <li key={c.id} className="border-b border-ink/15">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : c.id)}
                    className="flex w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-4 text-left transition hover:bg-ink/[0.02]"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="break-keep text-base font-bold tracking-tight text-ink">
                        {c.nickname}
                      </span>
                      <span className="text-xs text-ink/45">{c.gradeBand}학년</span>
                    </span>
                    <span className="flex flex-wrap gap-5 font-mono text-xs text-ink/50">
                      <span>글 {c.essayCount}편</span>
                      <span>시도 {c.versionCount}회</span>
                      <span>
                        마지막{" "}
                        {c.lastActivityAt ? formatDateShort(c.lastActivityAt) : "기록 없음"}
                      </span>
                    </span>
                  </button>
                  {open && (
                    <StudentDetailPanel
                      childId={c.id}
                      onDone={onDone}
                      onDeleted={() => setOpenId(null)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AuditLogSection entries={auditEntries} error={auditError} currentUserId={currentUserId} />
    </>
  );
}

// ---------------------------------------------------------------------------
// 학생 한 명 상세
// ---------------------------------------------------------------------------

function StudentDetailPanel({
  childId,
  onDone,
  onDeleted,
}: {
  childId: string;
  onDone: (r: ActionResult) => void;
  onDeleted: () => void;
}) {
  const [detail, setDetail] = useState<AdminChildDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 학생 데이터 전체는 무거워서, 펼칠 때(그리고 고친 뒤에) 그때그때 불러온다.
  useEffect(() => {
    let cancelled = false;
    loadStudentDetail(childId).then((r) => {
      if (cancelled) return;
      setDetail(r.detail);
      setLoadError(r.error);
    });
    return () => {
      cancelled = true;
    };
  }, [childId, reloadKey]);

  function afterAction(r: ActionResult) {
    onDone(r);
    if (r.ok) setReloadKey((k) => k + 1);
  }

  if (loadError) return <p className="pb-5 text-sm text-warn">{loadError}</p>;
  if (!detail) return <p className="pb-5 font-mono text-xs text-ink/45">불러오는 중...</p>;

  return (
    <div className="flex flex-col gap-8 border-l-2 border-ink/15 pb-8 pl-4">
      <LearningSummary detail={detail} />
      <EssayList detail={detail} onDone={afterAction} />
      <ProfileForm key={`${detail.nickname}-${detail.gradeBand}`} detail={detail} onDone={afterAction} />
      <DataActions detail={detail} onDone={onDone} onDeleted={onDeleted} />
    </div>
  );
}

function LearningSummary({ detail }: { detail: AdminChildDetail }) {
  const essays = detail.essays;
  const versions = essays.flatMap((e) => e.versions);
  const rewritten = essays.filter((e) => e.versions.length > 1).length;
  const answerCount = versions.reduce((n, v) => n + v.paragraphAnswers.length, 0);

  // 글마다 마지막 시도의 보완점을 모아, 자주 나온 순서로.
  const priorityCounts = new Map<string, number>();
  for (const e of essays) {
    const last = e.versions[e.versions.length - 1];
    if (last?.priorityCategory) {
      priorityCounts.set(last.priorityCategory, (priorityCounts.get(last.priorityCategory) ?? 0) + 1);
    }
  }
  const topPriorities = [...priorityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const latestScores = essays
    .map((e) => e.versions[e.versions.length - 1]?.scores)
    .find((s) => s);

  return (
    <div>
      <FieldLabel>학습 요약</FieldLabel>
      <div className="mt-2 grid grid-cols-2 gap-px bg-ink/15 sm:grid-cols-4">
        <MiniStat label="쓴 글" value={`${essays.length}편`} />
        <MiniStat label="총 시도" value={`${versions.length}회`} />
        <MiniStat
          label="고쳐 쓴 글"
          value={essays.length > 0 ? `${Math.round((rewritten / essays.length) * 100)}%` : "-"}
        />
        <MiniStat label="질문에 답한 수" value={`${answerCount}개`} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink/60">
        {latestScores && (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-ink/45">최근 등급</span>
            <TierBadge label="사고력" tier={latestScores.사고력} size="sm" />
            <TierBadge label="논리력" tier={latestScores.논리력} size="sm" />
            <TierBadge label="표현력" tier={latestScores.표현력} size="sm" />
            <TierBadge label="구성력" tier={latestScores.구성력} size="sm" />
          </span>
        )}
        {topPriorities.length > 0 && (
          <span className="break-keep">
            <span className="text-ink/45">자주 나온 보완점 </span>
            {topPriorities.map(([cat, n]) => `${cat}(${n})`).join(" · ")}
          </span>
        )}
      </div>
      <p className="mt-3 break-all font-mono text-[11px] text-ink/40">
        가입 {formatDateShort(detail.joinedAt)} · 보호자 계정 ID {detail.parentId}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-3 text-center">
      <p className="text-xl font-black tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-ink/45">{label}</p>
    </div>
  );
}

function EssayList({
  detail,
  onDone,
}: {
  detail: AdminChildDetail;
  onDone: (r: ActionResult) => void;
}) {
  const [openEssayId, setOpenEssayId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove(essayId: string, title: string) {
    if (!window.confirm(`'${title}' 글과 모든 시도·첨삭·답변을 삭제할까요? 되돌릴 수 없어요.`)) {
      return;
    }
    const fd = new FormData();
    fd.set("essay_id", essayId);
    startTransition(async () => onDone(await deleteStudentEssay(fd)));
  }

  return (
    <div>
      <FieldLabel>쓴 글 {detail.essays.length}편</FieldLabel>
      {detail.essays.length === 0 ? (
        <p className="mt-2 text-sm text-ink/45">아직 제출한 글이 없어요.</p>
      ) : (
        <ul className="mt-2">
          {detail.essays.map((e) => {
            const open = openEssayId === e.id;
            const title = e.topicTitle ?? e.writingType;
            const hasSafety = e.versions.some((v) => v.safetyNote);
            return (
              <li key={e.id} className="border-b border-ink/10">
                <button
                  type="button"
                  onClick={() => setOpenEssayId(open ? null : e.id)}
                  className="flex w-full flex-wrap items-baseline justify-between gap-3 py-2 text-left"
                >
                  <span className="flex items-center gap-2 break-keep text-sm text-ink/85">
                    {title}
                    {hasSafety && <span className="h-1.5 w-1.5 shrink-0 bg-warn" title="안전 신호" />}
                  </span>
                  <span className="flex shrink-0 gap-4 font-mono text-[11px] text-ink/40">
                    <span>{e.writingType}</span>
                    <span>{e.versions.length}번 시도</span>
                    <span>{formatDateShort(e.createdAt)}</span>
                  </span>
                </button>
                {open && (
                  <div className="flex flex-col gap-5 pb-5">
                    {e.versions.map((v) => (
                      <div key={v.versionNo}>
                        <p className="font-mono text-[11px] text-ink/45">
                          {v.versionNo}번째 시도 · {formatDateTime(v.createdAt)}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-keep border-l-2 border-ink/20 pl-3 font-heading text-[15px] leading-8 text-ink/85">
                          {v.studentText}
                        </p>
                        {v.safetyNote && (
                          <p className="mt-2 break-keep text-xs leading-6 text-warn">
                            안전 신호 · {v.safetyNote}
                          </p>
                        )}
                        {v.summary && <SummaryNote summary={v.summary} className="mt-2" />}
                        {(v.priorityCategory || v.nextTaskSkill) && (
                          <p className="mt-1 break-keep text-xs leading-6 text-ink/50">
                            {v.priorityCategory && <>보완점 · {v.priorityCategory} </>}
                            {v.nextTaskSkill && <>· 다음 과제 · {v.nextTaskSkill}</>}
                          </p>
                        )}
                        {v.paragraphAnswers.length > 0 && (
                          <ul className="mt-2 border-l-2 border-accent/40 pl-3">
                            {v.paragraphAnswers.map((a) => (
                              <li key={a.paragraph_no} className="break-keep text-xs leading-6 text-ink/70">
                                <span className="mr-1 font-mono text-ink/40">{a.paragraph_no}문단 답변</span>
                                {a.answer}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(e.id, title)}
                      className="self-start text-xs text-warn underline underline-offset-4 disabled:opacity-40"
                    >
                      이 글 삭제
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ProfileForm({
  detail,
  onDone,
}: {
  detail: AdminChildDetail;
  onDone: (r: ActionResult) => void;
}) {
  const [nickname, setNickname] = useState(detail.nickname);
  const [gradeBand, setGradeBand] = useState(detail.gradeBand);
  const [pending, startTransition] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("child_id", detail.id);
    fd.set("nickname", nickname);
    fd.set("grade_band", gradeBand);
    startTransition(async () => onDone(await updateStudentProfile(fd)));
  }

  return (
    <div>
      <FieldLabel>학생 정보 수정</FieldLabel>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
          className="w-40 border-b border-ink/30 bg-transparent py-1 outline-none focus:border-ink"
        />
        <select
          value={gradeBand}
          onChange={(e) => setGradeBand(e.target.value)}
          className="border-b border-ink/30 bg-transparent py-1 text-sm outline-none"
        >
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}학년
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={
            pending ||
            !nickname.trim() ||
            (nickname.trim() === detail.nickname && gradeBand === detail.gradeBand)
          }
          onClick={save}
          className="bg-ink px-5 py-2 text-xs font-bold text-white transition hover:bg-accent disabled:opacity-40"
        >
          저장
        </button>
      </div>
      <p className="mt-2 break-keep text-xs text-ink/40">
        학년을 바꾸면 다음 첨삭부터 바뀐 학년 기준으로 채점해요. 지난 첨삭은 그대로예요.
      </p>
    </div>
  );
}

function DataActions({
  detail,
  onDone,
  onDeleted,
}: {
  detail: AdminChildDetail;
  onDone: (r: ActionResult) => void;
  onDeleted: () => void;
}) {
  const [confirmNickname, setConfirmNickname] = useState("");
  const [reason, setReason] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function exportJson() {
    startTransition(async () => {
      const r = await exportStudentData(detail.id);
      onDone(r);
      if (!r.ok || !r.detail) return;
      const payload = { exportedAt: new Date().toISOString(), student: r.detail };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `geuljaguk-${r.detail.nickname}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function remove() {
    const fd = new FormData();
    fd.set("child_id", detail.id);
    fd.set("confirm_nickname", confirmNickname);
    fd.set("reason", reason);
    startTransition(async () => {
      const r = await deleteStudent(fd);
      onDone(r);
      if (r.ok) onDeleted();
    });
  }

  return (
    <div>
      <FieldLabel>데이터 관리</FieldLabel>
      <div className="mt-2 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={exportJson}
          className="border border-ink px-4 py-2 text-xs font-bold text-ink transition hover:bg-ink hover:text-white disabled:opacity-40"
        >
          데이터 내보내기 (JSON)
        </button>
        <button
          type="button"
          onClick={() => setShowDelete((v) => !v)}
          className="border border-warn px-4 py-2 text-xs font-bold text-warn transition hover:bg-warn hover:text-white"
        >
          학생 삭제
        </button>
      </div>

      {showDelete && (
        <div className="mt-4 border-l-4 border-warn pl-4">
          <p className="break-keep text-sm leading-6 text-ink/75">
            <b>{detail.nickname}</b> 학생과 쓴 글 {detail.essays.length}편, 모든 첨삭·답변·검토
            기록이 지워지고 되돌릴 수 없어요. 필요하면 먼저 내보내기로 받아두세요.
          </p>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="삭제 이유 (예: 9/28 보호자 이메일 삭제 요청)"
            className="mt-3 w-full border-b border-ink/30 bg-transparent py-1 text-sm outline-none focus:border-ink"
          />
          <input
            value={confirmNickname}
            onChange={(e) => setConfirmNickname(e.target.value)}
            placeholder={`확인을 위해 별명 '${detail.nickname}'을(를) 그대로 입력`}
            className="mt-3 w-full border-b border-ink/30 bg-transparent py-1 text-sm outline-none focus:border-ink"
          />
          <button
            type="button"
            disabled={pending || !reason.trim() || confirmNickname.trim() !== detail.nickname}
            onClick={remove}
            className="mt-3 bg-warn px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
          >
            영구 삭제
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 관리 기록
// ---------------------------------------------------------------------------

function describeAudit(e: AuditLogEntry): string {
  const d = e.detail;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  switch (e.action) {
    case "학생 정보 수정": {
      const before = (d.before ?? {}) as Record<string, unknown>;
      const after = (d.after ?? {}) as Record<string, unknown>;
      return `${str(before.nickname)}(${str(before.gradeBand)}학년) → ${str(after.nickname)}(${str(after.gradeBand)}학년)`;
    }
    case "데이터 내보내기":
      return `${str(d.nickname)} · 글 ${Number(d.essayCount ?? 0)}편`;
    case "글 삭제":
      return `${str(d.topicTitle) || str(d.writingType)} · 시도 ${Number(d.versionCount ?? 0)}회`;
    case "학생 삭제":
      return `${str(d.nickname)}(${str(d.gradeBand)}학년) · 글 ${Number(d.essayCount ?? 0)}편 · 이유: ${str(d.reason)}`;
    default:
      return "";
  }
}

function AuditLogSection({
  entries,
  error,
  currentUserId,
}: {
  entries: AuditLogEntry[];
  error: string | null;
  currentUserId: string;
}) {
  return (
    <section className="mt-12">
      <SectionLabel>Audit · 관리 기록</SectionLabel>
      {error ? (
        <EmptyNotice
          title="관리 기록을 읽지 못했어요"
          body={`아직 schema.sql(관리자 5차분)을 실행하지 않았을 수 있어요. 그 전에는 내보내기·삭제가 막혀요. (${error})`}
        />
      ) : entries.length === 0 ? (
        <p className="mt-4 text-sm text-ink/50">아직 기록이 없어요.</p>
      ) : (
        <ul className="mt-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/10 py-3 text-sm"
            >
              <span className="flex flex-wrap items-baseline gap-2 break-keep">
                <span
                  className={`border px-1.5 py-0.5 text-[10px] font-bold ${
                    e.action.includes("삭제") ? "border-warn text-warn" : "border-ink/25 text-ink/60"
                  }`}
                >
                  {e.action}
                </span>
                <span className="text-ink/75">{describeAudit(e)}</span>
              </span>
              <span className="font-mono text-xs text-ink/40">
                {formatDateTime(e.createdAt)} · {e.actorId === currentUserId ? "나" : "다른 관리자"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
