import { Difficulty } from "./topics";
import { RubricScores, Tier } from "./types";

// 아이에게 맞는 글감 난이도 추천. 최근 채점된 글(최대 3편)의 4개 지표 등급 평균으로 정한다.
// 추천은 목록 순서와 "추천" 표시에만 쓰고, 다른 난이도 글감을 막지는 않는다.

const TIER_POINT: Record<Tier, number> = { 도움필요: 0, 보통: 1, 능숙: 2 };
const RECENT_COUNT = 3;

export interface DifficultyRecommendation {
  level: Difficulty;
  reason: string;
}

// scoresDesc: 최신 글부터, 채점 결과가 없는 글은 null.
export function recommendDifficulty(scoresDesc: (RubricScores | null)[]): DifficultyRecommendation {
  const recent = scoresDesc
    .filter((s): s is RubricScores => s !== null && s.confidence !== "판단하기 어려움")
    .slice(0, RECENT_COUNT);

  if (recent.length === 0) {
    return { level: "기초", reason: "처음이니 부담 없는 글감부터 시작해봐요." };
  }

  const points = recent.flatMap((s) => [s.사고력, s.논리력, s.표현력, s.구성력].map((t) => TIER_POINT[t] ?? 1));
  const avg = points.reduce((a, b) => a + b, 0) / points.length;

  if (avg >= 1.5) {
    return { level: "도전", reason: `최근 글 ${recent.length}편이 탄탄해요. 한 단계 어려운 글감에 도전해봐요.` };
  }
  if (avg >= 0.75) {
    return { level: "보통", reason: `최근 글 ${recent.length}편을 보면 이 정도 글감이 잘 맞아요.` };
  }
  return { level: "기초", reason: `최근 글 ${recent.length}편을 보면 기초 글감으로 힘을 기르면 좋겠어요.` };
}
