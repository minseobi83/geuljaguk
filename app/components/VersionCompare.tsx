"use client";

import { diffWords } from "@/lib/diff";

interface Props {
  before: { text: string; versionNo: number };
  after: { text: string; versionNo: number };
  onClose: () => void;
}

export default function VersionCompare({ before, after, onClose }: Props) {
  const ops = diffWords(before.text, after.text);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-accent">
          {before.versionNo}번째 시도 → {after.versionNo}번째 시도, 무엇이 바뀌었을까요?
        </h2>
        <button onClick={onClose} className="text-sm text-ink/50 underline">
          닫기
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs text-ink/50">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-growth/20 ring-1 ring-growth/40" />
          새로 쓴 부분
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-warn/10 ring-1 ring-warn/30" />
          지운 부분
        </span>
      </div>

      <div className="rounded-xl border border-ink/10 bg-white p-5 leading-8 whitespace-pre-wrap">
        {ops.map((op, i) => {
          if (op.type === "equal") return <span key={i}>{op.text}</span>;
          if (op.type === "add")
            return (
              <mark key={i} className="rounded bg-growth/20 px-0.5 text-ink">
                {op.text}
              </mark>
            );
          return (
            <span
              key={i}
              className="rounded bg-warn/10 px-0.5 text-ink/40 line-through decoration-warn"
            >
              {op.text}
            </span>
          );
        })}
      </div>

      <p className="text-center text-sm text-ink/50">
        스스로 고친 부분이 눈에 보이나요? 그게 바로 네가 성장한 흔적이에요.
      </p>
    </div>
  );
}
