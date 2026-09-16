"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandMark from "@/components/BrandMark";

type Mode = "signin" | "signup";

const FEATURES = [
  { icon: "✏️", text: "문단마다 질문을 던져서, 아이가 스스로 고쳐 쓰게 해요" },
  { icon: "🌱", text: "점수보다 이전 글과 비교한 성장의 흐름을 보여줘요" },
  { icon: "🛡️", text: "걱정되는 신호가 보이면 보호자에게 바로 알려드려요" },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }
      setNotice(
        "가입 확인 이메일을 보냈어요. 메일함에서 확인 링크를 눌러주세요. " +
          "(Supabase 프로젝트 설정에서 이메일 확인을 꺼두었다면 바로 로그인하시면 됩니다.)"
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 lg:px-8">
        <div className="flex items-center gap-2">
          <BrandMark size={32} />
          <span className="font-heading text-lg text-accent">글자국</span>
        </div>
        <a
          href="#auth"
          onClick={() => setMode("signin")}
          className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition hover:opacity-90 sm:px-5 sm:py-2 sm:text-sm"
        >
          로그인
        </a>
      </nav>

      <section className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-10 lg:flex-row lg:gap-16 lg:py-20 lg:px-8">
        <div className="w-full min-w-0 flex-1 text-center lg:w-auto lg:text-left">
          <span className="inline-block rounded-full bg-growth/10 px-3 py-1 text-xs font-medium text-growth">
            초등 4~6학년을 위한 AI 글쓰기 코치
          </span>
          <h1 className="mx-auto mt-4 max-w-md font-heading text-3xl leading-snug text-ink sm:text-4xl lg:mx-0 lg:max-w-lg lg:text-5xl">
            아이가 스스로 다시 쓰게 만드는 글쓰기 코치
          </h1>
          <p className="mx-auto mt-4 max-w-md text-ink/70 leading-7 sm:text-lg lg:mx-0">
            정답을 대신 써주지 않아요. 잘한 점을 먼저 찾고, 오늘은 딱 하나만 짚어주고,
            질문으로 아이가 스스로 고쳐 쓰게 도와줘요.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a
              href="#auth"
              onClick={() => setMode("signup")}
              className="rounded-full bg-accent px-8 py-3 text-center font-medium text-white transition hover:opacity-90"
            >
              무료로 시작하기
            </a>
            <a
              href="#auth"
              onClick={() => setMode("signin")}
              className="text-sm font-medium text-ink/60 underline"
            >
              이미 계정이 있어요
            </a>
          </div>

          <ul className="mx-auto mt-10 flex max-w-md flex-col gap-3 text-left text-sm text-ink/70 lg:mx-0 lg:max-w-none">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex min-w-0 items-start gap-2">
                <span className="shrink-0">{f.icon}</span>
                <span className="min-w-0">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex w-full min-w-0 flex-1 justify-center lg:w-auto">
          <div className="flex h-64 w-64 items-center justify-center rounded-full bg-growth/10 sm:h-80 sm:w-80 lg:h-96 lg:w-96">
            <BrandMark size={200} />
          </div>
        </div>
      </section>

      <section
        id="auth"
        className="mx-auto flex max-w-sm scroll-mt-10 flex-col gap-6 px-4 pb-20 pt-4"
      >
        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
          <div className="flex rounded-full border border-ink/15 bg-paper p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-full py-1.5 ${
                mode === "signin" ? "bg-accent text-white" : "text-ink/60"
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full py-1.5 ${
                mode === "signup" ? "bg-accent text-white" : "text-ink/60"
              }`}
            >
              회원가입
            </button>
          </div>

          <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
            <label className="flex flex-col text-sm text-ink/70">
              이메일
              <input
                type="email"
                required
                className="mt-1 rounded-md border border-ink/20 bg-white px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="flex flex-col text-sm text-ink/70">
              비밀번호
              <input
                type="password"
                required
                minLength={6}
                className="mt-1 rounded-md border border-ink/20 bg-white px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && <p className="text-sm text-warn">{error}</p>}
            {notice && <p className="text-sm text-growth">{notice}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-full bg-accent px-6 py-2 font-medium text-white disabled:opacity-40"
            >
              {mode === "signin" ? "로그인" : "회원가입"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-ink/40">보호자 계정으로 시작해요</p>
      </section>
    </main>
  );
}
