"use client";

// Editorial Magazine 스타일 초화면.
// 표지(블랙 풀블리드) → 목차 → 리드 기사 → 기능 → 편집실 노트 → 구독(로그인) 순서.
// 로그인/회원가입 로직은 그대로 두고 껍데기만 잡지 지면처럼 바꾼 것이다.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandMark from "@/components/BrandMark";

type Mode = "signin" | "signup";

const TICKER_ITEMS = [
  { tag: "NEW", text: "문단별 첨삭 강조 + 스스로 답하기", date: "2026.09.16" },
  { tag: "NEW", text: "수정 전 / 후 비교 화면", date: "2026.09.16" },
  { tag: "UPDATE", text: "학년별 추천도서 45권", date: "2026.09.16" },
  { tag: "UPDATE", text: "보호자 대시보드 안전 알림", date: "2026.09.16" },
];

// 가장 최근 날짜의 항목만 보여준다 (날짜가 여러 개 섞여도 최신 릴리즈만 노출).
const LATEST_RELEASE_DATE = TICKER_ITEMS.reduce(
  (latest, item) => (item.date > latest ? item.date : latest),
  TICKER_ITEMS[0].date
);
const LATEST_TICKER_ITEMS = TICKER_ITEMS.filter(
  (item) => item.date === LATEST_RELEASE_DATE
);

