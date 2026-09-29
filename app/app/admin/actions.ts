"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  AdminChildDetail,
  AuditAction,
  getChildDetail,
  isAdmin,
} from "@/lib/supabase/adminQueries";
import { GradeBand, WritingType } from "@/lib/types";
import { DIFFICULTIES, Difficulty } from "@/lib/topics";
import { getActiveSystemPrompt } from "@/lib/supabase/promptQueries";
import { getReviewDigest } from "@/lib/supabase/qualityQueries";
import { RubricSuggestError, suggestRubricRevision } from "@/lib/anthropic";
import { logApiCalls } from "@/lib/apiUsageLog";
import { RubricSuggestion, isApplicable } from "@/lib/rubricChanges";
import { MANUAL_REPORT_ACTION } from "@/lib/supabase/moderationQueries";

// 관리자 화면의 쓰기 동작들. RLS 정책(topics_admin_*, prompt_versions_admin_*)이 DB에서
// 한 번 더 막아주지만, 액션 진입 시점에도 관리자인지 확인해서 의미 있는 메시지를 돌려준다.

export interface ActionResult {
  ok: boolean;
  message: string;
}

const ALL_GRADES: GradeBand[] = ["4", "5", "6"];

function readDifficulty(formData: FormData): Difficulty {
  const raw = String(formData.get("difficulty") ?? "");
  return DIFFICULTIES.includes(raw as Difficulty) ? (raw as Difficulty) : "보통";
}

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
    difficulty: readDifficulty(formData),
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
      difficulty: readDifficulty(formData),
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

// ---------------------------------------------------------------------------
// 부적절한 콘텐츠 처리 (관리자 4차분)
// ---------------------------------------------------------------------------

const MODERATION_STATUS_VALUES = ["미확인", "확인 중", "조치 완료", "문제 없음"] as const;

