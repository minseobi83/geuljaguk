import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: essays } = await supabase
    .from("essays")
    .select(
      "id, writing_type, topic_title, created_at, essay_versions(version_no, evaluations(result))"
    )
    .eq("child_id", activeChild.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentEssays: RecentEssay[] = (essays ?? []).map((e) => {
    const versions = (e.essay_versions ?? []) as {
      version_no: number;
      evaluations: { result: { summary?: string } }[];
    }[];
    const latestVersion = versions.sort((a, b) => b.version_no - a.version_no)[0];
    const latestSummary = latestVersion?.evaluations?.[0]?.result?.summary ?? null;
    return {
      id: e.id,
      writing_type: e.writing_type,
      topic_title: e.topic_title,
      created_at: e.created_at,
      latest_summary: latestSummary,
    };
  });

  return (
    <EssayWorkspace
      child={activeChild}
      allChildren={typedChildren}
      recentEssays={recentEssays}
    />
  );
}
