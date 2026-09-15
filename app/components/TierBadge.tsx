import { Tier } from "@/lib/types";

const TIER_STYLE: Record<Tier, string> = {
  능숙: "bg-growth/10 text-growth border-growth/30",
  보통: "bg-accent/10 text-accent border-accent/30",
  도움필요: "bg-warn/10 text-warn border-warn/30",
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

  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-xl border px-4 py-3 ${TIER_STYLE[tier]}`}
    >
      {label && <span className="text-xs text-ink/60">{label}</span>}
      <span className="font-heading text-lg">{tier}</span>
    </div>
  );
}
