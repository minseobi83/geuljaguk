"use client";

import { useSavingLabel } from "@/lib/savingIndicator";

// 저장이 진행되는 동안 화면 맨 위의 가는 로딩 바 + 오른쪽 아래 안내 문구.
// 어느 화면에서 저장했든(스크롤을 내려 폼 아래쪽에 있어도) 바로 보이도록 화면에 고정한다.
export default function GlobalSavingBar() {
  const label = useSavingLabel();
  if (!label) return null;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-accent/15"
        role="progressbar"
        aria-label={label}
      >
        <div className="saving-bar h-full w-1/3 bg-accent" />
      </div>
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex items-center gap-2 bg-ink px-4 py-2.5 text-sm font-bold text-white shadow-lg"
        role="status"
        aria-live="polite"
      >
        <span className="saving-spinner h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white" />
        {label}
      </div>
    </>
  );
}
