import { SupabaseClient } from "@supabase/supabase-js";
import { EvaluationResult } from "@/lib/types";

// 관리자 기능 1차분: 인증 + 이용 현황 확인 + AI 응답 품질/부적절 콘텐츠 검토.
// 2차분(2026-09-19): 글감 관리(topicQueries.ts), 평가기준·프롬프트 버전 관리
// (promptQueries.ts), 학생별 상세 관리(이 파일의 getChildOverview).

export async function isAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from("admins").select("id").eq("id", userId).maybeSingle();
  return Boolean(data);
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

export interface FlaggedEssay {
  essayId: string;
  versionId: string;
  childNickname: string;
  childGrade: string;
  writingType: string;
  topicTitle: string | null;
  createdAt: string;
  safetyNote: string | null;
  rewroteStudentText: boolean;
}

interface RawFlaggedRow {
  created_at: string;
  essays: {
    id: string;
    writing_type: string;
    topic_title: string | null;
    children: { nickname: string; grade_band: string } | null;
  } | null;
  evaluations: { result: EvaluationResult; rewrote_student_text: boolean }[];
}

// 최근 버전들 중에서 "어른이 봐야 할" 것만 골라낸다: AI/서버가 안전 신호로 표시했거나
// (safety.concern), 가드레일이 걸려 학생 문장을 그대로 재사용할 뻔한 응답(rewrote_student_text).
// 전용 인덱스/뷰 없이 최근 N개 버전만 훑는 가벼운 구현 - 트래픽이 커지면 별도 집계 테이블로
// 옮기는 게 좋다.
export async function getFlaggedEssays(
  supabase: SupabaseClient,
  scanLimit = 300,
  resultLimit = 50
): Promise<FlaggedEssay[]> {
  const { data, error } = await supabase
    .from("essay_versions")
    .select(
      "id, created_at, essays(id, writing_type, topic_title, children(nickname, grade_band)), evaluations(result, rewrote_student_text)"
    )
    .order("created_at", { ascending: false })
    .limit(scanLimit);

  if (error || !data) return [];

  const flagged: FlaggedEssay[] = [];
  for (const row of data as unknown as (RawFlaggedRow & { id: string })[]) {
    const evalRow = row.evaluations?.[0];
    if (!evalRow || !row.essays) continue;
    const safety = evalRow.result?.safety;
    const rewrote = Boolean(evalRow.rewrote_student_text);
    if (!safety?.concern && !rewrote) continue;

    flagged.push({
      essayId: row.essays.id,
      versionId: row.id,
      childNickname: row.essays.children?.nickname ?? "(알 수 없음)",
      childGrade: row.essays.children?.grade_band ?? "-",
      writingType: row.essays.writing_type,
      topicTitle: row.essays.topic_title,
      createdAt: row.created_at,
      safetyNote: safety?.concern ? safety.note : null,
      rewroteStudentText: rewrote,
    });
    if (flagged.length >= resultLimit) break;
  }
  return flagged;
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
      "id, nickname, grade_band, created_at, essays(id, writing_type, topic_title, created_at, essay_versions(id, created_at))"
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
      nickname: c.nickname,
      gradeBand: c.grade_band,
      joinedAt: c.created_at,
      essayCount: essays.length,
      versionCount,
      lastActivityAt: allVersionTimes[allVersionTimes.length - 1] ?? null,
      essays: essays.slice(0, essaysPerChild),
    };
  });

  return { children, error: null };
}
