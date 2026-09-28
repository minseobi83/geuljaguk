import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChildEssayHistory } from "@/lib/supabase/queries";
import { getActiveTopics } from "@/lib/supabase/topicQueries";
import EssayWorkspace from "@/components/EssayWorkspace";
import { ChildProfile, RecentEssay } from "@/lib/types";
import { resolveActiveChild } from "@/lib/studentMode";
import { recommendDifficulty } from "@/lib/difficulty";

export default async function Home({
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
  // 학생 모드면 그 아이로 고정하고, 다른 아이로 바꾸는 메뉴도 보이지 않게 한다.
  const { activeChild, selectableChildren } = await resolveActiveChild(
    typedChildren,
    requestedChildId
  );

  const [history, topics] = await Promise.all([
    getChildEssayHistory(supabase, activeChild.id, 5),
    getActiveTopics(supabase),
  ]);
  // 최근 글의 등급으로 이 아이에게 맞는 글감 난이도를 추천한다.
  const recommendation = recommendDifficulty(history.map((h) => h.scores));
  const recentEssays: RecentEssay[] = history.map((h) => ({
    id: h.id,
    writing_type: h.writingType,
    topic_title: h.topicTitle,
    created_at: h.createdAt,
    latest_summary: h.summary,
    priority_category: h.priorityCategory,
  }));

  return (
    <EssayWorkspace
      child={activeChild}
      allChildren={selectableChildren}
      recentEssays={recentEssays}
      topics={topics}
      recommendation={recommendation}
    />
  );
}
