import { SupabaseClient } from "@supabase/supabase-js";
import { EvaluationResult } from "@/lib/types";
import { getParentEmails } from "./adminQueries";

// 관리자 4차분(2026-09-28): 부적절한 콘텐츠 처리 흐름.
// "확인이 필요한 글"을 모아 상태(미확인 → 확인 중 → 조치 완료 / 문제 없음)를 관리한다.
// 처리 기록은 content_flag_actions에 한 줄씩 쌓이고, 가장 최근 줄이 현재 상태가 된다.

export type ModerationStatus = "미확인" | "확인 중" | "조치 완료" | "문제 없음";

export const MODERATION_STATUSES: ModerationStatus[] = ["미확인", "확인 중", "조치 완료", "문제 없음"];

// 아직 끝나지 않은 상태. 이 상태의 글은 목록 위쪽에 오고, 탭 제목의 숫자에도 잡힌다.
export const OPEN_STATUSES: ModerationStatus[] = ["미확인", "확인 중"];

// '조치 완료'로 닫을 때 고르는 조치. 목록을 바꿔도 예전 기록은 적힌 글자 그대로 남는다.
export const MODERATION_ACTIONS = [
  "보호자 안내",
  "전문기관 연계 안내",
  "평가기준(프롬프트) 조정",
  "기타",
] as const;

// 왜 이 글이 목록에 올라왔는지.
export type FlagReason = "안전 신호" | "가드레일 위반" | "관리자 판정 부적절" | "관리자 신고";

// 관리자가 학생별 탭에서 직접 신고한 기록의 표시. 신고는 '미확인' 상태의 처리 기록 한 줄로 남긴다.
export const MANUAL_REPORT_ACTION = "관리자 신고";

export interface ModerationLogEntry {
  status: ModerationStatus;
  actionTaken: string | null;
  note: string | null;
  actorId: string | null;
  createdAt: string;
}

export interface ModerationItem {
  versionId: string;
  evaluationId: string;
  childNickname: string;
  childGrade: string;
  // 보호자에게 연락해야 할 때 Supabase Auth에서 계정을 찾을 수 있도록 (앱은 이메일을 따로 저장하지 않음).
  parentId: string | null;
  parentEmail: string | null;
  writingType: string;
  topicTitle: string | null;
  versionNo: number;
  createdAt: string;
  studentText: string;
  aiSummary: string | null;
  safetyNote: string | null;
  reasons: FlagReason[];
  status: ModerationStatus;
  // 오래된 것부터.
  log: ModerationLogEntry[];
}

interface RawEvaluationRow {
  id: string;
  created_at: string;
  rewrote_student_text: boolean;
  result: EvaluationResult | null;
  essay_versions: {
    id: string;
    version_no: number;
    student_text: string;
    created_at: string;
    essays: {
      writing_type: string;
      topic_title: string | null;
      children: { nickname: string; grade_band: string; parent_id: string } | null;
    } | null;
  } | null;
}

const EVALUATION_COLUMNS =
  "id, created_at, rewrote_student_text, result, essay_versions(id, version_no, student_text, created_at, essays(writing_type, topic_title, children(nickname, grade_band, parent_id)))";

// 안전 신호·가드레일 위반은 DB에서 바로 걸러 오고(오래된 미처리 건이 밀려나지 않도록),
// 필터 문법이 막히는 환경이면 최근 N건을 훑는 예전 방식으로 대신한다.
async function fetchAutoFlagged(
  supabase: SupabaseClient,
  limit: number
): Promise<{ rows: RawEvaluationRow[]; error: string | null }> {
  const filtered = await supabase
    .from("evaluations")
    .select(EVALUATION_COLUMNS)
    .or("rewrote_student_text.eq.true,result->safety->>concern.eq.true")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!filtered.error) {
    return { rows: (filtered.data ?? []) as unknown as RawEvaluationRow[], error: null };
  }

  const scanned = await supabase
    .from("evaluations")
    .select(EVALUATION_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (scanned.error) return { rows: [], error: scanned.error.message };
  const rows = (scanned.data ?? []) as unknown as RawEvaluationRow[];
  return {
    rows: rows.filter((r) => r.rewrote_student_text || r.result?.safety?.concern),
    error: null,
  };
}

// 관리자가 직접 신고한 시도들. AI가 표시하지 않은 글도 같은 흐름으로 처리하기 위해서다.
async function fetchManualReports(
  supabase: SupabaseClient,
  limit: number
): Promise<RawEvaluationRow[]> {
  const { data: reports } = await supabase
    .from("content_flag_actions")
    .select("essay_version_id")
    .eq("action_taken", MANUAL_REPORT_ACTION)
    .order("created_at", { ascending: false })
    .limit(limit);
  const ids = [...new Set((reports ?? []).map((r) => r.essay_version_id as string))];
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("evaluations")
    .select(EVALUATION_COLUMNS)
    .in("essay_version_id", ids);
  return (data ?? []) as unknown as RawEvaluationRow[];
}

