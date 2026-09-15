"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandMark from "@/components/BrandMark";

type Mode = "signin" | "signup";

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
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <header className="flex flex-col items-center text-center">
        <BrandMark size={104} />
        <h1 className="mt-2 font-heading text-2xl text-accent">글자국</h1>
        <p className="mt-1 text-sm text-ink/60">보호자 계정으로 시작해요</p>
      </header>

      <div className="flex rounded-full border border-ink/15 bg-white p-1 text-sm">
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

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
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
    </main>
  );
}
