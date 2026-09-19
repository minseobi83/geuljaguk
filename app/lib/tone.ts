// 첨삭 문장에서 "잘한 점"과 "보완이 필요한 점"을 어투로 갈라낸다.
// AI가 따로 표시해주는 값이 아니라 문장 어투로 판단하는 휴리스틱이라, 애매하면
// 보완이 아닌 쪽(=평범한 문장)으로 둔다. 잘한 점을 굵게 표시해 혼동시키는 것보다
// 놓치는 쪽이 안전하기 때문.

// 제안·권유형: "~면 좋겠어요", "~해볼까요", "~덧붙여 보자", "~면 더 단단해질 거예요"
const SUGGESTION =
  /(면\s*좋겠|면\s*더\s*좋|해보면|써보면|적어보면|덧붙여|채워|늘려보|볼까요|해보자|써보자|어떨까|한\s*문장\s*더|(?:으면|면)\s+[^.!?]{0,20}?(?:좋|나아지|단단|분명해|또렷해))/;

// 부족함을 직접 가리키는 말
const LACK =
  /(아쉬|부족|빠져|누락|보완|필요해|필요하|약해|약하|모호|헷갈|어려운|어렵|반복이|너무\s*길|급하게|흐지부지)/;

// "~하지 않았다" 류의 서술
const NEGATIVE_FACT =
  /(나오지\s*않|들어가지\s*않|쓰지\s*않|드러나지\s*않|않아서|않았|못했|없어서|없이|끝났|그쳤|머물)/;

// 문장을 뒤집는 전환. 문장 첫머리의 전환어, 그리고 쉼표가 붙은 "~지만,"만 인정한다.
// ("짧지만 분명한 문장이라 좋았어요"처럼 쉼표 없는 ~지만은 칭찬일 때가 많아 제외)
const TURN_START = /^(다만|하지만|그런데|그렇지만|아직|대신|한\s?가지|아쉬운\s*점)/;
const TURN_MID = /지만,/;
const TURN_WEAK = /지만\s/;

// 칭찬 표현 (전환어가 없다면 보완으로 보지 않는다)
const PRAISE =
  /(좋았|좋아요|훌륭|인상적|인상\s*깊|돋보|잘\s?썼|잘했|칭찬|생생|또렷|편했|쉬웠|자연스러|재미있|눈에\s*그려|느껴졌|살아났|설득력\s*있)/;

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
  // 제안·권유형 종결은 거의 언제나 "이렇게 해보자"는 뜻이라 바로 보완으로 본다.
  if (SUGGESTION.test(sentence)) return true;

  const lacks = LACK.test(sentence) || NEGATIVE_FACT.test(sentence);
  const praise = PRAISE.test(sentence);

  // 문장 첫머리 전환어나 "~지만,"은 뒤에 보완이 따라오므로 칭찬이 섞여 있어도 보완으로 본다.
  if (TURN_START.test(sentence) || TURN_MID.test(sentence)) return true;

  // 쉼표 없는 "~지만"은 부족함을 가리키는 말이 함께 있을 때만.
  if (TURN_WEAK.test(sentence) && lacks) return true;

  // 칭찬이 섞이지 않은 결핍 서술
  if (lacks && !praise) return true;

  return false;
}

// 문장 단위로 잘라서 각각 "보완 요구" 여부를 붙여 돌려준다.
export function splitByTone(text: string): ToneSegment[] {
  return splitSentences(text).map((sentence) => ({
    text: sentence,
    improvement: isImprovementSentence(sentence),
  }));
}
