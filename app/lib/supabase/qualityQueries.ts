import { SupabaseClient } from "@supabase/supabase-js";
import { EvaluationResult, ParagraphAnswer } from "@/lib/types";
import type { SavedParagraphAnswer } from "./queries";

// 관리자 3차분(2026-09-24): AI 응답 품질 검토 + 오류 확인.
// 둘 다 admins RLS 정책 덕분에 관리자 세션에서만 전체가 읽힌다.

export type ReviewVerdict = "적절" | "아쉬움" | "부적절";

export const REVIEW_VERDICTS: ReviewVerdict[] = ["적절", "아쉬움", "부적절"];

// 검토할 때 고르는 문제 유형 태그. 교육 철학(writing_feedback.md 2·6·9장)에서 가장 자주
// 어긋날 만한 지점들로 골랐다. 여기 목록을 바꾸면 버전별 요약의 태그 집계도 따라 바뀐다.
export const REVIEW_ISSUES = [
  "등급이 후함",
  "등급이 박함",
  "글의 의도를 잘못 이해함",
  "답을 대신 써줌",
  "지적이 너무 많음",
  "칭찬이 형식적임",
  "표현이 어려움",
  "맞춤법 지적이 틀림",
  "원문에 없는 내용을 지어냄",
] as const;

// ---------------------------------------------------------------------------
// 품질 검토 대기열
// ---------------------------------------------------------------------------

export interface ReviewEntry {
  reviewerId: string;
  verdict: ReviewVerdict;
  issues: string[];
  note: string | null;
  updatedAt: string;
}

export interface ReviewQueueItem {
  evaluationId: string;
  createdAt: string;
  promptVersionId: string | null;
  childNickname: string;
  childGrade: string;
  writingType: string;
  topicTitle: string | null;
  versionNo: number;
  studentText: string;
  result: EvaluationResult;
  // 먼저 봐야 할 이유 (안전 신호 / 가드레일 / 판단하기 어려움). 없으면 빈 배열.
  flags: string[];
  reviews: ReviewEntry[];
  // 아이가 이 첨삭의 문단별 질문에 적은 답. 첨삭 질문이 아이에게 잘 통했는지 판단하는 근거.
  paragraphAnswers: SavedParagraphAnswer[];
}

interface RawReviewRow {
  id: string;
  created_at: string;
  prompt_version_id: string | null;
  confidence: string;
  rewrote_student_text: boolean;
  result: EvaluationResult;
  essay_versions: {
    version_no: number;
    student_text: string;
    paragraph_answers?: ParagraphAnswer[] | null;
    essays: {
      writing_type: string;
      topic_title: string | null;
      children: { nickname: string; grade_band: string } | null;
    } | null;
  } | null;
  evaluation_reviews: {
    reviewer_id: string;
    verdict: ReviewVerdict;
    issues: string[] | null;
    note: string | null;
    updated_at: string;
  }[];
}

// DB에 저장된 첨삭은 저장 당시의 모양 그대로라, 나중에 추가된 항목(예: 9/16에 생긴 safety)이
// 빠져 있거나 AI가 일부 항목을 비워둔 경우가 있다. ResultView는 지금 모양을 전제로 그리므로
// 화면에 넘기기 전에 빠진 항목을 기본값으로 채운다 (안 그러면 화면 전체가 죽는다).
function normalizeResult(raw: Partial<EvaluationResult>): EvaluationResult {
  const arr = <T,>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : []);
  const scores: Partial<EvaluationResult["scores"]> = raw.scores ?? {};
  return {
    version_id: raw.version_id ?? "",
    writing_type: raw.writing_type ?? ("" as EvaluationResult["writing_type"]),
    grade_band: raw.grade_band ?? ("" as EvaluationResult["grade_band"]),
    understanding: {
      topic: raw.understanding?.topic ?? "",
      main_idea: raw.understanding?.main_idea ?? "",
      intent_unclear: Boolean(raw.understanding?.intent_unclear),
    },
    strengths: arr(raw.strengths),
    priority_issue: {
      category: raw.priority_issue?.category ?? "",
      note: raw.priority_issue?.note ?? "",
    },
    paragraph_feedback: arr(raw.paragraph_feedback)
      .filter((p) => p && typeof p.paragraph_no === "number")
      .map((p) => ({
        paragraph_no: p.paragraph_no,
        role: p.role ?? "",
        good: p.good ?? "",
        question: p.question ?? "",
      })),
    mechanics_table: arr(raw.mechanics_table)
      .filter((m) => m && typeof m.original === "string")
      .map((m) => ({ original: m.original, revised: m.revised ?? "", reason: m.reason ?? "" })),
    self_revision_questions: arr(raw.self_revision_questions),
    next_task: { skill: raw.next_task?.skill ?? "", prompt: raw.next_task?.prompt ?? "" },
    scores: {
      사고력: scores.사고력 ?? "보통",
      논리력: scores.논리력 ?? "보통",
      표현력: scores.표현력 ?? "보통",
      구성력: scores.구성력 ?? "보통",
      confidence: scores.confidence ?? "충분",
    },
    summary: raw.summary ?? "",
    guardrail_check: {
      rewrote_student_text: Boolean(raw.guardrail_check?.rewrote_student_text),
    },
    safety: { concern: Boolean(raw.safety?.concern), note: raw.safety?.note ?? "" },
  };
}

