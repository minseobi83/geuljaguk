"use client";

// Editorial Magazine 스타일 초화면.
// 표지(블랙 풀블리드) → 목차 → 리드 기사 → 기능 → 편집실 노트 → 구독(로그인) 순서.
// 로그인/회원가입 로직은 그대로 두고 껍데기만 잡지 지면처럼 바꾼 것이다.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FeatureDemo from "@/components/FeatureDemos";

type Mode = "signin" | "signup";

// 편집실 노트: 배포할 때마다 그 배포에서 학생·보호자가 실제로 체감할 만한 변화 위주로
// 새 항목을 맨 위(또는 최신 날짜)에 추가한다. 아래 화면(LATEST_TICKER_ITEMS)은 가장 최근
// 날짜의 항목만 자동으로 골라 보여주므로, 날짜만 오늘 날짜로 맞추면 예전 항목은 자연히 빠진다.
const TICKER_ITEMS = [
  { tag: "NEW", text: "관리자 콘솔 - 글감·학생별·평가기준 관리", date: "2026.09.19" },
  { tag: "NEW", text: "성장 기록을 지표별 변화 차트로", date: "2026.09.19" },
  { tag: "UPDATE", text: "학년별 눈높이에 맞춘 채점 기준", date: "2026.09.19" },
  { tag: "UPDATE", text: "새 글자국 마크와 초기화면 다듬기", date: "2026.09.19" },
];

// 가장 최근 날짜의 항목만 보여준다 (날짜가 여러 개 섞여도 최신 릴리즈만 노출).
const LATEST_RELEASE_DATE = TICKER_ITEMS.reduce(
  (latest, item) => (item.date > latest ? item.date : latest),
  TICKER_ITEMS[0].date
);
const LATEST_TICKER_ITEMS = TICKER_ITEMS.filter(
  (item) => item.date === LATEST_RELEASE_DATE
);

// 답변은 전부 실제 동작 기준으로 적는다 (횟수·글자 수 제한은 app/api/evaluate/route.ts 값과 같아야 함).
const FAQ = [
  {
    no: "01",
    q: "평가 기준은 어떤 건가요?",
    a: "사고력·논리력·표현력·구성력 네 가지를 봅니다. 100점 만점 같은 점수 대신 능숙·보통·도움필요 3단계로만 표시하고, 아이의 학년과 글의 종류를 함께 고려해요. 글자 수가 많다고 더 좋은 평가를 주지 않고, 한 편만으로 판단하기 어려우면 '판단하기 어려움'이라고 솔직하게 표시합니다.",
  },
  {
    no: "02",
    q: "4학년과 6학년을 같은 기준으로 평가하나요?",
    a: "아니요. 학년마다 기대하는 것이 달라서 잣대도 다릅니다. 4학년은 겪은 일을 구체적으로 쓰는 단계라 이유가 하나라도 또렷하면 충분하다고 보고, 5학년은 이유를 두 가지쯤 나란히 대는 단계, 6학년은 자기 경험 밖의 사례나 예상되는 반대 의견까지 짚어보는 단계로 봅니다. 그래서 4학년 글을 6학년 잣대로 재서 낮게 표시하는 일은 없어요. 비교도 다른 아이가 아니라 그 아이가 전에 쓴 글하고만 합니다.",
  },
  {
    no: "03",
    q: "한 번에 몇 번까지 첨삭받을 수 있나요?",
    a: "같은 글감은 최대 3번까지 제출할 수 있어요. 처음 한 번 쓰고, 피드백을 보고 두 번 더 고쳐 쓰는 구조입니다. 여러 주제를 얕게 훑기보다 한 주제를 끝까지 다듬게 하려는 제한이고, 아이가 직접 정한 주제는 횟수 제한 없이 쓸 수 있어요. 한 편은 20자 이상 4,000자(원고지 약 20장)까지 쓸 수 있어요.",
  },
  {
    no: "04",
    q: "AI가 아이 글을 대신 써주는 건 아닌가요?",
    a: "대신 써주지 않습니다. 잘한 점을 먼저 찾고, 오늘 고칠 것은 하나만 고르고, 나머지는 질문으로 되돌려줘요. 맞춤법·띄어쓰기처럼 분명한 오류만 고친 표현을 보여주고, 그 밖의 문장은 아이가 직접 다시 쓰도록 남겨둡니다.",
  },
  {
    no: "05",
    q: "아이 개인정보는 어떻게 관리되나요?",
    a: "별명과 학년만 받습니다. 실명·학교·주소는 수집하지 않아요. 아이가 쓴 글은 보호자 계정 아래에만 저장되고, 시작할 때 법정대리인(보호자) 동의를 받습니다.",
  },
  {
    no: "06",
    q: "아이 글에 걱정되는 내용이 있으면 어떻게 되나요?",
    a: "자해·폭력·학대처럼 어른이 알아야 할 신호가 보이면 보호자 대시보드에 따로 표시해 알려드립니다. 아이 화면에서는 놀라지 않도록, 힘든 일이 있으면 부모님·선생님이나 청소년상담1388에 이야기해도 괜찮다고 부드럽게 안내해요.",
  },
];

