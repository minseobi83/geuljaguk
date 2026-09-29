"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { exitStudentMode, resetPinWithPassword } from "@/app/student-mode/actions";
import { useSavingIndicator } from "@/lib/savingIndicator";

// 학생 모드에서 상단 메뉴의 "보호자 화면" 버튼. 누르면 보호자 PIN을 묻고, 맞으면 학생 모드를 끈다.
export default function StudentModeExit() {
  const [open, setOpen] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useSavingIndicator(pending);
  const router = useRouter();

  function close() {
    setOpen(false);
    setForgot(false);
    setPin("");
    setPassword("");
    setNewPin("");
    setMessage(null);
  }

  function submit() {
    const fd = new FormData();
    if (forgot) {
      fd.set("password", password);
      fd.set("new_pin", newPin);
    } else {
      fd.set("pin", pin);
    }
    startTransition(async () => {
      const r = forgot ? await resetPinWithPassword(fd) : await exitStudentMode(fd);
      if (!r.ok) {
        setMessage(r.message);
        setPin("");
        return;
      }
      close();
      router.push("/dashboard");
      router.refresh();
    });
  }

  const digitsOnly = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 4);
  const canSubmit = forgot ? password.length > 0 && newPin.length === 4 : pin.length === 4;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto flex shrink-0 items-center gap-1.5 text-sm font-medium text-white/70 underline underline-offset-4 transition hover:text-white sm:text-[15px]"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <rect x="2" y="5.5" width="8" height="5.5" fill="currentColor" />
          <path
            d="M3.8 5.5 V4 a2.2 2.2 0 0 1 4.4 0 V5.5"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
          />
        </svg>
        보호자 화면
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={close}
        >
          <form
            className="w-full max-w-sm border-2 border-ink bg-white p-6 text-ink"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit && !pending) submit();
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-ink/45">
              Parent · 보호자 확인
            </p>
            <h2 className="mt-3 break-keep text-xl font-black tracking-tight">
              {forgot ? "비밀번호로 PIN 다시 정하기" : "보호자 PIN을 입력해주세요"}
            </h2>

            {forgot ? (
              <>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="보호자 계정 비밀번호"
                  className="mt-5 w-full border-b-2 border-ink bg-transparent pb-1 text-sm outline-none"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(digitsOnly(e.target.value))}
                  placeholder="새 PIN 숫자 4자리"
                  className="mt-4 w-full border-b-2 border-ink bg-transparent pb-1 text-sm tracking-[0.5em] outline-none"
                />
              </>
            ) : (
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => setPin(digitsOnly(e.target.value))}
                placeholder="● ● ● ●"
                className="mt-5 w-full border-b-2 border-ink bg-transparent pb-1 text-center text-2xl tracking-[0.6em] outline-none"
              />
            )}

            {message && <p className="mt-3 break-keep text-sm text-warn">{message}</p>}

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setForgot((v) => !v);
                  setMessage(null);
                }}
                className="text-xs text-ink/50 underline underline-offset-4"
              >
                {forgot ? "PIN으로 돌아가기" : "PIN을 잊었어요"}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={close} className="px-3 py-2 text-xs text-ink/60">
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || pending}
                  className="bg-ink px-5 py-2 text-xs font-bold text-white transition hover:bg-accent disabled:opacity-40"
                >
                  {pending ? "확인 중..." : "확인"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
