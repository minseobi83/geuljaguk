import { EvaluationResult } from "./types";

// 서버 측 가드레일: AI가 mechanics_table 밖에서 학생 문장을 그대로(또는 거의 그대로)
// 베껴 썼는지 다시 한번 기계적으로 확인한다. AI의 자기 보고(guardrail_check)만 믿지 않는다.

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。다요])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8); // 너무 짧은 조각은 우연히 겹칠 수 있으니 제외
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").trim();
}

// 두 문자열의 문자 단위 유사도 (0~1). 완전 일치=1. 간단한 Levenshtein 기반 비율.
function similarity(a: string, b: string): number {
  const s1 = normalize(a);
  const s2 = normalize(b);
  if (s1.length === 0 || s2.length === 0) return 0;

  const dp: number[][] = Array.from({ length: s1.length + 1 }, () =>
    new Array(s2.length + 1).fill(0)
  );
  for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
  for (let j = 0; j <= s2.length; j++) dp[0][j] = j;
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      dp[i][j] =
        s1[i - 1] === s2[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const dist = dp[s1.length][s2.length];
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - dist / maxLen;
}

const NARRATIVE_FIELDS_THRESHOLD = 0.9;

// AI의 자체 판단(safety.concern)만 믿지 않고, 아주 명백한 신호는 서버에서도 한 번 더 잡아낸다.
// 이 목록은 일부러 좁고 명확한 표현만 담는다 (오탐이 많으면 보호자가 알림을 무시하게 되므로).
const SAFETY_KEYWORDS = [
  "죽고싶", "죽고싶다", "자살", "자해", "손목을그", "뛰어내리고싶",
  "때렸어", "맞았어", "맞고있어", "폭행", "성폭행", "성추행",
  "가정폭력", "학대당", "굶겨", "가두고", "가출하고싶",
];

export function detectSafetyKeywords(studentText: string): boolean {
  const normalized = normalize(studentText);
  return SAFETY_KEYWORDS.some((kw) => normalized.includes(kw));
}

export function detectRewrittenStudentText(
  studentText: string,
  result: EvaluationResult
): boolean {
  const originalSentences = splitSentences(studentText);
  if (originalSentences.length === 0) return false;

  const candidateSentences: string[] = [
    ...result.strengths,
    result.priority_issue?.note ?? "",
    ...result.paragraph_feedback.flatMap((p) => [p.good, p.question]),
    ...result.self_revision_questions,
    result.next_task?.prompt ?? "",
    result.summary ?? "",
  ]
    .flatMap((t) => splitSentences(t))
    .filter(Boolean);

  for (const candidate of candidateSentences) {
    for (const original of originalSentences) {
      if (similarity(candidate, original) >= NARRATIVE_FIELDS_THRESHOLD) {
        return true;
      }
    }
  }
  return false;
}
