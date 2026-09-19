import { SupabaseClient } from "@supabase/supabase-js";
import { SYSTEM_PROMPT } from "@/lib/prompt";

export interface PromptVersion {
  id: string;
  label: string;
  systemPrompt: string;
  note: string | null;
  isActive: boolean;
  createdAt: string;
}

interface PromptVersionRow {
  id: string;
  label: string;
  system_prompt: string;
  note: string | null;
  is_active: boolean;
  created_at: string;
}

function toPromptVersion(row: PromptVersionRow): PromptVersion {
  return {
    id: row.id,
    label: row.label,
    systemPrompt: row.system_prompt,
    note: row.note,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

// 채점에 실제로 쓸 시스템 프롬프트.
//
// 활성 버전이 DB에 있으면 그것을, 없거나 조회에 실패하면 코드에 있는 기본 프롬프트를 쓴다.
// 여기서 예외를 던지면 채점 자체가 막히므로 절대 던지지 않는다 - 프롬프트를 못 읽는 것보다
// 기본값으로라도 채점해주는 쪽이 낫다.
//
// 캐싱과의 관계: 프롬프트 캐시 키는 프롬프트 "내용"이라, 버전을 바꾸면 그 순간부터 새 캐시가
// 만들어지고 이전 캐시는 자연히 만료된다. 자주 바꾸면 캐시 적중률이 떨어지니, 버전 전환은
// 필요할 때만 하는 게 좋다.
export async function getActiveSystemPrompt(
  supabase: SupabaseClient
): Promise<{ prompt: string; source: "db" | "code"; label: string | null }> {
  try {
    const { data, error } = await supabase
      .from("prompt_versions")
      .select("label, system_prompt")
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data?.system_prompt) {
      return { prompt: SYSTEM_PROMPT, source: "code", label: null };
    }
    return { prompt: data.system_prompt, source: "db", label: data.label };
  } catch (e) {
    console.error("[prompt] 활성 버전 조회 실패, 코드 기본값 사용:", e);
    return { prompt: SYSTEM_PROMPT, source: "code", label: null };
  }
}

// 관리자 화면용: 모든 버전을 최신순으로.
export async function getPromptVersions(
  supabase: SupabaseClient
): Promise<{ versions: PromptVersion[]; error: string | null }> {
  const { data, error } = await supabase
    .from("prompt_versions")
    .select("id, label, system_prompt, note, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) return { versions: [], error: error.message };
  return { versions: (data as PromptVersionRow[]).map(toPromptVersion), error: null };
}
