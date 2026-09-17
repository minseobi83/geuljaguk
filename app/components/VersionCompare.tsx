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
    <div className="flex flex-col gap-6">
      <div className="border-b-2 border-ink pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="bg-ink px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white">
            Revision · 고친 자국
          </span>
          <button
            onClick={onClose}
            className="text-[10px] uppercase tracking-[0.2em] text-ink/50 underline underline-offset-4"
          >
            닫기
          </button>
        </div>
        <h2 className="mt-4 break-keep text-2xl font-black tracking-tight text-ink">
          {before.versionNo}번째 시도 → {after.versionNo}번째 시도,
          <br />
          무엇이 바뀌었을까요?
        </h2>
      </div>

      <div className="flex items-center gap-6 text-[10px] uppercase tracking-[0.2em] text-ink/45">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 bg-growth/25 ring-1 ring-growth/50" />
          새로 쓴 부분
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 bg-warn/15 ring-1 ring-warn/40" />
          지운 부분
        </span>
      </div>

      <div className="whitespace-pre-wrap border-y border-ink/15 py-6 font-heading text-lg leading-9 text-ink/85">
        {ops.map((op, i) => {
          if (op.type === "equal") return <span key={i}>{op.text}</span>;
          if (op.type === "add")
            return (
              <mark key={i} className="bg-growth/20 px-0.5 text-ink">
                {op.text}
              </mark>
            );
          return (
            <span
              key={i}
              className="bg-warn/10 px-0.5 text-ink/40 line-through decoration-warn"
            >
              {op.text}
            </span>
          );
        })}
      </div>

      <p className="break-keep border-l-4 border-ink pl-4 text-sm text-ink/60">
        스스로 고친 부분이 눈에 보이나요? 그게 바로 네가 성장한 흔적이에요.
      </p>
    </div>
  );
}
