"use client";

import { useState } from "react";
import TierBadge from "./TierBadge";
import IndicatorTrends from "./IndicatorTrends";
import { formatDateShort } from "@/lib/format";
import { EssayHistoryItem } from "@/lib/supabase/queries";
import { RubricScores } from "@/lib/types";

type ScoredItem = EssayHistoryItem & { scores: RubricScores };

interface Props {
  summary: string;
  latestScores: RubricScores | null;
  scoredAsc: ScoredItem[];
  historyDesc: EssayHistoryItem[];
}

type TabId = "recent" | "trend" | "essays";

export default function GrowthTabs({
  summary,
  latestScores,
  scoredAsc,
  historyDesc,
}: Props) {
  const [tab, setTab] = useState<TabId>("recent");

  const tabs: { id: TabId; label: string }[] = [
    { id: "recent", label: "최근 변화" },
    { id: "trend", label: "지표별 변화 흐름" },
    { id: "essays", label: "그동안 쓴 글" },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-8 border-b-2 border-ink text-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-0.5 pb-3 transition ${
              tab === t.id ? "border-b-4 border-ink font-black text-ink" : "text-ink/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "recent" && (
        <div>
          <section>
            <p className="bg-ink px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-white">
              Overview · 최근 변화
            </p>
            <p className="mt-4 break-keep leading-8 text-ink/80">{summary}</p>
          </section>

          {latestScores && (
            <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-2xl">
              <TierBadge label="사고력" tier={latestScores.사고력} />
              <TierBadge label="논리력" tier={latestScores.논리력} />
              <TierBadge label="표현력" tier={latestScores.표현력} />
              <TierBadge label="구성력" tier={latestScores.구성력} />
            </section>
          )}
        </div>
      )}

      {tab === "trend" && (
        <section>
          <p className="mb-6 text-[10px] uppercase tracking-[0.25em] text-ink/45">
            같은 글의 종류끼리만 비교해요 (왼쪽이 예전 글, 오른쪽이 가장 최근 글)
          </p>
          {scoredAsc.length > 0 ? (
            <IndicatorTrends items={scoredAsc} />
          ) : (
            <p className="text-sm text-ink/50">
              아직 채점된 글이 없어요. 글을 써보면 여기에 흐름이 쌓여요.
            </p>
          )}
        </section>
      )}

      {tab === "essays" && (
        <section>
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45">
            {historyDesc.length}편
          </p>
          {historyDesc.length === 0 ? (
            <p className="text-sm text-ink/50">아직 쓴 글이 없어요.</p>
          ) : (
            <ul className="grid gap-x-10 lg:grid-cols-2">
              {historyDesc.map((essay) => (
                <li key={essay.id} className="border-b border-ink/15 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="break-keep text-base font-bold tracking-tight text-ink">
                      {essay.topicTitle ?? essay.writingType}
                    </p>
                    <span className="shrink-0 font-mono text-xs text-ink/40">
                      {formatDateShort(essay.createdAt)}
                    </span>
                  </div>
                  {essay.summary && (
                    <p className="mt-1 break-keep text-sm leading-6 text-ink/55">
                      {essay.summary}
                    </p>
                  )}
                  {essay.scores && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <TierBadge label="사고력" tier={essay.scores.사고력} size="sm" />
                      <TierBadge label="논리력" tier={essay.scores.논리력} size="sm" />
                      <TierBadge label="표현력" tier={essay.scores.표현력} size="sm" />
                      <TierBadge label="구성력" tier={essay.scores.구성력} size="sm" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
