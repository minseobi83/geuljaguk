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
  사고력: "bg-violet-50 text-violet-700 border-violet-200",
  논리력: "bg-teal-50 text-teal-700 border-teal-200",
  표현력: "bg-rose-50 text-rose-700 border-rose-200",
  구성력: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export default function IndicatorTrends({ items }: { items: ScoredItem[] }) {
  const categories = Array.from(new Set(items.map((h) => h.writingType)));
  const [selected, setSelected] = useState<WritingType>(categories[0]);

  const filtered = items.filter((h) => h.writingType === selected);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-ink/60" htmlFor="category-select">
          글의 종류
        </label>
        <select
          id="category-select"
          className="rounded-md border border-ink/20 bg-white px-2 py-1 text-sm"
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
              className={`w-16 shrink-0 rounded-full border px-2 py-1 text-center text-xs font-medium ${INDICATOR_STYLE[indicator]}`}
            >
              {indicator}
            </span>
            <div className="flex flex-wrap gap-2">
              {filtered.map((h) => (
                <div key={h.id} className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-ink/40">
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
