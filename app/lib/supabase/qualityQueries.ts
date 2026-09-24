import { SupabaseClient } from "@supabase/supabase-js";
import { EvaluationResult } from "@/lib/types";

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

// 최근 첨삭을 가져와 "아직 아무도 검토하지 않은 것 → 그중 신호가 있는 것" 순으로 앞에 세운다.
// 최근 N건만 훑는 가벼운 구현이라, 오래된 미검토 첨삭은 목록에서 밀려날 수 있다.
export async function getReviewQueue(
  supabase: SupabaseClient,
  limit = 80
): Promise<{ items: ReviewQueueItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("evaluations")
    .select(
      "id, created_at, prompt_version_id, confidence, rewrote_student_text, result, essay_versions(version_no, student_text, essays(writing_type, topic_title, children(nickname, grade_band))), evaluation_reviews(reviewer_id, verdict, issues, note, updated_at)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { items: [], error: error.message };

  const items: ReviewQueueItem[] = [];
  for (const row of data as unknown as RawReviewRow[]) {
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
    });
  }

  const rank = (i: ReviewQueueItem) =>
    i.reviews.length > 0 ? 2 : i.flags.length > 0 ? 0 : 1;
  // sort는 안정 정렬이라, 같은 순위 안에서는 위에서 가져온 최신순이 그대로 유지된다.
  items.sort((a, b) => rank(a) - rank(b));

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
