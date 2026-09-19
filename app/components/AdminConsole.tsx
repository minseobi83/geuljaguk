"use client";

import { useState, useTransition } from "react";
import { formatDateShort } from "@/lib/format";
import { WritingType } from "@/lib/types";
import { AdminTopic } from "@/lib/supabase/topicQueries";
import { PromptVersion } from "@/lib/supabase/promptQueries";
import {
  AdminChildRow,
  FlaggedEssay,
  UsageStats,
} from "@/lib/supabase/adminQueries";
import {
  ActionResult,
  activatePromptVersion,
  createPromptVersion,
  createTopic,
  setTopicActive,
  updateTopic,
  useCodeDefaultPrompt,
} from "@/app/admin/actions";

const WRITING_TYPES: WritingType[] = [
  "주장하는 글",
  "설명하는 글",
  "독후감",
  "경험을 담은 글",
  "감상문",
  "비교·대조 글",
  "문제 해결 글",
  "서사적 글쓰기",
];

const TABS = [
  { id: "usage", label: "이용 현황" },
  { id: "topics", label: "글감 관리" },
  { id: "students", label: "학생별" },
  { id: "rubric", label: "평가기준" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  stats: UsageStats;
  flagged: FlaggedEssay[];
  topics: AdminTopic[];
  topicsError: string | null;
  childRows: AdminChildRow[];
  childrenError: string | null;
  promptVersions: PromptVersion[];
  promptError: string | null;
  // 지금 채점에 실제로 쓰이는 프롬프트와, 그게 DB 버전인지 코드 기본값인지.
  currentPromptText: string;
  currentPromptSource: "db" | "code";
  currentPromptLabel: string | null;
}

export default function AdminConsole(props: Props) {
  const [tab, setTab] = useState<TabId>("usage");
  // 서버 액션 결과 한 줄 알림. 어느 탭에서 무엇을 했든 같은 자리에 보여준다.
  const [notice, setNotice] = useState<ActionResult | null>(null);

  return (
    <>
      <nav className="flex flex-wrap gap-6 border-b-2 border-ink text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setNotice(null);
            }}
            className={`-mb-0.5 pb-3 transition ${
              tab === t.id
                ? "border-b-4 border-ink font-black text-ink"
                : "text-ink/40 hover:text-ink/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {notice && (
        <p
          className={`mt-5 break-keep border-l-4 py-2 pl-4 text-sm leading-6 ${
            notice.ok ? "border-ink text-ink/80" : "border-warn text-warn"
          }`}
        >
          {notice.message}
        </p>
      )}

      {tab === "usage" && <UsageTab stats={props.stats} flagged={props.flagged} />}
      {tab === "topics" && (
        <TopicsTab
          topics={props.topics}
          error={props.topicsError}
          onDone={setNotice}
        />
      )}
      {tab === "students" && (
        <StudentsTab childRows={props.childRows} error={props.childrenError} />
      )}
      {tab === "rubric" && (
        <RubricTab
          versions={props.promptVersions}
          error={props.promptError}
          currentText={props.currentPromptText}
          currentSource={props.currentPromptSource}
          currentLabel={props.currentPromptLabel}
          onDone={setNotice}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 이용 현황
// ---------------------------------------------------------------------------

function UsageTab({ stats, flagged }: { stats: UsageStats; flagged: FlaggedEssay[] }) {
  return (
    <>
      <section className="mt-8 grid grid-cols-2 gap-px bg-ink/15 sm:grid-cols-5">
        <StatCard label="보호자" value={stats.totalParents} />
        <StatCard label="자녀" value={stats.totalChildren} />
        <StatCard label="전체 제출 글" value={stats.totalEssays} />
        <StatCard label="최근 7일" value={stats.essaysLast7Days} />
        <StatCard label="최근 30일" value={stats.essaysLast30Days} />
      </section>

      <section className="mt-12">
        <SectionLabel>Review · 확인이 필요한 글</SectionLabel>
        <p className="mt-3 break-keep text-xs leading-6 text-ink/45">
          안전 신호가 감지됐거나, AI가 학생 문장을 그대로 재사용할 뻔해 가드레일이 걸린
          글이에요. 최근 300개 제출 중에서 골랐어요.
        </p>
        {flagged.length === 0 ? (
          <p className="mt-6 text-sm text-ink/50">지금은 확인할 항목이 없어요.</p>
        ) : (
          <ul className="mt-4 grid gap-x-10 lg:grid-cols-2">
            {flagged.map((f) => (
              <li key={f.versionId} className="border-b border-ink/15 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="break-keep text-base font-bold tracking-tight text-ink">
                    {f.childNickname} ({f.childGrade}학년) · {f.topicTitle ?? f.writingType}
                  </p>
                  <span className="shrink-0 font-mono text-xs text-ink/40">
                    {formatDateShort(f.createdAt)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {f.safetyNote && (
                    <span className="border border-warn px-2 py-0.5 text-[11px] font-bold text-warn">
                      안전 신호
                    </span>
                  )}
                  {f.rewroteStudentText && (
                    <span className="border border-ink/25 px-2 py-0.5 text-[11px] text-ink/60">
                      가드레일 위반(학생 문장 재사용)
                    </span>
                  )}
                </div>
                {f.safetyNote && (
                  <p className="mt-2 break-keep text-sm leading-6 text-ink/70">
                    {f.safetyNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// 글감 관리
// ---------------------------------------------------------------------------

function TopicsTab({
  topics,
  error,
  onDone,
}: {
  topics: AdminTopic[];
  error: string | null;
  onDone: (r: ActionResult) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<WritingType | "전체">("전체");
  const [pending, startTransition] = useTransition();

  const shown =
    filter === "전체" ? topics : topics.filter((t) => t.writingType === filter);

  function run(action: (fd: FormData) => Promise<ActionResult>, fd: FormData) {
    startTransition(async () => {
      const result = await action(fd);
      onDone(result);
      if (result.ok) {
        setEditingId(null);
        setAdding(false);
      }
    });
  }

  if (error) {
    return (
      <EmptyNotice
        title="글감 목록을 읽지 못했어요"
        body={`아직 topics 테이블을 만들지 않았을 수 있어요. supabase/schema.sql과 seed_topics.sql을 차례로 실행해주세요. (${error})`}
      />
    );
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>Topics · 글감 {topics.length}개</SectionLabel>
        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v);
            setEditingId(null);
          }}
          className="bg-ink px-4 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-accent"
        >
          {adding ? "닫기" : "＋ 글감 추가"}
        </button>
      </div>

      {topics.length === 0 && (
        <EmptyNotice
          title="DB에 글감이 하나도 없어요"
          body="지금은 코드에 들어있는 기본 글감 목록으로 학생 화면이 돌아가고 있어요. supabase/seed_topics.sql을 실행하면 이 화면에서 관리할 수 있어요."
        />
      )}

      {adding && (
        <form
          className="mt-5 border-2 border-ink p-5"
          onSubmit={(e) => {
            e.preventDefault();
            run(createTopic, new FormData(e.currentTarget));
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-ink/45">New · 새 글감</p>
          <label className="mt-4 block">
            <FieldLabel>글의 종류</FieldLabel>
            <select
              name="writing_type"
              defaultValue="주장하는 글"
              className="mt-1 w-full border-b-2 border-ink bg-transparent pb-1 text-sm font-bold outline-none"
            >
              {WRITING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <TopicFields />
          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="bg-ink px-6 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-accent disabled:opacity-40"
            >
              {pending ? "저장하는 중..." : "추가하기"}
            </button>
            <span className="text-xs text-ink/45">
              저장하면 학생 글쓰기 화면에 바로 보여요.
            </span>
          </div>
        </form>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {(["전체", ...WRITING_TYPES] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={`border px-3 py-1 text-xs transition ${
              filter === t
                ? "border-ink bg-ink font-bold text-white"
                : "border-ink/20 text-ink/55 hover:border-ink/50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <ul className="mt-4">
        {shown.map((topic) => (
          <li key={topic.id} className="border-b border-ink/15 py-4">
            {editingId === topic.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(updateTopic, new FormData(e.currentTarget));
                }}
              >
                <input type="hidden" name="id" value={topic.id} />
                <TopicFields topic={topic} />
                <div className="mt-4 flex gap-3">
                  <button
                    type="submit"
                    disabled={pending}
                    className="bg-ink px-5 py-2 text-xs font-bold text-white transition hover:bg-accent disabled:opacity-40"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-2 text-xs text-ink/50 underline underline-offset-4"
                  >
                    취소
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-ink/10 px-2 py-0.5 text-[11px] text-ink/60">
                      {topic.writingType}
                    </span>
                    <span className="font-mono text-[11px] text-ink/35">
                      {topic.grades.join("·")}학년
                    </span>
                    {!topic.isActive && (
                      <span className="border border-ink/25 px-2 py-0.5 text-[11px] text-ink/45">
                        숨김
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1.5 break-keep text-base font-bold leading-snug tracking-tight ${
                      topic.isActive ? "text-ink" : "text-ink/40 line-through"
                    }`}
                  >
                    {topic.title}
                  </p>
                  <p className="mt-1 break-keep text-sm text-ink/50">{topic.hint}</p>
                </div>
                <div className="flex shrink-0 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(topic.id);
                      setAdding(false);
                    }}
                    className="text-ink underline underline-offset-4"
                  >
                    고치기
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      const fd = new FormData();
                      fd.set("id", topic.id);
                      fd.set("active", topic.isActive ? "false" : "true");
                      run(setTopicActive, fd);
                    }}
                    className="text-ink/50 underline underline-offset-4 disabled:opacity-40"
                  >
                    {topic.isActive ? "숨기기" : "다시 보이기"}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// 추가 폼과 수정 폼이 같은 입력들을 쓴다. topic을 주면 수정(기존 값 채움), 없으면 추가.
function TopicFields({ topic }: { topic?: AdminTopic }) {
  const grades = topic?.grades ?? ["4", "5", "6"];
  return (
    <>
      <label className="mt-4 block">
        <FieldLabel>글감 제목</FieldLabel>
        <input
          name="title"
          defaultValue={topic?.title}
          placeholder="예) 우리 반에 '고운 말 쓰기' 규칙이 필요하다"
          className="mt-1 w-full border-b-2 border-ink bg-transparent pb-1 text-sm outline-none placeholder:text-ink/30"
        />
      </label>
      <label className="mt-4 block">
        <FieldLabel>안내 문구 (무엇을 쓸지 방향 잡아주기)</FieldLabel>
        <input
          name="hint"
          defaultValue={topic?.hint}
          placeholder="예) 찬성인지 반대인지 정하고, 이유를 두 가지 들어보자."
          className="mt-1 w-full border-b-2 border-ink bg-transparent pb-1 text-sm outline-none placeholder:text-ink/30"
        />
      </label>
      <div className="mt-4 flex flex-wrap items-end gap-8">
        <div>
          <FieldLabel>보여줄 학년</FieldLabel>
          <div className="mt-1.5 flex gap-4">
            {(["4", "5", "6"] as const).map((g) => (
              <label key={g} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name={`grade_${g}`}
                  defaultChecked={grades.includes(g)}
                  className="accent-ink"
                />
                {g}학년
              </label>
            ))}
          </div>
        </div>
        <label>
          <FieldLabel>순서</FieldLabel>
          <input
            name="sort_order"
            type="number"
            defaultValue={topic?.sortOrder ?? 999}
            className="mt-1 w-24 border-b-2 border-ink bg-transparent pb-1 text-sm outline-none"
          />
        </label>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// 학생별
// ---------------------------------------------------------------------------

function StudentsTab({
  childRows,
  error,
}: {
  childRows: AdminChildRow[];
  error: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (error) {
    return <EmptyNotice title="학생 목록을 읽지 못했어요" body={error} />;
  }
  if (childRows.length === 0) {
    return (
      <EmptyNotice
        title="아직 등록된 학생이 없어요"
        body="보호자가 온보딩에서 자녀를 등록하면 여기에 나타나요."
      />
    );
  }

  return (
    <section className="mt-8">
      <SectionLabel>Students · 학생 {childRows.length}명</SectionLabel>
      <p className="mt-3 break-keep text-xs leading-6 text-ink/45">
        별명만 저장하고 실명은 받지 않아요. 학생 이름을 누르면 그 학생이 쓴 글 목록이
        펼쳐져요.
      </p>
      <ul className="mt-4">
        {childRows.map((c) => {
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
                <span className="flex gap-5 font-mono text-xs text-ink/50">
                  <span>글 {c.essayCount}편</span>
                  <span>시도 {c.versionCount}회</span>
                  <span>
                    마지막{" "}
                    {c.lastActivityAt ? formatDateShort(c.lastActivityAt) : "기록 없음"}
                  </span>
                </span>
              </button>
              {open && (
                <div className="pb-5">
                  {c.essays.length === 0 ? (
                    <p className="text-sm text-ink/45">아직 제출한 글이 없어요.</p>
                  ) : (
                    <ul className="border-l-2 border-ink/15 pl-4">
                      {c.essays.map((e) => (
                        <li
                          key={e.id}
                          className="flex flex-wrap items-baseline justify-between gap-3 py-2"
                        >
                          <span className="break-keep text-sm text-ink/80">
                            {e.topicTitle ?? "(글감 없음)"}
                          </span>
                          <span className="flex shrink-0 gap-4 font-mono text-[11px] text-ink/40">
                            <span>{e.writingType}</span>
                            <span>{e.versionCount}번 고쳐 씀</span>
                            <span>{formatDateShort(e.createdAt)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 평가기준 · 프롬프트 버전
// ---------------------------------------------------------------------------

function RubricTab({
  versions,
  error,
  currentText,
  currentSource,
  currentLabel,
  onDone,
}: {
  versions: PromptVersion[];
  error: string | null;
  currentText: string;
  currentSource: "db" | "code";
  currentLabel: string | null;
  onDone: (r: ActionResult) => void;
}) {
  const [composing, setComposing] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: (fd: FormData) => Promise<ActionResult>, fd: FormData) {
    startTransition(async () => {
      const result = await action(fd);
      onDone(result);
      if (result.ok) setComposing(false);
    });
  }

  return (
    <section className="mt-8">
      <SectionLabel>Rubric · 지금 채점에 쓰는 기준</SectionLabel>
      <p className="mt-3 break-keep text-sm leading-6 text-ink/70">
        {currentSource === "db" ? (
          <>
            지금은 <b>{currentLabel}</b>&nbsp;기준으로 채점하고 있어요.
          </>
        ) : (
          <>
            아직 저장된 버전이 없어서, 코드에 들어있는 기본 평가기준으로 채점하고 있어요.
          </>
        )}
      </p>
      <p className="mt-2 break-keep text-xs leading-6 text-ink/45">
        평가기준은 덮어쓰지 않고 새 버전으로 쌓여요. 문제가 생기면 이전 버전을 다시
        활성화하거나, 코드 기본값으로 되돌릴 수 있어요.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setComposing((v) => !v)}
          className="bg-ink px-4 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-accent"
        >
          {composing ? "닫기" : "＋ 새 버전 만들기"}
        </button>
        {currentSource === "db" && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => onDone(await useCodeDefaultPrompt()))
            }
            className="border border-ink/25 px-4 py-2 text-xs text-ink/60 transition hover:border-ink disabled:opacity-40"
          >
            코드 기본값으로 되돌리기
          </button>
        )}
      </div>

      {composing && (
        <form
          className="mt-6 border-2 border-ink p-5"
          onSubmit={(e) => {
            e.preventDefault();
            run(createPromptVersion, new FormData(e.currentTarget));
          }}
        >
          <label className="block">
            <FieldLabel>버전 이름</FieldLabel>
            <input
              name="label"
              placeholder="예) v2 — 근거 배점 상향"
              className="mt-1 w-full border-b-2 border-ink bg-transparent pb-1 text-sm outline-none placeholder:text-ink/30"
            />
          </label>
          <label className="mt-4 block">
            <FieldLabel>바꾼 이유 (선택)</FieldLabel>
            <input
              name="note"
              placeholder="예) 4학년 글에서 근거 점수가 너무 후하게 나와서"
              className="mt-1 w-full border-b-2 border-ink bg-transparent pb-1 text-sm outline-none placeholder:text-ink/30"
            />
          </label>
          <label className="mt-4 block">
            <FieldLabel>시스템 프롬프트 (지금 쓰는 내용을 미리 채워뒀어요)</FieldLabel>
            <textarea
              name="system_prompt"
              defaultValue={currentText}
              rows={18}
              className="mt-1 w-full border border-ink/20 bg-transparent p-3 font-mono text-xs leading-6 outline-none focus:border-ink"
            />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="activate" className="accent-ink" defaultChecked />
            저장하자마자 이 기준으로 채점하기
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-4 bg-ink px-6 py-2 text-xs font-bold tracking-wide text-white transition hover:bg-accent disabled:opacity-40"
          >
            {pending ? "저장하는 중..." : "버전 저장"}
          </button>
        </form>
      )}

      <div className="mt-10">
        <SectionLabel>History · 버전 기록</SectionLabel>
        {error ? (
          <EmptyNotice
            title="버전 목록을 읽지 못했어요"
            body={`아직 prompt_versions 테이블을 만들지 않았을 수 있어요. supabase/schema.sql을 실행해주세요. (${error})`}
          />
        ) : versions.length === 0 ? (
          <p className="mt-4 text-sm text-ink/50">
            아직 저장된 버전이 없어요. 위에서 첫 버전을 만들어보세요.
          </p>
        ) : (
          <ul className="mt-4">
            {versions.map((v) => (
              <li key={v.id} className="border-b border-ink/15 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="break-keep text-base font-bold tracking-tight text-ink">
                    {v.label}
                    {v.isActive && (
                      <span className="ml-2 bg-ink px-2 py-0.5 text-[11px] font-bold text-white">
                        사용 중
                      </span>
                    )}
                  </p>
                  <span className="shrink-0 font-mono text-xs text-ink/40">
                    {formatDateShort(v.createdAt)}
                  </span>
                </div>
                {v.note && (
                  <p className="mt-1 break-keep text-sm text-ink/55">{v.note}</p>
                )}
                <div className="mt-2 flex gap-4 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewingId(viewingId === v.id ? null : v.id)}
                    className="text-ink underline underline-offset-4"
                  >
                    {viewingId === v.id ? "내용 접기" : "내용 보기"}
                  </button>
                  {!v.isActive && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("id", v.id);
                        run(activatePromptVersion, fd);
                      }}
                      className="text-ink/50 underline underline-offset-4 disabled:opacity-40"
                    >
                      이 버전으로 채점하기
                    </button>
                  )}
                </div>
                {viewingId === v.id && (
                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap border border-ink/15 bg-ink/[0.02] p-3 font-mono text-[11px] leading-5 text-ink/75">
                    {v.systemPrompt}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 공통 조각
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-5 text-center">
      <p className="text-3xl font-black tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink/45">{label}</p>
    </div>
  );
}

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
