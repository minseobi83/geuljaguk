// "글자국 총평" 한 칸. 아이가 쓴 글 바로 아래에 붙는 경우가 많아서, 글과 헷갈리지 않도록
// 옅은 음영 영역으로 감싸고 글씨는 충분히 진하게 둔다. 쓴 글 히스토리·첨삭 캘린더·관리자 화면이
// 모두 이 모양을 같이 쓴다.
export default function SummaryNote({
  summary,
  className = "mt-3",
}: {
  summary: string;
  className?: string;
}) {
  return (
    <div className={`${className} border-l-4 border-ink/50 bg-ink/[0.05] px-3 py-2.5`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink">글자국 총평</p>
      <p className="mt-1 break-keep text-sm leading-7 text-ink/85">{summary}</p>
    </div>
  );
}
