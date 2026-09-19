import { SupabaseClient } from "@supabase/supabase-js";
import { FALLBACK_TOPICS, Topic } from "@/lib/topics";
import { GradeBand, WritingType } from "@/lib/types";

// DB의 한 행. grades는 postgres text[]라 그대로 문자열 배열로 온다.
interface TopicRow {
  id: string;
  writing_type: string;
  title: string;
  hint: string;
  grades: string[];
  sort_order: number;
  is_active: boolean;
}

function toTopic(row: TopicRow): Topic {
  return {
    id: row.id,
    writingType: row.writing_type as WritingType,
    title: row.title,
    hint: row.hint,
    grades: row.grades as GradeBand[],
  };
}

// 학생이 고를 수 있는(숨기지 않은) 글감 전체.
//
// 조회에 실패했거나(테이블이 아직 없는 경우 포함) 결과가 하나도 없으면 코드에 있는 기본
// 목록을 돌려준다. 글감을 못 읽었다고 글쓰기 화면이 비어버리면 안 되기 때문 - 조용히
// 폴백하고 로그만 남긴다.
// 부수효과: 관리자가 모든 글감을 숨기면 기본 목록이 다시 보인다. 글감이 하나도 없는 화면보다
// 나으니 그대로 둔다 (특정 유형만 비우려면 그 유형의 글감만 숨기면 된다).
export async function getActiveTopics(supabase: SupabaseClient): Promise<Topic[]> {
  const { data, error } = await supabase
    .from("topics")
    .select("id, writing_type, title, hint, grades, sort_order, is_active")
    .eq("is_active", true)
    .order("writing_type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    if (error) console.error("[topics] 글감 조회 실패, 기본 목록으로 대체:", error.message);
    return FALLBACK_TOPICS;
  }
  return (data as TopicRow[]).map(toTopic);
}

// 관리자 화면용: 숨긴 글감까지 전부. 이쪽은 폴백하지 않는다 - 관리자에게는 DB에 실제로
// 무엇이 들어있는지 그대로 보여야 하고, 비어 있으면 "아직 시드를 실행하지 않았다"는
// 사실 자체가 정보이기 때문.
export interface AdminTopic extends Topic {
  sortOrder: number;
  isActive: boolean;
}

export async function getAllTopicsForAdmin(
  supabase: SupabaseClient
): Promise<{ topics: AdminTopic[]; error: string | null }> {
  const { data, error } = await supabase
    .from("topics")
    .select("id, writing_type, title, hint, grades, sort_order, is_active")
    .order("writing_type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) return { topics: [], error: error.message };
  return {
    topics: (data as TopicRow[]).map((row) => ({
      ...toTopic(row),
      sortOrder: row.sort_order,
      isActive: row.is_active,
    })),
    error: null,
  };
}
