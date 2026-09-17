import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChildEssayHistory, EssayHistoryItem } from "@/lib/supabase/queries";
import { computeIndicatorTrends, buildGrowthSummary } from "@/lib/growth";
import DashboardTabs from "@/components/DashboardTabs";
import TopNav from "@/components/TopNav";
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
  const latestDate = historyDesc[0]?.createdAt ?? null;

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-6xl px-5 py-10 lg:px-10">
      <header className="mb-8 border-b-2 border-ink pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="bg-ink px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white">
            Parent’s Desk · 보호자 대시보드
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45">
            Vol. 01
          </span>
        </div>
        <h1 className="mt-6 break-keep text-4xl font-black leading-[0.95] tracking-[-0.03em] text-ink sm:text-5xl">
          점수보다 흐름을<br />봐주세요
        </h1>
        <p className="mt-4 break-keep text-sm text-ink/55">
          지난 글의 나와 비교한 변화예요.
        </p>
      </header>

      {typedChildren.length > 1 && (
        <div className="mb-6 flex gap-2">
          {typedChildren.map((c) => (
            <a
              key={c.id}
              href={`/dashboard?child=${c.id}`}
              className={`border px-4 py-1.5 text-xs font-bold tracking-tight transition ${
                c.id === activeChild.id
                  ? "border-ink bg-ink text-white"
                  : "border-ink/25 text-ink/55 hover:border-ink"
              }`}
            >
              {c.nickname}
            </a>
          ))}
        </div>
      )}

      <DashboardTabs
        nickname={activeChild.nickname}
        summary={summary}
        latestDate={latestDate}
        latestScores={latestScores}
        scoredAsc={scoredAsc}
        historyDesc={historyDesc}
      />
      </main>
    </>
  );
}
