"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/adminQueries";
import { GradeBand, WritingType } from "@/lib/types";

// 관리자 화면의 쓰기 동작들. RLS 정책(topics_admin_*, prompt_versions_admin_*)이 DB에서
// 한 번 더 막아주지만, 액션 진입 시점에도 관리자인지 확인해서 의미 있는 메시지를 돌려준다.

export interface ActionResult {
  ok: boolean;
  message: string;
}

const ALL_GRADES: GradeBand[] = ["4", "5", "6"];

async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, userId: null as string | null, ok: false };
  const admin = await isAdmin(supabase, data.user.id);
  return { supabase, userId: data.user.id, ok: admin };
}

function readGrades(formData: FormData): GradeBand[] {
  const picked = ALL_GRADES.filter((g) => formData.get(`grade_${g}`) === "on");
  // 학년을 하나도 고르지 않으면 모든 학년에 보이도록 둔다 (글감이 어디에도 안 뜨는 상황 방지).
  return picked.length > 0 ? picked : ALL_GRADES;
}

// 글감 id는 URL이나 시드와 섞여도 안전하도록 영문 소문자·숫자·하이픈만 허용한다.
function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function createTopic(formData: FormData): Promise<ActionResult> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, message: "관리자만 글감을 추가할 수 있어요." };

  const title = String(formData.get("title") ?? "").trim();
  const hint = String(formData.get("hint") ?? "").trim();
  const writingType = String(formData.get("writing_type") ?? "").trim() as WritingType;
  const rawId = String(formData.get("id") ?? "").trim();

  if (!title) return { ok: false, message: "글감 제목을 적어주세요." };
  if (!hint) return { ok: false, message: "무엇을 쓸지 알려주는 안내 문구를 적어주세요." };
  if (!writingType) return { ok: false, message: "글의 종류를 골라주세요." };

  // id를 비워두면 제목에서 만들어보고, 한글뿐이라 빈 문자열이 되면 시각 기반으로 붙인다.
  const id = slugify(rawId) || slugify(title) || `topic-${Date.now()}`;

  const { error } = await supabase.from("topics").insert({
    id,
    writing_type: writingType,
    title,
    hint,
    grades: readGrades(formData),
    sort_order: Number(formData.get("sort_order") ?? 999) || 999,
    is_active: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: `이미 같은 아이디(${id})의 글감이 있어요.` };
    }
    return { ok: false, message: `추가하지 못했어요: ${error.message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: `'${title}' 글감을 추가했어요.` };
}

export async function updateTopic(formData: FormData): Promise<ActionResult> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, message: "관리자만 글감을 고칠 수 있어요." };

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const hint = String(formData.get("hint") ?? "").trim();
  if (!id) return { ok: false, message: "어떤 글감인지 알 수 없어요." };
  if (!title || !hint) return { ok: false, message: "제목과 안내 문구는 비울 수 없어요." };

  const { error } = await supabase
    .from("topics")
    .update({
      title,
      hint,
      grades: readGrades(formData),
      sort_order: Number(formData.get("sort_order") ?? 999) || 999,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, message: `수정하지 못했어요: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: `'${title}' 글감을 고쳤어요.` };
}

