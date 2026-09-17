// 첨삭 문장에서 "잘한 점"과 "보완이 필요한 점"을 어투로 갈라낸다.
// AI가 따로 표시해주는 값이 아니라 문장 어투로 판단하는 휴리스틱이라, 애매하면
// 보완이 아닌 쪽(=평범한 문장)으로 둔다. 잘한 점을 굵게 표시해서 혼동시키는 것보다
// 놓치는 쪽이 안전하기 때문.

const IMPROVEMENT_PATTERNS: RegExp[] = [
  // 전환 접속사로 시작하는 문장 (다만 ~, 하지만 ~, 아직 ~)
  /^(다만|하지만|그런데|그렇지만|아직|대신|한 가지|한가지)/,
  // 부족함을 직접 가리키는 말
  /(아쉬|부족|빠져|누락|보완|필요해|필요하|약해|약하)/,
  // 하지 않았다는 서술
  /(나오지\s*않|들어가지\s*않|쓰지\s*않|드러나지\s*않|않아서|않았|못했|없어서|없이)/,
  // 제안·권유형 종결 (~면 좋겠어요, ~해보자, ~볼까요, ~어떨까)
  /(면\s*좋겠|면\s*더\s*좋|해보면|써보면|적어보면|볼까요|해보자|써보자|어떨까|채워|덧붙)/,
];

export interface ToneSegment {
  text: string;
  improvement: boolean;
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isImprovementSentence(sentence: string): boolean {
  return IMPROVEMENT_PATTERNS.some((re) => re.test(sentence));
}

// 문장 단위로 잘라서 각각 "보완 요구" 여부를 붙여 돌려준다.
export function splitByTone(text: string): ToneSegment[] {
  return splitSentences(text).map((sentence) => ({
    text: sentence,
    improvement: isImprovementSentence(sentence),
  }));
}
