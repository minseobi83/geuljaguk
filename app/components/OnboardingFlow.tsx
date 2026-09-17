"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GradeBand } from "@/lib/types";

interface Props {
  userId: string;
  consentGiven: boolean;
  hasChild: boolean;
}

export default function OnboardingFlow({
  userId,
  consentGiven: initialConsentGiven,
  hasChild: initialHasChild,
}: Props) {
  const router = useRouter();
  const [consentGiven, setConsentGiven] = useState(initialConsentGiven);
  const [checked, setChecked] = useState(false);
  const [nickname, setNickname] = useState("");
  const [gradeBand, setGradeBand] = useState<GradeBand>("5");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConsent() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("parents")
      .update({ consent_given_at: new Date().toISOString() })
      .eq("id", userId);
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setConsentGiven(true);
  }

  async function handleCreateChild(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("children").insert({
      parent_id: userId,
      nickname: nickname.trim(),
      grade_band: gradeBand,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (!consentGiven) {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-5 py-16">
        <header className="border-b-2 border-ink pb-6">
          <span className="bg-ink px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white">
            Step 01 · 시작하기 전에
          </span>
          <h1 className="mt-5 break-keep text-3xl font-black tracking-[-0.03em] text-ink">
            보호자 동의
          </h1>
        </header>
        <div className="border-l-4 border-ink pl-5 text-sm leading-7 text-ink/80">
          <p>글자국은 자녀의 글을 AI로 분석해서 글쓰기 코칭 피드백을 제공하는 서비스예요.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>자녀의 실명·학교·주소 등은 수집하지 않아요 (별명만 입력합니다).</li>
            <li>자녀가 쓴 글은 AI 첨삭 목적 외에는 쓰지 않아요.</li>
            <li>언제든지 보호자가 직접 자녀의 기록을 삭제할 수 있어요.</li>
          </ul>
          <p className="mt-3">
            만 14세 미만 자녀를 위한 서비스 이용에는 법정대리인(보호자)의 동의가 필요합니다.
          </p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1"
          />
          위 내용을 확인했고, 법정대리인으로서 자녀의 서비스 이용에 동의합니다.
        </label>
        {error && <p className="text-sm text-warn">{error}</p>}
        <button
          onClick={handleConsent}
          disabled={!checked || submitting}
          className="bg-ink px-6 py-3 text-sm font-bold tracking-wide text-white transition hover:bg-accent disabled:opacity-40"
        >
          동의하고 계속하기
        </button>
      </main>
    );
  }

  if (!initialHasChild) {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-5 py-16">
        <header className="border-b-2 border-ink pb-6">
          <span className="bg-ink px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white">
            Step 02 · 자녀 프로필
          </span>
          <h1 className="mt-5 break-keep text-3xl font-black tracking-[-0.03em] text-ink">
            별명으로 등록해요
          </h1>
          <p className="mt-3 break-keep text-sm text-ink/55">
            실명 대신 별명만 받아요.
          </p>
        </header>
        <form className="flex flex-col gap-5" onSubmit={handleCreateChild}>
          <label className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-ink/45">
              Nickname · 별명
            </span>
            <input
              className="border-b-2 border-ink bg-transparent pb-2 text-lg font-bold outline-none placeholder:font-normal placeholder:text-ink/30"
              placeholder="예: 주원"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-ink/45">
              Grade · 학년
            </span>
            <select
              className="border-b-2 border-ink bg-transparent pb-2 text-lg font-bold outline-none"
              value={gradeBand}
              onChange={(e) => setGradeBand(e.target.value as GradeBand)}
            >
              <option value="4">4학년</option>
              <option value="5">5학년</option>
              <option value="6">6학년</option>
            </select>
          </label>
          {error && <p className="text-sm text-warn">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 bg-ink px-6 py-3 text-sm font-bold tracking-wide text-white transition hover:bg-accent disabled:opacity-40"
          >
            만들기
          </button>
        </form>
      </main>
    );
  }

  return null;
}
