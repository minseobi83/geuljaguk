import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChildEssayHistory } from "@/lib/supabase/queries";
import { computeIndicatorTrends, buildGrowthSummary } from "@/lib/growth";
import GrowthTabs from "@/components/GrowthTabs";
import TopNav from "@/components/TopNav";
import { ChildProfile, RubricScores } from "@/lib/types";

export default async function GrowthPage({
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

  const historyDesc = await getChildEssayHistory(supabase, activeChild.id, 20);
  const historyAsc = [...historyDesc].reverse();
  const scoredAsc = historyAsc.filter((h) => h.scores !== null) as (typeof historyAsc[number] & {
    scores: RubricScores;
  })[];

  const trends = computeIndicatorTrends(scoredAsc.map((h) => h.scores));
  const summary = buildGrowthSummary(trends, scoredAsc.length, activeChild.nickname);
  const latestScores = scoredAsc[scoredAsc.length - 1]?.scores ?? null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <TopNav />
      <header className="mb-8">
        <h1 className="font-heading text-2xl text-accent">
          {activeChild.nickname}의 성장 기록
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          점수보다 흐름이 중요해요 - 예전의 나와 지금의 나를 비교해봐요.
        </p>
      </header>

      {typedChildren.length > 1 && (
        <div className="mb-6 flex gap-2">
          {typedChildren.map((c) => (
            <a
              key={c.id}
              href={`/growth?child=${c.id}`}
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

      <GrowthTabs
        summary={summary}
        latestScores={latestScores}
        scoredAsc={scoredAsc}
        historyDesc={historyDesc}
      />
    </main>
  );
}
