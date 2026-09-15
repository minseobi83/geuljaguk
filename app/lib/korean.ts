// 한글 음절의 받침(종성) 유무를 판별해서 "이가/가" 같은 조사를 올바르게 붙인다.
// 예: "주원" (받침 ㄴ) -> "주원이가", "하나" (받침 없음) -> "하나가"
function hasBatchim(char: string): boolean {
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false; // 한글 음절 범위가 아니면 판별 불가
  return (code - 0xac00) % 28 !== 0;
}

export function withYiGa(name: string): string {
  if (!name) return name;
  const last = name[name.length - 1];
  return hasBatchim(last) ? `${name}이가` : `${name}가`;
}