// 품질 검토에서 관리자가 '부적절'로 판정한 첨삭도 같은 흐름으로 처리한다.
async function fetchAdminJudged(
  supabase: SupabaseClient,
  limit: number
): Promise<RawEvaluationRow[]> {
  const { data: reviews } = await supabase
    .from("evaluation_reviews")
    .select("evaluation_id")
    .eq("verdict", "부적절")
    .order("updated_at", { ascending: false })
    .limit(limit);
  const ids = [...new Set((reviews ?? []).map((r) => r.evaluation_id as string))];
  if (ids.length === 0) return [];

  const { data } = await supabase.from("evaluations").select(EVALUATION_COLUMNS).in("id", ids);
  return (data ?? []) as unknown as RawEvaluationRow[];
}

export async function getModerationQueue(
  supabase: SupabaseClient,
  limit = 200
): Promise<{ items: ModerationItem[]; error: string | null; logError: string | null }> {
  const [auto, judged, reported] = await Promise.all([
    fetchAutoFlagged(supabase, limit),
    fetchAdminJudged(supabase, limit),
    fetchManualReports(supabase, limit),
  ]);
  if (auto.error) return { items: [], error: auto.error, logError: null };

  const judgedIds = new Set(judged.map((r) => r.id));
  const reportedIds = new Set(reported.map((r) => r.id));
  const byVersion = new Map<string, ModerationItem>();

  for (const row of [...auto.rows, ...judged, ...reported]) {
    const version = row.essay_versions;
    if (!version) continue;
    const existing = byVersion.get(version.id);

    const reasons: FlagReason[] = [];
    if (row.result?.safety?.concern) reasons.push("안전 신호");
    if (row.rewrote_student_text) reasons.push("가드레일 위반");
    if (judgedIds.has(row.id)) reasons.push("관리자 판정 부적절");
    if (reportedIds.has(row.id)) reasons.push("관리자 신고");

    if (existing) {
      for (const r of reasons) if (!existing.reasons.includes(r)) existing.reasons.push(r);
      continue;
    }

    byVersion.set(version.id, {
      versionId: version.id,
      evaluationId: row.id,
      childNickname: version.essays?.children?.nickname ?? "(알 수 없음)",
      childGrade: version.essays?.children?.grade_band ?? "-",
      parentId: version.essays?.children?.parent_id ?? null,
      parentEmail: null,
      writingType: version.essays?.writing_type ?? row.result?.writing_type ?? "-",
      topicTitle: version.essays?.topic_title ?? null,
      versionNo: version.version_no,
      createdAt: version.created_at,
      studentText: version.student_text,
      aiSummary: row.result?.summary ?? null,
      safetyNote: row.result?.safety?.concern ? row.result.safety.note : null,
      reasons,
      status: "미확인",
      log: [],
    });
  }

  const items = [...byVersion.values()];
  let logError: string | null = null;

  if (items.length > 0) {
    const { data: logs, error } = await supabase
      .from("content_flag_actions")
      .select("essay_version_id, status, action_taken, note, actor_id, created_at")
      .in(
        "essay_version_id",
        items.map((i) => i.versionId)
      )
      .order("created_at", { ascending: true });

    if (error) {
      // 테이블이 아직 없으면(schema.sql 4차분 미실행) 모두 '미확인'으로 보여준다.
      logError = error.message;
    } else {
      for (const l of logs ?? []) {
        const item = byVersion.get(l.essay_version_id as string);
        if (!item) continue;
        item.log.push({
          status: l.status as ModerationStatus,
          actionTaken: l.action_taken,
          note: l.note,
          actorId: l.actor_id,
          createdAt: l.created_at,
        });
        item.status = l.status as ModerationStatus;
      }
    }
  }

  const emails = await getParentEmails(
    supabase,
    items.map((i) => i.parentId ?? "")
  );
  for (const i of items) i.parentEmail = i.parentId ? emails.get(i.parentId) ?? null : null;

  // 안전 신호 > 나머지, 그 안에서 끝나지 않은 것 먼저, 그 안에서는 최신순.
  const rank = (i: ModerationItem) =>
    (OPEN_STATUSES.includes(i.status) ? 0 : 2) + (i.reasons.includes("안전 신호") ? 0 : 1);
  items.sort(
    (a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt)
  );

  return { items, error: null, logError };
}
