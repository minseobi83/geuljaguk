import { SupabaseClient } from "@supabase/supabase-js";
import { ApiCallRecord } from "./apiUsage";

// API 호출 사용량을 api_calls 테이블에 남긴다 (관리자 콘솔 "API 상태" 탭에서 확인).
// best-effort: 기록이 실패해도(테이블이 아직 없음 등) 절대 예외를 던지지 않는다 - 사용량 기록
// 때문에 학생이 피드백을 못 받는 일이 있어서는 안 된다.
export async function logApiCalls(
  supabase: SupabaseClient,
  calls: ApiCallRecord[],
  ctx: { userId: string; promptVersionId?: string | null; versionNo?: number | null }
): Promise<void> {
  if (calls.length === 0) return;
  try {
    const { error } = await supabase.from("api_calls").insert(
      calls.map((c) => ({
        kind: c.kind,
        model: c.model,
        attempt: c.attempt,
        retry_reason: c.retryReason,
        version_no: ctx.versionNo ?? null,
        input_tokens: c.inputTokens,
        cache_write_tokens: c.cacheWriteTokens,
        cache_write_1h_tokens: c.cacheWrite1hTokens,
        cache_read_tokens: c.cacheReadTokens,
        output_tokens: c.outputTokens,
        stop_reason: c.stopReason,
        duration_ms: c.durationMs,
        streamed_events: c.streamedEvents,
        screen_result: c.screenResult,
        cost_usd: c.costUsd,
        user_id: ctx.userId,
        prompt_version_id: ctx.promptVersionId ?? null,
      }))
    );
    if (error) console.error("[apiUsageLog] 사용량 기록 실패:", error.message);
  } catch (e) {
    console.error("[apiUsageLog] 사용량 기록 실패:", e);
  }
}
