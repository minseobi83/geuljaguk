import { SupabaseClient } from "@supabase/supabase-js";
import { EvaluationResult } from "@/lib/types";

// 관리자 기능 1차분: 인증 + 이용 현황 확인 + AI 응답 품질/부적절 콘텐츠 검토.
// 글감·평가기준·프롬프트 관리, 학생별 상세 관리 화면은 아직 없음 (다음 작업으로 남겨둠).

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
