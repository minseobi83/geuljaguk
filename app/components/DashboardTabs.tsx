"use client";

import { useMemo, useState } from "react";
import TierBadge from "./TierBadge";
import IndicatorTrends from "./IndicatorTrends";
import HighlightedEssayText from "./HighlightedEssayText";
import { formatDateShort } from "@/lib/format";
import { withYiGa } from "@/lib/korean";
import {
  buildDashboardRecommendation,
  buildEngagementSummary,
  computeEngagementStats,
  computeRepeatedIssues,
} from "@/lib/growth";
import { EssayHistoryItem } from "@/lib/supabase/queries";
import { RubricScores } from "@/lib/types";

type ScoredItem = EssayHistoryItem & { scores: RubricScores };

interface Props {
  nickname: string;
  summary: string;
  latestDate: string | null;
  latestScores: RubricScores | null;
  scoredAsc: ScoredItem[];
  historyDesc: EssayHistoryItem[];
}

type TabId = "recent" | "trend" | "essays";

function SectionTag({ en, ko }: { en: string; ko: string }) {
  return (
    <p className="bg-ink px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-white">
      {en} · {ko}
    </p>
  );
}

export default function DashboardTabs({
  nickname,
  summary,
  latestDate,
  latestScores,
  scoredAsc,
  historyDesc,
}: Props) {
  const [tab, setTab] = useState<TabId>("recent");
  // 글이 길면 접어두고, 누르면 전체를 펼친다.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const flaggedEssays = historyDesc.filter((e) => e.safetyNote);

  const repeatedIssues = useMemo(() => computeRepeatedIssues(historyDesc), [historyDesc]);
  const engagementStats = useMemo(() => computeEngagementStats(historyDesc), [historyDesc]);
  const engagementSummary = useMemo(
    () => buildEngagementSummary(engagementStats, nickname),
    [engagementStats, nickname]
  );
  const recommendation = useMemo(
    () => buildDashboardRecommendation(repeatedIssues, historyDesc[0]?.nextTaskSkill ?? null),
    [repeatedIssues, historyDesc]
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: "recent", label: "최근 변화" },
    { id: "trend", label: "지표별 변화 흐름" },
    { id: "essays", label: `${withYiGa(nickname)} 쓴 글` },
  ];

  return (
    <div>
      {flaggedEssays.length > 0 && (
        <section className="mb-8 border-l-4 border-warn bg-warn/5 px-4 py-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-warn">
            Notice · 확인해 주세요
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {flaggedEssays.map((e) => (
              <li key={e.id} className="break-keep text-sm leading-6 text-ink/75">
                <span className="font-mono text-xs text-ink/45">
                  {formatDateShort(e.createdAt)}
                </span>{" "}
                {e.safetyNote}
              </li>
            ))}
          </ul>
        </section>
      )}

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
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
          <div>
            <section>
              <div className="flex items-baseline justify-between gap-2">
                <SectionTag en="Overview" ko={`${nickname}의 최근 변화`} />
                {latestDate && (
                  <span className="shrink-0 font-mono text-[11px] text-ink/40">
                    {formatDateShort(latestDate)}
                  </span>
                )}
              </div>
              <p className="mt-4 break-keep leading-8 text-ink/80">{summary}</p>
            </section>

            {latestScores && (
              <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                <TierBadge label="사고력" tier={latestScores.사고력} />
                <TierBadge label="논리력" tier={latestScores.논리력} />
                <TierBadge label="표현력" tier={latestScores.표현력} />
                <TierBadge label="구성력" tier={latestScores.구성력} />
              </section>
            )}
          </div>

          <div>
            <section>
              <SectionTag en="Engagement" ko="학습 성실도 · 수정 참여도" />
              <p className="mt-4 break-keep leading-8 text-ink/80">{engagementSummary}</p>
            </section>

            {repeatedIssues.length > 0 && (
              <section className="mt-8">
                <SectionTag en="Patterns" ko="자주 반복되는 부분" />
                <ul className="mt-4 flex flex-col gap-3">
                  {repeatedIssues.map((issue) => (
                    <li key={issue.category} className="border-l-2 border-warn pl-3">
                      <span className="border border-warn px-3 py-1 text-xs font-bold text-warn">
                        {issue.category} · {issue.count}번
                      </span>
                      <p className="mt-1.5 break-keep text-xs leading-5 text-ink/60">
                        {issue.guide}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {recommendation && (
              <section className="mt-8 bg-ink p-6 text-white">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                  Next · 다음 학습 추천
                </p>
                <p className="mt-4 break-keep leading-7">{recommendation}</p>
              </section>
            )}
          </div>
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
            <p className="text-sm text-ink/50">아직 채점된 글이 없어요.</p>
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
              {historyDesc.map((essay) => {
                const expanded = expandedId === essay.id;
                const text = essay.latestText;
                const isLong = Boolean(text && text.length > 160);
                return (
                  <li key={essay.id} className="border-b border-ink/15 py-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="flex items-center gap-2 break-keep text-base font-bold tracking-tight text-ink">
                        {essay.topicTitle ?? essay.writingType}
                        {essay.safetyNote && (
                          <span
                            title={essay.safetyNote}
                            className="h-1.5 w-1.5 shrink-0 bg-warn"
                          />
                        )}
                      </p>
                      <span className="shrink-0 font-mono text-xs text-ink/40">
                        {formatDateShort(essay.createdAt)}
                      </span>
                    </div>

                    {/* 아이가 실제로 쓴 글 - 고쳐볼 표현은 글쓰기 화면과 같은 방식으로 강조 표시 */}
                    {text ? (
                      <>
                        <HighlightedEssayText
                          text={text}
                          mechanicsTable={essay.mechanicsTable}
                          className={`mt-3 whitespace-pre-wrap break-keep border-l-2 border-ink/20 pl-3 font-heading text-[15px] leading-8 text-ink/85 ${
                            expanded ? "" : "line-clamp-4"
                          }`}
                        />
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : essay.id)}
                            className="mt-2 text-[10px] uppercase tracking-[0.2em] text-ink/45 underline underline-offset-4"
                          >
                            {expanded ? "접기" : "전체 보기"}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-ink/40">글 내용을 불러오지 못했어요.</p>
                    )}

                    {essay.summary && (
                      <p className="mt-3 break-keep text-xs leading-6 text-ink/45">
                        <span className="mr-1 font-bold uppercase tracking-[0.15em] text-ink/35">
                          글자국 총평
                        </span>
                        {essay.summary}
                      </p>
                    )}

                    {essay.scores && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <TierBadge label="사고력" tier={essay.scores.사고력} size="sm" />
                        <TierBadge label="논리력" tier={essay.scores.논리력} size="sm" />
                        <TierBadge label="표현력" tier={essay.scores.표현력} size="sm" />
                        <TierBadge label="구성력" tier={essay.scores.구성력} size="sm" />
                        {essay.scores.confidence === "판단하기 어려움" && (
                          <span className="border border-ink/20 px-2 py-0.5 text-[11px] text-ink/50">
                            판단 보류
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
