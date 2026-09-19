import { RubricScores, Tier } from "./types";
import { EssayHistoryItem } from "./supabase/queries";
import { withYiGa } from "./korean";

const TIER_RANK: Record<Tier, number> = { 도움필요: 1, 보통: 2, 능숙: 3 };
const INDICATORS = ["사고력", "논리력", "표현력", "구성력"] as const;

export interface IndicatorTrend {
  indicator: (typeof INDICATORS)[number];
  earliest: Tier;
  latest: Tier;
  direction: "up" | "flat" | "down";
}

function modeTier(tiers: Tier[]): Tier {
  const counts: Record<Tier, number> = { 도움필요: 0, 보통: 0, 능숙: 0 };
  for (const t of tiers) counts[t]++;
  // 동점이면 더 자주 등장한 쪽이 없다는 뜻이니, 그 중 가장 최근에 가까운(배열 뒤쪽) 등급을 우선한다.
  let best: Tier = tiers[tiers.length - 1];
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (counts[tiers[i]] >= counts[best]) best = tiers[i];
  }
  return best;
}

// 채점 기준이 3단계뿐이라 아주 정밀한 그래프는 못 그리지만, "좋아지고 있는지"는 보여줄 수 있다.
// 맨 처음 글 vs 맨 최근 글만 비교하면 한쪽 끝에 우연히 낀 글 하나 때문에 흐름이 왜곡될 수 있어서,
// "최근 글"은 마지막 글 그대로, "그동안"은 마지막 글을 뺀 나머지 중 가장 많이 나온 등급(최빈값)과
// 비교한다. 그래야 "요즘 실제로 달라졌는지"가 한 번의 기복에 덜 흔들린다.
//
// 차트의 지표별 화살표도 이 함수를 쓴다 - 화면에 나란히 놓인 요약 문장과 화살표가 서로 다른
// 말을 하면 안 되기 때문.
export function trendDirection(tiersInChronoOrder: Tier[]): IndicatorTrend["direction"] {
  if (tiersInChronoOrder.length < 2) return "flat";
  const latest = tiersInChronoOrder[tiersInChronoOrder.length - 1];
  const earlier = modeTier(tiersInChronoOrder.slice(0, -1));
  const diff = TIER_RANK[latest] - TIER_RANK[earlier];
  return diff > 0 ? "up" : diff < 0 ? "down" : "flat";
}