function flagsOf(row: RawReviewRow): string[] {
  const flags: string[] = [];
  if (row.result?.safety?.concern) flags.push("안전 신호");
  if (row.rewrote_student_text) flags.push("가드레일");
  if (row.confidence === "판단하기 어려움") flags.push("판단하기 어려움");
  return flags;
}

function reviewColumns(withAnswers: boolean): string {
  const versionCols = withAnswers ? "version_no, student_text, paragraph_answers" : "version_no, student_text";
  return `id, created_at, prompt_version_id, confidence, rewrote_student_text, result, essay_versions(${versionCols}, essays(writing_type, topic_title, children(nickname, grade_band))), evaluation_reviews(reviewer_id, verdict, issues, note, updated_at)`;
}

// 검토 대기열: 아직 아무도 검토하지 않은 첨삭은 오래됐어도 빠짐없이(최대 unreviewedLimit건),
// 이미 검토한 첨삭은 최근 recentLimit건만 가져와 "미검토 → 그중 신호가 있는 것" 순으로 세운다.
// (예전에는 최근 80건만 훑어서 오래된 미검토 첨삭이 목록에서 밀려났다.)
export async function getReviewQueue(
  supabase: SupabaseClient,
  unreviewedLimit = 300,
  recentLimit = 60
): Promise<{ items: ReviewQueueItem[]; error: string | null }> {
  const fetchRows = async (withAnswers: boolean) => {
    const columns: string = reviewColumns(withAnswers);
    const [unreviewed, recent] = await Promise.all([
      // 검토 기록이 하나도 없는 첨삭만 (PostgREST의 embedded 필터: evaluation_reviews=is.null)
      supabase
        .from("evaluations")
        .select(columns)
        .is("evaluation_reviews", null)
        .order("created_at", { ascending: false })
        .limit(unreviewedLimit),
      supabase
        .from("evaluations")
        .select(columns)
        .order("created_at", { ascending: false })
        .limit(recentLimit),
    ]);
    return { unreviewed, recent };
  };

  let { unreviewed, recent } = await fetchRows(true);
  // paragraph_answers 컬럼을 아직 안 만든 DB에서도 나머지는 보이도록.
  if (recent.error && /paragraph_answers/.test(recent.error.message)) {
    ({ unreviewed, recent } = await fetchRows(false));
  }
  if (recent.error) return { items: [], error: recent.error.message };

  // 미검토 전용 조회가 실패해도(필터 미지원 등) 최근 목록만으로 예전처럼 보여준다.
  const rows = [
    ...((unreviewed.error ? [] : unreviewed.data ?? []) as unknown as RawReviewRow[]),
    ...((recent.data ?? []) as unknown as RawReviewRow[]),
  ];
  const seen = new Set<string>();

  const items: ReviewQueueItem[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const version = row.essay_versions;
    if (!version || !row.result) continue;
    items.push({
      evaluationId: row.id,
      createdAt: row.created_at,
      promptVersionId: row.prompt_version_id,
      childNickname: version.essays?.children?.nickname ?? "(알 수 없음)",
      childGrade: version.essays?.children?.grade_band ?? "-",
      writingType: version.essays?.writing_type ?? row.result.writing_type,
      topicTitle: version.essays?.topic_title ?? null,
      versionNo: version.version_no,
      studentText: version.student_text,
      result: normalizeResult(row.result),
      flags: flagsOf(row),
      reviews: (row.evaluation_reviews ?? []).map((r) => ({
        reviewerId: r.reviewer_id,
        verdict: r.verdict,
        issues: r.issues ?? [],
        note: r.note,
        updatedAt: r.updated_at,
      })),
      paragraphAnswers: (version.paragraph_answers ?? [])
        .filter((a) => a.answer?.trim())
        .sort((a, b) => a.paragraph_no - b.paragraph_no)
        .map((a) => ({
          versionNo: version.version_no,
          paragraphNo: a.paragraph_no,
          question:
            row.result.paragraph_feedback?.find((f) => f.paragraph_no === a.paragraph_no)
              ?.question ?? null,
          answer: a.answer.trim(),
        })),
    });
  }

  const rank = (i: ReviewQueueItem) =>
    i.reviews.length > 0 ? 2 : i.flags.length > 0 ? 0 : 1;
  // 같은 순위 안에서는 최신순.
  items.sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));

  return { items, error: null };
}

