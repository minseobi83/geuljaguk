"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChildProfile } from "@/lib/types";
import { enterStudentMode, setStudentPin } from "@/app/student-mode/actions";

// 보호자 대시보드의 "학생 모드" 칸. 아이에게 기기를 건네주기 전에 켠다.
// 처음이면 보호자 PIN(학생 모드를 끌 때 필요)부터 정한다.
export default function StudentModePanel({
  childList,
  activeChildId,
  hasPin,
}: {
  childList: ChildProfile[];
  activeChildId: string;
  hasPin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [childId, setChildId] = useState(activeChildId);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const digitsOnly = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 4);
  const showPinForm = !hasPin || changingPin;

  function savePin() {
    const fd = new FormData();
    fd.set("new_pin", newPin);
    fd.set("confirm_pin", confirmPin);
    if (hasPin) fd.set("current_pin", currentPin);
    startTransition(async () => {
      const r = await setStudentPin(fd);
      setMessage({ ok: r.ok, text: r.message });
      if (r.ok) {
        setChangingPin(false);
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
        router.refresh();
      }
    });
  }

  function enter() {
    const fd = new FormData();
    fd.set("child_id", childId);
    startTransition(async () => {
      const r = await enterStudentMode(fd);
      if (!r.ok) {
        setMessage({ ok: false, text: r.message });
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  const pinInput = "w-28 border-b-2 border-ink bg-transparent pb-1 text-sm tracking-[0.4em] outline-none";

  return (
    <section className="mb-8 border-2 border-ink">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-baseline justify-between gap-2 px-5 py-4 text-left"
      >
        <span className="break-keep text-base font-black tracking-tight text-ink">
          학생 모드
          <span className="ml-2 text-xs font-normal text-ink/50">
            아이에게 기기를 건네줄 때 켜면 글쓰기·성장 기록·추천도서만 보여요
          </span>
        </span>
        <span className="text-xs text-ink/50 underline underline-offset-4">
          {open ? "닫기" : "열기"}
        </span>
      </button>

      {open && (
        <div className="border-t border-ink/15 px-5 py-5">
          {showPinForm ? (
            <>
              <p className="break-keep text-sm leading-6 text-ink/70">
                {hasPin
                  ? "PIN을 바꿔요."
                  : "먼저 보호자 PIN(숫자 4자리)을 정해주세요. 학생 모드를 끄고 보호자 화면으로 돌아올 때 필요해요. 아이가 모르는 번호로 정해주세요."}
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-5">
                {hasPin && (
                  <label className="text-xs text-ink/50">
                    지금 PIN
                    <input
                      type="password"
                      inputMode="numeric"
                      value={currentPin}
                      onChange={(e) => setCurrentPin(digitsOnly(e.target.value))}
                      className={`mt-1 block ${pinInput}`}
                    />
                  </label>
                )}
                <label className="text-xs text-ink/50">
                  새 PIN
                  <input
                    type="password"
                    inputMode="numeric"
                    value={newPin}
                    onChange={(e) => setNewPin(digitsOnly(e.target.value))}
                    className={`mt-1 block ${pinInput}`}
                  />
                </label>
                <label className="text-xs text-ink/50">
                  한 번 더
                  <input
                    type="password"
                    inputMode="numeric"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(digitsOnly(e.target.value))}
                    className={`mt-1 block ${pinInput}`}
                  />
                </label>
                <button
                  type="button"
                  disabled={
                    pending || newPin.length !== 4 || confirmPin.length !== 4 || (hasPin && currentPin.length !== 4)
                  }
                  onClick={savePin}
                  className="bg-ink px-5 py-2 text-xs font-bold text-white transition hover:bg-accent disabled:opacity-40"
                >
                  PIN 저장
                </button>
                {hasPin && (
                  <button
                    type="button"
                    onClick={() => setChangingPin(false)}
                    className="text-xs text-ink/50 underline underline-offset-4"
                  >
                    취소
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-end gap-5">
              {childList.length > 1 && (
                <label className="text-xs text-ink/50">
                  누가 쓸까요?
                  <select
                    value={childId}
                    onChange={(e) => setChildId(e.target.value)}
                    className="mt-1 block border-b-2 border-ink bg-transparent pb-1 text-sm text-ink outline-none"
                  >
                    {childList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nickname} ({c.grade_band}학년)
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={enter}
                className="bg-ink px-6 py-3 text-sm font-bold text-white transition hover:bg-accent disabled:opacity-40"
              >
                {pending ? "바꾸는 중..." : "학생 모드 켜기"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangingPin(true);
                  setMessage(null);
                }}
                className="text-xs text-ink/50 underline underline-offset-4"
              >
                PIN 바꾸기
              </button>
            </div>
          )}

          {message && (
            <p className={`mt-4 break-keep text-sm ${message.ok ? "text-ink/70" : "text-warn"}`}>
              {message.text}
            </p>
          )}
          <p className="mt-4 break-keep text-xs leading-5 text-ink/40">
            학생 모드는 이 기기(브라우저)에서만 켜져요. 끌 때는 상단의 &lsquo;보호자 화면&rsquo;을
            누르고 PIN을 입력하면 돼요.
          </p>
        </div>
      )}
    </section>
  );
}