// 처리 기록은 고쳐 쓰지 않고 한 줄씩 쌓는다 - 가장 최근 줄이 그 글의 현재 상태.
export async function recordModerationAction(formData: FormData): Promise<ActionResult> {
  const { supabase, userId, ok } = await requireAdmin();
  if (!ok || !userId) return { ok: false, message: "관리자만 콘텐츠를 처리할 수 있어요." };

  const versionId = String(formData.get("version_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const actionTaken = String(formData.get("action_taken") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!versionId) return { ok: false, message: "어떤 글인지 알 수 없어요." };
  if (!MODERATION_STATUS_VALUES.includes(status as (typeof MODERATION_STATUS_VALUES)[number])) {
    return { ok: false, message: "처리 상태를 골라주세요." };
  }
  if (status === "조치 완료" && !actionTaken) {
    return { ok: false, message: "어떤 조치를 했는지 골라주세요." };
  }
  // 닫는 판단(조치 완료 / 문제 없음)과 다시 여는 판단은 나중에 이유를 알 수 있어야 한다.
  if (status !== "확인 중" && !note) {
    return { ok: false, message: "판단한 이유나 한 일을 메모로 남겨주세요." };
  }

  const { error } = await supabase.from("content_flag_actions").insert({
    essay_version_id: versionId,
    status,
    action_taken: status === "조치 완료" ? actionTaken : null,
    note: note || null,
    actor_id: userId,
  });

  if (error) return { ok: false, message: `저장하지 못했어요: ${error.message}` };

  revalidatePath("/admin");
  return { ok: true, message: `'${status}'(으)로 기록했어요.` };
}

// ---------------------------------------------------------------------------
// 학생별 학습 데이터 관리 (관리자 5차분)
// ---------------------------------------------------------------------------

const NICKNAME_MAX = 20;

type AdminSupabase = Awaited<ReturnType<typeof createClient>>;

async function writeAudit(
  supabase: AdminSupabase,
  actorId: string,
  action: AuditAction,
  childId: string,
  detail: Record<string, unknown>
): Promise<string | null> {
  const { error } = await supabase
    .from("admin_audit_log")
    .insert({ action, child_id: childId, detail, actor_id: actorId });
  return error ? error.message : null;
}

// 삭제·수정 뒤 보호자·학생 화면에도 바로 반영되도록.
function revalidateStudentPages() {
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/growth");
}

export async function loadStudentDetail(
  childId: string
): Promise<{ detail: AdminChildDetail | null; error: string | null }> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { detail: null, error: "관리자만 학생 데이터를 볼 수 있어요." };
  return getChildDetail(supabase, childId);
}

// 보호자의 열람 요청 등에 쓰는 내보내기. 누가 언제 내려받았는지 먼저 기록하고, 기록을 남길 수
// 없으면 내보내지 않는다.
export async function exportStudentData(
  childId: string
): Promise<ActionResult & { detail?: AdminChildDetail }> {
  const { supabase, userId, ok } = await requireAdmin();
  if (!ok || !userId) return { ok: false, message: "관리자만 데이터를 내보낼 수 있어요." };

  const { detail, error } = await getChildDetail(supabase, childId);
  if (!detail) return { ok: false, message: error ?? "학생을 찾을 수 없어요." };

  const auditError = await writeAudit(supabase, userId, "데이터 내보내기", childId, {
    nickname: detail.nickname,
    essayCount: detail.essays.length,
  });
  if (auditError) {
    return { ok: false, message: `관리 기록을 남길 수 없어 내보내지 않았어요: ${auditError}` };
  }

  revalidatePath("/admin");
  return { ok: true, message: `${detail.nickname} 학생의 데이터를 내보냈어요.`, detail };
}

export async function updateStudentProfile(formData: FormData): Promise<ActionResult> {
  const { supabase, userId, ok } = await requireAdmin();
  if (!ok || !userId) return { ok: false, message: "관리자만 학생 정보를 고칠 수 있어요." };

  const childId = String(formData.get("child_id") ?? "");
  const nickname = String(formData.get("nickname") ?? "").trim();
  const gradeBand = String(formData.get("grade_band") ?? "") as GradeBand;

  if (!childId) return { ok: false, message: "어떤 학생인지 알 수 없어요." };
  if (!nickname) return { ok: false, message: "별명을 비울 수 없어요." };
  if (nickname.length > NICKNAME_MAX) {
    return { ok: false, message: `별명은 ${NICKNAME_MAX}자 이내로 적어주세요.` };
  }
  if (!ALL_GRADES.includes(gradeBand)) return { ok: false, message: "학년을 골라주세요." };

  const { data: before } = await supabase
    .from("children")
    .select("nickname, grade_band")
    .eq("id", childId)
    .maybeSingle();
  if (!before) return { ok: false, message: "학생을 찾을 수 없어요." };
  if (before.nickname === nickname && before.grade_band === gradeBand) {
    return { ok: false, message: "바뀐 내용이 없어요." };
  }

  // RLS에 막히면 에러 없이 0행이 바뀌므로, 바뀐 행을 돌려받아 확인한다.
  const { data: updated, error } = await supabase
    .from("children")
    .update({ nickname, grade_band: gradeBand })
    .eq("id", childId)
    .select("id");
  if (error) return { ok: false, message: `고치지 못했어요: ${error.message}` };
  if (!updated || updated.length === 0) {
    return {
      ok: false,
      message: "고치지 못했어요. schema.sql(관리자 5차분)을 실행했는지 확인해주세요.",
    };
  }

  const auditError = await writeAudit(supabase, userId, "학생 정보 수정", childId, {
    before: { nickname: before.nickname, gradeBand: before.grade_band },
    after: { nickname, gradeBand },
  });

  revalidateStudentPages();
  return {
    ok: true,
    message: auditError
      ? `고쳤지만 관리 기록은 남기지 못했어요: ${auditError}`
      : `${nickname} (${gradeBand}학년)으로 고쳤어요.`,
  };
}

export async function deleteStudentEssay(formData: FormData): Promise<ActionResult> {
  const { supabase, userId, ok } = await requireAdmin();
  if (!ok || !userId) return { ok: false, message: "관리자만 글을 삭제할 수 있어요." };

  const essayId = String(formData.get("essay_id") ?? "");
  if (!essayId) return { ok: false, message: "어떤 글인지 알 수 없어요." };

  const { data: essay } = await supabase
    .from("essays")
    .select("id, child_id, writing_type, topic_title, created_at, essay_versions(id)")
    .eq("id", essayId)
    .maybeSingle();
  if (!essay) return { ok: false, message: "글을 찾을 수 없어요. 이미 삭제됐을 수 있어요." };

  // 지운 뒤에는 되돌릴 수 없으니, 기록을 먼저 남기고 남길 수 없으면 지우지 않는다.
  const auditError = await writeAudit(supabase, userId, "글 삭제", essay.child_id, {
    essayId,
    topicTitle: essay.topic_title,
    writingType: essay.writing_type,
    writtenAt: essay.created_at,
    versionCount: essay.essay_versions?.length ?? 0,
  });
  if (auditError) {
    return { ok: false, message: `관리 기록을 남길 수 없어 삭제하지 않았어요: ${auditError}` };
  }

  const { data: deleted, error } = await supabase
    .from("essays")
    .delete()
    .eq("id", essayId)
    .select("id");
  if (error) return { ok: false, message: `삭제하지 못했어요: ${error.message}` };
  if (!deleted || deleted.length === 0) {
    return {
      ok: false,
      message: "삭제하지 못했어요. schema.sql(관리자 5차분)을 실행했는지 확인해주세요.",
    };
  }

  revalidateStudentPages();
  return { ok: true, message: `'${essay.topic_title ?? essay.writing_type}' 글을 삭제했어요.` };
}

// 학생과 그 학생의 글·첨삭·답변·검토 기록을 모두 지운다. 실수를 막기 위해 별명을 똑같이
// 입력해야 한다.
export async function deleteStudent(formData: FormData): Promise<ActionResult> {
  const { supabase, userId, ok } = await requireAdmin();
  if (!ok || !userId) return { ok: false, message: "관리자만 학생을 삭제할 수 있어요." };

  const childId = String(formData.get("child_id") ?? "");
  const confirmNickname = String(formData.get("confirm_nickname") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!childId) return { ok: false, message: "어떤 학생인지 알 수 없어요." };
  if (!reason) return { ok: false, message: "삭제하는 이유를 적어주세요 (예: 보호자 삭제 요청)." };

  const { data: child } = await supabase
    .from("children")
    .select("id, parent_id, nickname, grade_band, created_at, essays(id)")
    .eq("id", childId)
    .maybeSingle();
  if (!child) return { ok: false, message: "학생을 찾을 수 없어요. 이미 삭제됐을 수 있어요." };
  if (confirmNickname !== child.nickname) {
    return { ok: false, message: "확인용 별명이 일치하지 않아요." };
  }

  const auditError = await writeAudit(supabase, userId, "학생 삭제", childId, {
    nickname: child.nickname,
    gradeBand: child.grade_band,
    parentId: child.parent_id,
    joinedAt: child.created_at,
    essayCount: child.essays?.length ?? 0,
    reason,
  });
  if (auditError) {
    return { ok: false, message: `관리 기록을 남길 수 없어 삭제하지 않았어요: ${auditError}` };
  }

  const { data: deleted, error } = await supabase
    .from("children")
    .delete()
    .eq("id", childId)
    .select("id");
  if (error) return { ok: false, message: `삭제하지 못했어요: ${error.message}` };
  if (!deleted || deleted.length === 0) {
    return {
      ok: false,
      message: "삭제하지 못했어요. schema.sql(관리자 5차분)을 실행했는지 확인해주세요.",
    };
  }

  revalidateStudentPages();
  return { ok: true, message: `${child.nickname} 학생과 모든 학습 데이터를 삭제했어요.` };
}

// ---------------------------------------------------------------------------
// 평가기준 반자동 개선 (관리자 6차분)
// ---------------------------------------------------------------------------

// 개선안을 만들려면 지금 기준으로 채점한 첨삭 중 '아쉬움'·'부적절' 검토가 이만큼은 있어야 한다.
const MIN_NEGATIVE_REVIEWS = 3;

export interface RubricSuggestResult extends ActionResult {
  suggestion?: RubricSuggestion & { applicable: boolean[] };
  basePrompt?: string;
  baseLabel?: string;
  reviewCounts?: { 적절: number; 아쉬움: number; 부적절: number };
}

// Claude가 검토를 읽고 "찾아 바꾸기" 수정안을 만든다. 저장·활성화는 하지 않는다 - 관리자가
// 변경을 하나씩 골라 새 버전으로 저장하고, 활성화는 따로 결정한다.
export async function suggestRubricImprovement(): Promise<RubricSuggestResult> {
  const { supabase, userId, ok } = await requireAdmin();
  if (!ok || !userId) return { ok: false, message: "관리자만 개선안을 만들 수 있어요." };

  const active = await getActiveSystemPrompt(supabase);
  const { digest, error } = await getReviewDigest(supabase, active.id);
  if (!digest) return { ok: false, message: `검토 기록을 읽지 못했어요: ${error}` };

  const baseLabel = active.label ?? "코드 기본값";
  if (digest.items.length < MIN_NEGATIVE_REVIEWS) {
    return {
      ok: false,
      message: `'${baseLabel}' 기준의 '아쉬움'·'부적절' 검토가 ${digest.items.length}건뿐이에요. ${MIN_NEGATIVE_REVIEWS}건 이상 쌓이면 개선안을 만들 수 있어요.`,
    };
  }

  try {
    const { suggestion, call } = await suggestRubricRevision(active.prompt, digest);
    await logApiCalls(supabase, [call], { userId, promptVersionId: active.id });
    return {
      ok: true,
      message:
        suggestion.changes.length > 0
          ? `검토 ${digest.items.length}건을 바탕으로 변경 ${suggestion.changes.length}개를 제안했어요. 아래에서 골라 새 버전으로 저장하세요.`
          : "검토를 읽었지만 지금은 고칠 만한 반복 패턴이 없다고 판단했어요.",
      suggestion: {
        ...suggestion,
        applicable: suggestion.changes.map((c) => isApplicable(active.prompt, c)),
      },
      basePrompt: active.prompt,
      baseLabel,
      reviewCounts: digest.counts,
    };
  } catch (e) {
    const message =
      e instanceof RubricSuggestError
        ? e.message
        : `개선안을 만들지 못했어요: ${e instanceof Error ? e.message : String(e)}`;
    return { ok: false, message };
  }
}

// ---------------------------------------------------------------------------
// 관리자 직접 신고 (2026-09-29)
// ---------------------------------------------------------------------------

// AI가 표시하지 않은 글이라도 관리자가 보기에 확인이 필요하면 콘텐츠 관리로 올린다.
// 처리 기록에 '미확인' + '관리자 신고' 한 줄을 남기는 것으로 신고가 된다.
export async function reportContent(formData: FormData): Promise<ActionResult> {
  const { supabase, userId, ok } = await requireAdmin();
  if (!ok || !userId) return { ok: false, message: "관리자만 신고할 수 있어요." };

  const versionId = String(formData.get("version_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!versionId) return { ok: false, message: "어떤 글인지 알 수 없어요." };
  if (!reason) return { ok: false, message: "신고하는 이유를 적어주세요." };

  const { error } = await supabase.from("content_flag_actions").insert({
    essay_version_id: versionId,
    status: "미확인",
    action_taken: MANUAL_REPORT_ACTION,
    note: reason,
    actor_id: userId,
  });
  if (error) return { ok: false, message: `신고하지 못했어요: ${error.message}` };

  revalidatePath("/admin");
  return { ok: true, message: "콘텐츠 관리로 신고했어요. 콘텐츠 관리 탭에서 이어서 처리하세요." };
}
