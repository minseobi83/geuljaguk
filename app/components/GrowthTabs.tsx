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
      <div className="mb-6 flex gap-1 rounded-full border border-ink/15 bg-white p-1 text-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-full py-1.5 ${
              tab === t.id ? "bg-accent text-white" : "text-ink/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "recent" && (
        <div>
          <section className="rounded-xl border border-ink/10 bg-white p-5">
            <p className="leading-7 text-ink/80">{summary}</p>
          </section>

          {latestScores && (
            <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <p className="mb-4 text-xs text-ink/40">
            같은 글의 종류끼리만 비교해요 (왼쪽이 예전 글, 오른쪽이 가장 최근 글).
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
          <p className="mb-3 text-sm text-ink/50">{historyDesc.length}편</p>
          {historyDesc.length === 0 ? (
            <p className="text-sm text-ink/50">아직 쓴 글이 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {historyDesc.map((essay) => (
                <li
                  key={essay.id}
                  className="rounded-lg border border-ink/10 bg-white p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {essay.topicTitle ?? essay.writingType}
                    </p>
                    <span className="text-xs text-ink/40">
                      {formatDateShort(essay.createdAt)}
                    </span>
                  </div>
                  {essay.summary && (
                    <p className="mt-1 text-ink/60">{essay.summary}</p>
                  )}
                  {essay.scores && (
                    <div className="mt-2 flex flex-wrap gap-1">
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