// ---------------------------------------------------------------------------
// 평가기준 버전별 품질 요약
// ---------------------------------------------------------------------------

export interface VersionQualitySummary {
  promptVersionId: string | null; // null = 코드 기본 프롬프트
  total: number;
  counts: Record<ReviewVerdict, number>;
  topIssues: { issue: string; count: number }[];
}

interface RawSummaryRow {
  verdict: ReviewVerdict;
  issues: string[] | null;
  evaluations: { prompt_version_id: string | null } | null;
}

export async function getQualitySummary(
  supabase: SupabaseClient
): Promise<{ summaries: VersionQualitySummary[]; error: string | null }> {
  const { data, error } = await supabase
    .from("evaluation_reviews")
    .select("verdict, issues, evaluations(prompt_version_id)");

  if (error) return { summaries: [], error: error.message };

  const byVersion = new Map<string, { summary: VersionQualitySummary; issues: Map<string, number> }>();
  for (const row of data as unknown as RawSummaryRow[]) {
    const versionId = row.evaluations?.prompt_version_id ?? null;
    const key = versionId ?? "__code__";
    let bucket = byVersion.get(key);
    if (!bucket) {
      bucket = {
        summary: {
          promptVersionId: versionId,
          total: 0,
          counts: { 적절: 0, 아쉬움: 0, 부적절: 0 },
          topIssues: [],
        },
        issues: new Map(),
      };
      byVersion.set(key, bucket);
    }
    bucket.summary.total += 1;
    if (row.verdict in bucket.summary.counts) bucket.summary.counts[row.verdict] += 1;
    for (const issue of row.issues ?? []) {
      bucket.issues.set(issue, (bucket.issues.get(issue) ?? 0) + 1);
    }
  }

  const summaries = [...byVersion.values()].map(({ summary, issues }) => ({
    ...summary,
    topIssues: [...issues.entries()]
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3),
  }));
  summaries.sort((a, b) => b.total - a.total);

  return { summaries, error: null };
}

// ---------------------------------------------------------------------------
// 평가기준 반자동 개선용 검토 모음 (관리자 6차분)
// ---------------------------------------------------------------------------

export interface ReviewDigestItem {
  verdict: ReviewVerdict;
  issues: string[];
  note: string | null;
  gradeBand: string;
  writingType: string;
  versionNo: number;
  // 학생 글은 앞부분만 (판단 근거로 필요한 만큼만 보낸다).
  studentExcerpt: string;
  aiSummary: string;
  aiScores: string;
  aiPriority: string;
}

export interface ReviewDigest {
  counts: Record<ReviewVerdict, number>;
  items: ReviewDigestItem[]; // '아쉬움' · '부적절'만
}

interface RawDigestRow {
  verdict: ReviewVerdict;
  issues: string[] | null;
  note: string | null;
  evaluations: {
    prompt_version_id: string | null;
    result: Partial<EvaluationResult> | null;
    essay_versions: {
      version_no: number;
      student_text: string;
      essays: { writing_type: string; children: { grade_band: string } | null } | null;
    } | null;
  } | null;
}

const EXCERPT_CHARS = 600;

