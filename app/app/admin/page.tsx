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

  const [stats, flagged] = await Promise.all([
    getUsageStats(supabase),
    getFlaggedEssays(supabase),
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
            이용 현황과<br />확인이 필요한 글
          </h1>
        </header>

        <section className="grid grid-cols-2 gap-px bg-ink/15 sm:grid-cols-5">
          <StatCard label="보호자" value={stats.totalParents} />
          <StatCard label="자녀" value={stats.totalChildren} />
          <StatCard label="전체 제출 글" value={stats.totalEssays} />
          <StatCard label="최근 7일" value={stats.essaysLast7Days} />
          <StatCard label="최근 30일" value={stats.essaysLast30Days} />
        </section>

        <section className="mt-12">
          <p className="bg-ink px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-white">
            Review · 확인이 필요한 글
          </p>
          <p className="mt-3 break-keep text-xs leading-6 text-ink/45">
            안전 신호가 감지됐거나, AI가 학생 문장을 그대로 재사용할 뻔해 가드레일이 걸린
            글이에요. 최근 {flagged.length > 0 ? "300개 제출" : "제출"} 중에서 골랐어요.
          </p>
          {flagged.length === 0 ? (
            <p className="mt-6 text-sm text-ink/50">지금은 확인할 항목이 없어요.</p>
          ) : (
            <ul className="mt-4 grid gap-x-10 lg:grid-cols-2">
              {flagged.map((f) => (
                <li key={f.versionId} className="border-b border-ink/15 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="break-keep text-base font-bold tracking-tight text-ink">
                      {f.childNickname} ({f.childGrade}학년) ·{" "}
                      {f.topicTitle ?? f.writingType}
                    </p>
                    <span className="shrink-0 font-mono text-xs text-ink/40">
                      {formatDateShort(f.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {f.safetyNote && (
                      <span className="border border-warn px-2 py-0.5 text-[11px] font-bold text-warn">
                        안전 신호
                      </span>
                    )}
                    {f.rewroteStudentText && (
                      <span className="border border-ink/25 px-2 py-0.5 text-[11px] text-ink/60">
                        가드레일 위반(학생 문장 재사용)
                      </span>
                    )}
                  </div>
                  {f.safetyNote && (
                    <p className="mt-2 break-keep text-sm leading-6 text-ink/70">
                      {f.safetyNote}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <footer className="mt-16 bg-ink py-6 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 text-[10px] uppercase tracking-[0.3em] text-white/50 lg:px-10">
          <span>글자국 · 관리자</span>
          <span>Vol. 01 — 2026</span>
        </div>
      </footer>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-5 text-center">
      <p className="text-3xl font-black tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink/45">{label}</p>
    </div>
  );
}
