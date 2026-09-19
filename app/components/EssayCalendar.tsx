"use client";

import { useMemo, useState } from "react";
import TierBadge from "./TierBadge";
import HighlightedEssayText from "./HighlightedEssayText";
import { formatDateShort } from "@/lib/format";
import { EssayHistoryItem } from "@/lib/supabase/queries";

interface Props {
  historyDesc: EssayHistoryItem[];
  // 대시보드는 "글자국 총평", 성장 기록은 "선생님 총평"이라고 부르므로 호출부에서 맞춰 전달한다.
  summaryLabel?: string;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 로컬 날짜 기준으로 묶는다 (formatDateShort과 같은 기준).
function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function EssayCalendar({ historyDesc, summaryLabel = "글자국 총평" }: Props) {
  const essaysByDate = useMemo(() => {
    const map = new Map<string, EssayHistoryItem[]>();
    for (const essay of historyDesc) {
      const key = dateKey(essay.createdAt);
      const list = map.get(key);
      if (list) list.push(essay);
      else map.set(key, [essay]);
    }
    return map;
  }, [historyDesc]);

  // 처음 열었을 때 빈 달이 보이지 않도록, 가장 최근 글이 있는 달부터 보여준다.
  const [viewMonth, setViewMonth] = useState(() => {
    const base = historyDesc[0]?.createdAt ? new Date(historyDesc[0].createdAt) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthEssayCount = Array.from(essaysByDate.entries())
    .filter(([key]) => {
      const [y, m] = key.split("-").map(Number);
      return y === year && m === month;
    })
    .reduce((sum, [, list]) => sum + list.length, 0);

  const selectedEssays = selectedKey ? essaysByDate.get(selectedKey) ?? [] : [];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            className="flex h-7 w-7 items-center justify-center border border-ink/20 text-ink/60 transition hover:border-ink hover:text-ink"
          >
            ‹
          </button>
          <p className="font-mono text-sm font-bold tracking-tight text-ink">
            {year}년 {month + 1}월
          </p>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            className="flex h-7 w-7 items-center justify-center border border-ink/20 text-ink/60 transition hover:border-ink hover:text-ink"
          >
            ›
          </button>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/40">
          이번 달 {monthEssayCount}번 첨삭
        </p>
      </div>

      <div className="mt-4 grid grid-cols-7 border-l border-t border-ink/15">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="border-b border-r border-ink/15 bg-ink/[0.03] py-1.5 text-center text-[10px] uppercase tracking-[0.15em] text-ink/45"
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={i} className="border-b border-r border-ink/15" />;
          }
          const key = `${year}-${month}-${day}`;
          const essaysToday = essaysByDate.get(key) ?? [];
          return (
            <div
              key={i}
              className="flex min-h-[4rem] flex-col items-center gap-1 border-b border-r border-ink/15 p-1.5 sm:min-h-[5rem]"
            >
              <span className="self-start text-[11px] text-ink/45">{day}</span>
              {essaysToday.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  aria-label={`${month + 1}월 ${day}일 첨삭 ${essaysToday.length}건 보기`}
                  className="group flex flex-1 items-center justify-center"
                >
                  <span className="flex h-8 w-8 -rotate-12 items-center justify-center rounded-full border-2 border-accent text-[8px] font-black leading-none tracking-tight text-accent transition group-hover:scale-110 group-hover:bg-accent group-hover:text-white sm:h-9 sm:w-9 sm:text-[9px]">
                    글자국
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selectedKey && selectedEssays.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={() => setSelectedKey(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto border-2 border-ink bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-ink pb-3">
              <p className="font-mono text-sm font-bold tracking-tight text-ink">
                {formatDateShort(selectedEssays[0].createdAt)} 첨삭
              </p>
              <button
                type="button"
                onClick={() => setSelectedKey(null)}
                aria-label="닫기"
                className="flex h-7 w-7 items-center justify-center border border-ink/30 text-ink/60 transition hover:border-ink hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-8">
              {selectedEssays.map((essay) => (
                <div key={essay.id}>
                  <p className="break-keep text-base font-bold tracking-tight text-ink">
                    {essay.topicTitle ?? essay.writingType}
                  </p>

                  {essay.latestText ? (
                    <HighlightedEssayText
                      text={essay.latestText}
                      mechanicsTable={essay.mechanicsTable}
                      className="mt-3 whitespace-pre-wrap break-keep border-l-2 border-ink/20 pl-3 font-heading text-[15px] leading-8 text-ink/85"
                    />
                  ) : (
                    <p className="mt-3 text-sm text-ink/40">글 내용을 불러오지 못했어요.</p>
                  )}

                  {essay.summary && (
                    <p className="mt-3 break-keep text-xs leading-6 text-ink/45">
                      <span className="mr-1 font-bold uppercase tracking-[0.15em] text-ink/35">
                        {summaryLabel}
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
