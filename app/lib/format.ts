// "26.09.15" 형식 (연도 뒤 2자리.월.일) - 보호자 대시보드 전체에서 통일해서 쓴다.
export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}
