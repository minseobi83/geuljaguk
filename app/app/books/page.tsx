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
    <main className="mx-auto max-w-3xl px-4 py-10 lg:max-w-5xl xl:max-w-6xl">
      <TopNav />
      <header className="mb-8">
        <h1 className="font-heading text-2xl text-accent">학년별 추천도서</h1>
        <p className="mt-1 text-sm text-ink/60">
          글쓰기 화면의 "추천도서로 쓰기"에서 고를 수 있는 책들이에요. 학년마다 15권씩,
          글쓰기 유형에 맞춰 골랐습니다.
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {GRADE_BANDS.map((grade) => {
          const books = booksForGradeAll(grade);
          return (
            <section key={grade}>
              <h2 className="mb-3 font-heading text-lg text-accent">{grade}학년</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {books.map((book) => (
                  <div
                    key={book.id}
                    className="flex flex-col gap-2 rounded-lg border border-ink/10 bg-white p-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={book.coverUrl}
                      alt={`${book.title} 표지`}
                      className="mx-auto h-32 w-24 rounded object-cover shadow-sm"
                    />
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <p className="text-sm font-medium">『{book.title}』</p>
                        <p className="text-xs text-ink/50">{book.author}</p>
                      </div>
                      <BookInfoPopover book={book} />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {book.suitableTypes.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent"
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
  );
}