// 지금 채점에 쓰는 평가기준 버전(promptVersionId, null이면 코드 기본값)으로 채점된 첨삭에 대한
// 관리자 검토를 모은다. 다른 버전의 검토는 섞지 않는다 - 이미 고친 문제를 다시 고치지 않도록.
export async function getReviewDigest(
  supabase: SupabaseClient,
  promptVersionId: string | null,
  limit = 40
): Promise<{ digest: ReviewDigest | null; error: string | null }> {
  let query = supabase
    .from("evaluation_reviews")
    .select(
      "verdict, issues, note, evaluations!inner(prompt_version_id, result, essay_versions(version_no, student_text, essays(writing_type, children(grade_band))))"
    )
    .order("updated_at", { ascending: false })
    .limit(500);
  query = promptVersionId
    ? query.eq("evaluations.prompt_version_id", promptVersionId)
    : query.is("evaluations.prompt_version_id", null);

  const { data, error } = await query;
  if (error) return { digest: null, error: error.message };

  const rows = (data ?? []) as unknown as RawDigestRow[];
  const counts: Record<ReviewVerdict, number> = { 적절: 0, 아쉬움: 0, 부적절: 0 };
  for (const r of rows) counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;

  const items: ReviewDigestItem[] = rows
    .filter((r) => r.verdict !== "적절" && r.evaluations)
    .slice(0, limit)
    .map((r) => {
      const ev = r.evaluations!;
      const res = ev.result ?? {};
      const v = ev.essay_versions;
      const s = res.scores;
      return {
        verdict: r.verdict,
        issues: r.issues ?? [],
        note: r.note,
        gradeBand: v?.essays?.children?.grade_band ?? "-",
        writingType: v?.essays?.writing_type ?? res.writing_type ?? "-",
        versionNo: v?.version_no ?? 1,
        studentExcerpt: (v?.student_text ?? "").slice(0, EXCERPT_CHARS),
        aiSummary: res.summary ?? "",
        aiScores: s ? `사고력 ${s.사고력} / 논리력 ${s.논리력} / 표현력 ${s.표현력} / 구성력 ${s.구성력}` : "",
        aiPriority: res.priority_issue ? `${res.priority_issue.category}: ${res.priority_issue.note}` : "",
      };
    });

  return { digest: { counts, items }, error: null };
}

// ---------------------------------------------------------------------------
// 오류 확인
// ---------------------------------------------------------------------------

export type ErrorStage = "quick_screen" | "evaluate" | "guardrail" | "persist";

export const ERROR_STAGE_LABELS: Record<ErrorStage, { label: string; help: string }> = {
  persist: {
    label: "저장 실패",
    help: "학생은 피드백을 봤지만 기록이 남지 않았어요. 성장 기록·대시보드에서 빠져요.",
  },
  evaluate: {
    label: "첨삭 실패",
    help: "AI 호출이나 응답 해석이 실패해서 학생이 피드백을 받지 못했어요.",
  },
  guardrail: {
    label: "가드레일 차단",
    help: "재시도 후에도 AI가 학생 문장을 그대로 옮겨 써서 피드백을 막았어요.",
  },
  quick_screen: {
    label: "사전 검사 실패",
    help: "과제 여부를 거르는 빠른 검사가 실패했어요. 본분석은 그대로 진행됐어요.",
  },
};

export interface AppErrorRow {
  id: string;
  stage: ErrorStage;
  message: string;
  childNickname: string | null;
  meta: Record<string, unknown>;
  resolved: boolean;
  createdAt: string;
}

export interface ErrorOverview {
  rows: AppErrorRow[];
  last7Days: {
    byStage: Record<ErrorStage, number>;
    // 같은 기간 제출(시도) 수. 실패율 계산용.
    submissions: number;
  };
}

interface RawErrorRow {
  id: string;
  stage: ErrorStage;
  message: string;
  meta: Record<string, unknown> | null;
  resolved: boolean;
  created_at: string;
  children: { nickname: string } | null;
}

export async function getErrorOverview(
  supabase: SupabaseClient,
  limit = 100
): Promise<{ overview: ErrorOverview | null; error: string | null }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [recent, week, submissions] = await Promise.all([
    supabase
      .from("app_errors")
      .select("id, stage, message, meta, resolved, created_at, children(nickname)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("app_errors").select("stage").gte("created_at", sevenDaysAgo),
    supabase
      .from("essay_versions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
  ]);

  if (recent.error) return { overview: null, error: recent.error.message };
  if (week.error) return { overview: null, error: week.error.message };

  const byStage: Record<ErrorStage, number> = {
    persist: 0,
    evaluate: 0,
    guardrail: 0,
    quick_screen: 0,
  };
  for (const r of week.data as { stage: ErrorStage }[]) {
    if (r.stage in byStage) byStage[r.stage] += 1;
  }

  return {
    overview: {
      rows: (recent.data as unknown as RawErrorRow[]).map((r) => ({
        id: r.id,
        stage: r.stage,
        message: r.message,
        childNickname: r.children?.nickname ?? null,
        meta: r.meta ?? {},
        resolved: r.resolved,
        createdAt: r.created_at,
      })),
      last7Days: { byStage, submissions: submissions.count ?? 0 },
    },
    error: null,
  };
}
