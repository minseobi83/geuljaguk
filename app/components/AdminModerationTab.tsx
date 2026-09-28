"use client";

import { useState, useTransition } from "react";
import {
  FlagReason,
  MODERATION_ACTIONS,
  MODERATION_STATUSES,
  ModerationItem,
  ModerationStatus,
  OPEN_STATUSES,
} from "@/lib/supabase/moderationQueries";
import { ActionResult, recordModerationAction } from "@/app/admin/actions";
import { EmptyNotice, FieldLabel, SectionLabel, formatDateTime } from "./AdminQualityTabs";
import SummaryNote from "./SummaryNote";

// 관리자 4차분(2026-09-28): "콘텐츠 관리" 탭 - 확인이 필요한 글을 열어 보고, 처리 상태와
// 한 일을 기록한다. 기록은 고칠 수 없고 계속 쌓이기만 한다.

const STATUS_STYLE: Record<ModerationStatus, string> = {
  미확인: "border-warn bg-warn text-white",
  "확인 중": "border-warn text-warn",
  "조치 완료": "border-growth text-growth",
  "문제 없음": "border-ink/30 text-ink/55",
};

const REASON_STYLE: Record<FlagReason, string> = {
  "안전 신호": "border-warn text-warn font-bold",
  "가드레일 위반": "border-ink/25 text-ink/60",
  "관리자 판정 부적절": "border-ink/25 text-ink/60",
};

const REASON_HELP: Record<FlagReason, string> = {
  "안전 신호": "글에서 자해·폭력·학대처럼 어른이 알아야 할 신호가 보여 AI가 표시한 글",
  "가드레일 위반": "AI가 학생 문장을 그대로 고쳐 써줄 뻔해 안전장치가 걸린 첨삭",
  "관리자 판정 부적절": "품질 검토 탭에서 관리자가 첨삭을 '부적절'로 판정한 글",
};

type Filter = "open" | "all" | ModerationStatus;

