import { Tier } from "@/lib/types";

// 잡지 지면의 지표 박스. 등급은 굵은 산세리프, 이름표는 레터스페이싱 키커로.
const TIER_STYLE: Record<Tier, string> = {
  능숙: "border-growth text-growth",
  보통: "border-ink text-ink",
  도움필요: "border-warn text-warn",
};

// 4개 지표가 정확히 뭘 보는지 8자 이내로 요약 (보호자 대시보드 툴팁용).
const INDICATOR_HINT: Record<string, string> = {
  사고력: "생각의 깊이",
  논리력: "근거의 논리성",
  표현력: "어휘와 문장력",
  구성력: "글의 짜임새",
};

export default function TierBadge({
  label,
  tier,
  size = "md",
}: {
  label?: string;
  tier: Tier;
  size?: "md" | "sm";
}) {
  if (size === "sm") {
    return (
      <span
        className={`border px-2 py-0.5 text-[11px] font-bold tracking-tight ${TIER_STYLE[tier]}`}
        title={label}
      >
        {label ? `${label} ${tier}` : tier}
      </span>
    );
  }

  const hint = label ? INDICATOR_HINT[label] : undefined;

  return (
    <div className={`group relative border-2 px-4 py-3 ${TIER_STYLE[tier]}`}>
      {label && (
        <span className="block text-[10px] uppercase tracking-[0.25em] text-ink/45">
          {label}
        </span>
      )}
      <span className="mt-1 block text-xl font-black tracking-tight">{tier}</span>
      {hint && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          {hint}
        </span>
      )}
    </div>
  );
}