// 글감은 지우지 않고 숨긴다. 이미 그 글감으로 쓴 글이 남아 있어서, 지우면 기록의 맥락이
// 사라지기 때문. (essays.topic_title에 제목이 문자열로 복사돼 있어 글 자체는 안전하지만,
// 나중에 같은 글감을 다시 살릴 수 있도록 행은 남겨둔다.)
export async function setTopicActive(formData: FormData): Promise<ActionResult> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, message: "관리자만 글감을 숨길 수 있어요." };

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return { ok: false, message: "어떤 글감인지 알 수 없어요." };

  const { error } = await supabase
    .from("topics")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, message: `바꾸지 못했어요: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: active ? "다시 보이게 했어요." : "학생 화면에서 숨겼어요." };
}

// 평가기준(시스템 프롬프트)은 고쳐쓰지 않고 항상 새 버전으로 쌓는다. 어떤 기준으로 채점했는지
// 나중에 되짚을 수 있어야 하고, 문제가 생기면 이전 버전으로 되돌릴 수 있어야 하기 때문.
export async function createPromptVersion(formData: FormData): Promise<ActionResult> {
  const { supabase, userId, ok } = await requireAdmin();
  if (!ok) return { ok: false, message: "관리자만 평가기준을 바꿀 수 있어요." };

  const label = String(formData.get("label") ?? "").trim();
  const systemPrompt = String(formData.get("system_prompt") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const activateNow = formData.get("activate") === "on";

  if (!label) return { ok: false, message: "버전 이름을 적어주세요." };
  if (systemPrompt.length < 200) {
    return { ok: false, message: "프롬프트가 너무 짧아요. 전체 내용을 붙여넣었는지 확인해주세요." };
  }

  const { data, error } = await supabase
    .from("prompt_versions")
    .insert({
      label,
      system_prompt: systemPrompt,
      note: note || null,
      is_active: false,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: `저장하지 못했어요: ${error.message}` };

  if (activateNow) {
    const { error: rpcError } = await supabase.rpc("activate_prompt_version", {
      target_id: data.id,
    });
    if (rpcError) {
      return {
        ok: false,
        message: `버전은 저장했지만 활성화에 실패했어요: ${rpcError.message}`,
      };
    }
  }

  revalidatePath("/admin");
  return {
    ok: true,
    message: activateNow
      ? `'${label}' 버전을 저장하고 지금부터 이 기준으로 채점해요.`
      : `'${label}' 버전을 저장했어요. 아직 채점에는 쓰이지 않아요.`,
  };
}

export async function activatePromptVersion(formData: FormData): Promise<ActionResult> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, message: "관리자만 평가기준을 바꿀 수 있어요." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "어떤 버전인지 알 수 없어요." };

  const { error } = await supabase.rpc("activate_prompt_version", { target_id: id });
  if (error) return { ok: false, message: `바꾸지 못했어요: ${error.message}` };

  revalidatePath("/admin");
  return { ok: true, message: "이 버전으로 채점하도록 바꿨어요." };
}

// 활성 버전을 모두 끄면 코드에 들어있는 기본 프롬프트로 돌아간다 (가장 확실한 비상 복구).
export async function useCodeDefaultPrompt(): Promise<ActionResult> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, message: "관리자만 평가기준을 바꿀 수 있어요." };

  const { error } = await supabase
    .from("prompt_versions")
    .update({ is_active: false })
    .eq("is_active", true);

  if (error) return { ok: false, message: `바꾸지 못했어요: ${error.message}` };

  revalidatePath("/admin");
  return { ok: true, message: "코드에 들어있는 기본 평가기준으로 되돌렸어요." };
}

// ---------------------------------------------------------------------------
// AI 응답 품질 검토 · 오류 확인 (관리자 3차분)
// ---------------------------------------------------------------------------

const REVIEW_VERDICTS = ["적절", "아쉬움", "부적절"] as const;

// 한 첨삭에 대한 판정은 관리자 한 명당 하나 - 다시 저장하면 덮어쓴다.
export async function saveEvaluationReview(formData: FormData): Promise<ActionResult> {
  const { supabase, userId, ok } = await requireAdmin();
  if (!ok || !userId) return { ok: false, message: "관리자만 품질 검토를 남길 수 있어요." };

  const evaluationId = String(formData.get("evaluation_id") ?? "");
  const verdict = String(formData.get("verdict") ?? "");
  const issues = formData
    .getAll("issues")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const note = String(formData.get("note") ?? "").trim();

  if (!evaluationId) return { ok: false, message: "어떤 첨삭인지 알 수 없어요." };
  if (!REVIEW_VERDICTS.includes(verdict as (typeof REVIEW_VERDICTS)[number])) {
    return { ok: false, message: "적절 / 아쉬움 / 부적절 중 하나를 골라주세요." };
  }

  const { error } = await supabase.from("evaluation_reviews").upsert(
    {
      evaluation_id: evaluationId,
      reviewer_id: userId,
      verdict,
      issues,
      note: note || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "evaluation_id,reviewer_id" }
  );

  if (error) return { ok: false, message: `저장하지 못했어요: ${error.message}` };

  revalidatePath("/admin");
  return { ok: true, message: `'${verdict}'(으)로 검토를 저장했어요.` };
}

export async function setErrorResolved(formData: FormData): Promise<ActionResult> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, message: "관리자만 오류를 처리할 수 있어요." };

  const id = String(formData.get("id") ?? "");
  const resolved = formData.get("resolved") === "true";
  if (!id) return { ok: false, message: "어떤 오류인지 알 수 없어요." };

  const { error } = await supabase.from("app_errors").update({ resolved }).eq("id", id);
  if (error) return { ok: false, message: `바꾸지 못했어요: ${error.message}` };

  revalidatePath("/admin");
  return { ok: true, message: resolved ? "처리 완료로 표시했어요." : "다시 미처리로 돌렸어요." };
}
