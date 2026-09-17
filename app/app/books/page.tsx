import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/TopNav";
import BookInfoPopover from "@/components/BookInfoPopover";
import { booksForGradeAll } from "@/lib/books";
import { GradeBand } from "@/lib/types";

const GRADE_BANDS: GradeBand[] = ["4", "5", "6"];

export default async function BooksPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-6xl px-5 py-10 lg:px-10">
        <header className="mb-10 border-b-2 border-ink pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="bg-ink px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white">
              Reading List · 추천도서
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45">
              45 Books
            </span>
          </div>
          <h1 className="mt-6 break-keep text-4xl font-black leading-[0.95] tracking-[-0.03em] text-ink sm:text-5xl">
            학년별<br />추천도서
          </h1>
          <div className="mt-6 columns-1 gap-8 text-sm leading-7 text-ink/60 sm:columns-2">
            <p className="break-keep">
              글쓰기 화면의 “추천도서로 쓰기”에서 고를 수 있는 책들이에요. 학년마다 15권씩,
              글쓰기 유형에 맞춰 골랐습니다.
            </p>
            <p className="mt-4 break-keep">
              선정 기준: 여러 초등 추천도서 목록(교육 정보 사이트, 학교도서관 추천 목록,
              국립어린이청소년도서관·출판사 소개 자료 등)에 공통으로 등장하거나 국어
              교과서에 수록된, 학년 눈높이에 맞는 스테디셀러 위주로 골랐어요.
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-12">
          {GRADE_BANDS.map((grade) => {
            const books = booksForGradeAll(grade);
            return (
              <section key={grade}>
                <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
                  <h2 className="text-2xl font-black tracking-tight text-ink">
                    {grade}학년
                  </h2>
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45">
                    {books.length} Books
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
                  {books.map((book) => (
                    <div key={book.id} className="flex flex-col gap-2">
                      <div className="relative mx-auto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={book.coverUrl}
                          alt={`${book.title} 표지`}
                          className="h-36 w-26 border border-ink/15 object-cover grayscale transition hover:grayscale-0"
                          style={{ width: "6.5rem" }}
                        />
                        <div className="absolute -right-2 -top-2">
                          <BookInfoPopover book={book} />
                        </div>
                      </div>
                      <p className="break-keep text-center text-xs font-bold tracking-tight text-ink">
                        『{book.title}』
                      </p>
                      <div className="flex flex-wrap justify-center gap-1">
                        {book.suitableTypes.map((t) => (
                          <span
                            key={t}
                            className="border border-ink/20 px-1.5 py-0.5 text-[10px] text-ink/55"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
      <footer className="mt-16 bg-ink py-6 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 text-[10px] uppercase tracking-[0.3em] text-white/50 lg:px-10">
          <span>글자국 · 추천도서</span>
          <span>Vol. 01 — 2026</span>
        </div>
      </footer>
    </>
  );
}
