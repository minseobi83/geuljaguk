"use client";

import { useState } from "react";
import { GradeBand, WritingType } from "@/lib/types";

const WRITING_TYPES: WritingType[] = [
  "주장하는 글",
  "설명하는 글",
  "독후감",
  "경험을 담은 글",
  "감상문",
  "비교·대조 글",
  "문제 해결 글",
  "서사적 글쓰기",
];

interface Props {
  initialText?: string;
  onSubmit: (data: {
    studentText: string;
    writingType: WritingType;
    gradeBand: GradeBand;
  }) => void;
  submitting: boolean;
  submitLabel: string;
}

export default function EssayForm({
  initialText = "",
  onSubmit,
  submitting,
  submitLabel,
}: Props) {
  const [text, setText] = useState(initialText);
  const [writingType, setWritingType] = useState<WritingType>("주장하는 글");
  const [gradeBand, setGradeBand] = useState<GradeBand>("5");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (submitting) return;
        onSubmit({ studentText: text, writingType, gradeBand });
      }}
    >
      <div className="flex gap-3">
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
        <label className="flex flex-col text-sm text-ink/70">
          글의 종류
          <select
            className="mt-1 rounded-md border border-ink/20 bg-white px-3 py-2"
            value={writingType}
            onChange={(e) => setWritingType(e.target.value as WritingType)}
          >
            {WRITING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <textarea
        className="min-h-[320px] w-full rounded-lg border border-ink/20 bg-white p-4 font-body leading-7 focus:outline-none focus:ring-2 focus:ring-accent/40"
        placeholder="여기에 글을 써주세요."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex items-center justify-between text-sm text-ink/50">
        <span>{text.length}자</span>
        <button
          type="submit"
          disabled={submitting || text.trim().length < 20}
          className="rounded-full bg-accent px-6 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "선생님이 읽고 있어요..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