export default function ModerationTab({
  items,
  error,
  logError,
  currentUserId,
  onDone,
}: {
  items: ModerationItem[];
  error: string | null;
  logError: string | null;
  currentUserId: string;
  onDone: (r: ActionResult) => void;
}) {
  const [filter, setFilter] = useState<Filter>("open");
  const [openId, setOpenId] = useState<string | null>(null);

  if (error) {
    return (
      <EmptyNotice title="확인이 필요한 글을 읽지 못했어요" body={`(${error})`} />
    );
  }

  const counts = Object.fromEntries(
    MODERATION_STATUSES.map((s) => [s, items.filter((i) => i.status === s).length])
  ) as Record<ModerationStatus, number>;

  const shown = items.filter((i) =>
    filter === "all" ? true : filter === "open" ? OPEN_STATUSES.includes(i.status) : i.status === filter
  );

  return (
    <>
      {logError && (
        <div className="mt-6">
          <EmptyNotice
            title="처리 기록을 읽지 못했어요"
            body={`아직 schema.sql(관리자 4차분)을 실행하지 않았을 수 있어요. 지금은 모든 글이 '미확인'으로 보이고, 처리 기록도 남길 수 없어요. (${logError})`}
          />
        </div>
      )}

      <section className="mt-8 grid grid-cols-2 gap-px bg-ink/15 sm:grid-cols-4">
        {MODERATION_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`bg-white p-5 text-center transition hover:bg-ink/[0.03] ${
              filter === s ? "outline outline-2 -outline-offset-2 outline-ink" : ""
            }`}
          >
            <p
              className={`text-3xl font-black tracking-tight ${
                OPEN_STATUSES.includes(s) && counts[s] > 0 ? "text-warn" : "text-ink"
              }`}
            >
              {counts[s]}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink/45">{s}</p>
          </button>
        ))}
      </section>

      <ul className="mt-4 flex flex-col gap-1">
        {(Object.keys(REASON_HELP) as FlagReason[]).map((r) => (
          <li key={r} className="break-keep text-xs leading-5 text-ink/45">
            <b className="text-ink/60">{r}</b> — {REASON_HELP[r]}
          </li>
        ))}
      </ul>

      <section className="mt-12">
        <SectionLabel>Moderation · 확인이 필요한 글</SectionLabel>
        <div className="mt-3 flex justify-end">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="border-b border-ink/30 bg-transparent pb-0.5 text-xs text-ink outline-none"
          >
            <option value="open">처리할 글 (미확인 · 확인 중)</option>
            <option value="all">전체</option>
            {MODERATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}만
              </option>
            ))}
          </select>
        </div>

        {shown.length === 0 ? (
          <p className="mt-6 text-sm text-ink/50">
            {filter === "open" ? "지금 처리할 글이 없어요." : "해당하는 글이 없어요."}
          </p>
        ) : (
          <ul className="mt-2">
            {shown.map((item) => (
              <ModerationRow
                key={item.versionId}
                item={item}
                expanded={openId === item.versionId}
                onToggle={() => setOpenId(openId === item.versionId ? null : item.versionId)}
                canRecord={!logError}
                currentUserId={currentUserId}
                onDone={onDone}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ModerationRow({
  item,
  expanded,
  onToggle,
  canRecord,
  currentUserId,
  onDone,
}: {
  item: ModerationItem;
  expanded: boolean;
  onToggle: () => void;
  canRecord: boolean;
  currentUserId: string;
  onDone: (r: ActionResult) => void;
}) {
  const isOpen = OPEN_STATUSES.includes(item.status);

  return (
    <li className={`border-b border-ink/15 py-5 ${isOpen ? "" : "opacity-70"}`}>
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className={`border px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLE[item.status]}`}>
              {item.status}
            </span>
            <span className="break-keep text-base font-bold tracking-tight text-ink">
              {item.childNickname} ({item.childGrade}학년) · {item.topicTitle ?? item.writingType}
            </span>
            {item.versionNo > 1 && (
              <span className="font-mono text-xs text-ink/40">{item.versionNo}번째 시도</span>
            )}
          </span>
          <span className="flex items-baseline gap-3">
            <span className="font-mono text-xs text-ink/40">{formatDateTime(item.createdAt)}</span>
            <span className="text-xs text-ink/50 underline underline-offset-4">
              {expanded ? "접기" : "열어 보기"}
            </span>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.reasons.map((r) => (
            <span key={r} className={`border px-2 py-0.5 text-[11px] ${REASON_STYLE[r]}`}>
              {r}
            </span>
          ))}
        </div>
        {item.safetyNote && (
          <p className="mt-2 break-keep text-sm leading-6 text-ink/70">{item.safetyNote}</p>
        )}
      </button>

      {expanded && (
        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <div>
            <FieldLabel>아이가 쓴 글</FieldLabel>
            <p className="mt-2 whitespace-pre-wrap break-keep border-l-2 border-ink/20 pl-3 font-heading text-[15px] leading-8 text-ink/85">
              {item.studentText}
            </p>
            {item.aiSummary && <SummaryNote summary={item.aiSummary} />}
            {item.parentId && (
              <p className="mt-3 break-all font-mono text-[11px] text-ink/40">
                보호자 계정 ID · {item.parentId}
              </p>
            )}
          </div>

          <div>
            <FieldLabel>처리 기록</FieldLabel>
            {item.log.length === 0 ? (
              <p className="mt-2 text-sm text-ink/45">아직 아무도 확인하지 않았어요.</p>
            ) : (
              <ol className="mt-2 flex flex-col gap-3 border-l-2 border-ink/15 pl-3">
                {item.log.map((l, i) => (
                  <li key={i} className="break-keep text-xs leading-6">
                    <p className="text-ink/45">
                      <span className="font-mono">{formatDateTime(l.createdAt)}</span> ·{" "}
                      {l.actorId === currentUserId ? "나" : "다른 관리자"}
                    </p>
                    <p className="text-ink/80">
                      <b>{l.status}</b>
                      {l.actionTaken ? ` · ${l.actionTaken}` : ""}
                    </p>
                    {l.note && <p className="text-ink/65">{l.note}</p>}
                  </li>
                ))}
              </ol>
            )}

            {/* 상태가 바뀌면 폼을 새로 만들어, 고를 수 있는 선택지가 새 상태에 맞게 초기화되도록 */}
            {canRecord && <ActionForm key={item.status} item={item} onDone={onDone} />}
          </div>
        </div>
      )}
    </li>
  );
}

function ActionForm({
  item,
  onDone,
}: {
  item: ModerationItem;
  onDone: (r: ActionResult) => void;
}) {
  const isOpen = OPEN_STATUSES.includes(item.status);
  const [status, setStatus] = useState<ModerationStatus>(isOpen ? "조치 완료" : "미확인");
  const [actionTaken, setActionTaken] = useState<string>(MODERATION_ACTIONS[0]);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(nextStatus: ModerationStatus, withDetails: boolean) {
    const fd = new FormData();
    fd.set("version_id", item.versionId);
    fd.set("status", nextStatus);
    if (withDetails) {
      if (nextStatus === "조치 완료") fd.set("action_taken", actionTaken);
      fd.set("note", note);
    }
    startTransition(async () => {
      const r = await recordModerationAction(fd);
      onDone(r);
      if (r.ok) setNote("");
    });
  }

  // 닫힌 글은 다시 여는 것만 할 수 있다 (이유 필수).
  const choices: ModerationStatus[] = isOpen ? ["조치 완료", "문제 없음"] : ["미확인"];

  return (
    <div className="mt-6 border-t border-ink/15 pt-4">
      {item.status === "미확인" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => submit("확인 중", false)}
          className="mb-4 border border-ink px-4 py-2 text-xs font-bold text-ink transition hover:bg-ink hover:text-white disabled:opacity-40"
        >
          내가 확인 중으로 표시
        </button>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        {choices.map((s) => (
          <label key={s} className="flex items-center gap-1.5">
            <input
              type="radio"
              name={`status-${item.versionId}`}
              checked={status === s}
              onChange={() => setStatus(s)}
            />
            {s === "미확인" ? "다시 열기 (미확인으로)" : s}
          </label>
        ))}
      </div>

      {status === "조치 완료" && (
        <select
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
          className="mt-3 w-full border border-ink/20 bg-white p-2 text-sm outline-none focus:border-ink"
        >
          {MODERATION_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder={
          status === "문제 없음"
            ? "왜 문제가 없다고 판단했는지 적어주세요 (예: 이야기 속 장면 묘사일 뿐임)"
            : status === "미확인"
              ? "왜 다시 여는지 적어주세요"
              : "무엇을 했는지 적어주세요 (예: 9/28 보호자에게 이메일로 안내)"
        }
        className="mt-3 w-full border border-ink/20 bg-ink/[0.02] p-3 text-sm leading-6 outline-none focus:border-ink"
      />

      <button
        type="button"
        disabled={pending || note.trim().length === 0}
        onClick={() => submit(status, true)}
        className="mt-3 bg-ink px-6 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-accent disabled:opacity-40"
      >
        기록 남기기
      </button>
    </div>
  );
}
