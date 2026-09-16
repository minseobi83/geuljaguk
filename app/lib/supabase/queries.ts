import { SupabaseClient } from "@supabase/supabase-js";
import { EvaluationResult, RubricScores, WritingType } from "@/lib/types";

export interface EssayHistoryItem {
  id: string;
  writingType: WritingType;
  topicTitle: string | null;
  createdAt: string;
  scores: RubricScores | null;
  summary: string | null;
  safetyNote: string | null;
  priorityCategory: string | null;
  nextTaskSkill: string | null;
  // 이 글을 몇 번 써봤는지(재작성 횟수 포함). 2 이상이면 피드백을 보고 스스로 고쳐 썼다는 뜻.
  versionCount: number;
}

// 에세이별로 "가장 마지막 시도(재작성 포함 최신 버전)"의 평가만 골라서 돌려준다.
// 같은 에세이를 여러 번 고쳐 썼어도, 성장 추이에는 최종 결과만 반영하는 게 맞기 때문.
export async function getChildEssayHistory(
  supabase: SupabaseClient,
  childId: string,
  limit = 20
): Promise<EssayHistoryItem[]> {
  const { data: essays } = await supabase
    .from("essays")
    .select(
      "id, writing_type, topic_title, created_at, essay_versions(version_no, evaluations(result))"
    )
    .eq("child_id", childId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (essays ?? []).map((e) => {
    const versions = (e.essay_versions ?? []) as {
      version_no: number;
      evaluations: { result: EvaluationResult }[];
    }[];
    const latestVersion = [...versions].sort((a, b) => b.version_no - a.version_no)[0];
    const result = latestVersion?.evaluations?.[0]?.result ?? null;
    return {
      id: e.id,
      writingType: e.writing_type,
      topicTitle: e.topic_title,
      createdAt: e.created_at,
      scores: result?.scores ?? null,
      summary: result?.summary ?? null,
      safetyNote: result?.safety?.concern ? result.safety.note : null,
      priorityCategory: result?.priority_issue?.category ?? null,
      nextTaskSkill: result?.next_task?.skill ?? null,
      versionCount: versions.length,
    };
  });
}