const FEATURES = [
  {
    no: "01",
    title: "문단마다 질문해요",
    text: "문단마다 무엇을 더 써볼지 질문을 던지고, 첨삭된 표현만 콕 집어 보여줘요.",
  },
  {
    no: "02",
    title: "정답 대신 질문",
    text: "완성된 문장을 대신 써주지 않고, 스스로 다시 쓰도록 이끌어요.",
  },
  {
    no: "03",
    title: "성장의 흐름",
    text: "점수보다 예전 글과 비교한 변화의 흐름을 보여줘요.",
  },
  {
    no: "04",
    title: "수정 전후 비교",
    text: "이번에 무엇이 달라졌는지 한눈에 비교해볼 수 있어요.",
  },
  {
    no: "05",
    title: "안전 장치",
    text: "걱정되는 신호가 보이면 보호자에게 바로 알려드려요.",
  },
  {
    no: "06",
    title: "추천도서 연계",
    text: "학년·글쓰기 유형에 맞는 책 45권과 함께 글감을 골라요.",
  },
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/onboarding` },
      });
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
    <main className="min-h-screen bg-white font-body">
      {/* ───────── 표지 (풀블리드 블랙) ───────── */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-5 lg:px-10">
          <div className="flex items-center justify-between gap-4 border-b border-white/20 py-3 text-[10px] uppercase tracking-[0.3em] text-white/55">
            <span>AI Writing Coach</span>
            <a href="#auth" className="text-white underline underline-offset-4">
              로그인
            </a>
          </div>

          <div className="grid gap-12 py-14 lg:grid-cols-12 lg:gap-10 lg:py-20">
            <div className="lg:col-span-8">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                초등 4~6학년 · 글쓰기 저널
              </p>

              <h1 className="mt-6 text-[4.5rem] font-black leading-[0.85] tracking-[-0.05em] sm:text-8xl lg:text-[9rem]">
                글자국
              </h1>
              <p className="mt-5 text-[10px] uppercase tracking-[0.55em] text-white/40">
                Geuljaguk
              </p>

              <div className="mt-10 border-t border-white/20 pt-8">
                <p className="max-w-xl break-keep text-2xl font-extrabold leading-snug sm:text-3xl">
                  아이가 스스로 다시 쓰게 만드는 글쓰기 코치
                </p>
                <p className="mt-4 max-w-lg break-keep text-sm leading-7 text-white/60">
                  정답을 대신 써주지 않아요. 잘한 점을 먼저 찾고, 오늘은 딱 하나만
                  짚어주고, 질문으로 아이가 스스로 고쳐 쓰게 도와줘요.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-5">
                  <a
                    href="#auth"
                    onClick={() => setMode("signup")}
                    className="bg-white px-8 py-3 text-sm font-bold tracking-wide text-ink transition hover:bg-white/85"
                  >
                    무료로 시작하기
                  </a>
                  <a
                    href="#auth"
                    onClick={() => setMode("signin")}
                    className="text-sm text-white/60 underline underline-offset-4"
                  >
                    이미 계정이 있어요
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between gap-6 lg:col-span-4 lg:flex-col lg:items-end lg:justify-start">
              <div className="flex h-28 w-28 shrink-0 -rotate-6 flex-col items-center justify-center rounded-full border border-white/40 text-center sm:h-32 sm:w-32">
                <span className="text-[9px] uppercase tracking-[0.25em] text-white/50">
                  Free
                </span>
                <span className="mt-1 text-sm font-bold">무료 체험</span>
                <span className="mt-1 text-[10px] text-white/50">보호자 계정</span>
              </div>

              <div className="flex aspect-square w-40 items-center justify-center bg-white sm:w-48 lg:mt-10 lg:w-56">
                <BrandMark size={190} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 lg:px-10">
        {/* ───────── 리드 기사 + 시그니처 ───────── */}
        <section className="grid gap-10 py-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent">
              Feature · 코치하는 방식
            </p>
            <h3 className="mt-4 break-keep text-4xl font-black leading-[1.1] tracking-tight text-ink sm:text-5xl">
              점수 대신 질문을<br />돌려줍니다
            </h3>
            <div className="mt-8 columns-1 gap-8 text-[15px] leading-8 text-ink/75 sm:columns-2">
              <p className="break-keep first-letter:float-left first-letter:mr-1.5 first-letter:mt-1 first-letter:text-[3.25rem] first-letter:font-black first-letter:leading-[0.8] first-letter:text-ink">
                아이의 글에 빨간 줄을 긋는 대신, 글자국은 먼저 잘한 점을 찾습니다. 그다음
                오늘 고쳐볼 것을 딱 하나만 고르고, 나머지는 질문으로 되돌려줍니다.
              </p>
              <p className="mt-6 break-keep">
                문단마다 “이 부분은 왜 그렇게 생각했어?” 같은 질문이 붙고, 맞춤법처럼 분명한
                오류만 강조 표시됩니다. 아이는 답을 베끼는 대신 자기 문장을 다시 씁니다.
              </p>
              <p className="mt-6 break-keep">
                다시 쓴 글은 이전 글과 나란히 비교되고, 그 변화가 성장 기록으로 쌓입니다.
                보호자는 점수가 아니라 흐름을 봅니다.
              </p>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="bg-ink p-8 text-white">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                Signature
              </p>
              <p className="mt-6 break-keep text-2xl font-extrabold leading-snug sm:text-3xl">
                “모든 문장에는,<br />아이가 자란<br />자국이 남아요.”
              </p>
              <p className="mt-8 border-t border-white/20 pt-4 text-[10px] uppercase tracking-[0.3em] text-white/50">
                — 글자국
              </p>
            </div>
            <p className="mt-3 break-keep border-t border-ink/15 pt-2 text-xs italic text-ink/50">
              글(文)과 자국(痕). 이름 그대로, 아이가 남긴 흔적을 따라갑니다.
            </p>
          </aside>
        </section>

        {/* ───────── 기능 ───────── */}
        <section className="border-t-2 border-ink pt-8">
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black tracking-tight text-ink">
              글자국이 하는 일
            </h3>
            <span className="text-[10px] uppercase tracking-[0.3em] text-ink/45">
              Features
            </span>
          </div>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.no} className="border-t border-ink pt-4">
                <span className="inline-block bg-ink px-2 py-1 text-[11px] font-bold tracking-widest text-white">
                  {f.no}
                </span>
                <h4 className="mt-3 break-keep text-lg font-extrabold tracking-tight text-ink">
                  {f.title}
                </h4>
                <p className="mt-2 break-keep text-sm leading-7 text-ink/65">{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ───────── 편집실 노트 (릴리즈노트) ───────── */}
        <section className="mt-14 border-y-2 border-ink py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-10">
            <p className="shrink-0 text-[10px] uppercase tracking-[0.3em] text-ink/45">
              편집실 노트 ({LATEST_RELEASE_DATE})
            </p>
            <ul className="flex flex-1 flex-col gap-2">
              {LATEST_TICKER_ITEMS.map((n) => (
                <li
                  key={n.text}
                  className="flex flex-wrap items-baseline gap-x-3 break-keep text-sm text-ink/70"
                >
                  <span className="bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white">
                    {n.tag}
                  </span>
                  <span className="font-medium text-ink">{n.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ───────── 구독 (로그인/회원가입) ───────── */}
        <section id="auth" className="grid scroll-mt-10 gap-10 py-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent">Subscribe</p>
            <h3 className="mt-4 break-keep text-3xl font-black leading-tight tracking-tight text-ink">
              보호자 계정으로<br />시작해요
            </h3>
            <p className="mt-4 break-keep text-sm leading-7 text-ink/60">
              아이의 글은 보호자 계정 아래에서만 저장되고, 별명 외의 개인정보는 받지 않아요.
            </p>
          </div>

          <div className="border-2 border-ink p-6 lg:col-span-7">
            <div className="flex gap-6 border-b-2 border-ink pb-3 text-sm">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={mode === "signin" ? "font-black text-ink" : "text-ink/40"}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={mode === "signup" ? "font-black text-ink" : "text-ink/40"}
              >
                회원가입
              </button>
            </div>

            <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-[0.3em] text-ink/45">
                  Email
                </span>
                <input
                  type="email"
                  required
                  className="border-b border-ink/25 pb-2 outline-none focus:border-ink"
                  placeholder="parent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-[0.3em] text-ink/45">
                  Password
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="border-b border-ink/25 pb-2 outline-none focus:border-ink"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              {error && <p className="break-keep text-sm text-warn">{error}</p>}
              {notice && <p className="break-keep text-sm text-growth">{notice}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 bg-ink px-6 py-3 text-sm font-bold tracking-wide text-white transition hover:bg-accent disabled:opacity-40"
              >
                {mode === "signin" ? "로그인" : "회원가입"}
              </button>
            </form>
          </div>
        </section>
      </div>

      <footer className="bg-ink py-6 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 text-[10px] uppercase tracking-[0.3em] text-white/50 lg:px-10">
          <span>글자국 · 초등 글쓰기 저널</span>
          <span>Vol. 01 — 2026</span>
        </div>
      </footer>
    </main>
  );
}
