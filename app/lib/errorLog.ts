import { SupabaseClient } from "@supabase/supabase-js";

// 서버 오류를 app_errors 테이블에 남긴다 (관리자 콘솔 "오류" 탭에서 확인).
//
// best-effort: 기록 자체가 실패해도(테이블이 아직 없음, 네트워크 오류 등) 절대 예외를 던지지
// 않는다 - 오류 기록 때문에 학생이 피드백을 못 받는 일이 있어서는 안 된다.
// 아이의 글 본문은 개인정보라 넘기지 말 것 - 길이 같은 메타 정보만 meta에 담는다.

import { ErrorStage } from "@/lib/supabase/qualityQueries";

export type { ErrorStage };

export interface ErrorContext {
  userId: string;
  childId?: string | null;
  promptVersionId?: string | null;
  meta?: Record<string, unknown>;
}

export function describeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (typeof err === "object" && err !== null) {
    // Supabase(PostgREST) 오류는 Error 인스턴스가 아니라 { message, code, ... } 객체다.
    const o = err as { message?: unknown; code?: unknown };
    if (typeof o.message === "string") {
      return typeof o.code === "string" ? `[${o.code}] ${o.message}` : o.message;
    }
  }
  return String(err);
}

export async function logError(
  supabase: SupabaseClient,
  stage: ErrorStage,
  err: unknown,
  ctx: ErrorContext
): Promise<void> {
  const message = describeError(err).slice(0, 2000);
  console.error(`[${stage}]`, err);
  try {
    const { error } = await supabase.from("app_errors").insert({
      stage,
      message,
      user_id: ctx.userId,
      child_id: ctx.childId ?? null,
      prompt_version_id: ctx.promptVersionId ?? null,
      meta: ctx.meta ?? {},
    });
    if (error) console.error("[errorLog] 오류 기록 실패:", error.message);
  } catch (e) {
    console.error("[errorLog] 오류 기록 실패:", e);
  }
}
