import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFlaggedEssays, getUsageStats, isAdmin } from "@/lib/supabase/adminQueries";
import { formatDateShort } from "@/lib/format";
import TopNav from "@/components/TopNav";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/login");

  const admin = await isAdmin(supabase, user.id);
  if (!admin) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <TopNav />
        <div className="rounded-xl border border-ink/10 bg-white p-5">
          <h1 className="font-heading text-lg text-accent">관리자 전용 페이지예요</h1>
          <p className="mt-2 text-sm text-ink/60">
            이 계정은 관리자로 등록되어 있지 않아요. 관리자 권한이 필요하면 서비스
            운영자에게 문의해주세요.
          </p>
        </div>
      </main>
    );
  }

  const [stats, flagged] = await Promise.all([
    getUsageStats(supabase),
    getFlaggedEssays(supabase),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <TopNav />
      <header className="mb-8">
        <h1 className="font-heading text-2xl text-accent">관리자</h1>
        <p className="mt-1 text-sm text-ink/60">
          이용 현황과, 어른이 확인해야 할 글을 한눈에 봐요.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="보호자" value={stats.totalParents} />
        <StatCard label="자녀" value={stats.totalChildren} />
        <StatCard label="전체 제출 글" value={stats.totalEssays} />
        <StatCard label="최근 7일" value={stats.essaysLast7Days} />
        <StatCard label="최근 30일" value={stats.essaysLast30Days} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-heading text-base">확인이 필요한 글</h2>
        <p className="mb-4 text-xs text-ink/40">
          안전 신호가 감지됐거나, AI가 학생 문장을 그대로 재사용할 뻔해 가드레일이
          걸린 글이에요. 최근 {flagged.length > 0 ? "300개 제출" : "제출"} 중에서
          골랐어요.
        </p>
        {flagged.length === 0 ? (
          <p className="text-sm text-ink/50">지금은 확인할 항목이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {flagged.map((f) => (
              <li
                key={f.versionId}
                className="rounded-lg border border-warn/30 bg-warn/5 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {f.childNickname} ({f.childGrade}학년) ·{" "}
                    {f.topicTitle ?? f.writingType}
                  </p>
                  <span className="text-xs text-ink/40">
                    {formatDateShort(f.createdAt)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {f.safetyNote && (
                    <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-xs text-warn">
                      안전 신호
                    </span>
                  )}
                  {f.rewroteStudentText && (
                    <span className="rounded-full border border-ink/20 bg-white px-2 py-0.5 text-xs text-ink/60">
                      가드레일 위반(학생 문장 재사용)
                    </span>
                  )}
                </div>
                {f.safetyNote && <p className="mt-2 text-ink/70">{f.safetyNote}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4 text-center">
      <p className="font-heading text-xl text-accent">{value}</p>
      <p className="mt-1 text-xs text-ink/50">{label}</p>
    </div>
  );
}
