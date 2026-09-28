import { SupabaseClient } from "@supabase/supabase-js";
import { ApiCallKind } from "@/lib/apiUsage";

// 관리자 6차분(2026-09-28): "API 상태" 탭. api_calls 기록으로 스트리밍·프롬프트 캐시·
// 사전 선별이 실제 배포에서 동작하는지 판정하고, 비용을 집계한다.

export type CheckStatus = "ok" | "warn" | "nodata";

export interface HealthCheck {
  id: "streaming" | "system_cache" | "multiturn_cache" | "quick_screen";
  title: string;
  status: CheckStatus;
  detail: string;
}

export interface KindSummary {
  kind: ApiCallKind;
  calls: number;
  costUsd: number;
  avgDurationMs: number;
}

export interface RecentCall {
  kind: ApiCallKind;
  model: string;
  attempt: number;
  retryReason: string | null;
  versionNo: number | null;
  inputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  durationMs: number | null;
  streamedEvents: number | null;
  screenResult: string | null;
  costUsd: number | null;
  createdAt: string;
}

export interface ApiHealth {
  days: number;
  checks: HealthCheck[];
  kinds: KindSummary[];
  totalCostUsd: number;
  retries: { truncated: number; guardrail: number };
  recent: RecentCall[];
}

interface Row {
  kind: ApiCallKind;
  model: string;
  attempt: number;
  retry_reason: string | null;
  version_no: number | null;
  input_tokens: number;
  cache_write_tokens: number;
  cache_read_tokens: number;
  output_tokens: number;
  duration_ms: number | null;
  streamed_events: number | null;
  screen_result: string | null;
  cost_usd: number | string | null;
  created_at: string;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export async function getApiHealth(
  supabase: SupabaseClient,
  days = 7
): Promise<{ health: ApiHealth | null; error: string | null }> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("api_calls")
    .select(
      "kind, model, attempt, retry_reason, version_no, input_tokens, cache_write_tokens, cache_read_tokens, output_tokens, duration_ms, streamed_events, screen_result, cost_usd, created_at"
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(3000);
  if (error) return { health: null, error: error.message };

  const rows = (data ?? []) as Row[];
  const evaluate = rows.filter((r) => r.kind === "evaluate");
  const firstAttempts = evaluate.filter((r) => r.attempt === 1);
  const screens = rows.filter((r) => r.kind === "quick_screen");

  const checks: HealthCheck[] = [];

  // 1. 스트리밍: 본분석 응답이 조각조각 도착했는지.
  const streamed = evaluate.filter((r) => (r.streamed_events ?? 0) > 1).length;
  checks.push({
    id: "streaming",
    title: "스트리밍 진행 표시",
    status: evaluate.length === 0 ? "nodata" : streamed === evaluate.length ? "ok" : "warn",
    detail:
      evaluate.length === 0
        ? "아직 본분석 호출이 없어요."
        : `본분석 ${evaluate.length}건 중 ${streamed}건이 조각으로 나눠 도착했어요 (평균 ${Math.round(
            avg(evaluate.map((r) => r.streamed_events ?? 0))
          )}조각).`,
  });

  // 2. 시스템 프롬프트 캐시: 첫 시도인데도 캐시에서 읽은 토큰이 있으면 1시간 캐시가 동작하는 것.
  //    (한 시간 안에 처음 부른 호출은 캐시를 "쓰기"만 하므로 100%가 될 수는 없다.)
  const cacheHits = firstAttempts.filter((r) => r.cache_read_tokens > 0).length;
  const cacheWrites = firstAttempts.filter((r) => r.cache_write_tokens > 0).length;
  checks.push({
    id: "system_cache",
    title: "평가기준(시스템 프롬프트) 캐시",
    status:
      firstAttempts.length < 2 ? "nodata" : cacheHits > 0 ? "ok" : "warn",
    detail:
      firstAttempts.length < 2
        ? "판단하려면 첫 시도 본분석이 2건 이상 필요해요."
        : `첫 시도 ${firstAttempts.length}건 중 ${cacheHits}건(${pct(
            cacheHits,
            firstAttempts.length
          )}%)이 캐시를 읽었고, ${cacheWrites}건이 캐시를 새로 만들었어요.` +
          (cacheHits === 0 ? " 한 번도 읽지 못했다면 프롬프트가 매번 달라지고 있는지 확인이 필요해요." : ""),
  });

  // 3. 고쳐 쓰기 멀티턴 캐시: 2번째 이상 시도에서 앞선 대화까지 캐시로 읽으면, 첫 시도보다
  //    캐시 읽기 토큰이 더 많아야 한다.
  const v1 = firstAttempts.filter((r) => (r.version_no ?? 1) === 1);
  const vN = firstAttempts.filter((r) => (r.version_no ?? 1) >= 2);
  const v1Read = avg(v1.map((r) => r.cache_read_tokens));
  const vNRead = avg(vN.map((r) => r.cache_read_tokens));
  checks.push({
    id: "multiturn_cache",
    title: "고쳐 쓰기 대화 캐시",
    status: vN.length === 0 || v1.length === 0 ? "nodata" : vNRead > v1Read ? "ok" : "warn",
    detail:
      vN.length === 0 || v1.length === 0
        ? "고쳐 쓴 글(2번째 이상 시도)의 본분석 기록이 아직 없어요."
        : `캐시에서 읽은 토큰 평균: 첫 시도 ${Math.round(v1Read)} → 고쳐 쓴 시도 ${Math.round(
            vNRead
          )}.` + (vNRead > v1Read ? " 앞선 대화가 캐시로 이어지고 있어요." : " 늘지 않았다면 이전 턴이 캐시와 어긋나고 있을 수 있어요."),
  });

  // 4. 사전 선별: 호출이 되고 있는지, 실패(fail-open)가 많지 않은지.
  const screenErrors = screens.filter((r) => r.screen_result === "error").length;
  const screenBlocked = screens.filter((r) => r.screen_result === "invalid").length;
  checks.push({
    id: "quick_screen",
    title: "사전 선별(quickScreen)",
    status:
      screens.length === 0 ? "nodata" : screenErrors / screens.length > 0.2 ? "warn" : "ok",
    detail:
      screens.length === 0
        ? "아직 사전 선별 호출이 없어요."
        : `${screens.length}건 중 통과 ${screens.length - screenBlocked - screenErrors}, 차단 ${screenBlocked}, 실패 ${screenErrors}` +
          (screenErrors > 0 ? " (실패해도 본분석은 그대로 진행돼요)" : "") +
          ".",
  });

  const kinds: KindSummary[] = (["evaluate", "quick_screen", "rubric_suggest"] as ApiCallKind[]).map(
    (kind) => {
      const ks = rows.filter((r) => r.kind === kind);
      return {
        kind,
        calls: ks.length,
        costUsd: ks.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0),
        avgDurationMs: avg(ks.map((r) => r.duration_ms ?? 0)),
      };
    }
  );

  return {
    health: {
      days,
      checks,
      kinds,
      totalCostUsd: kinds.reduce((s, k) => s + k.costUsd, 0),
      retries: {
        truncated: evaluate.filter((r) => r.retry_reason === "truncated").length,
        guardrail: evaluate.filter((r) => r.retry_reason === "guardrail").length,
      },
      recent: rows.slice(0, 20).map((r) => ({
        kind: r.kind,
        model: r.model,
        attempt: r.attempt,
        retryReason: r.retry_reason,
        versionNo: r.version_no,
        inputTokens: r.input_tokens,
        cacheWriteTokens: r.cache_write_tokens,
        cacheReadTokens: r.cache_read_tokens,
        outputTokens: r.output_tokens,
        durationMs: r.duration_ms,
        streamedEvents: r.streamed_events,
        screenResult: r.screen_result,
        costUsd: r.cost_usd === null ? null : Number(r.cost_usd),
        createdAt: r.created_at,
      })),
    },
    error: null,
  };
}
