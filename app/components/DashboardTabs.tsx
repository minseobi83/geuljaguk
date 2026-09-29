"use client";

import { useMemo, useState } from "react";
import TierBadge from "./TierBadge";
import IndicatorTrends from "./IndicatorTrends";
import HighlightedEssayText from "./HighlightedEssayText";
import EssayCalendar from "./EssayCalendar";
import SavedAnswerList from "./SavedAnswerList";
import SummaryNote from "./SummaryNote";
import { formatDateShort } from "@/lib/format";
import { withYiGa } from "@/lib/korean";
import {
  buildDashboardRecommendation,
  buildEngagementSummary,
  computeEngagementStats,
  ENGAGEMENT_WEEKS,
  EngagementStats,
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
  // 성실도 그래프용: 최근 몇 주 동안 쓴 모든 글의 날짜 (없으면 historyDesc로 센다).
  activityDates?: string[] | null;
}

type TabId = "recent" | "trend" | "essays" | "calendar";

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
  activityDates,
}: Props) {
  const [tab, setTab] = useState<TabId>("recent");
  // 글이 길면 접어두고, 누르면 전체를 펼친다.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const flaggedEssays = historyDesc.filter((e) => e.safetyNote);

  const repeatedIssues = useMemo(() => computeRepeatedIssues(historyDesc), [historyDesc]);
  const engagementStats = useMemo(
    () => computeEngagementStats(historyDesc, new Date(), activityDates),
    [historyDesc, activityDates]
  );
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
    { id: "calendar", label: "첨삭 캘린더" },
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
              <EngagementDetail stats={engagementStats} />
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

                    {essay.summary && <SummaryNote summary={essay.summary} />}

                    <SavedAnswerList
                      answers={essay.paragraphAnswers}
                      label={`${nickname}의 생각`}
                    />

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

      {tab === "calendar" && (
        <EssayCalendar
          historyDesc={historyDesc}
          answerLabel={`${nickname}의 생각`}
        />
      )}
    </div>
  );
}

// 꾸준함을 한눈에: 최근 8주 동안 주마다 몇 편 썼는지 막대 + 세 가지 숫자.
function EngagementDetail({ stats }: { stats: EngagementStats }) {
  if (stats.totalEssays === 0) return null;
  const max = Math.max(1, ...stats.weeklyCounts);
  const pct = (r: number) => `${Math.round(r * 100)}%`;
  return (
    <div className="mt-5">
      <div className="flex h-16 items-end gap-1.5" aria-label={`최근 ${ENGAGEMENT_WEEKS}주 주별 글 수`}>
        {stats.weeklyCounts.map((c, i) => {
          const isThisWeek = i === stats.weeklyCounts.length - 1;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="font-mono text-[10px] text-ink/45">{c > 0 ? c : ""}</span>
              <div
                title={isThisWeek ? `이번 주 ${c}편` : `${stats.weeklyCounts.length - 1 - i}주 전 ${c}편`}
                className={`w-full ${c > 0 ? (isThisWeek ? "bg-accent" : "bg-ink/70") : "bg-ink/10"}`}
                style={{ height: c > 0 ? `${Math.max(12, (c / max) * 40)}px` : "4px" }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-ink/35">
        <span>{ENGAGEMENT_WEEKS - 1}주 전</span>
        <span>이번 주</span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-px bg-ink/15 text-center">
        <div className="bg-white p-3">
          <dt className="text-[10px] tracking-[0.1em] text-ink/45">글 쓴 주</dt>
          <dd className="mt-1 text-lg font-black text-ink">
            {stats.activeWeeks}/{ENGAGEMENT_WEEKS}주
          </dd>
        </div>
        <div className="bg-white p-3">
          <dt className="text-[10px] tracking-[0.1em] text-ink/45">스스로 고쳐 쓴 글</dt>
          <dd className="mt-1 text-lg font-black text-ink">{pct(stats.revisedRate)}</dd>
        </div>
        <div className="bg-white p-3">
          <dt className="text-[10px] tracking-[0.1em] text-ink/45">질문에 답한 글</dt>
          <dd className="mt-1 text-lg font-black text-ink">{pct(stats.answeredRate)}</dd>
        </div>
      </dl>
    </div>
  );
}
