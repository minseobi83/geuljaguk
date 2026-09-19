import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getChildOverview,
  getFlaggedEssays,
  getUsageStats,
  isAdmin,
} from "@/lib/supabase/adminQueries";
import { getAllTopicsForAdmin } from "@/lib/supabase/topicQueries";
import { getActiveSystemPrompt, getPromptVersions } from "@/lib/supabase/promptQueries";
import TopNav from "@/components/TopNav";
import AdminConsole from "@/components/AdminConsole";

// 관리자 화면은 항상 지금 DB 상태를 보여줘야 한다 (글감을 고치자마자 반영되도록).
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/login");

  const admin = await isAdmin(supabase, user.id);
  if (!admin) {
    return (
      <>
        <TopNav />
        <main className="mx-auto max-w-6xl px-5 py-10 lg:px-10">
          <div className="border-l-4 border-ink pl-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-ink/45">
              Restricted
            </p>
            <h1 className="mt-3 break-keep text-2xl font-black tracking-tight text-ink">
              관리자 전용 페이지예요
            </h1>
            <p className="mt-3 break-keep text-sm leading-7 text-ink/60">
              이 계정은 관리자로 등록되어 있지 않아요. 관리자 권한이 필요하면 서비스
              운영자에게 문의해주세요.
            </p>
          </div>
        </main>
      </>
    );
  }

  const [stats, flagged, topicResult, childResult, promptResult, activePrompt] =
    await Promise.all([
      getUsageStats(supabase),
      getFlaggedEssays(supabase),
      getAllTopicsForAdmin(supabase),
      getChildOverview(supabase),
      getPromptVersions(supabase),
      getActiveSystemPrompt(supabase),
    ]);

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-6xl px-5 py-10 lg:px-10">
        <header className="mb-10 border-b-2 border-ink pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="bg-ink px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white">
              Masthead · 관리자
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45">
              Internal
            </span>
          </div>
          <h1 className="mt-6 break-keep text-4xl font-black leading-[0.95] tracking-[-0.03em] text-ink sm:text-5xl">
            편집실 관리
          </h1>
        </header>

        <AdminConsole
          stats={stats}
          flagged={flagged}
          topics={topicResult.topics}
          topicsError={topicResult.error}
          childRows={childResult.children}
          childrenError={childResult.error}
          promptVersions={promptResult.versions}
          promptError={promptResult.error}
          currentPromptText={activePrompt.prompt}
          currentPromptSource={activePrompt.source}
          currentPromptLabel={activePrompt.label}
        />
      </main>
      <footer className="mt-16 bg-ink py-6 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 text-[10px] uppercase tracking-[0.3em] text-white/50 lg:px-10">
          <span>글자국 · 관리자</span>
        </div>
      </footer>
    </>
  );
}
