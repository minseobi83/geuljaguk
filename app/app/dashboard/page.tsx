import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChildEssayHistory, EssayHistoryItem } from "@/lib/supabase/queries";
import { computeIndicatorTrends, buildGrowthSummary } from "@/lib/growth";
import { formatDateShort } from "@/lib/format";
import TierBadge from "@/components/TierBadge";
import IndicatorTrends from "@/components/IndicatorTrends";
import { ChildProfile, RubricScores } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/login");

  const { data: parent } = await supabase
    .from("parents")
    .select("consent_given_at")
    .eq("id", user.id)
    .single();

  const { data: children } = await supabase
    .from("children")
    .select("id, nickname, grade_band")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true });

  if (!parent?.consent_given_at || !children || children.length === 0) {
    redirect("/onboarding");
  }

  const typedChildren = children as ChildProfile[];
  const { child: requestedChildId } = await searchParams;
  const activeChild =
    typedChildren.find((c) => c.id === requestedChildId) ?? typedChildren[0];

  // 최신 글이 맨 앞에 오도록 가져온 다음, 추이 계산·타임라인 표시용으로 오래된 순으로 뒤집는다.
  const historyDesc = await getChildEssayHistory(supabase, activeChild.id, 20);
  const historyAsc = [...historyDesc].reverse();
  const scoredAsc = historyAsc.filter((h) => h.scores !== null) as (EssayHistoryItem & {
    scores: RubricScores;
  })[];

  const trends = computeIndicatorTrends(scoredAsc.map((h) => h.scores));
  const summary = buildGrowthSummary(trends, scoredAsc.length, activeChild.nickname);
  const latestScores = scoredAsc[scoredAsc.length - 1]?.scores ?? null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl text-accent">보호자 대시보드</h1>
          <p className="mt-1 text-sm text-ink/60">
            점수보다 흐름을 봐주세요 - 지난 글의 나와 비교한 변화예요.
          </p>
        </div>
        <a href={`/?child=${activeChild.id}`} className="text-sm text-accent underline">
          글쓰기로 돌아가기
        </a>
      </header>

      {typedChildren.length > 1 && (
        <div className="mb-6 flex gap-2">
          {typedChildren.map((c) => (
            <a
              key={c.id}
              href={`/dashboard?child=${c.id}`}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                c.id === activeChild.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-ink/15 text-ink/60"
              }`}
            >
              {c.nickname}
            </a>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-ink/10 bg-white p-5">
        <h2 className="font-heading text-lg text-accent">
          {activeChild.nickname}의 최근 변화
        </h2>
        <p className="mt-2 leading-7 text-ink/80">{summary}</p>
      </section>

      {latestScores && (
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <TierBadge label="사고력" tier={latestScores.사고력} />
          <TierBadge label="논리력" tier={latestScores.논리력} />
          <TierBadge label="표현력" tier={latestScores.표현력} />
          <TierBadge label="구성력" tier={latestScores.구성력} />
        </section>
      )}

      {scoredAsc.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-1 text-sm font-medium text-ink/60">지표별 변화 흐름</h3>
          <p className="mb-4 text-xs text-ink/40">
            같은 글의 종류끼리만 비교해요 (왼쪽이 예전 글, 오른쪽이 가장 최근 글).
          </p>
          <IndicatorTrends items={scoredAsc} />
        </section>
      )}

      <section className="mt-8">
        <h3 className="mb-3 text-sm font-medium text-ink/60">
          {activeChild.nickname}가 쓴 글 ({historyDesc.length}편)
        </h3>
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
                  <p className="font-medium">{essay.topicTitle ?? essay.writingType}</p>
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
                    {essay.scores.confidence === "판단하기 어려움" && (
                      <span className="rounded-full border border-ink/15 px-2 py-0.5 text-xs text-ink/50">
                        판단 보류
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
