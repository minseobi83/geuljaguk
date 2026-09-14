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
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
        <header className="text-center">
          <h1 className="font-heading text-xl text-accent">시작하기 전에</h1>
        </header>
        <div className="rounded-xl border border-ink/10 bg-white p-5 text-sm leading-6 text-ink/80">
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
          className="rounded-full bg-accent px-6 py-2 font-medium text-white disabled:opacity-40"
        >
          동의하고 계속하기
        </button>
      </main>
    );
  }

  if (!initialHasChild) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
        <header className="text-center">
          <h1 className="font-heading text-xl text-accent">자녀 프로필 만들기</h1>
          <p className="mt-1 text-sm text-ink/60">
            실명 대신 별명으로 등록해주세요.
          </p>
        </header>
        <form className="flex flex-col gap-3" onSubmit={handleCreateChild}>
          <label className="flex flex-col text-sm text-ink/70">
            별명
            <input
              className="mt-1 rounded-md border border-ink/20 bg-white px-3 py-2"
              placeholder="예: 도윤"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </label>
          <label className="flex flex-col text-sm text-ink/70">
            학년
            <select
              className="mt-1 rounded-md border border-ink/20 bg-white px-3 py-2"
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
            className="mt-2 rounded-full bg-accent px-6 py-2 font-medium text-white disabled:opacity-40"
          >
            만들기
          </button>
        </form>
      </main>
    );
  }

  return null;
}
