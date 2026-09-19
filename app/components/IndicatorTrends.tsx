"use client";

import { useState } from "react";
import { formatDateShort } from "@/lib/format";
import { trendDirection } from "@/lib/growth";
import { RubricScores, Tier, WritingType } from "@/lib/types";

interface ScoredItem {
  id: string;
  writingType: WritingType;
  createdAt: string;
  scores: RubricScores;
}

const INDICATORS = ["사고력", "논리력", "표현력", "구성력"] as const;
type Indicator = (typeof INDICATORS)[number];

const INDICATOR_HINT: Record<Indicator, string> = {
  사고력: "생각의 깊이",
  논리력: "근거의 논리성",
  표현력: "어휘와 문장력",
  구성력: "글의 짜임새",
};

// 채점 등급은 3단계뿐이라 세로축도 세 칸이다. 위로 갈수록 좋은 쪽.
const TIER_RANK: Record<Tier, number> = { 도움필요: 1, 보통: 2, 능숙: 3 };
const TIER_COLOR: Record<Tier, string> = {
  능숙: "#3F7A5C", // growth
  보통: "#1F2933", // ink
  도움필요: "#9C6A26", // warn
};
const LEVELS: Tier[] = ["능숙", "보통", "도움필요"];

// 차트 좌표계. 실제 픽셀이 아니라 viewBox 단위라, 패널 폭이 달라져도 비율이 유지된다.
const W = 320;
const H = 136;
const PAD_L = 54; // 세로축 등급 이름이 들어갈 자리
const PAD_R = 14;
const PAD_T = 16;
const PAD_B = 26; // 가로축 날짜가 들어갈 자리
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function yFor(tier: Tier): number {
  // 능숙(3) → 맨 위, 도움필요(1) → 맨 아래
  return PAD_T + ((3 - TIER_RANK[tier]) / 2) * PLOT_H;
}

function xFor(index: number, total: number): number {
  if (total <= 1) return PAD_L + PLOT_W / 2;
  return PAD_L + (index * PLOT_W) / (total - 1);
}

export default function IndicatorTrends({ items }: { items: ScoredItem[] }) {
  const categories = Array.from(new Set(items.map((h) => h.writingType)));
  const [selected, setSelected] = useState<WritingType>(categories[0]);

  const filtered = items.filter((h) => h.writingType === selected);

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <label
          className="text-[10px] uppercase tracking-[0.3em] text-ink/45"
          htmlFor="category-select"
        >
          Genre · 글의 종류
        </label>
        <select
          id="category-select"
          className="border-b-2 border-ink bg-transparent pb-1 text-sm font-bold outline-none"
          value={selected}
          onChange={(e) => setSelected(e.target.value as WritingType)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="ml-1 font-mono text-[11px] text-ink/40">{filtered.length}편</span>
      </div>

      {filtered.length === 1 && (
        <p className="mb-5 break-keep text-xs leading-6 text-ink/45">
          이 종류로 쓴 글이 아직 한 편이라 변화를 그릴 수 없어요. 같은 종류로 한 편 더
          쓰면 선이 이어져요.
        </p>
      )}

      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {INDICATORS.map((indicator) => (
          <IndicatorChart key={indicator} indicator={indicator} items={filtered} />
        ))}
      </div>

      <Legend />
    </div>
  );
}

function IndicatorChart({
  indicator,
  items,
}: {
  indicator: Indicator;
  items: ScoredItem[];
}) {
  const tiers = items.map((h) => h.scores[indicator]);
  const points = tiers.map((tier, i) => ({
    x: xFor(i, tiers.length),
    y: yFor(tier),
    tier,
    date: items[i].createdAt,
  }));
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");

  // 성장 요약 문장과 같은 기준으로 판단한다 (가장 최근 글 vs 그 이전 글들의 최빈 등급).
  // 한 편 삐끗한 것 때문에 "내려갔어요"가 뜨지 않도록.
  const direction = trendDirection(tiers);

  return (
    <figure>
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="flex items-baseline gap-2">
          <span className="text-base font-black tracking-tight text-ink">{indicator}</span>
          <span className="text-[11px] text-ink/40">{INDICATOR_HINT[indicator]}</span>
        </span>
        <TrendMark direction={direction} />
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${indicator} 변화: ${points
          .map((p) => `${formatDateShort(p.date)} ${p.tier}`)
          .join(", ")}`}
      >
        {/* 등급 기준선 3개 */}
        {LEVELS.map((tier) => (
          <g key={tier}>
            <line
              x1={PAD_L}
              y1={yFor(tier)}
              x2={W - PAD_R}
              y2={yFor(tier)}
              stroke="#1F2933"
              strokeOpacity={tier === "보통" ? 0.1 : 0.14}
              strokeWidth={1}
              strokeDasharray={tier === "보통" ? "3 3" : undefined}
            />
            <text
              x={PAD_L - 10}
              y={yFor(tier) + 3.5}
              textAnchor="end"
              fontSize={10}
              fill="#1F2933"
              fillOpacity={0.45}
            >
              {tier}
            </text>
          </g>
        ))}

        {points.length > 1 && (
          <polyline
            points={line}
            fill="none"
            stroke="#1F2933"
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isLast ? 5.5 : 4}
                fill={isLast ? TIER_COLOR[p.tier] : "#FFFFFF"}
                stroke={TIER_COLOR[p.tier]}
                strokeWidth={2}
              >
                <title>{`${formatDateShort(p.date)} · ${p.tier}`}</title>
              </circle>
            </g>
          );
        })}

        {/* 가로축은 처음과 끝 날짜만 (점마다 붙이면 좁은 폭에서 겹친다) */}
        {points.length > 0 && (
          <text
            x={PAD_L}
            y={H - 8}
            textAnchor="start"
            fontSize={10}
            fill="#1F2933"
            fillOpacity={0.4}
            fontFamily="monospace"
          >
            {formatDateShort(points[0].date)}
          </text>
        )}
        {points.length > 1 && (
          <text
            x={W - PAD_R}
            y={H - 8}
            textAnchor="end"
            fontSize={10}
            fill="#1F2933"
            fillOpacity={0.4}
            fontFamily="monospace"
          >
            {formatDateShort(points[points.length - 1].date)}
          </text>
        )}
      </svg>
    </figure>
  );
}

function TrendMark({ direction }: { direction: "up" | "flat" | "down" }) {
  if (direction === "up") {
    return (
      <span className="shrink-0 bg-growth px-2 py-0.5 text-[11px] font-bold text-white">
        ↑ 올라갔어요
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span className="shrink-0 border border-warn px-2 py-0.5 text-[11px] font-bold text-warn">
        ↓ 내려갔어요
      </span>
    );
  }
  return (
    <span className="shrink-0 border border-ink/20 px-2 py-0.5 text-[11px] text-ink/50">
      → 그대로예요
    </span>
  );
}

function Legend() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink/15 pt-4">
      {LEVELS.map((tier) => (
        <span key={tier} className="flex items-center gap-1.5 text-[11px] text-ink/55">
          <svg width="12" height="12" aria-hidden="true">
            <circle
              cx="6"
              cy="6"
              r="4"
              fill="#FFFFFF"
              stroke={TIER_COLOR[tier]}
              strokeWidth="2"
            />
          </svg>
          {tier}
        </span>
      ))}
      <span className="text-[11px] text-ink/45">
        가장 최근 글은 색이 꽉 찬 큰 점으로 표시해요.
      </span>
    </div>
  );
}
