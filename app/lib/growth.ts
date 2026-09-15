import { RubricScores, Tier } from "./types";

const TIER_RANK: Record<Tier, number> = { 도움필요: 1, 보통: 2, 능숙: 3 };
const INDICATORS = ["사고력", "논리력", "표현력", "구성력"] as const;

export interface IndicatorTrend {
  indicator: (typeof INDICATORS)[number];
  earliest: Tier;
  latest: Tier;
  direction: "up" | "flat" | "down";
}

// 채점 기준이 3단계뿐이라 아주 정밀한 그래프는 못 그리지만, "좋아지고 있는지"는 보여줄 수 있다.
// 가장 오래된 글과 가장 최근 글의 등급을 비교한다 (지침 원칙: 비교는 그 아이 자신과만).
export function computeIndicatorTrends(
  scoresInChronoOrder: RubricScores[]
): IndicatorTrend[] | null {
  if (scoresInChronoOrder.length < 2) return null;
  const first = scoresInChronoOrder[0];
  const last = scoresInChronoOrder[scoresInChronoOrder.length - 1];

  return INDICATORS.map((indicator) => {
    const earliest = first[indicator];
    const latest = last[indicator];
    const diff = TIER_RANK[latest] - TIER_RANK[earliest];
    return {
      indicator,
      earliest,
      latest,
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
    };
  });
}

export function buildGrowthSummary(
  trends: IndicatorTrend[] | null,
  scoredEssayCount: number,
  nickname: string
): string {
  if (!trends) {
    return `아직 채점된 글이 ${scoredEssayCount}편이라 ${nickname}의 성장 흐름을 보여주기엔 조금 더 필요해요. 몇 편 더 쓰면 변화가 보일 거예요.`;
  }

  const improved = trends.filter((t) => t.direction === "up").map((t) => t.indicator);
  const steady = trends.filter((t) => t.direction === "flat").map((t) => t.indicator);
  const watch = trends.filter((t) => t.direction === "down").map((t) => t.indicator);

  const parts: string[] = [];
  if (improved.length > 0) {
    parts.push(`${nickname}의 ${improved.join("·")} 영역이 이전보다 좋아지고 있어요.`);
  }
  if (steady.length > 0) {
    parts.push(`${steady.join("·")} 영역은 꾸준히 유지되고 있어요.`);
  }
  if (watch.length > 0) {
    parts.push(`${watch.join("·")} 영역은 최근 글에서 조금 흔들렸어요. 함께 다시 살펴봐 주시면 좋겠어요.`);
  }
  return parts.join(" ");
}
