"use client";

import { useState } from "react";
import TierBadge from "./TierBadge";
import { formatDateShort } from "@/lib/format";
import { RubricScores, WritingType } from "@/lib/types";

interface ScoredItem {
  id: string;
  writingType: WritingType;
  createdAt: string;
  scores: RubricScores;
}

const INDICATORS = ["사고력", "논리력", "표현력", "구성력"] as const;

// 등급 뱃지(능숙/보통/도움필요) 색과 헷갈리지 않도록, 지표 이름표는 전혀 다른 색 계열을 쓴다.
const INDICATOR_STYLE: Record<(typeof INDICATORS)[number], string> = {
  사고력: "bg-ink text-white",
  논리력: "bg-ink text-white",
  표현력: "bg-ink text-white",
  구성력: "bg-ink text-white",
};

export default function IndicatorTrends({ items }: { items: ScoredItem[] }) {
  const categories = Array.from(new Set(items.map((h) => h.writingType)));
  const [selected, setSelected] = useState<WritingType>(categories[0]);

  const filtered = items.filter((h) => h.writingType === selected);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <label
          className="text-[10px] uppercase tracking-[0.3em] text-ink/45"
          htmlFor="category-select"
        >
          Genre · 글의 종류
        </label>
        <select
          id="category-select"
          className="border-b-2 border-ink bg-transparent pb-1 text-sm font-bold outline-none"
          value={selected}
          onChange={(e) => setSelected(e.target.value as WritingType)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {INDICATORS.map((indicator) => (
          <div key={indicator} className="flex items-center gap-2">
            <span
              className={`w-16 shrink-0 px-2 py-1 text-center text-[11px] font-bold tracking-tight ${INDICATOR_STYLE[indicator]}`}
            >
              {indicator}
            </span>
            <div className="flex flex-wrap gap-2">
              {filtered.map((h) => (
                <div key={h.id} className="flex flex-col items-center gap-0.5">
                  <span className="font-mono text-[10px] text-ink/40">
                    {formatDateShort(h.createdAt)}
                  </span>
                  <TierBadge tier={h.scores[indicator]} size="sm" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
