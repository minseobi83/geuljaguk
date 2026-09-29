import { SupabaseClient } from "@supabase/supabase-js";
import { EvaluationResult, ParagraphAnswer, RubricScores } from "@/lib/types";

// 관리자 기능 1차분: 인증 + 이용 현황 확인. (확인이 필요한 글 처리는 4차분에서
// moderationQueries.ts로 옮겼다.)
// 2차분(2026-09-19): 글감 관리(topicQueries.ts), 평가기준·프롬프트 버전 관리
// (promptQueries.ts), 학생별 상세 관리(이 파일의 getChildOverview).
// 5차분(2026-09-28): 학생별 학습 데이터 상세·내보내기(getChildDetail), 관리 기록(getAdminAuditLog).

export async function isAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from("admins").select("id").eq("id", userId).maybeSingle();
  return Boolean(data);
}

// 보호자 이메일 (8차분 admin_parent_emails). 관리자 세션에서만 값이 오고, 함수가 아직 없거나
// 실패하면 빈 맵을 돌려준다 - 연락처를 못 읽었다고 관리자 화면이 멈추면 안 된다.
export async function getParentEmails(
  supabase: SupabaseClient,
  parentIds: string[]
): Promise<Map<string, string>> {
  const ids = [...new Set(parentIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.rpc("admin_parent_emails", { parent_ids: ids });
  if (error || !data) return new Map();
  return new Map(
    (data as { parent_id: string; email: string | null }[])
      .filter((r) => r.email)
      .map((r) => [r.parent_id, r.email as string])
  );
}

export interface UsageStats {
  totalParents: number;
  totalChildren: number;
  totalEssays: number;
  essaysLast7Days: number;
  essaysLast30Days: number;
}

export async function getUsageStats(supabase: SupabaseClient): Promise<UsageStats> {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(now - 7 * DAY).toISOString();
  const thirtyDaysAgo = new Date(now - 30 * DAY).toISOString();

  const [parents, children, essays, essaysLast7, essaysLast30] = await Promise.all([
    supabase.from("parents").select("id", { count: "exact", head: true }),
    supabase.from("children").select("id", { count: "exact", head: true }),
    supabase.from("essays").select("id", { count: "exact", head: true }),
    supabase
      .from("essays")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("essays")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo),
  ]);

  return {
    totalParents: parents.count ?? 0,
    totalChildren: children.count ?? 0,
    totalEssays: essays.count ?? 0,
    essaysLast7Days: essaysLast7.count ?? 0,
    essaysLast30Days: essaysLast30.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// 학생별 상세 관리 (관리자 2차분)
// ---------------------------------------------------------------------------

export interface AdminChildEssay {
  id: string;
  writingType: string;
  topicTitle: string | null;
  createdAt: string;
  versionCount: number;
}

export interface AdminChildRow {
  id: string;
  parentId: string;
  parentEmail: string | null;
  nickname: string;
  gradeBand: string;
  joinedAt: string;
  essayCount: number;
  versionCount: number;
  lastActivityAt: string | null;
  essays: AdminChildEssay[];
}

interface RawChildRow {
  id: string;
  parent_id: string;
  nickname: string;
  grade_band: string;
  created_at: string;
  essays: {
    id: string;
    writing_type: string;
    topic_title: string | null;
    created_at: string;
    essay_versions: { id: string; created_at: string }[];
  }[];
}

// 모든 자녀와 각자의 글 목록. admins_read_all_* 정책 덕분에 관리자 세션이면 전체가 읽힌다.
// 이름(실명)은 애초에 저장하지 않으므로 여기서도 별명만 다룬다.
//
// 자녀 한 명당 글 목록을 통째로 가져오는 단순한 구현이다. 이용자가 많아지면 목록과 상세를
// 나눠서 불러오도록 바꿔야 한다.
export async function getChildOverview(
  supabase: SupabaseClient,
  essaysPerChild = 20
): Promise<{ children: AdminChildRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("children")
    .select(
      "id, parent_id, nickname, grade_band, created_at, essays(id, writing_type, topic_title, created_at, essay_versions(id, created_at))"
    )
    .order("created_at", { ascending: false });

  if (error) return { children: [], error: error.message };

  const children: AdminChildRow[] = (data as unknown as RawChildRow[]).map((c) => {
    const essays: AdminChildEssay[] = (c.essays ?? [])
      .map((e) => ({
        id: e.id,
        writingType: e.writing_type,
        topicTitle: e.topic_title,
        createdAt: e.created_at,
        versionCount: e.essay_versions?.length ?? 0,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const versionCount = essays.reduce((sum, e) => sum + e.versionCount, 0);
    // 마지막 활동은 "글을 만든 시각"이 아니라 "가장 최근에 제출한 시도"의 시각으로 본다.
    const allVersionTimes = (c.essays ?? []).flatMap((e) =>
      (e.essay_versions ?? []).map((v) => v.created_at)
    );
    allVersionTimes.sort();

    return {
      id: c.id,
      parentId: c.parent_id,
      parentEmail: null as string | null,
      nickname: c.nickname,
      gradeBand: c.grade_band,
      joinedAt: c.created_at,
      essayCount: essays.length,
      versionCount,
      lastActivityAt: allVersionTimes[allVersionTimes.length - 1] ?? null,
      essays: essays.slice(0, essaysPerChild),
    };
  });

  const emails = await getParentEmails(
    supabase,
    children.map((c) => c.parentId)
  );
  for (const c of children) c.parentEmail = emails.get(c.parentId) ?? null;

  return { children, error: null };
}

// ---------------------------------------------------------------------------
// 학생 한 명의 학습 데이터 전체 (관리자 5차분) - 상세 보기와 내보내기에 같이 쓴다.
// ---------------------------------------------------------------------------

export interface AdminVersionDetail {
  id: string;
  versionNo: number;
  createdAt: string;
  studentText: string;
  paragraphAnswers: ParagraphAnswer[];
  summary: string | null;
  scores: RubricScores | null;
  priorityCategory: string | null;
  priorityNote: string | null;
  nextTaskSkill: string | null;
  safetyNote: string | null;
}

export interface AdminEssayDetail {
  id: string;
  writingType: string;
  topicTitle: string | null;
  createdAt: string;
  versions: AdminVersionDetail[]; // 시도 순서대로
}

export interface AdminChildDetail {
  id: string;
  parentId: string;
  parentEmail: string | null;
  nickname: string;
  gradeBand: string;
  joinedAt: string;
  essays: AdminEssayDetail[]; // 최신 글 먼저
}

interface RawDetailRow {
  id: string;
  parent_id: string;
  nickname: string;
  grade_band: string;
  created_at: string;
  essays: {
    id: string;
    writing_type: string;
    topic_title: string | null;
    created_at: string;
    essay_versions: {
      id: string;
      version_no: number;
      created_at: string;
      student_text: string;
      paragraph_answers?: ParagraphAnswer[] | null;
      evaluations: { result: EvaluationResult | null }[];
    }[];
  }[];
}

export async function getChildDetail(
  supabase: SupabaseClient,
  childId: string
): Promise<{ detail: AdminChildDetail | null; error: string | null }> {
  const query = (versionColumns: string) => {
    const columns: string = `id, parent_id, nickname, grade_band, created_at, essays(id, writing_type, topic_title, created_at, essay_versions(${versionColumns}, evaluations(result)))`;
    return supabase.from("children").select(columns).eq("id", childId).maybeSingle();
  };

  let { data, error } = await query("id, version_no, created_at, student_text, paragraph_answers");
  // paragraph_answers 컬럼을 아직 안 만든 DB에서도 나머지는 보이도록.
  if (error && /paragraph_answers/.test(error.message)) {
    ({ data, error } = await query("id, version_no, created_at, student_text"));
  }
  if (error) return { detail: null, error: error.message };
  if (!data) return { detail: null, error: "학생을 찾을 수 없어요. 이미 삭제됐을 수 있어요." };

  const c = data as unknown as RawDetailRow;
  const essays: AdminEssayDetail[] = (c.essays ?? [])
    .map((e) => ({
      id: e.id,
      writingType: e.writing_type,
      topicTitle: e.topic_title,
      createdAt: e.created_at,
      versions: [...(e.essay_versions ?? [])]
        .sort((a, b) => a.version_no - b.version_no)
        .map((v) => {
          const r = v.evaluations?.[0]?.result ?? null;
          return {
            id: v.id,
            versionNo: v.version_no,
            createdAt: v.created_at,
            studentText: v.student_text,
            paragraphAnswers: v.paragraph_answers ?? [],
            summary: r?.summary ?? null,
            scores: r?.scores ?? null,
            priorityCategory: r?.priority_issue?.category ?? null,
            priorityNote: r?.priority_issue?.note ?? null,
            nextTaskSkill: r?.next_task?.skill ?? null,
            safetyNote: r?.safety?.concern ? r.safety.note : null,
          };
        }),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    detail: {
      id: c.id,
      parentId: c.parent_id,
      parentEmail: (await getParentEmails(supabase, [c.parent_id])).get(c.parent_id) ?? null,
      nickname: c.nickname,
      gradeBand: c.grade_band,
      joinedAt: c.created_at,
      essays,
    },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// 관리 기록 (관리자 5차분)
// ---------------------------------------------------------------------------

export type AuditAction = "학생 정보 수정" | "데이터 내보내기" | "글 삭제" | "학생 삭제";

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  childId: string | null;
  detail: Record<string, unknown>;
  actorId: string | null;
  createdAt: string;
}

export async function getAdminAuditLog(
  supabase: SupabaseClient,
  limit = 40
): Promise<{ entries: AuditLogEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("id, action, child_id, detail, actor_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { entries: [], error: error.message };
  return {
    entries: (data ?? []).map((r) => ({
      id: r.id,
      action: r.action as AuditAction,
      childId: r.child_id,
      detail: (r.detail ?? {}) as Record<string, unknown>,
      actorId: r.actor_id,
      createdAt: r.created_at,
    })),
    error: null,
  };
}