const FEATURES = [
  {
    no: "01",
    title: "문단마다 질문해요",
    text: "문단마다 무엇을 더 써볼지 질문을 던지고, 첨삭된 표현만 콕 집어 보여줘요.",
    detail:
      "글을 문단별로 나눠서 각 문단이 하는 역할과 잘된 점을 먼저 짚어요. 맞춤법·띄어쓰기처럼 분명한 오류는 그 문단 안에서 형광펜으로 표시하고, 마지막에 생각을 여는 질문을 하나 남깁니다. 아이는 그 질문에 자기 생각을 적어두고 다시 쓸 때 참고할 수 있어요.",
  },
  {
    no: "02",
    title: "정답 대신 질문",
    text: "완성된 문장을 대신 써주지 않고, 스스로 다시 쓰도록 이끌어요.",
    detail:
      "문장을 대신 완성해주면 아이는 베끼게 됩니다. 그래서 맞춤법·띄어쓰기 외에는 완성된 문장을 제시하지 않고, 방향을 묻는 질문과 낱말 후보만 건네요. 고쳐 쓰는 일은 아이 몫으로 남겨둡니다.",
  },
  {
    no: "03",
    title: "성장의 흐름",
    text: "점수보다 예전 글과 비교한 변화의 흐름을 보여줘요.",
    detail:
      "한 편의 점수로 아이를 평가하지 않아요. 사고력·논리력·표현력·구성력 네 지표를 글의 종류별로 모아, 예전 글과 비교해 어디가 달라졌는지 보여줍니다. 한 번의 기복에 흔들리지 않도록 그동안의 흐름을 함께 봅니다.",
  },
  {
    no: "04",
    title: "수정 전후 비교",
    text: "이번에 무엇이 달라졌는지 한눈에 비교해볼 수 있어요.",
    detail:
      "다시 쓴 글은 이전 글과 나란히 비교됩니다. 새로 쓴 부분과 지운 부분이 색으로 표시돼서, 아이가 '내가 이만큼 고쳤구나'를 눈으로 확인할 수 있어요.",
  },
  {
    no: "05",
    title: "안전 장치",
    text: "걱정되는 신호가 보이면 보호자에게 바로 알려드려요.",
    detail:
      "글에서 자해·폭력·학대처럼 어른이 알아야 할 신호가 보이면 보호자 대시보드에 따로 표시합니다. 아이 화면에는 놀라지 않도록 부드러운 안내만 보여주고, 도움받을 수 있는 곳을 함께 알려줘요.",
  },
  {
    no: "06",
    title: "추천도서 연계",
    text: "학년·글쓰기 유형에 맞는 책 45권과 함께 글감을 골라요.",
    detail:
      "학년과 글의 종류에 맞는 책 45권을 골라뒀어요. 책을 고르면 그 책으로 써볼 만한 방향 두 가지를 함께 보여주고, 표지를 누르면 저자와 줄거리 소개를 볼 수 있습니다.",
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
  // 눌러서 펼친 기능 카드 (한 번에 하나만)
  const [openFeature, setOpenFeature] = useState<string | null>(null);
  // 이미 로그인한 사람이 이 화면(소개 페이지)에 들어온 경우엔 로그인 폼 대신 바로 글쓰기로 보낸다.
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (alive) setSignedIn(Boolean(data.user));
      });
    return () => {
      alive = false;
    };
  }, []);

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
          <div className="flex items-center justify-between gap-4 border-b border-white/20 py-3 text-[10px] uppercase tracking-[0.3em] text-white/70">
            <span>AI Writing Coach</span>
            {signedIn ? (
              <Link href="/" className="text-white underline underline-offset-4">
                글자국 남기기
              </Link>
            ) : (
              <a href="#auth" className="text-white underline underline-offset-4">
                로그인
              </a>
            )}
          </div>

          <div className="grid gap-12 py-14 lg:grid-cols-12 lg:gap-10 lg:py-20">
            <div className="lg:col-span-8">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/65">
                초등 4~6학년 · 글쓰기 저널
              </p>

              <h1 className="mt-6 text-[3.6rem] font-black leading-[0.85] tracking-[-0.05em] sm:text-[4.8rem] lg:text-[7.2rem]">
                글자국
              </h1>
              <p className="mt-5 text-[10px] uppercase tracking-[0.55em] text-white/55">
                Geuljaguk
              </p>

              <div className="mt-10 border-t border-white/20 pt-8">
                <p className="max-w-xl break-keep text-2xl font-extrabold leading-snug sm:text-3xl">
                  아이가 스스로 다시 쓰게 만드는 글쓰기 코치
                </p>
                <p className="mt-4 max-w-lg break-keep text-sm leading-7 text-white/75">
                  정답을 대신 써주지 않아요. 잘한 점을 먼저 찾고, 오늘은 딱 하나만
                  짚어주고, 질문으로 아이가 스스로 고쳐 쓰게 도와줘요.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-5">
                  {signedIn ? (
                    <Link
                      href="/"
                      className="bg-white px-8 py-3 text-sm font-bold tracking-wide text-ink transition hover:bg-white/85"
                    >
                      글자국 남기기
                    </Link>
                  ) : (
                    <>
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
                        className="text-sm text-white/75 underline underline-offset-4"
                      >
                        이미 계정이 있어요
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between gap-6 lg:col-span-4 lg:flex-col lg:items-end lg:justify-start">
              <div className="flex h-28 w-28 shrink-0 -rotate-6 flex-col items-center justify-center rounded-full border border-white/40 text-center sm:h-32 sm:w-32">
                <span className="text-[9px] uppercase tracking-[0.25em] text-white/65">
                  Free
                </span>
                <span className="mt-1 text-sm font-bold">무료 체험</span>
                <span className="mt-1 text-[10px] text-white/65">보호자 계정</span>
              </div>

              {/* 대표 시그니처 그림 - 사각 박스 없이 배경에 바로 놓는다.
                  원본 파일 자체가 배경이 투명하게 오려져 있어서 테두리가 보이지 않는다. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/hero-illustration.png"
                alt="연필을 든 아이가 책 위에 엎드려 웃고 있고, 옆에는 새싹이 자라는 모습"
                className="w-56 sm:w-72 lg:mt-6 lg:w-[26rem]"
              />
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
            <div className="mt-8 columns-1 gap-8 text-[15px] leading-8 text-ink/85 sm:columns-2">
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
              </p>
              <p className="mt-4 whitespace-nowrap font-bold text-ink">
                보호자는 점수가 아니라 흐름을 봅니다.
              </p>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="bg-ink p-8 text-white">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/65">
                Signature
              </p>
              <p className="mt-6 break-keep text-2xl font-extrabold leading-snug sm:text-3xl">
                “모든 문장에는, 아이가 자란 자국이 남아요.”
              </p>
              <p className="mt-8 border-t border-white/20 pt-4 text-[10px] uppercase tracking-[0.3em] text-white/65">
                — 글자국
              </p>
            </div>
            <p className="mt-3 break-keep border-t border-ink/15 pt-2 text-xs italic text-ink/65">
              글(文)과 자국(痕). 이름 그대로, 아이가 남긴 흔적을 따라갑니다.
            </p>
          </aside>
        </section>

        {/* ───────── 기능 ───────── */}
        <section className="border-t-2 border-ink pt-8">
          <h3 className="text-2xl font-black tracking-tight text-ink">
            글자국이 하는 일
          </h3>
          <p className="mt-3 text-xs text-ink/55">카드를 누르면 자세히 볼 수 있어요.</p>
          <div className="mt-6 grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const open = openFeature === f.no;
              return (
                <article key={f.no} className="border-t border-ink pt-4">
                  <button
                    type="button"
                    onClick={() => setOpenFeature(open ? null : f.no)}
                    aria-expanded={open}
                    className="w-full text-left"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="inline-block bg-ink px-2 py-1 text-[11px] font-bold tracking-widest text-white">
                        {f.no}
                      </span>
                      <span
                        className={`text-lg leading-none text-ink/55 transition-transform duration-300 ${
                          open ? "rotate-45" : ""
                        }`}
                        aria-hidden="true"
                      >
                        ＋
                      </span>
                    </span>
                    <span className="mt-3 block break-keep text-lg font-extrabold tracking-tight text-ink">
                      {f.title}
                    </span>
                    <span className="mt-2 block break-keep text-sm leading-7 text-ink/80">
                      {f.text}
                    </span>
                  </button>

                  {/* 0fr → 1fr 로 행 높이를 바꿔 부드럽게 펼친다 */}
                  <div
                    className={`grid transition-all duration-500 ease-out ${
                      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className={open ? "demo-run pb-6 pt-4" : "pb-6 pt-4"}>
                        <p className="break-keep text-sm leading-7 text-ink/85">
                          {f.detail}
                        </p>
                        <FeatureDemo no={f.no} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ───────── 편집실 노트 (전광판처럼 한 줄로 흐른다) ───────── */}
        <section className="mt-14 flex items-center gap-4 border-y-2 border-ink py-3">
          <p className="shrink-0 text-[10px] uppercase tracking-[0.3em] text-ink/60">
            편집실 노트 ({LATEST_RELEASE_DATE})
          </p>
          {/* 같은 목록을 두 벌 이어 붙이고 절반만큼 밀어서 끊김 없이 반복 (마우스를 올리면 멈춤) */}
          <div className="marquee-mask min-w-0 flex-1 overflow-hidden">
            <div className="flex w-max animate-marquee">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
                  {LATEST_TICKER_ITEMS.map((n) => (
                    <span
                      key={`${copy}-${n.text}`}
                      className="flex items-center gap-2 whitespace-nowrap pr-10 text-sm text-ink/85"
                    >
                      <span className="bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white">
                        {n.tag}
                      </span>
                      <span className="font-medium text-ink">{n.text}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── 구독 (로그인/회원가입) ───────── */}
        <section id="auth" className="grid scroll-mt-10 gap-10 py-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent">Subscribe</p>
            <h3 className="mt-4 break-keep text-3xl font-black leading-tight tracking-tight text-ink">
              {signedIn ? (
                <>이미 로그인되어 있어요</>
              ) : (
                <>보호자 계정으로<br />시작해요</>
              )}
            </h3>
            <p className="mt-4 break-keep text-sm leading-7 text-ink/75">
              {signedIn
                ? "이 화면은 글자국 소개 페이지예요. 바로 글쓰기로 돌아갈 수 있어요."
                : "아이의 글은 보호자 계정 아래에서만 저장되고, 별명 외의 개인정보는 받지 않아요."}
            </p>
          </div>

          {signedIn ? (
            <div className="flex items-center border-2 border-ink p-6 lg:col-span-7">
              <Link
                href="/"
                className="bg-ink px-8 py-3 text-sm font-bold tracking-wide text-white transition hover:bg-accent"
              >
                글자국 남기기
              </Link>
            </div>
          ) : (
          <div className="border-2 border-ink p-6 lg:col-span-7">
            <div className="flex gap-6 border-b-2 border-ink pb-3 text-sm">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={mode === "signin" ? "font-black text-ink" : "text-ink/55"}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={mode === "signup" ? "font-black text-ink" : "text-ink/55"}
              >
                회원가입
              </button>
            </div>

            <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-[0.3em] text-ink/60">
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
                <span className="text-[10px] uppercase tracking-[0.3em] text-ink/60">
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
          )}
        </section>

        {/* ───────── 자주 묻는 질문 ───────── */}
        <section className="border-t-2 border-ink pb-16 pt-8">
          <h3 className="text-2xl font-black tracking-tight text-ink">
            자주 묻는 질문 (FAQ)
          </h3>
          <dl className="mt-8 grid gap-x-12 lg:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.no} className="border-b border-ink/15 py-5">
                <dt className="flex gap-4">
                  <span className="shrink-0 bg-ink px-2 py-1 text-[11px] font-bold tracking-widest text-white">
                    {item.no}
                  </span>
                  <span className="break-keep text-base font-extrabold leading-snug tracking-tight text-ink">
                    {item.q}
                  </span>
                </dt>
                <dd className="mt-3 break-keep pl-[3.25rem] text-sm leading-7 text-ink/80">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <footer className="bg-ink py-6 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 text-[10px] uppercase tracking-[0.3em] text-white/65 lg:px-10">
          <span>글자국 · 초등 글쓰기 저널</span>
          <span>Vol. 01 — 2026</span>
        </div>
      </footer>
    </main>
  );
}
