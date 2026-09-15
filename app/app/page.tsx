import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChildEssayHistory } from "@/lib/supabase/queries";
import EssayWorkspace from "@/components/EssayWorkspace";
import { ChildProfile, RecentEssay } from "@/lib/types";

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
  const activeChild =
    typedChildren.find((c) => c.id === requestedChildId) ?? typedChildren[0];

  const history = await getChildEssayHistory(supabase, activeChild.id, 5);
  const recentEssays: RecentEssay[] = history.map((h) => ({
    id: h.id,
    writing_type: h.writingType,
    topic_title: h.topicTitle,
    created_at: h.createdAt,
    latest_summary: h.summary,
  }));

  return (
    <EssayWorkspace
      child={activeChild}
      allChildren={typedChildren}
      recentEssays={recentEssays}
    />
  );
}
