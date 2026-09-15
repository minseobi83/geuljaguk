import { Tier } from "@/lib/types";

const TIER_STYLE: Record<Tier, string> = {
  능숙: "bg-growth/10 text-growth border-growth/30",
  보통: "bg-accent/10 text-accent border-accent/30",
  도움필요: "bg-warn/10 text-warn border-warn/30",
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
        className={`rounded-full border px-2 py-0.5 text-xs ${TIER_STYLE[tier]}`}
        title={label}
      >
        {label ? `${label} ${tier}` : tier}
      </span>
    );
  }

  const hint = label ? INDICATOR_HINT[label] : undefined;

  return (
    <div
      className={`group relative flex flex-col items-center gap-0.5 rounded-xl border px-4 py-2 ${TIER_STYLE[tier]}`}
    >
      {label && <span className="text-xs text-ink/60">{label}</span>}
      <span className="font-heading text-base">{tier}</span>
      {hint && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-paper opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
        >
          {hint}
        </span>
      )}
    </div>
  );
}
