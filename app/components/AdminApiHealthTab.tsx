"use client";

import { ApiCallKind } from "@/lib/apiUsage";
import { ApiHealth, CheckStatus } from "@/lib/supabase/apiUsageQueries";
import { EmptyNotice, SectionLabel, formatDateTime } from "./AdminQualityTabs";

// 관리자 6차분(2026-09-28): "API 상태" 탭 - 배포 후 스트리밍·캐시·사전 선별이 실제로
// 동작하는지와 비용을 Vercel 로그를 뒤지지 않고 여기서 확인한다.

const KIND_LABELS: Record<ApiCallKind, string> = {
  evaluate: "본분석(첨삭)",
  quick_screen: "사전 선별",
  rubric_suggest: "평가기준 개선안",
};

const STATUS_STYLE: Record<CheckStatus, { label: string; className: string }> = {
  ok: { label: "정상", className: "border-growth text-growth" },
  warn: { label: "확인 필요", className: "border-warn bg-warn text-white" },
  nodata: { label: "기록 부족", className: "border-ink/25 text-ink/50" },
};

function usd(n: number | null): string {
  if (n === null) return "-";
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

function seconds(ms: number | null): string {
  return ms === null ? "-" : `${(ms / 1000).toFixed(1)}초`;
}

export default function ApiHealthTab({
  health,
  error,
}: {
  health: ApiHealth | null;
  error: string | null;
}) {
  if (error || !health) {
    return (
      <EmptyNotice
        title="API 호출 기록을 읽지 못했어요"
        body={`아직 schema.sql(관리자 6차분)을 실행하지 않았을 수 있어요. 실행한 뒤 첨삭이 한 번 이상 들어오면 여기에 기록이 쌓여요. (${error ?? "알 수 없음"})`}
      />
    );
  }

  return (
    <>
      <section className="mt-8">
        <SectionLabel>Checks · 최근 {health.days}일 동작 확인</SectionLabel>
        <ul className="mt-2">
          {health.checks.map((c) => (
            <li key={c.id} className="border-b border-ink/15 py-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <span
                  className={`border px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[c.status].className}`}
                >
                  {STATUS_STYLE[c.status].label}
                </span>
                <span className="text-base font-bold tracking-tight text-ink">{c.title}</span>
              </div>
              <p className="mt-2 break-keep text-sm leading-6 text-ink/65">{c.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <SectionLabel>Cost · 최근 {health.days}일 사용량</SectionLabel>
        <div className="mt-4 grid grid-cols-2 gap-px bg-ink/15 sm:grid-cols-4">
          <div className="bg-white p-5 text-center">
            <p className="text-3xl font-black tracking-tight text-ink">{usd(health.totalCostUsd)}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink/45">추정 비용 합계</p>
          </div>
          {health.kinds.map((k) => (
            <div key={k.kind} className="bg-white p-5 text-center">
              <p className="text-3xl font-black tracking-tight text-ink">{k.calls}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink/45">
                {KIND_LABELS[k.kind]}
              </p>
              <p className="mt-1 font-mono text-[11px] text-ink/45">
                {usd(k.costUsd)} · 평균 {seconds(k.avgDurationMs)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 break-keep text-xs leading-6 text-ink/45">
          비용은 정가 기준 추정치예요 (캐시 읽기 0.1배, 캐시 쓰기 1.25~2배 반영). 재시도: 응답 잘림{" "}
          {health.retries.truncated}건, 가드레일 {health.retries.guardrail}건.
        </p>
      </section>

      <section className="mt-12">
        <SectionLabel>Log · 최근 호출 20건</SectionLabel>
        {health.recent.length === 0 ? (
          <p className="mt-4 text-sm text-ink/50">아직 기록된 호출이 없어요.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left font-mono text-[11px] text-ink/70">
              <thead className="text-ink/45">
                <tr className="border-b border-ink/20">
                  <th className="py-2 pr-3 font-normal">시각</th>
                  <th className="py-2 pr-3 font-normal">종류</th>
                  <th className="py-2 pr-3 font-normal">입력</th>
                  <th className="py-2 pr-3 font-normal">캐시 쓰기/읽기</th>
                  <th className="py-2 pr-3 font-normal">출력</th>
                  <th className="py-2 pr-3 font-normal">시간</th>
                  <th className="py-2 pr-3 font-normal">비용</th>
                </tr>
              </thead>
              <tbody>
                {health.recent.map((r, i) => (
                  <tr key={i} className="border-b border-ink/10">
                    <td className="py-2 pr-3">{formatDateTime(r.createdAt)}</td>
                    <td className="py-2 pr-3">
                      {KIND_LABELS[r.kind]}
                      {r.versionNo && r.versionNo > 1 ? ` · ${r.versionNo}번째 글` : ""}
                      {r.retryReason ? ` · 재시도(${r.retryReason === "truncated" ? "잘림" : "가드레일"})` : ""}
                      {r.screenResult ? ` · ${r.screenResult}` : ""}
                    </td>
                    <td className="py-2 pr-3">{r.inputTokens}</td>
                    <td className="py-2 pr-3">
                      {r.cacheWriteTokens} / {r.cacheReadTokens}
                    </td>
                    <td className="py-2 pr-3">{r.outputTokens}</td>
                    <td className="py-2 pr-3">{seconds(r.durationMs)}</td>
                    <td className="py-2 pr-3">{usd(r.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
