// 평가기준 반자동 개선: Claude가 제안한 "찾아 바꾸기" 목록을 현재 프롬프트에 적용한다.
// 서버(제안 검증)와 브라우저(관리자가 고른 변경만 미리보기) 양쪽에서 쓰는 순수 함수.

export interface RubricChange {
  issue: string; // 어떤 검토 문제를 고치려는지
  rationale: string; // 왜 이렇게 고치는지
  find: string; // 현재 프롬프트에서 바꿀 원문 (빈 문자열이면 맨 끝에 덧붙임)
  replace: string; // 바꿀 내용
}

export interface RubricSuggestion {
  summary: string;
  caution: string;
  changes: RubricChange[];
}

// 원문이 프롬프트에 정확히 한 번 있어야 안전하게 바꿀 수 있다.
export function isApplicable(base: string, change: RubricChange): boolean {
  if (change.find === "") return true;
  const first = base.indexOf(change.find);
  return first !== -1 && base.indexOf(change.find, first + 1) === -1;
}

export function applyRubricChanges(base: string, changes: RubricChange[]): string {
  let text = base;
  for (const c of changes) {
    if (c.find === "") {
      text = `${text.trimEnd()}\n\n${c.replace}`;
    } else if (text.includes(c.find)) {
      text = text.replace(c.find, () => c.replace);
    }
  }
  return text;
}