export function computeIndicatorTrends(
  scoresInChronoOrder: RubricScores[]
): IndicatorTrend[] | null {
  if (scoresInChronoOrder.length < 2) return null;
  const latestScores = scoresInChronoOrder[scoresInChronoOrder.length - 1];
  const earlierScores = scoresInChronoOrder.slice(0, -1);

  return INDICATORS.map((indicator) => {
    const tiers = scoresInChronoOrder.map((s) => s[indicator]);
    return {
      indicator,
      earliest: modeTier(earlierScores.map((s) => s[indicator])),
      latest: latestScores[indicator],
      direction: trendDirection(tiers),
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

// --- 반복되는 문제 패턴 ---

export interface RepeatedIssue {
  category: string;
  count: number;
  guide: string;
}

// normalizeCategory가 묶어주는 다섯 갈래별로, 부모가 집에서 바로 시도해볼 수 있는
// 1~2줄짜리 개선 방법. 특정 글의 내용을 언급하지 않는 일반적인 조언이라 어떤 글에도 안전하게 쓸 수 있다.
const REPEATED_ISSUE_GUIDES: Record<string, string> = {
  "주제·중심 생각":
    "쓰기 전에 '이 글에서 하고 싶은 말 한 문장'을 먼저 정하게 해주세요. 그 문장에서 벗어나는 내용은 빼는 연습이 도움이 돼요.",
  "글의 구조":
    "처음(상황)-가운데(자세히)-끝(내 생각) 세 부분으로 먼저 나눠보고 쓰기 시작하면 흐름이 잡혀요.",
  "근거·구체성":
    "'왜냐하면' 뒤에 이유나 예시를 한 가지 더 붙여 쓰도록 연습해보세요.",
  "표현력":
    "같은 낱말을 반복하지 말고, 비슷한 뜻의 다른 표현으로 바꿔 써보게 해주세요.",
  "맞춤법·띄어쓰기":
    "다 쓴 뒤 소리 내어 읽으면서 띄어 쓴 부분과 받침을 한 번 더 확인하는 습관을 들여보세요.",
};
const DEFAULT_ISSUE_GUIDE = "다음 글을 쓸 때 이 부분을 조금 더 신경 써보면 좋아요.";

// AI가 priority_issue.category를 매번 자유 텍스트로 쓰기 때문에("구조" vs "글의 구조" 등)
// 그대로 집계하면 같은 문제인데도 다른 항목으로 흩어질 수 있다. 그래서 지침(writing_feedback.md
// 6단계 우선순위)에 있는 다섯 갈래로 정규화한 다음 집계한다.
function normalizeCategory(raw: string): string {
  if (/주제|중심\s*생각/.test(raw)) return "주제·중심 생각";
  if (/구조|구성|문단/.test(raw)) return "글의 구조";
  if (/근거|구체|논리/.test(raw)) return "근거·구체성";
  if (/표현|어휘|문장/.test(raw)) return "표현력";
  if (/맞춤법|띄어쓰기|문법/.test(raw)) return "맞춤법·띄어쓰기";
  return raw;
}

// 최근 글들에서 우선 개선점으로 반복해서 지적된 항목을 찾는다 (최소 2번 이상 나온 것만
// "반복"이라고 부른다). 최근 글에 더 무게를 두기 위해 정렬은 유지하되 집계는 전체를 본다.
export function computeRepeatedIssues(
  history: Pick<EssayHistoryItem, "priorityCategory">[]
): RepeatedIssue[] {
  const counts = new Map<string, number>();
  for (const h of history) {
    if (!h.priorityCategory) continue;
    const key = normalizeCategory(h.priorityCategory);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({
      category,
      count,
      guide: REPEATED_ISSUE_GUIDES[category] ?? DEFAULT_ISSUE_GUIDE,
    }))
    .filter((c) => c.count >= 2)
    .sort((a, b) => b.count - a.count);
}

// --- 학습 성실도 · 수정 참여도 ---

export interface EngagementStats {
  totalEssays: number;
  revisedEssays: number; // 한 번 이상 스스로 다시 써본 글의 수
  revisedRate: number; // 0~1
  last7Days: number;
  last30Days: number;
}

export function computeEngagementStats(
  history: Pick<EssayHistoryItem, "createdAt" | "versionCount">[]
): EngagementStats {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const totalEssays = history.length;
  const revisedEssays = history.filter((h) => h.versionCount >= 2).length;
  const last7Days = history.filter((h) => now - new Date(h.createdAt).getTime() <= 7 * DAY).length;
  const last30Days = history.filter(
    (h) => now - new Date(h.createdAt).getTime() <= 30 * DAY
  ).length;

  return {
    totalEssays,
    revisedEssays,
    revisedRate: totalEssays > 0 ? revisedEssays / totalEssays : 0,
    last7Days,
    last30Days,
  };
}

export function buildEngagementSummary(stats: EngagementStats, nickname: string): string {
  if (stats.totalEssays === 0) {
    return `${withYiGa(nickname)} 아직 쓴 글이 없어요.`;
  }
  const parts = [
    `최근 30일 동안 ${withYiGa(nickname)} 글을 ${stats.last30Days}편 썼어요.`,
  ];
  if (stats.revisedEssays > 0) {
    parts.push(
      `그중 ${stats.revisedEssays}편(${Math.round(
        stats.revisedRate * 100
      )}%)은 피드백을 보고 스스로 다시 고쳐 썼어요.`
    );
  } else {
    parts.push(`아직 다시 고쳐 쓴 글은 없어요 - 피드백을 보고 한 번 더 도전해보면 더 좋아요.`);
  }
  return parts.join(" ");
}

// --- 대시보드 차원의 다음 학습 추천 ---

export function buildDashboardRecommendation(
  repeatedIssues: RepeatedIssue[],
  latestNextTaskSkill: string | null
): string | null {
  if (repeatedIssues.length > 0) {
    const top = repeatedIssues[0];
    return `최근 글들에서 "${top.category}" 부분이 ${top.count}번 반복해서 나왔어요. 다음엔 이 부분에 초점을 맞춘 과제를 함께 해보면 좋아요.`;
  }
  if (latestNextTaskSkill) {
    return `가장 최근 글에서는 "${latestNextTaskSkill}" 연습을 추천했어요. 다음 글에서 한 번 시도해보면 좋겠어요.`;
  }
  return null;
}
