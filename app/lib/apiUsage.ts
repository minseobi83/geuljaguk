import type { Usage } from "@anthropic-ai/sdk/resources/messages";
import type { BetaUsage } from "@anthropic-ai/sdk/resources/beta/messages/messages";

// Claude API 호출 한 번의 사용량 기록 (api_calls 테이블 한 줄). 관리자 "API 상태" 탭에서
// 스트리밍·캐시·사전 선별이 실제로 동작하는지, 비용이 얼마인지 보여주는 데 쓴다.
// 아이의 글 본문은 절대 담지 않는다 - 숫자만.

export type ApiCallKind = "quick_screen" | "evaluate" | "rubric_suggest" | "ocr";
export type RetryReason = "truncated" | "guardrail";
export type ScreenResult = "valid" | "invalid" | "error";

export interface ApiCallRecord {
  kind: ApiCallKind;
  model: string;
  attempt: number;
  retryReason: RetryReason | null;
  inputTokens: number;
  cacheWriteTokens: number;
  cacheWrite1hTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  stopReason: string | null;
  durationMs: number;
  streamedEvents: number | null;
  screenResult: ScreenResult | null;
  costUsd: number | null;
}

// 1M 토큰당 달러 (Anthropic 1차 API 정가, 2026-06 기준). 목록에 없는 모델은 비용을 비워둔다.
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

// 캐시 배율: 읽기 0.1배, 쓰기는 5분 캐시 1.25배 / 1시간 캐시 2배.
export function estimateCostUsd(
  model: string,
  t: Pick<
    ApiCallRecord,
    "inputTokens" | "cacheWriteTokens" | "cacheWrite1hTokens" | "cacheReadTokens" | "outputTokens"
  >
): number | null {
  const price = PRICES[model];
  if (!price) return null;
  const write5m = Math.max(0, t.cacheWriteTokens - t.cacheWrite1hTokens);
  const inputSide =
    t.inputTokens +
    t.cacheReadTokens * 0.1 +
    write5m * 1.25 +
    t.cacheWrite1hTokens * 2;
  return (inputSide * price.input + t.outputTokens * price.output) / 1_000_000;
}

export function buildCallRecord(opts: {
  kind: ApiCallKind;
  model: string;
  usage: Usage | BetaUsage;
  stopReason: string | null;
  startedAt: number;
  attempt?: number;
  retryReason?: RetryReason | null;
  streamedEvents?: number | null;
  screenResult?: ScreenResult | null;
}): ApiCallRecord {
  const u = opts.usage;
  const tokens = {
    inputTokens: u.input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
    cacheWrite1hTokens: u.cache_creation?.ephemeral_1h_input_tokens ?? 0,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
  };
  return {
    kind: opts.kind,
    model: opts.model,
    attempt: opts.attempt ?? 1,
    retryReason: opts.retryReason ?? null,
    ...tokens,
    stopReason: opts.stopReason,
    durationMs: Date.now() - opts.startedAt,
    streamedEvents: opts.streamedEvents ?? null,
    screenResult: opts.screenResult ?? null,
    costUsd: estimateCostUsd(opts.model, tokens),
  };
}
