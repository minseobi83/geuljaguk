import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingFlow from "@/components/OnboardingFlow";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/login");

  // 보호자 정보와 자녀 목록은 서로 기다릴 필요가 없어 동시에 조회한다.
  const [{ data: parent }, { data: children }] = await Promise.all([
    supabase
      .from("parents")
      .select("consent_given_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("children")
      .select("id, nickname, grade_band")
      .eq("parent_id", user.id),
  ]);

  const consentGiven = Boolean(parent?.consent_given_at);
  if (consentGiven && children && children.length > 0) {
    redirect("/");
  }

  return (
    <OnboardingFlow
      userId={user.id}
      consentGiven={consentGiven}
      hasChild={Boolean(children && children.length > 0)}
    />
  );
}
